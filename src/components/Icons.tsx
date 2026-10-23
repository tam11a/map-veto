const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;

export const Icon = {
  dl: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" /></svg>,
  link: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>,
  play: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>,
  undo: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" /></svg>,
  up: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M12 21V9m0 0l-5 5m5-5l5 5M4 5h16" /></svg>,
  txt: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  img: () => <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>,
};
