using CiviLanka.API.DTOs.Hazards;
using CiviLanka.API.Models;
using CiviLanka.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CiviLanka.API.Controllers
{
    /// <summary>
    /// CRUD operations for hazard reports plus AI analysis endpoints.
    /// Member 2 (Infrastructure), Member 3 (Work Orders) and Member 4 (Maintenance)
    /// should use GET /api/hazards and GET /api/hazards/{id} with a Staff JWT.
    /// </summary>
    [ApiController]
    [Route("api/hazards")]
    [Authorize]
    [Produces("application/json")]
    public class HazardController : ControllerBase
    {
        private readonly IHazardService _service;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<HazardController> _logger;

        public HazardController(
            IHazardService service,
            IWebHostEnvironment env,
            ILogger<HazardController> logger)
        {
            _service = service;
            _env = env;
            _logger = logger;
        }

        // ── CREATE ───────────────────────────────────────────────────────────────

        /// <summary>
        /// Submit a new infrastructure hazard report.
        /// The AI classification agent runs automatically after creation.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(HazardResponseDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> CreateHazard([FromBody] CreateHazardDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (!dto.IsCategoryValid())
                return BadRequest(new { message = $"Invalid category. Valid values: {string.Join(", ", HazardCategory.All)}" });

            var citizenId = GetUserId();
            if (citizenId == null) return Unauthorized();

            var hazard = await _service.CreateHazardAsync(citizenId, dto);
            return StatusCode(201, hazard);
        }

        // ── READ — Citizen's own hazards ─────────────────────────────────────────

        /// <summary>Get all hazards submitted by the currently authenticated citizen.</summary>
        [HttpGet("my")]
        [ProducesResponseType(typeof(List<HazardResponseDto>), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GetMyHazards()
        {
            var citizenId = GetUserId();
            if (citizenId == null) return Unauthorized();

            var hazards = await _service.GetMyCitizenHazardsAsync(citizenId);
            return Ok(hazards);
        }

        /// <summary>
        /// Get a specific hazard by ID.
        /// Citizens can only access their own hazards. Staff can access any.
        /// </summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(HazardResponseDto), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetHazard(Guid id)
        {
            var userId = GetUserId();
            var role = GetUserRole();
            if (userId == null) return Unauthorized();

            var hazard = await _service.GetHazardByIdAsync(id, userId, role);
            if (hazard == null)
            {
                // Return 403 if citizen tries to access another citizen's hazard
                // Return 404 for non-existent / cancelled
                return role == "Citizen"
                    ? StatusCode(403, new { message = "Access denied. You can only view your own hazard reports." })
                    : NotFound(new { message = "Hazard not found." });
            }

            return Ok(hazard);
        }

        // ── READ — All hazards (Staff/Other Members) ─────────────────────────────

        /// <summary>
        /// Get all active hazards. Intended for municipal staff and
        /// Members 2, 3, 4 to consume hazard data.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "MunicipalStaff,Director")]
        [ProducesResponseType(typeof(List<HazardResponseDto>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetAllHazards()
        {
            var hazards = await _service.GetAllHazardsAsync();
            return Ok(hazards);
        }

        // ── UPDATE ───────────────────────────────────────────────────────────────

        /// <summary>
        /// Update a hazard report. Only the owning citizen may update,
        /// and only while the hazard is in an editable state (Submitted or PendingAIAnalysis).
        /// </summary>
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(HazardResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateHazard(Guid id, [FromBody] UpdateHazardDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var citizenId = GetUserId();
            if (citizenId == null) return Unauthorized();

            var updated = await _service.UpdateHazardAsync(id, citizenId, dto);
            if (updated == null)
                return StatusCode(403, new { message = "Cannot update this hazard. It may not exist, belong to you, or may already be under municipal review." });

            return Ok(updated);
        }

        // ── DELETE (Soft Cancel) ─────────────────────────────────────────────────

        /// <summary>
        /// Cancel (soft-delete) a hazard report.
        /// Municipal records are never physically deleted for audit and legal compliance.
        /// IsCancelled is set to true and status is set to Cancelled.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> CancelHazard(Guid id)
        {
            var citizenId = GetUserId();
            if (citizenId == null) return Unauthorized();

            var success = await _service.CancelHazardAsync(id, citizenId);
            if (!success)
                return StatusCode(403, new { message = "Cannot cancel this hazard. It may not exist, belong to you, or may already be under municipal review." });

            return Ok(new { message = "Hazard has been cancelled.", note = "Record is preserved for municipal audit compliance." });
        }

        // ── AI ANALYSIS ──────────────────────────────────────────────────────────

        /// <summary>
        /// Manually trigger the AI hazard classification agent for a specific hazard.
        /// Useful for re-analysis or when automatic trigger failed.
        /// </summary>
        [HttpPost("{id:guid}/analyze")]
        [Authorize(Roles = "MunicipalStaff,Director")]
        [ProducesResponseType(typeof(HazardAIAnalysisResponseDto), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> TriggerAnalysis(Guid id)
        {
            var result = await _service.TriggerAnalysisAsync(id);
            if (result == null)
                return NotFound(new { message = "Hazard not found or analysis failed." });

            return Ok(result);
        }

        /// <summary>
        /// Get the latest AI classification result for a hazard.
        /// Available to the owning citizen and all staff.
        /// </summary>
        [HttpGet("{id:guid}/ai-analysis")]
        [ProducesResponseType(typeof(HazardAIAnalysisResponseDto), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetAIAnalysis(Guid id)
        {
            var result = await _service.GetLatestAnalysisAsync(id);
            if (result == null)
                return NotFound(new { message = "No AI analysis found for this hazard yet." });

            return Ok(result);
        }

        // ── IMAGE UPLOAD ─────────────────────────────────────────────────────────

        /// <summary>
        /// Upload an image for a hazard report.
        /// Returns the URL that should then be sent when creating/updating a hazard.
        /// </summary>
        [HttpPost("upload-image")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
            if (!allowedTypes.Contains(file.ContentType.ToLower()))
                return BadRequest(new { message = "Only JPEG, PNG, WebP and GIF images are allowed." });

            if (file.Length > 10 * 1024 * 1024)
                return BadRequest(new { message = "Image must be under 10 MB." });

            var uploadsPath = Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsPath);

            var ext = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var imageUrl = $"/uploads/{fileName}";
            return Ok(new { imageUrl, message = "Image uploaded successfully." });
        }

        // ── Helpers ──────────────────────────────────────────────────────────────

        private string? GetUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        private string GetUserRole() =>
            User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? "Citizen";
    }
}
