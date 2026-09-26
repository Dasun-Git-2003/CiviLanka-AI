using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Hazards
{
    public class ReviewHazardDto
    {
        /// <summary>
        /// Action to take on the citizen report: APPROVE or REJECT.
        /// </summary>
        [Required]
        public string Action { get; set; } = "APPROVE";

        /// <summary>
        /// Optional official rationale, internal comments, or rejection reason.
        /// </summary>
        [MaxLength(1000)]
        public string? ReviewNotes { get; set; }

        /// <summary>
        /// Optional override for hazard category if citizen miscategorized it.
        /// </summary>
        [MaxLength(50)]
        public string? Category { get; set; }

        /// <summary>
        /// Optional override for priority: LOW | NORMAL | HIGH | URGENT.
        /// </summary>
        [MaxLength(20)]
        public string? Priority { get; set; }

        /// <summary>
        /// Optional override for severity: LOW | MEDIUM | HIGH | CRITICAL.
        /// </summary>
        [MaxLength(20)]
        public string? Severity { get; set; }
    }
}
