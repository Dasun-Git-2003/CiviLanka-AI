using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.Models;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Data
{
    public static class SampleDataSeeder
    {
        public static async Task SeedAllSampleDataAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            // 1. Resolve demo users
            var citizen = await userManager.FindByEmailAsync("citizen@test.com");
            var worker = await userManager.FindByEmailAsync("fieldworker@test.com");
            var supervisor = await userManager.FindByEmailAsync("supervisor@test.com");
            var director = await userManager.FindByEmailAsync("director@test.com");

            var citizenId = citizen?.Id ?? "citizen-demo-id";
            var workerId = worker?.Id ?? "worker-demo-id";
            var workerEmail = worker?.Email ?? "fieldworker@test.com";
            var supervisorId = supervisor?.Id ?? "supervisor-demo-id";
            var directorId = director?.Id ?? "director-demo-id";

            // 2. Seed Hazards for citizen@test.com if none exist
            if (!await db.Hazards.AnyAsync(h => h.CitizenId == citizenId))
            {
                var h1 = new Hazard
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = "CG-DEMO-001",
                    CitizenId = citizenId,
                    Category = "Pothole",
                    Description = "Deep asphalt depression and fractured roadway near Kollupitiya Junction. Creating major hazard for two-wheelers during monsoon showers.",
                    Latitude = 6.9034,
                    Longitude = 79.8540,
                    Address = "Galle Road, Kollupitiya, Colombo 03",
                    Status = HazardStatus.InProgress,
                    Severity = "HIGH",
                    RiskLevel = "HIGH",
                    Priority = "HIGH",
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2),
                    IsCancelled = false
                };

                var h2 = new Hazard
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = "CG-DEMO-002",
                    CitizenId = citizenId,
                    Category = "WaterLeak",
                    Description = "Subterranean potable water main fissure causing localized pressure drop and subbase saturation near Town Hall.",
                    Latitude = 6.9147,
                    Longitude = 79.8653,
                    Address = "F.R. Senanayake Mawatha, Cinnamon Gardens, Colombo 07",
                    Status = HazardStatus.UnderReview,
                    Severity = "CRITICAL",
                    RiskLevel = "HIGH",
                    Priority = "URGENT",
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1),
                    IsCancelled = false
                };

                var h3 = new Hazard
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = "CG-DEMO-003",
                    CitizenId = citizenId,
                    Category = "BrokenTrafficSignal",
                    Description = "Four-phase traffic controller micro-controller failure. Flashing amber across all approaches during peak morning rush.",
                    Latitude = 6.9142,
                    Longitude = 79.8778,
                    Address = "Borella Cross Junction, Colombo 08",
                    Status = HazardStatus.InProgress,
                    Severity = "HIGH",
                    RiskLevel = "HIGH",
                    Priority = "HIGH",
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddHours(-10),
                    IsCancelled = false
                };

                var h4 = new Hazard
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = "CG-DEMO-004",
                    CitizenId = citizenId,
                    Category = "DrainageProblem",
                    Description = "Stormwater culvert silt accumulation causing surface road water accumulation after heavy rainfall.",
                    Latitude = 6.9360,
                    Longitude = 79.8510,
                    Address = "Pettah Market Road, Colombo 11",
                    Status = HazardStatus.Submitted,
                    Severity = "MEDIUM",
                    RiskLevel = "MEDIUM",
                    Priority = "NORMAL",
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1),
                    IsCancelled = false
                };

                var h5 = new Hazard
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = "CG-DEMO-005",
                    CitizenId = citizenId,
                    Category = "StreetLightProblem",
                    Description = "Streetlight ballast failure along 120m stretch, creating pedestrian blindspot.",
                    Latitude = 6.9271,
                    Longitude = 79.8612,
                    Address = "Union Place, Colombo 02",
                    Status = HazardStatus.Resolved,
                    Severity = "LOW",
                    RiskLevel = "LOW",
                    Priority = "LOW",
                    CreatedAt = DateTime.UtcNow.AddDays(-8),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2),
                    IsCancelled = false
                };

                db.Hazards.AddRange(h1, h2, h3, h4, h5);
                await db.SaveChangesAsync();

                // Add Triage AI Analyses (Agent 1)
                db.HazardAIAnalyses.AddRange(
                    new HazardAIAnalysis
                    {
                        HazardId = h1.Id,
                        Category = "Pothole",
                        Severity = "HIGH",
                        RiskLevel = "HIGH",
                        Priority = "HIGH",
                        Confidence = 0.96,
                        Reason = "Edge disintegration observed in primary vehicle wheel-path with high daily vehicular load.",
                        ModelName = "Gemini-1.5-Pro-Vision",
                        CreatedAt = h1.CreatedAt.AddMinutes(5)
                    },
                    new HazardAIAnalysis
                    {
                        HazardId = h2.Id,
                        Category = "WaterLeak",
                        Severity = "CRITICAL",
                        RiskLevel = "HIGH",
                        Priority = "URGENT",
                        Confidence = 0.98,
                        Reason = "Subbase saturation detected. Immediate hydraulic excavation required to prevent structural road collapse.",
                        ModelName = "Gemini-1.5-Pro-Vision",
                        CreatedAt = h2.CreatedAt.AddMinutes(4)
                    },
                    new HazardAIAnalysis
                    {
                        HazardId = h3.Id,
                        Category = "BrokenTrafficSignal",
                        Severity = "HIGH",
                        RiskLevel = "HIGH",
                        Priority = "HIGH",
                        Confidence = 0.94,
                        Reason = "Signal optic controller outage at high-density intersection. High risk of multi-vehicle collision.",
                        ModelName = "Gemini-1.5-Pro-Vision",
                        CreatedAt = h3.CreatedAt.AddMinutes(8)
                    }
                );
                await db.SaveChangesAsync();

                // 3. Seed Work Orders (Member 3)
                var wo1 = new WorkOrder
                {
                    Id = Guid.NewGuid(),
                    WorkOrderNumber = "WO-DEMO-001",
                    HazardId = h1.Id,
                    Title = "Galle Road Asphalt Trenching & Cold Milling",
                    Description = "Excavate failed subgrade, lay 60mm asphalt concrete binder course, and compact to 98% density.",
                    Priority = "HIGH",
                    Severity = "HIGH",
                    Status = WorkOrderStatus.InProgress,
                    ApprovalStatus = "APPROVED",
                    ApprovalRequired = false,
                    EstimatedCost = 350000m,
                    ApprovedBudget = 350000m,
                    EstimatedDurationHours = 8,
                    RecommendedCrewSize = 4,
                    AssignedCrew = $"Crew Alpha ({workerEmail}, Nimal Perera)",
                    CreatedBy = supervisorId,
                    ScheduledDate = DateTime.UtcNow.AddDays(1),
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddHours(-4)
                };

                // High cost work order requiring Director Approval (> 500,000 LKR threshold)
                var wo2 = new WorkOrder
                {
                    Id = Guid.NewGuid(),
                    WorkOrderNumber = "WO-DEMO-002",
                    HazardId = h2.Id,
                    Title = "Town Hall Subterranean Water Main Structural Overhaul",
                    Description = "Replace 45 meters of corroded 300mm ductile iron water pipe, install thrust blocks, and reconstruct roadway pavement.",
                    Priority = "URGENT",
                    Severity = "CRITICAL",
                    Status = WorkOrderStatus.PendingApproval,
                    ApprovalStatus = "PENDING",
                    ApprovalRequired = true,
                    EstimatedCost = 875000m, // Exceeds Director 500k threshold!
                    ApprovedBudget = null,
                    EstimatedDurationHours = 24,
                    RecommendedCrewSize = 6,
                    AssignedCrew = "Crew Gamma & National Water Supply Engineers",
                    CreatedBy = supervisorId,
                    ScheduledDate = DateTime.UtcNow.AddDays(2),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddHours(-1)
                };

                var wo3 = new WorkOrder
                {
                    Id = Guid.NewGuid(),
                    WorkOrderNumber = "WO-DEMO-003",
                    HazardId = h3.Id,
                    Title = "Borella Signal Controller Board & Optical Loop Repair",
                    Description = "Swap burnt conflict monitor unit (CMU), calibrate induction loop detectors, and reset phase timing.",
                    Priority = "HIGH",
                    Severity = "HIGH",
                    Status = WorkOrderStatus.Assigned,
                    ApprovalStatus = "NOT_REQUIRED",
                    ApprovalRequired = false,
                    EstimatedCost = 180000m,
                    ApprovedBudget = 180000m,
                    EstimatedDurationHours = 4,
                    RecommendedCrewSize = 2,
                    AssignedCrew = $"Crew Alpha ({workerEmail})",
                    CreatedBy = supervisorId,
                    ScheduledDate = DateTime.UtcNow.AddDays(1),
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddHours(-2)
                };

                var wo4 = new WorkOrder
                {
                    Id = Guid.NewGuid(),
                    WorkOrderNumber = "WO-DEMO-004",
                    HazardId = h5.Id,
                    Title = "Union Place Corridor Luminaire Restoration",
                    Description = "Replace 4 faulty LED driver units and clean optical reflectors along Union Place.",
                    Priority = "LOW",
                    Severity = "LOW",
                    Status = WorkOrderStatus.Completed,
                    ApprovalStatus = "NOT_REQUIRED",
                    ApprovalRequired = false,
                    EstimatedCost = 75000m,
                    ApprovedBudget = 75000m,
                    ActualCost = 72000m,
                    EstimatedDurationHours = 6,
                    RecommendedCrewSize = 2,
                    AssignedCrew = $"Crew Alpha ({workerEmail})",
                    CreatedBy = supervisorId,
                    ScheduledDate = DateTime.UtcNow.AddDays(-4),
                    CreatedAt = DateTime.UtcNow.AddDays(-6),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                };

                db.WorkOrders.AddRange(wo1, wo2, wo3, wo4);
                await db.SaveChangesAsync();

                // Work Order AI Analyses (Agent 3 Estimator)
                db.WorkOrderAIAnalyses.AddRange(
                    new WorkOrderAIAnalysis
                    {
                        WorkOrderId = wo1.Id,
                        AgentName = "CostMaterialEstimatorAgent",
                        EstimatedCost = 350000m,
                        Recommendation = "Schedule night paving to mitigate Galle Road daytime traffic.",
                        Reason = "Estimate computed using Municipal Schedule of Rates (CIDA-2026). Cost is within Supervisor threshold.",
                        Confidence = 0.95,
                        CreatedAt = wo1.CreatedAt.AddMinutes(2)
                    },
                    new WorkOrderAIAnalysis
                    {
                        WorkOrderId = wo2.Id,
                        AgentName = "CostMaterialEstimatorAgent",
                        EstimatedCost = 875000m,
                        Recommendation = "Requires Director authorization. Inter-departmental coordination with National Water Supply required.",
                        Reason = "Total estimated expenditure (875,000 LKR) exceeds the 500,000 LKR municipal threshold. Routed to Director Approval Queue.",
                        Confidence = 0.94,
                        CreatedAt = wo2.CreatedAt.AddMinutes(3)
                    }
                );
                await db.SaveChangesAsync();

                // 4. Seed Maintenance Records (Member 4)
                var mr1 = new MaintenanceRecord
                {
                    Id = Guid.NewGuid(),
                    WorkOrderId = wo4.Id,
                    PerformedBy = workerEmail,
                    MaintenanceType = "Corrective",
                    Description = "Replaced 4 burnt LED ballast drivers and recalibrated ambient light sensors along Union Place corridor. Night photometric test passed.",
                    Status = MaintenanceStatus.VerificationPending, // For supervisor to verify in verification queue!
                    LabourHours = 6.5m,
                    ActualCost = 72000m,
                    MaterialsUsed = JsonSerializer.Serialize(new[]
                    {
                        new { name = "150W Industrial LED Driver Unit", quantity = 4, unit = "nos", cost = 48000 },
                        new { name = "IP66 Weatherproof Junction Box", quantity = 2, unit = "nos", cost = 14000 },
                        new { name = "Photocell Twilight Sensor", quantity = 2, unit = "nos", cost = 10000 }
                    }),
                    EquipmentUsed = JsonSerializer.Serialize(new[] { "Hydraulic Aerial Boom Truck", "Digital Luxmeter & Multimeter", "Safety Cones" }),
                    SafetyChecklist = JsonSerializer.Serialize(new { ppeConfirmed = true, highVisVest = true, overheadPowerIsolated = true, safetyConesDeployed = true }),
                    WorkerNotes = "All 4 luminaires energized and responsive. Cleaned optical covers.",
                    WorkStartedAt = DateTime.UtcNow.AddDays(-3).AddHours(-7),
                    WorkCompletedAt = DateTime.UtcNow.AddDays(-3),
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-3)
                };

                var mr2 = new MaintenanceRecord
                {
                    Id = Guid.NewGuid(),
                    WorkOrderId = wo1.Id,
                    PerformedBy = workerEmail,
                    MaintenanceType = "Corrective",
                    Description = "Subgrade trenching and base course compaction underway along Galle Road. 12 sqm prepared for asphalt paving.",
                    Status = MaintenanceStatus.InProgress,
                    LabourHours = 4.0m,
                    ActualCost = 140000m,
                    MaterialsUsed = JsonSerializer.Serialize(new[]
                    {
                        new { name = "Graded Aggregate Base", quantity = 8, unit = "m3", cost = 96000 },
                        new { name = "CSS-1 Asphalt Emulsion", quantity = 1, unit = "drum", cost = 44000 }
                    }),
                    EquipmentUsed = JsonSerializer.Serialize(new[] { "Pneumatic Jackhammer", "Plate Compactor", "Traffic Arrow Board" }),
                    SafetyChecklist = JsonSerializer.Serialize(new { ppeConfirmed = true, highVisVest = true, trafficConesDeployed = true, certifiedFlagmanOnDuty = true }),
                    WorkerNotes = "Base passed density test. Final asphalt coat scheduled for tonight at 23:00.",
                    WorkStartedAt = DateTime.UtcNow.AddHours(-5),
                    WorkCompletedAt = null,
                    CreatedAt = DateTime.UtcNow.AddHours(-5),
                    UpdatedAt = DateTime.UtcNow.AddHours(-1)
                };

                db.MaintenanceRecords.AddRange(mr1, mr2);
                await db.SaveChangesAsync();

                // Safety Compliance AI Analysis (Agent 4)
                db.MaintenanceSafetyAnalyses.Add(new MaintenanceSafetyAnalysis
                {
                    MaintenanceRecordId = mr1.Id,
                    WorkOrderId = wo4.Id,
                    AgentName = "SafetyComplianceAgent-CIDA",
                    SafetyRiskLevel = "LOW",
                    ComplianceStatus = "PASS",
                    Confidence = 0.97,
                    IdentifiedRisksJson = JsonSerializer.Serialize(new[] { "Overhead live power line proximity", "Pedestrian sidewalk clearance" }),
                    MissingRequirementsJson = "[]",
                    RequiredSafetyActionsJson = JsonSerializer.Serialize(new[] { "Non-conductive boom bucket verified", "Secondary spotter deployed at ground level" }),
                    Recommendation = "Safety protocols fully satisfied. Work evidence matches CIDA standards. Approved for supervisor sign-off.",
                    Reason = "All mandatory PPE detected; circuit isolation tags logged in electrical safety checklist.",
                    CreatedAt = mr1.CreatedAt.AddMinutes(10)
                });
                await db.SaveChangesAsync();

                // 5. Seed Maintenance Audit Logs
                db.MaintenanceAuditLogs.AddRange(
                    new MaintenanceAuditLog
                    {
                        MaintenanceRecordId = mr1.Id,
                        Action = "RECORD_CREATED",
                        UserId = workerId,
                        EntityType = "MaintenanceRecord",
                        EntityId = mr1.Id.ToString(),
                        PreviousStatus = null,
                        NewStatus = MaintenanceStatus.VerificationPending,
                        Description = "Maintenance record MR-DEMO-001 submitted by fieldworker@test.com",
                        Timestamp = mr1.CreatedAt
                    },
                    new MaintenanceAuditLog
                    {
                        MaintenanceRecordId = mr1.Id,
                        Action = "SAFETY_AI_ANALYSIS",
                        UserId = "SYSTEM",
                        EntityType = "MaintenanceRecord",
                        EntityId = mr1.Id.ToString(),
                        PreviousStatus = MaintenanceStatus.VerificationPending,
                        NewStatus = MaintenanceStatus.VerificationPending,
                        Description = "Safety & Compliance AI scored record: Risk=LOW, Status=PASS (97% confidence)",
                        Timestamp = mr1.CreatedAt.AddMinutes(10)
                    },
                    new MaintenanceAuditLog
                    {
                        MaintenanceRecordId = mr2.Id,
                        Action = "RECORD_CREATED",
                        UserId = workerId,
                        EntityType = "MaintenanceRecord",
                        EntityId = mr2.Id.ToString(),
                        PreviousStatus = null,
                        NewStatus = MaintenanceStatus.InProgress,
                        Description = "In-progress field record MR-DEMO-002 created for Galle Road repair",
                        Timestamp = mr2.CreatedAt
                    }
                );
                await db.SaveChangesAsync();
            }
        }
    }
}
