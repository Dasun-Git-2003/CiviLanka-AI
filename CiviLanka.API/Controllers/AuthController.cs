using CiviLanka.API.DTOs.Auth;
using CiviLanka.API.Models;
using CiviLanka.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CiviLanka.API.Controllers
{
    /// <summary>Handles citizen registration and authentication.</summary>
    [ApiController]
    [Route("api/auth")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ITokenService _tokenService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ITokenService tokenService,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _logger = logger;
        }

        /// <summary>Register a new citizen account.</summary>
        [HttpPost("register")]
        [ProducesResponseType(typeof(AuthResponseDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existingUser = await _userManager.FindByEmailAsync(dto.Email);
            if (existingUser != null)
                return BadRequest(new { message = "Email already registered." });

            // Public registration strictly assigns the Citizen role.
            // Privileged municipal roles must be provisioned by an authorized Director.
            const string roleToAssign = "Citizen";

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                FullName = dto.FullName,
                ContactPhone = dto.Phone,
                Role = roleToAssign
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return BadRequest(new { message = "Registration failed.", errors });
            }

            await _userManager.AddToRoleAsync(user, roleToAssign);

            var userRoles = await _userManager.GetRolesAsync(user);
            var token = _tokenService.GenerateToken(user, userRoles);
            _logger.LogInformation("New user registered: {Email} with role {Role}", dto.Email, roleToAssign);

            return StatusCode(201, new AuthResponseDto
            {
                Token = token,
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email!,
                Role = user.Role,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            });
        }

        /// <summary>Login with email and password. Returns a JWT token.</summary>
        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponseDto), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
                return Unauthorized(new { message = "Invalid credentials." });

            var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
            if (!result.Succeeded)
                return Unauthorized(new { message = "Invalid credentials." });

            var roles = await _userManager.GetRolesAsync(user);
            var token = _tokenService.GenerateToken(user, roles);
            _logger.LogInformation("User logged in: {Email}", dto.Email);

            return Ok(new AuthResponseDto
            {
                Token = token,
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email!,
                Role = user.Role,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            });
        }

        /// <summary>Get current authenticated user identity and verified roles.</summary>
        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetMe()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("userId")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(email))
                {
                    var u = await _userManager.FindByEmailAsync(email);
                    if (u != null) userId = u.Id;
                }
            }

            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized(new { message = "User record not found." });

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new
            {
                userId = user.Id,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role,
                roles = roles
            });
        }
    }
}
