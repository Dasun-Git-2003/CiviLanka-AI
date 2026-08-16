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
        private const string ModelName = "gemini-2.0-flash";

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

                    You have access to two tools:
                    - GeocodeAddress(latitude, longitude): returns a human-readable location description
                    - GetNearbyInfrastructureHint(latitude, longitude): returns nearby POI types (schools, hospitals, etc.)

                    Follow this reasoning process:
                    1. Call GeocodeAddress to understand the specific location.
                    2. Call GetNearbyInfrastructureHint to understand proximity to sensitive infrastructure.
                    3. Analyze the hazard category and description.
                    4. Consider location context — hazards near schools, hospitals, or arterial roads are more severe.
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
                    Classify this reported hazard:

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
                    Temperature = 0.1 // Low temperature for deterministic classification
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
                // Strip markdown code fences if Gemini wraps in ```json ... ```
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
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to parse AI JSON response: {Content}", jsonContent);
                return null;
            }
        }

        /// <summary>
        /// Rule-based fallback used when the AI is unavailable.
        /// Ensures the system degrades gracefully.
        /// </summary>
        private static HazardAIAnalysis BuildFallback(Hazard hazard)
        {
            var (severity, risk, priority) = hazard.Category switch
            {
                HazardCategory.BrokenTrafficSignal => ("HIGH", "HIGH", "URGENT"),
                HazardCategory.WaterLeak => ("HIGH", "HIGH", "HIGH"),
                HazardCategory.Pothole => ("MEDIUM", "MEDIUM", "HIGH"),
                HazardCategory.DamagedRoad => ("MEDIUM", "HIGH", "HIGH"),
                HazardCategory.FallenTree => ("HIGH", "CRITICAL", "URGENT"),
                HazardCategory.DrainageProblem => ("MEDIUM", "MEDIUM", "NORMAL"),
                HazardCategory.StreetLightProblem => ("LOW", "LOW", "NORMAL"),
                _ => ("LOW", "LOW", "NORMAL")
            };

            return new HazardAIAnalysis
            {
                HazardId = hazard.Id,
                Category = hazard.Category,
                Severity = severity,
                RiskLevel = risk,
                Priority = priority,
                Confidence = 0.6,
                Reason = "Classified using rule-based fallback (AI service unavailable). Manual review recommended.",
                ModelName = "rule-based-fallback"
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
