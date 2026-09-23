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
      {/* ── CiviLanka Official Emblem ──────────────────────────────────── */}
      <picture className="shrink-0 flex items-center justify-center">
        <source srcSet="/images/Logo.png" type="image/png" />
        <img
          src="/images/Logo.jpg"
          alt="CiviLanka Logo"
          width={size}
          height={size}
          className="rounded-full object-cover shadow-sm ring-1 ring-amber-500/40 hover:ring-amber-500/80 transition-transform hover:scale-105"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </picture>

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
            <span className="text-[11px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs border border-amber-500/30">
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
