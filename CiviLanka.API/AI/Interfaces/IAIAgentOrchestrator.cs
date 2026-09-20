using System;
using System.Threading.Tasks;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Interfaces
{
    public interface IAIAgentOrchestrator
    {
        Task<HazardClassificationResult> AnalyzeHazardAsync(Guid hazardId, string? triggeredByUserId = null);
        Task<AssetRiskResult> AnalyzeAssetRiskAsync(string assetId, string? triggeredByUserId = null);
        Task<CostEstimateResult> EstimateWorkOrderAsync(Guid workOrderId, string? triggeredByUserId = null);
        Task<SafetyComplianceResult> AnalyzeSafetyAsync(Guid maintenanceRecordId, string stage = "BeforeMaintenance", string? triggeredByUserId = null);
        Task<AIWorkflowResult> RunFullAssessmentAsync(Guid hazardId, string? triggeredByUserId = null);

        Task<DispatchPriorityResult> OptimizeDispatchAndRouteAsync(DispatchPriorityRequestDto request, string? triggeredByUserId = null);
        Task<MunicipalSafetyAuditResult> AuditWorkOrderComplianceAsync(Guid workOrderId, string? triggeredByUserId = null);

        Task<bool> RecordHumanOverrideAsync(AIOverrideRequestDto request, string userId);
        Task<AIDashboardStatsDto> GetDashboardStatsAsync();
    }
}
