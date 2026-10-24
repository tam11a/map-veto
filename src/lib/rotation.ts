import { useSyncExternalStore } from 'react';
import snapshot from '../data/rotation.generated.json';
import { ALL_MAP_IDS, COMPETITIVE_POOL, MAPS } from '../data/maps';

/**
 * Keeps the map catalogue and the competitive rotation current, in three layers:
 *  1. built-in lists in data/maps.ts (always there)
 *  2. the build-time snapshot (scripts/fetch-rotation.mjs), applied when this module loads
 *  3. a live /api/rotation call (Netlify function, CDN-cached for a day), cached here for 24h
 * MAPS, ALL_MAP_IDS and COMPETITIVE_POOL are updated in place; components re-render via useCatalog().
 */

export interface StandardMap { id: string; name: string; sites: string; desc: string }
export interface RotationInfo { source: 'live' | 'snapshot' | 'built-in'; updated: string | null }

interface Snapshot {
  rotation: { source: string; updated: string; pool: string[] } | null;
  standardMaps: StandardMap[] | null;
}

const CACHE_KEY = 'mapveto.rotation';
const CACHE_MS = 24 * 60 * 60 * 1000;

let info: RotationInfo = { source: 'built-in', updated: null };
let version = 0;
const subs = new Set<() => void>();
export function notifyCatalog() {
  version++;
  subs.forEach(f => f());
}

/** Adds maps we don't have hand-written details for yet (e.g. a newly released map). */
export function addStandardMaps(list: StandardMap[]) {
  let added = false;
  for (const m of list) {
    if (!m.id || MAPS.some(x => x.id === m.id)) continue;
    MAPS.push({ id: m.id, name: m.name, loc: 'New map', sites: m.sites || '—', tag: 'Recently added', desc: m.desc || 'A recently added map. Add your team’s notes here as you learn it.', c: ['#3a4a63', '#10151e'] });
    ALL_MAP_IDS.push(m.id);
    added = true;
  }
  return added;
}

function applyPool(pool: unknown, source: RotationInfo['source'], updated: string | null) {
  if (!Array.isArray(pool)) return false;
  const order = MAPS.map(m => m.id);
  const valid = [...new Set(pool.filter((id): id is string => typeof id === 'string' && order.includes(id)))];
  if (valid.length < 5) return false; // a broken response must never empty the rotation
  valid.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  COMPETITIVE_POOL.splice(0, COMPETITIVE_POOL.length, ...valid);
  info = { source, updated };
  return true;
}

// layer 2: the snapshot bundled at build time
const snap = snapshot as unknown as Snapshot;
if (snap.standardMaps) addStandardMaps(snap.standardMaps);
if (snap.rotation) applyPool(snap.rotation.pool, 'snapshot', snap.rotation.updated);

// layer 3: live rotation, at most one network call per browser per day
let started = false;
export function initRotation() {
  if (started) return;
  started = true;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS && applyPool(cached.pool, 'live', cached.updated)) {
      notifyCatalog();
      return;
    }
  } catch { /* storage unavailable or corrupt: fetch instead */ }

  fetch('/api/rotation', { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: { pool?: unknown; updated?: string }) => {
      if (!applyPool(j.pool, 'live', j.updated ?? null)) return;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ pool: j.pool, updated: j.updated, fetchedAt: Date.now() })); } catch { /* ignore */ }
      notifyCatalog();
    })
    .catch(() => { /* offline, no function (e.g. drag-and-drop deploy) or no key: keep the snapshot */ });
}

const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };

/** Bumps whenever maps are added or the rotation changes. */
export function useCatalogVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

/** Where the competitive rotation came from; re-renders on change. */
export function useCatalog(): RotationInfo {
  useCatalogVersion();
  return info;
}
