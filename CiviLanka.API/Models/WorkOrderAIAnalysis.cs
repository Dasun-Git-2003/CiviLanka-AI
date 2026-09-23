using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Stores the AI reasoning history for each work order estimation pass.
    /// Multiple entries can exist per work order (audit trail of AI decisions).
    /// </summary>
    public class WorkOrderAIAnalysis
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WorkOrderId { get; set; }

        [ForeignKey(nameof(WorkOrderId))]
        public WorkOrder? WorkOrder { get; set; }

        [MaxLength(100)]
        public string AgentName { get; set; } = string.Empty;

        public decimal EstimatedCost { get; set; }

        /// <summary>Short action/recommendation summary from the agent.</summary>
        public string Recommendation { get; set; } = string.Empty;

        /// <summary>Full reasoning explanation from the agent.</summary>
        public string Reason { get; set; } = string.Empty;

        /// <summary>AI confidence score (0.0–1.0).</summary>
        public double Confidence { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
