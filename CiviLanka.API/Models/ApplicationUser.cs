using Microsoft.AspNetCore.Identity;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Extended Identity user with citizen-specific fields.
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        /// <summary>Full name of the citizen.</summary>
        public string FullName { get; set; } = string.Empty;

        /// <summary>Phone number (secondary — Identity already has PhoneNumber).</summary>
        public string? ContactPhone { get; set; }

        /// <summary>Role: Citizen | MunicipalStaff | Director</summary>
        public string Role { get; set; } = "Citizen";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Hazard> Hazards { get; set; } = new List<Hazard>();
    }
}
