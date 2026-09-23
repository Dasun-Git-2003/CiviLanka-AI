using System.Text.Json.Serialization;

namespace CiviLanka.API.AI.Models
{
    public class HazardClassificationInput
    {
        public Guid HazardId { get; set; }
        public string? TicketNumber { get; set; }
        public string CategorySupplied { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? ImageUrl { get; set; }

        // Contextual enriched data from database
        public List<string> NearbyHazardsSummary { get; set; } = new();
        public string? RelatedAssetSummary { get; set; }
        public List<string> HistoricalIncidentsSummary { get; set; } = new();
    }

    public class HazardClassificationResult
    {
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Other";

        [JsonPropertyName("severity")]
        public string Severity { get; set; } = "MEDIUM";

        [JsonPropertyName("riskLevel")]
        public string RiskLevel { get; set; } = "MEDIUM";

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "NORMAL";

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("recommendedAction")]
        public string RecommendedAction { get; set; } = string.Empty;

        [JsonPropertyName("recommendedCrewSize")]
        public int RecommendedCrewSize { get; set; } = 2;

        [JsonPropertyName("estimatedResponseHours")]
        public int EstimatedResponseHours { get; set; } = 8;

        public string ModelName { get; set; } = "gemini-2.5-flash";
        public string Status { get; set; } = "AI_ANALYZED"; // AI_ANALYZED, AI_FAILED, MANUAL_REVIEW, PENDING_APPROVAL
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
