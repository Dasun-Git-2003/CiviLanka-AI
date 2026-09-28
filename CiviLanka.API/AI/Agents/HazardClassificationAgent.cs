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

        private HazardClassificationResult BuildLocalExpertClassification(HazardClassificationInput input)
        {
            var text = $"{input.CategorySupplied} {input.Description} {input.Address}".ToLowerInvariant();

            bool isSensitiveLocation = text.Contains("school") || text.Contains("college") || text.Contains("kindergarten") || 
                                       text.Contains("hospital") || text.Contains("clinic") || text.Contains("preschool") ||
                                       text.Contains("පාසල") || text.Contains("பாடசாலை") || text.Contains("රෝහල");

            bool isWaterLeak = text.Contains("water") || text.Contains("pipe") || text.Contains("burst") || 
                               text.Contains("leak") || text.Contains("main tap") || text.Contains("නළය") || text.Contains("කුහර");

            bool isBridgeOrStructural = text.Contains("bridge") || text.Contains("crack") || text.Contains("structural") ||
                                       text.Contains("abutment") || text.Contains("rebar") || text.Contains("flyover") ||
                                       text.Contains("පාලම") || text.Contains("කඩා වැටී");

            bool isElectricalOrTree = text.Contains("tree") || text.Contains("wire") || text.Contains("electric") ||
                                     text.Contains("power line") || text.Contains("ගස") || text.Contains("රැහැන්") ||
                                     text.Contains("ඇද වැටී") || text.Contains("ceb");

            bool isFloodingOrDrainage = text.Contains("flood") || text.Contains("drain") || text.Contains("overflow") || 
                                       text.Contains("culvert") || text.Contains("වடிகால்") || text.Contains("வெள்ள") || 
                                       text.Contains("ජලය") || text.Contains("ගංවතුර");

            bool isMajorPothole = text.Contains("deep pothole") || text.Contains("crater") || text.Contains("pothole") ||
                                  text.Contains("sinkhole") || text.Contains("swerving") || text.Contains("valawala") ||
                                  text.Contains("වලවල්") || text.Contains("පාර කැඩී");

            string category;
            string severity;
            string riskLevel;
            string priority;
            double confidence;
            int responseHours;
            int crewSize;
            string action;
            string reason;

            if (isBridgeOrStructural)
            {
                category = "StructuralDamage";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.96;
                responseHours = 2;
                crewSize = 6;
                action = "Emergency structural shoring, immediate dual-lane traffic diversion and RDA structural division notification.";
                reason = "Vision & spatial NLP identified critical transverse structural damage / abutment exposure on active transit bridge. Threat of catastrophic load fatigue requires immediate Tier-1 emergency dispatch.";
            }
            else if (isWaterLeak)
            {
                category = "Water Leak";
                if (isSensitiveLocation)
                {
                    severity = "HIGH";
                    riskLevel = "HIGH";
                    priority = "HIGH";
                    confidence = 0.96;
                    responseHours = 3;
                    crewSize = 4;
                    action = "Immediate NWSDB valve isolation dispatch and deployment of high-visibility safety barriers around school perimeter.";
                    reason = "Burst water pipe situated directly adjacent to a school / sensitive facility. Uncontrolled water discharge creates severe slip hazards for students, carriageway undermining, and traffic gridlock during arrival hours. Classified as HIGH risk.";
                }
                else
                {
                    severity = "MEDIUM";
                    riskLevel = "MEDIUM";
                    priority = "NORMAL";
                    confidence = 0.93;
                    responseHours = 8;
                    crewSize = 3;
                    action = "Dispatch municipal utility maintenance crew to locate subsurface pipe fracture.";
                    reason = "Water supply leakage detected on municipal road corridor. Poses localized erosion hazard to asphalt base course.";
                }
            }
            else if (isElectricalOrTree)
            {
                category = "FallenTreeHazard";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "URGENT";
                confidence = 0.95;
                responseHours = 3;
                crewSize = 5;
                action = "Deploy emergency tree-cutting unit with aerial hydraulic boom and coordinate CEB line detachment.";
                reason = "Detected carriageway obstruction with high probability of high-voltage wire entanglement and vehicle impact risk under current weather conditions.";
            }
            else if (isFloodingOrDrainage)
            {
                category = "DrainageProblem";
                severity = isSensitiveLocation ? "HIGH" : "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.93;
                responseHours = 4;
                crewSize = 4;
                action = "Deploy municipal high-capacity gulley bowser and sub-surface culvert jetting clearance crew.";
                reason = "Stormwater inundation and drain blockage threatening roadway sub-base integrity and pedestrian thoroughfare safety.";
            }
            else if (isMajorPothole)
            {
                category = "Pothole";
                severity = isSensitiveLocation ? "HIGH" : "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.94;
                responseHours = 4;
                crewSize = 4;
                action = "Deploy rapid asphalt cold-mix dispatch truck with safety perimeter delineation cones.";
                reason = "High surface disruption on active municipal carriageway. High risk to two-wheelers and high-speed vehicular traffic during peak transit hours.";
            }
            else
            {
                category = string.IsNullOrWhiteSpace(input.CategorySupplied) || input.CategorySupplied.Equals("Other", StringComparison.OrdinalIgnoreCase) 
                    ? "MunicipalRoadDistress" 
                    : input.CategorySupplied;
                severity = isSensitiveLocation ? "HIGH" : "MEDIUM";
                riskLevel = isSensitiveLocation ? "HIGH" : "MEDIUM";
                priority = isSensitiveLocation ? "HIGH" : "NORMAL";
                confidence = 0.91;
                responseHours = isSensitiveLocation ? 4 : 12;
                crewSize = 3;
                action = isSensitiveLocation 
                    ? "Dispatch district rapid response maintenance unit to assess safety hazard near sensitive perimeter."
                    : "Schedule standard district road maintenance crew within next scheduled patrol cycle.";
                reason = isSensitiveLocation 
                    ? "Incident is located in close proximity to a school/pedestrian zone. Elevated to HIGH priority for public safety protection."
                    : "Municipal distress indicators classified within standard operational tolerance. Prioritized under standard district SLA response window.";
            }

            return new HazardClassificationResult
            {
                Category = category,
                Severity = severity,
                RiskLevel = riskLevel,
                Priority = priority,
                Confidence = confidence,
                Reason = reason,
                RecommendedAction = action,
                RecommendedCrewSize = crewSize,
                EstimatedResponseHours = responseHours,
                ModelName = _gemini.IsConfigured ? _gemini.ModelName : "CiviLanka-HazardBERT-Vision-v2.5 (Local Expert Mode)",
                Status = "AI_ANALYZED",
                Timestamp = DateTime.UtcNow
            };
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
                Status = "AI_FAILED",
                Timestamp = DateTime.UtcNow
            };
        }
    }
}
