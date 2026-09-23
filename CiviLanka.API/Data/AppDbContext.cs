using CiviLanka.API.Models;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Data
{
    /// <summary>
    /// Shared application database context for all team members.
    /// Member 1 owns: Hazards, HazardAIAnalyses.
    /// Other members should add their DbSet entries here.
    /// </summary>
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ── Member 1 ────────────────────────────────────────────────────────────
        public DbSet<Hazard> Hazards { get; set; }
        public DbSet<HazardAIAnalysis> HazardAIAnalyses { get; set; }

        // ── Member 2 – Infrastructure & Asset Registry ──────────────────────────
        public DbSet<InfrastructureAsset> InfrastructureAssets { get; set; }
        public DbSet<AssetInspection> AssetInspections { get; set; }
        public DbSet<AssetRiskAnalysis> AssetRiskAnalyses { get; set; }
        public DbSet<Contractor> Contractors { get; set; }
        public DbSet<WorkAssignment> WorkAssignments { get; set; }

        // ── Member 3 – Work orders and AI planning ────────────────────────────
        public DbSet<WorkOrder> WorkOrders { get; set; }
        public DbSet<WorkOrderItem> WorkOrderItems { get; set; }
        public DbSet<CostEstimate> CostEstimates { get; set; }
        public DbSet<WorkOrderAIAnalysis> WorkOrderAIAnalyses { get; set; }

        // ── Member 4 – Maintenance Records, Field Ops & Safety Compliance ───
        public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }
        public DbSet<MaintenanceSafetyAnalysis> MaintenanceSafetyAnalyses { get; set; }
        public DbSet<MaintenanceAuditLog> MaintenanceAuditLogs { get; set; }


        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ── Hazard ──────────────────────────────────────────────────────────
            builder.Entity<Hazard>(entity =>
            {
                entity.HasKey(h => h.Id);

                entity.HasIndex(h => h.TicketNumber).IsUnique();
                entity.HasIndex(h => h.CitizenId);
                entity.HasIndex(h => h.Status);
                entity.HasIndex(h => new { h.Latitude, h.Longitude });

                entity.Property(h => h.TicketNumber).IsRequired().HasMaxLength(20);
                entity.Property(h => h.Category).IsRequired().HasMaxLength(50);
                entity.Property(h => h.Description).IsRequired();
                entity.Property(h => h.Status).IsRequired().HasMaxLength(30).HasDefaultValue(HazardStatus.Submitted);
                entity.Property(h => h.IsCancelled).HasDefaultValue(false);

                entity.HasOne(h => h.Citizen)
                      .WithMany(u => u.Hazards)
                      .HasForeignKey(h => h.CitizenId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(h => h.AIAnalyses)
                      .WithOne(a => a.Hazard)
                      .HasForeignKey(a => a.HazardId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ── HazardAIAnalysis ────────────────────────────────────────────────
            builder.Entity<HazardAIAnalysis>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.HasIndex(a => a.HazardId);
                entity.Property(a => a.Severity).IsRequired().HasMaxLength(20);
                entity.Property(a => a.RiskLevel).IsRequired().HasMaxLength(20);
                entity.Property(a => a.Priority).IsRequired().HasMaxLength(20);
                entity.Property(a => a.ModelName).HasMaxLength(100);
            });

            // ── Member 2: InfrastructureAsset ──────────────────────────────────
            builder.Entity<InfrastructureAsset>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.HasIndex(a => a.Type);
                entity.HasIndex(a => a.Status);
                entity.HasIndex(a => new { a.Latitude, a.Longitude });

                entity.Property(a => a.Id).IsRequired().HasMaxLength(20);
                entity.Property(a => a.Name).IsRequired().HasMaxLength(150);
                entity.Property(a => a.Type).IsRequired().HasMaxLength(50);
                entity.Property(a => a.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Active");
                entity.Property(a => a.Location).IsRequired().HasMaxLength(200);

                entity.HasMany(a => a.Inspections)
                      .WithOne(i => i.Asset)
                      .HasForeignKey(i => i.AssetId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(a => a.WorkAssignments)
                      .WithOne(w => w.Asset)
                      .HasForeignKey(w => w.AssetId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // ── Member 2: AssetInspection ──────────────────────────────────────
            builder.Entity<AssetInspection>(entity =>
            {
                entity.HasKey(i => i.Id);
                entity.HasIndex(i => i.AssetId);
                entity.HasIndex(i => i.Condition);
                entity.HasIndex(i => i.InspectionDate);

                entity.Property(i => i.AssetId).IsRequired().HasMaxLength(20);
                entity.Property(i => i.Condition).IsRequired().HasMaxLength(30);
                entity.Property(i => i.IssuesFound).HasMaxLength(500);
                entity.Property(i => i.Notes).HasMaxLength(2000);
            });

            // ── Member 2: AssetRiskAnalysis ────────────────────────────────────
            builder.Entity<AssetRiskAnalysis>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.HasIndex(r => r.AssetId);
                entity.HasIndex(r => r.RiskLevel);
                entity.Property(r => r.AssetId).IsRequired().HasMaxLength(20);
                entity.Property(r => r.RiskLevel).IsRequired().HasMaxLength(20);
                entity.Property(r => r.ConditionAssessment).HasMaxLength(50);
                entity.Property(r => r.FailureLikelihood).HasMaxLength(30);
                entity.Property(r => r.Urgency).HasMaxLength(30);
                entity.Property(r => r.ModelName).HasMaxLength(100);

                entity.HasOne(r => r.Asset)
                      .WithMany()
                      .HasForeignKey(r => r.AssetId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ── Member 2: Contractor ───────────────────────────────────────────
            builder.Entity<Contractor>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.HasIndex(c => c.Specialization);
                entity.HasIndex(c => c.IsAvailable);

                entity.Property(c => c.Name).IsRequired().HasMaxLength(150);
                entity.Property(c => c.Specialization).IsRequired().HasMaxLength(100);
                entity.Property(c => c.Location).IsRequired().HasMaxLength(200);
                entity.Property(c => c.Phone).IsRequired().HasMaxLength(50);
                entity.Property(c => c.IsAvailable).HasDefaultValue(true);

                entity.HasMany(c => c.Assignments)
                      .WithOne(w => w.Contractor)
                      .HasForeignKey(w => w.ContractorId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ── Member 2: WorkAssignment ───────────────────────────────────────
            builder.Entity<WorkAssignment>(entity =>
            {
                entity.HasKey(w => w.Id);
                entity.HasIndex(w => w.ContractorId);
                entity.HasIndex(w => w.AssetId);
                entity.HasIndex(w => w.Status);
                entity.HasIndex(w => w.Priority);

                entity.Property(w => w.AssetName).IsRequired().HasMaxLength(150);
                entity.Property(w => w.AssetType).IsRequired().HasMaxLength(50);
                entity.Property(w => w.Priority).IsRequired().HasMaxLength(20).HasDefaultValue("Medium");
                entity.Property(w => w.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Pending");
            });

            // ── Member 3: WorkOrder ─────────────────────────────────────────────
            builder.Entity<WorkOrder>(entity =>
            {
                entity.HasKey(w => w.Id);
                entity.HasIndex(w => w.WorkOrderNumber).IsUnique();
                entity.HasIndex(w => w.HazardId);
                entity.HasIndex(w => w.AssetId);
                entity.HasIndex(w => w.Status);
                entity.HasIndex(w => w.Priority);

                entity.Property(w => w.WorkOrderNumber).IsRequired().HasMaxLength(20);
                entity.Property(w => w.Title).IsRequired().HasMaxLength(200);
                entity.Property(w => w.Description).IsRequired();
                entity.Property(w => w.Priority).IsRequired().HasMaxLength(20);
                entity.Property(w => w.Status).IsRequired().HasMaxLength(30).HasDefaultValue(WorkOrderStatus.AiGenerated);
                entity.Property(w => w.ApprovalStatus).IsRequired().HasMaxLength(30).HasDefaultValue(ApprovalStatus.NotRequired);
                entity.Property(w => w.CreatedBy).IsRequired().HasMaxLength(200);

                entity.HasOne(w => w.Hazard)
                      .WithMany()
                      .HasForeignKey(w => w.HazardId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(w => w.Asset)
                      .WithMany()
                      .HasForeignKey(w => w.AssetId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(w => w.Items)
                      .WithOne(i => i.WorkOrder)
                      .HasForeignKey(i => i.WorkOrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(w => w.CostEstimates)
                      .WithOne(c => c.WorkOrder)
                      .HasForeignKey(c => c.WorkOrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(w => w.AIAnalyses)
                      .WithOne(a => a.WorkOrder)
                      .HasForeignKey(a => a.WorkOrderId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<WorkOrderItem>(entity =>
            {
                entity.HasKey(i => i.Id);
                entity.HasIndex(i => i.WorkOrderId);
                entity.Property(i => i.ItemName).IsRequired().HasMaxLength(200);
                entity.Property(i => i.Unit).HasMaxLength(50);
            });

            builder.Entity<CostEstimate>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.HasIndex(c => c.WorkOrderId);
                entity.Property(c => c.Currency).HasMaxLength(10);
                entity.Property(c => c.ModelName).HasMaxLength(100);
            });

            builder.Entity<WorkOrderAIAnalysis>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.HasIndex(a => a.WorkOrderId);
                entity.Property(a => a.AgentName).HasMaxLength(100);
            });

            // ── Member 4: MaintenanceRecord ─────────────────────────────────────
            builder.Entity<MaintenanceRecord>(entity =>
            {
                entity.HasKey(m => m.Id);
                entity.HasIndex(m => m.WorkOrderId);
                entity.HasIndex(m => m.AssetId);
                entity.HasIndex(m => m.Status);
                entity.HasIndex(m => m.PerformedBy);
                entity.HasIndex(m => m.VerificationStatus);

                entity.Property(m => m.PerformedBy).IsRequired().HasMaxLength(100);
                entity.Property(m => m.MaintenanceType).IsRequired().HasMaxLength(50);
                entity.Property(m => m.Description).IsRequired().HasMaxLength(1000);
                entity.Property(m => m.Status).IsRequired().HasMaxLength(30).HasDefaultValue(MaintenanceStatus.Pending);
                entity.Property(m => m.VerificationStatus).IsRequired().HasMaxLength(30).HasDefaultValue(MaintenanceVerificationStatus.NotSubmitted);

                entity.HasOne(m => m.WorkOrder)
                      .WithMany()
                      .HasForeignKey(m => m.WorkOrderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Asset)
                      .WithMany()
                      .HasForeignKey(m => m.AssetId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(m => m.SafetyAnalyses)
                      .WithOne(s => s.MaintenanceRecord)
                      .HasForeignKey(s => s.MaintenanceRecordId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(m => m.AuditLogs)
                      .WithOne(a => a.MaintenanceRecord)
                      .HasForeignKey(a => a.MaintenanceRecordId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<MaintenanceSafetyAnalysis>(entity =>
            {
                entity.HasKey(s => s.Id);
                entity.HasIndex(s => s.MaintenanceRecordId);
                entity.HasIndex(s => s.WorkOrderId);
                entity.Property(s => s.AgentName).IsRequired().HasMaxLength(50);
                entity.Property(s => s.SafetyRiskLevel).IsRequired().HasMaxLength(20);
                entity.Property(s => s.ComplianceStatus).IsRequired().HasMaxLength(30);
            });

            builder.Entity<MaintenanceAuditLog>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.HasIndex(a => a.MaintenanceRecordId);
                entity.HasIndex(a => a.UserId);
                entity.HasIndex(a => a.Timestamp);
                entity.Property(a => a.UserId).IsRequired().HasMaxLength(100);
                entity.Property(a => a.Action).IsRequired().HasMaxLength(100);
                entity.Property(a => a.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(a => a.EntityId).IsRequired().HasMaxLength(100);
            });
        }
    }
}
