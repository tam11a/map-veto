# Changelog

Notable changes to Map Veto. The live site always runs the latest `main`.

## 1.0.0 (2026-10-24)

The first public release.

### Veto
- Bo1, Bo2, Bo3 and Bo5 with built-in orders for a seven-map pool, and a Bo1 variant that settles sides with a knife round.
- Every step of the order can be changed, and orders can be saved as rule sets in the browser.
- Side rules: the opponent or the picker chooses after a pick; the decider's side goes to the team that didn't ban last, a fixed team, or a knife round.
- A 3D coin toss with sound to decide who goes first.
- Turn timer with pause, undo, sound cues and keyboard shortcuts. Progress is saved after every step.

### Online rooms and streaming
- Online rooms with one link per captain, a watch-only link and turns checked on the server.
- A transparent 1920×1080 overlay for OBS, with options for position, a one-row layout, and hiding the maps or title.

### Match plan
- Maps in order with picks and starting sides, general, attack and defense notes, and a five-agent comp per map.
- Edit sides, team names and match details after the veto.
- Export as a landscape image, a 1080×1920 story image, text, a short link or JSON. Recent vetoes stay in the browser.

### Maps
- The competitive rotation from the HenrikDev API or the Valorant Wiki, with a built-in fallback.
- Map pages with how each map plays, team notes and a labelled minimap.

### Everywhere
- Works on phones and by keyboard, and offline once loaded.
- Built with React 19, Tailwind CSS v4 and shadcn/ui, deployed on Netlify.
