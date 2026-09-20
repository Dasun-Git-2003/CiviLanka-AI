using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CiviLanka.API.Models.Infrastructure;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// A municipal maintenance work order generated from a citizen hazard report.
    /// Member 3 owns this entity. Member 4 (Maintenance) consumes approved work orders.
    /// Soft-delete (IsCancelled) preserves the municipal audit trail.
    /// </summary>
    public class WorkOrder
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Human-readable ticket number, e.g. WO-2026-00001</summary>
        [Required]
        [MaxLength(20)]
        public string WorkOrderNumber { get; set; } = string.Empty;

        // ── Member 1 integration ─────────────────────────────────────────────────
        /// <summary>FK to the citizen hazard that originated this work order.</summary>
        public Guid? HazardId { get; set; }

        [ForeignKey(nameof(HazardId))]
        public Hazard? Hazard { get; set; }

        // ── Member 2 integration ─────────────────────────────────────────────────
        /// <summary>FK to the infrastructure asset to be repaired.</summary>
        [MaxLength(20)]
        public string? AssetId { get; set; }

        [ForeignKey(nameof(AssetId))]
        public InfrastructureAsset? Asset { get; set; }

        // ── Core fields ──────────────────────────────────────────────────────────
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        /// <summary>LOW | NORMAL | HIGH | URGENT — mirrors hazard priority</summary>
        [Required]
        [MaxLength(20)]
        public string Priority { get; set; } = "NORMAL";

        /// <summary>LOW | MEDIUM | HIGH | CRITICAL — copied from hazard AI analysis</summary>
        [MaxLength(20)]
        public string? Severity { get; set; }

        // ── Financial fields ─────────────────────────────────────────────────────
        public decimal? EstimatedCost { get; set; }
        public decimal? ApprovedBudget { get; set; }
        public decimal? ActualCost { get; set; }

        // ── AI estimate fields ───────────────────────────────────────────────────
        public int? EstimatedDurationHours { get; set; }
        public int? RecommendedCrewSize { get; set; }

        // ── Assignment fields ────────────────────────────────────────────────────
        public int? AssignedContractorId { get; set; }

        [ForeignKey(nameof(AssignedContractorId))]
        public Contractor? AssignedContractor { get; set; }

        [MaxLength(500)]
        public string? AssignedCrew { get; set; }

        public DateTime? ScheduledDate { get; set; }

        // ── Status ───────────────────────────────────────────────────────────────
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = WorkOrderStatus.AiGenerated;

        [Required]
        [MaxLength(30)]
        public string ApprovalStatus { get; set; } = "NOT_REQUIRED";

        public bool ApprovalRequired { get; set; } = false;

        [MaxLength(1000)]
        public string? Notes { get; set; }

        // ── Audit ────────────────────────────────────────────────────────────────
        [Required]
        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Soft-delete flag. Work orders are never physically deleted for municipal
        /// audit, budget, and legal compliance purposes.
        /// </summary>
        public bool IsCancelled { get; set; } = false;

        // ── Navigation ───────────────────────────────────────────────────────────
        public ICollection<WorkOrderItem> Items { get; set; } = new List<WorkOrderItem>();
        public ICollection<CostEstimate> CostEstimates { get; set; } = new List<CostEstimate>();
        public ICollection<WorkOrderAIAnalysis> AIAnalyses { get; set; } = new List<WorkOrderAIAnalysis>();
    }


    /// <summary>Valid status values for the WorkOrder lifecycle.</summary>
    public static class WorkOrderStatus
    {
        public const string AiGenerated      = "AI_GENERATED";
        public const string PendingApproval  = "PENDING_APPROVAL";
        public const string Approved         = "APPROVED";
        public const string Rejected         = "REJECTED";
        public const string Assigned         = "ASSIGNED";
        public const string Scheduled        = "SCHEDULED";
        public const string InProgress       = "IN_PROGRESS";
        public const string Completed        = "COMPLETED";
        public const string Verified         = "VERIFIED";
        public const string Closed           = "CLOSED";
        public const string Cancelled        = "CANCELLED";

        public static readonly string[] EditableStatuses =
        {
            AiGenerated, PendingApproval, Approved, Assigned, Scheduled
        };

        public static readonly string[] All =
        {
            AiGenerated, PendingApproval, Approved, Rejected,
            Assigned, Scheduled, InProgress, Completed, Verified, Closed, Cancelled
        };

        public static readonly IReadOnlyDictionary<string, string[]> ValidTransitions = new Dictionary<string, string[]>
        {
            [AiGenerated]     = new[] { PendingApproval, Approved, Assigned, Rejected, Cancelled },
            [PendingApproval] = new[] { Approved, Rejected, Cancelled },
            [Approved]        = new[] { Assigned, Scheduled, Cancelled },
            [Assigned]        = new[] { Scheduled, InProgress, Cancelled },
            [Scheduled]       = new[] { InProgress, Cancelled },
            [InProgress]      = new[] { Completed, Cancelled },
            [Completed]       = new[] { Verified, Closed, Cancelled },
            [Verified]        = new[] { Closed },
            [Rejected]        = new[] { Cancelled },
            [Closed]          = Array.Empty<string>(),
            [Cancelled]       = Array.Empty<string>()
        };

        public static bool CanTransition(string currentStatus, string targetStatus)
        {
            if (string.Equals(currentStatus, targetStatus, StringComparison.OrdinalIgnoreCase)) return true;
            if (ValidTransitions.TryGetValue(currentStatus, out var allowed))
            {
                return allowed.Contains(targetStatus, StringComparer.OrdinalIgnoreCase);
            }
            return false;
        }

        public static string[] GetAllowedNextStatuses(string currentStatus)
        {
            return ValidTransitions.TryGetValue(currentStatus, out var allowed) ? allowed : Array.Empty<string>();
        }
    }

    /// <summary>Valid approval status values for a WorkOrder.</summary>
    public static class ApprovalStatus
    {
        public const string NotRequired = "NOT_REQUIRED";
        public const string Pending     = "PENDING";
        public const string Approved    = "APPROVED";
        public const string Rejected    = "REJECTED";
    }
}
