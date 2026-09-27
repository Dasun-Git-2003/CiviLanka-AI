using CiviLanka.API.Agents;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Services;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using CiviLanka.API.Models.Infrastructure;
using CiviLanka.API.Repositories;
using CiviLanka.API.Services;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── PostgreSQL + Entity Framework Core ─────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── ASP.NET Core Identity ──────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ── JWT Authentication ─────────────────────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "CiviLanka-SuperSecret-Key-Change-In-Production-2026!";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization(options =>
{
    // 1. Citizen Hazard Policies
    options.AddPolicy("CanReportHazard", policy =>
        policy.RequireRole("Citizen"));
    options.AddPolicy("CanManageHazards", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));

    // 2. Infrastructure Policies
    options.AddPolicy("CanViewInfrastructure", policy =>
        policy.RequireRole("Citizen", "FieldWorker", "FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));
    options.AddPolicy("CanManageInfrastructure", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));

    // 3. Work Order Policies
    options.AddPolicy("CanCreateWorkOrder", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));
    options.AddPolicy("CanManageWorkOrders", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));
    options.AddPolicy("CanApproveWorkOrder", policy =>
        policy.RequireRole("PublicWorksDirector", "Director"));

    // 4. Maintenance & Operations Policies
    options.AddPolicy("CanManageMaintenance", policy =>
        policy.RequireRole("FieldWorker", "FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));
    options.AddPolicy("CanVerifyMaintenance", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director"));

    // 5. AI Intelligence Policies
    options.AddPolicy("CanViewAIAnalysis", policy =>
        policy.RequireRole("FieldWorker", "FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));

    // 6. Contractor Policies
    options.AddPolicy("CanManageContractors", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director", "MunicipalStaff"));

    // 7. Budget Policies
    options.AddPolicy("CanViewBudget", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director"));
    options.AddPolicy("CanManageBudget", policy =>
        policy.RequireRole("PublicWorksDirector", "Director"));

    // 8. Audit & Administration Policies
    options.AddPolicy("CanViewAuditLogs", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director"));
    options.AddPolicy("CanManageUsers", policy =>
        policy.RequireRole("PublicWorksDirector", "Director"));
    options.AddPolicy("CanManageSettings", policy =>
        policy.RequireRole("FieldMaintenanceSupervisor", "PublicWorksDirector", "Director"));
});

// ── CORS (for React dashboard from other members) ──────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();

        // Allow all origins in development
        if (builder.Environment.IsDevelopment())
            policy.SetIsOriginAllowed(_ => true);
    });
});

// ── HTTP Client (for Nominatim Geocoding) ─────────────────────────────────────
builder.Services.AddHttpClient<IGeocodingService, GeocodingService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});

// ── Application Services (Member 1) ───────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IHazardRepository, HazardRepository>();
builder.Services.AddScoped<IHazardService, HazardService>();
builder.Services.AddScoped<IHazardClassificationAgent, HazardClassificationAgent>();

// ── Application Services (Member 3 — Work Orders) ────────────────────────────
builder.Services.AddScoped<IWorkOrderRepository, WorkOrderRepository>();
builder.Services.AddScoped<IWorkOrderService, WorkOrderService>();
builder.Services.AddScoped<ICostEstimatorAgent, CostEstimatorAgent>();

// ── Application Services (Member 4 — Maintenance & Safety Compliance) ────────
builder.Services.AddScoped<IMaintenanceRecordRepository, MaintenanceRecordRepository>();
builder.Services.AddScoped<IMaintenanceRecordService, MaintenanceRecordService>();
builder.Services.AddScoped<ISafetyComplianceAgent, SafetyComplianceAgent>();

// ── AI Agent Layer Services ──────────────────────────────────────────────────
builder.Services.Configure<AISettings>(builder.Configuration.GetSection(AISettings.SectionName));
builder.Services.AddHttpClient<IAIService, GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(35);
});
builder.Services.AddHttpClient<IAgentServiceClient, AgentServiceClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddScoped<IAIResponseValidator, AIResponseValidator>();
builder.Services.AddScoped<IAIConfidenceService, AIConfidenceService>();
builder.Services.AddScoped<IAIContextBuilder, AIContextBuilder>();

// Specialized Agents
builder.Services.AddScoped<IAIAgent<HazardClassificationInput, HazardClassificationResult>, CiviLanka.API.AI.Agents.HazardClassificationAgent>();
builder.Services.AddScoped<IAIAgent<AssetRiskInput, AssetRiskResult>, CiviLanka.API.AI.Agents.AssetRiskPredictionAgent>();
builder.Services.AddScoped<IAIAgent<CostEstimateInput, CostEstimateResult>, CiviLanka.API.AI.Agents.CostMaterialEstimatorAgent>();
builder.Services.AddScoped<IAIAgent<SafetyComplianceInput, SafetyComplianceResult>, CiviLanka.API.AI.Agents.SafetyComplianceAgent>();
builder.Services.AddScoped<IAIAgent<DispatchPriorityInput, DispatchPriorityResult>, CiviLanka.API.AI.Agents.DispatchPriorityAgent>();
builder.Services.AddScoped<IAIAgent<MunicipalSafetyAuditInput, MunicipalSafetyAuditResult>, CiviLanka.API.AI.Agents.MunicipalSafetyAuditAgent>();

// Orchestrator
builder.Services.AddScoped<IAIAgentOrchestrator, AIAgentOrchestrator>();

// ── Controllers + Static Files ────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── Swagger / OpenAPI ──────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "CivitaGuard AI — Municipal Infrastructure API",
        Version = "v1",
        Description = "Member 1: Citizen Hazard Reporting & AI Classification. " +
                      "Members 2–4 extend this shared backend.",
        Contact = new OpenApiContact { Name = "CiviLanka Team", Email = "team@civilanka.lk" }
    });

    // JWT in Swagger UI
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your_jwt_token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ── Auto-apply migrations and seed roles on startup ───────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    try
    {
        db.Database.Migrate();

        // Seed user roles
        string[] roles = { "Citizen", "MunicipalStaff", "Director", "PublicWorksDirector", "FieldMaintenanceSupervisor", "FieldWorker" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed demo accounts for municipal roles
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await SeedDemoUsersAsync(userManager);

        // Seed Member 2: Infrastructure Assets & Contractors
        await SeedMember2DataAsync(db);

        // Seed Sample Hazards, Work Orders, Maintenance Records, and AI Analyses
        await SampleDataSeeder.SeedAllSampleDataAsync(db, userManager);
    }

    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Database migration/seeding failed. Ensure PostgreSQL is running and connection string is correct.");
    }
}

// ── Middleware Pipeline ────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CivitaGuard AI v1");
        c.RoutePrefix = string.Empty; // Serve Swagger at root
    });
}

app.UseHttpsRedirection();

// Serve uploaded images as static files
app.UseStaticFiles();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    service = "CivitaGuard AI — Member 1",
    version = "1.0.0"
}));

app.Run();

// ── Member 2 Seeding Helper ──────────────────────────────────────────────────
static async Task SeedMember2DataAsync(AppDbContext db)
{
    if (!await db.InfrastructureAssets.AnyAsync())
    {
        var assets = new List<InfrastructureAsset>
        {
            new InfrastructureAsset
            {
                Id = "AST-001",
                Name = "Main St Water Pipe",
                Type = "Water",
                Status = "Active",
                Location = "Downtown, Colombo",
                InstallationDate = new DateTime(2008, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                Latitude = 6.9271,
                Longitude = 79.8612,
                Description = "Primary water supply pipe running along Main Street.",
                CreatedAt = DateTime.UtcNow,
                Inspections = new List<AssetInspection>
                {
                    new AssetInspection
                    {
                        InspectionDate = new DateTime(2026, 8, 10, 0, 0, 0, DateTimeKind.Utc),
                        Condition = "Poor",
                        IssuesFound = "Small leakage near junction",
                        Notes = "Corrosion detected on south end. Replacement recommended within 6 months.",
                        InspectorName = "Engineer Perera",
                        CreatedAt = DateTime.UtcNow
                    }
                }
            },
            new InfrastructureAsset
            {
                Id = "AST-002",
                Name = "Oak Ave Streetlight",
                Type = "Electrical",
                Status = "Active",
                Location = "Northside, Colombo",
                InstallationDate = new DateTime(2015, 3, 22, 0, 0, 0, DateTimeKind.Utc),
                Latitude = 6.9310,
                Longitude = 79.8450,
                Description = "LED streetlight grid along Oak Avenue.",
                CreatedAt = DateTime.UtcNow,
                Inspections = new List<AssetInspection>
                {
                    new AssetInspection
                    {
                        InspectionDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
                        Condition = "Good",
                        IssuesFound = null,
                        Notes = "All lights operational. Solar battery clean.",
                        InspectorName = "Inspector Silva",
                        CreatedAt = DateTime.UtcNow
                    }
                }
            },
            new InfrastructureAsset
            {
                Id = "AST-003",
                Name = "Central Park Pathway",
                Type = "Civil",
                Status = "Active",
                Location = "City Center, Colombo",
                InstallationDate = new DateTime(2011, 11, 30, 0, 0, 0, DateTimeKind.Utc),
                Latitude = 6.9050,
                Longitude = 79.8510,
                Description = "Pedestrian pathway through Central Park.",
                CreatedAt = DateTime.UtcNow
            },
            new InfrastructureAsset
            {
                Id = "AST-004",
                Name = "Galle Rd Bridge",
                Type = "Roads & Bridges",
                Status = "Active",
                Location = "Colombo 03",
                InstallationDate = new DateTime(2005, 1, 10, 0, 0, 0, DateTimeKind.Utc),
                Latitude = 6.9180,
                Longitude = 79.8580,
                Description = "Major bridge over canal on Galle Road.",
                CreatedAt = DateTime.UtcNow,
                Inspections = new List<AssetInspection>
                {
                    new AssetInspection
                    {
                        InspectionDate = new DateTime(2026, 8, 25, 0, 0, 0, DateTimeKind.Utc),
                        Condition = "Poor",
                        IssuesFound = "Deck concrete spalling and barrier damage",
                        Notes = "Requires structural resurfacing and barrier replacement.",
                        InspectorName = "Lead Inspector Fernando",
                        CreatedAt = DateTime.UtcNow
                    }
                }
            },
            new InfrastructureAsset
            {
                Id = "AST-005",
                Name = "Negombo Rd Drain",
                Type = "Sanitation",
                Status = "Active",
                Location = "Wattala",
                InstallationDate = new DateTime(2018, 5, 12, 0, 0, 0, DateTimeKind.Utc),
                Latitude = 6.9400,
                Longitude = 79.8530,
                Description = "Stormwater culvert and canal drain.",
                CreatedAt = DateTime.UtcNow,
                Inspections = new List<AssetInspection>
                {
                    new AssetInspection
                    {
                        InspectionDate = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                        Condition = "Moderate",
                        IssuesFound = "Silt accumulation reducing flow capacity by 30%",
                        Notes = "Routine dredging scheduled.",
                        InspectorName = "Inspector Silva",
                        CreatedAt = DateTime.UtcNow
                    }
                }
            }
        };

        db.InfrastructureAssets.AddRange(assets);
        await db.SaveChangesAsync();
    }

    if (!await db.Contractors.AnyAsync())
    {
        var contractors = new List<Contractor>
        {
            new Contractor
            {
                Name = "Acme Civil Works",
                Specialization = "Roads & Bridges",
                Location = "City Center",
                Phone = "011-234-5678",
                Email = "info@acmecivil.lk",
                Rating = 4.8,
                IsAvailable = true,
                JobCount = 24,
                CreatedAt = DateTime.UtcNow
            },
            new Contractor
            {
                Name = "ElectroFix Pro",
                Specialization = "Electrical",
                Location = "North District",
                Phone = "011-987-6543",
                Email = "work@electrofixpro.lk",
                Rating = 4.5,
                IsAvailable = false,
                JobCount = 24,
                CreatedAt = DateTime.UtcNow
            },
            new Contractor
            {
                Name = "AquaFlow Utilities",
                Specialization = "Water & Plumbing",
                Location = "South District",
                Phone = "011-555-1234",
                Email = "ops@aquaflow.lk",
                Rating = 4.9,
                IsAvailable = true,
                JobCount = 24,
                CreatedAt = DateTime.UtcNow
            }
        };

        db.Contractors.AddRange(contractors);
        await db.SaveChangesAsync();
    }
}

// ── Seed Demo Accounts Helper ────────────────────────────────────────────────
static async Task SeedDemoUsersAsync(UserManager<ApplicationUser> userManager)
{
    var demoUsers = new[]
    {
        (Email: "director@civilanka.gov.lk", Name: "Eng. Sunil Wickramasinghe", Role: "PublicWorksDirector", AdditionalRoles: new[] { "Director", "MunicipalStaff" }),
        (Email: "supervisor@civilanka.gov.lk", Name: "Kavinda Bandara", Role: "FieldMaintenanceSupervisor", AdditionalRoles: new[] { "MunicipalStaff" }),
        (Email: "staff@civilanka.gov.lk", Name: "Nimal Perera", Role: "MunicipalStaff", AdditionalRoles: Array.Empty<string>()),
        (Email: "worker@civilanka.gov.lk", Name: "Ruwan Jayawardena", Role: "FieldWorker", AdditionalRoles: Array.Empty<string>()),
        (Email: "citizen@civilanka.gov.lk", Name: "Anura Fernando", Role: "Citizen", AdditionalRoles: Array.Empty<string>()),

        // Standard RBAC test accounts
        (Email: "citizen@test.com", Name: "Test Citizen", Role: "Citizen", AdditionalRoles: Array.Empty<string>()),
        (Email: "fieldworker@test.com", Name: "Test FieldWorker", Role: "FieldWorker", AdditionalRoles: Array.Empty<string>()),
        (Email: "supervisor@test.com", Name: "Test Supervisor", Role: "FieldMaintenanceSupervisor", AdditionalRoles: new[] { "MunicipalStaff" }),
        (Email: "director@test.com", Name: "Test Director", Role: "PublicWorksDirector", AdditionalRoles: new[] { "Director", "MunicipalStaff" })
    };

    foreach (var u in demoUsers)
    {
        var existing = await userManager.FindByEmailAsync(u.Email);
        if (existing == null)
        {
            var user = new ApplicationUser
            {
                UserName = u.Email,
                Email = u.Email,
                FullName = u.Name,
                Role = u.Role,
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(user, "Director123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, u.Role);
                foreach (var extraRole in u.AdditionalRoles)
                {
                    await userManager.AddToRoleAsync(user, extraRole);
                }
            }
        }
    }
}

