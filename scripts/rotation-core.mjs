// Shared by the Netlify function, the build-time snapshot script and the Vite dev route.
// Plain ESM with no dependencies so it runs in Node 20 and in Netlify Functions as-is.

const HENRIK_URL = region => `https://api.henrikdev.xyz/valorant/v1/queue-status/${encodeURIComponent(region)}`;
const VALORANT_API_MAPS = 'https://valorant-api.com/v1/maps';

/** "Ascent" -> "ascent", matching the ids in src/data/maps.ts. */
export const toId = name => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function getJson(url, { headers = {}, timeoutMs = 8000, fetchImpl = fetch } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json', ...headers }, signal: ctl.signal });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pulls the competitive queue's enabled maps out of a HenrikDev queue-status response:
 * { data: [{ mode, mode_id, ranked, tournament, maps: [{ enabled, map: { id, name } }] }] }
 */
export function pickCompetitive(json) {
  const queues = Array.isArray(json?.data) ? json.data : [];
  const queue =
    queues.find(q => String(q.mode_id ?? '').toLowerCase() === 'competitive') ??
    queues.find(q => q.ranked && !q.tournament && /competitive/i.test(String(q.mode ?? '')));
  if (!queue) throw new Error('no competitive queue in the queue-status response');
  const pool = [...new Set((queue.maps ?? []).filter(m => m.enabled !== false).map(m => toId(m.map?.name)).filter(Boolean))];
  // a real rotation is 7 maps; anything far smaller means the response shape changed
  if (pool.length < 5) throw new Error(`competitive queue lists only ${pool.length} enabled maps`);
  return pool;
}

/** Current competitive rotation as map ids. Needs a HenrikDev API key. */
export async function fetchRotation({ key, region = 'eu', fetchImpl } = {}) {
  if (!key) throw new Error('HENRIK_API_KEY is not set');
  const json = await getJson(HENRIK_URL(region), { headers: { Authorization: key }, fetchImpl });
  return pickCompetitive(json);
}

/* ---------------- key-free source: the Valorant Fandom wiki (CC BY-SA) ---------------- */

/** Maps in the ranked rotation. */
export const ROTATION_SIZE = 7;

export const WIKI_PAGE = 'https://valorant.fandom.com/wiki/Maps#Map_rotations';
// origin=* makes the MediaWiki API answer cross-origin requests, so browsers can call it too
const WIKI_API = 'https://valorant.fandom.com/api.php?action=parse&page=Maps&prop=wikitext&format=json&formatversion=2&origin=*';

/**
 * Reads the "Current" rotation block from the Maps page wikitext and returns the map ids it names.
 * Only the block between "===Current===" and the "Rotated out" table is read; names are matched
 * against known standard maps, so wiki markup, patch notes and file names don't leak in.
 */
export function pickWikiRotation(wikitext, knownMaps) {
  const text = String(wikitext ?? '');
  const start = text.search(/===\s*Current\s*===/i);
  if (start < 0) throw new Error('no "Current" rotation section on the wiki page');
  const rest = text.slice(start + 3);
  const endCandidates = [rest.search(/Rotated out/i), rest.search(/\n==[^=]/)].filter(i => i > 0);
  const block = rest.slice(0, endCandidates.length ? Math.min(...endCandidates) : undefined);
  const pool = knownMaps
    .filter(m => new RegExp(`\\b${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(block))
    .map(m => m.id);
  // the ranked rotation is exactly 7 maps. The page is community-edited and is often half-updated
  // around a new act (e.g. listing both outgoing and incoming maps), so anything else is rejected.
  if (pool.length !== ROTATION_SIZE) throw new Error(`wiki rotation lists ${pool.length} maps, expected ${ROTATION_SIZE}`);
  return pool;
}

/** Competitive rotation from the Valorant wiki. No key; community-edited. */
export async function fetchWikiRotation({ knownMaps, fetchImpl } = {}) {
  const maps = knownMaps ?? (await fetchStandardMaps({ fetchImpl }));
  const headers = typeof window === 'undefined' ? { 'User-Agent': 'MapVeto/1.0 (map rotation; https://github.com/tam11a)' } : {};
  const json = await getJson(WIKI_API, { headers, fetchImpl });
  return pickWikiRotation(json?.parse?.wikitext, maps);
}

/**
 * Best available rotation: HenrikDev when a key is configured (it reads Riot's live queue data),
 * otherwise or on failure the community-edited wiki. Returns { source, pool, note? }.
 */
export async function resolveRotation({ key, region = 'eu', fetchImpl } = {}) {
  let note;
  if (key) {
    try {
      return { source: 'henrikdev', pool: await fetchRotation({ key, region, fetchImpl }) };
    } catch (err) {
      note = `HenrikDev failed (${err.message}); used the wiki`;
    }
  }
  return { source: 'wiki', pool: await fetchWikiRotation({ fetchImpl }), ...(note ? { note } : {}) };
}

/** Every standard (bomb-site) map from valorant-api.com. No key needed. */
export async function fetchStandardMaps({ fetchImpl } = {}) {
  const json = await getJson(VALORANT_API_MAPS, { fetchImpl });
  const seen = new Set();
  return (json?.data ?? [])
    .filter(m => /sites?$/i.test(String(m.tacticalDescription ?? '').trim()))
    .map(m => ({
      id: toId(m.displayName),
      name: m.displayName,
      // "A/B/C Sites" -> "A, B, C"
      sites: m.tacticalDescription.replace(/\s*sites?$/i, '').split('/').map(s => s.trim()).join(', '),
      desc: m.narrativeDescription ?? '',
    }))
    .filter(m => m.id && !seen.has(m.id) && seen.add(m.id));
}
