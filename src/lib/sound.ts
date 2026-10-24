import { useSyncExternalStore } from 'react';

/** Short synthesized cues for the live veto (no audio files). Off until someone turns them on. */
const KEY = 'mapveto.sound';
/** '1' on, '0' turned off on purpose, null never chosen */
let pref = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
let on = pref === '1';
const subs = new Set<() => void>();
let ctx: AudioContext | null = null;

export function setSound(v: boolean) {
  on = v;
  pref = v ? '1' : '0';
  try { localStorage.setItem(KEY, pref); } catch { /* ignore */ }
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

/** Band-passed noise whose band sweeps from one frequency to another, fluttering like something spinning. */
function whoosh(at: number, dur: number, from: number, to: number, gain = 0.05, flutter: [number, number] = [18, 7]) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at, len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = 'bandpass';
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // the flutter: an LFO on the gain, slowing as the spin does
  const lfo = a.createOscillator(), depth = a.createGain();
  lfo.frequency.setValueAtTime(flutter[0], t);
  lfo.frequency.exponentialRampToValueAtTime(flutter[1], t + dur);
  depth.gain.value = gain * 0.8;
  lfo.connect(depth).connect(g.gain);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t); lfo.start(t);
  src.stop(t + dur); lfo.stop(t + dur);
}

const CUES = {
  ban: () => { tone(220, 0, 0.22, 'square', 0.06, 110); tone(110, 0.02, 0.25, 'sine', 0.14); },
  pick: () => { tone(523, 0, 0.12, 'triangle'); tone(784, 0.09, 0.2, 'triangle'); },
  side: () => tone(660, 0, 0.14, 'triangle', 0.1),
  decider: () => { tone(392, 0, 0.18, 'triangle'); tone(523, 0.12, 0.18, 'triangle'); tone(659, 0.24, 0.3, 'triangle'); },
  tick: () => tone(1320, 0, 0.06, 'square', 0.04),
  done: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.09)),
  // coin toss: a thumb-flick ting, the spin in the air, the landing clink, then the winner
  coinFlip: () => {
    [2637, 3951, 5274].forEach((f, i) => tone(f, 0, 0.6 - i * 0.15, 'sine', 0.05 - i * 0.012));
    whoosh(0.05, 1.75, 700, 2600, 0.045);
  },
  coinLand: () => {
    tone(120, 0, 0.14, 'sine', 0.16, 70);
    tone(2489, 0, 0.22, 'sine', 0.06); tone(3729, 0.005, 0.16, 'sine', 0.035);
    tone(2489, 0.19, 0.12, 'sine', 0.025); tone(3322, 0.27, 0.08, 'sine', 0.015);
  },
  coinWin: () => [587, 740, 880, 1175].forEach((f, i) => tone(f, i * 0.075, 0.55, 'triangle', 0.075)),
};

/** Plays a cue when sound is on. `unlessMuted` also plays it for people who never chose, but not if they turned sound off. */
export function cue(name: keyof typeof CUES, { unlessMuted = false } = {}) {
  if (!on && !(unlessMuted && pref !== '0')) return;
  try { void audio()?.resume(); CUES[name](); } catch { /* audio not available */ }
}
