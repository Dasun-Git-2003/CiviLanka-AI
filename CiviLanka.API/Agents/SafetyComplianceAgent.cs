using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using CiviLanka.API.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.Google;

namespace CiviLanka.API.Agents
{
    public interface ISafetyComplianceAgent
    {
        Task<SafetyComplianceEvaluationResult?> EvaluateAsync(SafetyComplianceEvaluationInput input);
    }

    public class SafetyComplianceEvaluationInput
    {
        public Guid MaintenanceRecordId { get; set; }
        public Guid WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? HazardCategory { get; set; }
        public string? Severity { get; set; }
        public string? Priority { get; set; }
        public string? Location { get; set; }
        public decimal? EstimatedCost { get; set; }
        public decimal ActualCost { get; set; }
        public int? RecommendedCrewSize { get; set; }
        public int? EstimatedDurationHours { get; set; }

        public string? AssetId { get; set; }
        public string? AssetType { get; set; }
        public string? AssetCondition { get; set; }
        public int? AssetAgeYears { get; set; }

        public string MaintenanceType { get; set; } = "Corrective";
        public string? MaterialsUsed { get; set; }
        public string? EquipmentUsed { get; set; }
        public decimal LabourHours { get; set; }
        public string? SafetyChecklist { get; set; }
        public string? WorkerNotes { get; set; }
        public string? CompletionNotes { get; set; }
        public bool HasBeforeImage { get; set; }
        public bool HasAfterImage { get; set; }
    }

    public class SafetyComplianceEvaluationResult
    {
        [JsonPropertyName("safetyRiskLevel")]
        public string SafetyRiskLevel { get; set; } = "LOW";

        [JsonPropertyName("complianceStatus")]
        public string ComplianceStatus { get; set; } = "REQUIRES_REVIEW";

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; } = 0.85;

        [JsonPropertyName("identifiedRisks")]
        public List<string> IdentifiedRisks { get; set; } = new();

        [JsonPropertyName("missingRequirements")]
        public List<string> MissingRequirements { get; set; } = new();

        [JsonPropertyName("requiredSafetyActions")]
        public List<string> RequiredSafetyActions { get; set; } = new();

        [JsonPropertyName("recommendation")]
        public string Recommendation { get; set; } = string.Empty;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        public string ModelName { get; set; } = "gemini-2.0-flash";
    }

    /// <summary>
    /// AI agent that evaluates safety risks, missing evidence, compliance posture,
    /// and required actions for municipal field maintenance using Google Gemini 2.0 Flash.
    /// </summary>
    public class SafetyComplianceAgent : ISafetyComplianceAgent
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SafetyComplianceAgent> _logger;

        private const string ModelName = "gemini-2.0-flash";
        private const string AgentName = "CivitaGuard-SafetyCompliance-v1";

        public SafetyComplianceAgent(IConfiguration config, ILogger<SafetyComplianceAgent> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<SafetyComplianceEvaluationResult?> EvaluateAsync(SafetyComplianceEvaluationInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            var apiKey = _config["GeminiSettings:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
            {
                _logger.LogWarning("Gemini API key not configured. Using rule-based safety compliance fallback.");
                return BuildFallback(input);
            }

            try
            {
                var kernelBuilder = Kernel.CreateBuilder();
                kernelBuilder.AddGoogleAIGeminiChatCompletion(ModelName, apiKey);

                var plugin = new SafetyCompliancePlugin(_logger);
                kernelBuilder.Plugins.AddFromObject(plugin, "SafetyTools");

                var kernel = kernelBuilder.Build();

                var systemPrompt = """
                    You are CivitaGuard Safety & Compliance Agent, an expert municipal engineering safety auditor.
                    Your responsibility is to analyze a completed or in-progress municipal infrastructure maintenance job,
                    evaluating physical safety risks, regulatory compliance, PPE requirements, and missing evidence.

                    Available Tools:
                    - GetRequiredSafetyRules(workType): retrieves mandatory municipal safety standards and required checklists.
                    - CheckHazardEnvironmentalRisks(category, location): assesses external risks (traffic density, weather, water flow).

                    Reasoning steps:
                    1. Call GetRequiredSafetyRules for the given maintenanceType or hazardCategory.
                    2. Evaluate whether mandatory photographic evidence (before & after photos) is present.
                    3. Check if the safety checklist was completed and if any vital precautions were omitted.
                    4. Identify risks such as high-speed traffic, high-voltage electricity, excavation collapse, pressurized water, or toxic sewer gases.
                    5. Assign safetyRiskLevel: LOW | MEDIUM | HIGH | CRITICAL.
                    6. Assign complianceStatus: PASS | REQUIRES_REVIEW | FAILED.
                       - If before or after photo is missing, complianceStatus must be REQUIRES_REVIEW or FAILED.
                       - If labour hours or worker notes are missing or zero, flag as missing requirements.
                    7. State concrete requiredSafetyActions and an actionable recommendation for the supervisor.

                    CRITICAL INSTRUCTION: Return ONLY a valid JSON object. No markdown formatting, no commentary outside JSON.
                    Format:
                    {
                      "safetyRiskLevel": "LOW",
                      "complianceStatus": "PASS",
                      "confidence": 0.95,
                      "identifiedRisks": [ "string" ],
                      "missingRequirements": [ "string" ],
                      "requiredSafetyActions": [ "string" ],
                      "recommendation": "string",
                      "reason": "string"
                    }
                    """;

                var userPrompt = $"""
                    Evaluate this municipal maintenance record:
                    - Work Order: {input.WorkOrderNumber} - {input.Title}
                    - Description: {input.Description}
                    - Hazard Category: {input.HazardCategory ?? "Unknown"}
                    - Severity: {input.Severity ?? "NORMAL"}
                    - Priority: {input.Priority ?? "NORMAL"}
                    - Location: {input.Location ?? "Unspecified"}
                    - Asset Type: {input.AssetType ?? "General"}
                    - Asset Condition: {input.AssetCondition ?? "Fair"}
                    - Maintenance Type: {input.MaintenanceType}
                    - Labour Hours Recorded: {input.LabourHours}
                    - Actual Cost: {input.ActualCost} LKR
                    - Materials Used: {input.MaterialsUsed ?? "None reported"}
                    - Equipment Used: {input.EquipmentUsed ?? "None reported"}
                    - Safety Checklist Completed: {input.SafetyChecklist ?? "None"}
                    - Worker Notes: {input.WorkerNotes ?? "None"}
                    - Completion Notes: {input.CompletionNotes ?? "None"}
                    - Before Image Present: {input.HasBeforeImage}
                    - After Image Present: {input.HasAfterImage}
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

                _logger.LogInformation("Invoking Gemini Safety Compliance analysis for MaintenanceRecord {Id}", input.MaintenanceRecordId);

                var response = await chatService.GetChatMessageContentAsync(chatHistory, executionSettings, kernel);
                var content = response.Content?.Trim();

                if (string.IsNullOrWhiteSpace(content))
                {
                    _logger.LogWarning("Gemini returned empty response for safety compliance. Falling back.");
                    return BuildFallback(input);
                }

                // Strip markdown code fences if model enclosed JSON
                if (content.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                    content = content.Substring(7);
                if (content.StartsWith("```"))
                    content = content.Substring(3);
                if (content.EndsWith("```"))
                    content = content.Substring(0, content.Length - 3);
                content = content.Trim();

                var parsed = JsonSerializer.Deserialize<SafetyComplianceEvaluationResult>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (parsed != null)
                {
                    parsed.ModelName = ModelName;
                    ValidateAndNormalizeResult(parsed, input);
                    return parsed;
                }

                return BuildFallback(input);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Gemini Safety Compliance agent. Using rule-based fallback.");
                return BuildFallback(input);
            }
        }

        public SafetyComplianceEvaluationResult BuildFallback(SafetyComplianceEvaluationInput input)
        {
            var risks = new List<string>();
            var missing = new List<string>();
            var actions = new List<string>();

            // 1. Evidence Verification
            if (!input.HasBeforeImage)
                missing.Add("Before-maintenance photographic evidence is missing.");
            if (!input.HasAfterImage)
                missing.Add("After-maintenance completion photographic evidence is missing.");

            if (input.LabourHours <= 0)
                missing.Add("Labour hours have not been logged.");

            if (string.IsNullOrWhiteSpace(input.WorkerNotes) && string.IsNullOrWhiteSpace(input.CompletionNotes))
                missing.Add("Field worker completion observations/notes are missing.");

            // 2. Risk Identification by Category & Severity
            var category = (input.HazardCategory ?? "").ToUpperInvariant();
            var severity = (input.Severity ?? "").ToUpperInvariant();

            string riskLevel = SafetyRiskLevels.Low;

            if (category.Contains("POTHOLE") || category.Contains("ROAD"))
            {
                risks.Add("Traffic exposure and moving vehicular hazard.");
                risks.Add("Flying aggregate during mechanical compaction.");
                actions.Add("Deploy reflective traffic cones and advanced warning signage.");
                actions.Add("Mandatory high-visibility ANSI Class 3 vests for all crew.");
                riskLevel = severity == "CRITICAL" || severity == "HIGH" ? SafetyRiskLevels.High : SafetyRiskLevels.Medium;
            }
            else if (category.Contains("WATER") || category.Contains("LEAK"))
            {
                risks.Add("Pressurized water jet hazard during pipeline coupling.");
                risks.Add("Trench collapse or waterlogging hazard.");
                actions.Add("Isolate main gate valve prior to flange replacement.");
                actions.Add("Use shoring if excavation exceeds 1.2 meters.");
                riskLevel = severity == "CRITICAL" ? SafetyRiskLevels.High : SafetyRiskLevels.Medium;
            }
            else if (category.Contains("SIGNAL") || category.Contains("LIGHT") || category.Contains("ELECTRICAL"))
            {
                risks.Add("High-voltage shock and electrocution risk.");
                risks.Add("Working at height from boom lift.");
                actions.Add("Lockout / Tagout (LOTO) isolation on circuit breaker.");
                actions.Add("Full body harness tied off to certified anchor point.");
                riskLevel = SafetyRiskLevels.Critical;
            }
            else if (category.Contains("TREE"))
            {
                risks.Add("Overhead branch drop and tension release during chainsaw cutting.");
                risks.Add("Proximity to overhead electricity distribution lines.");
                actions.Add("Coordinate with Ceylon Electricity Board (CEB) for overhead line de-energization.");
                actions.Add("Establish a 10-meter drop zone radius with perimeter tape.");
                riskLevel = SafetyRiskLevels.High;
            }
            else if (category.Contains("DRAIN"))
            {
                risks.Add("Toxic gas buildup (hydrogen sulfide / methane) in confined culvert.");
                risks.Add("Flooding hazard during sudden downpour.");
                actions.Add("Atmospheric multi-gas testing before human entry.");
                actions.Add("Standby rescue worker with retrieval tripod.");
                riskLevel = SafetyRiskLevels.High;
            }
            else
            {
                risks.Add("General physical injury, slips, and heavy lifting strains.");
                actions.Add("Wear safety boots, hard hats, and leather gloves.");
                riskLevel = SafetyRiskLevels.Low;
            }

            // 3. Compliance Status Determination
            string complianceStatus;
            if (missing.Count > 0)
            {
                complianceStatus = missing.Contains("After-maintenance completion photographic evidence is missing.")
                    ? ComplianceStatuses.RequiresReview
                    : ComplianceStatuses.RequiresReview;
            }
            else
            {
                complianceStatus = ComplianceStatuses.Pass;
            }

            var recommendation = complianceStatus == ComplianceStatuses.Pass
                ? "All municipal evidence and safety parameters confirmed. Maintenance is ready for supervisor verification."
                : $"Supervisor review required. Resolve missing items: {string.Join("; ", missing)}.";

            return new SafetyComplianceEvaluationResult
            {
                SafetyRiskLevel       = riskLevel,
                ComplianceStatus      = complianceStatus,
                Confidence            = 0.88,
                IdentifiedRisks       = risks,
                MissingRequirements   = missing,
                RequiredSafetyActions = actions,
                Recommendation        = recommendation,
                Reason                = $"Evaluated {input.MaintenanceType} on {input.HazardCategory ?? "infrastructure"} using municipal safety standards.",
                ModelName             = "rule-based-safety-fallback"
            };
        }

        private void ValidateAndNormalizeResult(SafetyComplianceEvaluationResult result, SafetyComplianceEvaluationInput input)
        {
            // Normalize Risk Level
            if (string.IsNullOrWhiteSpace(result.SafetyRiskLevel) || !SafetyRiskLevels.All.Contains(result.SafetyRiskLevel.ToUpperInvariant()))
                result.SafetyRiskLevel = SafetyRiskLevels.Medium;
            else
                result.SafetyRiskLevel = result.SafetyRiskLevel.ToUpperInvariant();

            // Normalize Compliance
            if (string.IsNullOrWhiteSpace(result.ComplianceStatus) || !ComplianceStatuses.All.Contains(result.ComplianceStatus.ToUpperInvariant()))
                result.ComplianceStatus = ComplianceStatuses.RequiresReview;
            else
                result.ComplianceStatus = result.ComplianceStatus.ToUpperInvariant();

            // Clamp confidence to [0.0, 1.0]
            result.Confidence = Math.Clamp(result.Confidence, 0.0, 1.0);

            result.IdentifiedRisks       ??= new List<string>();
            result.MissingRequirements   ??= new List<string>();
            result.RequiredSafetyActions ??= new List<string>();

            // Hard invariant: if after image is missing, compliance CANNOT be PASS
            if (!input.HasAfterImage && result.ComplianceStatus == ComplianceStatuses.Pass)
            {
                result.ComplianceStatus = ComplianceStatuses.RequiresReview;
                if (!result.MissingRequirements.Contains("After-maintenance photo evidence is missing."))
                    result.MissingRequirements.Add("After-maintenance photo evidence is missing.");
            }
        }
    }

    /// <summary>
    /// Controlled tool plugin exposed to Semantic Kernel for the Safety & Compliance Agent.
    /// </summary>
    public class SafetyCompliancePlugin
    {
        private readonly ILogger _logger;

        public SafetyCompliancePlugin(ILogger logger)
        {
            _logger = logger;
        }

        [KernelFunction, Description("Returns mandatory safety standards and required checklists for the specified work type.")]
        public string GetRequiredSafetyRules(
            [Description("The category of repair work, e.g. RoadDamage, WaterLeak, BrokenTrafficSignal")] string workType)
        {
            _logger.LogInformation("Tool called: GetRequiredSafetyRules for {WorkType}", workType);

            return workType.ToUpperInvariant() switch
            {
                var s when s.Contains("ROAD") || s.Contains("POTHOLE") => JsonSerializer.Serialize(new
                {
                    standard = "SLS 573 / CiviLanka Roadway Safety Code",
                    requiredPPE = new[] { "High-Visibility Vest Class 3", "Steel-toe Boots", "Hard Hat", "Ear Defenders" },
                    mandatoryChecklist = new[] { "Traffic Cones Deployed", "Advance Warning Signs (100m, 50m)", "Traffic Marshals Assigned" },
                    minimumDropOffProtection = "Barricades required if trench depth > 50mm"
                }),

                var s when s.Contains("WATER") || s.Contains("PIPE") => JsonSerializer.Serialize(new
                {
                    standard = "NWSDB Municipal Pipeline Safety Standard",
                    requiredPPE = new[] { "Rubberized Boots", "Chemical-resistant Gloves", "Face Shield", "Hard Hat" },
                    mandatoryChecklist = new[] { "Isolation Valve Verified Closed", "Pressure Gauge Confirmed 0 Bar", "Trench Shoring" },
                    excavationRule = "Trench shoring required for depths >= 1.2 meters"
                }),

                var s when s.Contains("SIGNAL") || s.Contains("LIGHT") => JsonSerializer.Serialize(new
                {
                    standard = "CEB Electrical Safety Code 2024",
                    requiredPPE = new[] { "10kV Insulated Gloves", "Dielectric Boots", "Safety Glasses", "Fall Arrest Harness" },
                    mandatoryChecklist = new[] { "Circuit De-energized and Locked Out (LOTO)", "Voltage Detector Test", "Boom Lift Outriggers Locked" },
                    workingAtHeightRule = "Fall arrest harness mandatory above 2.0 meters"
                }),

                _ => JsonSerializer.Serialize(new
                {
                    standard = "General Municipal Field Safety Standard",
                    requiredPPE = new[] { "Hard Hat", "High-Visibility Vest", "Safety Boots", "Work Gloves" },
                    mandatoryChecklist = new[] { "Hazard Perimeter Taped", "First Aid Kit on Site" }
                })
            };
        }

        [KernelFunction, Description("Assesses external environmental risks like traffic exposure and weather factors for a hazard location.")]
        public string CheckHazardEnvironmentalRisks(
            [Description("Category of the hazard")] string category,
            [Description("Location address or district")] string location)
        {
            _logger.LogInformation("Tool called: CheckHazardEnvironmentalRisks for {Category} at {Location}", category, location);

            var loc = location ?? "";
            bool isHighTraffic = loc.Contains("Galle", StringComparison.OrdinalIgnoreCase) ||
                                 loc.Contains("Colombo", StringComparison.OrdinalIgnoreCase) ||
                                 loc.Contains("Main", StringComparison.OrdinalIgnoreCase);

            return JsonSerializer.Serialize(new
            {
                locationEvaluated = loc,
                isHighTrafficCorridor = isHighTraffic,
                pedestrianDensity = isHighTraffic ? "High" : "Moderate",
                recommendedPerimeterBufferMeters = isHighTraffic ? 25 : 10,
                nightWorkLightingMandatory = true
            });
        }
    }
}
