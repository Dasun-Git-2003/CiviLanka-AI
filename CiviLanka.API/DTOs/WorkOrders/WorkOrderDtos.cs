using System.ComponentModel.DataAnnotations;
using CiviLanka.API.Models;

namespace CiviLanka.API.DTOs.WorkOrders
{
    public class CreateWorkOrderDto
    {
        /// <summary>FK to the hazard that triggered this work order (optional for manually-created orders).</summary>
        public Guid? HazardId { get; set; }

        /// <summary>FK to the infrastructure asset to be repaired.</summary>
        [MaxLength(20)]
        public string? AssetId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MinLength(10)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Priority { get; set; } = "NORMAL";

        public decimal? EstimatedCost { get; set; }
        public decimal? MaterialCost { get; set; }
        public decimal? LabourCost { get; set; }
        public decimal? EquipmentCost { get; set; }
        public double? EstimatedLabourHours { get; set; }
        public int? RecommendedCrewSize { get; set; }
        public double? EstimatedDurationHours { get; set; }
        [MaxLength(1000)]
        public string? EstimateReason { get; set; }
        public List<SaveWorkOrderItemDto>? Items { get; set; }

        public bool IsPriorityValid() =>
            new[] { "LOW", "NORMAL", "HIGH", "URGENT" }.Contains(Priority.ToUpperInvariant());
    }

    public class UpdateWorkOrderDto
    {
        [MaxLength(200)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        [MaxLength(20)]
        public string? Priority { get; set; }

        public int? AssignedContractorId { get; set; }

        [MaxLength(500)]
        public string? AssignedCrew { get; set; }

        public DateTime? ScheduledDate { get; set; }

        public decimal? EstimatedCost { get; set; }
        public decimal? ApprovedBudget { get; set; }
        public decimal? ActualCost { get; set; }

        [MaxLength(30)]
        public string? Status { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class UpdateWorkOrderStatusDto
    {
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class ApproveRejectDto
    {
        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class WorkOrderResponseDto
    {
        public Guid Id { get; set; }
        public string WorkOrderNumber { get; set; } = string.Empty;
        public Guid? HazardId { get; set; }
        public string? HazardTicket { get; set; }
        public string? HazardCategory { get; set; }
        public string? HazardDescription { get; set; }
        public string? HazardSeverity { get; set; }
        public string? HazardPriority { get; set; }
        public double? HazardLatitude { get; set; }
        public double? HazardLongitude { get; set; }
        public string? HazardAddress { get; set; }

        public string? AssetId { get; set; }
        public string? AssetName { get; set; }
        public string? AssetType { get; set; }
        public string? AssetCondition { get; set; }

        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string? Severity { get; set; }

        public decimal? EstimatedCost { get; set; }
        public decimal? ApprovedBudget { get; set; }
        public decimal? ActualCost { get; set; }
        public int? EstimatedDurationHours { get; set; }
        public int? RecommendedCrewSize { get; set; }

        public int? AssignedContractorId { get; set; }
        public string? AssignedContractorName { get; set; }
        public string? AssignedCrew { get; set; }
        public DateTime? ScheduledDate { get; set; }

        public string Status { get; set; } = string.Empty;
        public string ApprovalStatus { get; set; } = string.Empty;
        public bool ApprovalRequired { get; set; }
        public string? Notes { get; set; }

        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsCancelled { get; set; }

        public List<WorkOrderItemResponseDto> Items { get; set; } = new();
        public CostEstimateResponseDto? LatestCostEstimate { get; set; }
        public WorkOrderAIAnalysisResponseDto? LatestAIAnalysis { get; set; }
    }

    public class WorkOrderItemResponseDto
    {
        public Guid Id { get; set; }
        public string ItemType { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal EstimatedUnitCost { get; set; }
        public decimal EstimatedTotalCost { get; set; }
    }

    public class CostEstimateResponseDto
    {
        public Guid Id { get; set; }
        public decimal EstimatedCost { get; set; }
        public string Currency { get; set; } = "LKR";
        public decimal MaterialCost { get; set; }
        public decimal LabourCost { get; set; }
        public decimal EquipmentCost { get; set; }
        public double EstimatedLabourHours { get; set; }
        public int RecommendedCrewSize { get; set; }
        public double EstimatedDurationHours { get; set; }
        public double Confidence { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ModelName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class WorkOrderAIAnalysisResponseDto
    {
        public Guid Id { get; set; }
        public string AgentName { get; set; } = string.Empty;
        public decimal EstimatedCost { get; set; }
        public string Recommendation { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public double Confidence { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CostEstimateRequestDto
    {
        /// <summary>Hazard ID to pull data from Member 1.</summary>
        public Guid? HazardId { get; set; }

        /// <summary>Asset ID to pull data from Member 2.</summary>
        [MaxLength(20)]
        public string? AssetId { get; set; }

        /// <summary>Override category if not using a hazard.</summary>
        [MaxLength(50)]
        public string? Category { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(20)]
        public string? Severity { get; set; }

        [MaxLength(20)]
        public string? Priority { get; set; }
    }

    public class SaveWorkOrderItemDto
    {
        public Guid? Id { get; set; }
        [MaxLength(20)]
        public string ItemType { get; set; } = "Material";
        [Required]
        [MaxLength(200)]
        public string ItemName { get; set; } = string.Empty;
        public double Quantity { get; set; }
        [MaxLength(50)]
        public string Unit { get; set; } = string.Empty;
        public decimal EstimatedUnitCost { get; set; }
        public decimal EstimatedTotalCost { get; set; }
    }

    public class SaveWorkOrderEstimateDto
    {
        public decimal EstimatedCost { get; set; }
        public decimal? MaterialCost { get; set; }
        public decimal? LabourCost { get; set; }
        public decimal? EquipmentCost { get; set; }
        public double? EstimatedLabourHours { get; set; }
        public int? RecommendedCrewSize { get; set; }
        public double? EstimatedDurationHours { get; set; }
        [MaxLength(1000)]
        public string? Reason { get; set; }
        public List<SaveWorkOrderItemDto> Items { get; set; } = new();
    }

    public class CostEstimatePreviewResponseDto
    {
        public decimal EstimatedCost { get; set; }
        public string Currency { get; set; } = "LKR";
        public decimal MaterialCost { get; set; }
        public decimal LabourCost { get; set; }
        public decimal EquipmentCost { get; set; }
        public double EstimatedLabourHours { get; set; }
        public int RecommendedCrewSize { get; set; }
        public double EstimatedDurationHours { get; set; }
        public double Confidence { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ModelName { get; set; } = string.Empty;
        public List<WorkOrderItemResponseDto> Items { get; set; } = new();
    }
}
