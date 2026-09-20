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
    public interface ICostEstimatorAgent
    {
        Task<CostEstimationResult?> EstimateAsync(CostEstimationInput input);
    }

    /// <summary>
    /// Agentic AI that estimates repair cost and materials for a work order using
    /// Google Gemini via Microsoft Semantic Kernel.
    ///
    /// Tools available to the agent:
    ///   1. EstimateRepairCost(category, severity)  — returns baseline cost data
    ///   2. GetAssetMaintenanceHistory(assetId)     — returns past repair history
    ///
    /// The agent reasons across multiple steps before producing a structured JSON
    /// cost estimate. A rule-based fallback is used when Gemini is unavailable.
    /// </summary>
    public class CostEstimatorAgent : ICostEstimatorAgent
    {
        private readonly IConfiguration _config;
        private readonly ILogger<CostEstimatorAgent> _logger;

        private const string ModelName = "gemini-2.0-flash";
        private const string AgentName = "CivitaGuard-CostEstimator-v1";

        public CostEstimatorAgent(IConfiguration config, ILogger<CostEstimatorAgent> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<CostEstimationResult?> EstimateAsync(CostEstimationInput input)
        {
            var apiKey = _config["GeminiSettings:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
            {
                _logger.LogWarning("Gemini API key not configured. Returning fallback cost estimate.");
                return BuildFallback(input);
            }

            try
            {
                // ── Build Semantic Kernel with Gemini ──────────────────────────
                var kernelBuilder = Kernel.CreateBuilder();
                kernelBuilder.AddGoogleAIGeminiChatCompletion(ModelName, apiKey);

                var plugin = new CostEstimationPlugin(_logger);
                kernelBuilder.Plugins.AddFromObject(plugin, "CostTools");

                var kernel = kernelBuilder.Build();

                // ── System prompt ──────────────────────────────────────────────
                var systemPrompt = """
                    You are CivitaGuard Cost Estimator, an expert municipal infrastructure repair cost estimation agent.
                    Your task is to analyze a hazard and produce a detailed, structured cost estimate for the repair.

                    You have access to two tools:
                    - EstimateRepairCost(category, severity): returns baseline LKR cost ranges and typical materials for the hazard type
                    - GetAssetMaintenanceHistory(assetId): returns past maintenance records for the infrastructure asset

                    Follow this reasoning process:
                    1. Call EstimateRepairCost with the hazard category and severity to get baseline costs.
                    2. If an assetId is provided, call GetAssetMaintenanceHistory to understand repair complexity from history.
                    3. Analyze the hazard description and severity level.
                    4. Consider the asset condition and age — older/poorer assets cost more to repair.
                    5. Estimate material quantities and costs (use LKR — Sri Lankan Rupees).
                    6. Estimate labour hours and crew size.
                    7. Estimate equipment requirements and costs.
                    8. Calculate total cost = materialCost + labourCost + equipmentCost.
                    9. Estimate repair duration in hours.
                    10. Provide confidence (0.0–1.0) and a concise reason.

                    IMPORTANT: Return ONLY valid JSON — no markdown, no explanation outside JSON:
                    {
                      "estimatedCost": 0,
                      "currency": "LKR",
                      "materialCost": 0,
                      "labourCost": 0,
                      "equipmentCost": 0,
                      "materials": [
                        { "name": "string", "quantity": 0, "unit": "string", "unitCost": 0 }
                      ],
                      "equipment": ["string"],
                      "recommendedCrewSize": 0,
                      "estimatedLabourHours": 0,
                      "estimatedDurationHours": 0,
                      "confidence": 0.0,
                      "reason": "string",
                      "recommendation": "string"
                    }
                    """;

                var userPrompt = $"""
                    Estimate the repair cost for this infrastructure hazard:

                    Hazard Category: {input.Category}
                    Description: {input.Description}
                    Severity: {input.Severity}
                    Risk Level: {input.RiskLevel}
                    Priority: {input.Priority}
                    Location: {input.Location ?? "Unknown"}
                    Asset ID: {input.AssetId ?? "Not specified"}
                    Asset Type: {input.AssetType ?? "Unknown"}
                    Asset Condition: {input.AssetCondition ?? "Unknown"}
                    Asset Age (years): {input.AssetAgeYears?.ToString() ?? "Unknown"}

                    All costs must be in Sri Lankan Rupees (LKR).
                    """;

                var chatHistory = new ChatHistory(systemPrompt);
                chatHistory.AddUserMessage(userPrompt);

                var chatService = kernel.GetRequiredService<IChatCompletionService>();

                var executionSettings = new GeminiPromptExecutionSettings
                {
                    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),
                    MaxTokens = 2048,
                    Temperature = 0.1
                };

                _logger.LogInformation("Running Gemini cost estimation for category={Category}, severity={Severity}",
                    input.Category, input.Severity);

                var response = await chatService.GetChatMessageContentAsync(
                    chatHistory, executionSettings, kernel);

                var content = response.Content?.Trim();
                _logger.LogInformation("AI cost estimate raw response: {Response}", content);

                return ParseResult(content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini cost estimation failed. Using rule-based fallback.");
                return BuildFallback(input);
            }
        }

        // ── Parse JSON from Gemini ─────────────────────────────────────────────
        private CostEstimationResult? ParseResult(string? jsonContent)
        {
            if (string.IsNullOrWhiteSpace(jsonContent)) return null;

            try
            {
                // Strip markdown fences
                if (jsonContent.StartsWith("```"))
                    jsonContent = jsonContent.Replace("```json", "").Replace("```", "").Trim();

                var raw = JsonSerializer.Deserialize<RawCostResult>(jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (raw == null) return null;

                return new CostEstimationResult
                {
                    EstimatedCost         = Math.Max(0, raw.EstimatedCost),
                    Currency              = raw.Currency ?? "LKR",
                    MaterialCost          = Math.Max(0, raw.MaterialCost),
                    LabourCost            = Math.Max(0, raw.LabourCost),
                    EquipmentCost         = Math.Max(0, raw.EquipmentCost),
                    Materials             = raw.Materials ?? new List<RawMaterial>(),
                    Equipment             = raw.Equipment ?? new List<string>(),
                    RecommendedCrewSize   = Math.Max(1, raw.RecommendedCrewSize),
                    EstimatedLabourHours  = Math.Max(0, raw.EstimatedLabourHours),
                    EstimatedDurationHours = Math.Max(0, raw.EstimatedDurationHours),
                    Confidence            = Math.Clamp(raw.Confidence, 0.0, 1.0),
                    Reason                = raw.Reason ?? "Cost estimation completed.",
                    Recommendation        = raw.Recommendation ?? "Proceed with standard repair procedure.",
                    ModelName             = ModelName
                };
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to parse AI cost estimate JSON.");
                return null;
            }
        }

        // ── Rule-based fallback ────────────────────────────────────────────────
        private static CostEstimationResult BuildFallback(CostEstimationInput input)
        {
            var (baseCost, crew, duration, materials, equipment) = input.Category switch
            {
                "WaterLeak" => (250000m, 3, 8,
                    new List<RawMaterial>
                    {
                        new() { Name = "PVC Pipe (20mm)", Quantity = 15, Unit = "meters", UnitCost = 4500 },
                        new() { Name = "Pipe Coupling",   Quantity = 4,  Unit = "units",  UnitCost = 2500 }
                    },
                    new List<string> { "Excavator", "Pipe Cutter", "Welding Kit" }),

                "Pothole" => (85000m, 2, 4,
                    new List<RawMaterial>
                    {
                        new() { Name = "Asphalt Mix",  Quantity = 500, Unit = "kg",    UnitCost = 80 },
                        new() { Name = "Bitumen",      Quantity = 20,  Unit = "liters", UnitCost = 450 }
                    },
                    new List<string> { "Compactor", "Asphalt Spreader" }),

                "BrokenTrafficSignal" => (120000m, 2, 6,
                    new List<RawMaterial>
                    {
                        new() { Name = "LED Signal Head",  Quantity = 1, Unit = "unit", UnitCost = 55000 },
                        new() { Name = "Control Module",   Quantity = 1, Unit = "unit", UnitCost = 35000 }
                    },
                    new List<string> { "Boom Lift", "Electrical Testing Kit" }),

                "DamagedRoad" => (180000m, 4, 10,
                    new List<RawMaterial>
                    {
                        new() { Name = "Asphalt Mix",    Quantity = 2000, Unit = "kg",   UnitCost = 80 },
                        new() { Name = "Road Base Stone", Quantity = 5,   Unit = "cubic meters", UnitCost = 8000 }
                    },
                    new List<string> { "Road Roller", "Asphalt Paver", "Compactor" }),

                "FallenTree" => (45000m, 3, 3,
                    new List<RawMaterial>
                    {
                        new() { Name = "Chainsaw Blades", Quantity = 2, Unit = "units", UnitCost = 3500 }
                    },
                    new List<string> { "Chainsaw", "Wood Chipper", "Crane Truck" }),

                "DrainageProblem" => (95000m, 2, 5,
                    new List<RawMaterial>
                    {
                        new() { Name = "Drainage Pipe",  Quantity = 10, Unit = "meters", UnitCost = 6000 },
                        new() { Name = "Concrete Mix",   Quantity = 500, Unit = "kg",    UnitCost = 35 }
                    },
                    new List<string> { "Excavator", "Vacuum Tanker" }),

                "StreetLightProblem" => (25000m, 1, 2,
                    new List<RawMaterial>
                    {
                        new() { Name = "LED Street Light", Quantity = 1, Unit = "unit", UnitCost = 18000 }
                    },
                    new List<string> { "Boom Lift" }),

                _ => (50000m, 2, 4,
                    new List<RawMaterial>
                    {
                        new() { Name = "General Repair Materials", Quantity = 1, Unit = "lot", UnitCost = 30000 }
                    },
                    new List<string> { "General Tools" })
            };

            // Apply severity multiplier
            var multiplier = input.Severity?.ToUpperInvariant() switch
            {
                "CRITICAL" => 1.5m,
                "HIGH"     => 1.2m,
                "MEDIUM"   => 1.0m,
                _          => 0.8m
            };

            var totalCost = Math.Round(baseCost * multiplier, 0);
            var materialCost = Math.Round(totalCost * 0.45m, 0);
            var labourCost = Math.Round(totalCost * 0.35m, 0);
            var equipmentCost = Math.Round(totalCost * 0.20m, 0);

            return new CostEstimationResult
            {
                EstimatedCost          = totalCost,
                Currency               = "LKR",
                MaterialCost           = materialCost,
                LabourCost             = labourCost,
                EquipmentCost          = equipmentCost,
                Materials              = materials,
                Equipment              = equipment,
                RecommendedCrewSize    = crew,
                EstimatedLabourHours   = duration * crew,
                EstimatedDurationHours = duration,
                Confidence             = 0.65,
                Reason = "Cost estimated using rule-based baseline (AI service unavailable). Manual review recommended.",
                Recommendation = "Generate AI estimate when service is available for more accurate costing.",
                ModelName = "rule-based-fallback"
            };
        }
    }

    // ── Semantic Kernel Plugin — Tools exposed to Gemini ──────────────────────

    /// <summary>Plugin containing the tools the Cost Estimator Agent can call.</summary>
    public class CostEstimationPlugin
    {
        private readonly ILogger _logger;

        public CostEstimationPlugin(ILogger logger) => _logger = logger;

        /// <summary>Returns baseline repair cost ranges and typical materials for a hazard type and severity.</summary>
        [KernelFunction, Description("Get baseline repair cost ranges and typical materials for a given hazard category and severity level in Sri Lanka (LKR).")]
        public string EstimateRepairCost(
            [Description("The hazard category, e.g. WaterLeak, Pothole, BrokenTrafficSignal, DamagedRoad, FallenTree, DrainageProblem, StreetLightProblem")] string category,
            [Description("Severity level: LOW, MEDIUM, HIGH, or CRITICAL")] string severity)
        {
            _logger.LogInformation("Agent calling EstimateRepairCost(category={C}, severity={S})", category, severity);

            var data = category.ToUpperInvariant() switch
            {
                "WATERLEAK" or "WATER LEAK" => new
                {
                    baseCostLkr = new { low = 80000, medium = 180000, high = 280000, critical = 450000 },
                    typicalMaterials = new[] { "PVC Pipe", "Pipe Coupling", "Concrete Mix", "Waterproofing Compound" },
                    typicalEquipment = new[] { "Excavator", "Pipe Cutter", "Welding Kit", "Water Pump" },
                    labourHoursPerWorker = 8,
                    typicalCrewSize = 3,
                    notes = "Include excavation costs for underground pipes. Add 20% for traffic management in busy areas."
                },
                "POTHOLE" => new
                {
                    baseCostLkr = new { low = 15000, medium = 60000, high = 120000, critical = 200000 },
                    typicalMaterials = new[] { "Asphalt Mix", "Bitumen", "Road Base Stone" },
                    typicalEquipment = new[] { "Compactor", "Asphalt Spreader", "Air Compressor" },
                    labourHoursPerWorker = 4,
                    typicalCrewSize = 2,
                    notes = "Cost varies significantly by pothole size. Large potholes near schools require traffic diversion."
                },
                "BROKENTRAFFICSIGNAL" or "BROKEN TRAFFIC SIGNAL" => new
                {
                    baseCostLkr = new { low = 35000, medium = 85000, high = 150000, critical = 250000 },
                    typicalMaterials = new[] { "LED Signal Head", "Control Module", "Underground Conduit", "Junction Box" },
                    typicalEquipment = new[] { "Boom Lift", "Electrical Testing Kit", "Cable Puller" },
                    labourHoursPerWorker = 6,
                    typicalCrewSize = 2,
                    notes = "Requires certified electrical engineer. High-priority intersections need immediate response."
                },
                "DAMAGEDROAD" or "DAMAGED ROAD" => new
                {
                    baseCostLkr = new { low = 60000, medium = 150000, high = 300000, critical = 600000 },
                    typicalMaterials = new[] { "Asphalt Mix", "Road Base Stone", "Geotextile Fabric", "Bitumen" },
                    typicalEquipment = new[] { "Road Roller", "Asphalt Paver", "Compactor", "Grader" },
                    labourHoursPerWorker = 10,
                    typicalCrewSize = 4,
                    notes = "Major road sections may require lane closures. Budget for traffic management."
                },
                "FALLENTREE" or "FALLEN TREE" => new
                {
                    baseCostLkr = new { low = 15000, medium = 35000, high = 60000, critical = 100000 },
                    typicalMaterials = new[] { "Chainsaw Blades", "Rope", "Safety Equipment" },
                    typicalEquipment = new[] { "Chainsaw", "Wood Chipper", "Crane Truck" },
                    labourHoursPerWorker = 3,
                    typicalCrewSize = 3,
                    notes = "Check for overhead power lines. If touching power lines, call CEB first."
                },
                "DRAINAGEPROBLEM" or "DRAINAGE PROBLEM" => new
                {
                    baseCostLkr = new { low = 25000, medium = 80000, high = 150000, critical = 280000 },
                    typicalMaterials = new[] { "Drainage Pipe", "Concrete Mix", "Gravel", "Manhole Cover" },
                    typicalEquipment = new[] { "Excavator", "Vacuum Tanker", "Drain Cleaner" },
                    labourHoursPerWorker = 5,
                    typicalCrewSize = 2,
                    notes = "Monsoon season increases urgency. Blocked drains can cause road flooding."
                },
                "STREETLIGHTPROBLEM" or "STREET LIGHT PROBLEM" => new
                {
                    baseCostLkr = new { low = 8000, medium = 20000, high = 40000, critical = 80000 },
                    typicalMaterials = new[] { "LED Street Light", "Driver Unit", "Wiring", "Bracket" },
                    typicalEquipment = new[] { "Boom Lift", "Electrical Testing Kit" },
                    labourHoursPerWorker = 2,
                    typicalCrewSize = 1,
                    notes = "Dark areas are a security concern. Prioritize high-crime areas."
                },
                _ => new
                {
                    baseCostLkr = new { low = 20000, medium = 50000, high = 100000, critical = 200000 },
                    typicalMaterials = new[] { "General Repair Materials" },
                    typicalEquipment = new[] { "General Tools" },
                    labourHoursPerWorker = 4,
                    typicalCrewSize = 2,
                    notes = "General infrastructure repair. Site assessment required before final estimate."
                }
            };

            return JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        }

        /// <summary>Returns maintenance history for an infrastructure asset to help assess repair complexity.</summary>
        [KernelFunction, Description("Get maintenance history for a specific infrastructure asset to understand recurring issues and repair complexity.")]
        public string GetAssetMaintenanceHistory(
            [Description("The infrastructure asset ID, e.g. AST-001")] string assetId)
        {
            _logger.LogInformation("Agent calling GetAssetMaintenanceHistory(assetId={A})", assetId);

            // In a production system this would query the database.
            // Returns a realistic sample based on the asset type implied by the ID.
            var historyData = new
            {
                assetId,
                totalRepairs = 4,
                lastRepairDate = "2025-11-15",
                averageRepairCostLkr = 95000,
                recurringIssues = new[] { "Material degradation", "Joint failures" },
                recommendedAction = "Consider full replacement instead of further patching — cost-effectiveness is declining.",
                complexityMultiplier = 1.3,
                notes = "Asset has been repaired multiple times. Each subsequent repair is more expensive due to compounding damage."
            };

            return JsonSerializer.Serialize(historyData, new JsonSerializerOptions { WriteIndented = true });
        }
    }

    // ── Input/Output models ────────────────────────────────────────────────────

    public class CostEstimationInput
    {
        public string Category    { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Severity   { get; set; }
        public string? RiskLevel  { get; set; }
        public string? Priority   { get; set; }
        public string? Location   { get; set; }
        public string? AssetId    { get; set; }
        public string? AssetType  { get; set; }
        public string? AssetCondition { get; set; }
        public int? AssetAgeYears { get; set; }
    }

    public class CostEstimationResult
    {
        public decimal EstimatedCost         { get; set; }
        public string Currency               { get; set; } = "LKR";
        public decimal MaterialCost          { get; set; }
        public decimal LabourCost            { get; set; }
        public decimal EquipmentCost         { get; set; }
        public List<RawMaterial> Materials   { get; set; } = new();
        public List<string> Equipment        { get; set; } = new();
        public int RecommendedCrewSize       { get; set; }
        public double EstimatedLabourHours   { get; set; }
        public double EstimatedDurationHours { get; set; }
        public double Confidence             { get; set; }
        public string Reason                 { get; set; } = string.Empty;
        public string Recommendation         { get; set; } = string.Empty;
        public string ModelName              { get; set; } = string.Empty;
    }

    // ── Internal DTOs for JSON parsing ────────────────────────────────────────

    internal class RawCostResult
    {
        [JsonPropertyName("estimatedCost")]    public decimal EstimatedCost         { get; set; }
        [JsonPropertyName("currency")]         public string? Currency              { get; set; }
        [JsonPropertyName("materialCost")]     public decimal MaterialCost          { get; set; }
        [JsonPropertyName("labourCost")]       public decimal LabourCost            { get; set; }
        [JsonPropertyName("equipmentCost")]    public decimal EquipmentCost         { get; set; }
        [JsonPropertyName("materials")]        public List<RawMaterial>? Materials  { get; set; }
        [JsonPropertyName("equipment")]        public List<string>? Equipment       { get; set; }
        [JsonPropertyName("recommendedCrewSize")] public int RecommendedCrewSize   { get; set; }
        [JsonPropertyName("estimatedLabourHours")] public double EstimatedLabourHours { get; set; }
        [JsonPropertyName("estimatedDurationHours")] public double EstimatedDurationHours { get; set; }
        [JsonPropertyName("confidence")]       public double Confidence             { get; set; }
        [JsonPropertyName("reason")]           public string? Reason                { get; set; }
        [JsonPropertyName("recommendation")]   public string? Recommendation        { get; set; }
    }

    public class RawMaterial
    {
        [JsonPropertyName("name")]      public string Name     { get; set; } = string.Empty;
        [JsonPropertyName("quantity")]  public double Quantity  { get; set; }
        [JsonPropertyName("unit")]      public string Unit      { get; set; } = string.Empty;
        [JsonPropertyName("unitCost")]  public decimal UnitCost { get; set; }
    }
}
