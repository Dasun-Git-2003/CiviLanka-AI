using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models.Infrastructure
{
    /// <summary>
    /// Records a physical condition inspection performed on an infrastructure asset.
    /// Supports the Good / Moderate / Poor / Critical classification workflow.
    /// </summary>
    public class AssetInspection
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string AssetId { get; set; } = string.Empty;

        [Required]
        public DateTime InspectionDate { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(30)]
        public string Condition { get; set; } = "Good"; // Good, Moderate, Poor, Critical

        [MaxLength(500)]
        public string? IssuesFound { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? InspectorName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public InfrastructureAsset? Asset { get; set; }
    }
}

