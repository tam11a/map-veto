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
