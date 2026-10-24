import { useSyncExternalStore } from 'react';
import snapshot from '../data/rotation.generated.json';
import { ALL_MAP_IDS, COMPETITIVE_POOL, MAPS } from '../data/maps';
import { ROTATION_SIZE, fetchWikiRotation } from '../../scripts/rotation-core.mjs';

/**
 * Keeps the map catalogue and the competitive rotation current, in three layers:
 *  1. built-in lists in data/maps.ts (always there)
 *  2. the build-time snapshot (scripts/fetch-rotation.mjs), applied when this module loads
 *  3. a live /api/rotation call (Netlify function, CDN-cached for a day), cached here for 24h;
 *     without the function (drag-and-drop deploys) the browser reads the key-free wiki directly
 * MAPS, ALL_MAP_IDS and COMPETITIVE_POOL are updated in place; components re-render via useCatalog().
 */

export interface StandardMap { id: string; name: string; sites: string; desc: string }
export type RotationOrigin = 'henrikdev' | 'wiki';
export interface RotationInfo { source: 'live' | 'snapshot' | 'built-in'; origin: RotationOrigin | null; updated: string | null }

interface Snapshot {
  rotation: { source: string; updated: string; pool: string[] } | null;
  standardMaps: StandardMap[] | null;
}

const CACHE_KEY = 'mapveto.rotation';
const CACHE_MS = 24 * 60 * 60 * 1000;

let info: RotationInfo = { source: 'built-in', origin: null, updated: null };
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

const asOrigin = (o: unknown): RotationOrigin | null => (o === 'henrikdev' || o === 'wiki' ? o : null);

function applyPool(pool: unknown, source: RotationInfo['source'], origin: unknown, updated: string | null) {
  if (!Array.isArray(pool)) return false;
  const order = MAPS.map(m => m.id);
  const valid = [...new Set(pool.filter((id): id is string => typeof id === 'string' && order.includes(id)))];
  if (valid.length < 5) return false; // a broken response must never empty the rotation
  // the community wiki must list exactly the ranked pool size (it is often half-edited around a new act)
  if (asOrigin(origin) === 'wiki' && valid.length !== ROTATION_SIZE) return false;
  valid.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  COMPETITIVE_POOL.splice(0, COMPETITIVE_POOL.length, ...valid);
  info = { source, origin: asOrigin(origin), updated };
  return true;
}

// layer 2: the snapshot bundled at build time
const snap = snapshot as unknown as Snapshot;
if (snap.standardMaps) addStandardMaps(snap.standardMaps);
if (snap.rotation) applyPool(snap.rotation.pool, 'snapshot', snap.rotation.source, snap.rotation.updated);

// layer 3: live rotation, at most one network call per browser per day
let started = false;
export function initRotation() {
  if (started) return;
  started = true;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS && applyPool(cached.pool, 'live', cached.origin, cached.updated)) {
      notifyCatalog();
      return;
    }
  } catch { /* storage unavailable or corrupt: fetch instead */ }

  const viaFunction = () =>
    fetch('/api/rotation', { headers: { Accept: 'application/json' } })
      .then(r => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { pool?: unknown; source?: string; updated?: string }) => ({ pool: j.pool, origin: j.source, updated: j.updated ?? new Date().toISOString() }));
  // no function on this deploy: read the wiki straight from the browser (it allows cross-origin reads)
  const viaWiki = () =>
    fetchWikiRotation({ knownMaps: MAPS.map(m => ({ id: m.id, name: m.name })) })
      .then(pool => ({ pool: pool as unknown, origin: 'wiki', updated: new Date().toISOString() }));

  viaFunction()
    .catch(viaWiki)
    .then(r => {
      if (!applyPool(r.pool, 'live', r.origin, r.updated)) return;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...r, fetchedAt: Date.now() })); } catch { /* ignore */ }
      notifyCatalog();
    })
    .catch(() => { /* offline: keep the snapshot */ });
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
