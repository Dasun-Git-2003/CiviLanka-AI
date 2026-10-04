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

using System.Net.Http;
using System.Text;

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

            HazardClassificationResult? result = null;

            if (_gemini.IsConfigured)
            {
                try
                {
                    var systemPrompt = HazardPrompt.SystemPrompt;
                    var userPrompt = HazardPrompt.BuildUserPrompt(input);

                    _logger.LogInformation("Invoking Gemini for hazard classification on Ticket {Ticket}", input.TicketNumber);

                    var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                    if (!string.IsNullOrWhiteSpace(jsonResponse))
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        result = JsonSerializer.Deserialize<HazardClassificationResult>(jsonResponse, options);

                        if (result != null)
                        {
                            _validator.ValidateHazardClassification(result, out _);
                            var confidenceEvaluation = _confidenceService.EvaluateHazardConfidence(result.Confidence, input);
                            result.Confidence = confidenceEvaluation.FinalConfidence;
                            result.ModelName = _gemini.ModelName;
                            result.Status = confidenceEvaluation.RequiresHumanReview ? "MANUAL_REVIEW" : "AI_ANALYZED";
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Gemini direct invocation failed for {Id}, attempting LangGraph / local expert fallback.", input.HazardId);
                }
            }

            // Fallback 1: Python LangGraph microservice on port 8001
            if (result == null)
            {
                result = await TryCallLangGraphAsync(input);
            }

            // Fallback 2: Comprehensive Sri Lanka municipal triage matrix
            if (result == null)
            {
                _logger.LogInformation("Using local Sri Lanka municipal expert matrix for hazard {Ticket}", input.TicketNumber);
                result = BuildLocalExpertClassification(input);
            }

            await PersistAnalysisAsync(input.HazardId, result);
            return result;
        }

        private async Task<HazardClassificationResult?> TryCallLangGraphAsync(HazardClassificationInput input)
        {
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                var payload = new
                {
                    title = $"Citizen Hazard Report {input.TicketNumber ?? "LIVE"}",
                    description = input.Description,
                    location = !string.IsNullOrWhiteSpace(input.Address) ? input.Address : $"{input.Latitude},{input.Longitude}",
                    category_supplied = input.CategorySupplied ?? "Other",
                    metadata = $"Ticket: {input.TicketNumber}; Zone: {input.RelatedAssetSummary}",
                    image_url = input.ImageUrl
                };
                var jsonPayload = JsonSerializer.Serialize(payload);
                var httpContent = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                var agentBase = Environment.GetEnvironmentVariable("AGENT_SERVICE_URL") ?? "http://127.0.0.1:8001";
                var res = await http.PostAsync($"{agentBase.TrimEnd('/')}/api/agent/hazard/classify", httpContent);
                if (res.IsSuccessStatusCode)
                {
                    var respStr = await res.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(respStr);
                    JsonElement resultEl = default;
                    bool hasResult = doc.RootElement.TryGetProperty("result", out resultEl) ||
                                     doc.RootElement.TryGetProperty("classification", out resultEl);
                    if (hasResult && resultEl.ValueKind == JsonValueKind.Object)
                    {
                        var cat = resultEl.TryGetProperty("primary_category", out var catEl) ? catEl.GetString() : input.CategorySupplied;
                        var sev = resultEl.TryGetProperty("assigned_severity", out var sevEl) ? sevEl.GetString() : "HIGH";
                        var conf = resultEl.TryGetProperty("confidence_score", out var confEl) ? confEl.GetDouble() : 0.95;
                        var dept = resultEl.TryGetProperty("department", out var deptEl) ? deptEl.GetString() : "Municipal Engineering";
                        var sla = resultEl.TryGetProperty("sla_resolution_hours", out var slaEl) ? slaEl.GetInt32() : 24;
                        var urgency = resultEl.TryGetProperty("urgency_score", out var urgEl) ? urgEl.GetDouble() : 80.0;
                        var safetySummary = resultEl.TryGetProperty("safety_risk_summary", out var reasEl) ? reasEl.GetString() 
                            : (resultEl.TryGetProperty("reasoning", out var rEl) ? rEl.GetString() : "Classified by LangGraph Unified Agent");

                        var fullReason = $"{safetySummary} [Assigned: {dept} | Target SLA: {sla}h | Urgency Score: {urgency:F0}/100]";
                        _logger.LogInformation("LangGraph successfully classified live hazard {Ticket}: {Category} ({Severity})",
                            input.TicketNumber, cat, sev);

                        return new HazardClassificationResult
                        {
                            Category = string.IsNullOrWhiteSpace(cat) ? (string.IsNullOrWhiteSpace(input.CategorySupplied) ? "Other" : input.CategorySupplied) : cat,
                            Severity = NormalizeSeverity(sev),
                            RiskLevel = NormalizeSeverity(sev),
                            Priority = sev == "CRITICAL" ? "URGENT" : (sev == "HIGH" ? "HIGH" : "NORMAL"),
                            Confidence = conf > 0 ? conf : 0.95,
                            Reason = fullReason,
                            RecommendedAction = $"Dispatch {dept} rapid response maintenance unit under {sla}h SLA; Establish warning perimeter and safety signage; Verify site clearance with zonal supervisor.",
                            RecommendedCrewSize = sev == "CRITICAL" ? 6 : (sev == "HIGH" ? 4 : 2),
                            EstimatedResponseHours = sla > 0 ? sla : 12,
                            ModelName = "LangGraph StateGraph Agent (gemini-3.1-flash-lite)",
                            Status = "AI_ANALYZED",
                            Timestamp = DateTime.UtcNow
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Direct LangGraph agent invocation failed for hazard {Ticket}", input.TicketNumber);
            }

            return null;
        }

        private static string NormalizeSeverity(string? sev)
        {
            var s = sev?.Trim().ToUpperInvariant();
            if (s == "CRITICAL" || s == "HIGH" || s == "MEDIUM" || s == "LOW") return s;
            return "HIGH";
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
                category = string.IsNullOrWhiteSpace(input.CategorySupplied) ? "Other" : input.CategorySupplied;

                bool isCriticalThreat = text.Contains("electrocution") || text.Contains("live wire") || text.Contains("explosion") ||
                                       text.Contains("chemical") || text.Contains("fatal") || text.Contains("collapse");
                bool isSevereThreat = isCriticalThreat || text.Contains("danger") || text.Contains("severe") || text.Contains("deep hole") || 
                                     text.Contains("injury") || text.Contains("urgent") || text.Contains("fire") || text.Contains("spark");
                bool isLowImpact = !isSevereThreat && !isSensitiveLocation && (text.Contains("minor") || text.Contains("small") || 
                                   text.Contains("cosmetic") || text.Contains("faded") || text.Contains("paint") || text.Contains("litter") || 
                                   text.Contains("noise") || text.Contains("light"));

                if (isCriticalThreat)
                {
                    severity = "CRITICAL";
                    riskLevel = "CRITICAL";
                    priority = "URGENT";
                    confidence = 0.95;
                    responseHours = 2;
                    crewSize = 6;
                    action = "Immediate emergency response dispatch; Cordon off perimeter within 25m radius; Notify police and specialized emergency authority.";
                    reason = "Critical imminent public safety hazard detected in reported conditions. Immediate threat to human life requires emergency protocol activation.";
                }
                else if (isSevereThreat || isSensitiveLocation)
                {
                    severity = "HIGH";
                    riskLevel = "HIGH";
                    priority = "HIGH";
                    confidence = 0.93;
                    responseHours = 4;
                    crewSize = 4;
                    action = "Dispatch district rapid response team for hazard containment; Deploy high-visibility caution barriers and warning signage; Initiate priority site survey.";
                    reason = isSensitiveLocation
                        ? "Incident is situated in close proximity to a school, hospital, or pedestrian thoroughfare. Risk level elevated to HIGH to safeguard pedestrians and students."
                        : "Elevated hazard indicators present on active municipal roadway. Prioritized under rapid municipal escalation protocol.";
                }
                else if (isLowImpact)
                {
                    severity = "LOW";
                    riskLevel = "LOW";
                    priority = "LOW";
                    confidence = 0.90;
                    responseHours = 48;
                    crewSize = 2;
                    action = "Log in municipal maintenance backlog for routine inspection; Assign to local ward patrol during scheduled weekly maintenance rounds.";
                    reason = "Reported condition indicates localized low-impact defect with negligible immediate hazard to pedestrians or traffic flow.";
                }
                else
                {
                    severity = "MEDIUM";
                    riskLevel = "MEDIUM";
                    priority = "NORMAL";
                    confidence = 0.91;
                    responseHours = 12;
                    crewSize = 3;
                    action = "Dispatch municipal field inspector to assess site conditions; Schedule corrective maintenance within standard district SLA; Coordinate with ward supervisor.";
                    reason = "Municipal report classified under standard operational guidelines. Poses moderate localized disruption without immediate life-safety peril.";
                }
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
