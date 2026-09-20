interface CiviLankaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  lightText?: boolean;
}

export default function CiviLankaLogo({
  className = '',
  size = 36,
  showText = false,
  lightText = false,
}: CiviLankaLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* ── CiviLanka AI Vector Emblem ──────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          {/* Main Brand Gradient (Electric Cyan to Cobalt Blue) */}
          <linearGradient id="clGradientPrimary" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Accent Gold / Amber Civic Node */}
          <linearGradient id="clGradientAccent" x1="40" y1="40" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Background Shield Base Glow */}
          <radialGradient id="clGlow" cx="60" cy="60" r="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Glow */}
        <circle cx="60" cy="60" r="54" fill="url(#clGlow)" />

        {/* Geometric Shield / Hexagonal Infrastructure Housing */}
        <polygon
          points="60,6 106,30 106,90 60,114 14,90 14,30"
          className="fill-slate-900/90 stroke-cyan-500/40"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner Tech Ring Outline */}
        <polygon
          points="60,14 98,34 98,86 60,106 22,86 22,34"
          fill="none"
          stroke="url(#clGradientPrimary)"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          strokeDasharray="4 2"
        />

        {/* Stylized 'C' & 'L' Infrastructure Arch / Roadway Interlock */}
        {/* 'C' Outer Curve representing Civic Networks */}
        <path
          d="M78 34 C50 34 34 46 34 60 C34 74 50 86 78 86"
          fill="none"
          stroke="url(#clGradientPrimary)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* 'L' Roadway Foundation Bar with Dynamic Chevron Notch */}
        <path
          d="M48 52 L48 76 L86 76"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Intelligent AI Node (Pulsing Diamond & Telemetry Spark) */}
        <polygon
          points="60,46 69,55 60,64 51,55"
          fill="url(#clGradientAccent)"
          className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
        />
        <circle cx="60" cy="55" r="2.5" fill="#FFFFFF" />

        {/* Three Micro Civic Geo-Pins (Road, Water, Power Nodes) */}
        <circle cx="78" cy="34" r="3" fill="#38BDF8" />
        <circle cx="86" cy="76" r="3" fill="#06B6D4" />
        <circle cx="34" cy="60" r="3" fill="#60A5FA" />
      </svg>

      {/* ── Optional Wordmark ────────────────────────────────────────────── */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xl font-black tracking-tight font-display ${
                lightText ? 'text-white' : 'text-slate-900'
              }`}
            >
              CiviLanka
            </span>
            <span className="text-[11px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-cyan-600 text-white shadow-xs">
              AI
            </span>
          </div>
          <span
            className={`text-[10px] font-mono font-medium tracking-wider uppercase ${
              lightText ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Municipal Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
