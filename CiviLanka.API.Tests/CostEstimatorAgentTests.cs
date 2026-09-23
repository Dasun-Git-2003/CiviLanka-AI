using System.Collections.Generic;
using System.Threading.Tasks;
using CiviLanka.API.Agents;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class CostEstimatorAgentTests
    {
        [Fact]
        public async Task EstimateAsync_Fallback_ReturnsValidOutputConstraints()
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string>
                {
                    { "GeminiSettings:ApiKey", "" }
                }!)
                .Build();

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
        }

        [Fact]
        public async Task EstimateAsync_CriticalSeverity_ProducesHigherCostThanLow()
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string>
                {
                    { "GeminiSettings:ApiKey", "" }
                }!)
                .Build();

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
    }
}
