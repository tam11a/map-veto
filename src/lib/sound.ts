import { useSyncExternalStore } from 'react';

/** Short synthesized cues for the live veto (no audio files). Off until someone turns them on. */
const KEY = 'mapveto.sound';
let on = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
const subs = new Set<() => void>();
let ctx: AudioContext | null = null;

export function setSound(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ }
  if (v) audio()?.resume();
  subs.forEach(f => f());
}

export const useSound = () => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => on);

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** One enveloped oscillator note. */
function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const CUES = {
  ban: () => { tone(220, 0, 0.22, 'square', 0.06, 110); tone(110, 0.02, 0.25, 'sine', 0.14); },
  pick: () => { tone(523, 0, 0.12, 'triangle'); tone(784, 0.09, 0.2, 'triangle'); },
  side: () => tone(660, 0, 0.14, 'triangle', 0.1),
  decider: () => { tone(392, 0, 0.18, 'triangle'); tone(523, 0.12, 0.18, 'triangle'); tone(659, 0.24, 0.3, 'triangle'); },
  tick: () => tone(1320, 0, 0.06, 'square', 0.04),
  done: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.09)),
};

export function cue(name: keyof typeof CUES) {
  if (!on) return;
  try { CUES[name](); } catch { /* audio not available */ }
}
