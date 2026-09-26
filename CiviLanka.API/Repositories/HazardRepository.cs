using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Repositories
{
    public interface IHazardRepository
    {
        Task<Hazard?> GetByIdAsync(Guid id);
        Task<Hazard?> GetByIdWithAnalysesAsync(Guid id);
        Task<List<Hazard>> GetByCitizenIdAsync(string citizenId);
        Task<List<Hazard>> GetAllActiveAsync();
        Task<Hazard> CreateAsync(Hazard hazard);
        Task<Hazard> UpdateAsync(Hazard hazard);
        Task<int> GetNextSequenceAsync();
        Task<bool> ExistsTicketAsync(string ticketNumber);
        Task<HazardAIAnalysis> AddAnalysisAsync(HazardAIAnalysis analysis);
        Task<HazardAIAnalysis?> GetLatestAnalysisAsync(Guid hazardId);
        Task<List<HazardAIAnalysis>> GetAllAnalysesAsync(Guid hazardId);
        Task<bool> DeleteAsync(Guid id);
        Task<(Guid? WorkOrderId, string? WorkOrderNumber, string? WorkOrderStatus)> GetLinkedWorkOrderAsync(Guid hazardId);
        Task<Dictionary<Guid, (Guid Id, string Number, string Status)>> GetAllLinkedWorkOrdersAsync();
    }

    public class HazardRepository : IHazardRepository
    {
        private readonly AppDbContext _db;

        public HazardRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Hazard?> GetByIdAsync(Guid id)
        {
            return await _db.Hazards
                .Include(h => h.Citizen)
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<Hazard?> GetByIdWithAnalysesAsync(Guid id)
        {
            return await _db.Hazards
                .Include(h => h.Citizen)
                .Include(h => h.AIAnalyses)
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<List<Hazard>> GetByCitizenIdAsync(string citizenId)
        {
            return await _db.Hazards
                .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt).Take(1))
                .Where(h => h.CitizenId == citizenId)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Hazard>> GetAllActiveAsync()
        {
            return await _db.Hazards
                .Include(h => h.Citizen)
                .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt).Take(1))
                .Where(h => !h.IsCancelled)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();
        }

        public async Task<Hazard> CreateAsync(Hazard hazard)
        {
            _db.Hazards.Add(hazard);
            await _db.SaveChangesAsync();
            return hazard;
        }

        public async Task<Hazard> UpdateAsync(Hazard hazard)
        {
            hazard.UpdatedAt = DateTime.UtcNow;
            _db.Hazards.Update(hazard);
            await _db.SaveChangesAsync();
            return hazard;
        }

        public async Task<int> GetNextSequenceAsync()
        {
            var currentYear = DateTime.UtcNow.Year;
            var prefix = $"CG-{currentYear}-";

            var ticketNumbers = await _db.Hazards
                .Where(h => h.TicketNumber.StartsWith(prefix))
                .Select(h => h.TicketNumber)
                .ToListAsync();

            int maxSeq = 0;
            foreach (var t in ticketNumbers)
            {
                var numPart = t.Substring(prefix.Length);
                if (int.TryParse(numPart, out int seq) && seq > maxSeq)
                {
                    maxSeq = seq;
                }
            }

            return maxSeq + 1;
        }

        public async Task<bool> ExistsTicketAsync(string ticketNumber)
        {
            return await _db.Hazards.AnyAsync(h => h.TicketNumber == ticketNumber);
        }

        public async Task<HazardAIAnalysis> AddAnalysisAsync(HazardAIAnalysis analysis)
        {
            _db.HazardAIAnalyses.Add(analysis);
            await _db.SaveChangesAsync();
            return analysis;
        }

        public async Task<HazardAIAnalysis?> GetLatestAnalysisAsync(Guid hazardId)
        {
            return await _db.HazardAIAnalyses
                .Where(a => a.HazardId == hazardId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<List<HazardAIAnalysis>> GetAllAnalysesAsync(Guid hazardId)
        {
            return await _db.HazardAIAnalyses
                .Where(a => a.HazardId == hazardId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var hazard = await _db.Hazards
                .Include(h => h.AIAnalyses)
                .FirstOrDefaultAsync(h => h.Id == id);
            if (hazard == null) return false;

            if (hazard.AIAnalyses != null && hazard.AIAnalyses.Count > 0)
            {
                _db.HazardAIAnalyses.RemoveRange(hazard.AIAnalyses);
            }

            _db.Hazards.Remove(hazard);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<(Guid? WorkOrderId, string? WorkOrderNumber, string? WorkOrderStatus)> GetLinkedWorkOrderAsync(Guid hazardId)
        {
            var wo = await _db.WorkOrders
                .Where(w => w.HazardId == hazardId && !w.IsCancelled)
                .Select(w => new { w.Id, w.WorkOrderNumber, w.Status })
                .FirstOrDefaultAsync();

            return wo != null ? (wo.Id, wo.WorkOrderNumber, wo.Status) : (null, null, null);
        }

        public async Task<Dictionary<Guid, (Guid Id, string Number, string Status)>> GetAllLinkedWorkOrdersAsync()
        {
            var list = await _db.WorkOrders
                .Where(w => w.HazardId.HasValue && !w.IsCancelled)
                .Select(w => new { HazardId = w.HazardId!.Value, w.Id, w.WorkOrderNumber, w.Status })
                .ToListAsync();

            var dict = new Dictionary<Guid, (Guid Id, string Number, string Status)>();
            foreach (var item in list)
            {
                if (!dict.ContainsKey(item.HazardId))
                {
                    dict[item.HazardId] = (item.Id, item.WorkOrderNumber, item.Status);
                }
            }
            return dict;
        }
    }
}
