using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Stores the result of each AI classification pass on a hazard.
    /// Multiple analyses can be stored over time (full audit history).
    /// </summary>
    public class HazardAIAnalysis
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid HazardId { get; set; }

        [ForeignKey(nameof(HazardId))]
        public Hazard? Hazard { get; set; }

        /// <summary>Category as determined by the AI (may refine citizen selection).</summary>
        [MaxLength(50)]
        public string? Category { get; set; }

        /// <summary>LOW | MEDIUM | HIGH | CRITICAL</summary>
        [MaxLength(20)]
        public string Severity { get; set; } = string.Empty;

        /// <summary>LOW | MEDIUM | HIGH | CRITICAL</summary>
        [MaxLength(20)]
        public string RiskLevel { get; set; } = string.Empty;

        /// <summary>LOW | NORMAL | HIGH | URGENT</summary>
        [MaxLength(20)]
        public string Priority { get; set; } = string.Empty;

        /// <summary>Confidence score returned by the AI model (0.0 – 1.0).</summary>
        public double Confidence { get; set; }

        /// <summary>Short natural-language explanation of the AI's classification decision.</summary>
        public string Reason { get; set; } = string.Empty;

        /// <summary>Name of the model used, e.g. gemini-2.0-flash</summary>
        [MaxLength(100)]
        public string ModelName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
