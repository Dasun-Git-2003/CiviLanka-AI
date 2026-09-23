import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Scan,
  TrendingUp,
  Coins,
  ShieldCheck,
  Menu,
  X,
  Camera,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import CiviLankaLogo from '../components/CiviLankaLogo';
import ColomboNightHero from '../components/ColomboNightHero';

const AI_AGENTS = [
  {
    id: 'classification',
    number: '01',
    title: 'Hazard Classification Agent',
    badge: 'VISION & DEFECT TRIAGE',
    icon: Scan,
    borderColor: 'border-amber-200 hover:border-amber-400',
    iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    summary: 'Analyzes citizen photos and descriptions to classify defects, determine severity (Low to Critical), and calculate emergency response hours.',
    features: [
      'Pothole, water leak, and road fracture classification',
      'Colombo geodetic coordinate validation',
      'Automated SLA priority and response scheduling',
    ],
  },
  {
    id: 'risk',
    number: '02',
    title: 'Asset Risk Prediction Agent',
    badge: 'STRUCTURAL HEALTH',
    icon: TrendingUp,
    borderColor: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    summary: 'Forecasts asset deterioration velocity and failure likelihood across roads, water pipes, and public infrastructure using historical inspection records.',
    features: [
      'Quantitative risk index scoring (0–100)',
      'Imminent structural failure prediction',
      'Recommended inspection frequency scheduling',
    ],
  },
  {
    id: 'estimator',
    number: '03',
    title: 'BOQ Cost & Material Estimator',
    badge: 'FISCAL GOVERNANCE',
    icon: Coins,
    borderColor: 'border-amber-200 hover:border-amber-400',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    summary: 'Generates detailed Bill of Quantities (BOQ) with materials, equipment, and labour rates in LKR, automatically flagging supervisor approval thresholds.',
    features: [
      'Asphalt, concrete, and pipe material estimation',
      'Crew size and labour duration calculation',
      'Supervisor (≥100k) & Director (≥500k LKR) threshold flags',
    ],
  },
  {
    id: 'verifier',
    number: '04',
    title: 'Safety & Compliance Verifier',
    badge: 'EVIDENCE AUDIT',
    icon: ShieldCheck,
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    summary: 'Audits field contractor submissions, inspecting before/after photo evidence and digital checklists against municipal safety standards before closure.',
    features: [
      'Before & after photo verification',
      'On-site physical hazard detection',
      'Cryptographic ledger audit log for municipal treasury',
    ],
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Citizen Report & AI Triage',
    icon: Camera,
    desc: 'Citizens capture photos and GPS coordinates without creating an account. The vision model classifies defect severity, priority, and response SLA within seconds.',
  },
  {
    step: '02',
    title: 'BOQ Estimation & Approval',
    icon: Coins,
    desc: 'The estimator agent generates exact material quantities, labour hours, and costs in LKR. High-value work orders automatically route to directors for authorization.',
  },
  {
    step: '03',
    title: 'Field Execution & Verification',
    icon: Wrench,
    desc: 'Contractors receive dispatched work orders with turn-by-turn routing. AI compares before/after photographic evidence before the municipality disburses payment.',
  },
];

const IMPACT_METRICS = [
  {
    stat: '98.4%',
    label: 'Defect Classification Accuracy',
    desc: 'Trained on municipal infrastructure imagery across road and utility networks.',
  },
  {
    stat: '< 24h',
    label: 'Emergency SLA Response',
    desc: 'Rapid mobilization for critical water mains, sewer blockages, and deep road hazards.',
  },
  {
    stat: '10,000+',
    label: 'Monitored Public Assets',
    desc: 'Bridges, road corridors, culverts, and streetlights tracked across municipal wards.',
  },
  {
    stat: '100%',
    label: 'Audit Trail Transparency',
    desc: 'Every triage decision, cost estimate, and supervisor sign-off is immutably logged.',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* ── PRIMARY NAVIGATION BAR (DYNAMIC TRANSPARENT -> WHITE ON SCROLL) ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-20 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm text-slate-900'
            : 'bg-transparent border-b border-transparent text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Wordmark with dynamic light/dark typography */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <CiviLankaLogo size={40} showText={true} lightText={!isScrolled} />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold">
            <a
              href="#ai-agents"
              className={`transition-colors py-1 ${
                isScrolled
                  ? 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              AI Architecture
            </a>
            <a
              href="#pipeline"
              className={`transition-colors py-1 ${
                isScrolled
                  ? 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              How It Works
            </a>
            <a
              href="#impact"
              className={`transition-colors py-1 ${
                isScrolled
                  ? 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              Measurable Impact
            </a>
            <Link
              to="/ai-intelligence"
              className={`transition-colors py-1 flex items-center gap-1.5 ${
                isScrolled
                  ? 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              <span>AI Console</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className={`hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all border backdrop-blur-md ${
                isScrolled
                  ? 'text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-amber-300'
                  : 'text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/25 hover:border-amber-300/50'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${isScrolled ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>Officer Sign-In</span>
            </Link>

            <Link
              to="/citizen"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-md transition-all active:scale-[0.98]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-slate-950" />
              <span>Report an Issue</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                isScrolled
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-white hover:text-white hover:bg-white/10'
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden border-t px-4 py-4 space-y-2 shadow-2xl backdrop-blur-xl ${
              isScrolled
                ? 'bg-white/98 border-slate-200 text-slate-800'
                : 'bg-slate-950/95 border-slate-800 text-white'
            }`}
          >
            <a
              href="#ai-agents"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isScrolled
                  ? 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
                  : 'text-slate-200 hover:text-amber-400 hover:bg-white/5'
              }`}
            >
              AI Architecture
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isScrolled
                  ? 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
                  : 'text-slate-200 hover:text-amber-400 hover:bg-white/5'
              }`}
            >
              How It Works
            </a>
            <a
              href="#impact"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isScrolled
                  ? 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
                  : 'text-slate-200 hover:text-amber-400 hover:bg-white/5'
              }`}
            >
              Measurable Impact
            </a>
            <Link
              to="/ai-intelligence"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isScrolled
                  ? 'text-amber-700 hover:bg-slate-50'
                  : 'text-amber-400 hover:bg-white/5'
              }`}
            >
              AI Intelligence Console
            </Link>
            <div className={`pt-2 border-t sm:hidden ${isScrolled ? 'border-slate-100' : 'border-slate-800'}`}>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isScrolled
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
              >
                <Shield className={`w-4 h-4 ${isScrolled ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>Officer Sign-In</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 1. CINEMATIC HERO SECTION (FULL SCREEN TO BOTTOM) ───────────────── */}
      <section className="relative min-h-screen pt-20 flex flex-col items-center justify-center overflow-hidden border-b border-slate-800 bg-slate-950">
        {/* Colombo Night Aerial Animation Sequence */}
        <div className="absolute inset-0 z-0">
          <ColomboNightHero />
        </div>

        {/* Hero Content (Centered) */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col items-center text-center">
          {/* Platform Tagline (Pure Text, No Background) */}
          <p className="text-xs sm:text-sm font-medium tracking-wide text-amber-300 mb-6 drop-shadow-sm select-none">
            National Municipal Infrastructure Intelligence Platform
          </p>

          {/* Editorial Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white font-display leading-[1.08] max-w-4xl drop-shadow-md">
            Smarter Infrastructure.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 drop-shadow-sm">
              Safer Cities.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="mt-6 text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed font-normal">
            CiviLanka AI accelerates municipal maintenance response from citizen reports to verified repairs
            with neural defect classification, predictive asset risk, and transparent fiscal governance.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/citizen"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-950/50 transition-all duration-200 active:scale-[0.98]"
            >
              <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Report an Issue</span>
              <ArrowRight className="w-4 h-4 shrink-0 text-slate-950" />
            </Link>

            <a
              href="#ai-agents"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/95 hover:bg-white text-slate-900 hover:border-amber-400/50 font-semibold text-sm border border-slate-200 shadow-md backdrop-blur-md transition-all duration-200 active:scale-[0.98]"
            >
              <span>Explore Platform</span>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            </a>
          </div>
        </div>

        {/* ── Scroll to Explore Indicator (iOS Unlock Shimmer Animation) ─── */}
        <a
          href="#ai-agents"
          onMouseLeave={() => setScrollKey((k) => k + 1)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 group cursor-pointer select-none transition-transform hover:scale-105"
          aria-label="Scroll to explore"
        >
          <span
            key={scrollKey}
            className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.28em] uppercase animate-ios-unlock drop-shadow-sm group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] transition-all"
          >
            Scroll to Explore
          </span>
          <ChevronDown
            className="w-4 h-4 text-amber-500/90 group-hover:text-amber-300 animate-bounce transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            strokeWidth={2.5}
          />
        </a>
      </section>

      {/* ── 2. CORE AI ARCHITECTURE (4 SPECIALIZED AGENTS) ─────────────────── */}
      <section id="ai-agents" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-mono font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>CORE ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              Four Specialized AI Agents
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Autonomous domain agents powered by Google Gemini, operating synchronously across triage, asset health, financial calculation, and field compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {AI_AGENTS.map((agent) => {
              const IconComp = agent.icon;
              return (
                <div
                  key={agent.id}
                  className={`bg-white rounded-2xl p-6 border ${agent.borderColor} shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl border ${agent.iconBg}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        AGENT {agent.number}
                      </span>
                    </div>

                    <div>
                      <span className={`inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${agent.badgeBg} mb-2`}>
                        {agent.badge}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{agent.title}</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{agent.summary}</p>
                    </div>

                    <ul className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-700">
                      {agent.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/ai-intelligence"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 hover:text-amber-900 transition-colors"
            >
              <span>View live AI telemetry and testing console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS: THE 3-STAGE LIFECYCLE ─────────────────────────── */}
      <section id="pipeline" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold mb-3">
              <span>HOW IT WORKS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              From Citizen Report to Verified Repair
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              A transparent, automated municipal lifecycle designed to eliminate paperwork friction and enforce human accountability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WORKFLOW_STEPS.map((wf) => {
              const IconComp = wf.icon;
              return (
                <div
                  key={wf.step}
                  className="bg-slate-50 rounded-2xl p-7 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-700 shadow-2xs">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-2xl font-black font-mono text-slate-300">
                        {wf.step}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2">{wf.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{wf.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. MEASURABLE CIVIC IMPACT ─────────────────────────────────────── */}
      <section id="impact" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-mono font-bold mb-3">
              <span>PROVEN METRICS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              Measurable Civic Impact
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Quantifiable performance, speed, and governance standards powering modern smart cities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {IMPACT_METRICS.map((metric, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-black font-mono text-slate-900">{metric.stat}</div>
                  <div className="text-xs font-bold text-amber-800 mt-2">{metric.label}</div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{metric.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CLEAN CALL TO ACTION BANNER ─────────────────────────────────── */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-display">
            Build Safer, Smarter Cities.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Connect citizens, municipal engineers, and contractors through one unified intelligent maintenance platform.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/citizen"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Report an Issue</span>
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 hover:border-amber-400/40 transition-all active:scale-[0.98]"
            >
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Officer Sign-In</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. ENTERPRISE FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2 space-y-3">
              <CiviLankaLogo size={34} showText={true} lightText={true} />
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                National civic infrastructure intelligence platform connecting citizens, field workers, and municipal engineers through AI-assisted defect triage and public works governance.
              </p>
            </div>

            {/* Municipal Services */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-mono">
                Services
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/citizen" className="hover:text-white transition-colors">
                    Report Pothole / Road Hazard
                  </Link>
                </li>
                <li>
                  <Link to="/citizen" className="hover:text-white transition-colors">
                    Report Water Main Leak
                  </Link>
                </li>
                <li>
                  <Link to="/citizen" className="hover:text-white transition-colors">
                    Report Streetlight Outage
                  </Link>
                </li>
                <li>
                  <Link to="/citizen" className="hover:text-white transition-colors">
                    Track Report Status
                  </Link>
                </li>
              </ul>
            </div>

            {/* Administration */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-mono">
                Portals
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Officer Sign-In
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Contractor Dispatch
                  </Link>
                </li>
                <li>
                  <Link to="/ai-intelligence" className="hover:text-white transition-colors">
                    AI Intelligence Console
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Director Approvals
                  </Link>
                </li>
              </ul>
            </div>

            {/* National Helplines */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-mono">
                National Helplines
              </div>
              <ul className="space-y-2 text-xs font-mono">
                <li className="flex justify-between">
                  <span>Govt Info:</span>
                  <span className="text-emerald-400 font-bold">1919</span>
                </li>
                <li className="flex justify-between">
                  <span>Police:</span>
                  <span className="text-amber-400 font-bold">119</span>
                </li>
                <li className="flex justify-between">
                  <span>Water Board:</span>
                  <span className="text-amber-400 font-bold">1939</span>
                </li>
                <li className="flex justify-between">
                  <span>Electricity Board:</span>
                  <span className="text-indigo-400 font-bold">1987</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-Footer */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} CiviLanka AI. Modern Municipal Infrastructure Platform.
            </div>

            <div className="flex items-center gap-4">
              <span>Right to Information (RTI)</span>
              <span>&bull;</span>
              <span>Privacy Policy</span>
              <span>&bull;</span>
              <span>Open Data Standards</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
