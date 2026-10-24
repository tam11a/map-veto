# Roadmap

What's planned next. Each item has an issue: comment there before you start, so two people don't build the same thing. Items marked **good first issue** are small and well contained.

## Next

- **Rotation history on map pages.** When each map entered and left the competitive pool. The Valorant Wiki has the data; the rotation parsers in `scripts/rotation-core.mjs` are the place to start.
- **A screen-reader pass.** Run the lobby, live veto and plan with NVDA or VoiceOver and fix what's unclear: turn announcements, map card labels and the timeline.
- **Live room updates without polling.** Rooms poll about once a second. Server-sent events or a websocket would make moves appear instantly and cut requests.

## Later

- **A social image for each plan.** Share links show the site's image; a generated card with the teams and maps would preview better in Discord.
- **Pre-rendered map pages.** So search engines and link previews see each map's content without running the app.
- **Map art copied at build time.** Art comes from valorant-api.com at runtime and exports go through an image proxy. Bundling the art would remove both dependencies.

## Done

The [changelog](CHANGELOG.md) lists what has shipped.
