using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Represents a citizen-submitted infrastructure hazard report.
    /// Soft-delete is used (IsCancelled) to preserve audit trail for
    /// municipal compliance requirements.
    /// </summary>
    public class Hazard
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Human-readable ticket number, e.g. CG-2026-00001</summary>
        [Required]
        [MaxLength(20)]
        public string TicketNumber { get; set; } = string.Empty;

        /// <summary>FK to the citizen who submitted the hazard.</summary>
        [Required]
        public string CitizenId { get; set; } = string.Empty;

        [ForeignKey(nameof(CitizenId))]
        public ApplicationUser? Citizen { get; set; }

        /// <summary>
        /// Category of infrastructure hazard.
        /// Values: Pothole | WaterLeak | BrokenTrafficSignal | DamagedRoad |
        ///         FallenTree | DrainageProblem | StreetLightProblem | Other
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        /// <summary>Free-text citizen description of the hazard.</summary>
        [Required]
        public string Description { get; set; } = string.Empty;

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        /// <summary>Reverse-geocoded human-readable address (set by system).</summary>
        [MaxLength(500)]
        public string? Address { get; set; }

        /// <summary>URL/path to the uploaded photo.</summary>
        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Lifecycle status of the hazard.
        /// Values: Submitted | PendingAIAnalysis | AnalysisComplete |
        ///         UnderReview | InProgress | Resolved | Cancelled
        /// Citizen may edit only while status is Submitted or PendingAIAnalysis.
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = HazardStatus.Submitted;

        /// <summary>Set by AI agent. LOW | MEDIUM | HIGH | CRITICAL</summary>
        [MaxLength(20)]
        public string? Severity { get; set; }

        /// <summary>Set by AI agent. LOW | MEDIUM | HIGH | CRITICAL</summary>
        [MaxLength(20)]
        public string? RiskLevel { get; set; }

        /// <summary>Set by AI agent. LOW | NORMAL | HIGH | URGENT</summary>
        [MaxLength(20)]
        public string? Priority { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Soft-delete flag. Set to true instead of physically deleting the record.
        /// Municipal records must be preserved for safety audits and legal compliance.
        /// </summary>
        public bool IsCancelled { get; set; } = false;

        // Navigation
        public ICollection<HazardAIAnalysis> AIAnalyses { get; set; } = new List<HazardAIAnalysis>();
    }

    /// <summary>Valid status values for the Hazard lifecycle.</summary>
    public static class HazardStatus
    {
        public const string Submitted = "Submitted";
        public const string PendingAIAnalysis = "PendingAIAnalysis";
        public const string AnalysisComplete = "AnalysisComplete";
        public const string UnderReview = "UnderReview";
        public const string Approved = "Approved";
        public const string Rejected = "Rejected";
        public const string InProgress = "InProgress";
        public const string Resolved = "Resolved";
        public const string Cancelled = "Cancelled";

        /// <summary>States where a citizen is allowed to edit or cancel their report.</summary>
        public static readonly string[] EditableStates = { Submitted, PendingAIAnalysis, AnalysisComplete, UnderReview };
    }

    /// <summary>Allowed hazard categories across acute disasters and civic infrastructure.</summary>
    public static class HazardCategory
    {
        // Standard categories
        public const string Pothole = "Pothole";
        public const string LargePothole = "Large Pothole";
        public const string WaterLeak = "WaterLeak";
        public const string WaterMainBurst = "Water Main Burst";
        public const string BrokenTrafficSignal = "BrokenTrafficSignal";
        public const string DamagedTrafficSignal = "Damaged Traffic Signal";
        public const string DamagedRoad = "DamagedRoad";
        public const string FallenTree = "FallenTree";
        public const string DrainageProblem = "DrainageProblem";
        public const string DrainageCoverCollapse = "Drainage Cover Collapse";
        public const string StreetLightProblem = "StreetLightProblem";
        public const string BrokenStreetlightPole = "Broken Streetlight Pole";
        public const string CollapsedRetainingWall = "Collapsed Retaining Wall";
        public const string FloodedUnderpass = "Flooded Underpass";
        public const string RoadsideLandslide = "Roadside Landslide";
        public const string FallenUtilityPole = "Fallen Utility Pole";
        public const string OilSpill = "Oil Spill on Roadway";

        // Expanded acute disaster & infrastructure categories
        public const string Sinkhole = "Sinkhole & Ground Subsidence";
        public const string BridgeStructuralDamage = "Bridge Structural Damage";
        public const string SewageOverflow = "Sewage & Wastewater Overflow";
        public const string ExposedHighVoltageCable = "Exposed High-Voltage Cable";
        public const string DamagedGuardrail = "Damaged Highway Guardrail";
        public const string MissingManholeCover = "Missing Manhole Cover";
        public const string HazardousWasteDump = "Hazardous Chemical & Waste Dump";
        public const string PedestrianWalkwayCollapse = "Pedestrian Walkway Collapse";
        public const string GasLeak = "Gas or Combustible Vapour Leak";
        public const string CoastalErosion = "Coastal Erosion & Seawall Breach";
        public const string ElectricalHazard = "Electrical Hazard";
        public const string StructuralDamage = "Structural Damage";
        public const string Other = "Other";

        public static readonly string[] All = {
            Pothole, LargePothole, WaterLeak, WaterMainBurst, BrokenTrafficSignal, DamagedTrafficSignal,
            DamagedRoad, FallenTree, DrainageProblem, DrainageCoverCollapse, StreetLightProblem,
            BrokenStreetlightPole, CollapsedRetainingWall, FloodedUnderpass, RoadsideLandslide,
            FallenUtilityPole, OilSpill, Sinkhole, BridgeStructuralDamage, SewageOverflow,
            ExposedHighVoltageCable, DamagedGuardrail, MissingManholeCover, HazardousWasteDump,
            PedestrianWalkwayCollapse, GasLeak, CoastalErosion, ElectricalHazard, StructuralDamage, Other
        };
    }
}
