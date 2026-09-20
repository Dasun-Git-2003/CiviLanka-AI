using System;
using System.Text;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class DispatchPriorityPrompt
    {
        public const string SystemPrompt = """
            You are CiviLanka AI Dispatch & Priority Agent, an autonomous municipal operations dispatch coordinator.
            Your role is to:
            1. Determine which hazards should be handled first based on public safety urgency, traffic density, and municipal criticality.
            2. Cluster geographically nearby hazards into cohesive maintenance routes/corridors to minimize crew travel time.
            3. Suggest optimal contractor and crew assignments by matching repair specialization (Roads & Bridges, Water & Plumbing, Electrical, Sanitation, Civil), availability, and capacity.
            4. Balance urgency, spatial distance, and estimated repair impact, providing a clear tradeoff analysis.

            Your response MUST be strictly valid JSON matching this schema with NO markdown code fences and NO preamble:
            {
              "overallOptimizationScore": 88,
              "rankedHazards": [
                {
                  "hazardId": "guid-or-string",
                  "ticketNumber": "HAZ-001",
                  "dispatchRank": 1,
                  "priorityScore": 95,
                  "urgencyTier": "CRITICAL",
                  "reason": "Active arterial road burst causing severe traffic disruption and imminent structural washout."
                }
              ],
              "routeClusters": [
                {
                  "clusterName": "Galle Road Coastal Corridor Route",
                  "corridor": "Galle Road, Colombo 03 - 04",
                  "estimatedDistanceKm": 3.4,
                  "estimatedTravelTimeMinutes": 15,
                  "hazardTickets": ["HAZ-001", "HAZ-004"],
                  "recommendedSequence": ["HAZ-001", "HAZ-004"]
                }
              ],
              "suggestedAssignment": {
                "contractorId": 1,
                "contractorName": "Lanka Infrastructure Works Ltd",
                "specialization": "Roads & Bridges",
                "recommendedCrewSize": 4,
                "assignmentRationale": "Best match for asphalt restoration, high rating (4.8), and active availability in Colombo Central."
              },
              "tradeoffAnalysis": "Prioritized high-severity Galle Road crater first due to high-speed arterial exposure, routing secondary pedestrian curb repair immediately following in the same corridor to save 45 minutes travel time.",
              "confidence": 0.92
            }
            """;

        public static string BuildUserPrompt(DispatchPriorityInput input)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Optimize dispatch prioritization, routing, and contractor assignment for the following hazards:");
            sb.AppendLine();

            if (!string.IsNullOrWhiteSpace(input.TargetCorridor))
            {
                sb.AppendLine($"Target Corridor Focus: {input.TargetCorridor}");
            }
            if (!string.IsNullOrWhiteSpace(input.PreferredSpecialization))
            {
                sb.AppendLine($"Preferred Specialization: {input.PreferredSpecialization}");
            }

            sb.AppendLine("=== PENDING HAZARDS ===");
            if (input.Hazards.Count == 0)
            {
                sb.AppendLine("No hazards provided.");
            }
            else
            {
                for (int i = 0; i < input.Hazards.Count; i++)
                {
                    var h = input.Hazards[i];
                    sb.AppendLine($"[{i + 1}] Ticket: {h.TicketNumber} (ID: {h.HazardId})");
                    sb.AppendLine($"    Category: {h.Category} | Severity: {h.Severity} | Priority: {h.Priority}");
                    sb.AppendLine($"    Location: {h.Address} (Lat: {h.Latitude?.ToString("F4") ?? "N/A"}, Lng: {h.Longitude?.ToString("F4") ?? "N/A"})");
                    sb.AppendLine($"    Corridor: {h.NearbyCorridor ?? "General"} | Reported At: {h.ReportedAt:yyyy-MM-dd HH:mm}");
                }
            }

            sb.AppendLine();
            sb.AppendLine("=== AVAILABLE CONTRACTORS / CREWS IN DATABASE ===");
            if (input.AvailableContractors.Count == 0)
            {
                sb.AppendLine("No pre-registered contractors listed; recommend standard municipal internal crew.");
            }
            else
            {
                foreach (var c in input.AvailableContractors)
                {
                    sb.AppendLine($"- ID: {c.ContractorId} | Name: {c.Name} | Spec: {c.Specialization} | Location: {c.Location} | Rating: {c.Rating:F1} | Available: {c.IsAvailable} | Active Jobs: {c.ActiveJobs}");
                }
            }

            sb.AppendLine();
            sb.AppendLine("Rank the hazards, cluster into an efficient sequence, suggest the best contractor, and provide trade-off optimization.");
            return sb.ToString();
        }
    }
}
