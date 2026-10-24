// Runs before `npm run dev` and `npm run build`.
// Writes src/data/rotation.generated.json: the competitive rotation (HenrikDev with HENRIK_API_KEY,
// otherwise the key-free Valorant wiki) and every standard map (valorant-api.com, no key). The app bundles it as the offline fallback.
// It never fails the build: if a source is unreachable, the previous snapshot or the built-in list is kept.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fetchStandardMaps, resolveRotation } from './rotation-core.mjs';

// minimal .env loader (no dependency); real environment variables win
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const OUT = 'src/data/rotation.generated.json';
let prev = null;
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }

const out = { generated: new Date().toISOString(), rotation: prev?.rotation ?? null, standardMaps: prev?.standardMaps ?? null };

try {
  const { source, pool, note } = await resolveRotation({ key: process.env.HENRIK_API_KEY, region: process.env.HENRIK_REGION || 'eu' });
  if (note) console.warn(`[rotation] ${note}`);
  out.rotation = { source, updated: new Date().toISOString(), pool };
  console.log(`[rotation] competitive pool from ${source}: ${pool.join(', ')}`);
} catch (err) {
  console.warn(`[rotation] ${err.message}. Keeping ${out.rotation ? `the snapshot from ${out.rotation.updated}` : 'the built-in list'}.`);
}

try {
  out.standardMaps = await fetchStandardMaps();
  console.log(`[rotation] ${out.standardMaps.length} standard maps from valorant-api.com`);
} catch (err) {
  console.warn(`[rotation] map list unavailable (${err.message}). Keeping ${out.standardMaps ? 'the previous list' : 'the built-in maps'}.`);
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
