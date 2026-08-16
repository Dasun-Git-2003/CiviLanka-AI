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

        /// <summary>Validates that the category is one of the allowed values.</summary>
        public bool IsCategoryValid() =>
            HazardCategory.All.Contains(Category);
    }
}
