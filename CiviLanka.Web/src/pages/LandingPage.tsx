import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
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
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

// Apple iOS fluid momentum curve (cubic-bezier matching native iOS SpringBoard & Sheet physics)
// Executes directly on the GPU compositor thread for silky smooth 60fps/120fps scrolling
const IOS_TRANSITION = {
  duration: 0.65,
  ease: [0.16, 1, 0.3, 1] as const,
};

const AI_AGENTS = [
  {
    id: 'classification',
    number: '01',
    title: 'Hazard Classification Agent',
    badge: 'VISION & DEFECT TRIAGE',
    icon: Scan,
    image: '/images/fredrik-posse-LVqjs1bDGFs-unsplash.jpg',
    actionText: 'REPORT & CLASSIFY',
    link: '/report-defect',
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
    image: '/images/Asserts%20agent.jpg',
    actionText: 'VIEW PREDICTIONS',
    link: '/ai-intelligence',
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
    image: '/images/yuheng-ouyang-2r0Eo89ZSQk-unsplash.jpg',
    actionText: 'ESTIMATE MATERIALS',
    link: '/work-orders',
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
    image: '/images/pexels-jan-van-der-wolf-11680885-29114485.jpg',
    actionText: 'VERIFY COMPLIANCE',
    link: '/work-orders',
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

const PARTNER_AGENCIES = [
  {
    name: 'Democratic Socialist Republic of Sri Lanka',
    short: 'Government of Sri Lanka',
    logo: '/images/gov.png',
  },
  {
    name: 'Road Development Authority',
    short: 'RDA',
    logo: '/images/rda_trans.png',
  },
  {
    name: 'Ceylon Electricity Board',
    short: 'CEB',
    logo: '/images/ceb.png',
  },
  {
    name: 'National Water Supply & Drainage Board',
    short: 'NWSDB',
    logo: '/images/water_trans.png',
  },
  {
    name: 'Sri Lanka Transport Board',
    short: 'SLTB',
    logo: '/images/sltb_trans.png',
  },
  {
    name: 'Lanka Metro Transit Authority',
    short: 'Metro Transit',
    logo: '/images/metro_trans.png',
  },
];

export default function LandingPage() {
  const { isDark } = useTheme();
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

  const handleScrollToExplore = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('ai-agents');
    if (!target) return;

    const navOffset = 70;
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 950;
    let startTime: number | null = null;

    // Authentic iOS ease-in-out cubic momentum curve
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const step = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300">
      {/* ── PRIMARY NAVIGATION BAR (DYNAMIC TRANSPARENT -> WHITE/DARK ON SCROLL) ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-20 transition-all duration-300 ${
          isScrolled
            ? isDark
              ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-sm text-white'
              : 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm text-slate-900'
            : 'bg-transparent border-b border-transparent text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Wordmark with dynamic light/dark typography */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <CiviLankaLogo size={40} showText={true} lightText={!isScrolled || isDark} />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold">
            <a
              href="#ai-agents"
              className={`transition-colors py-1 ${
                isScrolled
                  ? isDark
                    ? 'text-slate-300 hover:text-amber-400'
                    : 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              AI Architecture
            </a>
            <a
              href="#pipeline"
              className={`transition-colors py-1 ${
                isScrolled
                  ? isDark
                    ? 'text-slate-300 hover:text-amber-400'
                    : 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              How It Works
            </a>
            <a
              href="#impact"
              className={`transition-colors py-1 ${
                isScrolled
                  ? isDark
                    ? 'text-slate-300 hover:text-amber-400'
                    : 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              Measurable Impact
            </a>
            <Link
              to="/ai-intelligence"
              className={`transition-colors py-1 flex items-center gap-1.5 ${
                isScrolled
                  ? isDark
                    ? 'text-slate-300 hover:text-amber-400'
                    : 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300 drop-shadow-xs'
              }`}
            >
              <span>AI Console</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Toggle Switch */}
            <ThemeToggle />

            <Link
              to="/login"
              className={`hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all border backdrop-blur-md ${
                isScrolled
                  ? isDark
                    ? 'text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-slate-700 hover:border-amber-400/50'
                    : 'text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-amber-300'
                  : 'text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/25 hover:border-amber-300/50'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${isScrolled ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-amber-400'}`} />
              <span>Sign-In</span>
            </Link>

            <Link
              to="/citizen"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-md transition-all active:scale-[0.98]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-slate-950" />
              <span>Report</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                isScrolled
                  ? isDark
                    ? 'text-slate-200 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
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
                ? isDark
                  ? 'bg-slate-950/98 border-slate-800 text-white'
                  : 'bg-white/98 border-slate-200 text-slate-800'
                : 'bg-slate-950/95 border-slate-800 text-white'
            }`}
          >
            <a
              href="#ai-agents"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isScrolled
                  ? isDark
                    ? 'text-slate-200 hover:text-amber-400 hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
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
                  ? isDark
                    ? 'text-slate-200 hover:text-amber-400 hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
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
                  ? isDark
                    ? 'text-slate-200 hover:text-amber-400 hover:bg-slate-800/60'
                    : 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
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
                  ? isDark
                    ? 'text-amber-400 hover:bg-slate-800/60'
                    : 'text-amber-700 hover:bg-slate-50'
                  : 'text-amber-400 hover:bg-white/5'
              }`}
            >
              AI Intelligence Console
            </Link>

            {/* Mobile Theme Switch */}
            <div
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                isScrolled && !isDark
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-white/5 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xs font-semibold">Theme Mode</span>
              <ThemeToggle />
            </div>

            <div className={`pt-2 border-t sm:hidden ${isScrolled ? (isDark ? 'border-slate-800' : 'border-slate-100') : 'border-slate-800'}`}>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isScrolled
                    ? isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
              >
                <Shield className={`w-4 h-4 ${isScrolled ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-amber-400'}`} />
                <span>Sign-In</span>
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

        {/* Hero Content (Centered) with iOS Smooth Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={IOS_TRANSITION}
          style={{ willChange: 'transform, opacity' }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col items-center text-center"
        >
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
              <span>Report</span>
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
        </motion.div>

        {/* ── Scroll to Explore Indicator (iOS Unlock Shimmer Animation) ─── */}
        <a
          href="#ai-agents"
          onClick={handleScrollToExplore}
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
            className="w-4 h-4 text-amber-500/90 group-hover:text-amber-300 animate-ios-chevron transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            strokeWidth={2.5}
          />
        </a>
      </section>

      {/* ── 1.5 INTEGRATED PUBLIC AUTHORITIES HORIZONTAL SLIDESHOW ──────────── */}
      <section className="py-7 sm:py-8 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300 relative overflow-hidden select-none">
        <style>{`
          @keyframes civilankaLogoMarquee {
            0% {
              transform: translate3d(0, 0, 0);
            }
            100% {
              transform: translate3d(-50%, 0, 0);
            }
          }
          .civilanka-slider-track {
            display: flex;
            width: max-content;
            animation: civilankaLogoMarquee 42s linear infinite;
            will-change: transform;
          }
          .civilanka-slider-track:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Gradient blur overlays for smooth left/right fade-in and fade-out */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10" />

        {/* Continuous Horizontal Infinite Marquee */}
        <div className="overflow-hidden flex items-center min-h-[56px] sm:min-h-[64px] md:min-h-[72px]">
          <div className="civilanka-slider-track flex items-center gap-12 sm:gap-16 lg:gap-24 shrink-0 pr-12 sm:pr-16 lg:pr-24">
            {[...PARTNER_AGENCIES, ...PARTNER_AGENCIES, ...PARTNER_AGENCIES, ...PARTNER_AGENCIES].map((partner, index) => (
              <div
                key={index}
                className="shrink-0 flex items-center justify-center cursor-pointer group/logo py-2"
                title={`${partner.name} (${partner.short})`}
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className={`${
                    partner.short === 'Metro Transit'
                      ? 'h-8 sm:h-9 md:h-10 max-w-[125px] sm:max-w-[150px]'
                      : partner.short === 'NWSDB'
                      ? 'h-10 sm:h-11 md:h-12 max-w-[130px] sm:max-w-[155px]'
                      : 'h-9 sm:h-10 md:h-11 max-w-[110px] sm:max-w-[135px]'
                  } w-auto object-contain filter grayscale opacity-50 group-hover/logo:grayscale-0 group-hover/logo:opacity-100 group-hover/logo:scale-110 transition-all duration-300 select-none pointer-events-none`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. CORE AI ARCHITECTURE (4 SPECIALIZED AGENTS) ─────────────────── */}
      <section id="ai-agents" className="py-24 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-50px' }}
            transition={IOS_TRANSITION}
            style={{ willChange: 'transform, opacity' }}
            className="text-center max-w-3xl mx-auto mb-16 sm:mb-20"
          >
            <span className="block text-xs font-mono font-bold text-slate-500 dark:text-slate-400 tracking-[0.25em] uppercase mb-4">
              CORE ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              Four Specialized AI Agents
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
              Autonomous domain agents powered by Google Gemini, operating synchronously across triage, asset health, financial calculation, and field compliance.
            </p>
          </motion.div>

          <div className="space-y-20 sm:space-y-28 lg:space-y-36">
            {AI_AGENTS.map((agent, index) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={agent.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center"
                >
                  {/* Text Column - Bidirectional smooth entrance from left or right */}
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? -24 : 24, y: 16 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={IOS_TRANSITION}
                    style={{ willChange: 'transform, opacity' }}
                    className={`space-y-6 ${
                      isEven ? 'lg:col-span-7' : 'lg:col-span-7 lg:order-2'
                    }`}
                  >
                    {/* Eyebrow badge */}
                    <div className="flex items-center gap-2.5 text-xs font-mono font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase">
                      <span>AGENT {agent.number}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-800 dark:text-slate-200">{agent.badge}</span>
                    </div>

                    {/* Headline */}
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase font-display leading-tight">
                      {agent.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                      {agent.summary}
                    </p>

                    {/* Features */}
                    <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {agent.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button (Editorial Outline Style) */}
                    <div className="pt-2">
                      <Link
                        to={agent.link}
                        className="inline-flex items-center justify-center gap-3 px-6 py-3 border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200 group"
                      >
                        <span>{agent.actionText}</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </motion.div>

                  {/* Image Column - Bidirectional smooth entrance from opposite side */}
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? 24 : -24, y: 16 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: false, margin: '-50px' }}
                    transition={{ ...IOS_TRANSITION, delay: 0.04 }}
                    style={{ willChange: 'transform, opacity' }}
                    className={`${
                      isEven ? 'lg:col-span-5' : 'lg:col-span-5 lg:order-1'
                    }`}
                  >
                    <div className="relative group overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 w-full bg-slate-100 dark:bg-slate-800">
                      <img
                        src={agent.image}
                        alt={agent.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                      {/* Floating Metadata Pills on Photo */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                        <span className="px-3 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-white border border-white/15">
                          {agent.badge}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] sm:text-xs font-mono font-bold text-white/90 border border-white/15">
                          {agent.number} / 04
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-40px' }}
            transition={IOS_TRANSITION}
            style={{ willChange: 'transform, opacity' }}
            className="mt-16 text-center"
          >
            <Link
              to="/ai-intelligence"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <span>View live AI telemetry and testing console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS: THE 3-STAGE LIFECYCLE ─────────────────────────── */}
      <section id="pipeline" className="py-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-50px' }}
            transition={IOS_TRANSITION}
            style={{ willChange: 'transform, opacity' }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="block text-xs font-mono font-bold text-slate-500 dark:text-slate-400 tracking-[0.25em] uppercase mb-3">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              From Citizen Report to Verified Repair
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              A transparent, automated municipal lifecycle designed to eliminate paperwork friction and enforce human accountability.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WORKFLOW_STEPS.map((wf, idx) => {
              const IconComp = wf.icon;
              return (
                <motion.div
                  key={wf.step}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: '-50px' }}
                  transition={{ ...IOS_TRANSITION, delay: idx * 0.05 }}
                  whileHover={{ y: -5, transition: { duration: 0.2, ease: 'easeOut' } }}
                  style={{ willChange: 'transform, opacity' }}
                  className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-2xs">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-2xl font-black font-mono text-slate-300 dark:text-slate-700">
                        {wf.step}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{wf.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{wf.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. MEASURABLE CIVIC IMPACT ─────────────────────────────────────── */}
      <section id="impact" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-50px' }}
            transition={IOS_TRANSITION}
            style={{ willChange: 'transform, opacity' }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="block text-xs font-mono font-bold text-slate-500 dark:text-slate-400 tracking-[0.25em] uppercase mb-3">
              PROVEN METRICS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              Measurable Civic Impact
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Quantifiable performance, speed, and governance standards powering modern smart cities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {IMPACT_METRICS.map((metric, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ ...IOS_TRANSITION, delay: idx * 0.04 }}
                whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
                style={{ willChange: 'transform, opacity' }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">{metric.stat}</div>
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-400 mt-2">{metric.label}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{metric.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CLEAN CALL TO ACTION BANNER ─────────────────────────────────── */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-50px' }}
          transition={IOS_TRANSITION}
          style={{ willChange: 'transform, opacity' }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6"
        >
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
              <span>Report</span>
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 hover:border-amber-400/40 transition-all active:scale-[0.98]"
            >
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sign-In</span>
            </Link>
          </div>
        </motion.div>
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

