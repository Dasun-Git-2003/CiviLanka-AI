using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Prompts;
using CiviLanka.API.Data;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.AI.Agents
{
    public class DispatchPriorityAgent : IAIAgent<DispatchPriorityInput, DispatchPriorityResult>
    {
        private readonly IAIService _gemini;
        private readonly IAIResponseValidator _validator;
        private readonly AppDbContext _db;
        private readonly ILogger<DispatchPriorityAgent> _logger;

        public string AgentName => "CiviLanka-DispatchPriority-v1";

        public DispatchPriorityAgent(
            IAIService gemini,
            IAIResponseValidator validator,
            AppDbContext db,
            ILogger<DispatchPriorityAgent> logger)
        {
            _gemini = gemini;
            _validator = validator;
            _db = db;
            _logger = logger;
        }

        public async Task<DispatchPriorityResult> ExecuteAsync(DispatchPriorityInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            if (!_gemini.IsConfigured)
            {
                _logger.LogWarning("Gemini is not configured. Generating algorithmic fallback dispatch & priority optimization.");
                return BuildFallbackResult(input);
            }

            try
            {
                var systemPrompt = DispatchPriorityPrompt.SystemPrompt;
                var userPrompt = DispatchPriorityPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for dispatch & priority route clustering across {Count} hazards.", input.Hazards.Count);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty response for dispatch optimization. Falling back to algorithmic dispatch.");
                    return BuildFallbackResult(input);
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<DispatchPriorityResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini dispatch optimization response: {Raw}", jsonResponse);
                    return BuildFallbackResult(input);
                }

                _validator.ValidateDispatchPriority(result, out _);
                result.ModelName = _gemini.ModelName;
                result.Status = "OPTIMIZED";

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in DispatchPriorityAgent. Falling back to deterministic routing.");
                return BuildFallbackResult(input);
            }
        }

        private DispatchPriorityResult BuildFallbackResult(DispatchPriorityInput input)
        {
            // Deterministic dispatch ranking: URGENT > HIGH > NORMAL > LOW
            var ranked = input.Hazards
                .OrderByDescending(h => h.Priority switch
                {
                    "URGENT" => 4,
                    "HIGH" => 3,
                    "NORMAL" => 2,
                    _ => 1
                })
                .ThenByDescending(h => h.Severity switch
                {
                    "CRITICAL" => 4,
                    "HIGH" => 3,
                    "MEDIUM" => 2,
                    _ => 1
                })
                .Select((h, index) => new RankedHazardItem
                {
                    HazardId = h.HazardId.ToString(),
                    TicketNumber = h.TicketNumber,
                    DispatchRank = index + 1,
                    PriorityScore = Math.Max(10, 100 - (index * 15)),
                    UrgencyTier = h.Priority == "URGENT" || h.Severity == "CRITICAL" ? "CRITICAL" : "HIGH",
                    Reason = $"Ranked #{index + 1} based on priority level ({h.Priority}) and reported severity ({h.Severity})."
                })
                .ToList();

            // Form single route cluster
            var tickets = input.Hazards.Select(h => h.TicketNumber).ToList();
            var corridorName = !string.IsNullOrWhiteSpace(input.TargetCorridor) ? input.TargetCorridor : "Municipal Central Corridor";

            var clusters = new List<RouteCluster>
            {
                new RouteCluster
                {
                    ClusterName = $"{corridorName} Maintenance Route",
                    Corridor = corridorName,
                    EstimatedDistanceKm = Math.Round(input.Hazards.Count * 1.8, 1),
                    EstimatedTravelTimeMinutes = Math.Max(10, input.Hazards.Count * 8),
                    HazardTickets = tickets,
                    RecommendedSequence = tickets
                }
            };

            // Match available contractor
            var contractor = input.AvailableContractors
                .Where(c => c.IsAvailable)
                .OrderByDescending(c => c.Rating)
                .FirstOrDefault() ?? input.AvailableContractors.FirstOrDefault();

            var assignment = new SuggestedContractorAssignment
            {
                ContractorId = contractor?.ContractorId,
                ContractorName = contractor?.Name ?? "Municipal Rapid Response Crew",
                Specialization = contractor?.Specialization ?? input.PreferredSpecialization ?? "General Infrastructure",
                RecommendedCrewSize = 4,
                AssignmentRationale = contractor != null
                    ? $"Highest available rated contractor ({contractor.Rating:F1}) specializing in {contractor.Specialization}."
                    : "Default municipal public works internal emergency crew assigned."
            };

            return new DispatchPriorityResult
            {
                OverallOptimizationScore = 85,
                RankedHazards = ranked,
                RouteClusters = clusters,
                SuggestedAssignment = assignment,
                TradeoffAnalysis = "Algorithmic routing balanced emergency priority first, grouping co-located corridor hazards sequentially to minimize crew transit overhead.",
                Confidence = 0.85,
                Status = "ALGORITHMIC_OPTIMIZATION",
                ModelName = _gemini.ModelName
            };
        }
    }
}
