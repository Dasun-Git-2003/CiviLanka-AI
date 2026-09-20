using System.Text.Json.Serialization;

namespace CiviLanka.API.AI.Models
{
    public class AssetRiskInput
    {
        public string AssetId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public string Location { get; set; } = string.Empty;
        public DateTime? InstallationDate { get; set; }
        public int? AgeYears { get; set; }
        public string? Description { get; set; }

        // Contextual database records
        public List<string> RecentInspections { get; set; } = new();
        public List<string> MaintenanceHistory { get; set; } = new();
        public List<string> RelatedHazards { get; set; } = new();
        public int IncidentCount { get; set; }
        public string? HistoricalFailurePatterns { get; set; }
    }

    public class AssetRiskResult
    {
        [JsonPropertyName("riskLevel")]
        public string RiskLevel { get; set; } = "MEDIUM";

        [JsonPropertyName("riskScore")]
        public int RiskScore { get; set; } = 50;

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("conditionAssessment")]
        public string ConditionAssessment { get; set; } = "Deteriorating";

        [JsonPropertyName("failureLikelihood")]
        public string FailureLikelihood { get; set; } = "Moderate";

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("recommendedInspectionFrequency")]
        public string RecommendedInspectionFrequency { get; set; } = "Monthly";

        [JsonPropertyName("recommendedAction")]
        public string RecommendedAction { get; set; } = string.Empty;

        [JsonPropertyName("urgency")]
        public string Urgency { get; set; } = "Medium";

        public string ModelName { get; set; } = "gemini-2.5-flash";
        public string Status { get; set; } = "AI_ANALYZED";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
