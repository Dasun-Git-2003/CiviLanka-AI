using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Maintenance
{
    public class CreateMaintenanceRecordDto
    {
        [Required]
        public Guid WorkOrderId { get; set; }

        public string? AssetId { get; set; }

        [Required]
        [MaxLength(50)]
        public string MaintenanceType { get; set; } = "Corrective";

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        public string? MaterialsUsed { get; set; }
        public string? EquipmentUsed { get; set; }

        [Range(0, 1000)]
        public decimal LabourHours { get; set; } = 0m;

        [Range(0, 100000000)]
        public decimal ActualCost { get; set; } = 0m;

        public string? SafetyChecklist { get; set; }
        public string? WorkerNotes { get; set; }
    }

    public class UpdateMaintenanceRecordDto
    {
        [MaxLength(50)]
        public string? MaintenanceType { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public DateTime? WorkStartedAt { get; set; }
        public DateTime? WorkCompletedAt { get; set; }

        public string? Status { get; set; }

        public string? MaterialsUsed { get; set; }
        public string? EquipmentUsed { get; set; }

        [Range(0, 1000)]
        public decimal? LabourHours { get; set; }

        [Range(0, 100000000)]
        public decimal? ActualCost { get; set; }

        public string? BeforeImageUrl { get; set; }
        public string? AfterImageUrl { get; set; }

        public string? SafetyChecklist { get; set; }
        public string? WorkerNotes { get; set; }
        public string? CompletionNotes { get; set; }
    }

    public class UpdateMaintenanceStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;

        public string? Notes { get; set; }
    }

    public class VerifyMaintenanceDto
    {
        [MaxLength(2000)]
        public string? Notes { get; set; }
    }

    public class RequestCorrectionDto
    {
        [Required]
        [MaxLength(2000)]
        public string RequiredCorrections { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Notes { get; set; }
    }

    public class MaintenanceRecordResponseDto
    {
        public Guid Id { get; set; }
        public Guid WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }
        public string? WorkOrderTitle { get; set; }
        public string? WorkOrderPriority { get; set; }
        public string? WorkOrderSeverity { get; set; }
        public string? WorkOrderStatus { get; set; }
        public decimal? EstimatedCost { get; set; }
        public string? Location { get; set; }
        public string? HazardCategory { get; set; }
        public string? HazardTicket { get; set; }

        public string? AssetId { get; set; }
        public string? AssetName { get; set; }
        public string? AssetType { get; set; }
        public string? AssetCondition { get; set; }

        public string PerformedBy { get; set; } = string.Empty;
        public string MaintenanceType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public DateTime? WorkStartedAt { get; set; }
        public DateTime? WorkCompletedAt { get; set; }
        public string Status { get; set; } = string.Empty;

        public string? MaterialsUsed { get; set; }
        public string? EquipmentUsed { get; set; }
        public decimal LabourHours { get; set; }
        public decimal ActualCost { get; set; }

        public string? BeforeImageUrl { get; set; }
        public string? AfterImageUrl { get; set; }
        public string? SafetyChecklist { get; set; }
        public string? WorkerNotes { get; set; }
        public string? CompletionNotes { get; set; }

        public string VerificationStatus { get; set; } = string.Empty;
        public string? VerifiedBy { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public string? VerificationNotes { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public SafetyAnalysisResponseDto? LatestSafetyAnalysis { get; set; }
        public int AuditLogCount { get; set; }
    }

    public class SafetyAnalysisResponseDto
    {
        public Guid Id { get; set; }
        public Guid MaintenanceRecordId { get; set; }
        public Guid WorkOrderId { get; set; }
        public string AgentName { get; set; } = string.Empty;
        public string SafetyRiskLevel { get; set; } = string.Empty;
        public string ComplianceStatus { get; set; } = string.Empty;
        public double Confidence { get; set; }
        public List<string> IdentifiedRisks { get; set; } = new();
        public List<string> MissingRequirements { get; set; } = new();
        public List<string> RequiredSafetyActions { get; set; } = new();
        public string Recommendation { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class MaintenanceAuditLogDto
    {
        public Guid Id { get; set; }
        public Guid MaintenanceRecordId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string? PreviousStatus { get; set; }
        public string? NewStatus { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}
