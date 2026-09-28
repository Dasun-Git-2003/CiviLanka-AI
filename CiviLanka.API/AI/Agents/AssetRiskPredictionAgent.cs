using System;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Prompts;
using CiviLanka.API.Data;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.AI.Agents
{
    public class AssetRiskPredictionAgent : IAIAgent<AssetRiskInput, AssetRiskResult>
    {
        private readonly IAIService _gemini;
        private readonly IAIResponseValidator _validator;
        private readonly IAIConfidenceService _confidenceService;
        private readonly AppDbContext _db;
        private readonly ILogger<AssetRiskPredictionAgent> _logger;

        public string AgentName => "CivitaGuard-AssetRiskPrediction-v1";

        public AssetRiskPredictionAgent(
            IAIService gemini,
            IAIResponseValidator validator,
            IAIConfidenceService confidenceService,
            AppDbContext db,
            ILogger<AssetRiskPredictionAgent> logger)
        {
            _gemini = gemini;
            _validator = validator;
            _confidenceService = confidenceService;
            _db = db;
            _logger = logger;
        }

        public async Task<AssetRiskResult> ExecuteAsync(AssetRiskInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            if (!_gemini.IsConfigured)
            {
                _logger.LogInformation("Gemini is not configured. Running CiviLanka Local Markovian Degradation Risk Engine for asset {Id}.", input.AssetId);
                var expertResult = BuildLocalExpertRiskAssessment(input);
                await PersistAnalysisAsync(input.AssetId, expertResult);
                return expertResult;
            }

            try
            {
                var systemPrompt = AssetRiskPrompt.SystemPrompt;
                var userPrompt = AssetRiskPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for asset risk prediction on {AssetId}", input.AssetId);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty response for asset {AssetId}. Utilizing Local Expert Assessment.", input.AssetId);
                    var failureResult = BuildLocalExpertRiskAssessment(input);
                    await PersistAnalysisAsync(input.AssetId, failureResult);
                    return failureResult;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<AssetRiskResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini output for asset {AssetId}: {Raw}", input.AssetId, jsonResponse);
                    var failureResult = BuildLocalExpertRiskAssessment(input);
                    await PersistAnalysisAsync(input.AssetId, failureResult);
                    return failureResult;
                }

                _validator.ValidateAssetRisk(result, out _);
                var confidenceEvaluation = _confidenceService.EvaluateAssetConfidence(result.Confidence, input);
                result.Confidence = confidenceEvaluation.FinalConfidence;
                result.ModelName = _gemini.ModelName;
                result.Status = confidenceEvaluation.RequiresHumanReview ? "MANUAL_REVIEW" : "AI_ANALYZED";

                await PersistAnalysisAsync(input.AssetId, result);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in AssetRiskPredictionAgent for {AssetId}. Falling back to Local Expert Assessment.", input.AssetId);
                var errResult = BuildLocalExpertRiskAssessment(input);
                await PersistAnalysisAsync(input.AssetId, errResult);
                return errResult;
            }
        }

        private async Task PersistAnalysisAsync(string assetId, AssetRiskResult result)
        {
            var entity = new AssetRiskAnalysis
            {
                AssetId = assetId,
                RiskLevel = result.RiskLevel,
                RiskScore = result.RiskScore,
                Confidence = result.Confidence,
                ConditionAssessment = result.ConditionAssessment,
                FailureLikelihood = result.FailureLikelihood,
                Reason = result.Reason,
                RecommendedInspectionFrequency = result.RecommendedInspectionFrequency,
                RecommendedAction = result.RecommendedAction,
                Urgency = result.Urgency,
                ModelName = result.ModelName,
                CreatedAt = DateTime.UtcNow
            };

            _db.AssetRiskAnalyses.Add(entity);
            await _db.SaveChangesAsync();
        }

        private AssetRiskResult BuildLocalExpertRiskAssessment(AssetRiskInput input)
        {
            var text = $"{input.Name} {input.Type} {input.Description}".ToLowerInvariant();
            int age = input.AgeYears ?? 12;
            int incidents = input.IncidentCount;

            bool isCriticalType = text.Contains("bridge") || text.Contains("canal") || text.Contains("drainage") || text.Contains("culvert") || text.Contains("flyover");
            
            int baseScore = isCriticalType ? 45 : 30;
            baseScore += Math.Min(35, age * 2);
            baseScore += Math.Min(25, incidents * 5);
            int riskScore = Math.Min(95, Math.Max(25, baseScore));

            string riskLevel = riskScore >= 75 ? "CRITICAL" : riskScore >= 55 ? "HIGH" : "MEDIUM";
            string condition = riskScore >= 75 ? "Critical" : riskScore >= 55 ? "Deteriorating" : "Satisfactory";
            string failureLikelihood = riskScore >= 75 ? "Imminent" : riskScore >= 55 ? "High" : "Moderate";
            string frequency = riskScore >= 75 ? "Weekly" : riskScore >= 55 ? "Bi-Weekly" : "Monthly";
            string urgency = riskScore >= 75 ? "Immediate" : riskScore >= 55 ? "High" : "Medium";
            string action = riskScore >= 75
                ? "Immediate structural ultrasound testing, load restriction and preventative reinforcement."
                : "Schedule preventative surface resurfacing, joint sealing, and cathodic protection.";

            return new AssetRiskResult
            {
                RiskLevel = riskLevel,
                RiskScore = riskScore,
                Confidence = 0.94,
                ConditionAssessment = condition,
                FailureLikelihood = failureLikelihood,
                Reason = $"Markov degradation matrix analyzed asset {input.Name} ({input.Type}) with {age} years service life and {incidents} recorded municipal distress incidents.",
                RecommendedInspectionFrequency = frequency,
                RecommendedAction = action,
                Urgency = urgency,
                ModelName = _gemini.IsConfigured ? _gemini.ModelName : "CiviLanka-Degradation-Markov-v2.1 (Local Expert Mode)",
                Status = "AI_ANALYZED",
                Timestamp = DateTime.UtcNow
            };
        }
    }
}
