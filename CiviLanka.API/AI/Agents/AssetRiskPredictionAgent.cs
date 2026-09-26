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
                _logger.LogWarning("Gemini is not configured. Creating AI_FAILED record for asset {Id}.", input.AssetId);
                var fallback = BuildUnavailableFallback(input);
                await PersistAnalysisAsync(input.AssetId, fallback);
                return fallback;
            }

            try
            {
                var systemPrompt = AssetRiskPrompt.SystemPrompt;
                var userPrompt = AssetRiskPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for asset risk prediction on {AssetId}", input.AssetId);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty response for asset {AssetId}.", input.AssetId);
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input.AssetId, failureResult);
                    return failureResult;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<AssetRiskResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini output for asset {AssetId}: {Raw}", input.AssetId, jsonResponse);
                    var failureResult = BuildUnavailableFallback(input);
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
                _logger.LogError(ex, "Unexpected error in AssetRiskPredictionAgent for {AssetId}", input.AssetId);
                var errResult = BuildUnavailableFallback(input);
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

        private AssetRiskResult BuildUnavailableFallback(AssetRiskInput input)
        {
            return new AssetRiskResult
            {
                RiskLevel = "MEDIUM",
                RiskScore = 50,
                Confidence = 0.0,
                ConditionAssessment = "Unassessed",
                FailureLikelihood = "Moderate",
                Reason = "Gemini LLM inference service is currently unavailable. Asset condition requires physical engineer inspection.",
                RecommendedInspectionFrequency = "Monthly",
                RecommendedAction = "Schedule routine physical inspection by civil engineer.",
                Urgency = "Medium",
                ModelName = _gemini.ModelName,
                Status = "AI_FAILED"
            };
        }
    }
}
