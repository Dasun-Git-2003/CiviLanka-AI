# CiviLanka.Agent — Sri Lanka Municipal Infrastructure Agentic RAG System

> **Component**: Member 2 — Infrastructure Asset Registry & Agentic RAG Cost Estimator  
> **Knowledge Base**: CIDA/BSR Sri Lanka Engineering Rates (2024–2026), CMC / RDA / NWSDB Specifications  
> **AI Architecture**: Hybrid Search (BM25 + ChromaDB Vector Store + Reciprocal Rank Fusion) + LangGraph State Machine + Google Gemini  
> **API Framework**: FastAPI (Port 8001)  
> **Interactive Testing**: JupyterLab (`agent_testing.ipynb`)

---

## Step-by-Step Setup Guide (Windows PowerShell)

Follow these terminal commands in order to set up your virtual environment, install all dependencies, register your Jupyter kernel, and test the agent.

### Step 1: Open PowerShell and Navigate to Agent Directory
Enclose the path in quotes to handle directory names with spaces or ampersands (`&`):
```powershell
cd "d:\IT24103847_Infrastructure & Asset Registry\CiviLanka-AI\CiviLanka-AI\CiviLanka.Agent"
```

---

### Step 2: Create Virtual Environment
```powershell
python -m venv .venv
```

---

### Step 3: Activate the Virtual Environment
> **Note for Windows PowerShell**: The Linux `source` command is not supported in PowerShell. Use `.\.venv\Scripts\Activate.ps1`. If PowerShell shows an `Execution_Policies` restriction error, set the execution policy for the process first.

```powershell
# Allow script execution for current PowerShell session (if restricted)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1
```
*(Once activated, you will see `(.venv)` in your terminal prompt).*

---

### Step 4: Upgrade Pip & Install Dependencies
```powershell
# 1. Upgrade pip
python -m pip install --upgrade pip

# 2. Install agent dependencies (LangChain, LangGraph, ChromaDB, BM25, FastAPI, etc.)
python -m pip install -r requirements.txt

# 3. Install JupyterLab and IPykernel
python -m pip install jupyterlab ipykernel
```

---

### Step 5: Configure Environment Variables (`.env`)
Copy the template `.env.example` to `.env` and add your Google Gemini API key:
```powershell
Copy-Item .env.example .env
notepad .env
```
In `Notepad`, ensure your key is set:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
CHROMA_PERSIST_DIRECTORY=./chroma_db
API_PORT=8001
```
Save and close Notepad.

---

### Step 6: Register the Jupyter Kernel
Register the kernel so Jupyter uses this exact virtual environment:
```powershell
python -m ipykernel install --user --name civilanka-agent --display-name "CiviLanka Agent (Sri Lanka RAG)"
```

---

### Step 7: Launch JupyterLab for Interactive Testing
Launch JupyterLab to open the pre-built test suite:
```powershell
python -m jupyter lab agent_testing.ipynb
```
1. In the top-right corner of JupyterLab, verify the kernel is set to **`CiviLanka Agent (Sri Lanka RAG)`**.
2. Run each cell or select **Run** > **Run All Cells** to verify:
   - Environment and Gemini API connectivity
   - Sri Lanka CIDA/BSR knowledge base inspection
   - Hybrid Search (BM25 + ChromaDB Vector Search + RRF)
   - LangGraph self-correcting agent workflow (router → retrieve → grade → rewrite → estimate)
   - Structured cost estimates in Sri Lankan Rupees (LKR)

---

### Step 8: Run the FastAPI REST Server
In your activated terminal (`(.venv)`), run:
```powershell
uvicorn main:app --reload --port 8001
```

- **Interactive Swagger Documentation**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **Alternative ReDoc**: [http://127.0.0.1:8001/redoc](http://127.0.0.1:8001/redoc)
- **Health Check**: [http://127.0.0.1:8001/health](http://127.0.0.1:8001/health)

---

## FastAPI REST Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server and vector store health check |
| `POST` | `/api/agent/search` | Hybrid search (BM25 + Vector + RRF) against Sri Lanka standards |
| `POST` | `/api/agent/estimate` | LangGraph agentic repair & cost estimator (returns LKR breakdown) |
| `POST` | `/api/agent/ask` | General engineering Q&A on Sri Lanka municipal infrastructure |
| `POST` | `/api/agent/ingest` | Force reload and re-index the markdown knowledge base |

---

## Directory Structure

```
CiviLanka.Agent/
├── agent/
│   ├── graph.py               # Stateful LangGraph agent with self-correction
│   ├── prompts.py             # Sri Lanka civil engineering system prompts
│   ├── retriever.py           # Hybrid BM25 + ChromaDB RRF retriever
│   └── state.py               # TypedDict state & Pydantic output schemas
├── data/
│   ├── sri_lanka_bsr_rates.md          # CIDA/BSR unit prices in LKR (pipes, asphalt, labor)
│   ├── municipal_repair_specs.md       # CMC, RDA, and NWSDB repair procedures
│   └── emergency_response_guide.md     # Hazard classification & response protocols
├── agent_testing.ipynb        # Interactive Jupyter notebook for verification
├── ingest.py                  # Knowledge base chunking & embedding pipeline
├── main.py                    # FastAPI application exposing REST endpoints
├── requirements.txt           # Python dependencies
└── .env.example               # Environment variables template
```

