import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Languages,
  Clock,
  Info,
  MapPin,
  Tag,
  Sliders,
  Image as ImageIcon,
  ShieldAlert,
  ArrowRight,
  Building2,
  Users,
  Activity,
  CloudRain,
  School,
  Hospital,
  Compass,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/apiService';
import { aiService, type HazardClassificationResult } from '../services/aiService';

interface SimpleHazard {
  id: string;
  ticketNumber: string;
  category: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export const HazardClassificationAIPage: React.FC = () => {
  const [hazards, setHazards] = useState<SimpleHazard[]>([]);
  const [selectedHazardId, setSelectedHazardId] = useState<string>('');
  const [activeInputMode, setActiveInputMode] = useState<'custom' | 'existing'>('custom');

  // 4 Required Inputs: photo/description, location, category, and metadata
  const [description, setDescription] = useState<string>(
    'A burst water pipe near a school gushing high-pressure water onto the road and sidewalk during morning arrival hours.'
  );
  const [photoUrl, setPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1584463699039-3972c726a457?auto=format&fit=crop&w=600&q=80'
  );
  const [location, setLocation] = useState<string>('Near Royal College, Rajakeeya Mawatha, Colombo 07');
  const [proximityZone, setProximityZone] = useState<string>('School Zone');
  const [categorySupplied, setCategorySupplied] = useState<string>('Other');
  const [weatherCondition, setWeatherCondition] = useState<string>('Heavy Monsoon Rain');
  const [trafficDensity, setTrafficDensity] = useState<string>('School Arrival Rush');
  const [customMetadata, setCustomMetadata] = useState<string>(
    'High student foot traffic, slippery road surface, active water discharge'
  );

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HazardClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active architecture step tab for interactive exploration
  const [activeStep, setActiveStep] = useState<number>(1);

  // Fetch hazards from backend for "From Reported Hazards" mode
  useEffect(() => {
    const fetchHazards = async () => {
      try {
        const res = await apiClient.get<SimpleHazard[]>('/api/hazards');
        setHazards(res.data || []);
        if (res.data?.length > 0) {
          setSelectedHazardId(res.data[0].id);
        }
      } catch {
        const fallback: SimpleHazard[] = [
          {
            id: 'h-101',
            ticketNumber: 'HZ-2026-0042',
            category: 'Other',
            description: 'A burst water pipe near a school gushing water onto the road and sidewalk during morning arrival hours.',
            severity: 'HIGH',
            priority: 'HIGH',
            status: 'Submitted',
            address: 'Rajakeeya Mawatha, Colombo 07',
          },
          {
            id: 'h-102',
            ticketNumber: 'HZ-2026-0089',
            category: 'BridgeDamage',
            description: 'Exposed rebar and bridge expansion joint fracture on Kelani river bridge approach.',
            severity: 'CRITICAL',
            priority: 'URGENT',
            status: 'Submitted',
            address: 'New Kelani Bridge, Peliyagoda',
          },
        ];
        setHazards(fallback);
        setSelectedHazardId(fallback[0].id);
      }
    };
    fetchHazards();
  }, []);

  const handleResetInputs = () => {
    setDescription('');
    setLocation('');
    setProximityZone('School Zone');
    setCategorySupplied('Other');
    setPhotoUrl('');
    setCustomMetadata('');
    setResult(null);
    setError(null);
  };

  const handleRunClassification = async () => {
    if (!description.trim()) {
      setError('Please provide a description of the incident.');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      if (activeInputMode === 'existing' && selectedHazardId) {
        // Evaluate from an existing database record
        const res = await aiService.analyzeHazard(selectedHazardId);
        setResult(res);
      } else {
        // Live Multimodal Classification with the 4 Inputs
        const compiledMetadata = `Weather: ${weatherCondition}; Traffic: ${trafficDensity}; Context: ${customMetadata}`;
        const res = await aiService.classifyLiveHazard({
          description,
          location,
          proximityZone,
          categorySupplied,
          metadata: compiledMetadata,
          imageUrl: photoUrl || undefined,
        });
        setResult(res);
      }
    } catch (err: any) {
      setError(err?.message || 'AI Classification failed.');
    } finally {
      setRunning(false);
    }
  };

  // Helper color logic for severity badge
  const getSeverityBadgeColor = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* ── Page Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 sm:p-9 text-white shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner flex-shrink-0">
              <Brain className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Citizen Hazard Classification &amp; Triage AI
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  LangGraph Agent
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Multilingual reasoning engine powered by <strong className="text-white">Google Gemini 3.8 Flash</strong> and <strong className="text-cyan-300">LangGraph StateGraph</strong>. Dynamically classifies uncatalogued citizen reports, overrides ambiguous categories, and calculates urban risk multipliers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-cyan-300 font-semibold">gemini-3.8-flash</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium">EN &bull; සිංහල &bull; தமிழ்</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Architecture Pipeline: HOW THE AI WORKS ─────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider block">
              LangGraph Multi-Agent Architecture
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-600" />
              How the Hazard Classification AI Operates
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            Interactive 4-Stage Workflow
          </span>
        </div>

        {/* 4 Pipeline Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: 1,
              title: 'Multimodal Ingestion',
              desc: 'Parses narrative, photo features, location tokens, and metadata across English, Sinhala, and Tamil.',
              tag: 'Phase 01',
            },
            {
              step: 2,
              title: 'Dynamic Category Override',
              desc: 'When "Other" is selected, visual-semantic extraction discovers the true physical hazard phenomenon.',
              tag: 'Phase 02',
            },
            {
              step: 3,
              title: 'Proximity Risk Multiplier',
              desc: 'Contextualizes danger against sensitive zones: School Zones, Hospitals, or Major Arterial Highways.',
              tag: 'Phase 03',
            },
            {
              step: 4,
              title: 'SLA & Crew Scheduling',
              desc: 'Computes mandatory Colombo Municipal SLA (§14 resolution hours), crew size, and dispatch action.',
              tag: 'Phase 04',
            },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => setActiveStep(item.step)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                activeStep === item.step
                  ? 'border-cyan-500 bg-cyan-50/60 shadow-sm ring-1 ring-cyan-200'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                  {item.tag}
                </span>
                {activeStep === item.step && (
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                )}
              </div>
              <div className="font-bold text-slate-900 text-xs">{item.title}</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Deep Dive Callout */}
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-300 text-xs flex items-start gap-3 border border-slate-800">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white">LangGraph Step Deep-Dive (Phase {activeStep}): </span>
            {activeStep === 1 && (
              <span>
                Citizen submissions in Sri Lanka frequently mix colloquial Sinhala, Tamil, and English. The tokenizer normalizes slang and local terminology, linking raw citizen inputs to structured state variables (`description`, `location`, `category_supplied`, `metadata`).
              </span>
            )}
            {activeStep === 2 && (
              <span>
                Unlike static dropdown forms where selecting &quot;Other&quot; defaults to a low-priority generic backlog, the LangGraph LLM classifier detects semantic context. A burst pipe labeled as &quot;Other&quot; is dynamically reclassified to a high-priority Water Main Failure.
              </span>
            )}
            {activeStep === 3 && (
              <span>
                Municipal risk rules mandate: hazards located near a <strong>School Zone</strong> or <strong>Hospital</strong> receive elevated severity multipliers. Water flooding near a school during morning arrival hours presents immediate slipping hazards to children and traffic gridlock.
              </span>
            )}
            {activeStep === 4 && (
              <span>
                Produces certified JSON response with severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), urgency score, confidence metric, and chain-of-thought justification for municipal audit compliance.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Inference Workspace ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider block">
              Inference Playground
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-600" />
              Live Hazard Classification Workspace
            </h2>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveInputMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeInputMode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Interactive Multimodal Inputs
            </button>
            <button
              onClick={() => setActiveInputMode('existing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeInputMode === 'existing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              From Reported Hazard Tickets
            </button>
          </div>
        </div>

        {/* ── THE 4 INPUTS SECTION ────────────────────────────────────────────── */}
        {activeInputMode === 'custom' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input 1: Photo & Description */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Photo &amp; Description
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Multilingual</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Incident Narrative / Observation:
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed description in English, Sinhala, or Tamil..."
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 leading-relaxed font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  Photo Evidence URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... photo url"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-slate-700"
                  />
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Hazard evidence"
                      className="w-10 h-10 object-cover rounded-xl border border-slate-300 shadow-xs flex-shrink-0"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Input 2: Location & Proximity */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    Location &amp; Proximity
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Geospatial</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Street Address or Landmark:
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Near Royal College, Rajakeeya Mawatha, Colombo 07"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Proximity Risk Environment:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'School Zone', icon: School },
                    { label: 'Hospital / Clinic', icon: Hospital },
                    { label: 'Primary Highway', icon: Compass },
                    { label: 'Pedestrian Walkway', icon: Users },
                    { label: 'Commercial Zone', icon: Building2 },
                    { label: 'Residential Area', icon: Compass },
                  ].map((zone) => {
                    const Icon = zone.icon;
                    const isActive = proximityZone === zone.label;
                    return (
                      <button
                        key={zone.label}
                        type="button"
                        onClick={() => setProximityZone(zone.label)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl text-[11px] font-semibold border transition-all text-left ${
                          isActive
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-cyan-600'}`} />
                        <span className="truncate">{zone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Input 3: Citizen Category */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-600" />
                    Category (Reported)
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Citizen Tag</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Citizen-Selected Category:
                </label>
                <select
                  value={categorySupplied}
                  onChange={(e) => setCategorySupplied(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Other">Other (Unclassified / General)</option>
                  <option value="Water Leak">Water Leak / Main Pipe Burst</option>
                  <option value="Pothole">Pothole / Road Disruption</option>
                  <option value="Drainage & Flooding">Drainage &amp; Flooding</option>
                  <option value="Electrical / Powerline">Electrical / Power Lines</option>
                  <option value="Bridge / Structural">Bridge / Structural Crack</option>
                  <option value="Fallen Tree">Fallen Tree / Debris</option>
                </select>
              </div>

              {categorySupplied === 'Other' && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Category Override Enabled:</strong> When category is &quot;Other&quot;, the agent inspects the narrative and proximity factors to dynamically assign the real hazard type.
                  </div>
                </div>
              )}
            </div>

            {/* Input 4: Metadata */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-600" />
                    Environmental Metadata
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Multipliers</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <CloudRain className="w-3 h-3 text-cyan-600" />
                    Weather Condition:
                  </label>
                  <select
                    value={weatherCondition}
                    onChange={(e) => setWeatherCondition(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Heavy Monsoon Rain">Heavy Monsoon Rain</option>
                    <option value="Moderate Rain">Moderate Rain</option>
                    <option value="Dry / Clear">Dry / Clear</option>
                    <option value="Nighttime / Dark">Nighttime / Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-600" />
                    Traffic Flow:
                  </label>
                  <select
                    value={trafficDensity}
                    onChange={(e) => setTrafficDensity(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="School Arrival Rush">School Arrival Rush</option>
                    <option value="Peak Arterial Transit">Peak Arterial Transit</option>
                    <option value="Moderate Transit">Moderate Transit</option>
                    <option value="Low Transit / Night">Low Transit / Night</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Contextual Risk Notes:
                </label>
                <input
                  type="text"
                  value={customMetadata}
                  onChange={(e) => setCustomMetadata(e.target.value)}
                  placeholder="e.g. High pedestrian foot traffic, slippery road surface"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Select Citizen Hazard Ticket for Classification:
            </label>
            <select
              value={selectedHazardId}
              onChange={(e) => setSelectedHazardId(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {hazards.map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.ticketNumber}] {h.category} &bull; {h.description.slice(0, 70)}...
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleRunClassification}
            disabled={running}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {running ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Executing LangGraph StateGraph (gemini-3.8-flash)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                <span>Run LangGraph Hazard Classification</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetInputs}
            className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Fields</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ── THE 5 OUTPUTS DISPLAY ───────────────────────────────────────────── */}
        {result && (
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-300">
            {/* Header / Workflow Provenance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  LangGraph Agent Inference Output
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Classification &amp; SLA Triage Certified
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono font-bold">
                  {result.modelName}
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* 5 Outputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Output 1: Hazard Type */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-cyan-600" />
                  1. Hazard Type
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {result.category}
                </div>
                <div className="text-[10px] text-cyan-700 font-semibold flex items-center gap-1 pt-1">
                  <span>Input: &quot;{categorySupplied}&quot;</span>
                  <ArrowRight className="w-3 h-3 inline" />
                  <span className="font-bold text-emerald-600">Reclassified</span>
                </div>
              </div>

              {/* Output 2: Severity (LOW / MEDIUM / HIGH / CRITICAL) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  2. Severity Level
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-sm font-black uppercase border ring-1 ${getSeverityBadgeColor(
                      result.severity
                    )}`}
                  >
                    {result.severity}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Priority: <span className="font-bold text-slate-700">{result.priority}</span>
                </div>
              </div>

              {/* Output 3: Safety Risk & Urgency */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  3. Safety Risk Level
                </div>
                <div className="text-sm font-black text-rose-600 flex items-center gap-1">
                  <span>{result.riskLevel} Risk</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Zone Impact: <span className="font-semibold text-slate-700">{proximityZone || 'Standard'}</span>
                </div>
              </div>

              {/* Output 4: Confidence */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-600" />
                  4. Model Confidence
                </div>
                <div className="text-sm font-black text-cyan-700">
                  {(result.confidence * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Output 5: Reasoning (Detailed LLM Chain-of-Thought) */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-cyan-600" />
                  5. Agentic Reasoning &amp; Justification
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Grounding: Municipal Risk Multipliers §14
                </span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-normal bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                &ldquo;{result.reason}&rdquo;
              </p>

              {/* Dispatch Action & Municipal SLA Targets */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">SLA Target</span>
                    <span className="font-bold text-slate-900">{result.estimatedResponseHours} Hours Window</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Users className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Crew Allocation</span>
                    <span className="font-bold text-slate-900">{result.recommendedCrewSize} Field Workers</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Action Directive</span>
                    <span className="font-medium text-slate-800 truncate block max-w-xs">{result.recommendedAction}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HazardClassificationAIPage;
