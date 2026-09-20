using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using CiviLanka.API.Controllers;
using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Hazards;
using CiviLanka.API.DTOs.Maintenance;
using CiviLanka.API.DTOs.WorkOrders;
using CiviLanka.API.Models;
using CiviLanka.API.Repositories;
using CiviLanka.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class AuthorizationTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private ControllerContext CreateControllerContext(string userId, string role, string email = "")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("userId", userId),
                new Claim(ClaimTypes.Role, role),
                new Claim("role", role),
                new Claim(ClaimTypes.Email, email),
                new Claim("fullName", userId)
            };
            var identity = new ClaimsIdentity(claims, "TestAuth", ClaimTypes.Name, ClaimTypes.Role);
            var principal = new ClaimsPrincipal(identity);
            return new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        [Fact]
        public async Task Citizen_Accessing_Another_Citizens_Hazard_Is_Denied_403()
        {
            // Arrange
            using var db = CreateDbContext();
            var hazardId = Guid.NewGuid();
            var ownerId = "citizen-alice";
            var attackerId = "citizen-bob";

            var owner = new ApplicationUser
            {
                Id = ownerId,
                UserName = "alice@test.com",
                Email = "alice@test.com",
                FullName = "Alice Citizen",
                Role = "Citizen"
            };
            db.Users.Add(owner);

            var hazard = new Hazard
            {
                Id = hazardId,
                TicketNumber = "CG-2026-00099",
                CitizenId = ownerId,
                Category = "Pothole",
                Description = "Dangerous pothole",
                Status = HazardStatus.Submitted,
                CreatedAt = DateTime.UtcNow
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var repo = new HazardRepository(db);
            var service = new HazardService(repo, null!, null!, Mock.Of<ILogger<HazardService>>());
            var controller = new HazardController(service, null!, Mock.Of<ILogger<HazardController>>())
            {
                ControllerContext = CreateControllerContext(attackerId, "Citizen")
            };

            // Act
            var result = await controller.GetHazard(hazardId);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        [Fact]
        public async Task Citizen_Accessing_Own_Hazard_Is_Allowed_200()
        {
            // Arrange
            using var db = CreateDbContext();
            var hazardId = Guid.NewGuid();
            var ownerId = "citizen-alice";

            var owner = new ApplicationUser
            {
                Id = ownerId,
                UserName = "alice@test.com",
                Email = "alice@test.com",
                FullName = "Alice Citizen",
                Role = "Citizen"
            };
            db.Users.Add(owner);

            var hazard = new Hazard
            {
                Id = hazardId,
                TicketNumber = "CG-2026-00099",
                CitizenId = ownerId,
                Category = "Pothole",
                Description = "Dangerous pothole",
                Status = HazardStatus.Submitted,
                CreatedAt = DateTime.UtcNow
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var repo = new HazardRepository(db);
            var service = new HazardService(repo, null!, null!, Mock.Of<ILogger<HazardService>>());
            var controller = new HazardController(service, null!, Mock.Of<ILogger<HazardController>>())
            {
                ControllerContext = CreateControllerContext(ownerId, "Citizen")
            };

            // Act
            var result = await controller.GetHazard(hazardId);

            // Assert
            Assert.NotNull(result);
            var objectResult = result as ObjectResult;
            Assert.Equal(200, objectResult?.StatusCode);
        }

        [Fact]
        public async Task FieldWorker_Accessing_Unassigned_WorkOrder_Is_Denied_403()
        {
            // Arrange
            var mockService = new Mock<IWorkOrderService>();
            var woId = Guid.NewGuid();
            mockService.Setup(s => s.GetByIdAsync(woId))
                .ReturnsAsync(new WorkOrderResponseDto
                {
                    Id = woId,
                    WorkOrderNumber = "WO-001",
                    Title = "Repair bridge",
                    AssignedCrew = "Crew Beta (Kavinda, Nimal)" // worker-john is not in this crew
                });

            var controller = new WorkOrderController(mockService.Object, Mock.Of<ILogger<WorkOrderController>>())
            {
                ControllerContext = CreateControllerContext("worker-john", "FieldWorker", "john@test.com")
            };

            // Act
            var result = await controller.GetById(woId);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        [Fact]
        public async Task FieldWorker_Accessing_Assigned_WorkOrder_Is_Allowed_200()
        {
            // Arrange
            var mockService = new Mock<IWorkOrderService>();
            var woId = Guid.NewGuid();
            mockService.Setup(s => s.GetByIdAsync(woId))
                .ReturnsAsync(new WorkOrderResponseDto
                {
                    Id = woId,
                    WorkOrderNumber = "WO-002",
                    Title = "Repair road",
                    AssignedCrew = "worker-john"
                });

            var controller = new WorkOrderController(mockService.Object, Mock.Of<ILogger<WorkOrderController>>())
            {
                ControllerContext = CreateControllerContext("worker-john", "FieldWorker", "john@test.com")
            };

            // Act
            var result = await controller.GetById(woId);

            // Assert
            Assert.NotNull(result);
            var okResult = result as ObjectResult;
            Assert.True(okResult?.StatusCode == null || okResult.StatusCode == 200);
        }

        [Fact]
        public async Task FieldWorker_Verifying_Own_Maintenance_Is_Blocked()
        {
            // Arrange
            using var db = CreateDbContext();
            var wo = new WorkOrder
            {
                Id = Guid.NewGuid(),
                WorkOrderNumber = "WO-TEST-99",
                Title = "Test Pipe",
                Description = "Repair pipe",
                Status = WorkOrderStatus.InProgress,
                CreatedBy = "supervisor"
            };
            db.WorkOrders.Add(wo);

            var recId = Guid.NewGuid();
            var workerId = "worker-1";

            var rec = new MaintenanceRecord
            {
                Id = recId,
                WorkOrderId = wo.Id,
                PerformedBy = workerId,
                MaintenanceType = "RoadRepair",
                Description = "Fixing potholes",
                Status = MaintenanceStatus.VerificationPending
            };
            db.MaintenanceRecords.Add(rec);
            await db.SaveChangesAsync();

            var repo = new MaintenanceRecordRepository(db);
            var service = new MaintenanceRecordService(repo, Mock.Of<CiviLanka.API.Agents.ISafetyComplianceAgent>(), db, Mock.Of<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>(), Mock.Of<ILogger<MaintenanceRecordService>>());

            // Act & Assert
            // When worker tries to self-verify their own completed maintenance
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.VerifyAsync(recId, workerId, "Self verification"));
            Assert.Contains("Self-verification is not permitted", ex.Message);
        }

        [Fact]
        public async Task Supervisor_Verifying_Other_Worker_Maintenance_Is_Allowed()
        {
            // Arrange
            using var db = CreateDbContext();
            var wo = new WorkOrder
            {
                Id = Guid.NewGuid(),
                WorkOrderNumber = "WO-TEST-100",
                Title = "Test Road",
                Description = "Repair road",
                Status = WorkOrderStatus.InProgress,
                CreatedBy = "supervisor"
            };
            db.WorkOrders.Add(wo);

            var recId = Guid.NewGuid();
            var workerId = "worker-1";
            var supervisorId = "supervisor-1";

            var rec = new MaintenanceRecord
            {
                Id = recId,
                WorkOrderId = wo.Id,
                PerformedBy = workerId,
                MaintenanceType = "RoadRepair",
                Description = "Fixing potholes",
                Status = MaintenanceStatus.VerificationPending
            };
            db.MaintenanceRecords.Add(rec);
            await db.SaveChangesAsync();

            var repo = new MaintenanceRecordRepository(db);
            var service = new MaintenanceRecordService(repo, Mock.Of<CiviLanka.API.Agents.ISafetyComplianceAgent>(), db, Mock.Of<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>(), Mock.Of<ILogger<MaintenanceRecordService>>());

            // Act
            var result = await service.VerifyAsync(recId, supervisorId, "Approved by supervisor");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(MaintenanceStatus.Verified, result.Status);
            Assert.Equal("VERIFIED", result.VerificationStatus);
            Assert.Equal(supervisorId, result.VerifiedBy);
        }
    }
}
