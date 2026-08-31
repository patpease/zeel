/**
 * The two chrome icons, inline.
 *
 * Drawn on the studio's 48px grid with a 3px round-cap stroke, and taken from
 * Psychrometric Studio's icon set. The structural stroke is `currentColor` so
 * the button's own colour carries the active state; only the one accent detail
 * keeps a fixed hue — warm for the sun, cool for the moon — which is the
 * studio's rule of ink structure plus a single accent.
 */
interface IconProps {
  readonly size?: number;
}

export function SunIcon({ size = 17 }: IconProps) {
  return (
    <svg
      className="icon" width={size} height={size} viewBox="0 0 48 48" fill="none"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    >
      <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        d="M24 11V5M24 43V37M37 24H43M5 24H11M33.2 14.8L37.4 10.6M10.6 37.4L14.8 33.2M33.2 33.2L37.4 37.4M10.6 10.6L14.8 14.8"
        stroke="var(--use-heating)" strokeWidth="3"
      />
    </svg>
  );
}

export function MoonIcon({ size = 17 }: IconProps) {
  return (
    <svg
      className="icon" width={size} height={size} viewBox="0 0 48 48" fill="none"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    >
      <path d="M40 30.5A17 17 0 0 1 17.5 8 17 17 0 1 0 40 30.5Z" stroke="currentColor" strokeWidth="3" />
      <circle cx="35" cy="12" r="1.8" fill="var(--use-cooling)" />
      <circle cx="41" cy="19" r="1.4" fill="var(--use-cooling)" />
    </svg>
  );
}
