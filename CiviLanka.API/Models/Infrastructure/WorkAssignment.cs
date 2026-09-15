using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models.Infrastructure
{
    /// <summary>
    /// Represents a work order or repair assignment dispatched to a contractor for an infrastructure asset.
    /// Tracks repair history, urgency, and completion status.
    /// </summary>
    public class WorkAssignment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int ContractorId { get; set; }

        [MaxLength(20)]
        public string? AssetId { get; set; }

        [Required]
        [MaxLength(150)]
        public string AssetName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string AssetType { get; set; } = "Water";

        [Required]
        [MaxLength(20)]
        public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical

        [Required]
        public DateTime DueDate { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Pending"; // Pending, InProgress, Done, Cancelled

        [Column(TypeName = "decimal(18,2)")]
        public decimal? EstimatedCost { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ActualCost { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        // Navigation properties
        public Contractor? Contractor { get; set; }
        public InfrastructureAsset? Asset { get; set; }
    }
}

