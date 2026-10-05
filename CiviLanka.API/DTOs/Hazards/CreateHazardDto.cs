using System.ComponentModel.DataAnnotations;
using CiviLanka.API.Models;

namespace CiviLanka.API.DTOs.Hazards
{
    public class CreateHazardDto
    {
        [Required]
        public string Category { get; set; } = string.Empty;

        [Required]
        [MinLength(10)]
        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        // Image is handled separately as a multipart upload; URL stored after upload
        public string? ImageUrl { get; set; }

        public static string NormalizeCategory(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return HazardCategory.Other;
            var clean = raw.Replace(" ", "").Replace("_", "").Replace("-", "").ToLowerInvariant();

            // Acute disasters & specialized infrastructure
            if (clean.Contains("oil") || clean.Contains("spill") || clean.Contains("diesel")) return HazardCategory.OilSpill;
            if (clean.Contains("gasleak") || clean.Contains("gasvapour") || clean.Contains("lpg")) return HazardCategory.GasLeak;
            if (clean.Contains("sinkhole") || clean.Contains("subsidence") || clean.Contains("groundcavity")) return HazardCategory.Sinkhole;
            if (clean.Contains("landslide") || clean.Contains("slopecollapse") || clean.Contains("embankment")) return HazardCategory.RoadsideLandslide;
            if (clean.Contains("retainingwall")) return HazardCategory.CollapsedRetainingWall;
            if (clean.Contains("underpass")) return HazardCategory.FloodedUnderpass;
            if (clean.Contains("coastal") || clean.Contains("seawall") || clean.Contains("revetment")) return HazardCategory.CoastalErosion;
            if (clean.Contains("sewage") || clean.Contains("wastewater") || clean.Contains("blackwater")) return HazardCategory.SewageOverflow;
            if (clean.Contains("chemical") || clean.Contains("hazardwaste") || clean.Contains("toxicdump")) return HazardCategory.HazardousWasteDump;
            if (clean.Contains("guardrail") || clean.Contains("crashbarrier") || clean.Contains("parapet")) return HazardCategory.DamagedGuardrail;
            if (clean.Contains("missingmanhole") || (clean.Contains("manhole") && (clean.Contains("missing") || clean.Contains("open")))) return HazardCategory.MissingManholeCover;
            if (clean.Contains("walkway") || clean.Contains("footpath") || clean.Contains("pedestrianpavement")) return HazardCategory.PedestrianWalkwayCollapse;
            if (clean.Contains("bridge") || clean.Contains("flyover") || clean.Contains("expansionjoint")) return HazardCategory.BridgeStructuralDamage;

            // Utilities & signals
            if (clean.Contains("utilitypole") || (clean.Contains("pole") && clean.Contains("telecom"))) return HazardCategory.FallenUtilityPole;
            if (clean.Contains("highvoltage") || clean.Contains("livewire") || clean.Contains("snappedwire")) return HazardCategory.ExposedHighVoltageCable;
            if (clean.Contains("trafficsignal") || (clean.Contains("traffic") && clean.Contains("signal"))) return HazardCategory.DamagedTrafficSignal;
            if (clean.Contains("streetlight") || (clean.Contains("street") && clean.Contains("light"))) return HazardCategory.BrokenStreetlightPole;

            // Drainage & Flooding (Evaluated before water leaks to prevent false matches)
            if (clean.Contains("drainagecover") || (clean.Contains("drain") && clean.Contains("cover"))) return HazardCategory.DrainageCoverCollapse;
            if (clean.Contains("drain") || clean.Contains("culvert") || clean.Contains("stormwater") || clean.Contains("silt") || clean.Contains("runoff")) return HazardCategory.DrainageProblem;

            // Potable Water distribution
            if (clean.Contains("watermain") || clean.Contains("mainburst") || clean.Contains("pipeburst")) return HazardCategory.WaterMainBurst;
            if (clean.Contains("waterpipe") || clean.Contains("waterleak") || clean.Contains("nwsdb")) return HazardCategory.WaterLeak;

            // Trees, Potholes & Roads
            if (clean.Contains("tree") || clean.Contains("branch")) return HazardCategory.FallenTree;
            if (clean.Contains("largepothole") || (clean.Contains("pothole") && (clean.Contains("large") || clean.Contains("deep")))) return HazardCategory.LargePothole;
            if (clean.Contains("pothole")) return HazardCategory.Pothole;
            if (clean.Contains("road") || clean.Contains("pavement") || clean.Contains("asphalt")) return HazardCategory.DamagedRoad;
            if (clean.Contains("electric")) return HazardCategory.ElectricalHazard;
            if (clean.Contains("structural")) return HazardCategory.StructuralDamage;

            return HazardCategory.Other;
        }

        /// <summary>Validates that the category is one of the allowed values.</summary>
        public bool IsCategoryValid()
        {
            Category = NormalizeCategory(Category);
            return HazardCategory.All.Contains(Category);
        }
    }
}
