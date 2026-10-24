import { useSyncExternalStore } from 'react';
import { MAPS } from '../data/maps';
import { addStandardMaps, notifyCatalog } from './rotation';
import type { MapInfo } from '../types';

export type ArtKind = 'tall' | 'wide' | 'splash';
type Art = Partial<Record<ArtKind, string>>;

const IMG: Record<string, Art> = {};
const subs = new Set<() => void>();
let version = 0;
let started = false;

/** Fetch official map artwork once; cards fall back to gradients until (or unless) it arrives. */
export function ensureMapArt() {
  if (started) return;
  started = true;
  fetch('https://valorant-api.com/v1/maps')
    .then(r => r.json())
    .then((j: { data?: { displayName?: string; tacticalDescription?: string | null; narrativeDescription?: string | null; listViewIconTall?: string; listViewIcon?: string; splash?: string }[] }) => {
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
        if (MAPS.some(x => x.id === id)) IMG[id] = { tall: m.listViewIconTall, wide: m.listViewIcon, splash: m.splash };
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
