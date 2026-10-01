using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using CiviLanka.API.Models;
using CiviLanka.API.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.Google;

[assembly: InternalsVisibleTo("CiviLanka.API.Tests")]

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
    /// Allow-listed tools available to the agent:
    ///   1. EstimateRepairCost(category, severity)  — returns baseline cost data (CIDA schedule of rates)
    ///   2. GetAssetMaintenanceHistory(assetId)     — returns past maintenance records
    ///
    /// Boundaries:
    /// - The agent generates technical advisory estimates (proposals), NOT approved budgets.
    /// - The agent NEVER approves work orders, mutates database records, or executes shell/SQL.
    /// - WorkOrderApprovalPolicy remains the sole authority for Director approval.
    /// </summary>
    public class CostEstimatorAgent : ICostEstimatorAgent
    {
        private readonly IConfiguration _config;
        private readonly ILogger<CostEstimatorAgent> _logger;

        public const string ModelName = "gemini-2.0-flash";
        public const string FallbackModelName = "RuleBasedFallback";
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
                _logger.LogWarning("Gemini API key not configured or using placeholder. Returning rule-based fallback cost estimate.");
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
                    You are CivitaGuard Cost Estimator, an expert municipal infrastructure repair cost estimation agent for Sri Lankan municipal councils.
                    Your task is to analyze an infrastructure hazard and produce a detailed, realistic, structured cost estimate (Bill of Quantities proposal) in Sri Lankan Rupees (LKR).

                    SAFETY & ROLE BOUNDARIES:
                    - You are an estimation agent. Your output is an advisory technical proposal, NOT an approved budget.
                    - You have NO authority to approve work orders or authorize municipal spending.
                    - Never set, change, or decide approval status.
                    - Base your estimate strictly on the supplied hazard context, asset data, and allow-listed tools.
                    - Do NOT invent fictional maintenance records or false history if none exist.
                    - When an arterial or high-traffic road is flagged, you MUST account for traffic management requirements (warning signs, safety cones/barriers, traffic controller labour, and safety equipment).

                    TOOL USAGE:
                    1. Call EstimateRepairCost with the hazard category and severity to obtain baseline Sri Lankan schedule of rates (CIDA baseline).
                    2. If an asset ID is provided, call GetAssetMaintenanceHistory to check previous repairs and compounding asset wear.
                    3. Factor in asset age, condition, and location complexity.

                    REQUIRED STRUCTURED JSON OUTPUT:
                    Return ONLY valid JSON with no markdown wrapping and no conversational text:
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

                var arterialRoadText = input.IsArterialRoad
                    ? "YES (High-risk arterial road with heavy traffic — mandatory safety cones/barriers, warning signage, and traffic management labour required)"
                    : "NO (Standard municipal roadway or residential lane)";

                var userPrompt = $"""
                    Estimate the repair cost for this infrastructure hazard:

                    Hazard Category: {input.Category}
                    Description: {input.Description}
                    Severity: {input.Severity}
                    Risk Level: {input.RiskLevel}
                    Priority: {input.Priority}
                    Location: {input.Location ?? "Colombo District, Sri Lanka"}
                    High-Risk Arterial Road: {arterialRoadText}
                    Asset ID: {input.AssetId ?? "Not specified"}
                    Asset Type: {input.AssetType ?? "General Civil Infrastructure"}
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

                _logger.LogInformation("Running Gemini cost estimation for category={Category}, severity={Severity}, arterial={Arterial}",
                    input.Category, input.Severity, input.IsArterialRoad);

                var response = await chatService.GetChatMessageContentAsync(
                    chatHistory, executionSettings, kernel);

                var content = response.Content?.Trim();
                _logger.LogInformation("AI cost estimate raw response: {Response}", content);

                var parsedResult = ParseResult(content, _logger, ModelName);
                if (parsedResult == null)
                {
                    _logger.LogWarning("Gemini response could not be parsed as valid cost estimate. Returning rule-based fallback.");
                    return BuildFallback(input);
                }

                return parsedResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini cost estimation failed or timed out. Returning rule-based fallback.");
                return BuildFallback(input);
            }
        }

        // ── Parse JSON from Gemini with robust untrusted-input sanitization ────
        internal static CostEstimationResult? ParseResult(string? jsonContent, ILogger? logger = null, string modelName = ModelName)
        {
            if (string.IsNullOrWhiteSpace(jsonContent)) return null;

            try
            {
                var clean = jsonContent.Trim();
                if (clean.StartsWith("```"))
                {
                    var lines = clean.Split('\n');
                    clean = string.Join('\n', lines.Where(l => !l.Trim().StartsWith("```"))).Trim();
                }

                // If content contains JSON surrounded by text, extract JSON substring
                var startIdx = clean.IndexOf('{');
                var endIdx = clean.LastIndexOf('}');
                if (startIdx >= 0 && endIdx > startIdx)
                {
                    clean = clean.Substring(startIdx, endIdx - startIdx + 1);
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var raw = JsonSerializer.Deserialize<RawCostResult>(clean, options);
                if (raw == null) return null;

                var crew = raw.Labour?.RequiredWorkers > 0 ? raw.Labour.RequiredWorkers : raw.RecommendedCrewSize;
                var labourHours = raw.Labour?.EstimatedHours > 0 ? raw.Labour.EstimatedHours : raw.EstimatedLabourHours;

                // Sanitize materials (reject empty names, ensure non-negative quantity and unit cost)
                var sanitizedMaterials = new List<RawMaterial>();
                if (raw.Materials != null)
                {
                    foreach (var m in raw.Materials)
                    {
                        if (string.IsNullOrWhiteSpace(m.Name)) continue;
                        sanitizedMaterials.Add(new RawMaterial
                        {
                            Name = m.Name.Trim(),
                            Quantity = Math.Max(0, m.Quantity),
                            Unit = string.IsNullOrWhiteSpace(m.Unit) ? "units" : m.Unit.Trim(),
                            UnitCost = Math.Max(0, m.UnitCost)
                        });
                    }
                }

                // Sanitize equipment (handle both string array and object array)
                var sanitizedEquipment = new List<string>();
                if (raw.EquipmentRaw is JsonElement elem)
                {
                    if (elem.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in elem.EnumerateArray())
                        {
                            if (item.ValueKind == JsonValueKind.String)
                            {
                                var s = item.GetString()?.Trim();
                                if (!string.IsNullOrEmpty(s) && !sanitizedEquipment.Contains(s, StringComparer.OrdinalIgnoreCase))
                                    sanitizedEquipment.Add(s);
                            }
                            else if (item.ValueKind == JsonValueKind.Object && item.TryGetProperty("name", out var nameProp))
                            {
                                var s = nameProp.GetString()?.Trim();
                                if (!string.IsNullOrEmpty(s) && !sanitizedEquipment.Contains(s, StringComparer.OrdinalIgnoreCase))
                                    sanitizedEquipment.Add(s);
                            }
                        }
                    }
                }

                var calculatedMaterialsTotal = sanitizedMaterials.Sum(m => m.UnitCost * (decimal)m.Quantity);
                var materialCost = raw.MaterialCost > 0 ? raw.MaterialCost : calculatedMaterialsTotal;
                var labourCost = Math.Max(0, raw.LabourCost);
                var equipmentCost = Math.Max(0, raw.EquipmentCost);
                var estimatedCost = raw.EstimatedCost > 0
                    ? raw.EstimatedCost
                    : (materialCost + labourCost + equipmentCost);

                return new CostEstimationResult
                {
                    EstimatedCost          = Math.Max(0, estimatedCost),
                    Currency               = string.IsNullOrWhiteSpace(raw.Currency) ? "LKR" : raw.Currency.Trim().ToUpperInvariant(),
                    MaterialCost           = Math.Max(0, materialCost),
                    LabourCost             = labourCost,
                    EquipmentCost          = equipmentCost,
                    Materials              = sanitizedMaterials,
                    Equipment              = sanitizedEquipment,
                    RecommendedCrewSize    = Math.Max(1, crew),
                    EstimatedLabourHours   = Math.Max(0, labourHours),
                    EstimatedDurationHours = Math.Max(0, raw.EstimatedDurationHours),
                    Confidence             = Math.Clamp(raw.Confidence, 0.0, 1.0),
                    Reason                 = raw.Reason ?? raw.Explanation ?? "Cost estimation completed successfully.",
                    Recommendation         = raw.Recommendation ?? "Proceed with standard municipal repair procedure.",
                    ModelName              = modelName
                };
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Failed to parse AI cost estimate JSON: {Json}", jsonContent);
                return null;
            }
        }

        // ── Rule-based fallback (CIDA/Sri Lankan standard schedule of rates) ──
        internal static CostEstimationResult BuildFallback(CostEstimationInput input)
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

            // Factor in arterial road traffic safety requirements
            if (input.IsArterialRoad)
            {
                materials.Add(new RawMaterial
                {
                    Name = "Traffic Safety Cones & Warning Signage",
                    Quantity = 1,
                    Unit = "set",
                    UnitCost = 18000m
                });
                equipment.Add("Safety Barriers & Warning Signage");
                crew = Math.Max(crew + 1, 3); // Traffic controller / flagger
                baseCost += 25000m;
            }

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

            var arterialNote = input.IsArterialRoad ? " Includes arterial road traffic safety provisions." : "";

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
                Reason                 = $"Cost estimated using rule-based baseline (AI service unavailable or unconfigured). Based on Sri Lankan municipal schedule of rates.{arterialNote}",
                Recommendation         = "Generate AI estimate when Gemini service is available for detailed contextual estimation.",
                ModelName              = FallbackModelName
            };
        }
    }

    // ── Semantic Kernel Plugin — Safe Allow-Listed Tools ──────────────────────

    /// <summary>Plugin containing allow-listed estimation tools exposed to the Semantic Kernel agent.</summary>
    public class CostEstimationPlugin
    {
        private readonly ILogger _logger;

        public CostEstimationPlugin(ILogger logger) => _logger = logger;

        /// <summary>Returns baseline repair cost ranges, crew requirements, and typical materials for a hazard type and severity in Sri Lanka (LKR).</summary>
        [KernelFunction, Description("Retrieve standard Sri Lankan civil works (CIDA baseline) cost ranges, crew requirements, and bill of quantities materials for a specified infrastructure hazard category and severity level.")]
        public string EstimateRepairCost(
            [Description("The municipal infrastructure hazard category. Supported categories: WaterLeak, Pothole, BrokenTrafficSignal, DamagedRoad, FallenTree, DrainageProblem, StreetLightProblem, or Other.")] string category,
            [Description("The hazard severity level: LOW, MEDIUM, HIGH, or CRITICAL.")] string severity)
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
        [KernelFunction, Description("Retrieve past municipal maintenance records, previous repair frequency, recurring defects, and repair complexity multipliers for an infrastructure asset ID.")]
        public string GetAssetMaintenanceHistory(
            [Description("The infrastructure asset ID from the municipal registry, e.g. AST-001 or AST-COL-ROADS-042.")] string assetId)
        {
            _logger.LogInformation("Agent calling GetAssetMaintenanceHistory(assetId={A})", assetId);

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
        public string Category       { get; set; } = string.Empty;
        public string Description    { get; set; } = string.Empty;
        public string? Severity      { get; set; }
        public string? RiskLevel     { get; set; }
        public string? Priority      { get; set; }
        public string? Location      { get; set; }
        public bool IsArterialRoad   { get; set; }
        public string? AssetId       { get; set; }
        public string? AssetType     { get; set; }
        public string? AssetCondition { get; set; }
        public int? AssetAgeYears    { get; set; }
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

    internal class RawLabour
    {
        [JsonPropertyName("requiredWorkers")] public int RequiredWorkers { get; set; }
        [JsonPropertyName("estimatedHours")]  public double EstimatedHours { get; set; }
    }

    internal class RawCostResult
    {
        [JsonPropertyName("estimatedCost")]       public decimal EstimatedCost         { get; set; }
        [JsonPropertyName("currency")]            public string? Currency              { get; set; }
        [JsonPropertyName("materialCost")]        public decimal MaterialCost          { get; set; }
        [JsonPropertyName("labourCost")]          public decimal LabourCost            { get; set; }
        [JsonPropertyName("equipmentCost")]       public decimal EquipmentCost         { get; set; }
        [JsonPropertyName("materials")]           public List<RawMaterial>? Materials  { get; set; }
        [JsonPropertyName("equipment")]           public object? EquipmentRaw          { get; set; }
        [JsonPropertyName("recommendedCrewSize")] public int RecommendedCrewSize       { get; set; }
        [JsonPropertyName("estimatedLabourHours")]public double EstimatedLabourHours   { get; set; }
        [JsonPropertyName("estimatedDurationHours")] public double EstimatedDurationHours { get; set; }
        [JsonPropertyName("labour")]              public RawLabour? Labour             { get; set; }
        [JsonPropertyName("confidence")]          public double Confidence             { get; set; }
        [JsonPropertyName("reason")]              public string? Reason                { get; set; }
        [JsonPropertyName("explanation")]         public string? Explanation           { get; set; }
        [JsonPropertyName("recommendation")]      public string? Recommendation        { get; set; }
    }

    public class RawMaterial
    {
        [JsonPropertyName("name")]      public string Name     { get; set; } = string.Empty;
        [JsonPropertyName("quantity")]  public double Quantity  { get; set; }
        [JsonPropertyName("unit")]      public string Unit      { get; set; } = string.Empty;
        [JsonPropertyName("unitCost")]  public decimal UnitCost { get; set; }

        [JsonPropertyName("estimatedUnitCost")]
        public decimal? EstimatedUnitCost
        {
            get => UnitCost;
            set { if (value.HasValue && UnitCost == 0) UnitCost = value.Value; }
        }
    }
}
