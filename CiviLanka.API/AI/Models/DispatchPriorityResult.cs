using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CiviLanka.API.AI.Models
{
    public class DispatchPriorityInput
    {
        public List<Guid> HazardIds { get; set; } = new();
        public string? TargetCorridor { get; set; }
        public string? PreferredSpecialization { get; set; }

        // Contextual database items
        public List<HazardDispatchItemContext> Hazards { get; set; } = new();
        public List<ContractorDispatchContext> AvailableContractors { get; set; } = new();
    }

    public class HazardDispatchItemContext
    {
        public Guid HazardId { get; set; }
        public string TicketNumber { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string Address { get; set; } = string.Empty;
        public DateTime ReportedAt { get; set; }
        public string? NearbyCorridor { get; set; }
    }

    public class ContractorDispatchContext
    {
        public int ContractorId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public double Rating { get; set; }
        public bool IsAvailable { get; set; }
        public int ActiveJobs { get; set; }
    }

    public class RankedHazardItem
    {
        [JsonPropertyName("hazardId")]
        public string HazardId { get; set; } = string.Empty;

        [JsonPropertyName("ticketNumber")]
        public string TicketNumber { get; set; } = string.Empty;

        [JsonPropertyName("dispatchRank")]
        public int DispatchRank { get; set; }

        [JsonPropertyName("priorityScore")]
        public int PriorityScore { get; set; } // 1-100

        [JsonPropertyName("urgencyTier")]
        public string UrgencyTier { get; set; } = "HIGH"; // CRITICAL, HIGH, MEDIUM, LOW

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    public class RouteCluster
    {
        [JsonPropertyName("clusterName")]
        public string ClusterName { get; set; } = string.Empty;

        [JsonPropertyName("corridor")]
        public string Corridor { get; set; } = string.Empty;

        [JsonPropertyName("estimatedDistanceKm")]
        public double EstimatedDistanceKm { get; set; }

        [JsonPropertyName("estimatedTravelTimeMinutes")]
        public int EstimatedTravelTimeMinutes { get; set; }

        [JsonPropertyName("hazardTickets")]
        public List<string> HazardTickets { get; set; } = new();

        [JsonPropertyName("recommendedSequence")]
        public List<string> RecommendedSequence { get; set; } = new();
    }

    public class SuggestedContractorAssignment
    {
        [JsonPropertyName("contractorId")]
        public int? ContractorId { get; set; }

        [JsonPropertyName("contractorName")]
        public string ContractorName { get; set; } = string.Empty;

        [JsonPropertyName("specialization")]
        public string Specialization { get; set; } = string.Empty;

        [JsonPropertyName("recommendedCrewSize")]
        public int RecommendedCrewSize { get; set; } = 3;

        [JsonPropertyName("assignmentRationale")]
        public string AssignmentRationale { get; set; } = string.Empty;
    }

    public class DispatchPriorityResult
    {
        [JsonPropertyName("overallOptimizationScore")]
        public int OverallOptimizationScore { get; set; } // 1-100

        [JsonPropertyName("rankedHazards")]
        public List<RankedHazardItem> RankedHazards { get; set; } = new();

        [JsonPropertyName("routeClusters")]
        public List<RouteCluster> RouteClusters { get; set; } = new();

        [JsonPropertyName("suggestedAssignment")]
        public SuggestedContractorAssignment SuggestedAssignment { get; set; } = new();

        [JsonPropertyName("tradeoffAnalysis")]
        public string TradeoffAnalysis { get; set; } = string.Empty;

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; } = 0.90;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "OPTIMIZED";

        [JsonPropertyName("modelName")]
        public string ModelName { get; set; } = "gemini-2.5-flash";

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class DispatchPriorityRequestDto
    {
        public List<Guid>? HazardIds { get; set; }
        public string? Corridor { get; set; }
        public string? Specialization { get; set; }
    }
}
