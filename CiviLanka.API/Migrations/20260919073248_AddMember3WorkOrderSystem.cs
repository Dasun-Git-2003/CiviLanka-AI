using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CiviLanka.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMember3WorkOrderSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    HazardId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssetId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EstimatedCost = table.Column<decimal>(type: "numeric", nullable: true),
                    ApprovedBudget = table.Column<decimal>(type: "numeric", nullable: true),
                    ActualCost = table.Column<decimal>(type: "numeric", nullable: true),
                    EstimatedDurationHours = table.Column<int>(type: "integer", nullable: true),
                    RecommendedCrewSize = table.Column<int>(type: "integer", nullable: true),
                    AssignedContractorId = table.Column<int>(type: "integer", nullable: true),
                    AssignedCrew = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ScheduledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "AI_GENERATED"),
                    ApprovalStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "NOT_REQUIRED"),
                    ApprovalRequired = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkOrders_Contractors_AssignedContractorId",
                        column: x => x.AssignedContractorId,
                        principalTable: "Contractors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WorkOrders_Hazards_HazardId",
                        column: x => x.HazardId,
                        principalTable: "Hazards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkOrders_InfrastructureAssets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "InfrastructureAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CostEstimates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    MaterialCost = table.Column<decimal>(type: "numeric", nullable: false),
                    LabourCost = table.Column<decimal>(type: "numeric", nullable: false),
                    EquipmentCost = table.Column<decimal>(type: "numeric", nullable: false),
                    EstimatedLabourHours = table.Column<double>(type: "double precision", nullable: false),
                    RecommendedCrewSize = table.Column<int>(type: "integer", nullable: false),
                    EstimatedDurationHours = table.Column<double>(type: "double precision", nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    ModelName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostEstimates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CostEstimates_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrderAIAnalyses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric", nullable: false),
                    Recommendation = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderAIAnalyses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkOrderAIAnalyses_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<double>(type: "double precision", nullable: false),
                    Unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EstimatedUnitCost = table.Column<decimal>(type: "numeric", nullable: false),
                    EstimatedTotalCost = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkOrderItems_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CostEstimates_WorkOrderId",
                table: "CostEstimates",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderAIAnalyses_WorkOrderId",
                table: "WorkOrderAIAnalyses",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderItems_WorkOrderId",
                table: "WorkOrderItems",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_AssetId",
                table: "WorkOrders",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_AssignedContractorId",
                table: "WorkOrders",
                column: "AssignedContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_HazardId",
                table: "WorkOrders",
                column: "HazardId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_Priority",
                table: "WorkOrders",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_Status",
                table: "WorkOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_WorkOrderNumber",
                table: "WorkOrders",
                column: "WorkOrderNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CostEstimates");

            migrationBuilder.DropTable(
                name: "WorkOrderAIAnalyses");

            migrationBuilder.DropTable(
                name: "WorkOrderItems");

            migrationBuilder.DropTable(
                name: "WorkOrders");
        }
    }
}
