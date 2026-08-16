using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Hazards
{
    public class UpdateHazardDto
    {
        public string? Category { get; set; }

        [MinLength(10)]
        [MaxLength(2000)]
        public string? Description { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? ImageUrl { get; set; }
    }
}
