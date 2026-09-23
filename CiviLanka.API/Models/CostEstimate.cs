using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// AI-generated cost breakdown for a work order.
    /// Multiple estimates can exist per work order (full audit history).
    /// </summary>
    public class CostEstimate
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WorkOrderId { get; set; }

        [ForeignKey(nameof(WorkOrderId))]
        public WorkOrder? WorkOrder { get; set; }

        /// <summary>Total estimated repair cost in LKR.</summary>
        public decimal EstimatedCost { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "LKR";

        public decimal MaterialCost { get; set; }
        public decimal LabourCost { get; set; }
        public decimal EquipmentCost { get; set; }

        /// <summary>Estimated total labour hours required.</summary>
        public double EstimatedLabourHours { get; set; }

        /// <summary>Recommended number of field workers in the crew.</summary>
        public int RecommendedCrewSize { get; set; }

        /// <summary>Estimated total repair duration in hours (may differ from labour hours).</summary>
        public double EstimatedDurationHours { get; set; }

        /// <summary>AI confidence score (0.0–1.0).</summary>
        public double Confidence { get; set; }

        /// <summary>AI reasoning explaining the cost breakdown.</summary>
        public string Reason { get; set; } = string.Empty;

        /// <summary>Name/version of the AI model used, e.g. gemini-2.0-flash.</summary>
        [MaxLength(100)]
        public string ModelName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
