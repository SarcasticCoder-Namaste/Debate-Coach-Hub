import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  wordmarkClassName?: string;
  variant?: "auto" | "light" | "dark";
};

/**
 * Orator brand mark.
 * - Rounded-square shield in deep navy with a soft inner highlight
 * - Stylized "speech-arc M" formed by two rising waveform peaks (debate voices in dialogue)
 * - Accent dot above the right peak doubles as a microphone tip / "live" indicator
 * - Accent underline reads as a debate rostrum / podium baseline
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = "dm-logo";
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={cn("flex-shrink-0", className)}
      role="img"
      aria-label="Orator logomark"
      data-testid="img-logo-mark"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1260" />
          <stop offset="100%" stopColor="#0e0933" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.2" r="0.8">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Shield */}
      <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill={`url(#${id}-bg)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill={`url(#${id}-glow)`} />
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="8.75"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.08"
      />

      {/* Two rising voice peaks forming an "M" silhouette (left = debater A, right = debater B) */}
      <path
        d="M 8 28 L 8 16 Q 8 12 12 12 Q 16 12 16 16 L 16 24 Q 16 25 17 25 Q 18 25 18 24 L 18 18 Q 18 14 22 14 Q 26 14 26 18 L 26 26 Q 26 27 27 27 Q 28 27 28 26 L 28 13"
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Accent mic / "live" dot above right peak */}
      <circle cx="28" cy="9.5" r="2" fill="#f59e0b" />
      <circle cx="28" cy="9.5" r="2" fill="#f59e0b" opacity="0.35">
        <animate attributeName="r" values="2;3.2;2" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2.2s" repeatCount="indefinite" />
      </circle>

      {/* Rostrum / baseline accent */}
      <rect x="7" y="30.5" width="22" height="2" rx="1" fill="#f59e0b" />
      <rect x="7" y="30.5" width="9" height="2" rx="1" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}

export function Logo({
  size = 36,
  className,
  withWordmark = true,
  wordmarkClassName,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} data-testid="logo">
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className={cn(
            "font-display font-bold tracking-tight leading-none",
            wordmarkClassName,
          )}
        >
          Debate<span className="text-accent">Mastery</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
