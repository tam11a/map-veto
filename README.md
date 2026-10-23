<p align="center"><img src="public/logo.svg" alt="Map Veto — Valorant Map Picker" width="360"></p>

# Map Veto: Valorant Map Picker

Run a pro-style map veto for **Bo1, Bo2, Bo3 and Bo5** — bans, picks, side selection, turn timers and map intel — then share the final plan as an image, link, text or JSON. Free, no sign-up, runs entirely in the browser.

## Pages

| Route        | What it is                                                      |
| ------------ | --------------------------------------------------------------- |
| `/`          | Landing page with a self-playing veto demo                      |
| `/veto`      | The veto app: setup → live veto → match plan (`?format=1/2/3/5`) |
| `/veto#plan=…` | Shared plan link — opens straight into the result             |
| `/maps`      | Map pool with search & filters                                  |
| `/maps/:id`  | Map detail with intel, team notes and pool controls             |
| `/guide`     | How the veto works, formats, sides, glossary, FAQ               |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
```

## Deploy to Netlify

**Git-connected (recommended):** push this repo and import it in Netlify. `netlify.toml` already sets the build command (`npm run build`), publish directory (`dist`), Node 20, SPA redirects and asset caching.

**Drag & drop:** run `npm run build` and drop the `dist/` folder on [app.netlify.com/drop](https://app.netlify.com/drop). `public/_redirects` is copied into `dist/` so deep links like `/maps/ascent` still work.

**CLI:**

```bash
npx netlify-cli deploy --build --prod
```

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
  lib/veto.ts          pure veto logic — sequence generation, plan, current step, games
  lib/share.ts         share links, JSON payload, text summary, local storage
  lib/exportPng.ts     canvas renderer for the shareable plan image
  lib/images.ts        official map art + CORS-safe loading for export
  AppProvider.tsx      global setup state, toasts, map info sheet
```

## Notes

- Map artwork is loaded at runtime from [valorant-api.com](https://valorant-api.com); cards fall back to gradients if it is unavailable. The PNG export fetches art through the `wsrv.nl` image proxy because the media CDN sends no CORS headers.
- Setup and map notes are stored in `localStorage`; share links carry the whole plan in the URL hash, so nothing is sent to a server.

Map Veto is a fan-made tool and is not affiliated with or endorsed by Riot Games. VALORANT and all related names and artwork are trademarks of Riot Games, Inc.
