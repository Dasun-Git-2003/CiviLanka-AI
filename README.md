# CivitaGuard AI — Member 1: Citizen Hazard Management

> **Project**: CivitaGuard AI – Municipal Infrastructure Hazard & Maintenance Work-Order System  
> **Member**: 1 — Citizen Incident Reporting & Hazard Classification  
> **Stack**: ASP.NET Core 8 · PostgreSQL · Semantic Kernel + Gemini · Flutter 3.x

---

## Repository Structure

```
CiviLanka-AI/
├── CiviLanka.API/          ← Shared ASP.NET Core 8 backend (Members 1 & 2)
├── CiviLanka.App/          ← Flutter citizen mobile app (Member 1)
├── CiviLanka.Web/          ← React + Vite municipal dashboard (Member 2)
└── CiviLanka.Agent/        ← Agentic AI RAG system with BM25 + Vector Search (Member 2)
```

---

## Prerequisites

| Tool       | Version                  |
| ---------- | ------------------------ |
| .NET SDK   | 8.0+                     |
| PostgreSQL | 14+                      |
| Flutter    | 3.x                      |
| Python     | 3.10+ (tested with 3.13) |
| Node.js    | 18+ (for CiviLanka.Web)  |
| dotnet-ef  | installed globally       |

---

## Backend Setup (`CiviLanka.API`)

### 1. Configure PostgreSQL

Edit `CiviLanka.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=CiviLankaDb;Username=postgres;Password=YOUR_POSTGRES_PASSWORD"
  },
  "GeminiSettings": {
    "ApiKey": "YOUR_GEMINI_API_KEY"
  }
}
```

Get a free Gemini API key at: https://aistudio.google.com

### 2. Apply Database Migrations

```bash
cd CiviLanka.API
dotnet ef database update
```

This automatically creates all tables (Hazards, HazardAIAnalyses, AspNetUsers, etc.) and seeds the three user roles: `Citizen`, `MunicipalStaff`, `Director`.

### 3. Run the API

```bash
dotnet run --project CiviLanka.API
```

The API starts at `http://localhost:5000`.  
Swagger UI is available at `http://localhost:5000` (root).

---

## REST API Endpoints

| Method | Route                           | Auth      | Description                   |
| ------ | ------------------------------- | --------- | ----------------------------- |
| POST   | `/api/auth/register`            | Public    | Register citizen              |
| POST   | `/api/auth/login`               | Public    | Get JWT token                 |
| POST   | `/api/hazards`                  | JWT       | Submit hazard                 |
| GET    | `/api/hazards/my`               | JWT       | My hazard list                |
| GET    | `/api/hazards/{id}`             | JWT       | Hazard detail                 |
| PUT    | `/api/hazards/{id}`             | JWT       | Update (editable states only) |
| DELETE | `/api/hazards/{id}`             | JWT       | Soft-cancel                   |
| POST   | `/api/hazards/{id}/analyze`     | Staff JWT | Re-trigger AI                 |
| GET    | `/api/hazards/{id}/ai-analysis` | JWT       | Latest AI result              |
| GET    | `/api/hazards`                  | Staff JWT | All hazards (Members 2–4)     |
| POST   | `/api/hazards/upload-image`     | JWT       | Upload photo                  |
| GET    | `/health`                       | Public    | Health check                  |

---

## AI Hazard Classification Agent

Built with **Microsoft Semantic Kernel + Google Gemini `gemini-2.0-flash`**.

The agent uses two tool functions:

- `GeocodeAddress(lat, lon)` — Nominatim reverse geocoding
- `GetNearbyInfrastructureHint(lat, lon)` — Location context

The agent produces:

```json
{
  "category": "Pothole",
  "severity": "HIGH",
  "riskLevel": "HIGH",
  "priority": "URGENT",
  "confidence": 0.91,
  "reason": "Large pothole near school entrance poses significant safety risk."
}
```

> **Fallback**: If Gemini API key is not configured, the agent uses a rule-based fallback to ensure the system remains functional.

---

## Flutter App Setup (`CiviLanka.App`)

### 1. Install dependencies

```bash
cd CiviLanka.App
flutter pub get
```

### 2. Configure API URL

Edit `lib/services/api_service.dart`:

```dart
static const String _baseUrl = 'http://10.0.2.2:5000'; // Android emulator
// static const String _baseUrl = 'http://192.168.1.X:5000'; // Physical device
```

### 3. Run the app

```bash
flutter run
```

---

## Member 2: Agentic AI Infrastructure Cost Estimator (`CiviLanka.Agent`)

Built with **LangChain + LangGraph + ChromaDB + BM25 + Google Gemini** for Sri Lanka municipal civil infrastructure (CIDA/BSR rates, CMC/RDA/NWSDB repair specifications).

### Setup & Run Commands (Windows PowerShell)

#### 1. Navigate to directory:

```powershell
cd "d:\IT24103847_Infrastructure & Asset Registry\CiviLanka-AI\CiviLanka-AI\CiviLanka.Agent"
```

#### 2. Create and activate virtual environment:

```powershell
python -m venv .venv

# Allow execution if restricted on PowerShell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

.\.venv\Scripts\Activate.ps1
```

#### 3. Upgrade pip and install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install jupyterlab ipykernel
```

#### 4. Configure `.env` (Gemini API Key):

```powershell
Copy-Item .env.example .env
notepad .env
# Set: GEMINI_API_KEY=AIzaSy...
```

#### 5. Register Jupyter kernel:

```powershell
python -m ipykernel install --user --name civilanka-agent --display-name "CiviLanka Agent (Sri Lanka RAG)"
```

#### 6. Launch testing notebook:

```powershell
python -m jupyter lab agent_testing.ipynb
```

#### 7. Run FastAPI REST backend server:

```powershell
uvicorn main:app --reload --port 8001
```

- Swagger UI: `http://127.0.0.1:8001/docs`
- Health check: `http://127.0.0.1:8001/health`

---

## Integration with Other Members

| Member                        | How to Integrate                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Member 2** (Infrastructure) | `GET /api/hazards/{id}` with Staff JWT returns full hazard + GPS                                           |
| **Member 3** (Work Orders)    | `GET /api/hazards` returns all hazards with `severity`, `riskLevel`, `priority`, `latestAIAnalysis.reason` |
| **Member 4** (Maintenance)    | Same as Member 3; filter by `status=AnalysisComplete`                                                      |

All members add their own models/controllers to `CiviLanka.API` and their own `DbSet<>` entries in `Data/AppDbContext.cs`.

---

## Soft Delete Design

Municipal hazard records are **never physically deleted**. Instead, `IsCancelled = true` and `Status = "Cancelled"` is set. This preserves:

- Safety audit trails
- Legal compliance records
- Municipal reporting history

Citizens cannot see cancelled hazards in their list, but municipal staff can.

---

## Hazard Lifecycle

```
Submitted → PendingAIAnalysis → AnalysisComplete → UnderReview → InProgress → Resolved
                                                         ↑
                                                   (Cancelled if citizen cancels early)
```

Citizens may edit/cancel only in `Submitted` or `PendingAIAnalysis` states.

---

## Definition of Done ✅

- [x] Citizen registration works
- [x] Citizen login works
- [x] JWT authentication works
- [x] Citizen can CREATE a hazard
- [x] Citizen can READ their hazards
- [x] Citizen can UPDATE an eligible hazard
- [x] Citizen can DELETE/CANCEL an eligible hazard
- [x] Photo upload works
- [x] GPS capture works
- [x] Hazard data stored in PostgreSQL
- [x] Hazard Classification Agent works (Semantic Kernel + Gemini)
- [x] AI returns category, severity, risk, priority, confidence, reason
- [x] AI analysis stored in PostgreSQL (audit history)
- [x] Citizen can see AI assessment in app
- [x] API documented with Swagger
- [x] Proper JWT auth/authorization implemented
- [x] Member 2, 3, 4 can consume hazard data via shared API
- [x] Code organized and documented
