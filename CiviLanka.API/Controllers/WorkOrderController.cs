using CiviLanka.API.DTOs.WorkOrders;
using CiviLanka.API.Models;
using CiviLanka.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CiviLanka.API.Controllers
{
    /// <summary>
    /// Work Order management API for municipal staff.
    /// Citizens cannot create, view, or modify work orders.
    /// </summary>
    [ApiController]
    [Route("api/workorders")]
    [Authorize]
    [Produces("application/json")]
    public class WorkOrderController : ControllerBase
    {
        private readonly IWorkOrderService _service;
        private readonly ILogger<WorkOrderController> _logger;

        public WorkOrderController(IWorkOrderService service, ILogger<WorkOrderController> logger)
        {
            _service = service;
            _logger  = logger;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

        // ── CREATE ────────────────────────────────────────────────────────────

        /// <summary>Create a new work order (Supervisor or Director).</summary>
        [HttpPost]
        [Authorize(Policy = "CanCreateWorkOrder")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> Create([FromBody] CreateWorkOrderDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!dto.IsPriorityValid())
                return BadRequest(new { message = "Invalid priority. Must be LOW, NORMAL, HIGH, or URGENT." });

            try
            {
                var result = await _service.CreateAsync(dto, UserId);
                return StatusCode(201, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create work order");
                return StatusCode(500, new { message = "Failed to create work order." });
            }
        }

        // ── READ ──────────────────────────────────────────────────────────────

        /// <summary>Get all active work orders (Supervisors/Directors see all, Field Workers see assigned).</summary>
        [HttpGet]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff,FieldWorker")]
        [ProducesResponseType(typeof(List<WorkOrderResponseDto>), 200)]
        public async Task<IActionResult> GetAll()
        {
            var list = await _service.GetAllAsync();

            // Resource-level filtering: Field workers only view work assigned to their crew or account
            if (User.IsInRole("FieldWorker") && !User.IsInRole("FieldMaintenanceSupervisor") && !User.IsInRole("PublicWorksDirector") && !User.IsInRole("Director"))
            {
                var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "";
                var userFullName = User.FindFirstValue("fullName") ?? "";
                list = list.Where(w =>
                    (!string.IsNullOrEmpty(w.AssignedCrew) && (
                        w.AssignedCrew.Contains(userEmail, StringComparison.OrdinalIgnoreCase) ||
                        w.AssignedCrew.Contains(userFullName, StringComparison.OrdinalIgnoreCase) ||
                        w.AssignedCrew.Contains(UserId, StringComparison.OrdinalIgnoreCase)))
                ).ToList();
            }

            return Ok(list);
        }

        /// <summary>Get a specific work order by ID.</summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff,FieldWorker")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 200)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = "Work order not found." });

            // Resource-level check for Field Workers
            if (User.IsInRole("FieldWorker") && !User.IsInRole("FieldMaintenanceSupervisor") && !User.IsInRole("PublicWorksDirector") && !User.IsInRole("Director"))
            {
                var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "";
                var userFullName = User.FindFirstValue("fullName") ?? "";
                bool isAssigned = !string.IsNullOrEmpty(result.AssignedCrew) && (
                    result.AssignedCrew.Contains(userEmail, StringComparison.OrdinalIgnoreCase) ||
                    result.AssignedCrew.Contains(userFullName, StringComparison.OrdinalIgnoreCase) ||
                    result.AssignedCrew.Contains(UserId, StringComparison.OrdinalIgnoreCase));
                if (!isAssigned)
                {
                    return StatusCode(403, new { message = "Access denied. Field workers can only access work orders assigned to them." });
                }
            }

            return Ok(result);
        }

        /// <summary>Get all work orders for a specific hazard.</summary>
        [HttpGet("hazard/{hazardId:guid}")]
        [Authorize(Policy = "CanManageWorkOrders")]
        [ProducesResponseType(typeof(List<WorkOrderResponseDto>), 200)]
        public async Task<IActionResult> GetByHazard(Guid hazardId)
        {
            var list = await _service.GetByHazardIdAsync(hazardId);
            return Ok(list);
        }

        /// <summary>Get work orders by status.</summary>
        [HttpGet("status/{status}")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff,FieldWorker")]
        [ProducesResponseType(typeof(List<WorkOrderResponseDto>), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> GetByStatus(string status)
        {
            if (!WorkOrderStatus.All.Contains(status))
                return BadRequest(new { message = $"Invalid status. Valid values: {string.Join(", ", WorkOrderStatus.All)}" });

            var list = await _service.GetByStatusAsync(status);
            return Ok(list);
        }

        /// <summary>Get all work orders pending director approval.</summary>
        [HttpGet("pending-approval")]
        [Authorize(Policy = "CanApproveWorkOrder")]
        [ProducesResponseType(typeof(List<WorkOrderResponseDto>), 200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetPendingApproval()
        {
            var list = await _service.GetPendingApprovalAsync();
            return Ok(list);
        }

        // ── UPDATE ────────────────────────────────────────────────────────────

        /// <summary>Update a work order (staff only).</summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateWorkOrderDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateAsync(id, dto);
                return result == null ? NotFound(new { message = "Work order not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Update only the status of a work order.</summary>
        [HttpPut("{id:guid}/status")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateWorkOrderStatusDto dto)
        {
            try
            {
                var result = await _service.UpdateStatusAsync(id, dto.Status, dto.Notes);
                return result == null ? NotFound(new { message = "Work order not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── DELETE ────────────────────────────────────────────────────────────

        /// <summary>Soft-cancel a work order (preserves audit trail).</summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Cancel(Guid id)
        {
            try
            {
                var success = await _service.CancelAsync(id);
                return success ? NoContent() : NotFound(new { message = "Work order not found." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── AI ESTIMATE ───────────────────────────────────────────────────────

        /// <summary>
        /// Run the Cost Estimator AI Agent for an existing work order.
        /// Saves results to CostEstimates, WorkOrderItems, and WorkOrderAIAnalyses tables.
        /// </summary>
        [HttpPost("{id:guid}/estimate")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GenerateEstimate(Guid id, [FromBody] CostEstimateRequestDto? dto = null)
        {
            _logger.LogInformation("Generating AI cost estimate for WorkOrder {Id}", id);
            var result = await _service.GenerateEstimateAsync(id, dto);
            return result == null ? NotFound(new { message = "Work order not found or AI estimation failed." }) : Ok(result);
        }

        /// <summary>Get the latest saved cost estimate for a work order.</summary>
        [HttpGet("{id:guid}/estimate")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(CostEstimateResponseDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetEstimate(Guid id)
        {
            var result = await _service.GetLatestEstimateAsync(id);
            return result == null ? NotFound(new { message = "No estimate found." }) : Ok(result);
        }

        // ── APPROVAL ──────────────────────────────────────────────────────────

        /// <summary>
        /// Approve a work order (PublicWorksDirector or Director only).
        /// The AI CANNOT approve — this is a human decision.
        /// </summary>
        [HttpPost("{id:guid}/approve")]
        [Authorize(Policy = "CanApproveWorkOrder")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveRejectDto dto)
        {
            try
            {
                var result = await _service.ApproveAsync(id, UserId, dto.Notes);
                return result == null ? NotFound(new { message = "Work order not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Reject a work order (PublicWorksDirector or Director only).</summary>
        [HttpPost("{id:guid}/reject")]
        [Authorize(Policy = "CanApproveWorkOrder")]
        [ProducesResponseType(typeof(WorkOrderResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Reject(Guid id, [FromBody] ApproveRejectDto dto)
        {
            try
            {
                var result = await _service.RejectAsync(id, UserId, dto.Notes);
                return result == null ? NotFound(new { message = "Work order not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
