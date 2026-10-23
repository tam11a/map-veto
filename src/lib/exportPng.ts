import { MARK } from '../brand/Logo';
import { FORMATS, GOLD, TEAMC } from '../data/maps';
import type { Setup, VetoState } from '../types';
import { imgFor, loadImg } from './images';
import { games, getMap, sideFor } from './veto';

type Ctx = CanvasRenderingContext2D;

const spacing = (x: Ctx, v: string) => { (x as unknown as { letterSpacing?: string }).letterSpacing = v; };

/** Draws the Map Veto mark (same paths as the SVG logo) into a size×size box. */
function drawMark(x: Ctx, X: number, Y: number, size: number) {
  x.save();
  x.translate(X, Y);
  x.scale(size / 64, size / 64);
  const bg = x.createLinearGradient(0, 0, 64, 64);
  bg.addColorStop(0, '#18202f');
  bg.addColorStop(1, '#0a0d14');
  const badge = new Path2D(MARK.badge);
  x.fillStyle = bg;
  x.fill(badge);
  x.strokeStyle = 'rgba(255,255,255,.12)';
  x.lineWidth = 1.5;
  x.stroke(badge);
  x.fillStyle = TEAMC[0];
  x.fill(new Path2D(MARK.pick));
  x.fillStyle = TEAMC[1];
  x.fill(new Path2D(MARK.ban));
  x.fillStyle = GOLD;
  x.fill(new Path2D(MARK.decider));
  x.restore();
}

function rr(x: Ctx, X: number, Y: number, w: number, h: number, r: number) {
  x.beginPath();
  if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h);
}

/** Shrinks the font until `text` fits, then truncates with an ellipsis as a last resort. */
function fit(x: Ctx, text: string, maxW: number, size: number, weight = 700, fam = 'Big Shoulders Display', min = 14) {
  let s = size;
  x.font = `${weight} ${s}px "${fam}"`;
  while (x.measureText(text).width > maxW && s > min) { s -= 2; x.font = `${weight} ${s}px "${fam}"`; }
  if (x.measureText(text).width > maxW) {
    while (text.length > 1 && x.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    text += '…';
  }
  return text;
}

function wrap(x: Ctx, text: string, maxW: number, maxLines: number) {
  const words = text.replace(/\n/g, ' ').split(/\s+/), lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

/** Renders the match plan as a 1600px-wide shareable image. */
export async function buildPNG(s: Setup, v: VetoState): Promise<HTMLCanvasElement> {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const g = games(v.hist), t = v.teams, n = Math.max(1, g.length), name = (id: string) => getMap(s, id).name;
  const W = 1600, P = 64, gap = 22, cw = (W - 2 * P - gap * (n - 1)) / n, ch = n >= 4 ? 520 : 560, top = 220;
  const imgs = await Promise.all(g.map(gm => loadImg(imgFor(getMap(s, gm.map), n >= 4 ? 'tall' : 'splash'))));

  const c = document.createElement('canvas'), x = c.getContext('2d')!;

  // lay out the veto log chips first so we know the canvas height
  const chips = v.hist.map(h => {
    const who = h.team != null ? t[h.team] : '';
    const tag = h.k === 'decider' ? 'DECIDER' : h.k.toUpperCase();
    const txt = h.k === 'side' ? `${who} starts ${h.side === 'atk' ? 'Attack' : 'Defense'} on ${name(h.map)}`
      : h.k === 'decider' ? `${name(h.map)} is the decider` : `${who} ${h.k === 'ban' ? 'banned' : 'picked'} ${name(h.map)}`;
    return { tag, txt, color: h.team != null ? TEAMC[h.team] : GOLD, ban: h.k === 'ban' };
  });
  let cx = P, cy = 0;
  const lay = chips.map(chip => {
    x.font = '700 14px "Big Shoulders Display"';
    const tw = x.measureText(chip.tag).width + 16;
    x.font = '600 19px Barlow';
    const w = tw + x.measureText(chip.txt).width + 30;
    if (cx + w > W - P) { cx = P; cy += 52; }
    const pos = { ...chip, x: cx, y: cy, w, tw };
    cx += w + 10;
    return pos;
  });
  const logY = top + ch + 92, H = logY + cy + 44 + 90;
  c.width = W;
  c.height = H;

  // background
  x.fillStyle = '#0f1218';
  x.fillRect(0, 0, W, H);
  ([[0, TEAMC[0]], [W, TEAMC[1]]] as const).forEach(([gx, col]) => {
    const rg = x.createRadialGradient(gx, 0, 0, gx, 0, 900);
    rg.addColorStop(0, col + '30');
    rg.addColorStop(1, col + '00');
    x.fillStyle = rg;
    x.fillRect(0, 0, W, H);
  });
  x.strokeStyle = 'rgba(255,255,255,.03)';
  x.lineWidth = 1;
  for (let i = 0; i < W; i += 48) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let i = 0; i < H; i += 48) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }

  // header
  spacing(x, '4px');
  x.fillStyle = '#8b95a9';
  x.font = '600 18px "Big Shoulders Display"';
  x.textAlign = 'left';
  x.fillText(`${FORMATS[s.format].name.toUpperCase()} MATCH PLAN`, P, 76);
  spacing(x, '0px');
  x.fillStyle = '#e9edf5';
  x.fillText(fit(x, s.title || `${t[0]} vs ${t[1]}`, W - 2 * P - 320, 56), P, 140);
  x.font = '700 26px "Big Shoulders Display"';
  let tx = P;
  ([[t[0], TEAMC[0]], ['  VS  ', '#7d879a'], [t[1], TEAMC[1]]] as const).forEach(([str, col]) => {
    x.fillStyle = col;
    x.fillText(str, tx, 184);
    tx += x.measureText(str).width;
  });
  // brand lockup, top right
  x.textAlign = 'right';
  spacing(x, '3px');
  x.font = '700 24px "Big Shoulders Display"';
  x.fillStyle = '#ff4655';
  x.fillText('VETO', W - P, 72);
  const vetoW = x.measureText('VETO').width;
  x.fillStyle = '#e9edf5';
  x.fillText('MAP ', W - P - vetoW, 72);
  const wordW = vetoW + x.measureText('MAP ').width;
  spacing(x, '2.5px');
  x.font = '600 11px Barlow';
  x.fillStyle = '#8b95a9';
  x.fillText('VALORANT MAP PICKER', W - P, 92);
  spacing(x, '0px');
  drawMark(x, W - P - wordW - 64, 38, 54);
  x.font = '500 15px Barlow';
  x.fillStyle = '#7d879a';
  x.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), W - P, 124);
  x.textAlign = 'left';

  // game cards
  g.forEach((gm, i) => {
    const X = P + i * (cw + gap), Y = top, m = getMap(s, gm.map), col = gm.by != null ? TEAMC[gm.by] : GOLD, img = imgs[i];
    x.save();
    rr(x, X, Y, cw, ch, 20);
    x.clip();
    const lg = x.createLinearGradient(X, Y, X + cw, Y + ch);
    lg.addColorStop(0, m.c[0]);
    lg.addColorStop(1, m.c[1]);
    x.fillStyle = lg;
    x.fillRect(X, Y, cw, ch);
    if (img) {
      const sc = Math.max(cw / img.width, ch / img.height), iw = img.width * sc, ih = img.height * sc;
      x.drawImage(img, X + (cw - iw) / 2, Y + (ch - ih) / 2, iw, ih);
    } else {
      x.font = '700 120px "Big Shoulders Display"';
      x.fillStyle = 'rgba(255,255,255,.06)';
      x.fillText(m.name, X + 10, Y + ch * 0.55);
    }
    const sh = x.createLinearGradient(0, Y, 0, Y + ch);
    sh.addColorStop(0, 'rgba(6,8,12,.15)');
    sh.addColorStop(0.4, 'rgba(6,8,12,.35)');
    sh.addColorStop(0.7, 'rgba(6,8,12,.92)');
    sh.addColorStop(1, 'rgba(6,8,12,.98)');
    x.fillStyle = sh;
    x.fillRect(X, Y, cw, ch);
    x.restore();
    x.strokeStyle = col;
    x.lineWidth = 3;
    rr(x, X + 1.5, Y + 1.5, cw - 3, ch - 3, 19);
    x.stroke();

    const badge = `MAP ${i + 1}${gm.decider ? ' DECIDER' : ''}`;
    x.font = '700 15px "Big Shoulders Display"';
    const bw = x.measureText(badge).width + 22;
    x.fillStyle = col;
    rr(x, X + 18, Y + 18, bw, 32, 8);
    x.fill();
    x.fillStyle = '#06100e';
    x.fillText(badge, X + 29, Y + 40);

    // text block, stacked upwards from the bottom
    const ix = X + 22, iw2 = cw - 44;
    let by = Y + ch - 24;
    const note = s.notes[gm.map];
    if (note) {
      x.font = '500 16px Barlow';
      const lines = wrap(x, note, iw2 - 14, n >= 4 ? 3 : 2), nh = lines.length * 22 + 14;
      x.fillStyle = 'rgba(255,255,255,.06)';
      rr(x, ix, by - nh, iw2, nh, 8);
      x.fill();
      x.fillStyle = col;
      x.fillRect(ix, by - nh, 3, nh);
      x.fillStyle = '#c9cfdb';
      lines.forEach((l, j) => x.fillText(l, ix + 14, by - nh + 26 + j * 22));
      by -= nh + 14;
    }
    for (const team of [1, 0] as const) {
      const sd = sideFor(gm, team);
      x.fillStyle = 'rgba(255,255,255,.07)';
      rr(x, ix, by - 40, iw2, 40, 9);
      x.fill();
      x.fillStyle = TEAMC[team];
      x.fillRect(ix + 12, by - 24, 9, 9);
      const lbl = sd ? (sd === 'atk' ? 'ATK' : 'DEF') : 'TBD';
      x.font = '700 15px "Big Shoulders Display"';
      const lw = x.measureText(lbl).width + 16;
      x.fillStyle = '#e9edf5';
      x.fillText(fit(x, t[team], iw2 - lw - 52, 17, 600, 'Barlow', 12), ix + 30, by - 14);
      x.font = '700 15px "Big Shoulders Display"';
      x.fillStyle = sd === 'atk' ? 'rgba(255,154,98,.2)' : sd === 'def' ? 'rgba(127,178,255,.22)' : 'rgba(255,255,255,.06)';
      rr(x, ix + iw2 - lw - 8, by - 32, lw, 24, 5);
      x.fill();
      x.fillStyle = sd === 'atk' ? '#ff9a62' : sd === 'def' ? '#7fb2ff' : '#7d879a';
      x.fillText(lbl, ix + iw2 - lw, by - 14);
      by -= 48;
    }
    by -= 4;
    x.font = '500 17px Barlow';
    x.fillStyle = '#8b95a9';
    const pb = gm.by == null ? 'Decider, the last map standing' : 'Picked by ';
    x.fillText(pb, ix, by);
    if (gm.by != null) {
      const pw = x.measureText(pb).width;
      x.fillStyle = col;
      x.fillText(fit(x, t[gm.by], iw2 - pw, 17, 700, 'Barlow', 12), ix + pw, by);
    }
    by -= 34;
    x.fillStyle = '#ffffff';
    x.fillText(fit(x, m.name.toUpperCase(), iw2, n >= 4 ? 40 : 52), ix, by);
    by -= n >= 4 ? 44 : 56;
    spacing(x, '2px');
    x.fillStyle = 'rgba(255,255,255,.6)';
    x.fillText(fit(x, `${m.loc}   SITES ${m.sites}`.toUpperCase(), iw2, 13, 600, 'Barlow', 10), ix, by);
    spacing(x, '0px');
  });

  // veto log
  spacing(x, '4px');
  x.font = '600 16px "Big Shoulders Display"';
  x.fillStyle = '#8b95a9';
  x.fillText('VETO LOG', P, logY - 22);
  spacing(x, '0px');
  for (const l of lay) {
    const Y = logY + l.y;
    x.fillStyle = '#121825';
    rr(x, l.x, Y, l.w, 42, 9);
    x.fill();
    x.strokeStyle = '#232c3d';
    x.lineWidth = 1;
    rr(x, l.x + 0.5, Y + 0.5, l.w - 1, 41, 9);
    x.stroke();
    x.fillStyle = l.color;
    rr(x, l.x + 8, Y + 9, l.tw, 24, 5);
    x.fill();
    x.fillStyle = '#06100e';
    x.font = '700 14px "Big Shoulders Display"';
    x.fillText(l.tag, l.x + 16, Y + 26);
    x.fillStyle = l.ban ? '#8b95a9' : '#e9edf5';
    x.font = '600 19px Barlow';
    x.fillText(l.txt, l.x + l.tw + 18, Y + 28);
  }

  // footer
  x.strokeStyle = '#232c3d';
  x.beginPath();
  x.moveTo(P, H - 60);
  x.lineTo(W - P, H - 60);
  x.stroke();
  x.font = '500 15px Barlow';
  x.fillStyle = '#7d879a';
  x.fillText(`${t[0]} vs ${t[1]}, ${FORMATS[s.format].name.toLowerCase()}${s.sidePick ? ', side selection on' : ''}`, P, H - 28);
  x.textAlign = 'right';
  x.fillText('Planned with Map Veto: Valorant Map Picker', W - P, H - 28);
  x.textAlign = 'left';
  return c;
}

export const canvasBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
