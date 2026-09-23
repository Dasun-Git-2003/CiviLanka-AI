using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Prompts;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CiviLanka.API.AI.Agents
{
    public class CostMaterialEstimatorAgent : IAIAgent<CostEstimateInput, CostEstimateResult>
    {
        private readonly IAIService _gemini;
        private readonly IAIResponseValidator _validator;
        private readonly IAIConfidenceService _confidenceService;
        private readonly AISettings _settings;
        private readonly AppDbContext _db;
        private readonly ILogger<CostMaterialEstimatorAgent> _logger;

        public string AgentName => "CivitaGuard-CostMaterialEstimator-v2";

        public CostMaterialEstimatorAgent(
            IAIService gemini,
            IAIResponseValidator validator,
            IAIConfidenceService confidenceService,
            IOptions<AISettings> settings,
            AppDbContext db,
            ILogger<CostMaterialEstimatorAgent> logger)
        {
            _gemini = gemini;
            _validator = validator;
            _confidenceService = confidenceService;
            _settings = settings.Value;
            _db = db;
            _logger = logger;
        }

        public async Task<CostEstimateResult> ExecuteAsync(CostEstimateInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            if (!_gemini.IsConfigured)
            {
                _logger.LogWarning("Gemini is not configured. Creating AI_FAILED record for work order {Id}.", input.WorkOrderId);
                var fallback = BuildUnavailableFallback(input);
                await PersistAnalysisAsync(input.WorkOrderId, fallback);
                return fallback;
            }

            try
            {
                var systemPrompt = CostEstimatorPrompt.SystemPrompt;
                var userPrompt = CostEstimatorPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for cost & material estimation on WO {Order}", input.WorkOrderNumber);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty response for WO {Id}.", input.WorkOrderId);
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input.WorkOrderId, failureResult);
                    return failureResult;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<CostEstimateResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini cost estimate for WO {Id}: {Raw}", input.WorkOrderId, jsonResponse);
                    var failureResult = BuildUnavailableFallback(input);
                    await PersistAnalysisAsync(input.WorkOrderId, failureResult);
                    return failureResult;
                }

                _validator.ValidateCostEstimate(result, out _);
                var confidenceEvaluation = _confidenceService.EvaluateCostConfidence(result.Confidence, input);
                result.Confidence = confidenceEvaluation.FinalConfidence;

                // Evaluate fiscal approval thresholds
                result.RequiresSupervisorApproval = result.EstimatedCost >= _settings.SupervisorApprovalCost;
                result.RequiresDirectorApproval = result.EstimatedCost >= _settings.DirectorApprovalCost;

                result.ModelName = _gemini.ModelName;
                result.Status = confidenceEvaluation.RequiresHumanReview || result.RequiresDirectorApproval ? "PENDING_APPROVAL" : "AI_ANALYZED";

                await PersistAnalysisAsync(input.WorkOrderId, result);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in CostMaterialEstimatorAgent for WO {Id}", input.WorkOrderId);
                return BuildUnavailableFallback(input);
            }
        }

        private async Task PersistAnalysisAsync(Guid workOrderId, CostEstimateResult result)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Items)
                .FirstOrDefaultAsync(w => w.Id == workOrderId);

            if (workOrder == null) return;

            // Update work order estimation
            if (result.Status != "AI_FAILED")
            {
                workOrder.EstimatedCost = result.EstimatedCost;
                workOrder.EstimatedDurationHours = result.EstimatedDurationHours;
                workOrder.UpdatedAt = DateTime.UtcNow;

                // Sync BOQ WorkOrderItems
                if (result.Materials != null && result.Materials.Count > 0)
                {
                    foreach (var mat in result.Materials)
                    {
                        var existing = workOrder.Items.FirstOrDefault(i => i.ItemName.Equals(mat.Name, StringComparison.OrdinalIgnoreCase));
                        if (existing != null)
                        {
                            existing.Quantity = (double)mat.Quantity;
                            existing.EstimatedUnitCost = mat.EstimatedUnitCost;
                            existing.EstimatedTotalCost = mat.TotalCost;
                        }
                        else
                        {
                            var newItem = new WorkOrderItem
                            {
                                Id = Guid.NewGuid(),
                                WorkOrderId = workOrder.Id,
                                ItemType = WorkOrderItemType.Material,
                                ItemName = mat.Name,
                                Unit = mat.Unit,
                                Quantity = (double)mat.Quantity,
                                EstimatedUnitCost = mat.EstimatedUnitCost,
                                EstimatedTotalCost = mat.TotalCost
                            };
                            _db.WorkOrderItems.Add(newItem);
                        }
                    }
                }
            }

            // Persist CostEstimate entry
            var costEstimate = new CostEstimate
            {
                Id = Guid.NewGuid(),
                WorkOrderId = workOrderId,
                EstimatedCost = result.EstimatedCost,
                MaterialCost = result.MaterialCost,
                LabourCost = result.LabourCost,
                EquipmentCost = result.EquipmentCost,
                EstimatedLabourHours = (double)result.EstimatedLabourHours,
                RecommendedCrewSize = result.RecommendedCrewSize,
                EstimatedDurationHours = (double)result.EstimatedDurationHours,
                Confidence = result.Confidence,
                Reason = result.Reason,
                Currency = result.Currency,
                ModelName = result.ModelName,
                CreatedAt = DateTime.UtcNow
            };
            _db.CostEstimates.Add(costEstimate);

            // Persist WorkOrderAIAnalysis entry
            var aiAnalysis = new WorkOrderAIAnalysis
            {
                Id = Guid.NewGuid(),
                WorkOrderId = workOrderId,
                AgentName = AgentName,
                EstimatedCost = result.EstimatedCost,
                Confidence = result.Confidence,
                Recommendation = result.Recommendation ?? "Proceed with work order execution upon authorization.",
                Reason = result.Reason,
                CreatedAt = DateTime.UtcNow
            };
            _db.WorkOrderAIAnalyses.Add(aiAnalysis);

            _db.Entry(workOrder).State = EntityState.Modified;

            await _db.SaveChangesAsync();
        }

        private CostEstimateResult BuildUnavailableFallback(CostEstimateInput input)
        {
            return new CostEstimateResult
            {
                EstimatedCost = 0,
                Currency = "LKR",
                MaterialCost = 0,
                LabourCost = 0,
                EquipmentCost = 0,
                EstimatedLabourHours = 0,
                RecommendedCrewSize = 2,
                EstimatedDurationHours = 8,
                Confidence = 0.0,
                Reason = "Gemini LLM inference service is currently unavailable. Work order cost requires manual quantity surveyor calculation.",
                Recommendation = "Awaiting manual BOQ compilation by municipal engineer.",
                RequiresSupervisorApproval = true,
                RequiresDirectorApproval = false,
                ModelName = _gemini.ModelName,
                Status = "AI_FAILED"
            };
        }
    }
}
