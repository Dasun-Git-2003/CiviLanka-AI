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
        [Authorize(Policy = "CanReportHazard")]
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
        [Authorize(Policy = "CanManageHazards")]
        [ProducesResponseType(typeof(List<HazardResponseDto>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetAllHazards()
        {
            var hazards = await _service.GetAllHazardsAsync();
            return Ok(hazards);
        }

        /// <summary>
        /// Get all active hazards with coordinates for the GIS map.
        /// Open to all authenticated users (Citizens, Field Workers, Supervisors, Directors).
        /// </summary>
        [HttpGet("map")]
        [Authorize]
        [ProducesResponseType(typeof(List<HazardResponseDto>), 200)]
        public async Task<IActionResult> GetMapHazards()
        {
            var hazards = await _service.GetAllHazardsAsync();
            var mapHazards = hazards
                .Where(h => h.Latitude.HasValue && h.Longitude.HasValue && !h.IsCancelled)
                .ToList();
            return Ok(mapHazards);
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
        /// Cancel or delete a hazard report.
        /// By default (permanent=false), soft-cancels setting IsCancelled to true and status to Cancelled.
        /// If permanent=true, physically removes the report and associated AI triage records.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> CancelHazard(Guid id, [FromQuery] bool permanent = false)
        {
            var citizenId = GetUserId();
            if (citizenId == null) return Unauthorized();

            var success = await _service.CancelHazardAsync(id, citizenId, permanent);
            if (!success)
                return StatusCode(403, new { message = "Cannot delete or cancel this hazard. It may not exist, belong to you, or may already be under active field repair." });

            return Ok(new {
                message = permanent ? "Hazard report has been permanently deleted." : "Hazard report has been cancelled.",
                permanent
            });
        }

        // ── AI ANALYSIS ──────────────────────────────────────────────────────────

        /// <summary>
        /// Manually trigger the AI hazard classification agent for a specific hazard.
        /// Useful for re-analysis or when automatic trigger failed.
        /// </summary>
        [HttpPost("{id:guid}/analyze")]
        [Authorize(Policy = "CanManageHazards")]
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

        /// <summary>
        /// Review (Approve or Reject) a citizen hazard report (Staff / Supervisors / Directors only).
        /// </summary>
        [HttpPost("{id:guid}/review")]
        [Authorize(Policy = "CanManageHazards")]
        [ProducesResponseType(typeof(HazardResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> ReviewHazard(Guid id, [FromBody] ReviewHazardDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var reviewerName = User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.Identity?.Name
                ?? "MunicipalOfficial";

            var result = await _service.ReviewHazardAsync(id, dto, reviewerName);
            if (result == null)
                return NotFound(new { message = "Hazard report not found or already cancelled." });

            _logger.LogInformation("Hazard {Ticket} reviewed ({Action}) by {User}", result.TicketNumber, dto.Action, reviewerName);
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

        /// <summary>
        /// Upload multiple images for a hazard report.
        /// Returns an array of URLs and a joined string suitable for ImageUrl.
        /// </summary>
        [HttpPost("upload-images")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> UploadImages(List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "No files uploaded." });

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
            var uploadedUrls = new List<string>();

            var uploadsPath = Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsPath);

            foreach (var file in files)
            {
                if (file == null || file.Length == 0) continue;
                if (!allowedTypes.Contains(file.ContentType.ToLower()))
                    continue;
                if (file.Length > 10 * 1024 * 1024)
                    continue;

                var ext = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadsPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                    await file.CopyToAsync(stream);

                uploadedUrls.Add($"/uploads/{fileName}");
            }

            if (uploadedUrls.Count == 0)
                return BadRequest(new { message = "No valid images could be processed. Allowed types: JPEG, PNG, WebP, GIF under 10MB." });

            return Ok(new
            {
                imageUrls = uploadedUrls,
                imageUrl = string.Join(",", uploadedUrls),
                message = $"{uploadedUrls.Count} image(s) uploaded successfully."
            });
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
