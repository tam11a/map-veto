// Renders every poster in poster.html to out/<id>-<lang>.jpg at 2160×2700 (2× the 1080×1350 layout).
// usage: node promo/facebook/render.mjs [only,ids] (run shoot.mjs first)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const IDS = ['cover', 'veto', 'coin', 'rooms', 'plan', 'stream', 'free'];
const LANGS = ['en', 'bn'];
const ONLY = process.argv[2]?.split(',');
const here = new URL('./', import.meta.url);
const OUT = fileURLToPath(new URL('out/', here));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
const page = pathToFileURL(fileURLToPath(new URL('poster.html', here))).href;

for (const [n, id] of IDS.entries()) {
  if (ONLY && !ONLY.includes(id)) continue;
  for (const lang of LANGS) {
    await p.goto(`${page}?id=${id}&lang=${lang}`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(300);
    const file = `${OUT}${String(n + 1).padStart(2, '0')}-${id}-${lang}.jpg`;
    await p.screenshot({ path: file, type: 'jpeg', quality: 90 });
    console.log('rendered', file.split(/[\\/]/).pop());
  }
}
await browser.close();
