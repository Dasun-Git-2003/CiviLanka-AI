using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.Models.Infrastructure
{
    /// <summary>
    /// Represents a municipal infrastructure asset (pipes, bridges, streetlights, roads, etc.)
    /// Maintained by Member 2 - Infrastructure & Asset Registry.
    /// </summary>
    public class InfrastructureAsset
    {
        [Key]
        [MaxLength(20)]
        public string Id { get; set; } = string.Empty; // e.g. AST-001

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "Water"; // Water, Electrical, Civil, Roads & Bridges, Sanitation, Telecom

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Active"; // Active, Inactive, Decommissioned, Under Construction

        [Required]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        public DateTime? InstallationDate { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation property for all condition inspections
        public ICollection<AssetInspection> Inspections { get; set; } = new List<AssetInspection>();

        // Navigation property for work assignments / repairs on this asset
        public ICollection<WorkAssignment> WorkAssignments { get; set; } = new List<WorkAssignment>();
    }
}

