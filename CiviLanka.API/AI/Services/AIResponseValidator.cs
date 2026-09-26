using System;
using System.Collections.Generic;
using System.Linq;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Services
{
    public class AIResponseValidator : IAIResponseValidator
    {
        private static readonly string[] ValidRiskLevels = { "LOW", "MEDIUM", "HIGH", "CRITICAL" };
        private static readonly string[] ValidPriorities = { "LOW", "NORMAL", "HIGH", "URGENT" };
        private static readonly string[] ValidComplianceStatuses = { "PASS", "ACTION_REQUIRED", "REQUIRES_REVIEW", "FAILED" };

        public bool ValidateHazardClassification(HazardClassificationResult result, out List<string> validationErrors)
        {
            validationErrors = new List<string>();
            if (result == null)
            {
                validationErrors.Add("Result is null.");
                return false;
            }

            if (string.IsNullOrWhiteSpace(result.Category))
                validationErrors.Add("Category cannot be empty.");

            if (!ValidRiskLevels.Contains(result.Severity?.ToUpperInvariant()))
                result.Severity = "MEDIUM";

            if (!ValidRiskLevels.Contains(result.RiskLevel?.ToUpperInvariant()))
                result.RiskLevel = "MEDIUM";

            if (!ValidPriorities.Contains(result.Priority?.ToUpperInvariant()))
                result.Priority = "NORMAL";

            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);
            if (result.RecommendedCrewSize <= 0) result.RecommendedCrewSize = 2;
            if (result.EstimatedResponseHours <= 0) result.EstimatedResponseHours = 8;

            return validationErrors.Count == 0;
        }

        public bool ValidateAssetRisk(AssetRiskResult result, out List<string> validationErrors)
        {
            validationErrors = new List<string>();
            if (result == null)
            {
                validationErrors.Add("Result is null.");
                return false;
            }

            if (!ValidRiskLevels.Contains(result.RiskLevel?.ToUpperInvariant()))
                result.RiskLevel = "MEDIUM";

            result.RiskScore = Math.Clamp(result.RiskScore, 0, 100);
            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);

            if (string.IsNullOrWhiteSpace(result.ConditionAssessment))
                result.ConditionAssessment = "Deteriorating";

            if (string.IsNullOrWhiteSpace(result.FailureLikelihood))
                result.FailureLikelihood = "Moderate";

            if (string.IsNullOrWhiteSpace(result.Urgency))
                result.Urgency = "Medium";

            return validationErrors.Count == 0;
        }

        public bool ValidateCostEstimate(CostEstimateResult result, out List<string> validationErrors)
        {
            validationErrors = new List<string>();
            if (result == null)
            {
                validationErrors.Add("Result is null.");
                return false;
            }

            result.Currency = "LKR";
            if (result.EstimatedCost <= 0 && (result.MaterialCost > 0 || result.LabourCost > 0 || result.EquipmentCost > 0))
            {
                result.EstimatedCost = result.MaterialCost + result.LabourCost + result.EquipmentCost;
            }

            if (result.EstimatedCost < 0) result.EstimatedCost = 0;
            if (result.MaterialCost < 0) result.MaterialCost = 0;
            if (result.LabourCost < 0) result.LabourCost = 0;
            if (result.EquipmentCost < 0) result.EquipmentCost = 0;

            if (result.RecommendedCrewSize <= 0) result.RecommendedCrewSize = 3;
            if (result.EstimatedDurationHours <= 0) result.EstimatedDurationHours = 8;
            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);

            return validationErrors.Count == 0;
        }

        public bool ValidateSafetyCompliance(SafetyComplianceResult result, out List<string> validationErrors)
        {
            validationErrors = new List<string>();
            if (result == null)
            {
                validationErrors.Add("Result is null.");
                return false;
            }

            if (!ValidRiskLevels.Contains(result.SafetyRiskLevel?.ToUpperInvariant()))
                result.SafetyRiskLevel = "LOW";

            if (!ValidComplianceStatuses.Contains(result.ComplianceStatus?.ToUpperInvariant()))
                result.ComplianceStatus = "REQUIRES_REVIEW";

            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);

            result.IdentifiedRisks ??= new List<string>();
            result.MissingRequirements ??= new List<string>();
            result.RequiredSafetyActions ??= new List<string>();

            return validationErrors.Count == 0;
        }

        public bool ValidateDispatchPriority(DispatchPriorityResult result, out List<string> validationErrors)
        {
            validationErrors = new List<string>();
            if (result == null)
            {
                validationErrors.Add("Result is null.");
                return false;
            }

            result.OverallOptimizationScore = Math.Clamp(result.OverallOptimizationScore, 1, 100);
            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);
            result.RankedHazards ??= new List<RankedHazardItem>();
            result.RouteClusters ??= new List<RouteCluster>();
            result.SuggestedAssignment ??= new SuggestedContractorAssignment();

            if (result.SuggestedAssignment.RecommendedCrewSize <= 0)
            {
                result.SuggestedAssignment.RecommendedCrewSize = 3;
            }

            return validationErrors.Count == 0;
        }

        public bool ValidateMunicipalSafetyAudit(MunicipalSafetyAuditResult result, out List<string> validationErrors)
        {
            validationErrors = new List<string>();
            if (result == null)
            {
                validationErrors.Add("Result is null.");
                return false;
            }

            result.ComplianceScore = Math.Clamp(result.ComplianceScore, 0, 100);
            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);

            result.Violations ??= new List<SafetyAuditViolation>();

            var validStatuses = new[] { "PASS", "FAILED", "ACTION_REQUIRED" };
            var currentStatus = result.ComplianceStatus?.ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(currentStatus) || !validStatuses.Contains(currentStatus))
            {
                result.ComplianceStatus = result.Violations.Count > 0 ? "FAILED" : "PASS";
            }
            else
            {
                result.ComplianceStatus = currentStatus;
            }

            return validationErrors.Count == 0;
        }
    }
}
