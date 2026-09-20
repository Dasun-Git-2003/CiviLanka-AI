using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CiviLanka.API.Agents;
using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Maintenance;
using CiviLanka.API.Models;
using CiviLanka.API.Repositories;
using CiviLanka.API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class MaintenanceRecordServiceTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private async Task<WorkOrder> SeedWorkOrderAsync(AppDbContext db)
        {
            var wo = new WorkOrder
            {
                Id = Guid.NewGuid(),
                WorkOrderNumber = "WO-2026-TEST1",
                Title = "Burst Water Pipe",
                Description = "High pressure water pipe rupture",
                Priority = "URGENT",
                Severity = "CRITICAL",
                Status = WorkOrderStatus.Approved,
                CreatedBy = "staff-user-1"
            };
            db.WorkOrders.Add(wo);
            await db.SaveChangesAsync();
            return wo;
        }

        [Fact]
        public async Task CreateAsync_ValidDto_InitializesRecordAndAuditLog()
        {
            using var db = CreateDbContext();
            var wo = await SeedWorkOrderAsync(db);

            var repo = new MaintenanceRecordRepository(db);
            var mockAgent = new Mock<ISafetyComplianceAgent>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            var mockLogger = new Mock<ILogger<MaintenanceRecordService>>();
            var service = new MaintenanceRecordService(repo, mockAgent.Object, db, mockEnv.Object, mockLogger.Object);

            var dto = new CreateMaintenanceRecordDto
            {
                WorkOrderId = wo.Id,
                MaintenanceType = "Emergency",
                Description = "Emergency isolation and pipe replacement",
                LabourHours = 3.5m,
                ActualCost = 45000m
            };

            var result = await service.CreateAsync(dto, "worker-user-1");

            Assert.NotNull(result);
            Assert.Equal(wo.Id, result.WorkOrderId);
            Assert.Equal(MaintenanceStatus.Assigned, result.Status);
            Assert.Equal(MaintenanceVerificationStatus.NotSubmitted, result.VerificationStatus);
            Assert.Equal(45000m, result.ActualCost);

            var auditLogs = await service.GetAuditLogsAsync(result.Id);
            Assert.NotEmpty(auditLogs);
            Assert.Contains(auditLogs, a => a.Action == "INITIALIZE_MAINTENANCE");
        }

        [Fact]
        public async Task UpdateStatusAsync_ValidTransitions_SetsTimestampsAndVerification()
        {
            using var db = CreateDbContext();
            var wo = await SeedWorkOrderAsync(db);
            var repo = new MaintenanceRecordRepository(db);
            var mockAgent = new Mock<ISafetyComplianceAgent>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            var mockLogger = new Mock<ILogger<MaintenanceRecordService>>();
            var service = new MaintenanceRecordService(repo, mockAgent.Object, db, mockEnv.Object, mockLogger.Object);

            var record = await service.CreateAsync(new CreateMaintenanceRecordDto
            {
                WorkOrderId = wo.Id,
                MaintenanceType = "Routine",
                Description = "Streetlight replacement"
            }, "worker-user-1");

            // ASSIGNED -> IN_PROGRESS
            var inProgress = await service.UpdateStatusAsync(record.Id, MaintenanceStatus.InProgress, "Starting repair", "worker-user-1");
            Assert.NotNull(inProgress);
            Assert.Equal(MaintenanceStatus.InProgress, inProgress.Status);
            Assert.NotNull(inProgress.WorkStartedAt);

            // IN_PROGRESS -> COMPLETED
            var completed = await service.UpdateStatusAsync(record.Id, MaintenanceStatus.Completed, "Work finished", "worker-user-1");
            Assert.NotNull(completed);
            Assert.Equal(MaintenanceStatus.Completed, completed.Status);
            Assert.NotNull(completed.WorkCompletedAt);
            Assert.Equal(MaintenanceVerificationStatus.Pending, completed.VerificationStatus);
        }

        [Fact]
        public async Task UpdateStatusAsync_InvalidTransition_ThrowsInvalidOperationException()
        {
            using var db = CreateDbContext();
            var wo = await SeedWorkOrderAsync(db);
            var repo = new MaintenanceRecordRepository(db);
            var mockAgent = new Mock<ISafetyComplianceAgent>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            var mockLogger = new Mock<ILogger<MaintenanceRecordService>>();
            var service = new MaintenanceRecordService(repo, mockAgent.Object, db, mockEnv.Object, mockLogger.Object);

            var record = await service.CreateAsync(new CreateMaintenanceRecordDto
            {
                WorkOrderId = wo.Id,
                Description = "Test"
            }, "worker-user-1");

            // Attempt illegal jump: ASSIGNED -> VERIFIED
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.UpdateStatusAsync(record.Id, MaintenanceStatus.Verified, null, "worker-user-1")
            );
        }

        [Fact]
        public async Task VerifyAsync_PendingVerification_SetsVerifiedAndSyncsWorkOrder()
        {
            using var db = CreateDbContext();
            var wo = await SeedWorkOrderAsync(db);
            var repo = new MaintenanceRecordRepository(db);
            var mockAgent = new Mock<ISafetyComplianceAgent>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            var mockLogger = new Mock<ILogger<MaintenanceRecordService>>();
            var service = new MaintenanceRecordService(repo, mockAgent.Object, db, mockEnv.Object, mockLogger.Object);

            var record = await service.CreateAsync(new CreateMaintenanceRecordDto
            {
                WorkOrderId = wo.Id,
                Description = "Water pipe replacement",
                ActualCost = 85000m
            }, "worker-user-1");

            await service.UpdateStatusAsync(record.Id, MaintenanceStatus.InProgress, null, "worker-user-1");
            await service.UpdateStatusAsync(record.Id, MaintenanceStatus.Completed, null, "worker-user-1");
            await service.UpdateStatusAsync(record.Id, MaintenanceStatus.VerificationPending, null, "worker-user-1");

            var verified = await service.VerifyAsync(record.Id, "supervisor-user-1", "Inspected on site, work is verified.");

            Assert.NotNull(verified);
            Assert.Equal(MaintenanceStatus.Verified, verified.Status);
            Assert.Equal(MaintenanceVerificationStatus.Verified, verified.VerificationStatus);
            Assert.Equal("supervisor-user-1", verified.VerifiedBy);
            Assert.NotNull(verified.VerifiedAt);

            // Verify linked WorkOrder was updated
            var updatedWo = await db.WorkOrders.FindAsync(wo.Id);
            Assert.NotNull(updatedWo);
            Assert.Equal(85000m, updatedWo.ActualCost);

            var auditLogs = await service.GetAuditLogsAsync(record.Id);
            Assert.Contains(auditLogs, a => a.Action == "VERIFY_MAINTENANCE");
        }

        [Fact]
        public async Task RequestCorrectionAsync_WhenPending_SetsRequiresCorrectionStatus()
        {
            using var db = CreateDbContext();
            var wo = await SeedWorkOrderAsync(db);
            var repo = new MaintenanceRecordRepository(db);
            var mockAgent = new Mock<ISafetyComplianceAgent>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            var mockLogger = new Mock<ILogger<MaintenanceRecordService>>();
            var service = new MaintenanceRecordService(repo, mockAgent.Object, db, mockEnv.Object, mockLogger.Object);

            var record = await service.CreateAsync(new CreateMaintenanceRecordDto
            {
                WorkOrderId = wo.Id,
                Description = "Asphalt patching"
            }, "worker-user-1");

            await service.UpdateStatusAsync(record.Id, MaintenanceStatus.InProgress, null, "worker-user-1");
            await service.UpdateStatusAsync(record.Id, MaintenanceStatus.Completed, null, "worker-user-1");
            await service.UpdateStatusAsync(record.Id, MaintenanceStatus.VerificationPending, null, "worker-user-1");

            var corrected = await service.RequestCorrectionAsync(record.Id, "supervisor-user-1", "Compaction incomplete near curb", "Please re-compact");

            Assert.NotNull(corrected);
            Assert.Equal(MaintenanceStatus.RequiresCorrection, corrected.Status);
            Assert.Equal(MaintenanceVerificationStatus.RequiresCorrection, corrected.VerificationStatus);
            Assert.Contains("Compaction incomplete", corrected.VerificationNotes);
        }

        [Fact]
        public async Task CancelAsync_SoftDeletesRecord()
        {
            using var db = CreateDbContext();
            var wo = await SeedWorkOrderAsync(db);
            var repo = new MaintenanceRecordRepository(db);
            var mockAgent = new Mock<ISafetyComplianceAgent>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            var mockLogger = new Mock<ILogger<MaintenanceRecordService>>();
            var service = new MaintenanceRecordService(repo, mockAgent.Object, db, mockEnv.Object, mockLogger.Object);

            var record = await service.CreateAsync(new CreateMaintenanceRecordDto
            {
                WorkOrderId = wo.Id,
                Description = "Duplicate maintenance"
            }, "worker-user-1");

            var cancelled = await service.CancelAsync(record.Id, "supervisor-user-1");
            Assert.True(cancelled);

            var entity = await db.MaintenanceRecords.FindAsync(record.Id);
            Assert.NotNull(entity);
            Assert.True(entity.IsDeleted);
            Assert.Equal(MaintenanceStatus.Cancelled, entity.Status);

            var active = await service.GetAllAsync();
            Assert.DoesNotContain(active, r => r.Id == record.Id);
        }
    }
}
