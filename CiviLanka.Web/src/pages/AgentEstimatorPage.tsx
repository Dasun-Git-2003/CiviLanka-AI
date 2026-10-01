import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Loader2,
  Layers,
  Database,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { agentService } from '../services/agentService';
import { assetService } from '../services/assetService';
import type {
  AgentHealth,
  EstimateRequest,
  EstimateResponse,
} from '../services/agentService';
import type { InfrastructureAsset } from '../types/asset';

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

const formatLKR = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? '0' : num.toLocaleString();
};

export const AgentEstimatorPage: React.FC = () => {
  const location = useLocation();

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

  // Database assets auto-suggest state
  const [dbAssets, setDbAssets] = useState<InfrastructureAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<InfrastructureAsset | null>(null);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch registered assets from database for autocomplete
  useEffect(() => {
    let isMounted = true;
    const fetchAssets = async () => {
      setLoadingAssets(true);
      try {
        const data = await assetService.getAll();
        if (isMounted) {
          setDbAssets(data || []);
        }
      } catch (err) {
        console.error('Failed to load assets from database for auto-suggest:', err);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    };
    fetchAssets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter assets based on input query
  const filteredDbAssets = useMemo(() => {
    const query = (formData.asset_name || '').trim().toLowerCase();
    if (!query) {
      return dbAssets.slice(0, 10);
    }
    return dbAssets
      .filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.id.toLowerCase().includes(query) ||
          (a.location && a.location.toLowerCase().includes(query)) ||
          (a.type && a.type.toLowerCase().includes(query))
      )
      .slice(0, 10);
  }, [dbAssets, formData.asset_name]);

  // Handler to auto-fill all form fields from selected asset
  const handleSelectDbAsset = (asset: InfrastructureAsset) => {
    // 1. Map asset type to valid form options
    let mappedType: EstimateRequest['asset_type'] = 'Civil';
    const t = (asset.type || '').toLowerCase();
    if (t.includes('water')) mappedType = 'Water';
    else if (t.includes('road') || t.includes('bridge') || t.includes('highway') || t.includes('pavement')) mappedType = 'Roads & Bridges';
    else if (t.includes('drain') || t.includes('sanit') || t.includes('sewer') || t.includes('culvert')) mappedType = 'Sanitation';
    else if (t.includes('elect') || t.includes('light') || t.includes('power')) mappedType = 'Electrical';
    else if (t.includes('civil') || t.includes('building')) mappedType = 'Civil';

    // 2. Map condition to severity
    let mappedSeverity: EstimateRequest['severity'] = 'Moderate';
    const cond = (asset.latestCondition || (asset.inspections && asset.inspections[0]?.condition) || '').toLowerCase();
    if (cond.includes('crit')) mappedSeverity = 'Critical';
    else if (cond.includes('poor')) mappedSeverity = 'Poor';
    else if (cond.includes('mod')) mappedSeverity = 'Moderate';
    else if (cond.includes('good') || cond.includes('fair')) mappedSeverity = 'Low';

    // 3. Smart defect / hazard type from inspections or asset type
    const latestInspection = asset.inspections && asset.inspections[0];
    let defectType = latestInspection?.issuesFound || '';
    if (!defectType) {
      if (mappedType === 'Water') defectType = 'Pipe Burst / Underground Joint Leak';
      else if (mappedType === 'Roads & Bridges') defectType = 'Asphalt Potholes & Structural Spalling';
      else if (mappedType === 'Sanitation') defectType = 'Culvert Silt Blockage & Stormwater Overflow';
      else if (mappedType === 'Electrical') defectType = 'Luminaire / Circuit Control Failure';
      else defectType = 'Structural Crack & Foundation Deterioration';
    }

    // 4. Smart engineering damage description
    let desc = '';
    if (asset.description) {
      desc += asset.description;
    }
    if (latestInspection?.notes) {
      desc += (desc ? ' • ' : '') + `Inspection Notes: ${latestInspection.notes}`;
    }
    if (latestInspection?.issuesFound && !desc.includes(latestInspection.issuesFound)) {
      desc += (desc ? ' • ' : '') + `Defect: ${latestInspection.issuesFound}`;
    }
    if (!desc) {
      desc = `Municipal Asset ${asset.name} (${asset.id}) at ${asset.location || 'Colombo'}. Asset condition reported as ${asset.latestCondition || 'degraded'}. Requires CIDA BSR rate schedule evaluation and BOQ generation.`;
    }

    setFormData({
      asset_name: `${asset.name} (${asset.id})`,
      asset_type: mappedType,
      hazard_type: defectType,
      severity: mappedSeverity,
      location: asset.location || 'Colombo',
      damage_description: desc,
    });

    setSelectedAsset(asset);
    setShowSuggestions(false);
    setEstimateResult(null);
    setEstimatorError(null);
  };

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setFormData({
      asset_name: p.asset_name,
      asset_type: p.asset_type,
      hazard_type: p.hazard_type,
      severity: p.severity,
      location: p.location,
      damage_description: p.damage_description,
    });
    setSelectedAsset(null);
    setShowSuggestions(false);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none pb-12">
      {/* ── Top Header & Service Health Banner ─────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Infrastructure Intelligence: Agentic System</span>
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

      {/* ── Automated Repair Cost Estimator ───────────────────────────────────── */}
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
                <div className="relative" ref={assetDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Asset Name</label>
                    <span className="text-[10px] text-cyan-600 font-semibold flex items-center gap-1">
                      <Database className="w-3 h-3 text-cyan-600" />
                      {loadingAssets ? 'Syncing DB…' : `${dbAssets.length} in DB`}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.asset_name}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setFormData({ ...formData, asset_name: e.target.value });
                        setShowSuggestions(true);
                        if (selectedAsset && e.target.value !== `${selectedAsset.name} (${selectedAsset.id})`) {
                          setSelectedAsset(null);
                        }
                      }}
                      placeholder="Type to search DB assets (e.g. Main St, Bridge)…"
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Toggle database asset list"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${showSuggestions ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Selected DB Asset Link Confirmation */}
                  {selectedAsset && (
                    <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 bg-cyan-50 border border-cyan-200 rounded-lg text-[10px] text-cyan-800 animate-fadeIn">
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>
                          Linked to DB Asset: <strong>{selectedAsset.id}</strong> ({selectedAsset.type})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedAsset(null)}
                        className="text-cyan-600 hover:text-cyan-900 ml-1 font-bold text-xs"
                        title="Clear asset link"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-72 flex flex-col">
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-cyan-600" />
                          Assets From Database ({filteredDbAssets.length})
                        </span>
                        <span className="text-slate-400 font-normal">Click to auto-fill</span>
                      </div>

                      <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                        {loadingAssets && (
                          <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
                            <span>Loading assets from database…</span>
                          </div>
                        )}

                        {!loadingAssets && filteredDbAssets.length === 0 && (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No matching assets in database for "{formData.asset_name}". You can continue typing a custom name.
                          </div>
                        )}

                        {!loadingAssets &&
                          filteredDbAssets.map((asset) => (
                            <div
                              key={asset.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectDbAsset(asset);
                              }}
                              className="p-2.5 hover:bg-cyan-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2 text-left group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-800 truncate group-hover:text-cyan-700">
                                    {asset.name}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                    {asset.id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                  <span className="flex items-center gap-0.5 truncate">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    {asset.location || 'Colombo'}
                                  </span>
                                  <span>•</span>
                                  <span className="font-medium text-slate-600">{asset.type}</span>
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-1">
                                {asset.latestCondition && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      asset.latestCondition === 'Critical'
                                        ? 'bg-red-100 text-red-700'
                                        : asset.latestCondition === 'Poor'
                                        ? 'bg-amber-100 text-amber-700'
                                        : asset.latestCondition === 'Moderate'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {asset.latestCondition}
                                  </span>
                                )}
                                <span className="text-[9px] text-cyan-600 font-semibold group-hover:text-cyan-800">
                                  Auto-fill ➔
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
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
                      LKR {formatLKR(estimateResult.estimate.total_estimated_cost_lkr)}
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
                        {(estimateResult.estimate.materials || []).map((m, idx) => (
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
                              {formatLKR(m.unit_rate_lkr ?? (m as any).unit_cost_lkr)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {formatLKR(m.total_cost_lkr)}
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
                        {(estimateResult.estimate.labor_and_equipment || []).map((l, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-semibold text-slate-800">{l.role_or_machine}</td>
                            <td className="p-2.5 text-center font-mono">{l.days}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {formatLKR(l.daily_rate_lkr ?? (l as any).rate_lkr)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {formatLKR(l.total_cost_lkr)}
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
                      LKR {formatLKR(estimateResult.estimate.safety_and_preliminaries_lkr)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      Contingency ({estimateResult.estimate.contingency_percentage || 0}%):
                    </span>
                    <span className="font-bold text-slate-900 ml-1.5 font-mono">
                      LKR {formatLKR(estimateResult.estimate.contingency_cost_lkr)}
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
    </div>
  );
};

export default AgentEstimatorPage;
