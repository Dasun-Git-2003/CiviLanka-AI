using System.Threading.Tasks;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Interfaces
{
    /// <summary>
    /// Client interface for communicating with CiviLanka.Agent FastAPI Python service (port 8001)
    /// which provides LangGraph-driven RAG grounded in Sri Lanka CIDA/BSR rates and municipal matrices.
    /// </summary>
    public interface IAgentServiceClient
    {
        Task<bool> IsAgentServiceAvailableAsync();
        Task<HazardClassificationResult?> ClassifyHazardViaAgentAsync(HazardClassificationInput input);
        Task<CostEstimateResult?> EstimateCostViaAgentAsync(CostEstimateInput input);
        Task<DispatchPriorityResult?> OptimizeDispatchViaAgentAsync(DispatchPriorityInput input);
        Task<MunicipalSafetyAuditResult?> AuditSafetyViaAgentAsync(MunicipalSafetyAuditInput input);
        Task<AssetRiskResult?> AnalyzeAssetRiskViaAgentAsync(AssetRiskInput input);
    }
}
