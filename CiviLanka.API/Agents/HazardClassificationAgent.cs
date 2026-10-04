using CiviLanka.API.Models;
using CiviLanka.API.Services;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.Google;
using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CiviLanka.API.Agents
{
    public interface IHazardClassificationAgent
    {
        Task<HazardAIAnalysis?> ClassifyAsync(Hazard hazard);
    }

    /// <summary>
    /// Agentic AI that classifies a citizen hazard report using Google Gemini
    /// via Microsoft Semantic Kernel.  The agent has access to two tools:
    ///   1. GeocodeAddress   — converts GPS coords into a human-readable location string
    ///   2. GetNearbyInfrastructureHint — suggests nearby POI types from OSM
    ///
    /// The agent reasons across multiple tool calls before producing a structured
    /// JSON classification result.
    /// </summary>
    public class HazardClassificationAgent : IHazardClassificationAgent
    {
        private readonly IConfiguration _config;
        private readonly IGeocodingService _geocoding;
        private readonly ILogger<HazardClassificationAgent> _logger;

        // Model identifier used for tracking / audit
        private const string ModelName = "gemini-3.8-flash";

        public HazardClassificationAgent(
            IConfiguration config,
            IGeocodingService geocoding,
            ILogger<HazardClassificationAgent> logger)
        {
            _config = config;
            _geocoding = geocoding;
            _logger = logger;
        }

        public async Task<HazardAIAnalysis?> ClassifyAsync(Hazard hazard)
        {
            // 1. Try Direct LangGraph Agent Service (FastAPI on port 8001)
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                var payload = new
                {
                    title = $"Citizen Hazard Report {hazard.TicketNumber}",
                    description = hazard.Description,
                    location = !string.IsNullOrWhiteSpace(hazard.Address) ? hazard.Address : $"{hazard.Latitude},{hazard.Longitude}",
                    category_supplied = hazard.Category,
                    metadata = $"Citizen Ticket: {hazard.TicketNumber}; Lat: {hazard.Latitude}; Lon: {hazard.Longitude}",
                    image_url = hazard.ImageUrl
                };
                var jsonPayload = JsonSerializer.Serialize(payload);
                var httpContent = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");
                var agentBase = _config["AgentService:BaseUrl"] ?? "http://127.0.0.1:8001";
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
                        var cat = resultEl.TryGetProperty("primary_category", out var catEl) ? catEl.GetString() : hazard.Category;
                        var sev = resultEl.TryGetProperty("assigned_severity", out var sevEl) ? sevEl.GetString() : "HIGH";
                        var conf = resultEl.TryGetProperty("confidence_score", out var confEl) ? confEl.GetDouble() : 0.95;
                        var dept = resultEl.TryGetProperty("department", out var deptEl) ? deptEl.GetString() : "Municipal Engineering";
                        var sla = resultEl.TryGetProperty("sla_resolution_hours", out var slaEl) ? slaEl.GetInt32() : 24;
                        var urgency = resultEl.TryGetProperty("urgency_score", out var urgEl) ? urgEl.GetDouble() : 75.0;
                        var safetySummary = resultEl.TryGetProperty("safety_risk_summary", out var reasEl) ? reasEl.GetString() 
                            : (resultEl.TryGetProperty("reasoning", out var rEl) ? rEl.GetString() : "Classified by LangGraph Unified Agent");

                        var fullReason = $"{safetySummary} [Assigned: {dept} | Target SLA: {sla}h | Urgency Score: {urgency:F0}/100]";

                        _logger.LogInformation("LangGraph successfully classified citizen hazard {Id}: Category={Category}, Severity={Severity}",
                            hazard.Id, cat, sev);

                        return new HazardAIAnalysis
                        {
                            HazardId = hazard.Id,
                            Category = cat ?? hazard.Category,
                            Severity = NormalizeLevel(sev, new[] { "LOW", "MEDIUM", "HIGH", "CRITICAL" }, "HIGH"),
                            RiskLevel = NormalizeLevel(sev, new[] { "LOW", "MEDIUM", "HIGH", "CRITICAL" }, "HIGH"),
                            Priority = sev == "CRITICAL" ? "URGENT" : sev == "HIGH" ? "HIGH" : "NORMAL",
                            Confidence = Math.Clamp(conf, 0.0, 1.0),
                            Reason = fullReason,
                            ModelName = "LangGraph Unified Agent (gemini-3.8-flash)"
                        };
                    }
                }
            }
            catch (Exception lgEx)
            {
                _logger.LogWarning("Direct LangGraph call unavailable for citizen hazard {Id} ({Message}). Attempting fallback agent.",
                    hazard.Id, lgEx.Message);
            }

            var apiKey = _config["GeminiSettings:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
            {
                _logger.LogWarning("Gemini API key not configured. Returning fallback classification.");
                return BuildFallback(hazard);
            }

            try
            {
                // ── Build Semantic Kernel with Gemini ──────────────────────────
                var kernelBuilder = Kernel.CreateBuilder();
                kernelBuilder.AddGoogleAIGeminiChatCompletion(ModelName, apiKey);

                // Register the tool plugin so the model can call our C# functions
                var plugin = new HazardAnalysisPlugin(_geocoding, _logger);
                kernelBuilder.Plugins.AddFromObject(plugin, "HazardTools");

                var kernel = kernelBuilder.Build();

                // ── Build the prompt ───────────────────────────────────────────
                var systemPrompt = """
                    You are CivitaGuard, an expert municipal hazard classification agent.
                    Your task is to analyze a citizen-reported infrastructure hazard and produce
                    a structured risk assessment.

                    Follow this reasoning process:
                    1. Call GeocodeAddress to understand the specific location.
                    2. Call GetNearbyInfrastructureHint to understand proximity to sensitive infrastructure.
                    3. Analyze the hazard category and description. If category is "Other", override it with the actual physical hazard.
                    4. Hazards near schools, hospitals, or arterial roads MUST be elevated to HIGH or CRITICAL.
                    5. Determine Severity (LOW | MEDIUM | HIGH | CRITICAL).
                    6. Determine RiskLevel (LOW | MEDIUM | HIGH | CRITICAL).
                    7. Determine Priority (LOW | NORMAL | HIGH | URGENT).
                    8. Estimate Confidence (0.0 – 1.0).
                    9. Write a concise Reason (1–3 sentences) explaining your assessment.

                    IMPORTANT: Your final response MUST be valid JSON only, with no markdown:
                    {
                      "category": "string",
                      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
                      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
                      "priority": "LOW|NORMAL|HIGH|URGENT",
                      "confidence": 0.0,
                      "reason": "string"
                    }
                    """;

                var userPrompt = $"""
                    Classify this citizen-reported hazard:

                    Category: {hazard.Category}
                    Description: {hazard.Description}
                    Latitude: {hazard.Latitude?.ToString() ?? "not provided"}
                    Longitude: {hazard.Longitude?.ToString() ?? "not provided"}
                    Existing Address: {hazard.Address ?? "unknown"}
                    """;

                var chatHistory = new ChatHistory(systemPrompt);
                chatHistory.AddUserMessage(userPrompt);

                var chatService = kernel.GetRequiredService<IChatCompletionService>();

                // Enable automatic function calling (tool use)
                var executionSettings = new GeminiPromptExecutionSettings
                {
                    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),
                    MaxTokens = 1024,
                    Temperature = 0.1
                };

                _logger.LogInformation("Running Gemini hazard classification for hazard {Id}", hazard.Id);

                var response = await chatService.GetChatMessageContentAsync(
                    chatHistory,
                    executionSettings,
                    kernel);

                var content = response.Content?.Trim();
                _logger.LogInformation("AI raw response: {Response}", content);

                return ParseAndBuildAnalysis(hazard.Id, content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini classification failed for hazard {Id}. Using fallback.", hazard.Id);
                return BuildFallback(hazard);
            }
        }

        // ── Parse the structured JSON response from Gemini ─────────────────────
        private HazardAIAnalysis? ParseAndBuildAnalysis(Guid hazardId, string? jsonContent)
        {
            if (string.IsNullOrWhiteSpace(jsonContent)) return null;

            try
            {
                if (jsonContent.StartsWith("```"))
                {
                    jsonContent = jsonContent
                        .Replace("```json", "")
                        .Replace("```", "")
                        .Trim();
                }

                var result = JsonSerializer.Deserialize<ClassificationResult>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (result == null) return null;

                return new HazardAIAnalysis
                {
                    HazardId = hazardId,
                    Category = result.Category,
                    Severity = NormalizeLevel(result.Severity, new[] { "LOW", "MEDIUM", "HIGH", "CRITICAL" }, "MEDIUM"),
                    RiskLevel = NormalizeLevel(result.RiskLevel, new[] { "LOW", "MEDIUM", "HIGH", "CRITICAL" }, "MEDIUM"),
                    Priority = NormalizeLevel(result.Priority, new[] { "LOW", "NORMAL", "HIGH", "URGENT" }, "NORMAL"),
                    Confidence = Math.Clamp(result.Confidence, 0.0, 1.0),
                    Reason = result.Reason ?? "Classification completed.",
                    ModelName = ModelName
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse AI JSON response: {Content}", jsonContent);
                return null;
            }
        }

        /// <summary>
        /// Rule-based fallback used when the AI is unavailable.
        /// Ensures the system degrades gracefully and overrides "Other" intelligently.
        /// </summary>
        private static HazardAIAnalysis BuildFallback(Hazard hazard)
        {
            var desc = (hazard.Description ?? "").ToLowerInvariant();
            var addr = (hazard.Address ?? "").ToLowerInvariant();
            var isSchool = desc.Contains("school") || addr.Contains("school");
            var isHospital = desc.Contains("hospital") || addr.Contains("hospital");
            var isWater = desc.Contains("water") || desc.Contains("pipe") || desc.Contains("leak") || desc.Contains("burst") || desc.Contains("flood");
            var isTree = desc.Contains("tree") || desc.Contains("branch") || desc.Contains("ගස");
            var isBridge = desc.Contains("bridge") || desc.Contains("flyover") || desc.Contains("collapse");
            var isWire = desc.Contains("wire") || desc.Contains("power") || desc.Contains("electric") || desc.Contains("ceb");

            string category = hazard.Category;
            string severity = "MEDIUM";
            string risk = "MEDIUM";
            string priority = "NORMAL";

            if (isBridge || isWire)
            {
                category = isBridge ? "Bridge / Structural" : "Electrical / Powerline";
                severity = "CRITICAL";
                risk = "CRITICAL";
                priority = "URGENT";
            }
            else if ((isWater && (isSchool || isHospital)) || isTree)
            {
                category = isWater ? HazardCategory.WaterLeak : HazardCategory.FallenTree;
                severity = "HIGH";
                risk = "HIGH";
                priority = "HIGH";
            }
            else if (isWater)
            {
                category = HazardCategory.WaterLeak;
                severity = "HIGH";
                risk = "HIGH";
                priority = "HIGH";
            }
            else
            {
                (severity, risk, priority) = hazard.Category switch
                {
                    HazardCategory.BrokenTrafficSignal => ("HIGH", "HIGH", "URGENT"),
                    HazardCategory.WaterLeak => ("HIGH", "HIGH", "HIGH"),
                    HazardCategory.Pothole => ("MEDIUM", "MEDIUM", "HIGH"),
                    HazardCategory.DamagedRoad => ("MEDIUM", "HIGH", "HIGH"),
                    HazardCategory.FallenTree => ("HIGH", "CRITICAL", "URGENT"),
                    HazardCategory.DrainageProblem => ("MEDIUM", "MEDIUM", "NORMAL"),
                    HazardCategory.StreetLightProblem => ("LOW", "LOW", "NORMAL"),
                    _ => ("MEDIUM", "MEDIUM", "NORMAL")
                };
            }

            return new HazardAIAnalysis
            {
                HazardId = hazard.Id,
                Category = category,
                Severity = severity,
                RiskLevel = risk,
                Priority = priority,
                Confidence = 0.85,
                Reason = isSchool && isWater
                    ? "Classified as HIGH severity due to active water main hazard situated adjacent to school facility posing slipping risks."
                    : "Classified using municipal contextual rules. Manual field review scheduled.",
                ModelName = "municipal-rules-fallback"
            };
        }

        private static string NormalizeLevel(string? input, string[] validValues, string defaultValue)
        {
            if (string.IsNullOrWhiteSpace(input)) return defaultValue;
            var upper = input.ToUpperInvariant();
            return validValues.Contains(upper) ? upper : defaultValue;
        }
    }

    // ── Semantic Kernel Plugin — Tool functions exposed to Gemini ──────────────

    /// <summary>
    /// Plugin containing the tools the Hazard Classification Agent can invoke.
    /// Gemini will automatically decide when to call these functions.
    /// </summary>
    public class HazardAnalysisPlugin
    {
        private readonly IGeocodingService _geocoding;
        private readonly ILogger _logger;

        public HazardAnalysisPlugin(IGeocodingService geocoding, ILogger logger)
        {
            _geocoding = geocoding;
            _logger = logger;
        }

        /// <summary>
        /// Converts GPS coordinates into a human-readable address string.
        /// </summary>
        [KernelFunction, Description("Convert GPS coordinates into a human-readable address for location context.")]
        public async Task<string> GeocodeAddress(
            [Description("Latitude of the hazard location")] double latitude,
            [Description("Longitude of the hazard location")] double longitude)
        {
            _logger.LogInformation("Agent calling GeocodeAddress({Lat},{Lon})", latitude, longitude);
            var address = await _geocoding.ReverseGeocodeAsync(latitude, longitude);
            return address ?? $"Location at coordinates {latitude}, {longitude}";
        }

        /// <summary>
        /// Returns nearby infrastructure context to help assess severity.
        /// Uses Nominatim to identify nearby points of interest.
        /// </summary>
        [KernelFunction, Description("Get nearby infrastructure hints (schools, hospitals, roads) to assess hazard severity.")]
        public async Task<string> GetNearbyInfrastructureHint(
            [Description("Latitude of the hazard location")] double latitude,
            [Description("Longitude of the hazard location")] double longitude)
        {
            _logger.LogInformation("Agent calling GetNearbyInfrastructureHint({Lat},{Lon})", latitude, longitude);
            var context = await _geocoding.GetLocationContextAsync(latitude, longitude);
            return context;
        }
    }

    // ── Internal DTO for parsing Gemini's JSON output ─────────────────────────
    internal class ClassificationResult
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("severity")]
        public string? Severity { get; set; }

        [JsonPropertyName("riskLevel")]
        public string? RiskLevel { get; set; }

        [JsonPropertyName("priority")]
        public string? Priority { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }
}
