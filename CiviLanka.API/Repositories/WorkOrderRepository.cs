using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Repositories
{
    public interface IWorkOrderRepository
    {
        Task<WorkOrder?> GetByIdAsync(Guid id);
        Task<WorkOrder?> GetByIdWithDetailsAsync(Guid id);
        Task<List<WorkOrder>> GetAllActiveAsync();
        Task<List<WorkOrder>> GetByStatusAsync(string status);
        Task<List<WorkOrder>> GetByHazardIdAsync(Guid hazardId);
        Task<List<WorkOrder>> GetPendingApprovalAsync();
        Task<WorkOrder> CreateAsync(WorkOrder workOrder);
        Task<WorkOrder> UpdateAsync(WorkOrder workOrder);
        Task<int> GetNextSequenceAsync();
        Task<bool> ExistsWorkOrderNumberAsync(string number);
        Task<CostEstimate> AddCostEstimateAsync(CostEstimate estimate);
        Task<CostEstimate?> GetLatestCostEstimateAsync(Guid workOrderId);
        Task<WorkOrderAIAnalysis> AddAIAnalysisAsync(WorkOrderAIAnalysis analysis);
        Task<WorkOrderAIAnalysis?> GetLatestAIAnalysisAsync(Guid workOrderId);
        Task AddItemsAsync(IEnumerable<WorkOrderItem> items);
        Task RemoveItemsAsync(Guid workOrderId);
    }

    public class WorkOrderRepository : IWorkOrderRepository
    {
        private readonly AppDbContext _db;

        public WorkOrderRepository(AppDbContext db) => _db = db;

        public async Task<WorkOrder?> GetByIdAsync(Guid id) =>
            await _db.WorkOrders
                .Include(w => w.Hazard)
                .Include(w => w.Asset)
                .Include(w => w.AssignedContractor)
                .FirstOrDefaultAsync(w => w.Id == id);

        public async Task<WorkOrder?> GetByIdWithDetailsAsync(Guid id) =>
            await _db.WorkOrders
                .Include(w => w.Hazard)
                    .ThenInclude(h => h!.AIAnalyses)
                .Include(w => w.Asset)
                    .ThenInclude(a => a!.Inspections)
                .Include(w => w.AssignedContractor)
                .Include(w => w.Items)
                .Include(w => w.CostEstimates)
                .Include(w => w.AIAnalyses)
                .FirstOrDefaultAsync(w => w.Id == id);

        public async Task<List<WorkOrder>> GetAllActiveAsync() =>
            await _db.WorkOrders
                .Include(w => w.Hazard)
                .Include(w => w.Asset)
                .Include(w => w.AssignedContractor)
                .Include(w => w.CostEstimates)
                .Where(w => !w.IsCancelled)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

        public async Task<List<WorkOrder>> GetByStatusAsync(string status) =>
            await _db.WorkOrders
                .Include(w => w.Hazard)
                .Include(w => w.Asset)
                .Include(w => w.CostEstimates)
                .Where(w => w.Status == status && !w.IsCancelled)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

        public async Task<List<WorkOrder>> GetByHazardIdAsync(Guid hazardId) =>
            await _db.WorkOrders
                .Include(w => w.Asset)
                .Include(w => w.CostEstimates)
                .Where(w => w.HazardId == hazardId)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

        public async Task<List<WorkOrder>> GetPendingApprovalAsync() =>
            await _db.WorkOrders
                .Include(w => w.Hazard)
                .Include(w => w.Asset)
                .Include(w => w.CostEstimates)
                .Where(w => w.ApprovalStatus == Models.ApprovalStatus.Pending && !w.IsCancelled)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

        public async Task<WorkOrder> CreateAsync(WorkOrder workOrder)
        {
            _db.WorkOrders.Add(workOrder);
            await _db.SaveChangesAsync();
            return workOrder;
        }

        public async Task<WorkOrder> UpdateAsync(WorkOrder workOrder)
        {
            workOrder.UpdatedAt = DateTime.UtcNow;
            _db.WorkOrders.Update(workOrder);
            await _db.SaveChangesAsync();
            return workOrder;
        }

        public async Task<int> GetNextSequenceAsync()
        {
            var currentYear = DateTime.UtcNow.Year;
            var prefix = $"WO-{currentYear}-";

            var orderNumbers = await _db.WorkOrders
                .Where(w => w.WorkOrderNumber.StartsWith(prefix))
                .Select(w => w.WorkOrderNumber)
                .ToListAsync();

            int maxSeq = 0;
            foreach (var num in orderNumbers)
            {
                var numPart = num.Substring(prefix.Length);
                if (int.TryParse(numPart, out int seq) && seq > maxSeq)
                {
                    maxSeq = seq;
                }
            }

            return maxSeq + 1;
        }

        public async Task<bool> ExistsWorkOrderNumberAsync(string number)
        {
            return await _db.WorkOrders.AnyAsync(w => w.WorkOrderNumber == number);
        }

        public async Task<CostEstimate> AddCostEstimateAsync(CostEstimate estimate)
        {
            _db.CostEstimates.Add(estimate);
            await _db.SaveChangesAsync();
            return estimate;
        }

        public async Task<CostEstimate?> GetLatestCostEstimateAsync(Guid workOrderId) =>
            await _db.CostEstimates
                .Where(c => c.WorkOrderId == workOrderId)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

        public async Task<WorkOrderAIAnalysis> AddAIAnalysisAsync(WorkOrderAIAnalysis analysis)
        {
            _db.WorkOrderAIAnalyses.Add(analysis);
            await _db.SaveChangesAsync();
            return analysis;
        }

        public async Task<WorkOrderAIAnalysis?> GetLatestAIAnalysisAsync(Guid workOrderId) =>
            await _db.WorkOrderAIAnalyses
                .Where(a => a.WorkOrderId == workOrderId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

        public async Task AddItemsAsync(IEnumerable<WorkOrderItem> items)
        {
            _db.WorkOrderItems.AddRange(items);
            await _db.SaveChangesAsync();
        }

        public async Task RemoveItemsAsync(Guid workOrderId)
        {
            var existing = await _db.WorkOrderItems
                .Where(i => i.WorkOrderId == workOrderId)
                .ToListAsync();
            _db.WorkOrderItems.RemoveRange(existing);
            await _db.SaveChangesAsync();
        }
    }
}
