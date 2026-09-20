using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CiviLanka.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMember4MaintenanceSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaintenanceRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    PerformedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MaintenanceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    WorkStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WorkCompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "PENDING"),
                    MaterialsUsed = table.Column<string>(type: "text", nullable: true),
                    EquipmentUsed = table.Column<string>(type: "text", nullable: true),
                    LabourHours = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ActualCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BeforeImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AfterImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SafetyChecklist = table.Column<string>(type: "text", nullable: true),
                    WorkerNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CompletionNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    VerificationStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "NOT_SUBMITTED"),
                    VerifiedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerificationNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceRecords_InfrastructureAssets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "InfrastructureAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MaintenanceRecords_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MaintenanceRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PreviousStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    NewStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceAuditLogs_MaintenanceRecords_MaintenanceRecordId",
                        column: x => x.MaintenanceRecordId,
                        principalTable: "MaintenanceRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceSafetyAnalyses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MaintenanceRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SafetyRiskLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ComplianceStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    IdentifiedRisksJson = table.Column<string>(type: "text", nullable: false),
                    MissingRequirementsJson = table.Column<string>(type: "text", nullable: false),
                    RequiredSafetyActionsJson = table.Column<string>(type: "text", nullable: false),
                    Recommendation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceSafetyAnalyses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceSafetyAnalyses_MaintenanceRecords_MaintenanceRec~",
                        column: x => x.MaintenanceRecordId,
                        principalTable: "MaintenanceRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceAuditLogs_MaintenanceRecordId",
                table: "MaintenanceAuditLogs",
                column: "MaintenanceRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceAuditLogs_Timestamp",
                table: "MaintenanceAuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceAuditLogs_UserId",
                table: "MaintenanceAuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_AssetId",
                table: "MaintenanceRecords",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_PerformedBy",
                table: "MaintenanceRecords",
                column: "PerformedBy");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_Status",
                table: "MaintenanceRecords",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_VerificationStatus",
                table: "MaintenanceRecords",
                column: "VerificationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRecords_WorkOrderId",
                table: "MaintenanceRecords",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceSafetyAnalyses_MaintenanceRecordId",
                table: "MaintenanceSafetyAnalyses",
                column: "MaintenanceRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceSafetyAnalyses_WorkOrderId",
                table: "MaintenanceSafetyAnalyses",
                column: "WorkOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaintenanceAuditLogs");

            migrationBuilder.DropTable(
                name: "MaintenanceSafetyAnalyses");

            migrationBuilder.DropTable(
                name: "MaintenanceRecords");
        }
    }
}
