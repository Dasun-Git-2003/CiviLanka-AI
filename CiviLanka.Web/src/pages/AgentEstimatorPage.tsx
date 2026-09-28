import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardHat,
  Wrench,
  DollarSign,
  FileText,
  RotateCcw,
  Send,
  Loader2,
  Database,
  Layers,
} from 'lucide-react';
import { agentService } from '../services/agentService';
import type {
  AgentHealth,
  EstimateRequest,
  EstimateResponse,
  SearchHit,
} from '../services/agentService';

const PRESETS = [
  {
    name: 'Main St Water Pipe Rupture',
    asset_name: 'Main St Water Pipe (AST-001)',
    asset_type: 'Water',
    hazard_type: 'Pipe Burst',
    severity: 'Critical',
    location: 'Downtown, Colombo 01',
    damage_description:
      'Major 110mm uPVC underground drinking water distribution main burst near the commercial bank junction. Water geysering above asphalt surface, causing sub-base subsidence.',
  },
  {
    name: 'Galle Rd Bridge Deck Spalling',
    asset_name: 'Galle Rd Bridge (AST-004)',
    asset_type: 'Roads & Bridges',
    hazard_type: 'Structural Spalling',
    severity: 'Critical',
    location: 'Colombo 03 (Canal Crossing)',
    damage_description:
      'Extensive concrete spalling and exposed rebar on northern pier deck slab. Guardrail impacted by vehicle crash with 12m section severed.',
  },
  {
    name: 'Negombo Rd Culvert Silt Dredging',
    asset_name: 'Negombo Rd Drain (AST-005)',
    asset_type: 'Sanitation',
    hazard_type: 'Blocked Culvert',
    severity: 'Moderate',
    location: 'Wattala - Negombo Road',
    damage_description:
      'Heavy siltation and plastic waste debris blocking 900mm diameter twin precast concrete stormwater drain. Flow reduced by 60%, posing flood hazard to adjacent shops.',
  },
  {
    name: 'Kandy Road Severe Pothole Patching',
    asset_name: 'Colombo-Kandy Arterial Road',
    asset_type: 'Roads & Bridges',
    hazard_type: 'Pothole & Rutting',
    severity: 'Poor',
    location: 'Peliyagoda / Kelaniya Corridor',
    damage_description:
      'Chain of deep potholes (150mm depth, total area 45 m²) on the dual-carriage bus lane resulting in severe axle damage and traffic congestion.',
  },
];

export const AgentEstimatorPage: React.FC = () => {
  const location = useLocation();

  // Tabs: 'estimator' | 'assistant' | 'search'
  const [activeTab, setActiveTab] = useState<'estimator' | 'assistant' | 'search'>('estimator');

  // Health state
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Estimator state
  const [formData, setFormData] = useState<EstimateRequest>({
    asset_name: '',
    asset_type: 'Water',
    hazard_type: 'Pipe Burst',
    severity: 'Medium',
    location: 'Colombo',
    damage_description: '',
  });

  const [estimating, setEstimating] = useState(false);
  const [estimateResult, setEstimateResult] = useState<EstimateResponse | null>(null);
  const [estimatorError, setEstimatorError] = useState<string | null>(null);

  // Assistant state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string; time: string }>>([
    {
      q: 'What is the standard CIDA BSR rate for 110mm uPVC pipe supply and laying in Sri Lanka?',
      a: 'Under CIDA/BSR Section 4 (Water Supply & Drainage Standards), 110mm Type 600 uPVC pressure pipe supply is rated at LKR 3,850.00 per linear meter. Trench excavation (up to 1.5m depth in normal soil including shoring) is rated at LKR 1,800.00 per m³, and certified electrofusion/solvent-welded jointing is LKR 2,200.00 per joint.',
      time: '10:15 AM',
    },
  ]);

  // Hybrid search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);

  // Pre-fill from route state (e.g. from InfrastructureAssets.tsx)
  useEffect(() => {
    if (location.state && location.state.prefill) {
      const p = location.state.prefill;
      setFormData({
        asset_name: p.name || '',
        asset_type: p.type || 'Water',
        hazard_type: p.hazard_type || 'Infrastructure Defect',
        severity: p.severity || 'Medium',
        location: p.location || 'Colombo',
        damage_description: p.description || '',
      });
      setActiveTab('estimator');
    }
  }, [location.state]);

  // Poll agent health
  const checkAgentHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await agentService.checkHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkAgentHealth();
  }, []);

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setFormData({
      asset_name: p.asset_name,
      asset_type: p.asset_type,
      hazard_type: p.hazard_type,
      severity: p.severity,
      location: p.location,
      damage_description: p.damage_description,
    });
    setEstimateResult(null);
    setEstimatorError(null);
  };

  const handleRunEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_name.trim() || !formData.damage_description.trim()) {
      setEstimatorError('Please enter the asset name and damage description.');
      return;
    }

    setEstimating(true);
    setEstimatorError(null);
    setEstimateResult(null);

    try {
      const result = await agentService.estimateRepairCost(formData);
      setEstimateResult(result);
    } catch (err: any) {
      setEstimatorError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to connect to the agent service at http://localhost:8001. Ensure the Python FastAPI server is running.'
      );
    } finally {
      setEstimating(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQ = question;
    setQuestion('');
    setAsking(true);

    try {
      const res = await agentService.askAssistant(currentQ);
      setChatHistory((prev) => [
        ...prev,
        {
          q: currentQ,
          a: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          q: currentQ,
          a: `Error: ${err.message || 'Unable to reach agent service on port 8001.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const hits = await agentService.searchKnowledgeBase(searchQuery, 4);
      setSearchResults(hits);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none pb-12">
      {/* ── Top Header & Service Health Banner ─────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Infrastructure Intelligence: Agentic RAG System</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-cyan-400" />
              Sri Lanka Municipal Infrastructure Cost & Material Estimator
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Powered by <strong>LangGraph</strong> stateful self-correcting graphs and{' '}
              <strong>BM25 + ChromaDB Hybrid Search (Reciprocal Rank Fusion)</strong> grounded in
              authentic Sri Lanka CIDA/BSR 2024–2026 schedule of rates.
            </p>
          </div>

          {/* Service Live Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {health ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                )}
              </span>
              <div>
                <div className="text-xs font-bold leading-tight">
                  {healthLoading
                    ? 'Checking Status…'
                    : health
                    ? 'AGENT ONLINE (Port 8001)'
                    : 'AGENT OFFLINE'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {health ? health.retrieval_mode : 'Run: uvicorn main:app --port 8001'}
                </div>
              </div>
            </div>

            <button
              onClick={checkAgentHealth}
              disabled={healthLoading}
              title="Refresh connection status"
              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>LangGraph Multi-Step Workflow</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>BM25 + Vector RRF Retrieval</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>CIDA/BSR 2024–2026 in LKR</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Pydantic Schema Validation</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('estimator')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'estimator'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Automated Repair Cost Estimator</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'assistant'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Civil Engineering Assistant (Q&A)</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'search'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Hybrid Search Inspector (BSR Knowledge Base)</span>
        </button>
      </div>

      {/* ── TAB 1: Cost Estimator ─────────────────────────────────────────────── */}
      {activeTab === 'estimator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Demo Presets */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick Demo Scenarios
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  Click to prefill
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/40 text-xs font-semibold text-slate-700 transition-all truncate"
                    title={p.name}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleRunEstimate}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
            >
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Asset Defect Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    placeholder="e.g. Main St Water Pipe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asset Type</label>
                  <select
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    <option value="Water">Water Supply</option>
                    <option value="Roads & Bridges">Roads & Bridges</option>
                    <option value="Sanitation">Drainage & Sanitation</option>
                    <option value="Electrical">Electrical & Lighting</option>
                    <option value="Civil">Civil Works</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Defect / Hazard Type</label>
                  <input
                    type="text"
                    required
                    value={formData.hazard_type}
                    onChange={(e) => setFormData({ ...formData, hazard_type: e.target.value })}
                    placeholder="e.g. Pipe Burst, Pothole"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    <option value="Critical">Critical (Immediate Hazard)</option>
                    <option value="Poor">Poor (High Priority)</option>
                    <option value="Moderate">Moderate (Scheduled)</option>
                    <option value="Low">Low (Routine Maintenance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Colombo 03"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Engineering Damage Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.damage_description}
                  onChange={(e) => setFormData({ ...formData, damage_description: e.target.value })}
                  placeholder="Describe the defect, dimensions, surface deterioration, or leaking volume…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {estimatorError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1">{estimatorError}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={estimating}
                className="w-full py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {estimating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing LangGraph Workflow…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate CIDA BSR Cost Estimate</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Results Panel (7 cols) */}
          <div className="lg:col-span-7">
            {estimating && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
                <div className="inline-flex p-4 rounded-full bg-cyan-50 text-cyan-700 animate-pulse">
                  <Bot className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  LangGraph Agentic State Machine Active
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  1. Router classified intent &bull; 2. Querying BM25 + ChromaDB Vector Store &bull;
                  3. Grading document relevance &bull; 4. Synthesizing Bill of Quantities in LKR…
                </p>
                <div className="w-48 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-600 rounded-full animate-indeterminate" />
                </div>
              </div>
            )}

            {!estimating && !estimateResult && !estimatorError && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <Bot className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Estimate Generated Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Select one of the quick presets on the left or enter a custom asset defect, then
                  click <strong>&ldquo;Generate CIDA BSR Cost Estimate&rdquo;</strong> to run the LangGraph agent.
                </p>
              </div>
            )}

            {estimateResult && estimateResult.estimate && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                {/* Result Top Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                      Authoritative Bill of Quantities
                    </div>
                    <h2 className="text-lg font-black text-slate-900">
                      {estimateResult.asset_name}
                    </h2>
                    <p className="text-xs text-slate-500">{estimateResult.estimate.summary}</p>
                  </div>

                  {/* Total Cost Badge */}
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-right sm:min-w-[190px]">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">
                      Total Estimated Cost (LKR)
                    </div>
                    <div className="text-xl font-black text-emerald-800">
                      LKR {estimateResult.estimate.total_estimated_cost_lkr.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{estimateResult.estimate.estimated_duration_days} days duration</span>
                    </div>
                  </div>
                </div>

                {/* Materials Breakdown Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Material Requirements (CIDA BSR Rates)</span>
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Item & Specification</th>
                          <th className="p-2.5 text-center">Qty / Unit</th>
                          <th className="p-2.5 text-right">Unit Rate (LKR)</th>
                          <th className="p-2.5 text-right">Total (LKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {estimateResult.estimate.materials.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-800">{m.item_name}</div>
                              {m.specification && (
                                <div className="text-[11px] text-slate-500">{m.specification}</div>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              {m.quantity} {m.unit}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {m.unit_rate_lkr.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {m.total_cost_lkr.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Labor and Plant Hire Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-600" />
                    <span>Labor & Plant Hire (Mandays & Equipment)</span>
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Role / Equipment</th>
                          <th className="p-2.5 text-center">Days / Mandays</th>
                          <th className="p-2.5 text-right">Daily Rate (LKR)</th>
                          <th className="p-2.5 text-right">Total (LKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {estimateResult.estimate.labor_and_equipment.map((l, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-semibold text-slate-800">{l.role_or_machine}</td>
                            <td className="p-2.5 text-center font-mono">{l.days}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {l.daily_rate_lkr.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {l.total_cost_lkr.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Overheads & Contingency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500">Safety & Site Preliminaries:</span>
                    <span className="font-bold text-slate-900 ml-1.5 font-mono">
                      LKR {estimateResult.estimate.safety_and_preliminaries_lkr.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      Contingency ({estimateResult.estimate.contingency_percentage}%):
                    </span>
                    <span className="font-bold text-slate-900 ml-1.5 font-mono">
                      LKR {estimateResult.estimate.contingency_cost_lkr.toLocaleString()}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Contractor Specialization:</span>
                    <span className="font-bold text-cyan-800 ml-1.5">
                      {estimateResult.estimate.recommended_contractor_specialization}
                    </span>
                  </div>
                </div>

                {/* Technical Compliance Notes */}
                {estimateResult.estimate.technical_notes && (
                  <div className="text-xs p-3 rounded-xl bg-cyan-50/60 border border-cyan-200 text-cyan-900">
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700" />
                      <span>CIDA & CMC Technical Compliance Specification</span>
                    </div>
                    <div>{estimateResult.estimate.technical_notes}</div>
                  </div>
                )}

                {/* Cited Sources */}
                {estimateResult.estimate.cited_sources && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-bold">Grounding Sources:</span>
                    {estimateResult.estimate.cited_sources.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Civil Engineering Assistant ────────────────────────────────── */}
      {activeTab === 'assistant' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* Top Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Sri Lanka Municipal Civil Engineering AI Assistant
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ask questions regarding CIDA, NWSDB, CMC specifications, or repair guidelines
                </p>
              </div>
            </div>
            <div className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
              RAG Active
            </div>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatHistory.map((item, idx) => (
              <div key={idx} className="space-y-2">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="bg-slate-900 text-white text-xs p-3.5 rounded-2xl rounded-tr-none max-w-xl shadow-xs">
                    <div className="font-medium">{item.q}</div>
                    <div className="text-[9px] text-slate-400 text-right mt-1">{item.time}</div>
                  </div>
                </div>

                {/* Answer */}
                <div className="flex justify-start">
                  <div className="bg-cyan-50/70 border border-cyan-100 text-slate-800 text-xs p-4 rounded-2xl rounded-tl-none max-w-2xl space-y-1 shadow-xs">
                    <div className="font-bold text-cyan-900 flex items-center gap-1.5 text-[11px] mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Civil Engineering Assistant</span>
                    </div>
                    <div className="whitespace-pre-line leading-relaxed">{item.a}</div>
                  </div>
                </div>
              </div>
            ))}

            {asking && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                  <span>Retrieving Sri Lanka BSR standards and formulating response…</span>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Input Box */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask any question (e.g. What is the compaction requirement for asphalt patching?)"
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 3: Hybrid Search Inspector ───────────────────────────────────── */}
      {activeTab === 'search' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-600" />
              Hybrid Search Inspector (BM25 + ChromaDB Vector RRF)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Test how the agent retrieves and fuses keyword matches (BM25) and dense semantic vectors
              from the indexed markdown knowledge base.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search keywords or engineering code (e.g. 110mm uPVC, asphalt concrete, backhoe loader)"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Knowledge Base</span>
                </>
              )}
            </button>
          </form>

          {/* Search Hits */}
          <div className="space-y-3">
            {searchResults.length === 0 && !searching && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Type a query above to inspect hybrid search hits and Reciprocal Rank Fusion scores.
              </div>
            )}

            {searchResults.map((hit, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors space-y-2"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-800 font-mono">Rank #{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                    Source: {hit.source}
                  </span>
                </div>
                <div className="text-xs text-slate-700 font-mono bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {hit.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentEstimatorPage;
