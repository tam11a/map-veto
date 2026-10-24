import { resolveRotation } from '../../scripts/rotation-core.mjs';

/**
 * GET /api/rotation -> { source: "henrikdev" | "wiki", updated, pool: ["abyss", ...] }
 *
 * Uses HenrikDev when HENRIK_API_KEY is set, otherwise (or if that fails) the key-free
 * Valorant wiki. Netlify's CDN keeps the answer for a day and serves the stale copy for up
 * to a week while it refreshes, so each upstream sees roughly one request per day.
 */
export default async () => {
  try {
    const { source, pool, note } = await resolveRotation({
      key: process.env.HENRIK_API_KEY,
      region: process.env.HENRIK_REGION || 'eu',
    });
    if (note) console.warn(`[rotation] ${note}`);
    return Response.json(
      { source, updated: new Date().toISOString(), pool },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'Netlify-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, durable',
        },
      },
    );
  } catch (err) {
    // never cache failures; the app falls back to the build-time snapshot
    return Response.json({ error: String(err?.message ?? err) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};

export const config = { path: '/api/rotation' };
