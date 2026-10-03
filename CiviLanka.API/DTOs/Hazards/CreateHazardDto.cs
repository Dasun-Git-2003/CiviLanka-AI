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
            if (clean.Contains("pothole")) return HazardCategory.Pothole;
            if (clean.Contains("water") || clean.Contains("pipe") || clean.Contains("leak")) return HazardCategory.WaterLeak;
            if (clean.Contains("traffic") || clean.Contains("signal")) return HazardCategory.BrokenTrafficSignal;
            if (clean.Contains("road") || clean.Contains("pavement") || clean.Contains("asphalt")) return HazardCategory.DamagedRoad;
            if (clean.Contains("tree") || clean.Contains("branch")) return HazardCategory.FallenTree;
            if (clean.Contains("drain") || clean.Contains("flood") || clean.Contains("sewer")) return HazardCategory.DrainageProblem;
            if (clean.Contains("light") || clean.Contains("electric") || clean.Contains("lamp") || clean.Contains("pole")) return HazardCategory.StreetLightProblem;
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
