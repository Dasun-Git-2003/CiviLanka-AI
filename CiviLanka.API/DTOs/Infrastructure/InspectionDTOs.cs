using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Infrastructure
{
    public class CreateInspectionDto
    {
        [Required(ErrorMessage = "Inspection date is required")]
        public DateTime InspectionDate { get; set; } = DateTime.UtcNow;

        [Required(ErrorMessage = "Condition is required")]
        [RegularExpression("^(Good|Moderate|Poor|Critical)$", ErrorMessage = "Condition must be Good, Moderate, Poor, or Critical")]
        public string Condition { get; set; } = "Good";

        [MaxLength(500)]
        public string? IssuesFound { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? InspectorName { get; set; }
    }

    public class InspectionResponseDto
    {
        public int Id { get; set; }
        public string AssetId { get; set; } = string.Empty;
        public string? AssetName { get; set; }
        public DateTime InspectionDate { get; set; }
        public string Condition { get; set; } = string.Empty;
        public string? IssuesFound { get; set; }
        public string? Notes { get; set; }
        public string? InspectorName { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

