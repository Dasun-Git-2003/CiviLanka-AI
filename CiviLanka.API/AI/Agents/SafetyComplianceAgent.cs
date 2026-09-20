using System;
using System.Collections.Generic;
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
    public class SafetyComplianceAgent : IAIAgent<SafetyComplianceInput, SafetyComplianceResult>
    {
        private readonly IAIService _gemini;
        private readonly IAIResponseValidator _validator;
        private readonly IAIConfidenceService _confidenceService;
        private readonly AppDbContext _db;
        private readonly ILogger<SafetyComplianceAgent> _logger;

        public string AgentName => "CivitaGuard-SafetyCompliance-v2";

        public SafetyComplianceAgent(
            IAIService gemini,
            IAIResponseValidator validator,
            IAIConfidenceService confidenceService,
            AppDbContext db,
            ILogger<SafetyComplianceAgent> logger)
        {
            _gemini = gemini;
            _validator = validator;
            _confidenceService = confidenceService;
            _db = db;
            _logger = logger;
        }

        public async Task<SafetyComplianceResult> ExecuteAsync(SafetyComplianceInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            if (!_gemini.IsConfigured)
            {
                _logger.LogWarning("Gemini is not configured. Creating AI_FAILED safety record for record {Id}.", input.MaintenanceRecordId);
                var fallback = BuildUnavailableFallback(input);
                await PersistAnalysisAsync(input, fallback);
                return fallback;
            }

            try
            {
                var systemPrompt = SafetyPrompt.SystemPrompt;
                var userPrompt = SafetyPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for safety & compliance audit on maintenance record {Id}", input.MaintenanceRecordId);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty response for maintenance record {Id}.", input.MaintenanceRecordId);
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input, failureResult);
                    return failureResult;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<SafetyComplianceResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini safety audit for record {Id}: {Raw}", input.MaintenanceRecordId, jsonResponse);
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input, failureResult);
                    return failureResult;
                }

                _validator.ValidateSafetyCompliance(result, out _);
                var confidenceEvaluation = _confidenceService.EvaluateSafetyConfidence(result.Confidence, input);
                result.Confidence = confidenceEvaluation.FinalConfidence;
                result.ModelName = _gemini.ModelName;
                result.Status = result.RequiresHumanReview ? "MANUAL_REVIEW" : "AI_ANALYZED";

                await PersistAnalysisAsync(input, result);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in SafetyComplianceAgent for record {Id}", input.MaintenanceRecordId);
                var errResult = BuildUnavailableFallback(input);
                await PersistAnalysisAsync(input, errResult);
                return errResult;
            }
        }

        private async Task PersistAnalysisAsync(SafetyComplianceInput input, SafetyComplianceResult result)
        {
            var entity = new MaintenanceSafetyAnalysis
            {
                MaintenanceRecordId = input.MaintenanceRecordId,
                WorkOrderId = input.WorkOrderId,
                AgentName = AgentName,
                SafetyRiskLevel = result.SafetyRiskLevel,
                ComplianceStatus = result.ComplianceStatus,
                Confidence = result.Confidence,
                IdentifiedRisksJson = JsonSerializer.Serialize(result.IdentifiedRisks ?? new List<string>()),
                MissingRequirementsJson = JsonSerializer.Serialize(result.MissingRequirements ?? new List<string>()),
                RequiredSafetyActionsJson = JsonSerializer.Serialize(result.RequiredSafetyActions ?? new List<string>()),
                Recommendation = result.Recommendation,
                Reason = result.Reason,
                CreatedAt = DateTime.UtcNow
            };

            _db.MaintenanceSafetyAnalyses.Add(entity);
            await _db.SaveChangesAsync();
        }

        private SafetyComplianceResult BuildUnavailableFallback(SafetyComplianceInput input)
        {
            return new SafetyComplianceResult
            {
                SafetyRiskLevel = "MEDIUM",
                ComplianceStatus = "REQUIRES_REVIEW",
                Confidence = 0.0,
                IdentifiedRisks = new List<string> { "AI inference unavailable; manual safety check required" },
                MissingRequirements = new List<string> { "Physical safety checklist sign-off by site supervisor" },
                RequiredSafetyActions = new List<string> { "Verify PPE and site signage before allowing contractor mobilization" },
                Recommendation = "Awaiting manual safety inspection by Field Maintenance Supervisor.",
                Reason = "Gemini LLM inference service is currently unavailable. Safety assessment flagged for human review.",
                ModelName = _gemini.ModelName,
                Status = "AI_FAILED"
            };
        }
    }
}
