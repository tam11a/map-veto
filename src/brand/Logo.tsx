import { useId } from 'react';

export const BRAND = {
  name: 'Map Veto',
  tagline: 'Valorant Map Picker',
  full: 'Map Veto: Valorant Map Picker',
  pitch: 'Run a pro-style map veto for Bo1, Bo2, Bo3 and Bo5, then share the plan with your team.',
};

/** Shared geometry so the canvas export draws the exact same mark. */
export const MARK = {
  badge: 'M12 2h40a10 10 0 0 1 10 10v30L42 62H12A10 10 0 0 1 2 52V12A10 10 0 0 1 12 2z',
  pick: 'M13 12H22.5L32 31V43Z',
  ban: 'M51 12H41.5L32 31V43Z',
  decider: 'M32 46.5L36.5 51L32 55.5L27.5 51Z',
};

/** The mark: a V whose mint arm is the pick, red arm the ban and gold diamond the decider. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = 'mv' + useId().replace(/:/g, '');
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#18202f" />
          <stop offset="1" stopColor="#0a0d14" />
        </linearGradient>
      </defs>
      <path d={MARK.badge} fill={`url(#${id})`} />
      <path d={MARK.badge} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" />
      <path className="mk-pick" d={MARK.pick} fill="var(--a)" />
      <path className="mk-ban" d={MARK.ban} fill="var(--b)" />
      <path className="mk-dec" d={MARK.decider} fill="var(--gold)" />
    </svg>
  );
}

export function Logo({ size = 36, tagline = true }: { size?: number; tagline?: boolean }) {
  return (
    <span className="brand">
      <LogoMark size={size} />
      <span className="brand-text">
        <b>MAP<em>VETO</em></b>
        {tagline && <small>{BRAND.tagline}</small>}
      </span>
    </span>
  );
}
