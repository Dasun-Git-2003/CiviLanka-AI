using System.Text.Json;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class HazardPrompt
    {
        public const string SystemPrompt = """
            You are CivitaGuard Hazard Classification Agent, an expert municipal engineering AI.
            Your role is to analyze citizen-reported municipal infrastructure hazards, critically evaluate
            the user-submitted category, assess true severity and urgency based on traffic, density,
            nearby infrastructure assets, and historical incidents, and return a structured JSON response.

            Do NOT blindly trust the citizen's category. Compare it against the description, location,
            and contextual infrastructure data.

            Supported Categories:
            - Pothole
            - Water Leak
            - Broken Traffic Signal
            - Drainage Problem
            - Streetlight Failure
            - Road Damage
            - Garbage/Sanitation
            - Fallen Tree
            - Other

            Severity levels: LOW | MEDIUM | HIGH | CRITICAL
            RiskLevel levels: LOW | MEDIUM | HIGH | CRITICAL
            Priority levels: LOW | NORMAL | HIGH | URGENT

            Your response MUST be strictly valid JSON matching this schema with NO markdown code fences and NO conversational preamble:
            {
              "category": "Pothole",
              "severity": "HIGH",
              "riskLevel": "HIGH",
              "priority": "URGENT",
              "confidence": 0.94,
              "reason": "Clear explanation of the reasoning and why this priority was assigned.",
              "recommendedAction": "Actionable step for municipal crews.",
              "recommendedCrewSize": 3,
              "estimatedResponseHours": 4
            }
            """;

        public static string BuildUserPrompt(HazardClassificationInput input)
        {
            var nearbyText = input.NearbyHazardsSummary.Count > 0
                ? string.Join("; ", input.NearbyHazardsSummary)
                : "None reported within 500m";

            var historyText = input.HistoricalIncidentsSummary.Count > 0
                ? string.Join("; ", input.HistoricalIncidentsSummary)
                : "No prior logged incidents";

            return $"""
                Analyze and classify this citizen hazard report:
                Ticket Number: {input.TicketNumber ?? "N/A"}
                Citizen Submitted Category: {input.CategorySupplied}
                Description: {input.Description}
                Reported Address: {input.Address ?? "Unknown"}
                Coordinates: Latitude {input.Latitude?.ToString() ?? "N/A"}, Longitude {input.Longitude?.ToString() ?? "N/A"}
                Image Attached: {(string.IsNullOrEmpty(input.ImageUrl) ? "No" : "Yes, image uploaded")}
                
                Nearby Hazards Context: {nearbyText}
                Related Infrastructure Asset: {input.RelatedAssetSummary ?? "Unassigned municipal corridor"}
                Historical Incidents: {historyText}

                Provide your structured assessment in pure JSON according to the system schema.
                """;
        }
    }
}
