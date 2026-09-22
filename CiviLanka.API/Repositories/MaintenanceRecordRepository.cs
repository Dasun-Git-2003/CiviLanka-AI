using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Repositories
{
    public interface IMaintenanceRecordRepository
    {
        Task<MaintenanceRecord?> GetByIdAsync(Guid id);
        Task<MaintenanceRecord?> GetByIdWithDetailsAsync(Guid id);
        Task<List<MaintenanceRecord>> GetAllActiveAsync();
        Task<List<MaintenanceRecord>> GetByStatusAsync(string status);
        Task<List<MaintenanceRecord>> GetByWorkOrderIdAsync(Guid workOrderId);
        Task<List<MaintenanceRecord>> GetByAssetIdAsync(string assetId);
        Task<List<MaintenanceRecord>> GetByWorkerAsync(string workerId);
        Task<List<MaintenanceRecord>> GetPendingVerificationAsync();
        Task<MaintenanceRecord> CreateAsync(MaintenanceRecord record);
        Task<MaintenanceRecord> UpdateAsync(MaintenanceRecord record);

        Task<MaintenanceSafetyAnalysis> AddSafetyAnalysisAsync(MaintenanceSafetyAnalysis analysis);
        Task<MaintenanceSafetyAnalysis?> GetLatestSafetyAnalysisAsync(Guid maintenanceRecordId);

        Task<MaintenanceAuditLog> AddAuditLogAsync(MaintenanceAuditLog auditLog);
        Task<List<MaintenanceAuditLog>> GetAuditLogsAsync(Guid maintenanceRecordId);
    }

    public class MaintenanceRecordRepository : IMaintenanceRecordRepository
    {
        private readonly AppDbContext _db;

        public MaintenanceRecordRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<MaintenanceRecord?> GetByIdAsync(Guid id) =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                .Include(m => m.Asset)
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        public async Task<MaintenanceRecord?> GetByIdWithDetailsAsync(Guid id) =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Asset)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Include(m => m.AuditLogs)
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        public async Task<List<MaintenanceRecord>> GetAllActiveAsync() =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Where(m => !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

        public async Task<List<MaintenanceRecord>> GetByStatusAsync(string status) =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Where(m => m.Status == status && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

        public async Task<List<MaintenanceRecord>> GetByWorkOrderIdAsync(Guid workOrderId) =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Where(m => m.WorkOrderId == workOrderId && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

        public async Task<List<MaintenanceRecord>> GetByAssetIdAsync(string assetId) =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Where(m => m.AssetId == assetId && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

        public async Task<List<MaintenanceRecord>> GetByWorkerAsync(string workerId)
        {
            var lower = workerId.ToLower();
            return await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Where(m => !m.IsDeleted && (
                    m.PerformedBy == workerId ||
                    m.PerformedBy.ToLower() == lower ||
                    (m.WorkOrder != null && m.WorkOrder.AssignedCrew != null &&
                     (m.WorkOrder.AssignedCrew.Contains(workerId) || m.WorkOrder.AssignedCrew.ToLower().Contains(lower)))
                ))
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<MaintenanceRecord>> GetPendingVerificationAsync() =>
            await _db.MaintenanceRecords
                .Include(m => m.WorkOrder)
                .Include(m => m.Asset)
                .Include(m => m.SafetyAnalyses)
                .Where(m => (m.VerificationStatus == MaintenanceVerificationStatus.Pending ||
                            m.Status == MaintenanceStatus.VerificationPending ||
                            m.Status == MaintenanceStatus.Completed) && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

        public async Task<MaintenanceRecord> CreateAsync(MaintenanceRecord record)
        {
            _db.MaintenanceRecords.Add(record);
            await _db.SaveChangesAsync();
            return record;
        }

        public async Task<MaintenanceRecord> UpdateAsync(MaintenanceRecord record)
        {
            record.UpdatedAt = DateTime.UtcNow;
            _db.MaintenanceRecords.Update(record);
            await _db.SaveChangesAsync();
            return record;
        }

        public async Task<MaintenanceSafetyAnalysis> AddSafetyAnalysisAsync(MaintenanceSafetyAnalysis analysis)
        {
            _db.MaintenanceSafetyAnalyses.Add(analysis);
            await _db.SaveChangesAsync();
            return analysis;
        }

        public async Task<MaintenanceSafetyAnalysis?> GetLatestSafetyAnalysisAsync(Guid maintenanceRecordId) =>
            await _db.MaintenanceSafetyAnalyses
                .Where(s => s.MaintenanceRecordId == maintenanceRecordId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

        public async Task<MaintenanceAuditLog> AddAuditLogAsync(MaintenanceAuditLog auditLog)
        {
            _db.MaintenanceAuditLogs.Add(auditLog);
            await _db.SaveChangesAsync();
            return auditLog;
        }

        public async Task<List<MaintenanceAuditLog>> GetAuditLogsAsync(Guid maintenanceRecordId) =>
            await _db.MaintenanceAuditLogs
                .Where(a => a.MaintenanceRecordId == maintenanceRecordId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
    }
}
