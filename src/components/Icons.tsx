import type { ReactNode } from 'react';

/** One line-icon set for the whole app: 24px grid, currentColor, 2px non-scaling stroke (see `.ico`). */
function svg(children: ReactNode, fill = false) {
  return function IconSvg({ label }: { label?: string }) {
    return (
      <svg
        className="ico"
        viewBox="0 0 24 24"
        fill={fill ? 'currentColor' : 'none'}
        stroke={fill ? 'none' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {children}
      </svg>
    );
  };
}

export const Icon = {
  dl: svg(<path d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" />),
  link: svg(<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />),
  // triangle nudged 1px toward its point so it reads optically centred
  play: svg(<path d="M8 4.5l12 7.5-12 7.5z" />, true),
  undo: svg(<path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />),
  up: svg(<path d="M12 21V9m0 0l-5 5m5-5l5 5M4 5h16" />),
  txt: svg(<path d="M4 6h16M4 12h16M4 18h10" />),
  img: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>),
  note: svg(<><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4M9 13h6M9 17h4" /></>),
  info: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  close: svg(<path d="M6 6l12 12M18 6L6 18" />),
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  clock: svg(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>),
  shield: svg(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M12 3v18" /></>),
  sliders: svg(<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>),
  map: svg(<><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>),
  share: svg(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>),
};
