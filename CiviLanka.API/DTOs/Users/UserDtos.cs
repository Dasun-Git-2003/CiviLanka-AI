using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Users
{
    public class UserProfileDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ContactPhone { get; set; }
        public string Role { get; set; } = string.Empty;
        public IList<string> Roles { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public bool IsLockedOut { get; set; }

        // Operational Metrics
        public int HazardsReported { get; set; }
        public int AssignedWorkOrders { get; set; }
        public int ExecutedMaintenances { get; set; }
    }

    public class UpdateProfileDto
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Phone]
        [MaxLength(20)]
        public string? ContactPhone { get; set; }
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UserListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ContactPhone { get; set; }
        public string Role { get; set; } = string.Empty;
        public IList<string> Roles { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public bool IsLockedOut { get; set; }
        public int HazardsReported { get; set; }
    }

    public class CreateUserDto
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "Citizen";

        [Phone]
        public string? ContactPhone { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateUserDto
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "Citizen";

        [Phone]
        public string? ContactPhone { get; set; }
    }

    public class ResetPasswordDto
    {
        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
