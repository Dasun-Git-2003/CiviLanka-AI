using System;
using System.Threading.Tasks;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Interfaces
{
    public interface IAIContextBuilder
    {
        Task<HazardClassificationInput> BuildHazardContextAsync(Guid hazardId);
        Task<AssetRiskInput> BuildAssetRiskContextAsync(string assetId);
        Task<CostEstimateInput> BuildCostEstimateContextAsync(Guid workOrderId);
        Task<SafetyComplianceInput> BuildSafetyComplianceContextAsync(Guid maintenanceRecordId, string stage = "BeforeMaintenance");
        Task<DispatchPriorityInput> BuildDispatchPriorityContextAsync(List<Guid>? hazardIds, string? corridor = null, string? specialization = null);
        Task<MunicipalSafetyAuditInput> BuildMunicipalSafetyAuditContextAsync(Guid workOrderId);
    }
}
