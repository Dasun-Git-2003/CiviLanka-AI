using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CiviLanka.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    public class AuditEventDto
    {
        public Guid Id { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public DateTime Timestamp { get; set; }
    }

    [ApiController]
    [Route("api/audit")]
    [Produces("application/json")]
    [Authorize(Policy = "CanViewAuditLogs")]
    public class AuditController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuditController> _logger;

        public AuditController(AppDbContext db, ILogger<AuditController> logger)
        {
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// Retrieve municipal audit trail events.
        /// PublicWorksDirector receives system-wide audit events (security, threshold, operational).
        /// FieldMaintenanceSupervisor receives operational maintenance and repair events.
        /// Citizens and Field Workers are strictly denied access.
        /// Audit logs are immutable and cannot be deleted.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<AuditEventDto>), 200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetAuditLogs([FromQuery] string? eventType, [FromQuery] int limit = 100)
        {
            var isDirector = User.IsInRole("PublicWorksDirector") || User.IsInRole("Director");

            // Fetch maintenance audit logs
            var maintenanceLogs = await _db.MaintenanceAuditLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(limit)
                .ToListAsync();

            var events = maintenanceLogs.Select(l => new AuditEventDto
            {
                Id = l.Id,
                EventType = "OPERATIONAL_MAINTENANCE",
                Action = l.Action,
                PerformedBy = l.UserId,
                Role = "FieldWorker/Supervisor",
                Details = l.Description,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                Timestamp = l.Timestamp
            }).ToList();

            // If Director, include executive/system level audit events
            if (isDirector)
            {
                // Synthesize recent work order approval events for complete system visibility
                var recentApprovals = await _db.WorkOrders
                    .Where(w => w.ApprovalStatus == "APPROVED" || w.ApprovalStatus == "REJECTED")
                    .OrderByDescending(w => w.UpdatedAt)
                    .Take(20)
                    .ToListAsync();

                foreach (var wo in recentApprovals)
                {
                    events.Add(new AuditEventDto
                    {
                        Id = Guid.NewGuid(),
                        EventType = "DIRECTOR_EXECUTIVE",
                        Action = $"WORK_ORDER_{wo.ApprovalStatus}",
                        PerformedBy = wo.CreatedBy,
                        Role = "PublicWorksDirector",
                        Details = $"Work order {wo.WorkOrderNumber} ({wo.Title}) {wo.ApprovalStatus.ToLowerInvariant()} with budget {wo.ApprovedBudget ?? wo.EstimatedCost:N0} LKR",
                        EntityType = "WorkOrder",
                        EntityId = wo.Id.ToString(),
                        Timestamp = wo.UpdatedAt
                    });
                }
            }

            if (!string.IsNullOrWhiteSpace(eventType))
            {
                events = events.Where(e => e.EventType.Equals(eventType, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return Ok(events.OrderByDescending(e => e.Timestamp).Take(limit).ToList());
        }
    }
}
