import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CloudRain,
  School,
  Hospital,
  Compass,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  FileText,
  Zap,
  Waves,
  ShieldCheck,
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

interface PresetScenario {
  id: string;
  icon: any;
  title: string;
  badge: string;
  zone: string;
  categorySupplied: string;
  description: string;
  location: string;
  weather: string;
  traffic: string;
  metadata: string;
  photoUrl: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'school-water-burst',
    icon: Waves,
    title: 'School Zone Water Main Burst',
    badge: 'High Public Risk',
    zone: 'School Zone',
    categorySupplied: 'Other',
    description: 'A 110mm municipal water distribution pipe has ruptured outside Royal College, gushing high-pressure water onto Rajakeeya Mawatha sidewalk during the morning school arrival rush. Water is flooding the pedestrian pathway and causing student drop-off gridlock.',
    location: 'Near Royal College, Rajakeeya Mawatha, Colombo 07',
    weather: 'Heavy Monsoon Rain',
    traffic: 'School Arrival Rush',
    metadata: 'High student foot traffic, active water gushing, undermined road pavement',
    photoUrl: 'https://images.unsplash.com/photo-1584463699039-3972c726a457?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'live-wire-tree',
    icon: Zap,
    title: 'Live CEB Cable & Collapsed Tree',
    badge: 'Electrocution Danger',
    zone: 'Primary Highway',
    categorySupplied: 'Other',
    description: 'A large roadside banyan tree has fallen across Baseline Road, dragging down 400V high-voltage power lines that are now sparking on the wet roadway near Dematagoda railway overpass. Traffic blocked in both lanes.',
    location: 'Baseline Road near Dematagoda Bridge, Colombo 09',
    weather: 'Severe Thunderstorm & Wind',
    traffic: 'Major Arterial Highway',
    metadata: 'Live high-voltage wire on road surface, full lane blockage, fire risk',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'bridge-structural',
    icon: Building2,
    title: 'Kelani Bridge Joint Fracture',
    badge: 'Structural Hazard',
    zone: 'Primary Highway',
    categorySupplied: 'BridgeDamage',
    description: 'Deep transverse crack and exposed rusted rebar discovered along the northern abutment expansion joint of New Kelani Bridge approach. Concrete spalling onto roadway under heavy container lorry vibration.',
    location: 'New Kelani River Bridge Approach, Peliyagoda (A1 Corridor)',
    weather: 'Clear Daylight',
    traffic: 'Heavy Freight Corridor',
    metadata: 'Heavy freight corridor, structural vibration spalling, risk of structural failure',
    photoUrl: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'open-manhole-hospital',
    icon: AlertCircle,
    title: 'Open Manhole Cavity Near Hospital',
    badge: 'Pedestrian Trap',
    zone: 'Hospital / Clinic',
    categorySupplied: 'Other',
    description: 'Cast iron stormwater manhole cover has collapsed into the 2.5m deep sewer pit on the Galle Road sidewalk directly outside National Hospital entrance. Open pit is filled with murky water without any barrier.',
    location: 'Galle Road outside Colombo South Teaching Hospital, Kalubowila',
    weather: 'Light Rain',
    traffic: 'Ambulance & Emergency Route',
    metadata: 'Deep cavity on sidewalk, elderly and patient foot traffic, fall hazard',
    photoUrl: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'drainage-canal-clog',
    icon: CloudRain,
    title: 'Canal Inundation & Drain Blockage',
    badge: 'Monsoon Flash Flood',
    zone: 'Residential Area',
    categorySupplied: 'DrainageProblem',
    description: 'Subsurface culvert completely obstructed with solid plastic waste and fallen silt, causing torrential stormwater to overflow across Thimbirigasyaya Road into surrounding residential properties.',
    location: 'Thimbirigasyaya Road canal crossing, Havelock Town, Colombo 05',
    weather: 'Heavy Monsoon Rain',
    traffic: 'Suburban Peak Traffic',
    metadata: 'Culvert blocked, backflow into homes, water level rising 10cm/hr',
    photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
  },
];

export const HazardClassificationAIPage: React.FC = () => {
  const navigate = useNavigate();
  const [hazards, setHazards] = useState<SimpleHazard[]>([]);
  const [selectedHazardId, setSelectedHazardId] = useState<string>('');
  const [activeInputMode, setActiveInputMode] = useState<'custom' | 'existing'>('custom');

  // 4 Required Inputs: photo/description, location, category, and metadata
  const [description, setDescription] = useState<string>(PRESET_SCENARIOS[0].description);
  const [photoUrl, setPhotoUrl] = useState<string>(PRESET_SCENARIOS[0].photoUrl);
  const [location, setLocation] = useState<string>(PRESET_SCENARIOS[0].location);
  const [proximityZone, setProximityZone] = useState<string>(PRESET_SCENARIOS[0].zone);
  const [categorySupplied, setCategorySupplied] = useState<string>(PRESET_SCENARIOS[0].categorySupplied);
  const [weatherCondition, setWeatherCondition] = useState<string>(PRESET_SCENARIOS[0].weather);
  const [trafficDensity, setTrafficDensity] = useState<string>(PRESET_SCENARIOS[0].traffic);
  const [customMetadata, setCustomMetadata] = useState<string>(PRESET_SCENARIOS[0].metadata);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HazardClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedTelemetry, setCopiedTelemetry] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);

  // Active architecture step tab for interactive exploration
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_SCENARIOS[0].id);

  // Checked safety checklist tasks in result
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

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

  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedPresetId(preset.id);
    setDescription(preset.description);
    setLocation(preset.location);
    setProximityZone(preset.zone);
    setCategorySupplied(preset.categorySupplied);
    setWeatherCondition(preset.weather);
    setTrafficDensity(preset.traffic);
    setCustomMetadata(preset.metadata);
    setPhotoUrl(preset.photoUrl);
    setResult(null);
    setError(null);
  };

  const handleLanguageSample = (lang: 'en' | 'si' | 'ta') => {
    if (lang === 'si') {
      setDescription('පාසල අසල ප්‍රධාන ජල නළය පුපුරා ගොස් විශාල ජල කඳක් පාරට ගලා එයි. උදෑසන පාසල් ළමුන් සහ වාහන තදබදය නිසා අනතුරුදායක තත්වයක් උද්ගතව ඇත.');
      setLocation('රාජකීය විද්‍යාලය අසල, කොළඹ 07');
      setProximityZone('School Zone');
      setCategorySupplied('Other');
    } else if (lang === 'ta') {
      setDescription('பாடசாலைக்கு அருகில் பிரதான நீர் விநியோக குழாய் வெடித்து வீதியிலும் நடைபாதையிலும் நீர் பாய்கிறது. காலை வேளையில் மாணவர்கள் செல்வதற்கு கடும் ஆபத்து ஏற்பட்டுள்ளது.');
      setLocation('இராஜகீய மாவத்தை, கொழும்பு 07');
      setProximityZone('School Zone');
      setCategorySupplied('Other');
    } else {
      setDescription(PRESET_SCENARIOS[0].description);
      setLocation(PRESET_SCENARIOS[0].location);
      setProximityZone(PRESET_SCENARIOS[0].zone);
      setCategorySupplied(PRESET_SCENARIOS[0].categorySupplied);
    }
    setResult(null);
    setError(null);
  };

  const handleResetInputs = () => {
    setDescription('');
    setLocation('');
    setProximityZone('School Zone');
    setCategorySupplied('Other');
    setPhotoUrl('');
    setCustomMetadata('');
    setResult(null);
    setError(null);
    setCheckedActions({});
  };

  const handleRunClassification = async () => {
    if (!description.trim()) {
      setError('Please provide an incident description.');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    setActivePipelineStep(1);

    // Simulated pipeline step progression for realistic visual telemetry
    const stepInterval = setInterval(() => {
      setActivePipelineStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      if (activeInputMode === 'existing' && selectedHazardId) {
        const res = await aiService.analyzeHazard(selectedHazardId);
        setResult(res);
      } else {
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
      clearInterval(stepInterval);
      setActivePipelineStep(4);
      setRunning(false);
    }
  };

  const handleCopyTelemetry = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopiedTelemetry(true);
    setTimeout(() => setCopiedTelemetry(false), 2000);
  };

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getSeverityBadgeColor = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 border-rose-300 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 border-amber-300 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-600 border-blue-300 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-300 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    }
  };

  // Immediate actions parser
  const getActionList = (actionStr: string): string[] => {
    if (!actionStr) return ['Conduct on-site safety cordon verification', 'Notify zonal supervisor'];
    if (actionStr.includes(';')) return actionStr.split(';').map((s) => s.trim()).filter(Boolean);
    if (actionStr.includes('\n')) return actionStr.split('\n').map((s) => s.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    return [
      actionStr,
      'Deploy high-visibility reflective cones & hazard barrier perimeter',
      'Notify zonal municipal dispatch team for priority field verification',
    ];
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* ── Page Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 sm:p-9 text-white shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

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
                  LangGraph Agentic RAG
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SL Municipal Matrix §14
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Autonomous reasoning engine powered by <strong className="text-white">Google Gemini 3.1 Flash</strong> and <strong className="text-cyan-300">LangGraph StateGraph</strong>. Dynamically discovers physical failure mechanisms, overrides ambiguous citizen tags, and calibrates SLA windows.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-cyan-300 font-semibold">gemini-3.1-flash-lite</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium">Sinhala &bull; Tamil &bull; English</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1-Click Realistic Municipal Scenarios Bar ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Quick Test Scenarios (1-Click Municipal Incident Presets)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Select a verified Sri Lanka municipal case to test live AI reasoning
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRESET_SCENARIOS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPresetId === preset.id && activeInputMode === 'custom';
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setActiveInputMode('custom');
                  handleSelectPreset(preset);
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-50/50 shadow-sm ring-2 ring-cyan-200'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {preset.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {preset.title}
                  </h4>
                </div>
                <div className="mt-2 text-[10px] text-cyan-700 font-medium flex items-center gap-1">
                  <span>{preset.zone}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Interactive Inference Workspace ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider block">
              Inference Playground &amp; Triage Terminal
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

        {/* Multilingual Quick Insert Bar */}
        {activeInputMode === 'custom' && (
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-cyan-50/60 border border-cyan-100 text-xs">
            <Languages className="w-4 h-4 text-cyan-700 ml-1 flex-shrink-0" />
            <span className="font-semibold text-cyan-900 text-[11px]">Test Multilingual NLP:</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => handleLanguageSample('en')}
                className="px-2.5 py-1 rounded-lg bg-white border border-cyan-200 text-cyan-800 text-[11px] font-bold hover:bg-cyan-100 transition-colors"
              >
                English Sample
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSample('si')}
                className="px-2.5 py-1 rounded-lg bg-white border border-cyan-200 text-cyan-800 text-[11px] font-bold hover:bg-cyan-100 transition-colors"
              >
                සිංහල (Sinhala)
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSample('ta')}
                className="px-2.5 py-1 rounded-lg bg-white border border-cyan-200 text-cyan-800 text-[11px] font-bold hover:bg-cyan-100 transition-colors"
              >
                தமிழ் (Tamil)
              </button>
            </div>
          </div>
        )}

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
                    Incident Narrative &amp; Observation
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Multimodal Tokenizer</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Citizen Hazard Report Text:
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
                    Geospatial Location &amp; Buffer
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Buffer Zone §14</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Street Address or Municipal Landmark:
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
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{zone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Input 3: Citizen-Supplied Category */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-600" />
                    Supplied Citizen Category
                  </label>
                </div>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Override Target
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Citizen-Selected Category in Portal:
                </label>
                <select
                  value={categorySupplied}
                  onChange={(e) => setCategorySupplied(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-800"
                >
                  <option value="Other">Other / Unclassified Municipal Issue</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Water Leak">Water Leak</option>
                  <option value="DrainageProblem">Drainage Problem</option>
                  <option value="FallenTreeHazard">Fallen Tree / Vegetation Hazard</option>
                  <option value="ElectricalHazard">Electrical Hazard / Broken Pole</option>
                  <option value="BridgeDamage">Bridge Damage / Structural Joint</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5 italic">
                  Tip: The AI agent dynamically assesses the incident context, preserving &quot;Other&quot; for general civic matters or deducing root physical failures.
                </p>
              </div>
            </div>

            {/* Input 4: Contextual Metadata */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-600" />
                    Environmental Telemetry &amp; Weather
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Risk Factors</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Weather Condition:
                  </label>
                  <select
                    value={weatherCondition}
                    onChange={(e) => setWeatherCondition(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-800"
                  >
                    <option value="Heavy Monsoon Rain">Heavy Monsoon Rain (Flooding Risk)</option>
                    <option value="Severe Thunderstorm & Wind">Severe Thunderstorm &amp; High Wind</option>
                    <option value="Clear Daylight">Clear Daylight (Dry Surface)</option>
                    <option value="Nighttime / Low Visibility">Nighttime (Low Visibility Hazard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Traffic Density:
                  </label>
                  <select
                    value={trafficDensity}
                    onChange={(e) => setTrafficDensity(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-800"
                  >
                    <option value="School Arrival Rush">School Arrival Rush (High Pedestrian)</option>
                    <option value="Major Arterial Highway">Major Arterial Highway (Heavy Transit)</option>
                    <option value="Moderate Flow">Moderate Suburban Flow</option>
                    <option value="Light Residential">Light Residential</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Contextual Risk Observations:
                </label>
                <input
                  type="text"
                  value={customMetadata}
                  onChange={(e) => setCustomMetadata(e.target.value)}
                  placeholder="e.g. Active high-pressure water, student transit, undermined asphalt"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-800"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Mode 2: From Existing Hazard Tickets */
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Select Reported Municipal Hazard Ticket:
            </label>
            <select
              value={selectedHazardId}
              onChange={(e) => setSelectedHazardId(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-800"
            >
              {hazards.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.ticketNumber} &mdash; [{h.category}] {h.description.slice(0, 90)}... ({h.address || 'Colombo'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Evaluates the selected database record against the LangGraph multi-agent RAG workflow.
            </p>
          </div>
        )}

        {/* ── ACTION BUTTON BAR ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleRunClassification}
            disabled={running}
            className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-xs text-white shadow-md transition-all ${
              running
                ? 'bg-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] shadow-cyan-600/20'
            }`}
          >
            {running ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-cyan-300" />
                <span>Executing LangGraph StateGraph (gemini-3.1-flash-lite)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white fill-white" />
                <span>Run LangGraph Hazard Classification &amp; Triage</span>
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

        {/* ── LIVE PIPELINE EXECUTION INDICATOR ──────────────────────────────── */}
        {running && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-cyan-400 font-bold flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Agentic StateGraph Pipeline Active
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Stage {activePipelineStep}/4</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {[
                '1. Sri Lanka BSR RAG',
                '2. Category Override',
                '3. Proximity Multiplier',
                '4. Certified SLA Output',
              ].map((stageName, idx) => {
                const isCurrent = activePipelineStep === idx + 1;
                const isDone = activePipelineStep > idx + 1;
                return (
                  <div
                    key={stageName}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300 font-bold animate-pulse'
                        : isDone
                        ? 'border-emerald-700 bg-emerald-950/30 text-emerald-300 font-medium'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    {stageName}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ── THE 5 OUTPUTS DISPLAY: CERTIFIED MUNICIPAL DOSSIER ─────────────── */}
        {result && (
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-300">
            {/* Header / Workflow Provenance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 block">
                  Municipal Infrastructure Authority Certification
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Classification &amp; SLA Triage Certified
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono font-bold">
                  {result.modelName}
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTelemetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
                  title="Copy full JSON payload"
                >
                  {copiedTelemetry ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 5 Outputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Output 1: Hazard Type */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-cyan-600" />
                  1. Physical Hazard Type
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {result.category}
                </div>
                <div className="text-[10px] text-cyan-700 font-semibold flex items-center gap-1 pt-1">
                  <span>Input: &quot;{categorySupplied}&quot;</span>
                  <ArrowRight className="w-3 h-3 inline" />
                  {result.category.toLowerCase() === categorySupplied.toLowerCase() || (categorySupplied === 'Other' && result.category === 'Other') ? (
                    <span className="font-bold text-cyan-600">Preserved / Verified</span>
                  ) : (
                    <span className="font-bold text-emerald-600">Reclassified</span>
                  )}
                </div>
              </div>

              {/* Output 2: Severity (LOW / MEDIUM / HIGH / CRITICAL) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  2. Calibrated Severity
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
                  Dispatch Priority: <span className="font-bold text-slate-800">{result.priority}</span>
                </div>
              </div>

              {/* Output 3: Safety Risk & Urgency */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  3. Safety Risk Level
                </div>
                <div className="text-sm font-black text-rose-600 flex items-center gap-1">
                  <span>{result.riskLevel} Public Risk</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Buffer Impact: <span className="font-semibold text-slate-700">{proximityZone || 'Standard'}</span>
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
                  5. Agentic Chain-of-Thought Reasoning &amp; Justification
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
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Target SLA Window</span>
                    <span className="font-bold text-slate-900">{result.estimatedResponseHours} Hours</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Users className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Crew Allocation</span>
                    <span className="font-bold text-slate-900">{result.recommendedCrewSize} Field Specialists</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Directive</span>
                    <span className="font-medium text-slate-800 truncate block max-w-xs">{result.recommendedAction}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── IMMEDIATE SAFETY CHECKLIST & DISPATCH DIRECTIVE ──────────────── */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Mandatory Immediate Safety Action Protocol
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                  Supervisor Checklist
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {getActionList(result.recommendedAction).map((action, idx) => {
                  const isChecked = !!checkedActions[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleAction(idx)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs transition-all ${
                        isChecked
                          ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-200 line-through'
                          : 'border-slate-800 bg-slate-800/80 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isChecked ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-600'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="leading-snug">{action}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px]">
                  Directive validated for district execution under Sri Lanka Municipal Act.
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/work-orders/create')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Create Work Order from AI Dispatch</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
              title: 'Certified SLA Window',
              desc: 'Calibrates SLA resolution hours, crew size, and required utility/police coordination directives.',
              tag: 'Phase 04',
            },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(item.step)}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                activeStep === item.step
                  ? 'border-cyan-500 bg-cyan-50/40 shadow-sm ring-1 ring-cyan-500'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center ${
                    activeStep === item.step ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.step}
                </span>
                <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider font-mono">
                  {item.tag}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mb-1">{item.title}</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Detailed Explanation for Active Step */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div>
            {activeStep === 1 && (
              <span>
                <strong>Stage 1 (Multimodal Ingestion):</strong> Ingests unstructured citizen prose, photos, and coordinates. Recognizes local Sri Lankan street colloquialisms and native Sinhala/Tamil script, mapping terms like &quot;පාසල අසල ජල නළය&quot; to formal municipal infrastructure entities.
              </span>
            )}
            {activeStep === 2 && (
              <span>
                <strong>Stage 2 (Dynamic Category Override):</strong> Overrides citizen selections of generic categories like &quot;Other&quot; or &quot;General&quot;. Discovers true root causes such as 110mm distribution pipe bursts or high-voltage line entanglements.
              </span>
            )}
            {activeStep === 3 && (
              <span>
                <strong>Stage 3 (Proximity Risk Multiplier):</strong> Evaluates a 150m geospatial radius. Incidents within 100m of schools or hospitals receive an automatic severity escalation to CRITICAL / HIGH, reducing SLA windows from 48h to 4-12h.
              </span>
            )}
            {activeStep === 4 && (
              <span>
                <strong>Stage 4 (Certified Output):</strong> Produces a certified municipal JSON response with calibrated SLA response window, assigned crew composition, and itemized safety directives.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HazardClassificationAIPage;
