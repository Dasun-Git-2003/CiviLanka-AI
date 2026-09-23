using System.Text.Json.Serialization;

namespace CiviLanka.API.AI.Models
{
    public class SafetyComplianceInput
    {
        public Guid MaintenanceRecordId { get; set; }
        public Guid WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? HazardCategory { get; set; }
        public string? Severity { get; set; }
        public string? Location { get; set; }
        public string MaintenanceType { get; set; } = "Corrective";
        public string? MaterialsUsed { get; set; }
        public string? EquipmentUsed { get; set; }
        public decimal LabourHours { get; set; }
        public string? SafetyChecklist { get; set; }
        public string? WorkerNotes { get; set; }
        public string? CompletionNotes { get; set; }
        public bool HasBeforeImage { get; set; }
        public bool HasAfterImage { get; set; }

        public string? AssetId { get; set; }
        public string? AssetType { get; set; }
        public string? AssetCondition { get; set; }

        public string Stage { get; set; } = "BeforeMaintenance"; // BeforeMaintenance | DuringMaintenance | BeforeVerification
    }

    public class SafetyComplianceResult
    {
        [JsonPropertyName("safetyRiskLevel")]
        public string SafetyRiskLevel { get; set; } = "LOW";

        [JsonPropertyName("complianceStatus")]
        public string ComplianceStatus { get; set; } = "ACTION_REQUIRED"; // PASS | ACTION_REQUIRED | REQUIRES_REVIEW | FAILED

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("identifiedRisks")]
        public List<string> IdentifiedRisks { get; set; } = new();

        [JsonPropertyName("missingRequirements")]
        public List<string> MissingRequirements { get; set; } = new();

        [JsonPropertyName("requiredSafetyActions")]
        public List<string> RequiredSafetyActions { get; set; } = new();

        [JsonPropertyName("recommendation")]
        public string Recommendation { get; set; } = string.Empty;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        public bool RequiresHumanReview =>
            SafetyRiskLevel == "HIGH" || SafetyRiskLevel == "CRITICAL" || ComplianceStatus != "PASS";

        public string ModelName { get; set; } = "gemini-2.5-flash";
        public string Status { get; set; } = "AI_ANALYZED";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
