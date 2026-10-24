<p align="center"><img src="public/logo.svg" alt="Map Veto — Valorant Map Picker" width="360"></p>

# Map Veto: Valorant Map Picker

Run a pro-style map veto for **Bo1, Bo2, Bo3 and Bo5** — bans, picks, side selection, turn timers and map intel — then share the final plan as an image, story image, link, text or JSON. Captains can veto from their own devices in an online room, with a transparent stream overlay for OBS. Free, no sign-up.

## Pages

| Route        | What it is                                                      |
| ------------ | --------------------------------------------------------------- |
| `/`          | Landing page with a self-playing veto demo                      |
| `/veto`      | The veto app: setup → live veto → match plan (`?format=1/2/3/5`) |
| `/veto#plan=…` | Shared plan link — opens straight into the result             |
| `/maps`      | Map pool with search & filters                                  |
| `/maps/:id`  | Map detail: minimap with callouts, team prep (notes per side, agent comp) |
| `/guide`     | How the veto works, formats with example replays, sides, glossary, FAQ |
| `/room/:id`  | Online captain room (`?t=` seat token from the invite links)    |
| `/overlay/:id` | Transparent 1920×1080 broadcast view of a room (`?bg=1` to preview) |
| `/p/:id`     | Short share link                                                |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm test           # Vitest: veto rules, share links, rooms, rotation parsers
npm run check      # type-check + tests (what CI runs before the build)
```

`npm run dev` also serves `/api/rooms`, `/api/links` and `/api/rotation`, so online rooms work locally (rooms live in memory until the dev server restarts).

## Deploy to Netlify

**Git-connected (recommended):** push this repo and import it in Netlify. `netlify.toml` already sets the build command (`npm run build`), publish directory (`dist`), Node 20, the functions directory, SPA redirects and caching headers. Netlify sets `URL` during the build, which makes the social image, `robots.txt` and `sitemap.xml` use absolute links.

Two functions deploy with the site:

- `netlify/functions/rotation.mjs` → `/api/rotation`, the CDN-cached competitive rotation
- `netlify/functions/rooms.mts` → `/api/rooms` and `/api/links`, online rooms and short links stored in [Netlify Blobs](https://docs.netlify.com/blobs/overview/) (no setup needed, Blobs is on for every site)

**Drag & drop:** run `npm run build` and drop the `dist/` folder on [app.netlify.com/drop](https://app.netlify.com/drop). This uploads static files only, so **functions are not deployed**: online rooms and short links are unavailable (share links fall back to the long self-contained form) and the rotation is read from the wiki in the browser. Use Git or the CLI for the full app.

**CLI:**

```bash
npx netlify-cli deploy --build --prod
```

## Live competitive rotation

The competitive map pool comes from one of two upstreams, and new maps are discovered from [valorant-api.com](https://valorant-api.com):

- **No key (default):** the "Current" rotation section of the [Valorant Wiki](https://valorant.fandom.com/wiki/Maps#Map_rotations) via its MediaWiki API. Community-edited and CC BY-SA, so the Maps page credits it and labels it as such.
- **With `HENRIK_API_KEY`:** [HenrikDev's unofficial API](https://docs.henrikdev.xyz/) (`/valorant/v1/queue-status`), which reads Riot's queue data. Used first when a key is set; the wiki is the fallback if it fails.

Three layers, so the site always has an answer:

| Layer | Where | Refreshes |
| --- | --- | --- |
| Live | `netlify/functions/rotation.mjs` at `/api/rotation`, cached on Netlify's CDN for 24h (stale-while-revalidate 7 days) and in the browser for 24h. Without the function, the browser reads the wiki directly | about once a day |
| Snapshot | `scripts/fetch-rotation.mjs` runs before `dev` and `build`, writing `src/data/rotation.generated.json` (gitignored) | every deploy |
| Built-in | `COMPETITIVE_POOL` and `MAPS` in `src/data/maps.ts` | when you edit it |

Optional setup for the HenrikDev source:

1. Create a key at [api.henrikdev.xyz/dashboard](https://api.henrikdev.xyz/dashboard/).
2. Copy `.env.example` to `.env.local` and set `HENRIK_API_KEY` (local dev uses a matching `/api/rotation` route in `vite.config.ts`).
3. Add `HENRIK_API_KEY` (and optionally `HENRIK_REGION`) in Netlify → Site configuration → Environment variables.

Without a key everything still works from the wiki; the built-in list is only used if both upstreams are unreachable. The Maps page shows which layer is in use. `npm run rotation` refreshes the snapshot by hand.

> Drag-and-drop deploys don't include functions; the browser then reads the wiki directly (still key-free and cached for 24h).

## Brand

- **Mark** — an angular V: the mint arm is the *pick*, the red arm the *ban*, the gold diamond the *decider*. Source: `public/favicon.svg`, `public/logo.svg`, `src/brand/Logo.tsx`.
- **Direction** — "Observer HUD": a tournament broadcast overlay. Colour appears only where it means something.
- **Colours** — Range `#0F1218`, Glass `#171C25`, Signal `#E6E9EF`, Pick `#2EE6C5`, Ban `#FF4655`, Decider `#FFC861` (sides: Attack `#FF9A62`, Defense `#7FB2FF`).
- **Type** — Chakra Petch (display & HUD), Barlow (UI/body), on a 1.25 scale from 12 to 76px.
- **Tokens** — `src/styles/tokens.css` holds colour, type, radius, spacing, motion and z-index. Movement distances are zeroed under `prefers-reduced-motion`.

## Structure

```
src/
  brand/Logo.tsx       logo mark, wordmark and brand strings
  pages/               Landing, VetoPage, MapsPage, MapDetail, GuidePage, NotFound
  components/          SetupView, VetoView, ResultView, MapArt, Overlay, CoinToss, InfoModal
  components/layout/   Nav, Footer
  styles/              tokens.css, app.css (veto app), site.css (chrome, landing, pages)
  lib/veto.ts          pure veto logic: sequence generation, side rules, plan, current step, games
  lib/share.ts         share links, JSON payload, text summary, setup validation
  lib/room-core.ts     server rules for rooms and short links (used by the function and the dev server)
  lib/rooms.ts         client for rooms: create, poll, send moves, invite links
  lib/exportPng.ts     canvas renderers for the landscape and story plan images
  lib/images.ts        official map art, minimaps and callouts, CORS-safe loading for export
  lib/agents.ts        playable agents for comps (valorant-api.com, cached a week)
  lib/sound.ts         synthesized WebAudio cues for the live veto
  data/presets.ts      built-in rule sets
netlify/functions/     rotation.mjs, rooms.mts
public/sw.js           service worker for offline use
  AppProvider.tsx      global setup state, toasts, map info sheet
```

## Notes

- Map artwork is loaded at runtime from [valorant-api.com](https://valorant-api.com); cards fall back to gradients if it is unavailable. The PNG export fetches art through the `wsrv.nl` image proxy because the media CDN sends no CORS headers.
- Setup, notes and saved rule sets are stored in `localStorage`. Long share links carry the whole plan in the URL hash. Online rooms and short links are stored in Netlify Blobs; rooms close three days after the last move.
- Room seats are random tokens in the invite links. Anyone with a captain link can act for that team, so share them privately.
- Keyboard during a veto: `1`–`9`/`0` choose maps, `A`/`D` sides, `P` pause, `M` sound, `Ctrl+Z` undo.

Map Veto is a fan-made tool and is not affiliated with or endorsed by Riot Games. VALORANT and all related names and artwork are trademarks of Riot Games, Inc.
