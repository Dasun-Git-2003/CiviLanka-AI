using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Interfaces
{
    public interface IAIResponseValidator
    {
        bool ValidateHazardClassification(HazardClassificationResult result, out List<string> validationErrors);
        bool ValidateAssetRisk(AssetRiskResult result, out List<string> validationErrors);
        bool ValidateCostEstimate(CostEstimateResult result, out List<string> validationErrors);
        bool ValidateSafetyCompliance(SafetyComplianceResult result, out List<string> validationErrors);
        bool ValidateDispatchPriority(DispatchPriorityResult result, out List<string> validationErrors);
        bool ValidateMunicipalSafetyAudit(MunicipalSafetyAuditResult result, out List<string> validationErrors);
    }

    public interface IAIConfidenceService
    {
        AIConfidenceEvaluation EvaluateHazardConfidence(double rawConfidence, HazardClassificationInput context);
        AIConfidenceEvaluation EvaluateAssetConfidence(double rawConfidence, AssetRiskInput context);
        AIConfidenceEvaluation EvaluateCostConfidence(double rawConfidence, CostEstimateInput context);
        AIConfidenceEvaluation EvaluateSafetyConfidence(double rawConfidence, SafetyComplianceInput context);
    }
}
