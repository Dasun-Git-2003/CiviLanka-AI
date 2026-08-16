namespace CiviLanka.API.DTOs.Hazards
{
    public class HazardResponseDto
    {
        public Guid Id { get; set; }
        public string TicketNumber { get; set; } = string.Empty;
        public string CitizenId { get; set; } = string.Empty;
        public string CitizenName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Address { get; set; }
        public string? ImageUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Severity { get; set; }
        public string? RiskLevel { get; set; }
        public string? Priority { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsCancelled { get; set; }
        public HazardAIAnalysisResponseDto? LatestAIAnalysis { get; set; }
    }

    public class HazardAIAnalysisResponseDto
    {
        public Guid Id { get; set; }
        public string? Category { get; set; }
        public string Severity { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public double Confidence { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ModelName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
