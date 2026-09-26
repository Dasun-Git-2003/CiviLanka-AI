using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using CiviLanka.API.DTOs.Maintenance;
using CiviLanka.API.Models;
using CiviLanka.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.Controllers
{
    [ApiController]
    [Route("api/maintenance-records")]
    [Produces("application/json")]
    [Authorize]
    public class MaintenanceRecordController : ControllerBase
    {
        private readonly IMaintenanceRecordService _service;
        private readonly ILogger<MaintenanceRecordController> _logger;

        public MaintenanceRecordController(
            IMaintenanceRecordService service,
            ILogger<MaintenanceRecordController> logger)
        {
            _service = service;
            _logger  = logger;
        }

        private string UserEmail =>
            User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)
            ?? (User.Identity?.Name?.Contains("@") == true ? User.Identity.Name : "");

        private string UserId =>
            !string.IsNullOrWhiteSpace(UserEmail)
                ? UserEmail
                : (User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? User.FindFirstValue("sub")
                   ?? User.Identity?.Name
                   ?? "system");

        // ── CREATE ────────────────────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CreateMaintenanceRecordDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.CreateAsync(dto, UserId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private bool IsRecordAccessibleToWorker(MaintenanceRecordResponseDto record)
        {
            var userEmail = UserEmail;
            var userId = UserId;
            var userFullName = User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Name) ?? "";

            // 1. Direct match on PerformedBy
            if (!string.IsNullOrEmpty(record.PerformedBy))
            {
                if ((!string.IsNullOrEmpty(userEmail) && record.PerformedBy.Equals(userEmail, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(userId) && record.PerformedBy.Equals(userId, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(userFullName) && record.PerformedBy.Contains(userFullName, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(userEmail) && record.PerformedBy.Contains(userEmail, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(userId) && record.PerformedBy.Contains(userId, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }

                // Demo / Seed worker aliases
                if (record.PerformedBy.Equals("user-fieldworker-001", StringComparison.OrdinalIgnoreCase) ||
                    record.PerformedBy.Equals("worker-demo-id", StringComparison.OrdinalIgnoreCase) ||
                    record.PerformedBy.Equals("fieldworker@test.com", StringComparison.OrdinalIgnoreCase) ||
                    record.PerformedBy.Equals("worker@civilanka.gov.lk", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            // 2. Match on WorkOrder AssignedCrew
            if (!string.IsNullOrEmpty(record.AssignedCrew))
            {
                if ((!string.IsNullOrEmpty(userEmail) && record.AssignedCrew.Contains(userEmail, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(userFullName) && record.AssignedCrew.Contains(userFullName, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(userId) && record.AssignedCrew.Contains(userId, StringComparison.OrdinalIgnoreCase)) ||
                    record.AssignedCrew.Contains("fieldworker@test.com", StringComparison.OrdinalIgnoreCase) ||
                    record.AssignedCrew.Contains("Crew Alpha", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            // 3. Active open tasks in the field
            if (record.Status == MaintenanceStatus.Assigned ||
                record.Status == MaintenanceStatus.InProgress ||
                record.Status == MaintenanceStatus.RequiresCorrection)
            {
                return true;
            }

            return false;
        }

        // ── READ ──────────────────────────────────────────────────────────────
        [HttpGet]
        [Authorize(Policy = "CanManageMaintenance")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        public async Task<IActionResult> GetAll()
        {
            await _service.SyncApprovedWorkOrdersAsync();
            var list = await _service.GetAllAsync();

            if (User.IsInRole("FieldWorker") && !User.IsInRole("FieldMaintenanceSupervisor") && !User.IsInRole("PublicWorksDirector") && !User.IsInRole("Director"))
            {
                list = list.Where(IsRecordAccessibleToWorker).ToList();
            }

            return Ok(list);
        }

        [HttpGet("{id:guid}")]
        [Authorize(Policy = "CanManageMaintenance")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 200)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var record = await _service.GetByIdAsync(id);
            if (record == null) return NotFound(new { message = "Maintenance record not found." });

            if (User.IsInRole("FieldWorker") && !User.IsInRole("FieldMaintenanceSupervisor") && !User.IsInRole("PublicWorksDirector") && !User.IsInRole("Director"))
            {
                if (!IsRecordAccessibleToWorker(record))
                {
                    return StatusCode(403, new { message = "Access denied. Field workers can only access maintenance records assigned to them or active field operations." });
                }
            }

            return Ok(record);
        }

        [HttpGet("workorder/{workOrderId:guid}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        public async Task<IActionResult> GetByWorkOrder(Guid workOrderId)
        {
            var list = await _service.GetByWorkOrderIdAsync(workOrderId);
            return Ok(list);
        }

        [HttpGet("asset/{assetId}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        public async Task<IActionResult> GetByAsset(string assetId)
        {
            var list = await _service.GetByAssetIdAsync(assetId);
            return Ok(list);
        }

        [HttpGet("status/{status}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> GetByStatus(string status)
        {
            if (!MaintenanceStatus.All.Contains(status, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Invalid status '{status}'. Valid: {string.Join(", ", MaintenanceStatus.All)}." });

            var list = await _service.GetByStatusAsync(status.ToUpperInvariant());
            return Ok(list);
        }

        [HttpGet("worker/{workerId}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        public async Task<IActionResult> GetByWorker(string workerId)
        {
            var list = await _service.GetByWorkerAsync(workerId);
            return Ok(list);
        }

        [HttpGet("my-assigned")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        public async Task<IActionResult> GetMyAssigned()
        {
            await _service.SyncApprovedWorkOrdersAsync();
            var allRecords = await _service.GetAllAsync();

            // Supervisory / Director / Staff roles see all records
            if (User.IsInRole("FieldMaintenanceSupervisor") || User.IsInRole("PublicWorksDirector") || User.IsInRole("Director") || User.IsInRole("MunicipalStaff"))
            {
                return Ok(allRecords);
            }

            // FieldWorker: filter by accessible records
            var workerRecords = allRecords.Where(IsRecordAccessibleToWorker).ToList();

            // If empty for a field worker, fallback to all active field tasks so worker has tasks to execute
            if (!workerRecords.Any())
            {
                workerRecords = allRecords.Where(r =>
                    r.Status == MaintenanceStatus.Assigned ||
                    r.Status == MaintenanceStatus.InProgress ||
                    r.Status == MaintenanceStatus.RequiresCorrection
                ).ToList();
            }

            return Ok(workerRecords);
        }

        [HttpGet("verification-queue")]
        [HttpGet("pending-verification")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director")]
        [ProducesResponseType(typeof(List<MaintenanceRecordResponseDto>), 200)]
        public async Task<IActionResult> GetPendingVerification()
        {
            var list = await _service.GetPendingVerificationAsync();
            return Ok(list);
        }
        // ── UPDATE ────────────────────────────────────────────────────────────
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMaintenanceRecordDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.UpdateAsync(id, dto, UserId);
                return result == null ? NotFound(new { message = "Maintenance record not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id:guid}/status")]
        [HttpPut("{id:guid}/status")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateMaintenanceStatusDto dto)
        {
            try
            {
                var result = await _service.UpdateStatusAsync(id, dto.Status, dto.Notes, UserId);
                return result == null ? NotFound(new { message = "Maintenance record not found." }) : Ok(result);
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

        // ── DELETE (SOFT CANCEL) ──────────────────────────────────────────────
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Cancel(Guid id)
        {
            try
            {
                var success = await _service.CancelAsync(id, UserId);
                return success ? NoContent() : NotFound(new { message = "Maintenance record not found." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── EVIDENCE UPLOAD ───────────────────────────────────────────────────
        [HttpPost("{id:guid}/upload-evidence")]
        [HttpPost("{id:guid}/evidence/{evidenceType}")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UploadEvidence(Guid id, [FromForm] string? evidenceType, IFormFile file, string? evidenceTypeRoute = null)
        {
            var type = !string.IsNullOrEmpty(evidenceType) ? evidenceType : (RouteData.Values["evidenceType"]?.ToString() ?? "");
            if (string.IsNullOrWhiteSpace(type))
                return BadRequest(new { message = "evidenceType ('before' or 'after') must be provided." });

            try
            {
                var result = await _service.UploadEvidenceAsync(id, type, file, UserId);
                return result == null ? NotFound(new { message = "Maintenance record not found." }) : Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── AI SAFETY & COMPLIANCE ────────────────────────────────────────────
        [HttpPost("{id:guid}/safety-analysis")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(SafetyAnalysisResponseDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RunSafetyAnalysis(Guid id)
        {
            var result = await _service.RunSafetyAnalysisAsync(id);
            return result == null ? NotFound(new { message = "Maintenance record not found or analysis failed." }) : Ok(result);
        }

        [HttpGet("{id:guid}/safety-analysis")]
        [HttpGet("{id:guid}/safety-analyses")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(SafetyAnalysisResponseDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetSafetyAnalysis(Guid id)
        {
            var result = await _service.GetLatestSafetyAnalysisAsync(id);
            return result == null ? NotFound(new { message = "No safety analysis found for this maintenance record." }) : Ok(result);
        }

        // ── SUPERVISOR VERIFICATION ──────────────────────────────────────────
        [HttpPost("{id:guid}/verify")]
        [Authorize(Policy = "CanVerifyMaintenance")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Verify(Guid id, [FromBody] VerifyMaintenanceDto dto)
        {
            try
            {
                var result = await _service.VerifyAsync(id, UserId, dto.Notes);
                return result == null ? NotFound(new { message = "Maintenance record not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:guid}/request-correction")]
        [Authorize(Policy = "CanVerifyMaintenance")]
        [ProducesResponseType(typeof(MaintenanceRecordResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> RequestCorrection(Guid id, [FromBody] RequestCorrectionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _service.RequestCorrectionAsync(id, UserId, dto.RequiredCorrections, dto.Notes);
                return result == null ? NotFound(new { message = "Maintenance record not found." }) : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── AUDIT LOGS ────────────────────────────────────────────────────────
        [HttpGet("{id:guid}/audit-logs")]
        [Authorize(Roles = "MunicipalStaff,FieldMaintenanceSupervisor,PublicWorksDirector,Director,FieldWorker")]
        [ProducesResponseType(typeof(List<MaintenanceAuditLogDto>), 200)]
        public async Task<IActionResult> GetAuditLogs(Guid id)
        {
            var logs = await _service.GetAuditLogsAsync(id);
            return Ok(logs);
        }
    }
}
