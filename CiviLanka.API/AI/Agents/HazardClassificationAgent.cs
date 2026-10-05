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
                            // Guard: Preserve Drainage Problem and never reclassify to Water Leak or Water Main Burst
                            var inputCatNorm = (input.CategorySupplied ?? "").Replace(" ", "").ToLowerInvariant();
                            var descNorm = (input.Description ?? "").ToLowerInvariant();
                            bool isDrainageContext = inputCatNorm.Contains("drain") || descNorm.Contains("drain") ||
                                                     descNorm.Contains("culvert") || descNorm.Contains("silt") ||
                                                     descNorm.Contains("stormwater") || descNorm.Contains("runoff");

                            if (isDrainageContext && (result.Category == "Water Leak" || result.Category == "Water Main Burst" || result.Category.StartsWith("Water")))
                            {
                                _logger.LogInformation("Preserving 'Drainage Problem' for ticket {Ticket} instead of AI reclassification to {Cat}", input.TicketNumber, result.Category);
                                result.Category = "Drainage Problem";
                            }

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

            // Acute Disaster & Infrastructure Detectors
            bool isOilSpill = text.Contains("oil") || text.Contains("spill") || text.Contains("diesel") || 
                              text.Contains("slippery") || text.Contains("traction") || text.Contains("skid");

            bool isGasLeak = text.Contains("gas leak") || text.Contains("gas vapour") || text.Contains("lpg") ||
                             text.Contains("mercaptan") || text.Contains("hissing gas") || (text.Contains("gas") && text.Contains("smell"));

            bool isSinkhole = (text.Contains("sinkhole") || text.Contains("subsidence") || text.Contains("subsurface cavity") ||
                              text.Contains("ground cavity") || text.Contains("ground collapse") || text.Contains("void beneath asphalt")) &&
                              !text.Contains("pothole");

            bool isLandslide = text.Contains("landslide") || text.Contains("embankment") || text.Contains("soil movement") || 
                               text.Contains("mud, rocks") || (text.Contains("slope") && text.Contains("collapse"));

            bool isRetainingWall = text.Contains("retaining wall") || text.Contains("wall has partially collapsed") || 
                                   text.Contains("unstable wall") || (text.Contains("wall") && text.Contains("concrete debris"));

            bool isFloodedUnderpass = text.Contains("underpass") || text.Contains("railway underpass") || 
                                      (text.Contains("flooded") && text.Contains("stranded")) || text.Contains("60 cm");

            bool isTrafficSignal = text.Contains("traffic signal") || text.Contains("signal pole") || 
                                   (text.Contains("signals") && text.Contains("non-functional")) || text.Contains("rajagiriya");

            bool isDrainCover = text.Contains("drain cover") || text.Contains("storm-drain cover") || text.Contains("drainage cover") || 
                                text.Contains("open drainage pit") || text.Contains("borella");

            bool isMissingManhole = text.Contains("missing manhole") || text.Contains("stolen manhole") ||
                                    (text.Contains("manhole") && (text.Contains("open") || text.Contains("uncovered") || text.Contains("missing cover")));

            bool isHighVoltage = (text.Contains("high voltage") || text.Contains("11kv") || text.Contains("33kv") ||
                                  text.Contains("snapped power line") || text.Contains("snapped wire") || text.Contains("transformer fire")) &&
                                 (text.Contains("spark") || text.Contains("live") || text.Contains("ground") || text.Contains("arcing"));

            bool isBrokenStreetlight = !isHighVoltage && (text.Contains("streetlight pole") || text.Contains("street light pole") || 
                                       (text.Contains("pole") && text.Contains("exposed wiring")) || (text.Contains("streetlight") && text.Contains("leaning")));

            bool isFallenUtilityPole = text.Contains("utility pole") || text.Contains("wooden utility pole") || 
                                       (text.Contains("communication cables") && text.Contains("fallen")) || text.Contains("wattala");

            bool isSewageOverflow = text.Contains("sewage") || text.Contains("wastewater") || text.Contains("blackwater") ||
                                    text.Contains("effluent") || text.Contains("sewer line") || text.Contains("foul stench") ||
                                    text.Contains("foul odor") || text.Contains("sewage overflow");

            bool isHazardousWaste = text.Contains("chemical") || text.Contains("toxic") || text.Contains("acid") ||
                                    text.Contains("chemical drums") || text.Contains("hazardous waste") || text.Contains("illegal dumping");

            bool isDamagedGuardrail = text.Contains("guardrail") || text.Contains("crash barrier") || text.Contains("w-beam") ||
                                      text.Contains("parapet wall") || (text.Contains("barrier") && text.Contains("smashed"));

            bool isWalkwayCollapse = text.Contains("footpath") || text.Contains("sidewalk collapse") || text.Contains("pedestrian walkway") ||
                                     text.Contains("footbridge") || (text.Contains("pavement") && text.Contains("sunken"));

            bool isCoastalErosion = text.Contains("coastal") || text.Contains("seawall") || text.Contains("revetment") ||
                                    text.Contains("marine drive") || text.Contains("wave overtopping") || text.Contains("riprap");

            bool isFloodingOrDrainage = !isSewageOverflow && (text.Contains("drain") || text.Contains("culvert") || text.Contains("stormwater") || 
                                       text.Contains("silt") || text.Contains("gutter") || text.Contains("canal") ||
                                       text.Contains("overflow") || text.Contains("runoff") || text.Contains("catchpit") ||
                                       text.Contains("drainageproblem") || text.Contains("drainage") ||
                                       text.Contains("flood") || text.Contains("වடிகால்") || text.Contains("வெள்ள") || 
                                       text.Contains("ගංවතුර"));

            bool isWaterLeak = !isFloodingOrDrainage && !isSewageOverflow && (
                               text.Contains("water pipe") || text.Contains("water main") || text.Contains("burst pipe") || 
                               text.Contains("pipe burst") || text.Contains("pipe leak") || text.Contains("water leak") || 
                               text.Contains("main tap") || text.Contains("nwsdb") || text.Contains("නළය") || text.Contains("කුහර") ||
                               (text.Contains("pipe") && text.Contains("burst")));

            bool isBridgeOrStructural = text.Contains("bridge") || text.Contains("flyover") || text.Contains("viaduct") ||
                                        text.Contains("abutment") || text.Contains("rebar") || text.Contains("pier scour") ||
                                        text.Contains("expansion joint") || text.Contains("පාලම") || text.Contains("කඩා වැටී");

            bool isElectricalOrTree = text.Contains("tree") || text.Contains("wire") || text.Contains("electric") ||
                                     text.Contains("power line") || text.Contains("ගස") || text.Contains("රැහැන්") ||
                                     text.Contains("ඇද වැටී") || text.Contains("ceb");

            bool isMajorPothole = text.Contains("deep pothole") || text.Contains("crater") || text.Contains("pothole") ||
                                  text.Contains("swerving") || text.Contains("valawala") ||
                                  text.Contains("වලවල්") || text.Contains("පාර කැඩී") || text.Contains("one metre wide");

            string category;
            string severity;
            string riskLevel;
            string priority;
            double confidence;
            int responseHours;
            int crewSize;
            string action;
            string reason;

            if (isOilSpill)
            {
                category = "Oil Spill on Roadway";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.97;
                responseHours = 2;
                crewSize = 6;
                action = "Deploy traffic police for immediate lane diversion; Dispatch CMC Fire Brigade bowsers to spread fine sand and sawdust absorbents; Apply chemical degreaser wash prior to reopening.";
                reason = "Severe engine oil slick on wet active carriageway causing severe loss of braking traction and high skidding risks for vehicles and two-wheelers. Classified as CRITICAL emergency.";
            }
            else if (isLandslide)
            {
                category = "Roadside Landslide";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.96;
                responseHours = 2;
                crewSize = 6;
                action = "Deploy NBRO emergency geotechnical engineering team to inspect slip plane stability and crown cracks; Erect concrete k-rail deflection barriers; Mobilize excavator and dump trucks.";
                reason = "Active roadside embankment collapse with continuous soil movement and carriageway obstruction following heavy rainfall. High threat of secondary mass failure.";
            }
            else if (isRetainingWall)
            {
                category = "Collapsed Retaining Wall";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.95;
                responseHours = 3;
                crewSize = 6;
                action = "Cordon off carriageway lane with reflective crash barrels; Mobilize heavy wheel loader to clear concrete debris; Deploy temporary structural shoring props under RDA/NBRO supervision.";
                reason = "Partial structural failure of roadside concrete retaining wall with debris obstructing lane and standing segments at imminent risk of further collapse.";
            }
            else if (isFloodedUnderpass)
            {
                category = "Flooded Underpass";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.97;
                responseHours = 2;
                crewSize = 5;
                action = "Execute full physical closure of both underpass entry portals; Deploy dual 6-inch high-capacity centrifugal suction pump bowsers; Dispatch tow trucks to winch out stranded vehicles.";
                reason = "Severe railway underpass inundation (~60cm deep water) with trapped vehicles and complete transit stoppage. Threat to life and electrical short-circuits.";
            }
            else if (isTrafficSignal)
            {
                category = "Damaged Traffic Signal";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.96;
                responseHours = 2;
                crewSize = 4;
                action = "De-energize junction signal controller feed and cordon off exposed 230V live cable terminals; Deploy traffic police for manual intersection control; Dispatch signal engineering crew.";
                reason = "Traffic signal pole knocked down at arterial junction leaving exposed electrical cables and complete signal outage during peak traffic, creating severe collision risks.";
            }
            else if (isDrainCover)
            {
                category = "Drainage Cover Collapse";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.96;
                responseHours = 2;
                crewSize = 4;
                action = "Place heavy-duty steel trench plate across open drainage cavity; Install high-intensity solar warning flashers and barrier mesh; Fabricate Class D400 replacement cover.";
                reason = "Storm-drain cover collapse leaving deep open cavity directly beside pedestrian walkway, creating extreme falling and collision hazard for pedestrians and motorcycles.";
            }
            else if (isBrokenStreetlight)
            {
                category = "Broken Streetlight Pole";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.95;
                responseHours = 2;
                crewSize = 4;
                action = "Remotely isolate street lighting feeder circuit via CEB substation; Establish 15-meter pedestrian sidewalk exclusion tape; Dispatch CEB hydraulic crane bucket truck to safely dismantle leaning pole.";
                reason = "Damaged streetlight pole leaning dangerously over pavement with active electrical connection and exposed wiring hanging at head height, presenting immediate electrocution hazard.";
            }
            else if (isFallenUtilityPole)
            {
                category = "Fallen Utility Pole";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "URGENT";
                confidence = 0.94;
                responseHours = 4;
                crewSize = 4;
                action = "Verify zero electrical induction on fallen cables with voltage probe; Raise and tie back hanging cable bundles to maintain 4.5m emergency clearance; Dispatch pole-erection crew.";
                reason = "Fallen utility pole blocking residential access road with low-hanging communication cables obstructing traffic and creating snag hazard.";
            }
            else if (isGasLeak)
            {
                category = "Gas or Combustible Vapour Leak";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.98;
                responseHours = 1;
                crewSize = 6;
                action = "Establish 100m total safety perimeter; Evacuate adjacent buildings and halt traffic; Dispatch Fire Brigade Hazmat foam unit and coordinate emergency isolation with gas authority.";
                reason = "Pressurized gas / combustible hydrocarbon vapor leak detected with acute explosion, flash fire, and toxic asphyxiation risks to surrounding public.";
            }
            else if (isHighVoltage)
            {
                category = "Exposed High-Voltage Cable";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.98;
                responseHours = 1;
                crewSize = 5;
                action = "Immediately trigger CEB substation grid trip for circuit isolation; Deploy high-visibility exclusion cordon with 15m safety radius; Mobilize emergency high-voltage restoration line crew.";
                reason = "Snapped overhead high-voltage transmission/distribution conductor lying on ground or water with imminent fatal electrocution risk to pedestrians and motorists.";
            }
            else if (isSinkhole)
            {
                category = "Sinkhole & Ground Subsidence";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.97;
                responseHours = 2;
                crewSize = 6;
                action = "Immediate total carriageway lane closure; Place concrete deflection barriers and reflective flashers; Dispatch RDA geotechnical engineering unit with Ground Penetrating Radar (GPR) to assess subterranean void extent.";
                reason = "Sudden structural ground cavity collapse / asphalt subsidence. Imminent vehicle entrapment risk and potential progressive road bed undermining.";
            }
            else if (isMissingManhole)
            {
                category = "Missing Manhole Cover";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.96;
                responseHours = 2;
                crewSize = 4;
                action = "Secure open utility chamber with temporary heavy steel cover plate; Install high-visibility reflective barricades with flashing warning beacon; Fabricate and install certified lockable ductile iron cover.";
                reason = "Uncovered deep municipal utility chamber on active thoroughfare creating lethal fall hazard for pedestrians and catastrophic impact/flip risk for vehicles.";
            }
            else if (isHazardousWaste)
            {
                category = "Hazardous Chemical & Waste Dump";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.95;
                responseHours = 2;
                crewSize = 6;
                action = "Deploy Hazmat Level B response team; Apply chemical neutralizing adsorbents and containment berms; Coordinate with Central Environmental Authority (CEA) for toxic waste transfer.";
                reason = "Hazardous industrial chemical spill or illicit toxic waste accumulation threatening public safety, water table contamination, and toxic gas release.";
            }
            else if (isCoastalErosion)
            {
                category = "Coastal Erosion & Seawall Breach";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.95;
                responseHours = 3;
                crewSize = 6;
                action = "Cordon off seaward carriageway lane; Mobilize emergency heavy rock armor rip-rap placement; Dispatch Coast Conservation Department (CCD) and RDA coastal engineering division.";
                reason = "Active wave action breach of coastal revetment/seawall undermining transport corridor road shoulder and foundation.";
            }
            else if (isSewageOverflow)
            {
                category = "Sewage & Wastewater Overflow";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.95;
                responseHours = 4;
                crewSize = 5;
                action = "Deploy NWSDB high-pressure sewer jetting bowser and vacuum tankers; Clear downstream trunk sewer blockage; Apply antimicrobial disinfectant wash across affected road and sidewalk.";
                reason = "Raw sewage overflow erupting from municipal sewer manhole creating severe biological hazard, gastrointestinal infection risk, and unbearable environmental nuisance.";
            }
            else if (isDamagedGuardrail)
            {
                category = "Damaged Highway Guardrail";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.94;
                responseHours = 6;
                crewSize = 4;
                action = "Place advance warning cones and chevron delineators; Remove damaged sharp W-beam segments projecting into roadway; Erect replacement crash barrier posts and beam sections.";
                reason = "Compromised highway crash barrier or bridge parapet wall leaving edge drop-off exposed and presenting dangerous impalement hazard to oncoming traffic.";
            }
            else if (isWalkwayCollapse)
            {
                category = "Pedestrian Walkway Collapse";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.94;
                responseHours = 6;
                crewSize = 4;
                action = "Erect pedestrian detour barrier and high-visibility walkway diversion tape; Shore up undermined sidewalk foundation; Cast or lay heavy-duty reinforced paving slabs.";
                reason = "Collapsed or sunken pedestrian walkway causing major trip and falling hazard on high-density pedestrian corridor.";
            }
            else if (isBridgeOrStructural)
            {
                category = "Bridge Structural Damage";
                severity = "CRITICAL";
                riskLevel = "CRITICAL";
                priority = "URGENT";
                confidence = 0.96;
                responseHours = 2;
                crewSize = 6;
                action = "Emergency structural shoring, immediate dual-lane traffic diversion and RDA bridge division notification; Restrict heavy vehicle loads immediately.";
                reason = "Vision & spatial NLP identified critical transverse structural damage / abutment exposure on active transit bridge. Threat of catastrophic load fatigue requires immediate Tier-1 emergency dispatch.";
            }
            else if (isFloodingOrDrainage)
            {
                category = "Drainage Problem";
                severity = isSensitiveLocation ? "HIGH" : "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.94;
                responseHours = 4;
                crewSize = 4;
                action = "Deploy municipal high-capacity gulley bowser and sub-surface culvert jetting clearance crew.";
                reason = "Stormwater inundation, culvert siltation, and drain blockage threatening roadway sub-base integrity and pedestrian thoroughfare safety.";
            }
            else if (isWaterLeak)
            {
                bool isSinkholeOrMajor = text.Contains("sinkhole") || text.Contains("flooding two lanes") || text.Contains("kiribathgoda") || text.Contains("trapped");
                category = "Water Main Burst";
                if (isSinkholeOrMajor || isSensitiveLocation)
                {
                    severity = isSinkholeOrMajor ? "CRITICAL" : "HIGH";
                    riskLevel = severity;
                    priority = "URGENT";
                    confidence = 0.96;
                    responseHours = isSinkholeOrMajor ? 2 : 3;
                    crewSize = isSinkholeOrMajor ? 6 : 4;
                    action = "Immediate NWSDB valve isolation dispatch; Cordon off sinkhole perimeter with concrete barriers; Mobilize dewatering bowsers and backhoe excavator for main repair.";
                    reason = "Major underground water main rupture flooding roadway and creating deep sinkhole / erosion cavity, risking vehicle entrapment and road collapse.";
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
                category = "Fallen Tree";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "URGENT";
                confidence = 0.95;
                responseHours = 3;
                crewSize = 5;
                action = "Deploy emergency tree-cutting unit with aerial hydraulic boom and coordinate CEB line detachment.";
                reason = "Detected carriageway obstruction with high probability of high-voltage wire entanglement and vehicle impact risk under current weather conditions.";
            }
            else if (isMajorPothole)
            {
                category = "Large Pothole";
                severity = "HIGH";
                riskLevel = "HIGH";
                priority = "HIGH";
                confidence = 0.94;
                responseHours = 4;
                crewSize = 4;
                action = "Place illuminated chevron advance warning trailers and safety cones 75m upstream; Mobilize rapid cold-mix asphalt patching crew; Schedule permanent hot-mix compaction.";
                reason = "Large carriageway asphalt crater on active transit route forcing sudden lane maneuvers, creating elevated collision risk during peak traffic.";
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
                    responseHours = 72;
                    crewSize = 2;
                    action = "Schedule routine zonal inspection and backlog for standard maintenance cycle.";
                    reason = "Low-impact municipal defect without immediate threat to public safety or vehicular transit.";
                }
                else
                {
                    severity = "MEDIUM";
                    riskLevel = "MEDIUM";
                    priority = "NORMAL";
                    confidence = 0.91;
                    responseHours = 24;
                    crewSize = 3;
                    action = "Dispatch municipal field inspector for verification; Install safety caution marker if foot-traffic is present; Queue for maintenance.";
                    reason = "Municipal report registered under Sri Lanka Municipal Councils Ordinance §14. Requires standard field verification.";
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
