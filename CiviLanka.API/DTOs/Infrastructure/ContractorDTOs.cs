using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Infrastructure
{
    public class CreateContractorDto
    {
        [Required(ErrorMessage = "Company name is required")]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Specialization is required")]
        [MaxLength(100)]
        public string Specialization { get; set; } = "Roads & Bridges";

        [Required(ErrorMessage = "Location is required")]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone is required")]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [EmailAddress]
        [MaxLength(100)]
        public string? Email { get; set; }
    }

    public class UpdateContractorDto
    {
        [Required(ErrorMessage = "Company name is required")]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Specialization is required")]
        [MaxLength(100)]
        public string Specialization { get; set; } = string.Empty;

        [Required(ErrorMessage = "Location is required")]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone is required")]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [EmailAddress]
        [MaxLength(100)]
        public string? Email { get; set; }

        public double Rating { get; set; }

        public bool IsAvailable { get; set; }
    }

    public class ContractorResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public double Rating { get; set; }
        public bool IsAvailable { get; set; }
        public int JobCount { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<WorkAssignmentResponseDto> Assignments { get; set; } = new();
    }
}

