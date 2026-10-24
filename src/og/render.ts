// Renders the 1200x630 social preview (public/og.jpg) with the real map art and fonts.
// Dev-only: open http://localhost:5173/og.html and press "Save to public/og.jpg".
import { GOLD, MAPS, TEAMC } from '../data/maps';
import { drawMark } from '../lib/exportPng';
import { loadImg } from '../lib/images';

const W = 1200, H = 630;
const WALL = [
  { id: 'abyss', k: 'ban', team: 1 },
  { id: 'ascent', k: 'pick', team: 0 },
  { id: 'bind', k: 'ban', team: 0 },
  { id: 'haven', k: 'pick', team: 1 },
  { id: 'lotus', k: 'ban', team: 1 },
  { id: 'split', k: 'ban', team: 0 },
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
    document.fonts.load('800 96px "Big Shoulders Display"'),
    document.fonts.load('600 26px "Barlow"'),
    document.fonts.load('500 22px "Barlow"'),
  ]);
  const urls = await artUrls();
  const imgs = await Promise.all(WALL.map(w => loadImg(urls[w.id] ?? null, 400)));

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;

  // base + ambient team light
  x.fillStyle = '#0f1218';
  x.fillRect(0, 0, W, H);
  ([[0, 260, TEAMC[0]], [W, 420, TEAMC[1]], [600, H + 80, GOLD]] as const).forEach(([gx, gy, col], i) => {
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, i === 2 ? 420 : 560);
    g.addColorStop(0, col + (i === 2 ? '22' : '38'));
    g.addColorStop(1, col + '00');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  });

  // the veto wall on the right
  const wallX = 520, sliceW = (W - wallX) / WALL.length;
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
      x.fillStyle = '#1d2430'; x.fillRect(X, 0, sliceW, H);
    }
    const col = w.team != null ? TEAMC[w.team] : GOLD;
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
    x.font = '800 34px "Big Shoulders Display"';
    x.fillStyle = w.k === 'ban' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.95)';
    x.fillText(name, 0, 0);
    x.restore();
  });

  // scrim so the copy reads over the wall's left edge
  const s = x.createLinearGradient(wallX - 80, 0, wallX + 260, 0);
  s.addColorStop(0, 'rgba(15,18,24,1)');
  s.addColorStop(1, 'rgba(15,18,24,0)');
  x.fillStyle = s;
  x.fillRect(wallX - 80, 0, 340, H);
  x.fillStyle = '#0f1218';
  x.fillRect(0, 0, wallX - 80, H);
  // re-apply the ambient light on the solid copy side
  const g = x.createRadialGradient(0, 260, 0, 0, 260, 560);
  g.addColorStop(0, TEAMC[0] + '30'); g.addColorStop(1, TEAMC[0] + '00');
  x.fillStyle = g; x.fillRect(0, 0, wallX + 200, H);

  // brand lockup
  drawMark(x, 64, 58, 56);
  x.font = '800 40px "Big Shoulders Display"';
  x.fillStyle = '#e6e9ef';
  x.fillText('MAP', 134, 96);
  const mapW = x.measureText('MAP ').width;
  x.fillStyle = TEAMC[1];
  x.fillText('VETO', 134 + mapW, 96);

  // headline
  x.font = '800 92px "Big Shoulders Display"';
  x.fillStyle = '#ffffff';
  ['Run the veto', 'like it’s the', 'grand final.'].forEach((line, i) => x.fillText(line, 64, 252 + i * 86));

  x.font = '500 26px "Barlow"';
  x.fillStyle = '#c3cad6';
  x.fillText('Bo1 to Bo5 map vetoes for Valorant.', 64, 506);
  x.fillText('Bans, picks, sides and a shareable plan.', 64, 542);

  x.font = '600 20px "Barlow"';
  x.fillStyle = '#7d879a';
  x.fillText('VALORANT MAP PICKER', 64, 590);
  return c;
}
