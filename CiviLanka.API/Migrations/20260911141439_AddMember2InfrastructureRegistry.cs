using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CiviLanka.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMember2InfrastructureRegistry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Contractors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Specialization = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Rating = table.Column<double>(type: "double precision", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    JobCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contractors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InfrastructureAssets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    InstallationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InfrastructureAssets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AssetInspections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AssetId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InspectionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Condition = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IssuesFound = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    InspectorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetInspections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetInspections_InfrastructureAssets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "InfrastructureAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContractorId = table.Column<int>(type: "integer", nullable: false),
                    AssetId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AssetName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    AssetType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Medium"),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ActualCost = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkAssignments_Contractors_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "Contractors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkAssignments_InfrastructureAssets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "InfrastructureAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssetInspections_AssetId",
                table: "AssetInspections",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetInspections_Condition",
                table: "AssetInspections",
                column: "Condition");

            migrationBuilder.CreateIndex(
                name: "IX_AssetInspections_InspectionDate",
                table: "AssetInspections",
                column: "InspectionDate");

            migrationBuilder.CreateIndex(
                name: "IX_Contractors_IsAvailable",
                table: "Contractors",
                column: "IsAvailable");

            migrationBuilder.CreateIndex(
                name: "IX_Contractors_Specialization",
                table: "Contractors",
                column: "Specialization");

            migrationBuilder.CreateIndex(
                name: "IX_InfrastructureAssets_Latitude_Longitude",
                table: "InfrastructureAssets",
                columns: new[] { "Latitude", "Longitude" });

            migrationBuilder.CreateIndex(
                name: "IX_InfrastructureAssets_Status",
                table: "InfrastructureAssets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_InfrastructureAssets_Type",
                table: "InfrastructureAssets",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_WorkAssignments_AssetId",
                table: "WorkAssignments",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkAssignments_ContractorId",
                table: "WorkAssignments",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkAssignments_Priority",
                table: "WorkAssignments",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_WorkAssignments_Status",
                table: "WorkAssignments",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetInspections");

            migrationBuilder.DropTable(
                name: "WorkAssignments");

            migrationBuilder.DropTable(
                name: "Contractors");

            migrationBuilder.DropTable(
                name: "InfrastructureAssets");
        }
    }
}
