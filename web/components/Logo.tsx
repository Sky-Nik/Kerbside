// Kerbside logo: a K pulled up at the kerb (yellow line). Same drawing as app/icon.svg.
export function LogoMark({ size = 28, inverted = false, className = "" }: { size?: number; inverted?: boolean; className?: string }) {
  const tile = inverted ? "#fff" : "#000";
  const ink = inverted ? "#000" : "#fff";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={tile} />
      <path d="M21.5 13v30" stroke={ink} strokeWidth="9" />
      <path d="M47.5 13 28 29.5 47.5 43" fill="none" stroke={ink} strokeWidth="9" strokeLinejoin="miter" strokeMiterlimit="4" />
      <rect x="17" y="48" width="34" height="4.5" rx="2.25" fill="#ffc043" />
    </svg>
  );
}

/** Mark + wordmark. `inverted` = for dark backgrounds. */
export function Logo({ size = 28, inverted = false, hideWordOnMobile = false, className = "" }: {
  size?: number; inverted?: boolean; hideWordOnMobile?: boolean; className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} inverted={inverted} />
      <span className={`font-bold tracking-[-0.03em] ${hideWordOnMobile ? "hidden sm:inline" : ""}`} style={{ fontSize: size * 0.68 }}>
        Kerbside
      </span>
    </span>
  );
}
