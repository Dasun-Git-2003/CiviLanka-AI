# CivitaGuard AI (CiviLanka) — Municipal Infrastructure & Autonomous Agentic AI Platform

> **CivitaGuard AI** is an enterprise-grade municipal infrastructure management and incident response ecosystem designed for Sri Lankan municipal councils (CMC, RDA, NWSDB, CEB). The platform unifies citizen incident reporting, infrastructure asset digital twins, automated work-order dispatching, and field maintenance auditing into a cohesive, multi-agent AI system.

[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Python%203.11+-green.svg)](https://langchain.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.1%20Flash--Lite-orange.svg)](https://aistudio.google.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)

---

## 🏛️ System Architecture & Subsystems

```
                                  ┌───────────────────────────────┐
                                  │      Flutter Mobile App       │
                                  │ (Citizen, Field Worker, Sup.) │
                                  └───────────────┬───────────────┘
                                                  │ HTTP / JWT
                                                  ▼
┌───────────────────────────────┐  HTTP / JWT  ┌───────────────────────────────┐
│     React 19 Web Portal       ├─────────────►│     ASP.NET Core 8 Web API    │
│  (Supervisor & Director Ops)  │              │ (Business Logic & EF Core DB) │
└───────────────────────────────┘              └───────┬───────────────┬───────┘
                                                       │               │
                                     LangGraph REST    │               │ EF Core
                                     (Port 8001)       ▼               ▼
                                       ┌───────────────────────┐ ┌───────────────┐
                                       │ Python LangGraph RAG  │ │  PostgreSQL   │
                                       │ (CIDA BSR Vector DB)  │ │  Database     │
                                       └───────────┬───────────┘ └───────────────┘
                                                   │
                                                   ▼
                                       ┌───────────────────────┐
                                       │ Google Gemini 3.1 LLM │
                                       └───────────────────────┘
```

The repository is modularized into four integrated components:

| Subsystem | Tech Stack | Role & Responsibilities |
|---|---|---|
| **`CiviLanka.API`** | ASP.NET Core 8, EF Core, PostgreSQL, JWT | Central municipal backend, multi-agent orchestrator, RBAC security, REST endpoints, and persistent audit trail. |
| **`CiviLanka.Agent`** | Python 3.11+, LangGraph, ChromaDB, FastAPI | Microservice performing RAG semantic search over Sri Lanka CIDA / BSR standard schedule of rates and municipal repair manuals. |
| **`CiviLanka.Web`** | React 19, TypeScript, Vite, Tailwind CSS, Lucide | Executive and supervisory desktop web platform for GIS tracking, live AI triage, work order management, and director treasury approvals. |
| **`CiviLanka.App`** | Flutter 3.x, Provider, Dio, Material 3 | Multirole cross-platform mobile application for citizen hazard reporting, field worker job execution, and offline-ready operations. |

---

## 👥 Four-Member Academic Scope Matrix

| Member | Domain & Role | Primary Features & Deliverables |
|---|---|---|
| **Member 1** | **Citizen Incident Reporting & Hazard Classification AI** | • Citizen incident intake with photo, geolocation & category selection<br>• Real-time Multilingual NLP triage (English, සිංහල, தமிழ்)<br>• Automated severity classification and priority scoring with Gemini 3.1<br>• Municipal Councils Ordinance §14 statutory threat grounding |
| **Member 2** | **Infrastructure Asset Registry & GIS Spatial Intelligence** | • Municipal infrastructure digital twin registry (Bridges, Culverts, Water Mains)<br>• GIS interactive spatial map with health condition pins<br>• Asset structural degradation modeling and predictive risk scoring<br>• QR code asset tagging and field asset association |
| **Member 3** | **Municipal Work Orders & Autonomous Cost Estimator AI** | • End-to-end work order lifecycle (Draft &rarr; Dispatched &rarr; In-Progress &rarr; Completed)<br>• Autonomous Bill of Quantities (BOQ) generator calibrated against CIDA / BSR 2026 rates<br>• Multi-level financial approval hierarchy (Supervisor limit: Rs. 100k; Director treasury queue: > Rs. 100k)<br>• Contractor directory and automated dispatch routing |
| **Member 4** | **Field Maintenance Operations & Safety / OHS Compliance AI** | • Field worker execution hub with before/after visual proof capture<br>• AI safety and OHS compliance auditor validating PPE and carriageway cones<br>• Supervisor verification and quality assurance correction queues<br>• Immutable municipal audit ledger and human-in-the-loop override logging |

---

## 🤖 Multi-Tier Resilient AI Inference Ladder

To ensure zero downtime during network outages or external API quota exhaustion, all AI operations follow a 3-tier fallback hierarchy:

```
[Tier 1: Google Gemini 3.1 Flash-Lite]
       │
       ▼ (if rate-limited 429 or 503)
[Tier 2: Python LangGraph Agent (Port 8001)]
       │
       ▼ (if agent offline or unreachable)
[Tier 3: Deterministic Sri Lanka Municipal Expert Heuristic Engine]
       │
       └── Guaranteed 100% Availability with BSR 2026 standard rates and statutory threat indices
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **.NET 8.0 SDK** ([Download](https://dotnet.microsoft.com/download/dotnet/8.0))
- **PostgreSQL 14+** (Default port `5432`)
- **Node.js 18+** & npm
- **Flutter 3.x SDK** ([Install guide](https://docs.flutter.dev/get-started/install))
- **Python 3.11+** with virtual environment support

---

### 2. Backend Setup (`CiviLanka.API`)

1. Navigate to the API folder:
   ```bash
   cd CiviLanka.API
   ```
2. Configure database connection and Gemini API key in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=CiviLankaDb;Username=postgres;Password=YOUR_PASSWORD"
     },
     "GeminiSettings": {
       "ApiKey": "YOUR_GEMINI_API_KEY",
       "Model": "gemini-3.1-flash-lite"
     }
   }
   ```
3. Apply database migrations:
   ```bash
   dotnet ef database update
   ```
4. Run the API:
   ```bash
   dotnet run --launch-profile http
   ```
   - **Base URL**: `http://localhost:5000`
   - **Swagger Documentation**: `http://localhost:5000/swagger`

---

### 3. Agent Setup (`CiviLanka.Agent`)

1. Navigate to the agent folder:
   ```bash
   cd CiviLanka.Agent
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env`:
   ```env
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   CHAT_MODEL=gemini-3.1-flash-lite
   ```
5. Run the FastAPI microservice:
   ```bash
   uvicorn main:app --port 8001 --reload
   ```
   - **Health Endpoint**: `http://127.0.0.1:8001/health`
   - **Swagger Docs**: `http://127.0.0.1:8001/docs`

---

### 4. Web Application Setup (`CiviLanka.Web`)

1. Navigate to the web folder:
   ```bash
   cd CiviLanka.Web
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - **Web Application URL**: `http://localhost:5173`

---

### 5. Mobile Application Setup (`CiviLanka.App`)

1. Navigate to the mobile folder:
   ```bash
   cd CiviLanka.App
   ```
2. Fetch Flutter packages:
   ```bash
   flutter pub get
   ```
3. Launch on Chrome (Debug Web) or Android Emulator:
   ```bash
   # Run in Chrome
   flutter run -d chrome

   # Run on connected device / emulator
   flutter run
   ```

---

## 🔐 Default Demo Accounts & RBAC Matrix

| Role | Email | Password | Permissions & Dashboard |
|---|---|---|---|
| **Citizen** | `citizen@civilanka.gov.lk` | `Citizen@123` | Incident reporting, photo upload, personal report tracking, mobile notifications. |
| **Field Worker** | `worker@civilanka.gov.lk` | `Worker@123` | Task execution hub, before/after maintenance evidence upload, work order status transitions. |
| **Supervisor** | `supervisor@civilanka.gov.lk` | `Supervisor@123` | Incident triage, work order creation (< Rs. 100k), AI estimation, maintenance verification queue. |
| **Director** | `director@civilanka.gov.lk` | `Director@123` | Executive treasury approval (> Rs. 100k / URGENT), budget analytics, municipal compliance audit ledger. |

---

## 📡 Core API Endpoints

### ⚠️ Hazard Intelligence & Triage AI
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/ai/hazards/classify-live` | Public | Live interactive multimodal incident classification (title, description, zone, language). |
| `POST` | `/api/ai/hazards/{id}/analyze` | Staff | Run deep contextual classification on an existing persisted citizen hazard. |
| `GET` | `/api/ai/hazards/{id}/analysis` | Authenticated | Retrieve latest AI analysis dossier for a hazard. |

### 🛠️ Work Orders & Autonomous Quantity Surveying
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/workorders/preview-estimate` | Staff | Pre-calculate CIDA/BSR rates, material items, crew size, and duration before saving. |
| `POST` | `/api/workorders` | Staff | Create an authorized municipal work order. |
| `GET` | `/api/workorders` | Staff / Field | Fetch work orders with role-based visibility. |
| `POST` | `/api/workorders/{id}/approve` | Director | Authorize high-budget (> Rs. 100k) or urgent work orders. |
| `POST` | `/api/workorders/{id}/reject` | Director | Reject work order with mandatory audit reason. |

### 🦺 Maintenance Records & Safety Audits
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/maintenance-records` | Field Worker | Log completed repair work with materials and photographic proof. |
| `POST` | `/api/ai/maintenance/{id}/safety-analysis` | Staff | Run OHS compliance audit against site safety protocols. |
| `PUT` | `/api/maintenance-records/{id}/verify` | Supervisor | Verify and close completed field maintenance tasks. |

---

## 🧪 Quality Assurance & Verification

- **API Integrity**:
  ```bash
  dotnet test
  ```
- **Web Type Safety**:
  ```bash
  cd CiviLanka.Web
  npm run build
  ```
- **Mobile Static Analysis**:
  ```bash
  cd CiviLanka.App
  flutter analyze
  ```

---

## 📜 Legal & Compliance Framework

CivitaGuard AI operations are grounded in statutory governance:
- **Municipal Councils Ordinance (No. 16 of 1947)** — Sections 14, 40 & 131 (Public hazard isolation & roadway maintenance).
- **CIDA (Construction Industry Development Authority) Bulletin of Scheduled Rates (BSR 2024–2026)** — Material and labour benchmarks.
- **National Environmental Act & Sri Lanka Road Development Authority (RDA) Standard Specifications**.
