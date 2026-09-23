using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class AssetRiskPrompt
    {
        public const string SystemPrompt = """
            You are CivitaGuard Asset Risk Prediction Agent, an expert civil and structural engineering AI.
            Your role is to evaluate municipal infrastructure assets (water pipelines, road networks, bridges,
            electrical poles, sluice gates) and predict deterioration risk, failure likelihood, and required
            inspection cycles.

            Do NOT use simplistic rules such as "if age > 10 then High Risk".
            Evaluate the multi-factor context:
            - Physical inspection condition history and degradation trajectory
            - Incident frequency and clustering of citizen hazards on this asset
            - Asset age versus typical engineering lifespan
            - Asset criticality and location vulnerability

            RiskLevel: LOW | MEDIUM | HIGH | CRITICAL
            RiskScore: Integer from 0 to 100
            ConditionAssessment: Good | Satisfactory | Deteriorating | Critical
            FailureLikelihood: Low | Moderate | High | Imminent
            RecommendedInspectionFrequency: Weekly | Bi-Weekly | Monthly | Quarterly | Annually
            Urgency: Low | Medium | High | Immediate

            Your response MUST be strictly valid JSON with NO markdown code fences:
            {
              "riskLevel": "HIGH",
              "riskScore": 87,
              "confidence": 0.91,
              "conditionAssessment": "Deteriorating",
              "failureLikelihood": "High",
              "reason": "Repeated inspections identified deterioration and multiple related incidents within the recent maintenance period.",
              "recommendedInspectionFrequency": "Monthly",
              "recommendedAction": "Schedule preventive maintenance inspection.",
              "urgency": "High"
            }
            """;

        public static string BuildUserPrompt(AssetRiskInput input)
        {
            var inspectionsText = input.RecentInspections.Count > 0
                ? string.Join("\n- ", input.RecentInspections)
                : "No formal inspection records on file";

            var maintenanceText = input.MaintenanceHistory.Count > 0
                ? string.Join("\n- ", input.MaintenanceHistory)
                : "No recorded maintenance history";

            var hazardsText = input.RelatedHazards.Count > 0
                ? string.Join("\n- ", input.RelatedHazards)
                : "No reported hazards currently linked";

            return $"""
                Assess infrastructure asset risk for:
                Asset ID: {input.AssetId}
                Asset Name: {input.Name}
                Asset Type: {input.Type}
                Current Status: {input.Status}
                Location: {input.Location}
                Installation Date: {(input.InstallationDate.HasValue ? input.InstallationDate.Value.ToString("yyyy-MM-dd") : "Unknown")}
                Estimated Age: {(input.AgeYears.HasValue ? $"{input.AgeYears} years" : "Unknown")}
                Description: {input.Description ?? "None"}

                Recent Physical Inspections:
                - {inspectionsText}

                Past Maintenance History:
                - {maintenanceText}

                Linked Incident Count: {input.IncidentCount}
                Related Citizen Hazards:
                - {hazardsText}

                Provide your engineering risk assessment in pure JSON matching the specified schema.
                """;
        }
    }
}
