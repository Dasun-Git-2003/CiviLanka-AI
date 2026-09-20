using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CiviLanka.API.Agents;
using CiviLanka.API.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CiviLanka.API.Tests;

public class SafetyComplianceAgentTests
{
    private readonly SafetyComplianceAgent _agent;

    public SafetyComplianceAgentTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"GeminiSettings:ApiKey", "YOUR_GEMINI_API_KEY"}
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var loggerMock = new Mock<ILogger<SafetyComplianceAgent>>();
        _agent = new SafetyComplianceAgent(configuration, loggerMock.Object);
    }

    [Fact]
    public async Task EvaluateAsync_NullInput_ThrowsArgumentNullException()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => 
            _agent.EvaluateAsync(null!));
    }

    [Fact]
    public async Task EvaluateAsync_ElectricalHazardMissingSafety_DetectsHighRiskAndRequiresReview()
    {
        // Arrange
        var input = new SafetyComplianceEvaluationInput
        {
            MaintenanceRecordId = Guid.NewGuid(),
            WorkOrderId = Guid.NewGuid(),
            WorkOrderNumber = "WO-2026-TEST1",
            Title = "Downed street light wire sparking near footbridge",
            Description = "Repair high-voltage streetlight cabling and pole base",
            HazardCategory = "StreetLight",
            Severity = "CRITICAL",
            Priority = "URGENT",
            Location = "Galle Road, Colombo 03",
            MaintenanceType = "Corrective",
            MaterialsUsed = "Copper conductors, insulating wraps",
            EquipmentUsed = "Bucket truck",
            LabourHours = 3.5m,
            SafetyChecklist = null,
            HasBeforeImage = false, // missing evidence
            HasAfterImage = false,
            WorkerNotes = "Working quickly before the rain gets heavier"
        };

        // Act
        var result = await _agent.EvaluateAsync(input);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(SafetyRiskLevels.Critical, result.SafetyRiskLevel);
        Assert.Equal(ComplianceStatuses.RequiresReview, result.ComplianceStatus);
        Assert.NotEmpty(result.RequiredSafetyActions);
        Assert.NotEmpty(result.IdentifiedRisks);
        Assert.NotEmpty(result.MissingRequirements);
        Assert.True(result.Confidence > 0);
    }

    [Fact]
    public async Task EvaluateAsync_CompleteSafeRecord_PassesCompliance()
    {
        // Arrange
        var input = new SafetyComplianceEvaluationInput
        {
            MaintenanceRecordId = Guid.NewGuid(),
            WorkOrderId = Guid.NewGuid(),
            WorkOrderNumber = "WO-2026-SAFE",
            Title = "Small shallow pothole on residential lane",
            Description = "Cold asphalt patch compacted with hand tamper",
            HazardCategory = "Pothole",
            Severity = "LOW",
            Priority = "LOW",
            Location = "Flower Road, Colombo 07",
            MaintenanceType = "Routine",
            MaterialsUsed = "Asphalt patch 25kg",
            EquipmentUsed = "Hand tamper, asphalt rake",
            LabourHours = 1.5m,
            SafetyChecklist = "PPE: Confirmed | Cones: Placed | Signage: Deployed",
            HasBeforeImage = true,
            HasAfterImage = true,
            WorkerNotes = "Surface dried, sealed and compacted completely. Traffic reopened safely."
        };

        // Act
        var result = await _agent.EvaluateAsync(input);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ComplianceStatuses.Pass, result.ComplianceStatus);
        Assert.Empty(result.MissingRequirements);
        Assert.True(result.Confidence >= 0.8);
    }

    [Fact]
    public async Task EvaluateAsync_WaterLeakMissingAfterImage_FlagsMissingEvidence()
    {
        // Arrange
        var input = new SafetyComplianceEvaluationInput
        {
            MaintenanceRecordId = Guid.NewGuid(),
            WorkOrderId = Guid.NewGuid(),
            WorkOrderNumber = "WO-2026-LEAK",
            Title = "Main waterline rupture causing deep trench erosion",
            Description = "Excavate 2-meter deep trench and replace 12-inch PVC valve",
            HazardCategory = "WaterLeak",
            Severity = "HIGH",
            Priority = "HIGH",
            Location = "Kandy Road, Peliyagoda",
            MaintenanceType = "Emergency",
            MaterialsUsed = "12-inch PVC coupling, backfill gravel",
            LabourHours = 6.0m,
            SafetyChecklist = "Trench shoring checked",
            HasBeforeImage = true,
            HasAfterImage = false, // missing completion photo
            WorkerNotes = "Excavating trench in mud without shoring boxes"
        };

        // Act
        var result = await _agent.EvaluateAsync(input);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ComplianceStatuses.RequiresReview, result.ComplianceStatus);
        Assert.NotEmpty(result.MissingRequirements);
        Assert.Contains(result.MissingRequirements, m => m.Contains("After", StringComparison.OrdinalIgnoreCase));
        Assert.NotEmpty(result.IdentifiedRisks);
    }
}
