import { writeFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveRotation } from './scripts/rotation-core.mjs';

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

/** Social tags need an absolute image URL: use Netlify's site URL at build time when available. */
function siteUrl(env: Record<string, string>): Plugin {
  const url = (env.URL || env.SITE_URL || '').replace(/\/$/, '');
  return { name: 'site-url', transformIndexHtml: html => html.replaceAll('%SITE_URL%', url) };
}

export default defineConfig(({ mode }) => ({
  // load every variable (not only VITE_*) for the dev route; none of them reach the client bundle
  plugins: [react(), devRotationApi(loadEnv(mode, process.cwd(), '')), devSaveOgImage(), siteUrl({ ...process.env, ...loadEnv(mode, process.cwd(), '') } as Record<string, string>)],
  base: '/',
}));
