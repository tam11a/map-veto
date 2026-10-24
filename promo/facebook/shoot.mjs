// Captures high-resolution screenshots of the running app for the promo posters.
// usage: npm run dev, then: node promo/facebook/shoot.mjs [only,names]
// needs playwright-core (npm i --no-save playwright-core) and a local Chrome (CHROME_PATH to override)
import { chromium } from 'playwright-core';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
const ONLY = process.argv[2]?.split(',');
const want = n => !ONLY || ONLY.includes(n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const SETUP = { teams: ['Team Alpha', 'Team Omega'], event: 'Dhaka Valorant Cup', title: 'Upper final' };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

async function page({ width = 1440, height = 900, dpr = 2, setup = {}, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(seed => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('mapveto.setup', JSON.stringify(seed));
  }, { ...SETUP, ...setup });
  return ctx.newPage();
}
// let images and fonts arrive, then jump animations to their end so nothing is caught mid-fade
async function settle(p, ms = 1200) {
  await p.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await sleep(ms);
  await p.evaluate(() => document.getAnimations().forEach(a => { try { if (a.effect?.getTiming().iterations !== Infinity) a.finish(); } catch { /* ignore */ } }));
  await sleep(200);
}
const shot = (p, name, opts = {}) => p.screenshot({ path: `${OUT}${name}.png`, ...opts }).then(() => console.log('saved', name));
const key = async (p, k, wait = 700) => { await p.keyboard.press(k); await sleep(wait); };

if (want('landing')) {
  const p = await page();
  await p.goto(BASE + '/');
  await sleep(11000); // the demo veto plays out on the wall
  await shot(p, 'landing');
  await p.close();
}

// the hero's map wall alone, in the poster's portrait shape: header, headline and demo panel hidden
if (want('wall')) {
  const p = await page({ width: 1080, height: 1350 });
  await p.goto(BASE + '/');
  await sleep(11000);
  await p.evaluate(() => {
    document.querySelector('body > div header, header')?.style.setProperty('visibility', 'hidden');
    document.querySelector('main h1')?.parentElement?.style.setProperty('visibility', 'hidden');
    document.querySelector('[aria-label="Example veto status"]')?.style.setProperty('visibility', 'hidden');
  });
  await sleep(300);
  await shot(p, 'wall', { clip: { x: 0, y: 0, width: 1080, height: 960 } });
  await p.close();
}

if (want('board') || want('side') || want('plan')) {
  const p = await page();
  await p.goto(BASE + '/veto');
  await settle(p);
  await p.getByRole('button', { name: 'Start the veto', exact: true }).click();
  await settle(p, 900);
  await key(p, '1'); await key(p, '1'); await key(p, '2', 900);
  await settle(p, 600);
  if (want('side')) await shot(p, 'side');
  await key(p, 'd', 900); await key(p, '2', 900); await key(p, 'a', 900);
  await settle(p, 500);
  if (want('board')) await shot(p, 'board');
  if (want('plan')) {
    await key(p, '1'); await key(p, '1', 2600); await key(p, 'd', 3000);
    await settle(p, 2500);
    await shot(p, 'plan', { fullPage: true });
  }
  await p.close();
}

if (want('coin')) {
  const p = await page({ width: 900, height: 900, setup: { first: 'coin' } });
  await p.goto(BASE + '/veto');
  await settle(p);
  await p.getByRole('button', { name: 'Start the veto', exact: true }).click();
  const t0 = Date.now();
  // just the coin: hide the dialog's title, result line and legend
  await p.addStyleTag({ content: '[data-slot=dialog-content] h2, [data-slot=dialog-content] [aria-live], [data-slot=dialog-content] [aria-live] + div { visibility: hidden !important }' });
  const at = async ms => sleep(Math.max(0, ms - (Date.now() - t0)));
  await at(1300); await shot(p, 'coin-flight');
  await at(3100); await shot(p, 'coin-landed');
  await p.close();
}

if (want('mobile')) {
  const p = await page({ width: 390, height: 844, dpr: 3, mobile: true });
  await p.goto(BASE + '/veto');
  await settle(p);
  await shot(p, 'mobile-lobby');
  await p.getByRole('button', { name: 'Start the veto', exact: true }).click();
  await settle(p, 900);
  for (const n of [0, 1]) { await p.locator('button[aria-keyshortcuts]').nth(n === 0 ? 0 : 0).click(); await sleep(700); }
  await settle(p, 500);
  await shot(p, 'mobile-board');
  await p.close();
}

if (want('rooms')) {
  const host = await page();
  await host.goto(BASE + '/veto');
  await settle(host, 800);
  const { id, tokens } = await host.evaluate(async () => {
    const { createRoom } = await import('/src/lib/rooms.ts');
    const { loadSetup } = await import('/src/lib/share.ts');
    const s = { ...loadSetup(), pool: ['abyss', 'bind', 'corrode', 'haven', 'lotus', 'summit', 'sunset'], timer: 45 };
    return createRoom(s, ['Team Alpha', 'Team Omega']);
  });
  const move = (token, m) => host.evaluate(async ({ id, token, m }) => {
    const r = (await (await fetch(`/api/rooms/${id}`)).json()).room;
    await fetch(`/api/rooms/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, rev: r.rev, move: m }) });
  }, { id, token, m });
  await move(tokens.a, { type: 'act', map: 'abyss' });
  await move(tokens.b, { type: 'act', map: 'bind' });
  await move(tokens.a, { type: 'act', map: 'haven' });
  await move(tokens.b, { type: 'side', side: 'def' });
  for (const [team, token] of [['a', tokens.a], ['b', tokens.b]]) {
    const p = await page({ width: 390, height: 844, dpr: 3, mobile: true });
    await p.goto(`${BASE}/room/${id}?t=${token}`);
    await settle(p, 2500);
    await shot(p, `room-captain-${team}`);
    await p.close();
  }
  await host.close();
}

// images the app itself exports, already rendered for the README
if (want('exports')) {
  const media = fileURLToPath(new URL('../../docs/media/', import.meta.url));
  for (const f of ['export-landscape.jpg', 'export-story.jpg', 'overlay-compact.jpg', 'minimap.jpg']) copyFileSync(media + f, OUT + f);
  console.log('copied exports');
}

await browser.close();
