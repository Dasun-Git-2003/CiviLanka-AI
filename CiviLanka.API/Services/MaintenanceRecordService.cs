using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.Agents;
using CiviLanka.API.Data;
using CiviLanka.API.DTOs.Maintenance;
using CiviLanka.API.Models;
using CiviLanka.API.Repositories;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.Services
{
    public interface IMaintenanceRecordService
    {
        Task<MaintenanceRecordResponseDto> CreateAsync(CreateMaintenanceRecordDto dto, string userId);
        Task<MaintenanceRecordResponseDto?> GetByIdAsync(Guid id);
        Task<List<MaintenanceRecordResponseDto>> GetAllAsync();
        Task<List<MaintenanceRecordResponseDto>> GetByStatusAsync(string status);
        Task<List<MaintenanceRecordResponseDto>> GetByWorkOrderIdAsync(Guid workOrderId);
        Task<List<MaintenanceRecordResponseDto>> GetByAssetIdAsync(string assetId);
        Task<List<MaintenanceRecordResponseDto>> GetByWorkerAsync(string workerId);
        Task<List<MaintenanceRecordResponseDto>> GetPendingVerificationAsync();
        Task<MaintenanceRecordResponseDto?> UpdateAsync(Guid id, UpdateMaintenanceRecordDto dto, string userId);
        Task<MaintenanceRecordResponseDto?> UpdateStatusAsync(Guid id, string newStatus, string? notes, string userId);
        Task<MaintenanceRecordResponseDto?> VerifyAsync(Guid id, string supervisorUserId, string? notes);
        Task<MaintenanceRecordResponseDto?> RequestCorrectionAsync(Guid id, string supervisorUserId, string requiredCorrections, string? notes);
        Task<bool> CancelAsync(Guid id, string userId);
        Task<SafetyAnalysisResponseDto?> RunSafetyAnalysisAsync(Guid id);
        Task<SafetyAnalysisResponseDto?> GetLatestSafetyAnalysisAsync(Guid id);
        Task<MaintenanceRecordResponseDto?> UploadEvidenceAsync(Guid id, string evidenceType, IFormFile file, string userId);
        Task<List<MaintenanceAuditLogDto>> GetAuditLogsAsync(Guid id);
    }

    public class MaintenanceRecordService : IMaintenanceRecordService
    {
        private readonly IMaintenanceRecordRepository _repo;
        private readonly ISafetyComplianceAgent _agent;
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<MaintenanceRecordService> _logger;

        private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

        public MaintenanceRecordService(
            IMaintenanceRecordRepository repo,
            ISafetyComplianceAgent agent,
            AppDbContext db,
            IWebHostEnvironment env,
            ILogger<MaintenanceRecordService> logger)
        {
            _repo = repo;
            _agent = agent;
            _db = db;
            _env = env;
            _logger = logger;
        }

        public async Task<MaintenanceRecordResponseDto> CreateAsync(CreateMaintenanceRecordDto dto, string userId)
        {
            var workOrder = await _db.WorkOrders.FindAsync(dto.WorkOrderId);
            if (workOrder == null || workOrder.IsCancelled)
                throw new ArgumentException($"Work order {dto.WorkOrderId} not found or is cancelled.");

            var record = new MaintenanceRecord
            {
                WorkOrderId        = dto.WorkOrderId,
                AssetId            = dto.AssetId ?? workOrder.AssetId,
                PerformedBy        = userId,
                MaintenanceType    = dto.MaintenanceType,
                Description        = dto.Description,
                Status             = MaintenanceStatus.Assigned,
                MaterialsUsed      = dto.MaterialsUsed,
                EquipmentUsed      = dto.EquipmentUsed,
                LabourHours        = dto.LabourHours,
                ActualCost         = dto.ActualCost,
                SafetyChecklist    = dto.SafetyChecklist,
                WorkerNotes        = dto.WorkerNotes,
                VerificationStatus = MaintenanceVerificationStatus.NotSubmitted,
                CreatedAt          = DateTime.UtcNow,
                UpdatedAt          = DateTime.UtcNow
            };

            var created = await _repo.CreateAsync(record);

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = created.Id,
                UserId              = userId,
                Action              = "INITIALIZE_MAINTENANCE",
                EntityType          = "MaintenanceRecord",
                EntityId            = created.Id.ToString(),
                PreviousStatus      = null,
                NewStatus           = MaintenanceStatus.Assigned,
                Description         = $"Maintenance record initialized for WorkOrder {workOrder.WorkOrderNumber}."
            });

            return (await MapToResponseDtoAsync(created.Id))!;
        }

        public async Task<MaintenanceRecordResponseDto?> GetByIdAsync(Guid id) =>
            await MapToResponseDtoAsync(id);

        public async Task<List<MaintenanceRecordResponseDto>> GetAllAsync() =>
            (await _repo.GetAllActiveAsync()).Select(MapSummary).ToList();

        public async Task<List<MaintenanceRecordResponseDto>> GetByStatusAsync(string status) =>
            (await _repo.GetByStatusAsync(status)).Select(MapSummary).ToList();

        public async Task<List<MaintenanceRecordResponseDto>> GetByWorkOrderIdAsync(Guid workOrderId) =>
            (await _repo.GetByWorkOrderIdAsync(workOrderId)).Select(MapSummary).ToList();

        public async Task<List<MaintenanceRecordResponseDto>> GetByAssetIdAsync(string assetId) =>
            (await _repo.GetByAssetIdAsync(assetId)).Select(MapSummary).ToList();

        public async Task<List<MaintenanceRecordResponseDto>> GetByWorkerAsync(string workerId) =>
            (await _repo.GetByWorkerAsync(workerId)).Select(MapSummary).ToList();

        public async Task<List<MaintenanceRecordResponseDto>> GetPendingVerificationAsync() =>
            (await _repo.GetPendingVerificationAsync()).Select(MapSummary).ToList();
        public async Task<MaintenanceRecordResponseDto?> UpdateAsync(Guid id, UpdateMaintenanceRecordDto dto, string userId)
        {
            var record = await _repo.GetByIdAsync(id);
            if (record == null) return null;

            var oldStatus = record.Status;

            if (dto.Status != null && !string.Equals(record.Status, dto.Status, StringComparison.OrdinalIgnoreCase))
            {
                if (!MaintenanceStatus.CanTransition(record.Status, dto.Status))
                {
                    var allowed = MaintenanceStatus.GetAllowedNextStatuses(record.Status);
                    throw new InvalidOperationException(
                        $"Cannot transition maintenance record from '{record.Status}' to '{dto.Status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None (terminal)")}.");
                }
                record.Status = dto.Status.ToUpperInvariant();
            }

            if (dto.MaintenanceType != null) record.MaintenanceType = dto.MaintenanceType;
            if (dto.Description != null)     record.Description = dto.Description;
            if (dto.MaterialsUsed != null)   record.MaterialsUsed = dto.MaterialsUsed;
            if (dto.EquipmentUsed != null)   record.EquipmentUsed = dto.EquipmentUsed;
            if (dto.LabourHours.HasValue)    record.LabourHours = dto.LabourHours.Value;
            if (dto.ActualCost.HasValue)     record.ActualCost = dto.ActualCost.Value;
            if (dto.BeforeImageUrl != null)  record.BeforeImageUrl = dto.BeforeImageUrl;
            if (dto.AfterImageUrl != null)   record.AfterImageUrl = dto.AfterImageUrl;
            if (dto.SafetyChecklist != null) record.SafetyChecklist = dto.SafetyChecklist;
            if (dto.WorkerNotes != null)     record.WorkerNotes = dto.WorkerNotes;
            if (dto.CompletionNotes != null) record.CompletionNotes = dto.CompletionNotes;

            if (dto.WorkStartedAt.HasValue)
                record.WorkStartedAt = dto.WorkStartedAt.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dto.WorkStartedAt.Value, DateTimeKind.Utc)
                    : dto.WorkStartedAt.Value.ToUniversalTime();

            if (dto.WorkCompletedAt.HasValue)
                record.WorkCompletedAt = dto.WorkCompletedAt.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dto.WorkCompletedAt.Value, DateTimeKind.Utc)
                    : dto.WorkCompletedAt.Value.ToUniversalTime();

            if (record.Status == MaintenanceStatus.Completed && record.VerificationStatus == MaintenanceVerificationStatus.NotSubmitted)
            {
                record.VerificationStatus = MaintenanceVerificationStatus.Pending;
                record.WorkCompletedAt ??= DateTime.UtcNow;
            }

            await _repo.UpdateAsync(record);

            if (oldStatus != record.Status)
            {
                await _repo.AddAuditLogAsync(new MaintenanceAuditLog
                {
                    MaintenanceRecordId = record.Id,
                    UserId              = userId,
                    Action              = "STATUS_UPDATE",
                    EntityType          = "MaintenanceRecord",
                    EntityId            = record.Id.ToString(),
                    PreviousStatus      = oldStatus,
                    NewStatus           = record.Status,
                    Description         = $"Status changed from {oldStatus} to {record.Status}."
                });
            }

            return await MapToResponseDtoAsync(id);
        }

        public async Task<MaintenanceRecordResponseDto?> UpdateStatusAsync(Guid id, string newStatus, string? notes, string userId)
        {
            var record = await _repo.GetByIdAsync(id);
            if (record == null) return null;

            if (!MaintenanceStatus.All.Contains(newStatus, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Invalid status '{newStatus}'. Valid: {string.Join(", ", MaintenanceStatus.All)}.");

            var upper = newStatus.ToUpperInvariant();
            if (!MaintenanceStatus.CanTransition(record.Status, upper))
            {
                var allowed = MaintenanceStatus.GetAllowedNextStatuses(record.Status);
                throw new InvalidOperationException(
                    $"Cannot transition status from '{record.Status}' to '{upper}'. Allowed: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None")}.");
            }

            var oldStatus = record.Status;
            record.Status = upper;

            if (upper == MaintenanceStatus.InProgress && record.WorkStartedAt == null)
            {
                record.WorkStartedAt = DateTime.UtcNow;
            }
            else if (upper == MaintenanceStatus.Completed)
            {
                record.WorkCompletedAt ??= DateTime.UtcNow;
                record.VerificationStatus = MaintenanceVerificationStatus.Pending;
                if (notes != null) record.CompletionNotes = notes;
            }

            await _repo.UpdateAsync(record);

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = record.Id,
                UserId              = userId,
                Action              = $"STATUS_{upper}",
                EntityType          = "MaintenanceRecord",
                EntityId            = record.Id.ToString(),
                PreviousStatus      = oldStatus,
                NewStatus           = upper,
                Description         = notes ?? $"Maintenance status progressed to {upper}."
            });

            return await MapToResponseDtoAsync(id);
        }

        public async Task<MaintenanceRecordResponseDto?> VerifyAsync(Guid id, string supervisorUserId, string? notes)
        {
            var record = await _repo.GetByIdWithDetailsAsync(id);
            if (record == null) return null;

            if (!string.IsNullOrEmpty(record.PerformedBy) &&
                string.Equals(record.PerformedBy, supervisorUserId, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Self-verification is not permitted. A worker cannot verify their own maintenance completion.");
            }

            if (!MaintenanceStatus.CanTransition(record.Status, MaintenanceStatus.Verified))
            {
                var allowed = MaintenanceStatus.GetAllowedNextStatuses(record.Status);
                throw new InvalidOperationException(
                    $"Cannot verify maintenance record in status '{record.Status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None")}.");
            }

            var oldStatus = record.Status;
            record.Status             = MaintenanceStatus.Verified;
            record.VerificationStatus = MaintenanceVerificationStatus.Verified;
            record.VerifiedBy         = supervisorUserId;
            record.VerifiedAt         = DateTime.UtcNow;
            record.VerificationNotes  = notes;

            await _repo.UpdateAsync(record);

            var workOrder = await _db.WorkOrders.FindAsync(record.WorkOrderId);
            if (workOrder != null && !workOrder.IsCancelled)
            {
                workOrder.ActualCost = record.ActualCost > 0 ? record.ActualCost : workOrder.ActualCost;
                if (workOrder.Status != WorkOrderStatus.Closed && workOrder.Status != WorkOrderStatus.Verified)
                {
                    if (WorkOrderStatus.CanTransition(workOrder.Status, WorkOrderStatus.Verified))
                        workOrder.Status = WorkOrderStatus.Verified;
                    else if (WorkOrderStatus.CanTransition(workOrder.Status, WorkOrderStatus.Completed))
                        workOrder.Status = WorkOrderStatus.Completed;
                }
                workOrder.UpdatedAt = DateTime.UtcNow;
                _db.WorkOrders.Update(workOrder);
                await _db.SaveChangesAsync();
            }

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = record.Id,
                UserId              = supervisorUserId,
                Action              = "VERIFY_MAINTENANCE",
                EntityType          = "MaintenanceRecord",
                EntityId            = record.Id.ToString(),
                PreviousStatus      = oldStatus,
                NewStatus           = MaintenanceStatus.Verified,
                Description         = notes ?? "Supervisor formally verified completion and compliance."
            });

            return await MapToResponseDtoAsync(id);
        }

        public async Task<MaintenanceRecordResponseDto?> RequestCorrectionAsync(Guid id, string supervisorUserId, string requiredCorrections, string? notes)
        {
            var record = await _repo.GetByIdAsync(id);
            if (record == null) return null;

            if (!MaintenanceStatus.CanTransition(record.Status, MaintenanceStatus.RequiresCorrection))
            {
                var allowed = MaintenanceStatus.GetAllowedNextStatuses(record.Status);
                throw new InvalidOperationException(
                    $"Cannot request correction for record in status '{record.Status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None")}.");
            }

            var oldStatus = record.Status;
            record.Status             = MaintenanceStatus.RequiresCorrection;
            record.VerificationStatus = MaintenanceVerificationStatus.RequiresCorrection;
            record.VerificationNotes  = $"[CORRECTION REQUIRED]: {requiredCorrections}. {(notes != null ? $"Note: {notes}" : "")}";

            await _repo.UpdateAsync(record);

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = record.Id,
                UserId              = supervisorUserId,
                Action              = "REQUEST_CORRECTION",
                EntityType          = "MaintenanceRecord",
                EntityId            = record.Id.ToString(),
                PreviousStatus      = oldStatus,
                NewStatus           = MaintenanceStatus.RequiresCorrection,
                Description         = $"Correction requested: {requiredCorrections}"
            });

            return await MapToResponseDtoAsync(id);
        }

        public async Task<bool> CancelAsync(Guid id, string userId)
        {
            var record = await _repo.GetByIdAsync(id);
            if (record == null || record.IsDeleted) return false;

            if (!MaintenanceStatus.CanTransition(record.Status, MaintenanceStatus.Cancelled))
                throw new InvalidOperationException($"Cannot cancel maintenance record in terminal status '{record.Status}'.");

            var oldStatus = record.Status;
            record.IsDeleted = true;
            record.Status    = MaintenanceStatus.Cancelled;
            await _repo.UpdateAsync(record);

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = record.Id,
                UserId              = userId,
                Action              = "CANCEL_MAINTENANCE",
                EntityType          = "MaintenanceRecord",
                EntityId            = record.Id.ToString(),
                PreviousStatus      = oldStatus,
                NewStatus           = MaintenanceStatus.Cancelled,
                Description         = "Maintenance record soft-cancelled by user."
            });

            return true;
        }
        public async Task<SafetyAnalysisResponseDto?> RunSafetyAnalysisAsync(Guid id)
        {
            var record = await _repo.GetByIdWithDetailsAsync(id);
            if (record == null) return null;

            var workOrder = record.WorkOrder;
            var asset = record.Asset ?? workOrder?.Asset;
            var hazard = workOrder?.Hazard;

            var input = new SafetyComplianceEvaluationInput
            {
                MaintenanceRecordId    = record.Id,
                WorkOrderId            = record.WorkOrderId,
                WorkOrderNumber        = workOrder?.WorkOrderNumber,
                Title                  = workOrder?.Title ?? "Municipal Repair",
                Description            = workOrder?.Description ?? record.Description,
                HazardCategory         = hazard?.Category,
                Severity               = hazard?.Severity ?? workOrder?.Severity,
                Priority               = workOrder?.Priority,
                Location               = hazard?.Address,
                EstimatedCost          = workOrder?.EstimatedCost,
                ActualCost             = record.ActualCost,
                RecommendedCrewSize    = workOrder?.RecommendedCrewSize,
                EstimatedDurationHours = workOrder?.EstimatedDurationHours,

                AssetId                = record.AssetId,
                AssetType              = asset?.Type,
                AssetCondition         = asset?.Inspections.OrderByDescending(i => i.InspectionDate).FirstOrDefault()?.Condition,
                AssetAgeYears          = asset?.InstallationDate.HasValue == true
                    ? (int)((DateTime.UtcNow - asset.InstallationDate.Value).TotalDays / 365)
                    : null,

                MaintenanceType        = record.MaintenanceType,
                MaterialsUsed          = record.MaterialsUsed,
                EquipmentUsed          = record.EquipmentUsed,
                LabourHours            = record.LabourHours,
                SafetyChecklist        = record.SafetyChecklist,
                WorkerNotes            = record.WorkerNotes,
                CompletionNotes        = record.CompletionNotes,
                HasBeforeImage         = !string.IsNullOrWhiteSpace(record.BeforeImageUrl),
                HasAfterImage          = !string.IsNullOrWhiteSpace(record.AfterImageUrl)
            };

            var eval = await _agent.EvaluateAsync(input);
            if (eval == null) return null;

            var entity = new MaintenanceSafetyAnalysis
            {
                MaintenanceRecordId       = record.Id,
                WorkOrderId               = record.WorkOrderId,
                AgentName                 = eval.ModelName,
                SafetyRiskLevel           = eval.SafetyRiskLevel,
                ComplianceStatus          = eval.ComplianceStatus,
                Confidence                = eval.Confidence,
                IdentifiedRisksJson       = JsonSerializer.Serialize(eval.IdentifiedRisks),
                MissingRequirementsJson   = JsonSerializer.Serialize(eval.MissingRequirements),
                RequiredSafetyActionsJson = JsonSerializer.Serialize(eval.RequiredSafetyActions),
                Recommendation            = eval.Recommendation,
                Reason                    = eval.Reason,
                CreatedAt                 = DateTime.UtcNow
            };

            await _repo.AddSafetyAnalysisAsync(entity);

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = record.Id,
                UserId              = "SafetyComplianceAgent",
                Action              = "SAFETY_ANALYSIS_GENERATED",
                EntityType          = "MaintenanceSafetyAnalysis",
                EntityId            = entity.Id.ToString(),
                PreviousStatus      = record.Status,
                NewStatus           = record.Status,
                Description         = $"AI Safety Analysis: Risk={eval.SafetyRiskLevel}, Compliance={eval.ComplianceStatus}, Confidence={eval.Confidence:P0}."
            });

            return MapSafetyAnalysis(entity);
        }

        public async Task<SafetyAnalysisResponseDto?> GetLatestSafetyAnalysisAsync(Guid id)
        {
            var analysis = await _repo.GetLatestSafetyAnalysisAsync(id);
            return analysis == null ? null : MapSafetyAnalysis(analysis);
        }

        public async Task<MaintenanceRecordResponseDto?> UploadEvidenceAsync(Guid id, string evidenceType, IFormFile file, string userId)
        {
            var record = await _repo.GetByIdAsync(id);
            if (record == null) return null;

            if (file == null || file.Length == 0)
                throw new ArgumentException("Uploaded file is empty.");

            if (file.Length > MaxFileSizeBytes)
                throw new ArgumentException("File size exceeds the 10 MB limit.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedImageExtensions.Contains(ext))
                throw new ArgumentException($"Invalid file extension '{ext}'. Allowed: {string.Join(", ", AllowedImageExtensions)}.");

            var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "maintenance");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{id}_{evidenceType}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
            var fullPath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativeUrl = $"/uploads/maintenance/{fileName}";

            if (string.Equals(evidenceType, "before", StringComparison.OrdinalIgnoreCase))
                record.BeforeImageUrl = relativeUrl;
            else if (string.Equals(evidenceType, "after", StringComparison.OrdinalIgnoreCase))
                record.AfterImageUrl = relativeUrl;
            else
                throw new ArgumentException("evidenceType must be either 'before' or 'after'.");

            await _repo.UpdateAsync(record);

            await _repo.AddAuditLogAsync(new MaintenanceAuditLog
            {
                MaintenanceRecordId = record.Id,
                UserId              = userId,
                Action              = $"UPLOAD_{evidenceType.ToUpperInvariant()}_IMAGE",
                EntityType          = "MaintenanceRecord",
                EntityId            = record.Id.ToString(),
                PreviousStatus      = record.Status,
                NewStatus           = record.Status,
                Description         = $"Uploaded {evidenceType} photo evidence: {fileName}."
            });

            return await MapToResponseDtoAsync(id);
        }

        public async Task<List<MaintenanceAuditLogDto>> GetAuditLogsAsync(Guid id)
        {
            var logs = await _repo.GetAuditLogsAsync(id);
            return logs.Select(l => new MaintenanceAuditLogDto
            {
                Id                  = l.Id,
                MaintenanceRecordId = l.MaintenanceRecordId,
                UserId              = l.UserId,
                Action              = l.Action,
                EntityType          = l.EntityType,
                EntityId            = l.EntityId,
                Timestamp           = l.Timestamp,
                PreviousStatus      = l.PreviousStatus,
                NewStatus           = l.NewStatus,
                Description         = l.Description
            }).ToList();
        }

        private async Task<MaintenanceRecordResponseDto?> MapToResponseDtoAsync(Guid id)
        {
            var record = await _repo.GetByIdWithDetailsAsync(id);
            if (record == null) return null;

            var latestAnalysis = record.SafetyAnalyses.OrderByDescending(s => s.CreatedAt).FirstOrDefault();

            return new MaintenanceRecordResponseDto
            {
                Id                     = record.Id,
                WorkOrderId            = record.WorkOrderId,
                WorkOrderNumber        = record.WorkOrder?.WorkOrderNumber,
                WorkOrderTitle         = record.WorkOrder?.Title,
                WorkOrderPriority      = record.WorkOrder?.Priority,
                WorkOrderSeverity      = record.WorkOrder?.Severity,
                WorkOrderStatus        = record.WorkOrder?.Status,
                EstimatedCost          = record.WorkOrder?.EstimatedCost,
                AssignedCrew           = record.WorkOrder?.AssignedCrew,
                Location               = record.WorkOrder?.Hazard?.Address,
                HazardCategory         = record.WorkOrder?.Hazard?.Category,
                HazardTicket           = record.WorkOrder?.Hazard?.TicketNumber,

                AssetId                = record.AssetId,
                AssetName              = record.Asset?.Name ?? record.WorkOrder?.Asset?.Name,
                AssetType              = record.Asset?.Type ?? record.WorkOrder?.Asset?.Type,
                AssetCondition         = record.Asset?.Inspections.OrderByDescending(i => i.InspectionDate).FirstOrDefault()?.Condition,

                PerformedBy            = record.PerformedBy,
                MaintenanceType        = record.MaintenanceType,
                Description            = record.Description,
                WorkStartedAt          = record.WorkStartedAt,
                WorkCompletedAt        = record.WorkCompletedAt,
                Status                 = record.Status,
                MaterialsUsed          = record.MaterialsUsed,
                EquipmentUsed          = record.EquipmentUsed,
                LabourHours            = record.LabourHours,
                ActualCost             = record.ActualCost,
                BeforeImageUrl         = record.BeforeImageUrl,
                AfterImageUrl          = record.AfterImageUrl,
                SafetyChecklist        = record.SafetyChecklist,
                WorkerNotes            = record.WorkerNotes,
                CompletionNotes        = record.CompletionNotes,

                VerificationStatus     = record.VerificationStatus,
                VerifiedBy             = record.VerifiedBy,
                VerifiedAt             = record.VerifiedAt,
                VerificationNotes      = record.VerificationNotes,

                CreatedAt              = record.CreatedAt,
                UpdatedAt              = record.UpdatedAt,
                LatestSafetyAnalysis   = latestAnalysis == null ? null : MapSafetyAnalysis(latestAnalysis),
                AuditLogCount          = record.AuditLogs.Count,
                AuditLogs              = record.AuditLogs.Any()
                    ? record.AuditLogs.OrderByDescending(l => l.Timestamp).Select(l => new MaintenanceAuditLogDto
                    {
                        Id                  = l.Id,
                        MaintenanceRecordId = l.MaintenanceRecordId,
                        UserId              = l.UserId,
                        Action              = l.Action,
                        EntityType          = l.EntityType,
                        EntityId            = l.EntityId,
                        Timestamp           = l.Timestamp,
                        PreviousStatus      = l.PreviousStatus,
                        NewStatus           = l.NewStatus,
                        Description         = l.Description
                    }).ToList()
                    : new List<MaintenanceAuditLogDto>
                    {
                        new MaintenanceAuditLogDto
                        {
                            Id                  = Guid.NewGuid(),
                            MaintenanceRecordId = record.Id,
                            UserId              = string.IsNullOrWhiteSpace(record.PerformedBy) ? "System" : record.PerformedBy,
                            Action              = "RECORD_INITIALIZED",
                            EntityType          = "MaintenanceRecord",
                            EntityId            = record.Id.ToString(),
                            Timestamp           = record.CreatedAt,
                            PreviousStatus      = null,
                            NewStatus           = record.Status,
                            Description         = $"Maintenance operation initialized for Work Order {record.WorkOrder?.WorkOrderNumber ?? record.WorkOrderId.ToString()}."
                        }
                    }
            };
        }

        private static MaintenanceRecordResponseDto MapSummary(MaintenanceRecord r)
        {
            var latestAnalysis = r.SafetyAnalyses.OrderByDescending(s => s.CreatedAt).FirstOrDefault();

            return new MaintenanceRecordResponseDto
            {
                Id                 = r.Id,
                WorkOrderId        = r.WorkOrderId,
                WorkOrderNumber    = r.WorkOrder?.WorkOrderNumber,
                WorkOrderTitle     = r.WorkOrder?.Title,
                WorkOrderPriority  = r.WorkOrder?.Priority,
                WorkOrderSeverity  = r.WorkOrder?.Severity,
                WorkOrderStatus    = r.WorkOrder?.Status,
                EstimatedCost      = r.WorkOrder?.EstimatedCost,
                AssignedCrew       = r.WorkOrder?.AssignedCrew,
                Location           = r.WorkOrder?.Hazard?.Address,
                HazardCategory     = r.WorkOrder?.Hazard?.Category,
                HazardTicket       = r.WorkOrder?.Hazard?.TicketNumber,

                AssetId            = r.AssetId,
                AssetName          = r.Asset?.Name,
                AssetType          = r.Asset?.Type,

                PerformedBy        = r.PerformedBy,
                MaintenanceType    = r.MaintenanceType,
                Description        = r.Description,
                WorkStartedAt      = r.WorkStartedAt,
                WorkCompletedAt    = r.WorkCompletedAt,
                Status             = r.Status,
                LabourHours        = r.LabourHours,
                ActualCost         = r.ActualCost,
                BeforeImageUrl     = r.BeforeImageUrl,
                AfterImageUrl      = r.AfterImageUrl,
                VerificationStatus = r.VerificationStatus,
                VerifiedBy         = r.VerifiedBy,
                VerifiedAt         = r.VerifiedAt,
                CreatedAt          = r.CreatedAt,
                UpdatedAt          = r.UpdatedAt,
                LatestSafetyAnalysis = latestAnalysis == null ? null : MapSafetyAnalysis(latestAnalysis),
                AuditLogCount      = 0
            };
        }

        private static SafetyAnalysisResponseDto MapSafetyAnalysis(MaintenanceSafetyAnalysis s)
        {
            return new SafetyAnalysisResponseDto
            {
                Id                    = s.Id,
                MaintenanceRecordId   = s.MaintenanceRecordId,
                WorkOrderId           = s.WorkOrderId,
                AgentName             = s.AgentName,
                SafetyRiskLevel       = s.SafetyRiskLevel,
                ComplianceStatus      = s.ComplianceStatus,
                Confidence            = s.Confidence,
                IdentifiedRisks       = TryDeserializeList(s.IdentifiedRisksJson),
                MissingRequirements   = TryDeserializeList(s.MissingRequirementsJson),
                RequiredSafetyActions = TryDeserializeList(s.RequiredSafetyActionsJson),
                Recommendation        = s.Recommendation,
                Reason                = s.Reason,
                CreatedAt             = s.CreatedAt
            };
        }

        private static List<string> TryDeserializeList(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }
    }
}
