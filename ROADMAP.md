# Roadmap

What's planned next. Each item has an issue: comment there before you start, so two people don't build the same thing. Items marked **good first issue** are small and well contained.

## Good first issues

- **Opt in to React Router v7 future flags** ([#8](https://github.com/tam11a/map-veto/issues/8)). Turns off the warnings in the dev console; small and easy to verify.

## Next

- **Rotation history on map pages** ([#1](https://github.com/tam11a/map-veto/issues/1)). When each map entered and left the competitive pool. The Valorant Wiki has the data; the rotation parsers in `scripts/rotation-core.mjs` are the place to start.
- **A screen-reader pass** ([#2](https://github.com/tam11a/map-veto/issues/2)). Run the lobby, live veto and plan with NVDA or VoiceOver and fix what's unclear: turn announcements, map card labels and the timeline.
- **Live room updates without polling** ([#3](https://github.com/tam11a/map-veto/issues/3)). Rooms poll about once a second. Server-sent events or a websocket would make moves appear instantly and cut requests.

## Later

- **A social image for each plan** ([#4](https://github.com/tam11a/map-veto/issues/4)). Share links show the site's image; a generated card with the teams and maps would preview better in Discord.
- **Pre-rendered map pages** ([#5](https://github.com/tam11a/map-veto/issues/5)). So search engines and link previews see each map's content without running the app.
- **Map art copied at build time** ([#6](https://github.com/tam11a/map-veto/issues/6)). Art comes from valorant-api.com at runtime and exports go through an image proxy. Bundling the art would remove both dependencies.

## Done

The [changelog](CHANGELOG.md) lists what has shipped.
