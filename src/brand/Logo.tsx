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

/** The mark: a V whose teal arm is the pick, red arm the ban and violet diamond the decider. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = 'mv' + useId().replace(/:/g, '');
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1622" />
          <stop offset="1" stopColor="#0d0a12" />
        </linearGradient>
      </defs>
      <path d={MARK.badge} fill={`url(#${id})`} />
      <path d={MARK.badge} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" />
      <path d={MARK.pick} fill="var(--pick)" />
      <path d={MARK.ban} fill="var(--ban)" />
      <path d={MARK.decider} fill="var(--decider)" />
    </svg>
  );
}

export function Logo({ size = 36, tagline = true }: { size?: number; tagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} className="shrink-0" />
      <span className="flex flex-col leading-none">
        <b className="text-[1.375rem] font-extrabold tracking-[-0.01em] leading-[0.95]">MAP <em className="text-ban not-italic">VETO</em></b>
        {tagline && <small className="mt-1 text-[9px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">{BRAND.tagline}</small>}
      </span>
    </span>
  );
}
