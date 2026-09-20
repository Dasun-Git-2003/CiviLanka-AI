using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Users;
using CiviLanka.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Produces("application/json")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly AppDbContext _db;
        private readonly ILogger<UserController> _logger;

        public UserController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            AppDbContext db,
            ILogger<UserController> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _db = db;
            _logger = logger;
        }

        private string UserId =>
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.Identity?.Name
            ?? "system";

        // ── 1. GET CURRENT USER PROFILE ────────────────────────────────────────
        [HttpGet("me")]
        [ProducesResponseType(typeof(UserProfileDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCurrentUserProfile()
        {
            var user = await _userManager.FindByIdAsync(UserId);
            if (user == null)
            {
                // Fallback by email / username if ID wasn't matching
                var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(email))
                    user = await _userManager.FindByEmailAsync(email);
            }

            if (user == null)
                return NotFound(new { message = "User profile not found." });

            var roles = await _userManager.GetRolesAsync(user);

            // Compute operational metrics
            var hazardsCount = await _db.Hazards.CountAsync(h => h.CitizenId == user.Id);
            var workOrdersCount = await _db.WorkOrders.CountAsync(w => w.CreatedBy == user.Id || w.CreatedBy == user.Email || w.CreatedBy == user.UserName);
            var maintenanceCount = await _db.MaintenanceRecords.CountAsync(m => m.PerformedBy == user.Email || m.PerformedBy == user.FullName);

            var isLocked = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? "",
                ContactPhone = user.ContactPhone ?? user.PhoneNumber,
                Role = user.Role,
                Roles = roles,
                CreatedAt = user.CreatedAt,
                IsLockedOut = isLocked,
                HazardsReported = hazardsCount,
                AssignedWorkOrders = workOrdersCount,
                ExecutedMaintenances = maintenanceCount,
            });
        }

        // ── 2. UPDATE CURRENT USER PROFILE ────────────────────────────────────
        [HttpPut("me")]
        [ProducesResponseType(typeof(UserProfileDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateCurrentUserProfile([FromBody] UpdateProfileDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _userManager.FindByIdAsync(UserId);
            if (user == null)
            {
                var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(email))
                    user = await _userManager.FindByEmailAsync(email);
            }

            if (user == null) return NotFound(new { message = "User not found." });

            user.FullName = dto.FullName.Trim();
            user.ContactPhone = dto.ContactPhone?.Trim();
            user.PhoneNumber = dto.ContactPhone?.Trim();

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "Failed to update profile.", errors });
            }

            return await GetCurrentUserProfile();
        }

        // ── 3. CHANGE PASSWORD ────────────────────────────────────────────────
        [HttpPost("me/change-password")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _userManager.FindByIdAsync(UserId);
            if (user == null)
            {
                var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(email))
                    user = await _userManager.FindByEmailAsync(email);
            }

            if (user == null) return NotFound(new { message = "User not found." });

            var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "Password change failed.", errors });
            }

            _logger.LogInformation("Password changed successfully for user {Email}", user.Email);
            return Ok(new { message = "Password changed successfully." });
        }

        // ── 4. GET ALL USERS (MANAGEMENT CONSOLE) ──────────────────────────────
        [HttpGet]
        [Authorize(Policy = "CanManageUsers")]
        [ProducesResponseType(typeof(List<UserListItemDto>), 200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetAllUsers([FromQuery] string? search, [FromQuery] string? role)
        {
            var query = _userManager.Users.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u =>
                    u.FullName.ToLower().Contains(s) ||
                    (u.Email != null && u.Email.ToLower().Contains(s)) ||
                    (u.ContactPhone != null && u.ContactPhone.Contains(s)) ||
                    u.Role.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                var r = role.Trim();
                query = query.Where(u => u.Role == r);
            }

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Take(200)
                .ToListAsync();

            var list = users.Select(u => new UserListItemDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email ?? "",
                ContactPhone = u.ContactPhone ?? u.PhoneNumber,
                Role = u.Role,
                Roles = new List<string> { u.Role },
                CreatedAt = u.CreatedAt,
                IsLockedOut = u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow,
                HazardsReported = 0,
            }).ToList();

            return Ok(list);
        }

        // ── 5. GET USER BY ID ─────────────────────────────────────────────────
        [HttpGet("{id}")]
        [Authorize(Policy = "CanManageUsers")]
        [ProducesResponseType(typeof(UserProfileDto), 200)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetUserById(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            var roles = await _userManager.GetRolesAsync(user);
            var hazardsCount = await _db.Hazards.CountAsync(h => h.CitizenId == user.Id);
            var workOrdersCount = await _db.WorkOrders.CountAsync(w => w.CreatedBy == user.Id || w.CreatedBy == user.Email || w.CreatedBy == user.UserName);
            var maintenanceCount = await _db.MaintenanceRecords.CountAsync(m => m.PerformedBy == user.Email || m.PerformedBy == user.FullName);
            var isLocked = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? "",
                ContactPhone = user.ContactPhone ?? user.PhoneNumber,
                Role = user.Role,
                Roles = roles,
                CreatedAt = user.CreatedAt,
                IsLockedOut = isLocked,
                HazardsReported = hazardsCount,
                AssignedWorkOrders = workOrdersCount,
                ExecutedMaintenances = maintenanceCount,
            });
        }

        // ── 6. CREATE USER (ADMINISTRATIVE) ───────────────────────────────────
        [HttpPost]
        [Authorize(Policy = "CanManageUsers")]
        [ProducesResponseType(typeof(UserListItemDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _userManager.FindByEmailAsync(dto.Email);
            if (existing != null)
                return BadRequest(new { message = "A user with this email address already exists." });

            var validRoles = new[] { "Citizen", "MunicipalStaff", "Director", "PublicWorksDirector", "FieldMaintenanceSupervisor", "FieldWorker" };
            var roleToAssign = validRoles.Contains(dto.Role) ? dto.Role : "Citizen";

            // Ensure role exists in RoleManager
            if (!await _roleManager.RoleExistsAsync(roleToAssign))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleToAssign));
            }

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                FullName = dto.FullName.Trim(),
                ContactPhone = dto.ContactPhone?.Trim(),
                PhoneNumber = dto.ContactPhone?.Trim(),
                Role = roleToAssign,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "User creation failed.", errors });
            }

            await _userManager.AddToRoleAsync(user, roleToAssign);

            _logger.LogInformation("Administrator created user {Email} with role {Role}", dto.Email, roleToAssign);

            return StatusCode(201, new UserListItemDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                ContactPhone = user.ContactPhone,
                Role = user.Role,
                Roles = new List<string> { roleToAssign },
                CreatedAt = user.CreatedAt,
                IsLockedOut = false,
                HazardsReported = 0,
            });
        }

        // ── 7. UPDATE USER (ADMINISTRATIVE) ───────────────────────────────────
        [HttpPut("{id}")]
        [Authorize(Policy = "CanManageUsers")]
        [ProducesResponseType(typeof(UserListItemDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            if (user.Id == UserId && (dto.Role == "Director" || dto.Role == "PublicWorksDirector") && !User.IsInRole("PublicWorksDirector") && !User.IsInRole("Director"))
            {
                return BadRequest(new { message = "Users cannot assign themselves the Director role." });
            }

            user.FullName = dto.FullName.Trim();
            user.ContactPhone = dto.ContactPhone?.Trim();
            user.PhoneNumber = dto.ContactPhone?.Trim();

            var validRoles = new[] { "Citizen", "MunicipalStaff", "Director", "PublicWorksDirector", "FieldMaintenanceSupervisor", "FieldWorker" };
            if (validRoles.Contains(dto.Role) && user.Role != dto.Role)
            {
                var oldRole = user.Role;
                user.Role = dto.Role;

                if (await _userManager.IsInRoleAsync(user, oldRole))
                    await _userManager.RemoveFromRoleAsync(user, oldRole);

                if (!await _roleManager.RoleExistsAsync(dto.Role))
                    await _roleManager.CreateAsync(new IdentityRole(dto.Role));

                await _userManager.AddToRoleAsync(user, dto.Role);
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "Failed to update user.", errors });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var isLocked = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

            return Ok(new UserListItemDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? "",
                ContactPhone = user.ContactPhone,
                Role = user.Role,
                Roles = roles,
                CreatedAt = user.CreatedAt,
                IsLockedOut = isLocked,
                HazardsReported = 0,
            });
        }

        // ── 8. TOGGLE ACCOUNT LOCKOUT ──────────────────────────────────────────
        [HttpPost("{id}/toggle-lock")]
        [Authorize(Roles = "Director,PublicWorksDirector")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ToggleAccountLock(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            bool currentlyLocked = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;
            if (currentlyLocked)
            {
                await _userManager.SetLockoutEndDateAsync(user, null);
                _logger.LogInformation("Account unlocked: {Email}", user.Email);
                return Ok(new { message = "Account successfully unlocked.", isLockedOut = false });
            }
            else
            {
                await _userManager.SetLockoutEnabledAsync(user, true);
                await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
                _logger.LogInformation("Account locked: {Email}", user.Email);
                return Ok(new { message = "Account successfully locked out.", isLockedOut = true });
            }
        }

        // ── 9. ADMIN RESET PASSWORD ───────────────────────────────────────────
        [HttpPost("{id}/reset-password")]
        [Authorize(Roles = "Director,PublicWorksDirector")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ResetUserPassword(string id, [FromBody] ResetPasswordDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "Password reset failed.", errors });
            }

            _logger.LogInformation("Admin reset password for user {Email}", user.Email);
            return Ok(new { message = $"Password reset successfully for {user.Email}." });
        }

        // ── 10. DELETE USER ───────────────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "Director,PublicWorksDirector")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            if (user.Id == UserId)
                return BadRequest(new { message = "You cannot delete your own account." });

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "Failed to delete user.", errors });
            }

            _logger.LogInformation("User deleted: {Email}", user.Email);
            return NoContent();
        }
    }
}
