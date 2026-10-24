// Renders the 1200x630 social preview (public/og.jpg) with the real map art and fonts.
// Dev-only: open http://localhost:5173/og.html and press "Save to public/og.jpg".
import { DECIDER, MAPS, TEAMC } from '../data/maps';
import { drawMark } from '../lib/exportPng';
import { loadImg } from '../lib/images';

const W = 1200, H = 630;
const WALL = [
  { id: 'abyss', k: 'ban', team: 1 },
  { id: 'bind', k: 'ban', team: 0 },
  { id: 'corrode', k: 'ban', team: 0 },
  { id: 'haven', k: 'pick', team: 0 },
  { id: 'lotus', k: 'ban', team: 1 },
  { id: 'summit', k: 'pick', team: 1 },
  { id: 'sunset', k: 'decider', team: null },
] as const;

async function artUrls(): Promise<Record<string, string>> {
  const j = await fetch('https://valorant-api.com/v1/maps').then(r => r.json());
  const out: Record<string, string> = {};
  for (const m of j.data ?? []) out[String(m.displayName).toLowerCase()] = m.listViewIconTall;
  return out;
}

export async function renderOg(): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('800 96px Poppins'),
    document.fonts.load('600 26px Poppins'),
    document.fonts.load('500 22px Poppins'),
  ]);
  const urls = await artUrls();
  const imgs = await Promise.all(WALL.map(w => loadImg(urls[w.id] ?? null, 400)));

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;

  // base + the ember (left) and velvet (right) glows
  x.fillStyle = '#0d0a12';
  x.fillRect(0, 0, W, H);
  ([[0, 220, '#7a160f', 620], [W, 520, '#2c1257', 620]] as const).forEach(([gx, gy, col, r]) => {
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, col + 'ee');
    g.addColorStop(1, col + '00');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  });

  // the veto wall on the right
  const wallX = 600, sliceW = (W - wallX) / WALL.length;
  WALL.forEach((w, i) => {
    const X = wallX + i * sliceW, img = imgs[i];
    x.save();
    x.beginPath(); x.rect(X, 0, sliceW - 2, H); x.clip();
    if (img) {
      const sc = Math.max(sliceW / img.width, H / img.height), iw = img.width * sc, ih = img.height * sc;
      x.filter = w.k === 'ban' ? 'grayscale(1) brightness(0.3)' : 'brightness(0.95) saturate(1.1)';
      x.drawImage(img, X + (sliceW - iw) / 2, (H - ih) / 2, iw, ih);
      x.filter = 'none';
    } else {
      x.fillStyle = '#231a2c'; x.fillRect(X, 0, sliceW, H);
    }
    const col = w.team != null ? TEAMC[w.team] : DECIDER;
    if (w.k === 'ban') {
      // slash in the banning team's colour
      x.strokeStyle = col; x.lineWidth = 4; x.shadowColor = col; x.shadowBlur = 18;
      x.beginPath(); x.moveTo(X - 40, H * 0.85); x.lineTo(X + sliceW + 40, H * 0.15); x.stroke();
      x.shadowBlur = 0;
    } else {
      x.fillStyle = col; x.fillRect(X, 0, sliceW, 7);
    }
    // vertical map name
    const name = MAPS.find(m => m.id === w.id)?.name.toUpperCase() ?? w.id;
    x.translate(X + sliceW / 2 + 12, 40);
    x.rotate(Math.PI / 2);
    x.font = '800 28px Poppins';
    x.fillStyle = w.k === 'ban' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.95)';
    x.fillText(name, 0, 0);
    x.restore();
  });

  // scrim so the copy reads over the wall's left edge
  const s = x.createLinearGradient(wallX - 80, 0, wallX + 260, 0);
  s.addColorStop(0, 'rgba(13,10,18,1)');
  s.addColorStop(1, 'rgba(13,10,18,0)');
  x.fillStyle = s;
  x.fillRect(wallX - 80, 0, 340, H);
  x.fillStyle = '#0d0a12';
  x.fillRect(0, 0, wallX - 80, H);
  // re-apply the ember glow on the solid copy side
  const g = x.createRadialGradient(0, 220, 0, 0, 220, 620);
  g.addColorStop(0, '#7a160fee'); g.addColorStop(1, '#7a160f00');
  x.fillStyle = g; x.fillRect(0, 0, wallX + 200, H);

  // brand lockup
  drawMark(x, 64, 58, 56);
  x.font = '800 36px Poppins';
  x.fillStyle = '#f3eff6';
  x.fillText('MAP', 134, 96);
  const mapW = x.measureText('MAP ').width;
  x.fillStyle = TEAMC[1];
  x.fillText('VETO', 134 + mapW, 96);

  // headline
  x.font = '800 76px Poppins';
  x.fillStyle = '#ffffff';
  (x as unknown as { letterSpacing: string }).letterSpacing = '-2px';
  ['Run the veto', 'like it’s the', 'grand final.'].forEach((line, i) => x.fillText(line, 64, 250 + i * 80));
  (x as unknown as { letterSpacing: string }).letterSpacing = '0px';

  x.font = '500 24px Poppins';
  x.fillStyle = '#cfc6d7';
  x.fillText('Bo1 to Bo5 map vetoes for Valorant.', 64, 506);
  x.fillText('Bans, picks, sides and a shareable plan.', 64, 542);

  x.font = '600 20px Poppins';
  x.fillStyle = '#8d8399';
  x.fillText('VALORANT MAP PICKER', 64, 590);
  return c;
}
