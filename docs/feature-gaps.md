# Map Veto — feature-gap audit

Every page and shared system reviewed against what captains, coaches, organisers and casters need from a veto tool. Each gap was checked in the code; the ones marked **verified** were also reproduced in the browser.

**Effort:** S = under a day · M = 1–3 days · L = a week or more / needs a backend.
**Priority:** P1 = fix or build next · P2 = strong next wave · P3 = nice to have.

---

## The short list (P1)

| # | Gap | Where | Why it matters | Effort |
| --- | --- | --- | --- | --- |
| 1 | **A live veto is lost on refresh or navigation, with no warning** (verified) | `/veto` | Clicking a header link mid-veto, or reloading, sends you back to a blank setup. One misclick ends a real veto. | S |
| 2 | **No two-device veto (captain rooms)** | `/veto` | Today one person drives the veto for both teams. Tools like mapban.gg give each captain a link and run the veto turn by turn across devices. This is the biggest functional gap. | L (realtime backend) |
| 3 | **No stream overlay** | new route | The "Observer HUD" look is built for broadcasts, but there is no transparent, chrome-free view to add to OBS. | M (after 1; L live with 2) |
| 4 | **No minimap or callouts on map pages** | `/maps/:id` | Map pages are text-only. valorant-api.com already provides a minimap image and named callouts with coordinates for every map (verified: 22 for Ascent), free and with no key. | M |
| 5 | **No league rule presets** | lobby | VCT, Premier and Challengers orders must be rebuilt by hand each time, and a custom order can't be saved. | S–M |
| 6 | **No veto history** | global | Finished plans disappear unless exported. There is no "recent vetoes" list to reopen. | S |
| 7 | **No social preview image** | global | Share links pasted into Discord or X show no image (no `og:image`). | S (static) / M (per-plan) |
| 8 | **Dialogs aren't accessible** | side pick, map info, coin toss | No `role="dialog"`/`aria-modal`, no focus trap, focus isn't returned on close. Keyboard and screen-reader users can tab behind the side-pick sheet. | S |

---

## By page

### Home `/`
| Gap | Priority | Effort |
| --- | --- | --- |
| The demo wall is watch-only. Letting visitors click the next ban or pick would turn the hero into a try-it moment. | P3 | S |
| No "resume your last veto" entry point (depends on history, #6). | P2 | S |
| Map pool preview has no "use this pool" shortcut into the lobby. | P3 | S |

### Lobby `/veto` (setup)
| Gap | Priority | Effort |
| --- | --- | --- |
| **Rule presets** (VCT Bo3/Bo5, Premier, Challengers) and **save custom order** as a named preset (#5). | P1 | S–M |
| Side rules are fixed (opponent of picker; decider side to team without last ban). No options for knife round, coin flip on decider, or picker chooses side. | P2 | S |
| Teams are names only: no tag, logo or custom colour. Plans and exports would look more official with them. | P2 | M |
| Custom maps can be added and deleted but not edited; images must be a URL (no upload). | P3 | S |
| Starting is allowed when the order doesn't fit the format (warning only). Fine for flexibility, but no "start anyway?" confirmation. | P3 | S |
| Timer has fixed values (20/45/60s); no custom value, no pause. | P3 | S |

### Live veto `/veto` (in progress)
| Gap | Priority | Effort |
| --- | --- | --- |
| **Progress isn't saved** and leaving isn't guarded (#1). Save the veto to session storage each step, restore on load, and confirm before leaving. | P1 | S |
| **Two-device rooms** with per-captain links, turn locking, spectators and presence (#2). Needs a realtime service (e.g. PartyKit, Ably, Supabase Realtime) plus a room id in the URL. | P1 | L |
| **Stream overlay** route: transparent background, large board, no header (#3). | P1 | M |
| No timer pause/resume for admins; timer keeps running if the side-pick sheet is open and nobody is watching. | P2 | S |
| No sound cues (turn change, timer low, lock-in). Useful on stream. | P3 | S |
| Keyboard: only Ctrl+Z. Number keys to pick a card, A/D for sides, Space to confirm would help on stream. | P3 | S |

### Match plan (result)
| Gap | Priority | Effort |
| --- | --- | --- |
| No **history** of finished plans (#6). | P1 | S |
| Can't **edit** a finished plan (fix a side, rename a team) without undoing back through the veto. | P2 | S |
| Share links are long (whole plan in the URL hash). No short links. | P3 | M (needs storage) |
| Export is one 1600×N landscape image. No vertical/story format for mobile sharing, no transparent overlay PNG, no PDF. | P2 | S–M |
| No match metadata: date/time, event, best-of context such as "Upper final". Only the free-text title. | P3 | S |
| Notes are free text only. Per-side notes (attack/defense) and an agent-comp picker per map would make the plan genuinely useful to coaches. | P2 | M |

### Maps `/maps`
| Gap | Priority | Effort |
| --- | --- | --- |
| No sorting (name, release date, sites). | P3 | S |
| The live rotation (wiki) currently lists 8 maps for a 7-map pool. Show a "the wiki lists 8, rotation is usually 7" hint when the count is off. | P2 | S |
| New maps (e.g. Summit) appear with placeholder details until written by hand. | P2 | S (content) |

### Map detail `/maps/:id`
| Gap | Priority | Effort |
| --- | --- | --- |
| **Minimap with callouts** (#4). Data is free from valorant-api.com (`displayIcon`, `callouts`, `xMultiplier`…). | P1 | M |
| Rotation history: when the map entered/left the pool (the wiki has this). | P3 | S |
| Notes: per-side notes and agent comps (same as plan notes). | P2 | M |

### Guide `/guide`
| Gap | Priority | Effort |
| --- | --- | --- |
| Examples are static chips. Linking each format to a ready-made replay would teach faster. | P3 | S |
| FAQ says two-device vetoes aren't available; update once #2 ships. | — | — |

---

## Shared systems

| Area | Gap | Priority | Effort |
| --- | --- | --- | --- |
| Accessibility | Dialog semantics, focus trap and focus return (#8). No "skip to content" link. | P1 | S |
| Resilience | No React error boundary: one runtime error blanks the whole app. | P2 | S |
| Quality | No tests. The veto logic (`lib/veto.ts`), share payload and rotation parsers are pure functions and easy to cover with Vitest. | P2 | S |
| Quality | No CI. A GitHub Action running `tsc`, tests and a build on each push would catch regressions before Netlify does. | P2 | S |
| Data | Local storage has no schema version or migration path; a future setup shape change could break saved state. | P2 | S |
| Data | Map art and export images depend on third-party hosts (valorant-api.com, wsrv.nl). A build-time copy of the art would remove both runtime dependencies. | P3 | M |
| SEO | Single-page app with per-page titles but one shared description; no sitemap or robots.txt; map pages aren't pre-rendered. | P3 | M |
| Offline | No PWA/offline support. A veto on LAN or a weak connection depends on the network for fonts and art. | P3 | M |
| Infra | Netlify routing of `/api/rotation` over the SPA redirect is not yet verified on a real deploy. | P1 | S (verify) |

---

## Suggested order

1. **Quick wins (≈2 days):** save/restore the live veto and guard navigation (#1), dialog accessibility (#8), veto history (#6), static social image (#7), error boundary, rotation-count hint.
2. **Coach value (≈1 week):** minimap and callouts (#4), rule presets and saved orders (#5), per-side notes and agent comps, editable plans, vertical export.
3. **Broadcast & multiplayer (≈2–3 weeks):** stream overlay (#3), then two-device captain rooms with spectators (#2), which also unlocks a live overlay that follows the room.
4. **Foundations alongside:** Vitest for the veto/share/rotation logic, CI, storage versioning.

---

## Status

**Wave 1 shipped:** live veto saved after every step and restored on return, with a "Resume veto" header button and a leave dialog (#1); accessible dialogs portalled to `<body>` with focus trap, inert background and focus return, plus a skip link (#8); recent vetoes in the lobby (#6); 1200×630 social image with absolute `og:image` from Netlify's `URL` (#7); per-page error boundary; rotation-count hint. Also fixed while testing: corrupt saved setup no longer crashes the lobby (field-by-field validation in `loadSetup`).
