import { useSyncExternalStore } from 'react';
import { type Payload, payload } from './share';
import { games } from './veto';
import type { Format, Phase, Setup, VetoState } from '../types';

/**
 * Two small persisted stores:
 *  - the live session: the veto in progress, so a reload or a wrong click never loses it.
 *    Restored by /veto; cleared when the veto finishes or the user starts over.
 *  - history: the last finished plans, reopenable from the lobby.
 * Both are versioned so a future shape change can be migrated instead of crashing.
 */

const LIVE_KEY = 'mapveto.live';
const HISTORY_KEY = 'mapveto.history';
const LIVE_V = 1;
const HISTORY_V = 1;
const LIVE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const HISTORY_MAX = 20;

export interface LiveSession { v: number; phase: Exclude<Phase, 'setup'>; setup: Setup; veto: VetoState; savedAt: number }
export interface HistoryEntry {
  id: string;
  savedAt: number;
  title: string;
  teams: [string, string];
  format: Format;
  maps: string[];
  plan: Payload;
}

const subs = new Set<() => void>();
let version = 0;
const notify = () => { version++; subs.forEach(f => f()); };
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
// other tabs change the same storage
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key === LIVE_KEY || e.key === HISTORY_KEY) notify(); });
}

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked: the session still works, it just isn't saved */ }
  notify();
}

/* ---------------- live session ---------------- */
export function loadLive(): LiveSession | null {
  const s = read<LiveSession>(LIVE_KEY);
  if (!s || s.v !== LIVE_V || !s.veto?.teams || !Array.isArray(s.veto.hist) || !s.setup?.pool) return null;
  if (Date.now() - s.savedAt > LIVE_MAX_AGE) return null;
  return s;
}
export function saveLive(phase: LiveSession['phase'], setup: Setup, veto: VetoState) {
  write(LIVE_KEY, { v: LIVE_V, phase, setup, veto, savedAt: Date.now() } satisfies LiveSession);
}
export function clearLive() {
  write(LIVE_KEY, null);
}
/** True while a veto with at least one step is saved and unfinished. */
export function useHasLiveVeto(): boolean {
  useSyncExternalStore(subscribe, () => version);
  const s = loadLive();
  return !!s && s.phase === 'veto' && s.veto.hist.length > 0;
}

/* ---------------- history ---------------- */
export function loadHistory(): HistoryEntry[] {
  const h = read<{ v: number; items: HistoryEntry[] }>(HISTORY_KEY);
  return h && h.v === HISTORY_V && Array.isArray(h.items) ? h.items : [];
}
export function useHistory(): HistoryEntry[] {
  useSyncExternalStore(subscribe, () => version);
  return loadHistory();
}
/** Records a finished veto. The same veto finished twice (e.g. after a replay) is stored once. */
export function addHistory(setup: Setup, veto: VetoState) {
  const plan = payload(setup, veto);
  const id = hash(JSON.stringify([plan.teams, plan.format, plan.pool, plan.hist]));
  const entry: HistoryEntry = {
    id, savedAt: Date.now(), title: setup.title, teams: veto.teams, format: setup.format,
    maps: games(veto.hist).map(g => g.map), plan,
  };
  const items = [entry, ...loadHistory().filter(e => e.id !== id)].slice(0, HISTORY_MAX);
  write(HISTORY_KEY, { v: HISTORY_V, items });
}
export function removeHistory(id: string) {
  write(HISTORY_KEY, { v: HISTORY_V, items: loadHistory().filter(e => e.id !== id) });
}

// small stable string hash (FNV-1a) for de-duplicating identical plans
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
