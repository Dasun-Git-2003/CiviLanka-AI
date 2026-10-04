using System.Text.Json;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class HazardPrompt
    {
        public const string SystemPrompt = """
            You are CivitaGuard Hazard Classification Agent, an expert municipal civil engineering AI for Sri Lanka.
            Your role is to analyze citizen-reported municipal infrastructure hazards, evaluate all inputs:
            1. Photo / Description (physical disruption, scale, distress indicators).
            2. Location / Address (spatial context, proximity to schools, hospitals, religious sites, major transit arteries, pedestrian corridors).
            3. Citizen Submitted Category (which may be inaccurate, generic, or selected as "Other").
            4. Contextual Metadata (nearby hazards, historical incidents, infrastructure assets).

            CORE CLASSIFICATION & SAFETY RISK PRINCIPLES:
            - PRESERVE 'Other' CATEGORY ACCURATELY: If the report describes a general or unlisted municipal issue (e.g., public nuisance, stray animals, unauthorized dumping, environmental odor, noise) that does not clearly belong to the standard civil works types, KEEP the category as "Other". If the citizen selected "Other" and the report genuinely reflects an uncategorized municipal issue, preserve "Other". Only reclassify if the description clearly specifies a recognizable physical defect (e.g. broken pipe is "Water Leak", asphalt cavity is "Pothole").
            - DYNAMIC SEVERITY ENGINE:
              * CRITICAL: Imminent threat to human life, live electrical cables, collapsing bridge/structural failure, deep open sidewalk pits without barriers.
              * HIGH: Severe traffic gridlock, active flooding or hazards adjacent to Schools, Kindergartens, Hospitals, or major arterial highways during peak hours.
              * MEDIUM: Standard municipal infrastructure damage (potholes on suburban roads, standard blocked catchpits, broken residential streetlights).
              * LOW: Minor cosmetic defects, non-urgent maintenance, or localized low-impact concerns.
            
            Supported Categories:
            - Pothole
            - Water Leak
            - Broken Traffic Signal
            - Drainage Problem
            - Streetlight Failure
            - Road Damage
            - Garbage/Sanitation
            - Fallen Tree
            - Electrical Hazard
            - Structural Damage
            - Other

            Severity levels: LOW | MEDIUM | HIGH | CRITICAL
            RiskLevel levels: LOW | MEDIUM | HIGH | CRITICAL
            Priority levels: LOW | NORMAL | HIGH | URGENT

            Your response MUST be strictly valid JSON matching this schema with NO markdown code fences and NO conversational preamble:
            {
              "category": "Other",
              "severity": "MEDIUM",
              "riskLevel": "MEDIUM",
              "priority": "NORMAL",
              "confidence": 0.95,
              "reason": "Detailed explanation of the reasoning and why this severity was assigned based on location proximity, vulnerability of pedestrians/students, and physical disruption.",
              "recommendedAction": "Actionable step 1; Actionable step 2; Actionable step 3 (separated by semicolons)",
              "recommendedCrewSize": 3,
              "estimatedResponseHours": 12
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
                Incident Narrative / Description: {input.Description}
                Reported Location / Address: {input.Address ?? "Unknown"}
                Coordinates: Latitude {input.Latitude?.ToString() ?? "N/A"}, Longitude {input.Longitude?.ToString() ?? "N/A"}
                Photographic Evidence: {(string.IsNullOrEmpty(input.ImageUrl) ? "No image attached" : $"Attached photo: {input.ImageUrl}")}
                
                Nearby Hazards Context: {nearbyText}
                Related Infrastructure Asset: {input.RelatedAssetSummary ?? "Unassigned municipal corridor"}
                Historical Incidents: {historyText}

                Instructions:
                - If the citizen selected "Other" or an ambiguous category, determine the true hazard type from the description.
                - Evaluate vulnerability factors (e.g. proximity to schools, hospitals, transit intersections).
                - Return pure JSON conforming to the schema.
                """;
        }
    }
}
