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

export default defineConfig(({ mode }) => ({
  // load every variable (not only VITE_*) for the dev route; none of them reach the client bundle
  plugins: [react(), devRotationApi(loadEnv(mode, process.cwd(), ''))],
  base: '/',
}));
