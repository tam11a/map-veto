import type { CSSProperties } from 'react';
import { DECIDER, TEAMC } from '../data/maps';

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Celebration on veto completion — skipped entirely for people who prefer reduced motion. */
export function confetti() {
  if (prefersReducedMotion()) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const cols = [TEAMC[0], TEAMC[1], DECIDER, '#ffffff'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % 4]};animation-delay:${Math.random() * 0.5}s;`
      + `animation-duration:${1.8 + Math.random() * 1.6}s;--dx:${(Math.random() - 0.5) * 240}px;--r:${Math.random() * 900}deg`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

/** Typed helper for inline CSS custom properties. */
export const vars = (o: Record<string, string | number>) => o as CSSProperties;

