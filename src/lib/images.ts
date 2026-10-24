import { useSyncExternalStore } from 'react';
import { MAPS } from '../data/maps';
import { addStandardMaps, notifyCatalog } from './rotation';
import type { MapInfo } from '../types';

export type ArtKind = 'tall' | 'wide' | 'splash';
type Art = Partial<Record<ArtKind, string>>;

const IMG: Record<string, Art> = {};

export interface Callout { name: string; region: string; x: number; y: number }
/** Minimap image and callouts, with positions already converted to 0..1 of the image. */
export interface Minimap { icon: string; callouts: Callout[] }
const MINI: Record<string, Minimap> = {};

interface ApiMap {
  displayName?: string; tacticalDescription?: string | null; narrativeDescription?: string | null;
  listViewIconTall?: string; listViewIcon?: string; splash?: string; displayIcon?: string | null;
  xMultiplier?: number; yMultiplier?: number; xScalarToAdd?: number; yScalarToAdd?: number;
  callouts?: { regionName: string; superRegionName: string; location: { x: number; y: number } }[] | null;
}

/** valorant-api.com's documented transform from game coordinates to minimap fractions (note the swapped axes). */
function toMinimap(m: ApiMap): Minimap | null {
  if (!m.displayIcon || !m.callouts?.length || m.xMultiplier == null || m.yMultiplier == null) return null;
  const callouts = m.callouts
    .map(c => ({
      name: c.regionName,
      region: c.superRegionName,
      x: c.location.y * m.xMultiplier! + (m.xScalarToAdd ?? 0),
      y: c.location.x * m.yMultiplier! + (m.yScalarToAdd ?? 0),
    }))
    .filter(c => c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1);
  return callouts.length ? { icon: m.displayIcon, callouts } : null;
}
const subs = new Set<() => void>();
let version = 0;
let started = false;

/** Fetch official map artwork once; cards fall back to gradients until (or unless) it arrives. */
export function ensureMapArt() {
  if (started) return;
  started = true;
  fetch('https://valorant-api.com/v1/maps')
    .then(r => r.json())
    .then((j: { data?: ApiMap[] }) => {
      // standard (bomb-site) maps released after this build's snapshot
      const added = addStandardMaps((j.data ?? [])
        .filter(m => /sites?$/i.test(String(m.tacticalDescription ?? '').trim()))
        .map(m => ({
          id: (m.displayName ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: m.displayName ?? '',
          sites: String(m.tacticalDescription).replace(/\s*sites?$/i, '').split('/').map(s => s.trim()).join(', '),
          desc: m.narrativeDescription ?? '',
        })));
      if (added) notifyCatalog();
      for (const m of j.data ?? []) {
        const id = (m.displayName ?? '').toLowerCase();
        if (!MAPS.some(x => x.id === id)) continue;
        IMG[id] = { tall: m.listViewIconTall, wide: m.listViewIcon, splash: m.splash };
        const mini = toMinimap(m);
        if (mini) MINI[id] = mini;
      }
      version++;
      subs.forEach(f => f());
    })
    .catch(() => {});
}

export function useMapArtVersion() {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => version,
  );
}

/** Minimap for an official map, once the map data has loaded. */
export const minimapFor = (id: string): Minimap | null => MINI[id] ?? null;

export function imgFor(m: MapInfo, kind: ArtKind = 'tall'): string | null {
  if (m.img) return m.img;
  const i = IMG[m.id];
  return i ? i[kind] ?? i.splash ?? null : null;
}

// Images for the canvas export are fetched as blobs so the canvas is never tainted.
// The Valorant media CDN sends no CORS headers, so those go through the wsrv.nl image proxy.
async function fetchBlobImg(url: string, ms = 9000): Promise<HTMLImageElement> {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    const src = URL.createObjectURL(await r.blob());
    return await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  } finally {
    clearTimeout(to);
  }
}

export async function loadImg(url: string | null, w = 900): Promise<HTMLImageElement | null> {
  if (!url) return null;
  if (!url.includes('media.valorant-api.com')) try { return await fetchBlobImg(url, 4000); } catch { /* try proxy */ }
  try { return await fetchBlobImg(`https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=${w}&output=jpg&q=85`); } catch { /* give up */ }
  return null;
}
