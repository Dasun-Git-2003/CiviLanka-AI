using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Infrastructure;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    /// <summary>
    /// Member 2: Infrastructure & Asset Registry CRUD operations.
    /// Manages municipal assets, location GIS data, installation records, and condition status.
    /// </summary>
    [ApiController]
    [Route("api/assets")]
    [Produces("application/json")]
    public class AssetsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AssetsController> _logger;

        public AssetsController(AppDbContext context, ILogger<AssetsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all infrastructure assets with optional filtering by search term, type, status, or condition.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<AssetResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAssets(
            [FromQuery] string? search,
            [FromQuery] string? type,
            [FromQuery] string? status,
            [FromQuery] string? condition)
        {
            var query = _context.InfrastructureAssets
                .Include(a => a.Inspections)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(a =>
                    a.Name.ToLower().Contains(s) ||
                    a.Id.ToLower().Contains(s) ||
                    a.Location.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(a => a.Type.ToLower() == type.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(a => a.Status.ToLower() == status.Trim().ToLower());
            }

            var assets = await query
                .OrderBy(a => a.Id)
                .ToListAsync();

            var response = assets.Select(MapToResponseDto).ToList();

            if (!string.IsNullOrWhiteSpace(condition))
            {
                var c = condition.Trim().ToLower();
                response = response.Where(a => a.LatestCondition?.ToLower() == c).ToList();
            }

            return Ok(response);
        }

        /// <summary>
        /// Get an infrastructure asset by ID, including its full inspection history.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(AssetResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAssetById(string id)
        {
            var asset = await _context.InfrastructureAssets
                .Include(a => a.Inspections)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (asset == null)
                return NotFound(new { message = $"Asset '{id}' not found." });

            return Ok(MapToResponseDto(asset));
        }

        /// <summary>
        /// Register a new infrastructure asset.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(AssetResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateAsset([FromBody] CreateAssetDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            string assetId = dto.Id?.Trim() ?? string.Empty;
            if (string.IsNullOrEmpty(assetId))
            {
                // Auto-generate AST-001, AST-002, etc.
                var count = await _context.InfrastructureAssets.CountAsync();
                assetId = $"AST-{(count + 1):D3}";

                // Ensure unique
                while (await _context.InfrastructureAssets.AnyAsync(a => a.Id == assetId))
                {
                    count++;
                    assetId = $"AST-{(count + 1):D3}";
                }
            }
            else
            {
                if (await _context.InfrastructureAssets.AnyAsync(a => a.Id == assetId))
                    return BadRequest(new { message = $"Asset with ID '{assetId}' already exists." });
            }

            var asset = new InfrastructureAsset
            {
                Id = assetId,
                Name = dto.Name.Trim(),
                Type = dto.Type.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
                Location = dto.Location.Trim(),
                InstallationDate = dto.InstallationDate,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Description = dto.Description?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.InfrastructureAssets.Add(asset);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Asset registered successfully: {AssetId} - {AssetName}", asset.Id, asset.Name);

            return CreatedAtAction(nameof(GetAssetById), new { id = asset.Id }, MapToResponseDto(asset));
        }

        /// <summary>
        /// Update an existing infrastructure asset.
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(AssetResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateAsset(string id, [FromBody] UpdateAssetDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var asset = await _context.InfrastructureAssets
                .Include(a => a.Inspections)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (asset == null)
                return NotFound(new { message = $"Asset '{id}' not found." });

            asset.Name = dto.Name.Trim();
            asset.Type = dto.Type.Trim();
            asset.Status = dto.Status.Trim();
            asset.Location = dto.Location.Trim();
            asset.InstallationDate = dto.InstallationDate;
            asset.Latitude = dto.Latitude;
            asset.Longitude = dto.Longitude;
            asset.Description = dto.Description?.Trim();
            asset.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(MapToResponseDto(asset));
        }

        /// <summary>
        /// Delete an infrastructure asset.
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteAsset(string id)
        {
            var asset = await _context.InfrastructureAssets.FirstOrDefaultAsync(a => a.Id == id);
            if (asset == null)
                return NotFound(new { message = $"Asset '{id}' not found." });

            _context.InfrastructureAssets.Remove(asset);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ── Helper ─────────────────────────────────────────────────────────────
        private static AssetResponseDto MapToResponseDto(InfrastructureAsset asset)
        {
            var sortedInspections = asset.Inspections?
                .OrderByDescending(i => i.InspectionDate)
                .ToList() ?? new List<AssetInspection>();

            var latest = sortedInspections.FirstOrDefault();

            return new AssetResponseDto
            {
                Id = asset.Id,
                Name = asset.Name,
                Type = asset.Type,
                Status = asset.Status,
                Location = asset.Location,
                InstallationDate = asset.InstallationDate,
                Latitude = asset.Latitude,
                Longitude = asset.Longitude,
                Description = asset.Description,
                CreatedAt = asset.CreatedAt,
                UpdatedAt = asset.UpdatedAt,
                LatestCondition = latest?.Condition,
                LastInspectedDate = latest?.InspectionDate,
                InspectionCount = sortedInspections.Count,
                Inspections = sortedInspections.Select(i => new InspectionResponseDto
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
                }).ToList()
            };
        }
    }
}

