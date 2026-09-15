using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Infrastructure;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    /// <summary>
    /// Member 2: Work order assignments and municipal repair history tracking.
    /// Dispatches repair jobs to contractors and records completion history.
    /// </summary>
    [ApiController]
    [Route("api/work-assignments")]
    [Produces("application/json")]
    public class WorkAssignmentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<WorkAssignmentsController> _logger;

        public WorkAssignmentsController(AppDbContext context, ILogger<WorkAssignmentsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all work assignments / repair history with optional filtering by status, priority, or contractor.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<WorkAssignmentResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetWorkAssignments(
            [FromQuery] string? status,
            [FromQuery] string? priority,
            [FromQuery] int? contractorId,
            [FromQuery] string? assetId)
        {
            var query = _context.WorkAssignments
                .Include(w => w.Contractor)
                .Include(w => w.Asset)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(w => w.Status.ToLower() == status.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(priority))
            {
                query = query.Where(w => w.Priority.ToLower() == priority.Trim().ToLower());
            }

            if (contractorId.HasValue)
            {
                query = query.Where(w => w.ContractorId == contractorId.Value);
            }

            if (!string.IsNullOrWhiteSpace(assetId))
            {
                query = query.Where(w => w.AssetId == assetId.Trim());
            }

            var assignments = await query
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            var response = assignments.Select(MapToResponseDto).ToList();
            return Ok(response);
        }

        /// <summary>
        /// Get a specific work assignment by ID.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(WorkAssignmentResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAssignmentById(int id)
        {
            var assignment = await _context.WorkAssignments
                .Include(w => w.Contractor)
                .Include(w => w.Asset)
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == id);

            if (assignment == null)
                return NotFound(new { message = $"Work assignment #{id} not found." });

            return Ok(MapToResponseDto(assignment));
        }

        /// <summary>
        /// Assign a repair or maintenance task to a contractor.
        /// Automatically marks contractor as Busy and increments their total job count.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(WorkAssignmentResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateAssignment([FromBody] CreateWorkAssignmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var contractor = await _context.Contractors.FirstOrDefaultAsync(c => c.Id == dto.ContractorId);
            if (contractor == null)
                return NotFound(new { message = $"Contractor #{dto.ContractorId} not found." });

            var assignment = new WorkAssignment
            {
                ContractorId = dto.ContractorId,
                AssetId = string.IsNullOrWhiteSpace(dto.AssetId) ? null : dto.AssetId.Trim(),
                AssetName = dto.AssetName.Trim(),
                AssetType = dto.AssetType.Trim(),
                Priority = dto.Priority,
                DueDate = dto.DueDate,
                Notes = dto.Notes?.Trim(),
                Status = "Pending",
                EstimatedCost = dto.EstimatedCost,
                CreatedAt = DateTime.UtcNow
            };

            // Update contractor status
            contractor.IsAvailable = false;
            contractor.JobCount += 1;

            _context.WorkAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Work assigned to contractor #{ContractorId} for asset '{AssetName}'", contractor.Id, assignment.AssetName);

            assignment.Contractor = contractor;
            return StatusCode(StatusCodes.Status201Created, MapToResponseDto(assignment));
        }

        /// <summary>
        /// Update the status of a work assignment (Pending -> InProgress -> Done).
        /// If set to Done or Cancelled, checks if contractor has other active tasks to restore Available status.
        /// </summary>
        [HttpPatch("{id}/status")]
        [ProducesResponseType(typeof(WorkAssignmentResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateAssignmentStatusDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var assignment = await _context.WorkAssignments
                .Include(w => w.Contractor)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (assignment == null)
                return NotFound(new { message = $"Work assignment #{id} not found." });

            assignment.Status = dto.Status;
            if (dto.ActualCost.HasValue)
                assignment.ActualCost = dto.ActualCost.Value;

            if (!string.IsNullOrWhiteSpace(dto.Notes))
                assignment.Notes = string.IsNullOrEmpty(assignment.Notes)
                    ? dto.Notes
                    : $"{assignment.Notes}\n[Update]: {dto.Notes}";

            if (dto.Status == "Done")
            {
                assignment.CompletedAt = DateTime.UtcNow;
            }

            // If assignment is completed or cancelled, check if contractor can be marked Available again
            if (dto.Status is "Done" or "Cancelled" && assignment.Contractor != null)
            {
                var otherActive = await _context.WorkAssignments
                    .AnyAsync(w => w.ContractorId == assignment.ContractorId &&
                                   w.Id != id &&
                                   (w.Status == "Pending" || w.Status == "InProgress"));

                if (!otherActive)
                {
                    assignment.Contractor.IsAvailable = true;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(MapToResponseDto(assignment));
        }

        /// <summary>
        /// Cancel or delete a work assignment.
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteAssignment(int id)
        {
            var assignment = await _context.WorkAssignments
                .Include(w => w.Contractor)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (assignment == null)
                return NotFound(new { message = $"Work assignment #{id} not found." });

            var contractorId = assignment.ContractorId;
            _context.WorkAssignments.Remove(assignment);
            await _context.SaveChangesAsync();

            // Refresh contractor availability if no remaining active jobs
            var otherActive = await _context.WorkAssignments
                .AnyAsync(w => w.ContractorId == contractorId && (w.Status == "Pending" || w.Status == "InProgress"));

            if (!otherActive)
            {
                var contractor = await _context.Contractors.FindAsync(contractorId);
                if (contractor != null)
                {
                    contractor.IsAvailable = true;
                    await _context.SaveChangesAsync();
                }
            }

            return NoContent();
        }

        // ── Helper ─────────────────────────────────────────────────────────────
        private static WorkAssignmentResponseDto MapToResponseDto(WorkAssignment w)
        {
            return new WorkAssignmentResponseDto
            {
                Id = w.Id,
                ContractorId = w.ContractorId,
                ContractorName = w.Contractor != null ? w.Contractor.Name : null,
                AssetId = w.AssetId,
                AssetName = w.AssetName,
                AssetType = w.AssetType,
                Priority = w.Priority,
                DueDate = w.DueDate,
                Notes = w.Notes,
                Status = w.Status,
                EstimatedCost = w.EstimatedCost,
                ActualCost = w.ActualCost,
                CreatedAt = w.CreatedAt,
                CompletedAt = w.CompletedAt
            };
        }
    }
}

