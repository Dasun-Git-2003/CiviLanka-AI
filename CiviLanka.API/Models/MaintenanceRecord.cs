using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CiviLanka.API.Models.Infrastructure;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Represents municipal physical maintenance and field execution record.
    /// Member 4 owns this entity. It links to Member 3's WorkOrder and Member 2's InfrastructureAsset.
    /// </summary>
    public class MaintenanceRecord
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // ── Foreign Keys ──────────────────────────────────────────────────────────
        [Required]
        public Guid WorkOrderId { get; set; }

        [ForeignKey(nameof(WorkOrderId))]
        public WorkOrder? WorkOrder { get; set; }

        [MaxLength(20)]
        public string? AssetId { get; set; }

        [ForeignKey(nameof(AssetId))]
        public InfrastructureAsset? Asset { get; set; }

        // ── Execution Details ────────────────────────────────────────────────────
        [Required]
        [MaxLength(100)]
        public string PerformedBy { get; set; } = string.Empty; // Field Worker User ID or Name

        [Required]
        [MaxLength(50)]
        public string MaintenanceType { get; set; } = MaintenanceTypes.Corrective; // Routine, Corrective, Emergency, Preventive

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        public DateTime? WorkStartedAt { get; set; }
        public DateTime? WorkCompletedAt { get; set; }

        // ── Lifecycle & Status ───────────────────────────────────────────────────
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = MaintenanceStatus.Pending;

        // JSON or structured text for items consumed
        public string? MaterialsUsed { get; set; } // JSON list: [{ name, quantity, unit, cost }]
        public string? EquipmentUsed { get; set; } // JSON list: [ "Excavator", "Compactor" ]

        [Column(TypeName = "decimal(18,2)")]
        public decimal LabourHours { get; set; } = 0m;

        [Column(TypeName = "decimal(18,2)")]
        public decimal ActualCost { get; set; } = 0m;

        // ── Photo Evidence ───────────────────────────────────────────────────────
        [MaxLength(500)]
        public string? BeforeImageUrl { get; set; }

        [MaxLength(500)]
        public string? AfterImageUrl { get; set; }

        // ── Safety & Notes ───────────────────────────────────────────────────────
        /// <summary>JSON object storing confirmed safety checklist items.</summary>
        public string? SafetyChecklist { get; set; }

        [MaxLength(2000)]
        public string? WorkerNotes { get; set; }

        [MaxLength(2000)]
        public string? CompletionNotes { get; set; }

        // ── Supervisor Verification ──────────────────────────────────────────────
        [Required]
        [MaxLength(30)]
        public string VerificationStatus { get; set; } = MaintenanceVerificationStatus.NotSubmitted;

        [MaxLength(100)]
        public string? VerifiedBy { get; set; } // Supervisor User ID or Name

        public DateTime? VerifiedAt { get; set; }

        [MaxLength(2000)]
        public string? VerificationNotes { get; set; }

        // ── Audit & Soft Delete ──────────────────────────────────────────────────
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;

        // ── Navigation Collections ───────────────────────────────────────────────
        public ICollection<MaintenanceSafetyAnalysis> SafetyAnalyses { get; set; } = new List<MaintenanceSafetyAnalysis>();
        public ICollection<MaintenanceAuditLog> AuditLogs { get; set; } = new List<MaintenanceAuditLog>();
    }

    public static class MaintenanceStatus
    {
        public const string Pending             = "PENDING";
        public const string Assigned            = "ASSIGNED";
        public const string InProgress          = "IN_PROGRESS";
        public const string Completed           = "COMPLETED";
        public const string VerificationPending = "VERIFICATION_PENDING";
        public const string Verified            = "VERIFIED";
        public const string RequiresCorrection  = "REQUIRES_CORRECTION";
        public const string Cancelled           = "CANCELLED";

        public static readonly string[] All =
        {
            Pending, Assigned, InProgress, Completed,
            VerificationPending, Verified, RequiresCorrection, Cancelled
        };

        public static readonly IReadOnlyDictionary<string, string[]> ValidTransitions = new Dictionary<string, string[]>
        {
            [Pending]             = new[] { Assigned, Cancelled },
            [Assigned]            = new[] { InProgress, Cancelled },
            [InProgress]          = new[] { Completed, Cancelled },
            [Completed]           = new[] { VerificationPending, Cancelled },
            [VerificationPending] = new[] { Verified, RequiresCorrection, Cancelled },
            [RequiresCorrection]  = new[] { InProgress, Cancelled },
            [Verified]            = Array.Empty<string>(),
            [Cancelled]           = Array.Empty<string>()
        };

        public static bool CanTransition(string current, string target)
        {
            if (string.Equals(current, target, StringComparison.OrdinalIgnoreCase)) return true;
            if (ValidTransitions.TryGetValue(current, out var allowed))
            {
                return allowed.Contains(target, StringComparer.OrdinalIgnoreCase);
            }
            return false;
        }

        public static string[] GetAllowedNextStatuses(string current) =>
            ValidTransitions.TryGetValue(current, out var allowed) ? allowed : Array.Empty<string>();
    }

    public static class MaintenanceVerificationStatus
    {
        public const string NotSubmitted       = "NOT_SUBMITTED";
        public const string Pending            = "PENDING";
        public const string Verified           = "VERIFIED";
        public const string RequiresCorrection = "REQUIRES_CORRECTION";
        public const string Rejected           = "REJECTED";
    }

    public static class MaintenanceTypes
    {
        public const string Corrective = "Corrective";
        public const string Routine    = "Routine";
        public const string Emergency  = "Emergency";
        public const string Preventive = "Preventive";

        public static readonly string[] All = { Corrective, Routine, Emergency, Preventive };
    }
}
