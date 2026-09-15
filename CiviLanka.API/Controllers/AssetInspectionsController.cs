using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Infrastructure;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    /// <summary>
    /// Member 2: Condition inspection recording and history management.
    /// Manages the Good / Moderate / Poor / Critical condition assessment lifecycle.
    /// </summary>
    [ApiController]
    [Route("api")]
    [Produces("application/json")]
    public class AssetInspectionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AssetInspectionsController> _logger;

        public AssetInspectionsController(AppDbContext context, ILogger<AssetInspectionsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all inspection records for a specific asset.
        /// </summary>
        [HttpGet("assets/{assetId}/inspections")]
        [ProducesResponseType(typeof(List<InspectionResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetInspectionsForAsset(string assetId)
        {
            var asset = await _context.InfrastructureAssets
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == assetId);

            if (asset == null)
                return NotFound(new { message = $"Asset '{assetId}' not found." });

            var inspections = await _context.AssetInspections
                .Where(i => i.AssetId == assetId)
                .OrderByDescending(i => i.InspectionDate)
                .AsNoTracking()
                .Select(i => new InspectionResponseDto
                {
                    Id = i.Id,
                    AssetId = i.AssetId,
                    AssetName = asset.Name,
                    InspectionDate = i.InspectionDate,
                    Condition = i.Condition,
                    IssuesFound = i.IssuesFound,
                    Notes = i.Notes,
                    InspectorName = i.InspectorName,
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();

            return Ok(inspections);
        }

        /// <summary>
        /// Record a new inspection for an asset (Good / Moderate / Poor / Critical).
        /// </summary>
        [HttpPost("assets/{assetId}/inspections")]
        [ProducesResponseType(typeof(InspectionResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RecordInspection(string assetId, [FromBody] CreateInspectionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var asset = await _context.InfrastructureAssets.FirstOrDefaultAsync(a => a.Id == assetId);
            if (asset == null)
                return NotFound(new { message = $"Asset '{assetId}' not found." });

            var inspection = new AssetInspection
            {
                AssetId = assetId,
                InspectionDate = dto.InspectionDate,
                Condition = dto.Condition,
                IssuesFound = dto.IssuesFound?.Trim(),
                Notes = dto.Notes?.Trim(),
                InspectorName = dto.InspectorName?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.AssetInspections.Add(inspection);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Recorded {Condition} inspection for asset {AssetId}", inspection.Condition, assetId);

            var response = new InspectionResponseDto
            {
                Id = inspection.Id,
                AssetId = inspection.AssetId,
                AssetName = asset.Name,
                InspectionDate = inspection.InspectionDate,
                Condition = inspection.Condition,
                IssuesFound = inspection.IssuesFound,
                Notes = inspection.Notes,
                InspectorName = inspection.InspectorName,
                CreatedAt = inspection.CreatedAt
            };

            return StatusCode(StatusCodes.Status201Created, response);
        }

        /// <summary>
        /// Get recent inspections across all municipal infrastructure assets.
        /// </summary>
        [HttpGet("inspections/recent")]
        [ProducesResponseType(typeof(List<InspectionResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRecentInspections([FromQuery] int limit = 20)
        {
            limit = Math.Clamp(limit, 1, 100);

            var inspections = await _context.AssetInspections
                .Include(i => i.Asset)
                .OrderByDescending(i => i.InspectionDate)
                .Take(limit)
                .AsNoTracking()
                .Select(i => new InspectionResponseDto
                {
                    Id = i.Id,
                    AssetId = i.AssetId,
                    AssetName = i.Asset != null ? i.Asset.Name : null,
                    InspectionDate = i.InspectionDate,
                    Condition = i.Condition,
                    IssuesFound = i.IssuesFound,
                    Notes = i.Notes,
                    InspectorName = i.InspectorName,
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();

            return Ok(inspections);
        }

        /// <summary>
        /// Delete an inspection record.
        /// </summary>
        [HttpDelete("inspections/{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteInspection(int id)
        {
            var inspection = await _context.AssetInspections.FindAsync(id);
            if (inspection == null)
                return NotFound(new { message = $"Inspection #{id} not found." });

            _context.AssetInspections.Remove(inspection);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

