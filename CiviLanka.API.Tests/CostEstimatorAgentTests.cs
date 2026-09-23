using System;
using System.Collections.Generic;
using System.Linq;
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
    public class CostEstimatorAgentTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private IConfiguration CreateConfig(decimal threshold = 100000m, string apiKey = "")
        {
            var inMemorySettings = new Dictionary<string, string>
            {
                { "WorkOrderSettings:DirectorApprovalThreshold", threshold.ToString() },
                { "GeminiSettings:ApiKey", apiKey }
            };
            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings!)
                .Build();
        }

        [Fact]
        public async Task EstimateAsync_Fallback_ReturnsValidOutputConstraints()
        {
            var config = CreateConfig(100000m, "");
            var mockLogger = new Mock<ILogger<CostEstimatorAgent>>();
            var agent = new CostEstimatorAgent(config, mockLogger.Object);

            var input = new CostEstimationInput
            {
                Category = "Pothole",
                Description = "Large pothole 2m diameter near cross junction",
                Severity = "HIGH",
                Priority = "HIGH",
                Location = "Galle Road, Colombo 03"
            };

            var result = await agent.EstimateAsync(input);

            Assert.NotNull(result);
            Assert.Equal("LKR", result.Currency);
            Assert.True(result.EstimatedCost > 0, "EstimatedCost must be positive");
            Assert.True(result.MaterialCost >= 0, "MaterialCost must be non-negative");
            Assert.True(result.LabourCost >= 0, "LabourCost must be non-negative");
            Assert.True(result.EquipmentCost >= 0, "EquipmentCost must be non-negative");
            Assert.True(result.RecommendedCrewSize >= 1, "Crew size must be at least 1");
            Assert.True(result.EstimatedDurationHours >= 0, "Duration must be non-negative");
            Assert.InRange(result.Confidence, 0.0, 1.0);
            Assert.NotEmpty(result.Materials);
            Assert.NotEmpty(result.Equipment);
            Assert.Equal(CostEstimatorAgent.FallbackModelName, result.ModelName);
        }

        [Fact]
        public async Task EstimateAsync_CriticalSeverity_ProducesHigherCostThanLow()
        {
            var config = CreateConfig(100000m, "");
            var mockLogger = new Mock<ILogger<CostEstimatorAgent>>();
            var agent = new CostEstimatorAgent(config, mockLogger.Object);

            var criticalInput = new CostEstimationInput
            {
                Category = "WaterLeak",
                Description = "Water line rupture",
                Severity = "CRITICAL",
                Priority = "URGENT"
            };

            var lowInput = new CostEstimationInput
            {
                Category = "WaterLeak",
                Description = "Minor meter seepage",
                Severity = "LOW",
                Priority = "LOW"
            };

            var criticalResult = await agent.EstimateAsync(criticalInput);
            var lowResult = await agent.EstimateAsync(lowInput);

            Assert.NotNull(criticalResult);
            Assert.NotNull(lowResult);
            Assert.True(criticalResult.EstimatedCost > lowResult.EstimatedCost,
                $"Critical cost ({criticalResult.EstimatedCost}) should exceed Low cost ({lowResult.EstimatedCost})");
        }

        [Theory]
        [InlineData("Pothole", "HIGH")]
        [InlineData("WaterLeak", "CRITICAL")]
        [InlineData("DamagedRoad", "MEDIUM")]
        [InlineData("FallenTree", "HIGH")]
        [InlineData("StreetLightProblem", "LOW")]
        public void CostEstimationPlugin_EstimateRepairCostTool_ReturnsStructuredBaseline(string category, string severity)
        {
            var mockLogger = new Mock<ILogger>();
            var plugin = new CostEstimationPlugin(mockLogger.Object);

            var json = plugin.EstimateRepairCost(category, severity);

            Assert.NotNull(json);
            Assert.Contains("baseCostLkr", json);
            Assert.Contains("typicalMaterials", json);
            Assert.Contains("typicalEquipment", json);
        }

        [Fact]
        public void CostEstimationPlugin_GetAssetMaintenanceHistoryTool_ReturnsAssetHistory()
        {
            var mockLogger = new Mock<ILogger>();
            var plugin = new CostEstimationPlugin(mockLogger.Object);

            var json = plugin.GetAssetMaintenanceHistory("AST-001");

            Assert.NotNull(json);
            Assert.Contains("AST-001", json);
            Assert.Contains("totalRepairs", json);
            Assert.Contains("complexityMultiplier", json);
        }

        [Fact]
        public void ParseResult_ValidStructuredJson_ParsedCorrectly()
        {
            var json = """
            {
              "estimatedCost": 25000.00,
              "currency": "LKR",
              "materialCost": 12000.00,
              "labourCost": 8000.00,
              "equipmentCost": 5000.00,
              "materials": [
                {
                  "name": "Asphalt mix",
                  "quantity": 50,
                  "unit": "kg",
                  "estimatedUnitCost": 150.00
                }
              ],
              "labour": {
                "requiredWorkers": 3,
                "estimatedHours": 4
              },
              "equipment": [
                "Plate compactor"
              ],
              "estimatedDurationHours": 4,
              "confidence": 0.82,
              "explanation": "Pothole repair with compaction."
            }
            """;

            var result = CostEstimatorAgent.ParseResult(json);

            Assert.NotNull(result);
            Assert.Equal(25000m, result.EstimatedCost);
            Assert.Equal("LKR", result.Currency);
            Assert.Single(result.Materials);
            Assert.Equal("Asphalt mix", result.Materials[0].Name);
            Assert.Equal(50, result.Materials[0].Quantity);
            Assert.Equal(150m, result.Materials[0].UnitCost);
            Assert.Single(result.Equipment);
            Assert.Equal("Plate compactor", result.Equipment[0]);
            Assert.Equal(3, result.RecommendedCrewSize);
            Assert.Equal(4, result.EstimatedLabourHours);
            Assert.Equal(4, result.EstimatedDurationHours);
            Assert.Equal(0.82, result.Confidence);
            Assert.Equal("Pothole repair with compaction.", result.Reason);
            Assert.Equal(CostEstimatorAgent.ModelName, result.ModelName);
        }

        [Fact]
        public void ParseResult_NegativeEstimatedCost_SanitizedToNonNegative()
        {
            var json = """
            {
              "estimatedCost": -50000.00,
              "materialCost": -20000.00,
              "labourCost": -15000.00,
              "equipmentCost": -10000.00,
              "materials": [
                { "name": "Gravel", "quantity": 10, "unit": "kg", "unitCost": 50 }
              ]
            }
            """;

            var result = CostEstimatorAgent.ParseResult(json);

            Assert.NotNull(result);
            Assert.True(result.EstimatedCost >= 0, "EstimatedCost must be non-negative");
            Assert.True(result.MaterialCost >= 0, "MaterialCost must be non-negative");
            Assert.True(result.LabourCost >= 0, "LabourCost must be non-negative");
            Assert.True(result.EquipmentCost >= 0, "EquipmentCost must be non-negative");
        }

        [Fact]
        public void ParseResult_NegativeMaterialQuantityAndUnitCost_Sanitized()
        {
            var json = """
            {
              "estimatedCost": 15000,
              "materials": [
                { "name": "Steel pipe", "quantity": -5, "unit": "meters", "unitCost": -3000 }
              ]
            }
            """;

            var result = CostEstimatorAgent.ParseResult(json);

            Assert.NotNull(result);
            Assert.Single(result.Materials);
            Assert.Equal(0, result.Materials[0].Quantity);
            Assert.Equal(0m, result.Materials[0].UnitCost);
        }

        [Theory]
        [InlineData(-0.8, 0.0)]
        [InlineData(1.75, 1.0)]
        [InlineData(0.75, 0.75)]
        public void ParseResult_InvalidConfidence_ClampedToZeroOne(double inputConfidence, double expectedConfidence)
        {
            var json = $$"""
            {
              "estimatedCost": 20000,
              "confidence": {{inputConfidence}}
            }
            """;

            var result = CostEstimatorAgent.ParseResult(json);

            Assert.NotNull(result);
            Assert.Equal(expectedConfidence, result.Confidence);
        }

        [Fact]
        public void ParseResult_NullMaterialsAndEquipment_HandledSafely()
        {
            var json = """
            {
              "estimatedCost": 10000,
              "currency": "LKR",
              "materials": null,
              "equipment": null,
              "confidence": 0.7
            }
            """;

            var result = CostEstimatorAgent.ParseResult(json);

            Assert.NotNull(result);
            Assert.NotNull(result.Materials);
            Assert.Empty(result.Materials);
            Assert.NotNull(result.Equipment);
            Assert.Empty(result.Equipment);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("This is not JSON")]
        [InlineData("{ malformed json content ...")]
        public void ParseResult_MalformedOrEmptyJson_ReturnsNull(string invalidJson)
        {
            var result = CostEstimatorAgent.ParseResult(invalidJson);
            Assert.Null(result);
        }

        [Fact]
        public async Task EstimateAsync_MissingOrPlaceholderApiKey_ReturnsRuleBasedFallback()
        {
            var config = CreateConfig(100000m, "YOUR_GEMINI_API_KEY");
            var mockLogger = new Mock<ILogger<CostEstimatorAgent>>();
            var agent = new CostEstimatorAgent(config, mockLogger.Object);

            var input = new CostEstimationInput
            {
                Category = "WaterLeak",
                Description = "Pipe leakage on side street",
                Severity = "MEDIUM"
            };

            var result = await agent.EstimateAsync(input);

            Assert.NotNull(result);
            Assert.Equal(CostEstimatorAgent.FallbackModelName, result.ModelName);
            Assert.Contains("rule-based baseline", result.Reason);
            Assert.True(result.EstimatedCost > 0);
        }

        [Fact]
        public void BuildFallback_ArterialRoadContext_IncludesTrafficManagementAndSafetyProvisions()
        {
            var inputNormal = new CostEstimationInput
            {
                Category = "Pothole",
                Severity = "HIGH",
                IsArterialRoad = false
            };

            var inputArterial = new CostEstimationInput
            {
                Category = "Pothole",
                Severity = "HIGH",
                IsArterialRoad = true
            };

            var resultNormal = CostEstimatorAgent.BuildFallback(inputNormal);
            var resultArterial = CostEstimatorAgent.BuildFallback(inputArterial);

            Assert.True(resultArterial.EstimatedCost > resultNormal.EstimatedCost,
                "Arterial road estimate should exceed normal road estimate due to traffic management provisions");
            Assert.Contains(resultArterial.Materials, m => m.Name.Contains("Traffic Safety Cones"));
            Assert.Contains(resultArterial.Equipment, e => e.Contains("Safety Barriers"));
            Assert.True(resultArterial.RecommendedCrewSize >= resultNormal.RecommendedCrewSize);
        }

        [Fact]
        public async Task GenerateEstimateAsync_OverThresholdEstimate_RequiresDirectorApprovalThroughPolicy()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);

            var mockAgent = new Mock<ICostEstimatorAgent>();
            mockAgent.Setup(a => a.EstimateAsync(It.IsAny<CostEstimationInput>()))
                .ReturnsAsync(new CostEstimationResult
                {
                    EstimatedCost = 250000m,
                    Currency = "LKR",
                    MaterialCost = 150000m,
                    LabourCost = 70000m,
                    EquipmentCost = 30000m,
                    RecommendedCrewSize = 4,
                    EstimatedDurationHours = 8,
                    Confidence = 0.85,
                    ModelName = CostEstimatorAgent.ModelName,
                    Reason = "Major structural rehabilitation"
                });

            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Culvert Reconstruction",
                Description = "Replace damaged box culvert on residential street",
                Priority = "HIGH"
            }, "staff-user-1");

            var estimated = await service.GenerateEstimateAsync(created.Id);

            Assert.NotNull(estimated);
            Assert.Equal(250000m, estimated.EstimatedCost);
            Assert.True(estimated.ApprovalRequired);
            Assert.Equal(ApprovalStatus.Pending, estimated.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.PendingApproval, estimated.Status);
            Assert.Equal(WorkOrderApprovalReason.ThresholdExceeded, estimated.ApprovalReason);
        }

        [Fact]
        public async Task GenerateEstimateAsync_AiOutputCannotDirectlySetApprovalStatusToApproved()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);

            // Agent returns an estimate under the threshold with high confidence
            var mockAgent = new Mock<ICostEstimatorAgent>();
            mockAgent.Setup(a => a.EstimateAsync(It.IsAny<CostEstimationInput>()))
                .ReturnsAsync(new CostEstimationResult
                {
                    EstimatedCost = 35000m,
                    Currency = "LKR",
                    Confidence = 0.99,
                    ModelName = CostEstimatorAgent.ModelName,
                    Reason = "Routine pothole patching on quiet lane"
                });

            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Pothole patch",
                Description = "Standard residential asphalt patch",
                Priority = "LOW"
            }, "staff-user-1");

            var estimated = await service.GenerateEstimateAsync(created.Id);

            Assert.NotNull(estimated);
            // Must NOT be approved by AI. Human director approval remains the sole authority.
            Assert.NotEqual(ApprovalStatus.Approved, estimated.ApprovalStatus);
            Assert.NotEqual(WorkOrderStatus.Approved, estimated.Status);
            Assert.Equal(ApprovalStatus.NotRequired, estimated.ApprovalStatus);
            Assert.Equal(WorkOrderStatus.AiGenerated, estimated.Status);
        }

        [Fact]
        public async Task GenerateEstimateAsync_WorkOrderItems_SanitizesNegativeQuantitiesAndCosts()
        {
            using var db = CreateDbContext();
            var repo = new WorkOrderRepository(db);
            var mockLogger = new Mock<ILogger<WorkOrderService>>();
            var config = CreateConfig(100000m);

            var mockAgent = new Mock<ICostEstimatorAgent>();
            mockAgent.Setup(a => a.EstimateAsync(It.IsAny<CostEstimationInput>()))
                .ReturnsAsync(new CostEstimationResult
                {
                    EstimatedCost = 50000m,
                    Currency = "LKR",
                    Materials = new List<RawMaterial>
                    {
                        new() { Name = "Asphalt", Quantity = -10, UnitCost = -500 },
                        new() { Name = "Bitumen", Quantity = 20, UnitCost = 400 }
                    },
                    Equipment = new List<string> { "Compactor" },
                    EquipmentCost = -5000m,
                    Confidence = 0.8
                });

            var service = new WorkOrderService(repo, mockAgent.Object, db, config, mockLogger.Object);

            var created = await service.CreateAsync(new CreateWorkOrderDto
            {
                Title = "Road Patch",
                Description = "Patching road surface",
                Priority = "NORMAL"
            }, "staff-user-1");

            await service.GenerateEstimateAsync(created.Id);

            var items = await db.WorkOrderItems.Where(i => i.WorkOrderId == created.Id).ToListAsync();
            Assert.NotEmpty(items);
            foreach (var item in items)
            {
                Assert.True(item.Quantity >= 0, $"Item {item.ItemName} quantity must be >= 0");
                Assert.True(item.EstimatedUnitCost >= 0, $"Item {item.ItemName} unit cost must be >= 0");
                Assert.True(item.EstimatedTotalCost >= 0, $"Item {item.ItemName} total cost must be >= 0");
            }
        }
    }
}
