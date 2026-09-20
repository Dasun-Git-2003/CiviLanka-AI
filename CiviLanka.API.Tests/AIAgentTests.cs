using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CiviLanka.API.AI.Agents;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Services;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class AIAgentTests
    {
        private AppDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private IOptions<AISettings> CreateSettings()
        {
            return Options.Create(new AISettings
            {
                Model = "gemini-2.5-flash",
                MinimumConfidence = 0.75,
                SupervisorApprovalCost = 100000,
                DirectorApprovalCost = 500000,
                HighRiskRequiresApproval = true
            });
        }

        [Fact]
        public async Task HazardClassificationAgent_WhenGeminiFails_ReturnsAIFailedWithZeroConfidence()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(false);
            mockGemini.Setup(g => g.ModelName).Returns("gemini-2.5-flash");

            var validator = new AIResponseValidator();
            var confidenceService = new AIConfidenceService(CreateSettings());
            var logger = new Mock<ILogger<HazardClassificationAgent>>();

            var agent = new HazardClassificationAgent(
                mockGemini.Object, validator, confidenceService, db, logger.Object);

            var hazard = new Hazard
            {
                TicketNumber = "HAZ-001",
                Category = "Pothole",
                Description = "Major road depression near school",
                Address = "Reid Avenue, Colombo 07"
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var input = new HazardClassificationInput
            {
                HazardId = hazard.Id,
                TicketNumber = hazard.TicketNumber,
                CategorySupplied = hazard.Category,
                Description = hazard.Description,
                Address = hazard.Address
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal("AI_FAILED", result.Status);
            Assert.Equal(0.0, result.Confidence);
            Assert.Contains("unavailable", result.Reason, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task HazardClassificationAgent_ValidJson_ParsesAndPersistsCorrectly()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(true);
            mockGemini.Setup(g => g.ModelName).Returns("gemini-2.5-flash");

            var geminiJson = """
                {
                  "category": "Pothole",
                  "severity": "HIGH",
                  "riskLevel": "HIGH",
                  "priority": "URGENT",
                  "confidence": 0.95,
                  "reason": "Dangerous crater on high-speed dual carriageway",
                  "recommendedAction": "Deploy emergency asphalt cold-patch crew",
                  "recommendedCrewSize": 3,
                  "estimatedResponseHours": 4
                }
                """;

            mockGemini.Setup(g => g.GenerateStructuredJsonAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(geminiJson);

            var validator = new AIResponseValidator();
            var confidenceService = new AIConfidenceService(CreateSettings());
            var logger = new Mock<ILogger<HazardClassificationAgent>>();

            var agent = new HazardClassificationAgent(
                mockGemini.Object, validator, confidenceService, db, logger.Object);

            var hazard = new Hazard
            {
                TicketNumber = "HAZ-002",
                Category = "Damaged Road",
                Description = "Substantial asphalt subsidence",
                Address = "Baseline Road, Colombo 09",
                Latitude = 6.9271,
                Longitude = 79.8612
            };
            db.Hazards.Add(hazard);
            await db.SaveChangesAsync();

            var input = new HazardClassificationInput
            {
                HazardId = hazard.Id,
                TicketNumber = hazard.TicketNumber,
                CategorySupplied = hazard.Category,
                Description = hazard.Description,
                Latitude = hazard.Latitude,
                Longitude = hazard.Longitude,
                Address = hazard.Address
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal("Pothole", result.Category);
            Assert.Equal("HIGH", result.Severity);
            Assert.Equal("URGENT", result.Priority);
            Assert.True(result.Confidence >= 0.75);
            Assert.Equal("AI_ANALYZED", result.Status);

            // Verify database update
            var updated = await db.Hazards.FindAsync(hazard.Id);
            Assert.NotNull(updated);
            Assert.Equal("HIGH", updated.Severity);
            Assert.Equal("URGENT", updated.Priority);

            // Verify AI analysis persistence
            var analysis = await db.HazardAIAnalyses.FirstOrDefaultAsync(a => a.HazardId == hazard.Id);
            Assert.NotNull(analysis);
            Assert.Equal("Pothole", analysis.Category);
        }

        [Fact]
        public async Task AssetRiskPredictionAgent_MultipleInspections_PredictsHighRisk()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(true);
            mockGemini.Setup(g => g.ModelName).Returns("gemini-2.5-flash");

            var geminiJson = """
                {
                  "riskLevel": "CRITICAL",
                  "riskScore": 92,
                  "confidence": 0.94,
                  "conditionAssessment": "Critical",
                  "failureLikelihood": "Imminent",
                  "reason": "Severe corrosion across structural joints and repeating citizen pipe rupture reports",
                  "recommendedInspectionFrequency": "Weekly",
                  "recommendedAction": "Immediate bypass installation and pressure reduction",
                  "urgency": "Immediate"
                }
                """;

            mockGemini.Setup(g => g.GenerateStructuredJsonAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(geminiJson);

            var validator = new AIResponseValidator();
            var confidenceService = new AIConfidenceService(CreateSettings());
            var logger = new Mock<ILogger<AssetRiskPredictionAgent>>();

            var agent = new AssetRiskPredictionAgent(
                mockGemini.Object, validator, confidenceService, db, logger.Object);

            var asset = new InfrastructureAsset
            {
                Id = "AST-099",
                Name = "Grandpass Water Siphon Main",
                Type = "Water",
                Status = "Active",
                Location = "Grandpass, Colombo 14"
            };
            db.InfrastructureAssets.Add(asset);
            await db.SaveChangesAsync();

            var input = new AssetRiskInput
            {
                AssetId = asset.Id,
                Name = asset.Name,
                Type = asset.Type,
                Status = asset.Status,
                Location = asset.Location,
                RecentInspections = new List<string> { "2026-08-01: Critical crack", "2026-09-01: High pressure leakage" },
                IncidentCount = 6
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal("CRITICAL", result.RiskLevel);
            Assert.Equal(92, result.RiskScore);
            Assert.Equal("Critical", result.ConditionAssessment);
            Assert.Equal("Weekly", result.RecommendedInspectionFrequency);

            var saved = await db.AssetRiskAnalyses.FirstOrDefaultAsync(r => r.AssetId == asset.Id);
            Assert.NotNull(saved);
            Assert.Equal("CRITICAL", saved.RiskLevel);
            Assert.Equal(92, saved.RiskScore);
        }

        [Fact]
        public async Task CostMaterialEstimatorAgent_ThresholdEvaluation_FlagsDirectorApproval()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(true);
            mockGemini.Setup(g => g.ModelName).Returns("gemini-2.5-flash");

            var geminiJson = """
                {
                  "estimatedCost": 650000,
                  "currency": "LKR",
                  "materialCost": 380000,
                  "labourCost": 170000,
                  "equipmentCost": 100000,
                  "estimatedLabourHours": 45,
                  "recommendedCrewSize": 6,
                  "estimatedDurationHours": 18,
                  "confidence": 0.91,
                  "materials": [
                    { "name": "Reinforced Ductile Iron Pipe", "quantity": 12, "unit": "meters", "estimatedUnitCost": 25000 },
                    { "name": "Ready-Mix Concrete C25/30", "quantity": 8, "unit": "m3", "estimatedUnitCost": 36000 }
                  ],
                  "equipment": [
                    { "name": "Excavator", "quantity": 1 },
                    { "name": "High-Pressure De-watering Pump", "quantity": 2 }
                  ],
                  "reason": "Arterial pipe collapse requiring extensive trenching and deep sleeve replacement."
                }
                """;

            mockGemini.Setup(g => g.GenerateStructuredJsonAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(geminiJson);

            var validator = new AIResponseValidator();
            var settings = CreateSettings();
            var confidenceService = new AIConfidenceService(settings);
            var logger = new Mock<ILogger<CostMaterialEstimatorAgent>>();

            var agent = new CostMaterialEstimatorAgent(
                mockGemini.Object, validator, confidenceService, settings, db, logger.Object);

            var workOrder = new WorkOrder
            {
                WorkOrderNumber = "WO-2026-0042",
                Title = "Arterial Siphon Repair",
                Description = "Major water pipeline structural restoration",
                Status = "Draft",
                Priority = "URGENT",
                CreatedBy = "user-engineer-1"
            };
            db.WorkOrders.Add(workOrder);
            await db.SaveChangesAsync();

            var input = new CostEstimateInput
            {
                WorkOrderId = workOrder.Id,
                WorkOrderNumber = workOrder.WorkOrderNumber,
                WorkDescription = workOrder.Description,
                HazardCategory = "Water Leak",
                HazardSeverity = "CRITICAL"
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal(650000m, result.EstimatedCost);
            Assert.True(result.RequiresSupervisorApproval);
            Assert.True(result.RequiresDirectorApproval); // >= 500,000 LKR threshold
            Assert.Equal("PENDING_APPROVAL", result.Status);
            Assert.Equal(2, result.Materials.Count);
            Assert.Equal(2, result.Equipment.Count);

            var savedEstimate = await db.CostEstimates.FirstOrDefaultAsync(c => c.WorkOrderId == workOrder.Id);
            Assert.NotNull(savedEstimate);
            Assert.Equal(650000m, savedEstimate.EstimatedCost);
        }

        [Fact]
        public async Task SafetyComplianceAgent_MissingBeforeAfterPhotos_RequiresAction()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(true);
            mockGemini.Setup(g => g.ModelName).Returns("gemini-2.5-flash");

            var geminiJson = """
                {
                  "safetyRiskLevel": "HIGH",
                  "complianceStatus": "ACTION_REQUIRED",
                  "confidence": 0.88,
                  "identifiedRisks": [
                    "Active arterial road traffic exposure",
                    "Unsecured excavation trench"
                  ],
                  "missingRequirements": [
                    "Before/After photographic proof missing",
                    "Traffic barrier confirmation omitted"
                  ],
                  "requiredSafetyActions": [
                    "Erect high-visibility traffic cones 50m upstream",
                    "Take photographic verification of shoring"
                  ],
                  "recommendation": "Do not verify work order completion until photographic evidence is uploaded.",
                  "reason": "Missing mandatory proof of site stabilization and worker safety compliance."
                }
                """;

            mockGemini.Setup(g => g.GenerateStructuredJsonAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(geminiJson);

            var validator = new AIResponseValidator();
            var confidenceService = new AIConfidenceService(CreateSettings());
            var logger = new Mock<ILogger<SafetyComplianceAgent>>();

            var agent = new SafetyComplianceAgent(
                mockGemini.Object, validator, confidenceService, db, logger.Object);

            var workOrder = new WorkOrder
            {
                WorkOrderNumber = "WO-2026-0099",
                Title = "Pothole Filling",
                Status = "InProgress",
                CreatedBy = "user-1"
            };
            db.WorkOrders.Add(workOrder);

            var record = new MaintenanceRecord
            {
                WorkOrderId = workOrder.Id,
                PerformedBy = "Contractor Crew A",
                MaintenanceType = "Corrective",
                Description = "Filled asphalt pothole",
                Status = "InProgress"
            };
            db.MaintenanceRecords.Add(record);
            await db.SaveChangesAsync();

            var input = new SafetyComplianceInput
            {
                MaintenanceRecordId = record.Id,
                WorkOrderId = workOrder.Id,
                WorkOrderNumber = workOrder.WorkOrderNumber,
                Title = workOrder.Title,
                HasBeforeImage = false,
                HasAfterImage = false,
                LabourHours = 0
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal("HIGH", result.SafetyRiskLevel);
            Assert.Equal("ACTION_REQUIRED", result.ComplianceStatus);
            Assert.True(result.RequiresHumanReview);
            Assert.NotEmpty(result.IdentifiedRisks);
            Assert.NotEmpty(result.MissingRequirements);

            var savedSafety = await db.MaintenanceSafetyAnalyses.FirstOrDefaultAsync(s => s.MaintenanceRecordId == record.Id);
            Assert.NotNull(savedSafety);
            Assert.Equal("HIGH", savedSafety.SafetyRiskLevel);
        }

        [Fact]
        public void AIConfidenceService_PenalizesMissingDataCorrectly()
        {
            var service = new AIConfidenceService(CreateSettings());

            var fullContext = new HazardClassificationInput
            {
                CategorySupplied = "Pothole",
                Description = "Massive 3ft crater on the outer lane of Galle Road with high traffic flow",
                Latitude = 6.9271,
                Longitude = 79.8612,
                ImageUrl = "/uploads/test.jpg",
                NearbyHazardsSummary = new List<string> { "Nearby pothole 100m away" },
                HistoricalIncidentsSummary = new List<string> { "Prior road settlement in June" }
            };

            var sparseContext = new HazardClassificationInput
            {
                CategorySupplied = "Pothole",
                Description = "broken",
                Latitude = null,
                Longitude = null,
                ImageUrl = null
            };

            var fullEvaluation = service.EvaluateHazardConfidence(0.95, fullContext);
            var sparseEvaluation = service.EvaluateHazardConfidence(0.95, sparseContext);

            Assert.True(fullEvaluation.FinalConfidence > sparseEvaluation.FinalConfidence,
                "Full context must result in a higher confidence score than sparse context.");
            Assert.True(sparseEvaluation.RequiresHumanReview,
                "Sparse context should trigger mandatory human review.");
        }

        [Fact]
        public async Task DispatchPriorityAgent_FallbackWhenGeminiUnconfigured_ProducesAlgorithmicRouteClustering()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(false);

            var validator = new AIResponseValidator();
            var logger = new Mock<ILogger<DispatchPriorityAgent>>();
            var agent = new DispatchPriorityAgent(mockGemini.Object, validator, db, logger.Object);

            var input = new DispatchPriorityInput
            {
                Hazards = new List<HazardDispatchItemContext>
                {
                    new() { HazardId = Guid.NewGuid(), TicketNumber = "HAZ-01", Category = "Drainage", Severity = "CRITICAL", Priority = "URGENT", Latitude = 6.9319, Longitude = 79.8478, Address = "Pettah, Colombo 11" },
                    new() { HazardId = Guid.NewGuid(), TicketNumber = "HAZ-02", Category = "Pothole", Severity = "HIGH", Priority = "HIGH", Latitude = 6.9271, Longitude = 79.8612, Address = "Fort, Colombo 01" },
                    new() { HazardId = Guid.NewGuid(), TicketNumber = "HAZ-03", Category = "Sidewalk", Severity = "LOW", Priority = "LOW", Latitude = 6.8900, Longitude = 79.8700, Address = "Wellawatte, Colombo 06" }
                },
                AvailableContractors = new List<ContractorDispatchContext>
                {
                    new() { ContractorId = 1, Name = "Rapid Civil Roadworks", Specialization = "Roads & Asphalt", IsAvailable = true, ActiveJobs = 1, Location = "Colombo Central" },
                    new() { ContractorId = 2, Name = "HydroFlow Drainage Solutions", Specialization = "Drainage", IsAvailable = true, ActiveJobs = 0, Location = "Colombo North" }
                }
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.NotEmpty(result.RankedHazards);
            Assert.Equal(1, result.RankedHazards[0].DispatchRank);
            Assert.Equal("CRITICAL", result.RankedHazards[0].UrgencyTier);
            Assert.NotEmpty(result.RouteClusters);
            Assert.NotNull(result.SuggestedAssignment);
            Assert.False(string.IsNullOrWhiteSpace(result.TradeoffAnalysis));
        }

        [Fact]
        public async Task DispatchPriorityAgent_ValidGeminiJson_ParsesClustersAndMatchesContractors()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(true);

            var hazardId1 = Guid.NewGuid();
            var hazardId2 = Guid.NewGuid();

            var geminiJson = $$"""
            {
              "overallOptimizationScore": 92,
              "confidence": 0.94,
              "rankedHazards": [
                {
                  "hazardId": "{{hazardId1}}",
                  "ticketNumber": "HAZ-101",
                  "dispatchRank": 1,
                  "priorityScore": 95,
                  "urgencyTier": "CRITICAL",
                  "reason": "Severe traffic hazard with bus route disruption"
                },
                {
                  "hazardId": "{{hazardId2}}",
                  "ticketNumber": "HAZ-102",
                  "dispatchRank": 2,
                  "priorityScore": 88,
                  "urgencyTier": "HIGH",
                  "reason": "High volume fresh water runoff causing road erosion"
                }
              ],
              "routeClusters": [
                {
                  "clusterName": "Galle Road Arterial Route",
                  "corridor": "Colombo South",
                  "estimatedDistanceKm": 3.4,
                  "estimatedTravelTimeMinutes": 25,
                  "hazardTickets": ["HAZ-101", "HAZ-102"],
                  "recommendedSequence": ["HAZ-101", "HAZ-102"]
                }
              ],
              "suggestedAssignment": {
                "contractorId": 1,
                "contractorName": "Apex Urban Infra",
                "specialization": "Roads & Asphalt",
                "recommendedCrewSize": 4,
                "assignmentRationale": "Has heavy equipment available 2km from corridor"
              },
              "tradeoffAnalysis": "Grouped two hazards located 1.2km apart into one route, saving approximately 45 minutes of transit time."
            }
            """;

            mockGemini.Setup(g => g.GenerateStructuredJsonAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(geminiJson);

            var validator = new AIResponseValidator();
            var logger = new Mock<ILogger<DispatchPriorityAgent>>();
            var agent = new DispatchPriorityAgent(mockGemini.Object, validator, db, logger.Object);

            var input = new DispatchPriorityInput
            {
                Hazards = new List<HazardDispatchItemContext>
                {
                    new() { HazardId = hazardId1, TicketNumber = "HAZ-101", Category = "Pothole", Severity = "CRITICAL" },
                    new() { HazardId = hazardId2, TicketNumber = "HAZ-102", Category = "Water Leak", Severity = "HIGH" }
                },
                AvailableContractors = new List<ContractorDispatchContext>
                {
                    new() { ContractorId = 1, Name = "Apex Urban Infra", Specialization = "Roads & Asphalt", IsAvailable = true }
                }
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal(0.94, result.Confidence);
            Assert.Equal(92, result.OverallOptimizationScore);
            Assert.Equal(2, result.RankedHazards.Count);
            Assert.Equal(1, result.RankedHazards[0].DispatchRank);
            Assert.Single(result.RouteClusters);
            Assert.Equal("Galle Road Arterial Route", result.RouteClusters[0].ClusterName);
            Assert.Equal(1, result.SuggestedAssignment.ContractorId);
            Assert.Equal("Apex Urban Infra", result.SuggestedAssignment.ContractorName);
            Assert.Contains("45 minutes", result.TradeoffAnalysis);
        }

        [Fact]
        public async Task MunicipalSafetyAuditAgent_Deterministic_FailsOnMissingPhotosAndDirectorApprovalViolation()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(false);

            var validator = new AIResponseValidator();
            var logger = new Mock<ILogger<MunicipalSafetyAuditAgent>>();
            var agent = new MunicipalSafetyAuditAgent(mockGemini.Object, validator, db, logger.Object);

            var workOrder = new WorkOrder
            {
                WorkOrderNumber = "WO-AUDIT-001",
                Title = "Bridge Pier Reinforcement",
                Status = "Completed",
                CreatedBy = "engineer-1"
            };
            db.WorkOrders.Add(workOrder);

            var record = new MaintenanceRecord
            {
                WorkOrderId = workOrder.Id,
                PerformedBy = "Contractor Crew X",
                MaintenanceType = "Structural Repair",
                Status = "Completed"
            };
            db.MaintenanceRecords.Add(record);
            await db.SaveChangesAsync();

            var input = new MunicipalSafetyAuditInput
            {
                WorkOrderId = workOrder.Id,
                WorkOrderNumber = workOrder.WorkOrderNumber,
                Title = workOrder.Title,
                WorkOrderStatus = "COMPLETED",
                Priority = "URGENT",
                Severity = "CRITICAL",
                EstimatedCost = 650000m,
                ApprovalStatus = "PENDING", // Violates: cost >= 500,000 without verified Director approval
                HasBeforeImage = false, // Violates photo requirement
                HasAfterImage = false, // Violates photo requirement
                SafetyChecklist = null, // Violates safety checklist requirement for CRITICAL
                GpsDistanceDeltaMeters = 350.0, // Violates GPS tolerance (> 150m)
                MaintenanceRecordId = record.Id
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal("FAILED", result.ComplianceStatus);
            Assert.False(result.BudgetThresholdsApproved);
            Assert.False(result.CompletionEvidenceVerified);
            Assert.False(result.GpsVerificationPassed);
            Assert.False(result.SafetyRulesPassed);
            Assert.True(result.RequiresDirectorEscalation);
            Assert.NotEmpty(result.Violations);

            var violationCodes = result.Violations.Select(v => v.RuleCode).ToList();
            Assert.Contains("FISC-DIR-01", violationCodes);
            Assert.Contains("EVID-IMG-01", violationCodes);
            Assert.Contains("EVID-IMG-02", violationCodes);
            Assert.Contains("GPS-TOL-01", violationCodes);
            Assert.Contains("SEC-CHK-01", violationCodes);

            // Verify audit trail entry was persisted to MaintenanceAuditLogs
            var auditEntry = await db.MaintenanceAuditLogs.FirstOrDefaultAsync(a => a.EntityId == workOrder.Id.ToString());
            Assert.NotNull(auditEntry);
            Assert.Contains("Municipal Safety Audit", auditEntry.Action);
        }

        [Fact]
        public async Task MunicipalSafetyAuditAgent_CompliantWorkOrder_PassesAllChecks()
        {
            using var db = CreateInMemoryDbContext();
            var mockGemini = new Mock<IAIService>();
            mockGemini.Setup(g => g.IsConfigured).Returns(false);

            var validator = new AIResponseValidator();
            var logger = new Mock<ILogger<MunicipalSafetyAuditAgent>>();
            var agent = new MunicipalSafetyAuditAgent(mockGemini.Object, validator, db, logger.Object);

            var workOrder = new WorkOrder
            {
                WorkOrderNumber = "WO-AUDIT-002",
                Title = "Sidewalk Paver Repair",
                Status = "Completed",
                CreatedBy = "engineer-2"
            };
            db.WorkOrders.Add(workOrder);

            var record = new MaintenanceRecord
            {
                WorkOrderId = workOrder.Id,
                PerformedBy = "Contractor Crew Y",
                MaintenanceType = "Corrective",
                Status = "Completed"
            };
            db.MaintenanceRecords.Add(record);
            await db.SaveChangesAsync();

            var input = new MunicipalSafetyAuditInput
            {
                WorkOrderId = workOrder.Id,
                WorkOrderNumber = workOrder.WorkOrderNumber,
                Title = workOrder.Title,
                WorkOrderStatus = "COMPLETED",
                Priority = "MEDIUM",
                Severity = "MEDIUM",
                EstimatedCost = 45000m, // Below 100k, no supervisor/director approval required
                ApprovalStatus = "APPROVED",
                SafetyChecklist = "All safety protocols signed and verified",
                HasBeforeImage = true,
                HasAfterImage = true,
                GpsDistanceDeltaMeters = 24.5, // Well within 150m tolerance
                MaintenanceRecordId = record.Id
            };

            var result = await agent.ExecuteAsync(input);

            Assert.NotNull(result);
            Assert.Equal("PASS", result.ComplianceStatus);
            Assert.True(result.BudgetThresholdsApproved);
            Assert.True(result.CompletionEvidenceVerified);
            Assert.True(result.GpsVerificationPassed);
            Assert.True(result.SafetyRulesPassed);
            Assert.Empty(result.Violations);
        }
    }
}
