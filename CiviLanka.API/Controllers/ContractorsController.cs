using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Infrastructure;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    /// <summary>
    /// Member 2: Contractor directory and management CRUD operations.
    /// Manages municipal repair contractors, specializations, ratings, and availability status.
    /// </summary>
    [ApiController]
    [Route("api/contractors")]
    [Produces("application/json")]
    public class ContractorsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ContractorsController> _logger;

        public ContractorsController(AppDbContext context, ILogger<ContractorsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all contractors with optional filters for specialization, availability, or location search.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<ContractorResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetContractors(
            [FromQuery] string? specialization,
            [FromQuery] bool? available,
            [FromQuery] string? search)
        {
            var query = _context.Contractors
                .Include(c => c.Assignments)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(specialization))
            {
                query = query.Where(c => c.Specialization.ToLower() == specialization.Trim().ToLower());
            }

            if (available.HasValue)
            {
                query = query.Where(c => c.IsAvailable == available.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(s) ||
                    c.Location.ToLower().Contains(s) ||
                    c.Specialization.ToLower().Contains(s));
            }

            var contractors = await query
                .OrderBy(c => c.Name)
                .ToListAsync();

            var response = contractors.Select(MapToResponseDto).ToList();
            return Ok(response);
        }

        /// <summary>
        /// Get a contractor by ID with their complete assignment and repair history.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ContractorResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetContractorById(int id)
        {
            var contractor = await _context.Contractors
                .Include(c => c.Assignments)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contractor == null)
                return NotFound(new { message = $"Contractor #{id} not found." });

            return Ok(MapToResponseDto(contractor));
        }

        /// <summary>
        /// Register a new contractor in the municipal registry.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ContractorResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateContractor([FromBody] CreateContractorDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var contractor = new Contractor
            {
                Name = dto.Name.Trim(),
                Specialization = dto.Specialization.Trim(),
                Location = dto.Location.Trim(),
                Phone = dto.Phone.Trim(),
                Email = dto.Email?.Trim(),
                Rating = 5.0,
                IsAvailable = true,
                JobCount = 0,
                CreatedAt = DateTime.UtcNow
            };

            _context.Contractors.Add(contractor);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Contractor registered: #{Id} - {Name}", contractor.Id, contractor.Name);

            return CreatedAtAction(nameof(GetContractorById), new { id = contractor.Id }, MapToResponseDto(contractor));
        }

        /// <summary>
        /// Update contractor details, rating, or availability status.
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ContractorResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateContractor(int id, [FromBody] UpdateContractorDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var contractor = await _context.Contractors
                .Include(c => c.Assignments)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contractor == null)
                return NotFound(new { message = $"Contractor #{id} not found." });

            contractor.Name = dto.Name.Trim();
            contractor.Specialization = dto.Specialization.Trim();
            contractor.Location = dto.Location.Trim();
            contractor.Phone = dto.Phone.Trim();
            contractor.Email = dto.Email?.Trim();
            contractor.Rating = Math.Clamp(dto.Rating, 0, 5);
            contractor.IsAvailable = dto.IsAvailable;

            await _context.SaveChangesAsync();

            return Ok(MapToResponseDto(contractor));
        }

        /// <summary>
        /// Delete a contractor from the registry.
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteContractor(int id)
        {
            var contractor = await _context.Contractors.FindAsync(id);
            if (contractor == null)
                return NotFound(new { message = $"Contractor #{id} not found." });

            _context.Contractors.Remove(contractor);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ── Helper ─────────────────────────────────────────────────────────────
        private static ContractorResponseDto MapToResponseDto(Contractor c)
        {
            return new ContractorResponseDto
            {
                Id = c.Id,
                Name = c.Name,
                Specialization = c.Specialization,
                Location = c.Location,
                Phone = c.Phone,
                Email = c.Email,
                Rating = c.Rating,
                IsAvailable = c.IsAvailable,
                JobCount = c.JobCount,
                CreatedAt = c.CreatedAt,
                Assignments = c.Assignments?
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(a => new WorkAssignmentResponseDto
                    {
                        Id = a.Id,
                        ContractorId = a.ContractorId,
                        ContractorName = c.Name,
                        AssetId = a.AssetId,
                        AssetName = a.AssetName,
                        AssetType = a.AssetType,
                        Priority = a.Priority,
                        DueDate = a.DueDate,
                        Notes = a.Notes,
                        Status = a.Status,
                        EstimatedCost = a.EstimatedCost,
                        ActualCost = a.ActualCost,
                        CreatedAt = a.CreatedAt,
                        CompletedAt = a.CompletedAt
                    }).ToList() ?? new List<WorkAssignmentResponseDto>()
            };
        }
    }
}

