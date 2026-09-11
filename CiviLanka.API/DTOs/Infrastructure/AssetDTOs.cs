using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Infrastructure
{
    public class CreateAssetDto
    {
        [MaxLength(20)]
        public string? Id { get; set; } // Optional: if omitted, auto-generated AST-xxx

        [Required(ErrorMessage = "Asset name is required")]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Asset type is required")]
        public string Type { get; set; } = "Water";

        public string Status { get; set; } = "Active";

        [Required(ErrorMessage = "Location is required")]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        public DateTime? InstallationDate { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }
    }

    public class UpdateAssetDto
    {
        [Required(ErrorMessage = "Asset name is required")]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Asset type is required")]
        public string Type { get; set; } = "Water";

        public string Status { get; set; } = "Active";

        [Required(ErrorMessage = "Location is required")]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        public DateTime? InstallationDate { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }
    }

    public class AssetResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime? InstallationDate { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Computed condition from latest inspection
        public string? LatestCondition { get; set; }
        public DateTime? LastInspectedDate { get; set; }
        public int InspectionCount { get; set; }

        public List<InspectionResponseDto> Inspections { get; set; } = new();
    }
}

