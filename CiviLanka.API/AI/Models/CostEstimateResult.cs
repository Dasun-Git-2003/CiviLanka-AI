using System.Text.Json.Serialization;

namespace CiviLanka.API.AI.Models
{
    public class CostEstimateInput
    {
        public Guid WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }
        public Guid? HazardId { get; set; }
        public string? HazardCategory { get; set; }
        public string? HazardSeverity { get; set; }
        public string? WorkDescription { get; set; }
        public string? Location { get; set; }

        public string? AssetId { get; set; }
        public string? AssetType { get; set; }
        public string? AssetCondition { get; set; }

        // Contextual database records
        public List<string> HistoricalMaintenanceRecords { get; set; } = new();
        public List<string> PreviousSimilarWorkOrders { get; set; } = new();
        public List<HistoricalMaterialRate> HistoricalMaterialRates { get; set; } = new();
        public string? ContractorRatesSummary { get; set; }
    }

    public class HistoricalMaterialRate
    {
        public string Name { get; set; } = string.Empty;
        public decimal UnitCost { get; set; }
        public string Unit { get; set; } = "units";
    }

    public class MaterialItemEstimate
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public decimal Quantity { get; set; }

        [JsonPropertyName("unit")]
        public string Unit { get; set; } = "units";

        [JsonPropertyName("estimatedUnitCost")]
        public decimal EstimatedUnitCost { get; set; }

        [JsonPropertyName("totalCost")]
        public decimal TotalCost => Quantity * EstimatedUnitCost;
    }

    public class EquipmentItemEstimate
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; } = 1;
    }

    public class CostEstimateResult
    {
        [JsonPropertyName("estimatedCost")]
        public decimal EstimatedCost { get; set; }

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "LKR";

        [JsonPropertyName("materialCost")]
        public decimal MaterialCost { get; set; }

        [JsonPropertyName("labourCost")]
        public decimal LabourCost { get; set; }

        [JsonPropertyName("equipmentCost")]
        public decimal EquipmentCost { get; set; }

        [JsonPropertyName("estimatedLabourHours")]
        public decimal EstimatedLabourHours { get; set; }

        [JsonPropertyName("recommendedCrewSize")]
        public int RecommendedCrewSize { get; set; }

        [JsonPropertyName("estimatedDurationHours")]
        public int EstimatedDurationHours { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("materials")]
        public List<MaterialItemEstimate> Materials { get; set; } = new();

        [JsonPropertyName("equipment")]
        public List<EquipmentItemEstimate> Equipment { get; set; } = new();

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("recommendation")]
        public string? Recommendation { get; set; }

        public bool RequiresSupervisorApproval { get; set; }
        public bool RequiresDirectorApproval { get; set; }

        public string ModelName { get; set; } = "gemini-2.5-flash";
        public string Status { get; set; } = "AI_ANALYZED";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
