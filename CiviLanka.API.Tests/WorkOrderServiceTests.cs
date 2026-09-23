using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CiviLanka.API.Agents;
using CiviLanka.API.Data;
using CiviLanka.API.DTOs.WorkOrders;
using CiviLanka.API.Models;
using CiviLanka.API.Repositories;
using CiviLanka.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class WorkOrderServiceTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private IConfiguration CreateConfig(decimal threshold = 100000m)
        {
            var inMemorySettings = new Dictionary<string, string>
            {
                { "WorkOrderSettings:DirectorApprovalThreshold", threshold.ToString() }
            };
            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings!)
                .Build();
        }

        [Fact]
        public async Task CreateAsync_UnderThreshold_GeneratesWorkOrderWithoutApproval()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var dto = new CreateWorkOrderDto
            {
                Title = "Pothole Patching on Main St",
                Description = "Standard 2m asphalt patch",
                Priority = "NORMAL",
                EstimatedCost = 45000m
            };

            var result = await service.CreateAsync(dto, "staff-user-1");

            Assert.NotNull(result);
            Assert.StartsWith("WO-", result.WorkOrderNumber);
            Assert.Equal(WorkOrderStatus.AiGenerated, result.Status);
            Assert.False(result.ApprovalRequired);
            Assert.Equal(ApprovalStatus.NotRequired, result.ApprovalStatus);
            Assert.Equal(45000m, result.EstimatedCost);
        }

        [Fact]
        public async Task CreateAsync_OverThreshold_TriggersPendingApproval()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var dto = new CreateWorkOrderDto
            {
                Title = "Major Culvert Reconstruction",
                Description = "Reinforced concrete replacement",
                Priority = "HIGH",
                EstimatedCost = 250000m
            };

            var result = await service.CreateAsync(dto, "staff-user-1");

            Assert.NotNull(result);
            Assert.True(result.ApprovalRequired);
            Assert.Equal(ApprovalStatus.Pending, result.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.PendingApproval, result.Status);
        }

        [Fact]
        public async Task UpdateStatusAsync_ValidTransition_UpdatesStatusSuccessfully()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Streetlight bulb replacement",
                Description = "LED bulb swap",
                Priority = "LOW",
                EstimatedCost = 15000m
            }, "staff-user-1");

            var updated = await service.UpdateStatusAsync(created.Id, WorkOrderStatus.Approved, "Approved by supervisor");

            Assert.NotNull(updated);
            Assert.Equal(WorkOrderStatus.Approved, updated.Status);
        }

        [Fact]
        public async Task UpdateStatusAsync_InvalidTransition_ThrowsInvalidOperationException()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Drainage unclogging",
                Description = "Clear silt from culvert",
                Priority = "NORMAL",
                EstimatedCost = 30000m
            }, "staff-user-1");

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.UpdateStatusAsync(created.Id, WorkOrderStatus.Completed, "Bypassing steps")
            );
        }

        [Fact]
        public async Task CancelAsync_SoftDeletesAndSetsCancelledStatus()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Duplicate work order",
                Description = "To be cancelled",
                Priority = "LOW"
            }, "staff-user-1");

            var cancelled = await service.CancelAsync(created.Id);
            Assert.True(cancelled);

            var order = await db.WorkOrders.FindAsync(created.Id);
            Assert.NotNull(order);
            Assert.True(order.IsCancelled);
            Assert.Equal(WorkOrderStatus.Cancelled, order.Status);

            var activeList = await service.GetAllAsync();
            Assert.DoesNotContain(activeList, w => w.Id == created.Id);
        }

        [Fact]
        public async Task ApproveAsync_WhenPending_SetsApprovedStatusAndNotes()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Bridge Guardrail Repair",
                Description = "Heavy structural steel repair",
                Priority = "URGENT",
                EstimatedCost = 450000m
            }, "staff-user-1");

            var approved = await service.ApproveAsync(created.Id, "director-uuid", "Budget approved under municipal emergency fund");

            Assert.NotNull(approved);
            Assert.Equal(WorkOrderStatus.Approved, approved.Status);
            Assert.Equal(ApprovalStatus.Approved, approved.ApprovalStatus);
            Assert.Contains("APPROVED by director-uuid", approved.Notes);
        }

        [Fact]
        public async Task RejectAsync_WhenPending_SetsRejectedStatus()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Unwarranted project",
                Description = "Low priority luxury renovation",
                Priority = "LOW",
                EstimatedCost = 200000m
            }, "staff-user-1");

            var rejected = await service.RejectAsync(created.Id, "director-uuid", "Rejected: not in current fiscal year scope");

            Assert.NotNull(rejected);
            Assert.Equal(WorkOrderStatus.Rejected, rejected.Status);
            Assert.Equal(ApprovalStatus.Rejected, rejected.ApprovalStatus);
            Assert.Contains("REJECTED by director-uuid", rejected.Notes);
        }

        [Fact]
        public async Task CreateAsync_Cost25k_GalleRoadHazard_RequiresDirectorApproval_ArterialRoadRisk()
        {
            using var db = CreateDbContext();
            var hazard = new Hazard
            {
                Id = Guid.NewGuid(),
                TicketNumber = "CG-2026-0001",
                CitizenId = "citizen-1",
                Category = "Pothole",
                Description = "Pothole on southbound lane",
                Address = "124 Galle Road, Colombo 03",
                Status = HazardStatus.Submitted,
                Severity = "MEDIUM"
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var dto = new CreateWorkOrderDto
            {
                Title = "Pothole Patching",
                Description = "2m patch",
                Priority = "NORMAL",
                EstimatedCost = 25000m,
                HazardId = hazard.Id
            };

            var result = await service.CreateAsync(dto, "staff-user-1");

            Assert.NotNull(result);
            Assert.True(result.ApprovalRequired);
            Assert.Equal(ApprovalStatus.Pending, result.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.PendingApproval, result.Status);
            Assert.True(result.IsArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.ArterialRoadRisk, result.ApprovalReason);
        }

        [Fact]
        public async Task CreateAsync_Cost250k_ResidentialRoad_RequiresDirectorApproval_ThresholdExceeded()
        {
            using var db = CreateDbContext();
            var hazard = new Hazard
            {
                Id = Guid.NewGuid(),
                TicketNumber = "CG-2026-0002",
                CitizenId = "citizen-1",
                Category = "DrainageProblem",
                Description = "Broken Culvert causing flooding",
                Address = "45 Lake Drive, Colombo 07",
                Status = HazardStatus.Submitted,
                Severity = "HIGH"
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var dto = new CreateWorkOrderDto
            {
                Title = "Culvert Rebuild",
                Description = "Concrete works on Lake Drive",
                Priority = "HIGH",
                EstimatedCost = 250000m,
                HazardId = hazard.Id
            };

            var result = await service.CreateAsync(dto, "staff-user-1");

            Assert.NotNull(result);
            Assert.True(result.ApprovalRequired);
            Assert.Equal(ApprovalStatus.Pending, result.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.PendingApproval, result.Status);
            Assert.False(result.IsArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.ThresholdExceeded, result.ApprovalReason);
        }

        [Fact]
        public async Task CreateAsync_Cost250k_GalleRoad_RequiresDirectorApproval_Both()
        {
            using var db = CreateDbContext();
            var hazard = new Hazard
            {
                Id = Guid.NewGuid(),
                TicketNumber = "CG-2026-0003",
                CitizenId = "citizen-1",
                Category = "DamagedRoad",
                Description = "Severe Washout",
                Address = "500 Galle Rd, Wellawatte",
                Status = HazardStatus.Submitted,
                Severity = "CRITICAL"
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var dto = new CreateWorkOrderDto
            {
                Title = "Major Highway Rebuild",
                Description = "Extensive structural road repair",
                Priority = "URGENT",
                EstimatedCost = 250000m,
                HazardId = hazard.Id
            };

            var result = await service.CreateAsync(dto, "staff-user-1");

            Assert.NotNull(result);
            Assert.True(result.ApprovalRequired);
            Assert.Equal(ApprovalStatus.Pending, result.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.PendingApproval, result.Status);
            Assert.True(result.IsArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.Both, result.ApprovalReason);
        }

        [Fact]
        public async Task CreateAsync_Cost40k_TempleLane_DoesNotRequireApproval_None()
        {
            using var db = CreateDbContext();
            var hazard = new Hazard
            {
                Id = Guid.NewGuid(),
                TicketNumber = "CG-2026-0004",
                CitizenId = "citizen-1",
                Category = "Pothole",
                Description = "Small crack",
                Address = "12 Temple Lane, Colombo 03",
                Status = HazardStatus.Submitted,
                Severity = "LOW"
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var repo = new WorkOrderRepository(db);
            var mockAgent = new Mock<ICostEstimatorAgent>();
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);
            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var dto = new CreateWorkOrderDto
            {
                Title = "Crack Sealing",
                Description = "Tar application on small residential lane",
                Priority = "LOW",
                EstimatedCost = 40000m,
                HazardId = hazard.Id
            };

            var result = await service.CreateAsync(dto, "staff-user-1");

            Assert.NotNull(result);
            Assert.False(result.ApprovalRequired);
            Assert.Equal(ApprovalStatus.NotRequired, result.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.AiGenerated, result.Status);
            Assert.False(result.IsArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.None, result.ApprovalReason);
        }
    }
}
