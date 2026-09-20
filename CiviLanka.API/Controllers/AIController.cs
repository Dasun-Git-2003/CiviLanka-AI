using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    [Produces("application/json")]
    public class AIController : ControllerBase
    {
        private readonly IAIAgentOrchestrator _orchestrator;
        private readonly AppDbContext _db;

        public AIController(IAIAgentOrchestrator orchestrator, AppDbContext db)
        {
            _orchestrator = orchestrator;
            _db = db;
        }

        // ── HAZARD AI ────────────────────────────────────────────────────────────

        /// <summary>Trigger deep AI classification on a reported hazard.</summary>
        [HttpPost("hazards/{hazardId:guid}/analyze")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> AnalyzeHazard(Guid hazardId)
        {
            var userId = GetUserId();
            var result = await _orchestrator.AnalyzeHazardAsync(hazardId, userId);
            return Ok(result);
        }

        /// <summary>Get the latest AI analysis for a hazard.</summary>
        [HttpGet("hazards/{hazardId:guid}/analysis")]
        public async Task<IActionResult> GetHazardAnalysis(Guid hazardId)
        {
            var hazard = await _db.Hazards.AsNoTracking().FirstOrDefaultAsync(h => h.Id == hazardId);
            if (hazard == null) return NotFound(new { message = "Hazard not found." });

            var userRole = GetUserRole();
            var userId = GetUserId();
            if (userRole == "Citizen" && hazard.CitizenId != userId)
            {
                return Forbid();
            }

            var analysis = await _db.HazardAIAnalyses
                .AsNoTracking()
                .Where(a => a.HazardId == hazardId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            if (analysis == null)
            {
                return NotFound(new { message = "No AI analysis exists for this hazard yet." });
            }

            return Ok(analysis);
        }

        // ── ASSET AI ─────────────────────────────────────────────────────────────

        /// <summary>Trigger AI structural risk prediction for an infrastructure asset.</summary>
        [HttpPost("assets/{assetId}/analyze-risk")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> AnalyzeAssetRisk(string assetId)
        {
            var userId = GetUserId();
            var result = await _orchestrator.AnalyzeAssetRiskAsync(assetId, userId);
            return Ok(result);
        }

        /// <summary>Get the latest AI risk analysis for an infrastructure asset.</summary>
        [HttpGet("assets/{assetId}/risk-analysis")]
        [Authorize(Roles = "FieldWorker,FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> GetAssetRiskAnalysis(string assetId)
        {
            var analysis = await _db.AssetRiskAnalyses
                .AsNoTracking()
                .Where(a => a.AssetId == assetId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            if (analysis == null)
            {
                return NotFound(new { message = "No AI risk analysis exists for this asset yet." });
            }

            return Ok(analysis);
        }

        // ── WORK ORDER AI ────────────────────────────────────────────────────────

        /// <summary>Trigger AI cost and material estimation for a work order.</summary>
        [HttpPost("workorders/{workOrderId:guid}/estimate")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> EstimateWorkOrder(Guid workOrderId)
        {
            var userId = GetUserId();
            var result = await _orchestrator.EstimateWorkOrderAsync(workOrderId, userId);
            return Ok(result);
        }

        /// <summary>Get latest AI cost estimate for a work order.</summary>
        [HttpGet("workorders/{workOrderId:guid}/estimate")]
        [Authorize(Roles = "FieldWorker,FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> GetWorkOrderEstimate(Guid workOrderId)
        {
            var estimate = await _db.CostEstimates
                .AsNoTracking()
                .Where(c => c.WorkOrderId == workOrderId)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            if (estimate == null)
            {
                return NotFound(new { message = "No cost estimate found for this work order." });
            }

            return Ok(estimate);
        }

        // ── SAFETY & COMPLIANCE AI ───────────────────────────────────────────────

        /// <summary>Trigger AI safety and compliance audit on a field maintenance record.</summary>
        [HttpPost("maintenance/{maintenanceRecordId:guid}/safety-analysis")]
        [Authorize(Roles = "FieldWorker,FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> AnalyzeSafety(Guid maintenanceRecordId, [FromQuery] string stage = "BeforeMaintenance")
        {
            var userId = GetUserId();
            var result = await _orchestrator.AnalyzeSafetyAsync(maintenanceRecordId, stage, userId);
            return Ok(result);
        }

        /// <summary>Get latest AI safety audit for a maintenance record.</summary>
        [HttpGet("maintenance/{maintenanceRecordId:guid}/safety-analysis")]
        [Authorize(Roles = "FieldWorker,FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> GetSafetyAnalysis(Guid maintenanceRecordId)
        {
            var analysis = await _db.MaintenanceSafetyAnalyses
                .AsNoTracking()
                .Where(s => s.MaintenanceRecordId == maintenanceRecordId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            if (analysis == null)
            {
                return NotFound(new { message = "No safety analysis found for this maintenance record." });
            }

            return Ok(analysis);
        }

        // ── DISPATCH & PRIORITY ROUTING AI ───────────────────────────────────────

        /// <summary>Optimize hazard prioritization, route clustering, and contractor dispatch.</summary>
        [HttpPost("dispatch/optimize")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> OptimizeDispatch([FromBody] DispatchPriorityRequestDto request)
        {
            var userId = GetUserId();
            var result = await _orchestrator.OptimizeDispatchAndRouteAsync(request, userId);
            return Ok(result);
        }

        // ── MUNICIPAL SAFETY & AUDIT AI ──────────────────────────────────────────

        /// <summary>Audit work order against municipal safety rules, budget caps, evidence, and GPS tolerance.</summary>
        [HttpPost("workorders/{workOrderId:guid}/safety-audit")]
        [Authorize(Roles = "FieldWorker,FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> AuditWorkOrderSafety(Guid workOrderId)
        {
            var userId = GetUserId();
            var result = await _orchestrator.AuditWorkOrderComplianceAsync(workOrderId, userId);
            return Ok(result);
        }

        // ── FULL ASSESSMENT WORKFLOW ─────────────────────────────────────────────

        /// <summary>Run full end-to-end multi-agent assessment on a hazard.</summary>
        [HttpPost("workflows/hazard/{hazardId:guid}/full-assessment")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> RunFullAssessment(Guid hazardId)
        {
            var userId = GetUserId();
            var result = await _orchestrator.RunFullAssessmentAsync(hazardId, userId);
            return Ok(result);
        }

        // ── HUMAN OVERRIDE WORKFLOW ──────────────────────────────────────────────

        /// <summary>Record a human-in-the-loop override with mandatory explanation into the audit trail.</summary>
        [HttpPost("override")]
        [Authorize(Roles = "FieldMaintenanceSupervisor,PublicWorksDirector,Director")]
        public async Task<IActionResult> OverrideAI([FromBody] AIOverrideRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.OverrideReason))
            {
                return BadRequest(new { message = "Override reason is mandatory for human-in-the-loop decisions." });
            }

            var userId = GetUserId() ?? "UnknownSupervisor";
            var success = await _orchestrator.RecordHumanOverrideAsync(request, userId);
            return Ok(new { success, message = "Human override logged successfully in municipal audit trail." });
        }

        // ── AI DASHBOARD INTELLIGENCE ────────────────────────────────────────────

        /// <summary>Retrieve real-time database-calculated AI telemetry and governance statistics.</summary>
        [HttpGet("dashboard")]
        [Authorize(Roles = "FieldWorker,FieldMaintenanceSupervisor,PublicWorksDirector,Director,MunicipalStaff")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _orchestrator.GetDashboardStatsAsync();
            return Ok(stats);
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
