import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveRotation } from './scripts/rotation-core.mjs';
import { handleApi, memoryStore } from './src/lib/room-core';
import { MAPS } from './src/data/maps';

/** Serves /api/rotation during `npm run dev`, mirroring netlify/functions/rotation.mjs. */
function devRotationApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-rotation-api',
    configureServer(server) {
      server.middlewares.use('/api/rotation', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const { source, pool } = await resolveRotation({ key: env.HENRIK_API_KEY, region: env.HENRIK_REGION || 'eu' });
          res.end(JSON.stringify({ source, updated: new Date().toISOString(), pool }));
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String((err as Error)?.message ?? err) }));
        }
      });
    },
  };
}

/** Serves /api/rooms and /api/links during `npm run dev` with an in-memory store (netlify/functions/rooms.mts in production). */
function devRoomsApi(): Plugin {
  const store = memoryStore();
  return {
    name: 'dev-rooms-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/rooms') && !req.url?.startsWith('/api/links')) return next();
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request('http://localhost' + req.url, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        });
        const out = await handleApi(request, store);
        if (!out) return next();
        res.statusCode = out.status;
        out.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await out.text());
      });
    },
  };
}

/** Dev-only: og.html posts the rendered social image here to save it as public/og.jpg. */
function devSaveOgImage(): Plugin {
  return {
    name: 'dev-save-og-image',
    configureServer(server) {
      server.middlewares.use('/__og', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST a JPEG'); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (c: Buffer) => { size += c.length; if (size < 5_000_000) chunks.push(c); });
        req.on('end', () => {
          const buf = Buffer.concat(chunks);
          // only ever writes one fixed file, and only real JPEG data
          if (size >= 5_000_000 || buf.subarray(0, 3).toString('hex') !== 'ffd8ff') { res.statusCode = 400; res.end('not a JPEG'); return; }
          writeFileSync('public/og.jpg', buf);
          res.end('saved');
        });
      });
    },
  };
}

/** robots.txt and sitemap.xml at build time; the sitemap needs the site's absolute URL (Netlify's URL). */
function seoFiles(env: Record<string, string>): Plugin {
  const url = (env.URL || env.SITE_URL || '').replace(/\/$/, '');
  const pages = ['/', '/veto', '/maps', '/guide', ...MAPS.map(m => `/maps/${m.id}`)];
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /room/', 'Disallow: /overlay/', 'Disallow: /p/', ...(url ? ['', `Sitemap: ${url}/sitemap.xml`] : [])];
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' });
      if (!url) return;
      const today = new Date().toISOString().slice(0, 10);
      const xml = pages.map(p => `  <url><loc>${url}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>\n`,
      });
    },
  };
}

/** Social tags need an absolute image URL: use Netlify's site URL at build time when available. */
function siteUrl(env: Record<string, string>): Plugin {
  const url = (env.URL || env.SITE_URL || '').replace(/\/$/, '');
  return { name: 'site-url', transformIndexHtml: html => html.replaceAll('%SITE_URL%', url) };
}

export default defineConfig(({ mode }) => ({
  // load every variable (not only VITE_*) for the dev route; none of them reach the client bundle
  plugins: [react(), tailwindcss(), devRotationApi(loadEnv(mode, process.cwd(), '')), devRoomsApi(), devSaveOgImage(), siteUrl({ ...process.env, ...loadEnv(mode, process.cwd(), '') } as Record<string, string>), seoFiles({ ...process.env, ...loadEnv(mode, process.cwd(), '') } as Record<string, string>)],
  base: '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
}));
