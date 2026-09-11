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
        public DbSet<Contractor> Contractors { get; set; }
        public DbSet<WorkAssignment> WorkAssignments { get; set; }

        // ── Member 3 – add WorkOrders etc. here ─────────────────────────────────
        // public DbSet<WorkOrder> WorkOrders { get; set; }

        // ── Member 4 – add BudgetLogs, AuditRecords etc. here ───────────────────
        // public DbSet<BudgetLog> BudgetLogs { get; set; }


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
        }
    }
}
