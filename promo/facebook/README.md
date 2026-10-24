# Facebook post images

Seven slides for the launch post, in English and Bangla, at 2160×2700 (Facebook's 4:5 portrait, at double resolution). This branch stays local.

| # | Slide | Shows |
| --- | --- | --- |
| 1 | `01-cover` | The hero map wall and the headline |
| 2 | `02-veto` | The live board: bans, picks, sides and the decider |
| 3 | `03-coin` | The 3D coin toss |
| 4 | `04-rooms` | Online rooms, one phone per captain |
| 5 | `05-plan` | The plan image and story export |
| 6 | `06-stream` | The OBS overlay |
| 7 | `07-free` | Free, no sign-up, no ads, with the feature list |

The finished images are in `out/`, named `<number>-<slide>-<en|bn>.jpg`. For a multi-photo post, upload them in number order so the cover shows first.

## Rebuilding

The slides are one HTML template (`poster.html`, picked with `?id=<slide>&lang=<en|bn>`) filled with real screenshots of the app.

```bash
npm i --no-save playwright-core
npm run dev                        # in another terminal
node promo/facebook/shoot.mjs      # screenshots into shots/
node promo/facebook/render.mjs     # slides into out/
```

Both scripts use the local Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`; set `CHROME_PATH` to use another. Pass slide or shot names to redo only some, for example `node promo/facebook/render.mjs cover,coin`.
