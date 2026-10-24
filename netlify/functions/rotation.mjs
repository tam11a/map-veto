import { fetchRotation } from '../../scripts/rotation-core.mjs';

/**
 * GET /api/rotation -> { source, updated, pool: ["abyss", ...] }
 *
 * Netlify's CDN keeps the answer for a day and serves the stale copy for up to a week while it
 * refreshes in the background, so HenrikDev sees roughly one request per day per region.
 * The API key stays on the server (HENRIK_API_KEY in Netlify's environment variables).
 */
export default async () => {
  try {
    const pool = await fetchRotation({
      key: process.env.HENRIK_API_KEY,
      region: process.env.HENRIK_REGION || 'eu',
    });
    return Response.json(
      { source: 'henrikdev', updated: new Date().toISOString(), pool },
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
