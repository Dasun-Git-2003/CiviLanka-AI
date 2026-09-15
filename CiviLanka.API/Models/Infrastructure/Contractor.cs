using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models.Infrastructure
{
    /// <summary>
    /// Represents a specialized municipal repair and construction contractor.
    /// </summary>
    public class Contractor
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Specialization { get; set; } = "Civil"; // Roads & Bridges, Electrical, Water & Plumbing, Sanitation, Civil, Telecom

        [Required]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Email { get; set; }

        public double Rating { get; set; } = 5.0;

        public bool IsAvailable { get; set; } = true;

        public int JobCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property for work assignments
        public ICollection<WorkAssignment> Assignments { get; set; } = new List<WorkAssignment>();
    }
}

