# Contributing to Map Veto

Thanks for helping out. This guide covers how the code is organized, the conventions it follows, and how to make common changes. Read the [README](README.md) first for what the app does.

- [Getting started](#getting-started)
- [How the code is organized](#how-the-code-is-organized)
- [Core concepts](#core-concepts)
- [Styling](#styling)
- [Common changes](#common-changes)
- [Testing](#testing)
- [Pull requests](#pull-requests)

## Getting started

```bash
git clone https://github.com/tam11a/map-veto.git
cd map-veto
npm install
npm run dev          # http://localhost:5173, with the API routes included
```

Before you push, run the same checks as CI:

```bash
npm run check        # tsc + vitest
npm run build        # production build
```

Requirements: Node 20 or newer. No environment variables are needed. `HENRIK_API_KEY` in `.env.local` is optional (see the README) and must never be committed; `.env*` files other than `.env.example` are gitignored.

## How the code is organized

```
src/
  main.tsx               entry: styles, React root, service worker (production only)
  App.tsx                routes (react-router data router)
  AppProvider.tsx        global state: the saved setup, toasts, the map info sheet, catalog/rotation
  state.ts               AppContext type and the useApp() hook
  types.ts               shared types: Setup, VetoState, Action, RulePreset, ...

  pages/                 one file per route
    Landing.tsx          /            hero veto wall (demo + try it), formats, roles, pool preview
    VetoPage.tsx         /veto        lobby -> live veto -> plan; boot from #plan= links or a saved veto
    RoomPage.tsx         /room/:id    online room (captains, host, spectators)
    OverlayPage.tsx      /overlay/:id broadcast view, rendered outside the site layout
    ShortLinkPage.tsx    /p/:id       resolves a short link to /veto#plan=...
    MapsPage.tsx         /maps        filters and sorting live in the URL
    MapDetail.tsx        /maps/:id    map facts, team prep, minimap
    GuidePage.tsx        /guide       rules, examples, glossary, FAQ

  components/
    SetupView.tsx        the lobby (teams, rules, rule sets, pool, veto order)
    VetoView.tsx         the live board; also exports MapCard, TeamCard, TurnBanner, Timeline
    ResultView.tsx       the match plan, exports and edit mode
    Overlay.tsx          the one modal dialog primitive (portal, focus trap, inert background)
    MapNotes.tsx         notes + agent comp editor, and the read-only CompRow
    Minimap.tsx          minimap with callouts
    MapArt.tsx, TeamMark.tsx, Icons.tsx, ...
    layout/Layout.tsx    header, footer, skip link, error boundary per route

  lib/                   logic with no JSX
    veto.ts              the veto rules: order generation, side rules, plan, current step, games
    share.ts             share payload (links, JSON import/export), text summary, setup validation
    session.ts           saved live veto + veto history (localStorage, versioned)
    room-core.ts         server side of rooms and short links (pure: storage is injected)
    rooms.ts             client side of rooms: create, poll, send moves, invite links
    rotation.ts          competitive rotation layers (snapshot, /api/rotation, wiki fallback)
    images.ts            map art, minimaps and callouts from valorant-api.com; CORS-safe image loading
    agents.ts            playable agents for comps (cached a week)
    exportPng.ts         canvas renderers for the landscape and story images
    sound.ts             WebAudio cues (no audio files)
    fx.ts                cx(), vars(), confetti, reduced-motion check

  data/
    maps.ts              MAPS, COMPETITIVE_POOL, FORMATS, team colours, defaultSetup()
    presets.ts           built-in rule sets
    examples.ts          the guide's example plans
    rotation.generated.json   build-time snapshot (gitignored, written by scripts/fetch-rotation.mjs)

  styles/                tokens.css -> app.css -> site.css -> glass.css (in that order)

netlify/functions/
  rooms.mts              /api/rooms, /api/links -> room-core.ts on Netlify Blobs
  rotation.mjs           /api/rotation -> scripts/rotation-core.mjs, CDN-cached

scripts/
  rotation-core.mjs      rotation sources and parsers, shared by the function, the build and the app
  fetch-rotation.mjs     writes the snapshot before dev and build

public/                  static files: logo, favicon, og.jpg, sw.js, manifest, _redirects
docs/                    design notes, the feature-gap audit, README media
```

## Core concepts

### The veto is data, not UI

A veto is a `Setup` (rules, pool, order) plus a `VetoState` (`teams` in acting order and `hist`, the list of `Action`s that happened). Everything on screen is derived from those two:

- `plan(setup)` lists every step the veto will go through, including side choices and the decider.
- `curStep(setup, hist)` is the step that comes next, or `null` when the veto is finished.
- `remaining(setup, hist)` gives the maps still in play, and `games(hist)` the maps that will be played, with their sides.

These are pure functions in `src/lib/veto.ts`. Any new rule (another side rule, a new format) belongs there first, with tests, and the UI follows. Undo means dropping entries from `hist`; replay means pushing them back one at a time.

### State and persistence

- The lobby setup lives in `AppProvider` and is saved to `localStorage` on every change. Change it through `patch()` from `useApp()`, never by mutating.
- Anything read from storage, links or the server goes through a validator: `normalizeSetup()` for setups and `loadPayload()` for plans. **When you add a field to `Setup`:** add it to `types.ts`, give it a default in `defaultSetup()`, validate it in `normalizeSetup()`, and, if it should travel in share links, add it to `Payload` as an optional field in `share.ts`. Old saves and old links must keep working; `share.test.ts` checks this.
- Storage keys are prefixed `mapveto.`. Saved vetoes carry a version (`LIVE_V` in `session.ts`); bump it only if old saves truly can't be migrated.

### Rooms

Rooms keep the veto rules on the server. `src/lib/room-core.ts` holds the whole API as one `handleApi(request, store)` function and has no I/O of its own. The Netlify function passes it a Blobs store; the Vite dev server passes an in-memory one. That means:

- Room rules are tested directly in `room-core.test.ts` with no server running.
- Every move is checked against `curStep()`: right seat, map still available, current revision (`rev`). Timeouts and deciders are applied on the server.
- Clients poll about once a second (`useRoom` in `rooms.ts`). There is no websocket.
- Seat tokens only ever appear in invite links and are removed from the address bar after joining. Never log them or show them in the UI.

### External data

Map art, minimaps, callouts and agents come from valorant-api.com at runtime and can fail, so every image has a fallback (the map's gradient, the team letter, the agent's initials). Images drawn into the export canvas must go through `loadImg()` in `images.ts`, which proxies hosts that send no CORS headers so the canvas isn't tainted.

## Styling

- Plain CSS with design tokens. No CSS-in-JS, no utility framework. Colours, type sizes, spacing, radii, motion and z-index are tokens in `src/styles/tokens.css`; use them instead of raw values.
- The look is "Observer HUD": dark glass surfaces, and colour only where it means something. Mint `--pick`, red `--ban` and gold `--decider` are reserved for those actions; `--atk` and `--def` for sides. Team A and Team B colours come from `TEAMC` in `data/maps.ts`.
- Fonts: Big Shoulders Display (`--fd`) for display text and labels, Barlow (`--fb`) for everything else.
- Interaction rules the codebase follows:
  - Put hover styles inside `@media (hover: hover)` so they don't stick on touch screens.
  - Transition named properties, never `all`.
  - Use `scale: var(--press)` for the pressed state.
  - Give icons a non-scaling 2px stroke (use `Icons.tsx`).
  - Make nested radii concentric (outer = inner + padding).
- Motion tokens are zeroed under `prefers-reduced-motion`. New animations should use them so they stop for people who asked for less motion.
- **Class names are global.** Before adding a short, generic class (`.empty`, `.lg`, `.setup`), search the stylesheets. Collisions have caused real bugs here. Prefer a component prefix (`.mm-`, `.ov-`, `.rh-`).
- Check every UI change at 375px, 768px and desktop width. The page must never scroll sideways.

## Common changes

**Add or rotate a map**
1. Add the map to `MAPS` in `src/data/maps.ts`: `id` is the lowercase name without spaces; also `name`, `loc`, `year`, `sites`, `tag`, `desc`, and a two-colour `c` gradient as the fallback art. The art, minimap and callouts are picked up from valorant-api.com by name.
2. Update `COMPETITIVE_POOL` when Riot rotates the pool. It must be exactly 7 maps (`ROTATION_SIZE`).
3. If the hero demo (`Landing.tsx`, `WALL`/`PLAY`) or the guide examples (`data/examples.ts`) use a map that left the pool, update them too.

**Add a rule set:** add an entry to `BUILTIN_PRESETS` in `src/data/presets.ts`. The order is written as `bA bB pA pB` (ban or pick, team A or B). `veto.test.ts` checks that every built-in set fits its format.

**Add a page:** create it in `src/pages/`, register the route in `App.tsx` inside the `Layout` children (or beside it for chrome-free pages like the overlay), call `useTitle()`, and add it to the sitemap list in `vite.config.ts` if search engines should find it.

**Add a dialog:** use `<Overlay open onClose labelledBy>` with a heading whose `id` matches `labelledBy`. It handles the portal, focus trap, inert background, Escape and focus return.

**Add an API route:** add it to `handleApi()` in `room-core.ts` (or a new pure module with the same shape), list its path in the function's `config.path`, and cover it in tests. The dev server picks it up automatically through `devRoomsApi()` in `vite.config.ts`.

**Change the export image:** `exportPng.ts` draws everything by hand on a canvas. Test with long team names, 1 to 5 games, missing art and notes on every map.

## Testing

- `npm test` runs Vitest. Tests sit next to the code they cover (`*.test.ts`).
- Cover pure logic with unit tests: veto rules, payload compatibility, room rules, rotation parsers. UI is checked by hand in the browser at the three widths above.
- Bug fixes should come with a test that fails without the fix whenever the logic is testable.
- For room changes, also try two browser profiles (or a normal and a private window) on `npm run dev`: one captain each, plus the overlay.

## Pull requests

1. Fork the repo and branch from `main`.
2. Keep each PR to one change; refactors go in a separate PR from features.
3. Run `npm run check` and `npm run build`.
4. Describe what changed and why, and add before/after screenshots for UI changes (phone and desktop).
5. Write commit messages in the imperative with a short summary line, for example `Add knife round option for the decider`.

Code style: TypeScript strict mode with no unused locals or parameters, function components and hooks, and named exports. Match the surrounding code, including its comment density. Comments explain *why*, not what. Interface text uses sentence case and plain verbs ("Start the veto", not "Submit"), and error messages say what to do next.

When reporting a bug, include the URL (share links reproduce a plan exactly), your browser and device, and the steps to get there.

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).

Map Veto is a fan project and is not affiliated with Riot Games. Don't add Riot assets to the repo; load them at runtime from valorant-api.com like the existing art.
