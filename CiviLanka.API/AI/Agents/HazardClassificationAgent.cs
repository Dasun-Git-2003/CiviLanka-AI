using System;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Prompts;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.AI.Agents
{
    public class HazardClassificationAgent : IAIAgent<HazardClassificationInput, HazardClassificationResult>
    {
        private readonly IAIService _gemini;
        private readonly IAIResponseValidator _validator;
        private readonly IAIConfidenceService _confidenceService;
        private readonly AppDbContext _db;
        private readonly ILogger<HazardClassificationAgent> _logger;

        public string AgentName => "CivitaGuard-HazardClassification-v2";

        public HazardClassificationAgent(
            IAIService gemini,
            IAIResponseValidator validator,
            IAIConfidenceService confidenceService,
            AppDbContext db,
            ILogger<HazardClassificationAgent> logger)
        {
            _gemini = gemini;
            _validator = validator;
            _confidenceService = confidenceService;
            _db = db;
            _logger = logger;
        }

        public async Task<HazardClassificationResult> ExecuteAsync(HazardClassificationInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            if (!_gemini.IsConfigured)
            {
                _logger.LogWarning("Gemini is not configured. Creating AI_FAILED record for hazard {Id}.", input.HazardId);
                var fallback = BuildUnavailableFallback(input);
                await PersistAnalysisAsync(input.HazardId, fallback);
                return fallback;
            }

            try
            {
                var systemPrompt = HazardPrompt.SystemPrompt;
                var userPrompt = HazardPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for hazard classification on Ticket {Ticket}", input.TicketNumber);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty or invalid response. Returning AI_FAILED.");
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input.HazardId, failureResult);
                    return failureResult;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<HazardClassificationResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini output: {Raw}", jsonResponse);
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input.HazardId, failureResult);
                    return failureResult;
                }

                _validator.ValidateHazardClassification(result, out _);
                var confidenceEvaluation = _confidenceService.EvaluateHazardConfidence(result.Confidence, input);
                result.Confidence = confidenceEvaluation.FinalConfidence;
                result.ModelName = _gemini.ModelName;
                result.Status = confidenceEvaluation.RequiresHumanReview ? "MANUAL_REVIEW" : "AI_ANALYZED";

                await PersistAnalysisAsync(input.HazardId, result);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in HazardClassificationAgent for {Id}", input.HazardId);
                var errResult = BuildUnavailableFallback(input);
                await PersistAnalysisAsync(input.HazardId, errResult);
                return errResult;
            }
        }

        private async Task PersistAnalysisAsync(Guid hazardId, HazardClassificationResult result)
        {
            var hazard = await _db.Hazards.FirstOrDefaultAsync(h => h.Id == hazardId);
            if (hazard == null) return;

            // Update hazard properties
            if (result.Status != "AI_FAILED")
            {
                hazard.Severity = result.Severity;
                hazard.RiskLevel = result.RiskLevel;
                hazard.Priority = result.Priority;
                hazard.UpdatedAt = DateTime.UtcNow;
            }

            // Persist AI analysis log
            var analysisEntity = new HazardAIAnalysis
            {
                HazardId = hazardId,
                Category = result.Category,
                Severity = result.Severity,
                RiskLevel = result.RiskLevel,
                Priority = result.Priority,
                Confidence = result.Confidence,
                Reason = result.Reason,
                ModelName = result.ModelName,
                CreatedAt = DateTime.UtcNow
            };

            _db.HazardAIAnalyses.Add(analysisEntity);
            await _db.SaveChangesAsync();
        }

        private HazardClassificationResult BuildUnavailableFallback(HazardClassificationInput input)
        {
            return new HazardClassificationResult
            {
                Category = input.CategorySupplied,
                Severity = "MEDIUM",
                RiskLevel = "MEDIUM",
                Priority = "NORMAL",
                Confidence = 0.0,
                Reason = "Gemini LLM inference service is currently unavailable. Report flagged for human manual review.",
                RecommendedAction = "Manual inspection by field supervisor.",
                RecommendedCrewSize = 2,
                EstimatedResponseHours = 24,
                ModelName = _gemini.ModelName,
                Status = "AI_FAILED"
            };
        }
    }
}
