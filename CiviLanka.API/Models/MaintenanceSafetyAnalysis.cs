using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Stores the evaluation performed by the Safety & Compliance AI Agent
    /// for a municipal maintenance operation.
    /// </summary>
    public class MaintenanceSafetyAnalysis
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid MaintenanceRecordId { get; set; }

        [ForeignKey(nameof(MaintenanceRecordId))]
        public MaintenanceRecord? MaintenanceRecord { get; set; }

        [Required]
        public Guid WorkOrderId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AgentName { get; set; } = "SafetyComplianceAgent";

        /// <summary>LOW | MEDIUM | HIGH | CRITICAL</summary>
        [Required]
        [MaxLength(20)]
        public string SafetyRiskLevel { get; set; } = "LOW";

        /// <summary>PASS | REQUIRES_REVIEW | FAILED</summary>
        [Required]
        [MaxLength(30)]
        public string ComplianceStatus { get; set; } = "REQUIRES_REVIEW";

        public double Confidence { get; set; } = 0.0;

        /// <summary>JSON array of identified physical & environmental hazards.</summary>
        public string IdentifiedRisksJson { get; set; } = "[]";

        /// <summary>JSON array of missing evidence, checklists, or safety actions.</summary>
        public string MissingRequirementsJson { get; set; } = "[]";

        /// <summary>JSON array of recommended protective measures.</summary>
        public string RequiredSafetyActionsJson { get; set; } = "[]";

        [MaxLength(2000)]
        public string Recommendation { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string Reason { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class SafetyRiskLevels
    {
        public const string Low      = "LOW";
        public const string Medium   = "MEDIUM";
        public const string High     = "HIGH";
        public const string Critical = "CRITICAL";

        public static readonly string[] All = { Low, Medium, High, Critical };
    }

    public static class ComplianceStatuses
    {
        public const string Pass           = "PASS";
        public const string RequiresReview = "REQUIRES_REVIEW";
        public const string Failed         = "FAILED";

        public static readonly string[] All = { Pass, RequiresReview, Failed };
    }
}
