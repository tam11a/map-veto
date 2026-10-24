# Security policy

## Supported versions

Only the live site at [map-veto.tam11a.dev](https://map-veto.tam11a.dev) and the latest `main` branch get fixes.

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability** and describe the problem, how to reproduce it, and what an attacker could do with it.

You'll get a reply within a few days. Once a fix is live, the report can be published with credit to you if you'd like.

## What's in scope

- **Online rooms and short links** (`netlify/functions/rooms.mts`, `src/lib/room-core.ts`): acting for a team without its captain link, changing a finished room, reading seat tokens, or storing data that breaks other rooms.
- **Share links and imports**: a crafted link or JSON file that runs script, breaks the page for whoever opens it, or overwrites someone's saved setup.
- **The rotation function** (`netlify/functions/rotation.mjs`): anything that exposes the `HENRIK_API_KEY` or lets callers abuse it.

Out of scope: the third-party services the app reads from (valorant-api.com, the HenrikDev API, the Valorant Wiki), Netlify itself, and reports from automated scanners with no working proof of impact.
