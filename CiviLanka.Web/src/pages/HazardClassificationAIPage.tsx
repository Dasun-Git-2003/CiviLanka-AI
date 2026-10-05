import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Brain,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
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
  School,
  Hospital,
  Compass,
  RefreshCw,
  Copy,
  Check,
  FileText,
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



export const HazardClassificationAIPage: React.FC = () => {
  const navigate = useNavigate();
  const [hazards, setHazards] = useState<SimpleHazard[]>([]);
  const [selectedHazardId, setSelectedHazardId] = useState<string>('');
  const [activeInputMode, setActiveInputMode] = useState<'custom' | 'existing'>('custom');

  // 4 Required Inputs: photo/description, location, category, and metadata
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [proximityZone, setProximityZone] = useState<string>('Primary Highway');
  const [categorySupplied, setCategorySupplied] = useState<string>('Other');
  const [weatherCondition, setWeatherCondition] = useState<string>('Clear Daylight');
  const [trafficDensity, setTrafficDensity] = useState<string>('Moderate Flow');
  const [customMetadata, setCustomMetadata] = useState<string>('');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HazardClassificationResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    actionableTip?: string;
    canRetry?: boolean;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    description?: string;
    location?: string;
    photoUrl?: string;
    selectedHazardId?: string;
  }>({});
  const [copiedTelemetry, setCopiedTelemetry] = useState(false);
  const [copiedDirectives, setCopiedDirectives] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);

  // Active architecture step tab for interactive exploration
  const [activeStep, setActiveStep] = useState<number>(1);

  // Checked safety checklist tasks in result
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

  const isCategoryPreserved = (resCat?: string, inputCat?: string): boolean => {
    if (!resCat || !inputCat) return false;
    const cleanRes = resCat.replace(/[\s\-_&]/g, '').toLowerCase();
    const cleanInput = inputCat.replace(/[\s\-_&]/g, '').toLowerCase();
    if (cleanRes === cleanInput) return true;

    // Strict semantic pairs to prevent cross-contamination
    const isInputDrain = cleanInput.includes('drainage') || cleanInput.includes('drain');
    const isResDrain = cleanRes.includes('drainage') || cleanRes.includes('drain');
    if (isInputDrain || isResDrain) return isInputDrain && isResDrain;

    const isInputSewage = cleanInput.includes('sewage') || cleanInput.includes('wastewater') || cleanInput.includes('blackwater');
    const isResSewage = cleanRes.includes('sewage') || cleanRes.includes('wastewater') || cleanRes.includes('blackwater');
    if (isInputSewage || isResSewage) return isInputSewage && isResSewage;

    const isInputWater = cleanInput.includes('watermain') || cleanInput.includes('waterleak') || cleanInput.includes('pipeburst') || cleanInput.includes('waterpipe');
    const isResWater = cleanRes.includes('watermain') || cleanRes.includes('waterleak') || cleanRes.includes('pipeburst') || cleanRes.includes('waterpipe');
    if (isInputWater || isResWater) return isInputWater && isResWater;

    if (cleanInput.includes('sinkhole') && cleanRes.includes('sinkhole')) return true;
    if (cleanInput.includes('gas') && cleanRes.includes('gas')) return true;
    if (cleanInput.includes('landslide') && cleanRes.includes('landslide')) return true;
    if (cleanInput.includes('retaining') && cleanRes.includes('retaining')) return true;
    if (cleanInput.includes('underpass') && cleanRes.includes('underpass')) return true;
    if (cleanInput.includes('signal') && cleanRes.includes('signal')) return true;
    if (cleanInput.includes('oil') && cleanRes.includes('oil')) return true;
    if (cleanInput.includes('bridge') && cleanRes.includes('bridge')) return true;
    if (cleanInput.includes('guardrail') && (cleanRes.includes('guardrail') || cleanRes.includes('crashbarrier'))) return true;
    if (cleanInput.includes('manhole') && cleanRes.includes('manhole')) return true;
    if ((cleanInput.includes('chemical') || cleanInput.includes('waste')) && (cleanRes.includes('chemical') || cleanRes.includes('waste'))) return true;
    if ((cleanInput.includes('walkway') || cleanInput.includes('footpath')) && (cleanRes.includes('walkway') || cleanRes.includes('footpath'))) return true;
    if ((cleanInput.includes('coastal') || cleanInput.includes('seawall')) && (cleanRes.includes('coastal') || cleanRes.includes('seawall'))) return true;
    if (cleanInput.includes('voltage') && cleanRes.includes('voltage')) return true;
    if (cleanInput.includes('streetlight') && cleanRes.includes('streetlight')) return true;
    if (cleanInput.includes('utilitypole') && cleanRes.includes('utilitypole')) return true;
    if (cleanInput.includes('pothole') && cleanRes.includes('pothole')) return true;
    if (cleanInput.includes('tree') && cleanRes.includes('tree')) return true;
    if (cleanInput === 'other' && cleanRes === 'other') return true;
    return false;
  };

  // Fetch hazards from backend for "From Reported Hazards" mode
  useEffect(() => {
    const fetchHazards = async () => {
      try {
        const res = await apiClient.get<SimpleHazard[]>('/api/hazards');
        setHazards(res.data || []);
        if (res.data?.length > 0) {
          setSelectedHazardId(res.data[0].id);
          setCategorySupplied(res.data[0].category || 'Other');
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
        setCategorySupplied(fallback[0].category || 'Other');
      }
    };
    fetchHazards();
  }, []);

  const handleLanguageSample = (lang: 'en' | 'si' | 'ta') => {
    if (lang === 'si') {
      setTitle('පාසල අසල ප්‍රධාන ජල නළය පුපුරා යාම');
      setDescription('පාසල අසල ප්‍රධාන ජල නළය පුපුරා ගොස් විශාල ජල කඳක් පාරට ගලා එයි. උදෑසන පාසල් ළමුන් සහ වාහන තදබදය නිසා අනතුරුදායක තත්වයක් උද්ගතව ඇත.');
      setLocation('රාජකීය විද්‍යාලය අසල, කොළඹ 07');
      setProximityZone('School Zone');
      setCategorySupplied('Other');
    } else if (lang === 'ta') {
      setTitle('பாடசாலைக்கு அருகில் பிரதான நீர் குழாய் வெடிப்பு');
      setDescription('பாடசாலைக்கு அருகில் பிரதான நீர் விநியோக குழாய் வெடித்து வீதியிலும் நடைபாதையிலும் நீர் பாய்கிறது. காலை வேளையில் மாணவர்கள் செல்வதற்கு கடும் ஆபத்து ஏற்பட்டுள்ளது.');
      setLocation('இராஜகீய மாவத்தை, කොழुம்பு 07');
      setProximityZone('School Zone');
      setCategorySupplied('Other');
    } else {
      setTitle('Water Main Burst with Deep Sinkhole');
      setDescription('A major underground water pipe has burst along Kandy Road near Kiribathgoda junction, flooding two lanes and creating a deep sinkhole. Water is flowing rapidly across the roadway.');
      setLocation('Kandy Road near Kiribathgoda Junction');
      setProximityZone('Primary Highway');
      setCategorySupplied('Water Main Burst');
    }
    setResult(null);
    setErrorDetails(null);
    setFieldErrors({});
  };

  const handleResetInputs = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setProximityZone('School Zone');
    setCategorySupplied('Other');
    setPhotoUrl('');
    setCustomMetadata('');
    setResult(null);
    setErrorDetails(null);
    setFieldErrors({});
    setCheckedActions({});
  };

  const handleSwitchMode = (mode: 'custom' | 'existing') => {
    setActiveInputMode(mode);
    setFieldErrors({});
    setErrorDetails(null);
  };

  const validateInputs = (): boolean => {
    const errors: {
      title?: string;
      description?: string;
      location?: string;
      photoUrl?: string;
      selectedHazardId?: string;
    } = {};

    if (activeInputMode === 'existing') {
      if (hazards.length === 0) {
        errors.selectedHazardId = 'No reported municipal tickets found in the database. Switch to "Interactive Multimodal Inputs" to evaluate custom scenarios.';
      } else if (!selectedHazardId) {
        errors.selectedHazardId = 'Please select a reported municipal hazard ticket from the dropdown.';
      }
    } else {
      if (title.trim() && title.trim().length < 3) {
        errors.title = 'Topic / Headline must be at least 3 characters.';
      }

      if (!description.trim()) {
        errors.description = 'Citizen hazard report description is required.';
      } else if (description.trim().length < 10) {
        errors.description = 'Please enter at least 10 characters describing the physical damage (e.g. culvert silt, depth, affected lanes).';
      } else if (description.length > 3000) {
        errors.description = 'Description exceeds maximum allowed limit of 3,000 characters.';
      }

      if (!location.trim()) {
        errors.location = 'Street address, intersection, or landmark is required for spatial buffer analysis.';
      } else if (location.trim().length < 3) {
        errors.location = 'Location name must be at least 3 characters.';
      }

      if (photoUrl.trim()) {
        const isUrl = /^https?:\/\/.+/i.test(photoUrl.trim()) || /^data:image\//i.test(photoUrl.trim());
        if (!isUrl) {
          errors.photoUrl = 'Please provide a valid HTTP/HTTPS image URL (e.g. https://example.com/photo.jpg).';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRunClassification = async () => {
    setErrorDetails(null);

    const isValid = validateInputs();
    if (!isValid) {
      setErrorDetails({
        title: 'Form Validation Incomplete',
        message: 'Please resolve the highlighted input fields above before running the LangGraph triage pipeline.',
        actionableTip: activeInputMode === 'custom'
          ? 'Ensure both incident description (min 10 chars) and municipal location are specified.'
          : 'Select an active database hazard ticket to evaluate.',
        canRetry: false,
      });
      return;
    }

    setRunning(true);
    setResult(null);
    setActivePipelineStep(1);

    // Simulated pipeline step progression for realistic visual telemetry
    const stepInterval = setInterval(() => {
      setActivePipelineStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      if (activeInputMode === 'existing' && selectedHazardId) {
        const matched = hazards.find((h) => h.id === selectedHazardId);
        if (matched) {
          setCategorySupplied(matched.category || 'Other');
        }
        try {
          const res = await aiService.analyzeHazard(selectedHazardId);
          setResult(res);
        } catch (apiErr: any) {
          // If analyzeHazard endpoint failed, classify using the selected ticket's details
          if (matched) {
            const res = await aiService.classifyLiveHazard({
              title: `${matched.ticketNumber}: ${matched.category}`,
              description: matched.description,
              location: matched.address || 'Colombo Municipal Area',
              categorySupplied: matched.category,
              metadata: `Ticket: ${matched.ticketNumber}; Severity: ${matched.severity}`,
            });
            setResult(res);
          } else {
            throw apiErr;
          }
        }
      } else {
        const compiledMetadata = `Weather: ${weatherCondition}; Traffic: ${trafficDensity}; Context: ${customMetadata}`;
        const res = await aiService.classifyLiveHazard({
          title: title.trim() || undefined,
          description: description.trim(),
          location: location.trim(),
          proximityZone,
          categorySupplied,
          metadata: compiledMetadata,
          imageUrl: photoUrl.trim() || undefined,
        });
        setResult(res);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'AI Classification failed.';
      setErrorDetails({
        title: 'AI Classification Pipeline Execution Failed',
        message: errMsg,
        actionableTip: 'Ensure backend API services on port 5000 and Agent on port 8001 are running, or try simplifying your input description.',
        canRetry: true,
      });
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

  const getResponsibleAuthority = (category: string) => {
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('gas')) {
      return {
        name: 'CMC Fire & Rescue Service / Litro-Laugfs Gas Safety Unit',
        division: 'Flammable Gas Emergency Response & Hazmat Suppression Wing',
        hotline: 'Fire & Rescue Hotline: 110 / Police: 119',
        badgeColor: 'border-rose-600/40 bg-rose-950/70 text-rose-300',
        accentBg: 'bg-rose-600/10 text-rose-400 border-rose-600/30',
      };
    }
    if (catLower.includes('voltage') || catLower.includes('live wire') || catLower.includes('high voltage')) {
      return {
        name: 'Ceylon Electricity Board (CEB) Emergency Response',
        division: 'High-Voltage Transmission & Distribution Substation Safety Unit',
        hotline: 'CEB Rapid Breakdown: 1987 / LECO Emergency: 1910',
        badgeColor: 'border-yellow-500/40 bg-yellow-950/70 text-yellow-300',
        accentBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      };
    }
    if (catLower.includes('sinkhole') || catLower.includes('subsidence')) {
      return {
        name: 'Road Development Authority (RDA) Geotechnical Engineering',
        division: 'Subsurface Cavity Investigation & Ground Stabilization Division',
        hotline: 'RDA Emergency: 1968 / NBRO: 011-2588946',
        badgeColor: 'border-red-600/40 bg-red-950/70 text-red-300',
        accentBg: 'bg-red-600/10 text-red-400 border-red-600/30',
      };
    }
    if (catLower.includes('sewage') || catLower.includes('wastewater') || catLower.includes('blackwater')) {
      return {
        name: 'NWSDB Sewerage Division & CMC Public Health Department',
        division: 'Municipal Sewer Network & Biohazard Sanitation Unit',
        hotline: 'NWSDB Sewerage: 1939 / CMC Health: 011-2691922',
        badgeColor: 'border-emerald-700/40 bg-emerald-950/70 text-emerald-300',
        accentBg: 'bg-emerald-700/10 text-emerald-400 border-emerald-700/30',
      };
    }
    if (catLower.includes('guardrail') || catLower.includes('crash barrier')) {
      return {
        name: 'Road Development Authority (RDA) Expressway & Highway Safety',
        division: 'Crash Barrier & Roadside Safety Infrastructure Wing',
        hotline: 'RDA Highway Hotline: 1968 / Expressway Ops: 1969',
        badgeColor: 'border-slate-500/40 bg-slate-950/70 text-slate-300',
        accentBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      };
    }
    if (catLower.includes('chemical') || catLower.includes('toxic') || catLower.includes('waste dump')) {
      return {
        name: 'Central Environmental Authority (CEA) & CMC Waste Management',
        division: 'Industrial Chemical Safety & Hazardous Waste Remediation Unit',
        hotline: 'CEA Hotline: 011-2872278 / DMC: 117',
        badgeColor: 'border-purple-600/40 bg-purple-950/70 text-purple-300',
        accentBg: 'bg-purple-600/10 text-purple-400 border-purple-600/30',
      };
    }
    if (catLower.includes('coastal') || catLower.includes('seawall') || catLower.includes('revetment')) {
      return {
        name: 'Coast Conservation Department (CCD) & RDA Coastal Protection',
        division: 'Marine Revetment & Coastal Infrastructure Protection Wing',
        hotline: 'CCD Emergency: 011-2449754 / DMC: 117',
        badgeColor: 'border-cyan-600/40 bg-cyan-950/70 text-cyan-300',
        accentBg: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/30',
      };
    }
    if (catLower.includes('walkway') || catLower.includes('footpath')) {
      return {
        name: 'Municipal Council Civil Engineering & Urban Development (UDA)',
        division: 'Non-Motorized Transport & Pedestrian Infrastructure Unit',
        hotline: 'Municipal Civil Works: 011-2692225',
        badgeColor: 'border-teal-600/40 bg-teal-950/70 text-teal-300',
        accentBg: 'bg-teal-600/10 text-teal-400 border-teal-600/30',
      };
    }
    if (catLower.includes('oil')) {
      return {
        name: 'CMC Fire & Rescue Service / Sri Lanka Police Hazmat',
        division: 'Chemical Hazard Suppression & Hydrocarbon Remediation Unit',
        hotline: 'CMC Fire Brigade: 011-2422222 / 110',
        badgeColor: 'border-orange-500/40 bg-orange-950/70 text-orange-300',
        accentBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      };
    }
    if (catLower.includes('landslide') || catLower.includes('slope') || catLower.includes('retaining wall') || catLower.includes('wall')) {
      return {
        name: 'National Building Research Organisation (NBRO) & RDA',
        division: 'Landslide Risk Management & Slope Geotechnical Assessment Wing',
        hotline: 'NBRO Emergency: 011-2588946 / 117',
        badgeColor: 'border-amber-600/40 bg-amber-950/70 text-amber-300',
        accentBg: 'bg-amber-600/10 text-amber-400 border-amber-600/30',
      };
    }
    if (catLower.includes('signal') || catLower.includes('traffic')) {
      return {
        name: 'Sri Lanka Police Traffic Headquarters & RDA Traffic Engineering',
        division: 'Intersection Signal Control & Road Safety Traffic Management Division',
        hotline: 'Police Traffic HQ: 011-2433333 / 119',
        badgeColor: 'border-yellow-500/40 bg-yellow-950/70 text-yellow-300',
        accentBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      };
    }
    if (catLower.includes('underpass') || catLower.includes('rail')) {
      return {
        name: 'Sri Lanka Railways (SLR) & CMC Drainage Division',
        division: 'Subway Drainage Infrastructure & Transit Corridor Safety Operations',
        hotline: 'Railway Operations: 011-2434215 / CMC: 011-2684290',
        badgeColor: 'border-teal-500/40 bg-teal-950/70 text-teal-300',
        accentBg: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      };
    }
    if (catLower.includes('utility') || catLower.includes('telecom') || catLower.includes('cable')) {
      return {
        name: 'Sri Lanka Telecom (SLT-Mobitel) & CEB Joint Infrastructure',
        division: 'Overhead Telecom & Low-Voltage Cable Restoration Unit',
        hotline: 'SLT Fault Helpline: 1212 / CEB: 1987',
        badgeColor: 'border-sky-500/40 bg-sky-950/70 text-sky-300',
        accentBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      };
    }
    if (catLower.includes('drain') || catLower.includes('flood') || catLower.includes('culvert') || catLower.includes('silt')) {
      return {
        name: 'CMC Drainage & Flood Control Division',
        division: 'Metro Stormwater Inundation & Culvert Jetting Operations',
        hotline: 'CMC Flood Ops: 011-2684290 / 011-2696515',
        badgeColor: 'border-blue-500/40 bg-blue-950/70 text-blue-300',
        accentBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      };
    }
    if (catLower.includes('water pipe') || catLower.includes('water main') || catLower.includes('water leak') || catLower.includes('potable') || catLower.includes('burst')) {
      return {
        name: 'National Water Supply & Drainage Board (NWSDB)',
        division: 'Western Province Regional Production & Distribution Operations',
        hotline: 'Emergency Hotline: 1939',
        badgeColor: 'border-cyan-500/40 bg-cyan-950/70 text-cyan-300',
        accentBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      };
    }
    if (catLower.includes('electric') || catLower.includes('light')) {
      return {
        name: 'Ceylon Electricity Board (CEB) / CMC Electrical Division',
        division: 'Colombo Distribution Maintenance & High-Voltage Grid Safety Unit',
        hotline: 'CEB Emergency: 1987',
        badgeColor: 'border-amber-500/40 bg-amber-950/70 text-amber-300',
        accentBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    if (catLower.includes('tree')) {
      return {
        name: 'Disaster Management Centre (DMC) & CMC Lands Division',
        division: 'Emergency Road Clearance & Urban Forestry Operations',
        hotline: 'DMC Hotline: 117 / 011-2696156',
        badgeColor: 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300',
        accentBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      };
    }
    if (catLower.includes('bridge') || catLower.includes('structur')) {
      return {
        name: 'Road Development Authority (RDA) National Bridge Division',
        division: 'Bridge Assessment & Structural Integrity Wing',
        hotline: 'RDA Maintenance Desk: 011-2862795 / 1968',
        badgeColor: 'border-purple-500/40 bg-purple-950/70 text-purple-300',
        accentBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      };
    }
    if (catLower.includes('manhole') || catLower.includes('pit') || catLower.includes('cavity')) {
      return {
        name: 'CMC Engineering Department',
        division: 'Subsurface Chambers & Pedestrian Cavity Safety Unit',
        hotline: 'CMC Zonal Depot: 011-2692244',
        badgeColor: 'border-rose-500/40 bg-rose-950/70 text-rose-300',
        accentBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    }
    if (catLower.includes('road') || catLower.includes('pothole')) {
      return {
        name: 'CMC Engineering Department / RDA Provincial',
        division: 'Asphalt Pavement & Carriageway Rapid Patching Unit',
        hotline: 'CMC Works Depot: 011-2692244',
        badgeColor: 'border-indigo-500/40 bg-indigo-950/70 text-indigo-300',
        accentBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      };
    }
    return {
      name: 'Colombo Municipal Council (CMC)',
      division: 'Zonal Public Works & Administrative Enforcement Division',
      hotline: 'Government Citizen Hotline: 1919',
      badgeColor: 'border-slate-500/40 bg-slate-900 text-slate-300',
      accentBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    };
  };

  const handleCopyDirectives = () => {
    if (!result) return;
    const auth = getResponsibleAuthority(result.category);
    const actions = getActionList(result.recommendedAction);
    const text = [
      `🏛️ MUNICIPAL DISPATCH DIRECTIVE DOSSIER`,
      `=============================================`,
      `Incident Category: ${result.category}`,
      `Calibrated Severity: ${result.severity} | Priority: ${result.priority}`,
      `Statutory SLA Window: ${result.estimatedResponseHours} Hours`,
      `Crew Allocation: ${result.recommendedCrewSize} Field Specialists`,
      `Governing Authority: ${auth.name}`,
      `Operational Division: ${auth.division}`,
      `Emergency Contact: ${auth.hotline}`,
      `Legal Grounding: Sri Lanka Municipal Councils Ordinance §14`,
      ``,
      `MANDATORY OPERATIONAL DIRECTIVES:`,
      ...actions.map((act, idx) => `[DIRECTIVE-${String(idx + 1).padStart(2, '0')}] ${act}`),
      `=============================================`,
      `Generated by CiviLanka Multi-Agent AI System`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedDirectives(true);
    setTimeout(() => setCopiedDirectives(false), 2000);
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
              onClick={() => handleSwitchMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeInputMode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Interactive Multimodal Inputs
            </button>
            <button
              onClick={() => handleSwitchMode('existing')}
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
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Custom Disaster Topic / Headline:</span>
                  <span className="text-[10px] text-cyan-600 font-semibold">e.g. Drainage Problem, Water Main Burst, Landslide</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="e.g. Drainage Problem, Water Main Burst, Collapsed Retaining Wall..."
                  className={`w-full text-xs p-2.5 rounded-xl border font-bold text-slate-900 transition-colors ${
                    fieldErrors.title
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                      : 'border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.title}</span>
                  </p>
                )}

                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    ⚡ Quick Topic Selector (20+ Expanded Municipal Hazards):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-100/70 rounded-xl border border-slate-200">
                    {[
                      'Water Main Burst',
                      'Drainage Problem',
                      'Drainage Cover Collapse',
                      'Sinkhole & Ground Subsidence',
                      'Roadside Landslide',
                      'Collapsed Retaining Wall',
                      'Flooded Underpass',
                      'Damaged Traffic Signal',
                      'Broken Streetlight Pole',
                      'Fallen Utility Pole',
                      'Oil Spill on Roadway',
                      'Bridge Structural Damage',
                      'Sewage & Wastewater Overflow',
                      'Exposed High-Voltage Cable',
                      'Damaged Highway Guardrail',
                      'Missing Manhole Cover',
                      'Hazardous Chemical & Waste Dump',
                      'Pedestrian Walkway Collapse',
                      'Gas or Combustible Vapour Leak',
                      'Coastal Erosion & Seawall Breach',
                      'Large Pothole',
                      'Fallen Tree',
                    ].map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => {
                          setTitle(topic);
                          setCategorySupplied(topic);
                          if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold border transition-all ${
                          title === topic
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:text-cyan-700'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Citizen Hazard Report Text: <strong className="text-rose-500">*</strong></span>
                  <span className={`text-[10px] font-mono ${description.length > 2800 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {description.length} / 3000
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Enter detailed description in English, Sinhala, or Tamil (e.g. culvert silt accumulation, drain blockages, road water accumulation)..."
                  className={`w-full text-xs p-3.5 rounded-xl border leading-relaxed font-medium transition-colors ${
                    fieldErrors.description
                      ? 'border-rose-400 bg-rose-50/20 text-slate-900 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                      : 'border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800'
                  }`}
                />
                {fieldErrors.description ? (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.description}</span>
                  </p>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">Min 10 characters required for accurate physical failure evaluation.</span>
                )}
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
                    onChange={(e) => {
                      setPhotoUrl(e.target.value);
                      if (fieldErrors.photoUrl) setFieldErrors((prev) => ({ ...prev, photoUrl: undefined }));
                    }}
                    placeholder="https://... photo url"
                    className={`flex-1 text-xs p-2.5 rounded-xl border font-mono text-slate-700 transition-colors ${
                      fieldErrors.photoUrl
                        ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                        : 'border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500'
                    }`}
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
                {fieldErrors.photoUrl && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.photoUrl}</span>
                  </p>
                )}
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
                  Street Address or Municipal Landmark: <strong className="text-rose-500">*</strong>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (fieldErrors.location) setFieldErrors((prev) => ({ ...prev, location: undefined }));
                  }}
                  placeholder="e.g. Near Royal College, Rajakeeya Mawatha, Colombo 07"
                  className={`w-full text-xs p-2.5 rounded-xl border font-medium text-slate-800 transition-colors ${
                    fieldErrors.location
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                      : 'border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500'
                  }`}
                />
                {fieldErrors.location && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.location}</span>
                  </p>
                )}
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
                  <option value="Water Main Burst">Water Main Burst (Underground High-Pressure)</option>
                  <option value="Collapsed Retaining Wall">Collapsed Retaining Wall (Slope Failure)</option>
                  <option value="Damaged Traffic Signal">Damaged Traffic Signal (Live Cables)</option>
                  <option value="Flooded Underpass">Flooded Underpass (Submerged Transit)</option>
                  <option value="Roadside Landslide">Roadside Landslide (Embankment Collapse)</option>
                  <option value="Broken Streetlight Pole">Broken Streetlight Pole (Live Overhead Cable)</option>
                  <option value="Large Pothole">Large Pothole (Carriageway Crater)</option>
                  <option value="Drainage Cover Collapse">Drainage Cover Collapse (Open Pit Cavity)</option>
                  <option value="Fallen Utility Pole">Fallen Utility Pole (Hanging Telecom Cables)</option>
                  <option value="Oil Spill on Roadway">Oil Spill on Roadway (Severe Traction Loss)</option>
                  <option value="Sinkhole & Ground Subsidence">Sinkhole &amp; Ground Subsidence (Asphalt Cavity)</option>
                  <option value="Bridge Structural Damage">Bridge Structural Damage (Joint / Pier Scour)</option>
                  <option value="Sewage & Wastewater Overflow">Sewage &amp; Wastewater Overflow (Biohazard)</option>
                  <option value="Exposed High-Voltage Cable">Exposed High-Voltage Cable (11kV/33kV Arcing)</option>
                  <option value="Damaged Highway Guardrail">Damaged Highway Guardrail (Edge Drop Hazard)</option>
                  <option value="Missing Manhole Cover">Missing Manhole Cover (Open Deep Shaft)</option>
                  <option value="Hazardous Chemical & Waste Dump">Hazardous Chemical &amp; Waste Dump (Toxic Fumes)</option>
                  <option value="Pedestrian Walkway Collapse">Pedestrian Walkway Collapse (Footpath Cavity)</option>
                  <option value="Gas or Combustible Vapour Leak">Gas or Combustible Vapour Leak (Explosive Hazard)</option>
                  <option value="Coastal Erosion & Seawall Breach">Coastal Erosion &amp; Seawall Breach (Marine Drive)</option>
                  <option value="Pothole">Pothole (Standard)</option>
                  <option value="Water Leak">Water Leak (Potable Network)</option>
                  <option value="DrainageProblem">Drainage Problem (Stormwater Silt / Culvert)</option>
                  <option value="Fallen Tree">Fallen Tree / Vegetation Hazard</option>
                  <option value="Electrical Hazard">Electrical Hazard / Low-Voltage Fault</option>
                  <option value="Structural Damage">Structural Damage (General)</option>
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Reported Municipal Hazard Ticket: <strong className="text-rose-500">*</strong>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {hazards.length} Ticket{hazards.length === 1 ? '' : 's'} Available
              </span>
            </div>

            {hazards.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>No municipal hazard tickets found in the database.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('custom')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors"
                >
                  Switch to Custom Inputs
                </button>
              </div>
            ) : (
              <div>
                <select
                  value={selectedHazardId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedHazardId(newId);
                    if (fieldErrors.selectedHazardId) setFieldErrors((prev) => ({ ...prev, selectedHazardId: undefined }));
                    const matched = hazards.find((h) => h.id === newId);
                    if (matched) {
                      setCategorySupplied(matched.category || 'Other');
                    }
                  }}
                  className={`w-full text-xs p-3 rounded-xl border font-semibold text-slate-800 transition-colors ${
                    fieldErrors.selectedHazardId
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400 focus:outline-none'
                      : 'border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500'
                  }`}
                >
                  {hazards.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.ticketNumber} &mdash; [{h.category}] {h.description.slice(0, 90)}... ({h.address || 'Colombo'})
                    </option>
                  ))}
                </select>
                {fieldErrors.selectedHazardId && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.selectedHazardId}</span>
                  </p>
                )}
              </div>
            )}
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

        {/* Error Alert Display with Actionable Recovery */}
        {errorDetails && (
          <div className="p-4 sm:p-5 bg-rose-50/95 border border-rose-200/90 rounded-2xl text-rose-900 shadow-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    {errorDetails.title}
                  </h4>
                  <p className="text-xs text-rose-700 mt-1 font-medium leading-relaxed">
                    {errorDetails.message}
                  </p>
                  {errorDetails.actionableTip && (
                    <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1.5 font-medium">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                      <span>{errorDetails.actionableTip}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorDetails(null);
                }}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100/60 transition-colors"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-rose-200/60">
              {errorDetails.canRetry && (
                <button
                  type="button"
                  onClick={handleRunClassification}
                  disabled={running}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry AI Triage</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetInputs}
                className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 font-semibold text-[11px] hover:bg-rose-50 transition-colors"
              >
                Reset Fields
              </button>
              {activeInputMode === 'existing' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode('custom')}
                  className="px-3 py-1.5 rounded-xl bg-rose-100/80 text-rose-800 font-bold text-[11px] hover:bg-rose-200 transition-colors"
                >
                  Switch to Custom Inputs
                </button>
              )}
            </div>
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
                  {isCategoryPreserved(result.category, categorySupplied) ? (
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
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Enforcing Authority</span>
                    <span className="font-bold text-slate-900 truncate block max-w-xs">{getResponsibleAuthority(result.category).name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── MUNICIPAL OPERATIONAL DIRECTIVES & FIELD PROTOCOLS ──────────────── */}
            <div className="p-6 rounded-3xl bg-slate-950 text-white space-y-5 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

              {/* Header with Authority Badge */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">
                        Municipal Operational Directives &amp; Field Protocol
                      </h4>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        STATUTORY §14 ENFORCED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Binding execution directives for zonal dispatchers, utility emergency units, and field engineers.
                    </p>
                  </div>
                </div>

                {/* Responsible Agency Pill */}
                <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl shadow-xs">
                  <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Enforcing Authority</span>
                    <span className="text-[11px] font-extrabold text-cyan-300 block leading-tight">{getResponsibleAuthority(result.category).name}</span>
                  </div>
                </div>
              </div>

              {/* Agency Operations Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <strong>Operational Unit:</strong> {getResponsibleAuthority(result.category).division}
                  </span>
                  <span className="text-[11px] text-slate-400 border-l border-slate-700 pl-3">
                    <strong>Direct Hotline:</strong> <span className="text-amber-300 font-mono font-bold">{getResponsibleAuthority(result.category).hotline}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                    Target SLA: <strong>&lt; {result.estimatedResponseHours} Hours</strong>
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-800">
                    Crew: <strong>{result.recommendedCrewSize} Specialists</strong>
                  </span>
                </div>
              </div>

              {/* Structured Directives List */}
              <div className="space-y-3 relative z-10">
                {getActionList(result.recommendedAction).map((action, idx) => {
                  const isChecked = !!checkedActions[idx];
                  const phaseLabel = idx === 0
                    ? 'PHASE 01: IMMEDIATE CONTAINMENT & PERIMETER SAFETY'
                    : idx === 1
                    ? 'PHASE 02: SPECIALIZED CREW DISPATCH & UTILITY COORDINATION'
                    : idx === 2
                    ? 'PHASE 03: STATUTORY REMEDIATION & SLA CLOSEOUT'
                    : `PHASE 0${idx + 1}: POST-REPAIR VERIFICATION & MONITORING`;

                  const phaseTiming = idx === 0
                    ? 'Immediate (T+0h to T+1h)'
                    : idx === 1
                    ? 'T+1h to T+2h'
                    : `< ${result.estimatedResponseHours} Hours SLA`;

                  const phasePriority = idx === 0
                    ? (result.severity === 'CRITICAL' ? 'Mandatory Urgent' : 'High Priority')
                    : idx === 1
                    ? 'Tactical Dispatch'
                    : 'Statutory Verification';

                  const priorityStyle = idx === 0
                    ? (result.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40')
                    : idx === 1
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isChecked
                          ? 'border-emerald-600/70 bg-emerald-950/25 opacity-90'
                          : 'border-slate-800 bg-slate-900/95 hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-mono font-bold flex items-center justify-center">
                            0{idx + 1}
                          </span>
                          <span className="text-[11px] font-extrabold tracking-wide text-slate-200 uppercase">
                            {phaseLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${priorityStyle}`}>
                            {phasePriority}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                            {phaseTiming}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <p className={`text-xs leading-relaxed flex-1 ${
                          isChecked ? 'text-emerald-300/80 line-through' : 'text-slate-200 font-medium'
                        }`}>
                          {action}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleAction(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex-shrink-0 ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {isChecked ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              <span>Directive Executed</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full border border-slate-400 inline-block" />
                              <span>Mark Executed</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 text-xs relative z-10">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Directive authenticated under Sri Lanka Municipal Councils Ordinance §14 &bull; Audit logged
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDirectives}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
                  >
                    {copiedDirectives ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied Directives</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Directives Dossier</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/work-orders/create')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-cyan-950/40 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Create Work Order from AI Dispatch</span>
                  </button>
                </div>
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
