using System;

namespace CiviLanka.API.AI.Models
{
    public class AIWorkflowResult
    {
        public Guid HazardId { get; set; }
        public string? TicketNumber { get; set; }
        public HazardClassificationResult? Classification { get; set; }
        public AssetRiskResult? AssetRisk { get; set; }
        public CostEstimateResult? CostEstimate { get; set; }
        public SafetyComplianceResult? SafetyCompliance { get; set; }

        public string WorkflowStatus { get; set; } = "PENDING_APPROVAL"; // AUTO_PROCEED | PENDING_SUPERVISOR_APPROVAL | PENDING_DIRECTOR_APPROVAL | ACTION_REQUIRED
        public string DecisionReason { get; set; } = string.Empty;
        public bool RequiresSupervisorReview { get; set; }
        public bool RequiresDirectorReview { get; set; }
        public List<string> AuditTrail { get; set; } = new();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class AIOverrideRequestDto
    {
        public string EntityType { get; set; } = "Hazard"; // Hazard | WorkOrder | MaintenanceRecord | Asset
        public string EntityId { get; set; } = string.Empty;
        public string Decision { get; set; } = "OVERRIDDEN"; // APPROVED | REJECTED | OVERRIDDEN
        public string? OriginalValue { get; set; }
        public string? NewValue { get; set; }
        public string OverrideReason { get; set; } = string.Empty;
    }

    public class AIDashboardStatsDto
    {
        public int TotalAnalyses { get; set; }
        public int HighRiskHazards { get; set; }
        public int LowConfidenceDecisions { get; set; }
        public int PendingReviews { get; set; }
        public double AverageConfidence { get; set; }
        public decimal TotalEstimatedCost { get; set; }
        public decimal TotalActualCost { get; set; }
        public int AcceptedRecommendations { get; set; }
        public int OverriddenRecommendations { get; set; }
        public int SafetyIssuesDetected { get; set; }
        public List<RecentAIActivityDto> RecentActivity { get; set; } = new();
    }

    public class RecentAIActivityDto
    {
        public string AgentName { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public double Confidence { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
