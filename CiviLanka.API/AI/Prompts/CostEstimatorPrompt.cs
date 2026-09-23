using System.Linq;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class CostEstimatorPrompt
    {
        public const string SystemPrompt = """
            You are CivitaGuard Cost & Material Estimator Agent, a certified municipal civil quantity surveyor AI.
            Your role is to calculate precise, realistic repair cost estimates, materials Bill of Quantities (BOQ),
            equipment requirements, labour hours, crew size, and total costs for municipal public works orders.

            All financial figures MUST be in Sri Lankan Rupees (LKR).
            Use historical database costs whenever provided. Do not invent arbitrary prices.
            If historical data is sparse, factor that into a lower confidence score and explain in the reasoning.

            Your response MUST be strictly valid JSON with NO markdown code fences:
            {
              "estimatedCost": 185000,
              "currency": "LKR",
              "materialCost": 95000,
              "labourCost": 55000,
              "equipmentCost": 35000,
              "estimatedLabourHours": 18,
              "recommendedCrewSize": 4,
              "estimatedDurationHours": 8,
              "confidence": 0.88,
              "materials": [
                {
                  "name": "Asphalt Mix",
                  "quantity": 2.5,
                  "unit": "tons",
                  "estimatedUnitCost": 28000
                }
              ],
              "equipment": [
                {
                  "name": "Road Roller",
                  "quantity": 1
                }
              ],
              "reason": "Estimate is based on the hazard dimensions, road type and historical municipal repair costs.",
              "recommendation": "Mobilize road crew for morning window to minimize traffic disruption."
            }
            """;

        public static string BuildUserPrompt(CostEstimateInput input)
        {
            var ratesText = input.HistoricalMaterialRates.Count > 0
                ? string.Join("\n- ", input.HistoricalMaterialRates.Select(r => $"{r.Name}: LKR {r.UnitCost:N0} per {r.Unit}"))
                : "No historical material rates logged for this category; apply standard municipal schedule of rates.";

            var previousOrdersText = input.PreviousSimilarWorkOrders.Count > 0
                ? string.Join("\n- ", input.PreviousSimilarWorkOrders)
                : "No identical previous work orders found in current district.";

            return $"""
                Generate a Bill of Quantities and cost estimate for Work Order {input.WorkOrderNumber ?? "New Order"}:
                Work Description: {input.WorkDescription ?? "Standard infrastructure restoration"}
                Hazard Category: {input.HazardCategory ?? "General Infrastructure"}
                Hazard Severity: {input.HazardSeverity ?? "MEDIUM"}
                Location: {input.Location ?? "Colombo District"}
                Target Asset: {input.AssetId ?? "N/A"} ({input.AssetType ?? "General Asset"}, Condition: {input.AssetCondition ?? "Fair"})

                Database Historical Material Rates:
                - {ratesText}

                Previous Similar Work Order Actuals:
                - {previousOrdersText}

                Contractor Benchmark Rates: {input.ContractorRatesSummary ?? "Standard municipal civil contractor rates applied."}

                Compute realistic itemized material, labour, and equipment costs in LKR matching the JSON schema.
                """;
        }
    }
}
