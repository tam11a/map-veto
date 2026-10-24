import { MARK } from '../brand/Logo';
import { FORMATS, DECIDER, TEAMC } from '../data/maps';
import type { Setup, VetoState } from '../types';
import { agentIcon, getAgents } from './agents';
import { imgFor, loadImg } from './images';
import { games, getMap, sideFor } from './veto';

type Ctx = CanvasRenderingContext2D;

const spacing = (x: Ctx, v: string) => { (x as unknown as { letterSpacing?: string }).letterSpacing = v; };

/** Draws the Map Veto mark (same paths as the SVG logo) into a size×size box. */
export function drawMark(x: Ctx, X: number, Y: number, size: number) {
  x.save();
  x.translate(X, Y);
  x.scale(size / 64, size / 64);
  const bg = x.createLinearGradient(0, 0, 64, 64);
  bg.addColorStop(0, '#2a1622');
  bg.addColorStop(1, '#0d0a12');
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
  x.fillStyle = DECIDER;
  x.fill(new Path2D(MARK.decider));
  x.restore();
}

function rr(x: Ctx, X: number, Y: number, w: number, h: number, r: number) {
  x.beginPath();
  if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h);
}

/** Shrinks the font until `text` fits, then truncates with an ellipsis as a last resort. */
function fit(x: Ctx, text: string, maxW: number, size: number, weight = 700, fam = 'Poppins', min = 14) {
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

/** "Spring Cup, 12 Nov 2026, 18:00", or '' when the plan has no details. */
export function matchLine(s: Setup) {
  const d = s.date ? new Date(s.date) : null;
  const when = d && !isNaN(+d)
    ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  return [s.event.trim(), when].filter(Boolean).join(', ');
}

/** Logo images for both teams, in the plan's team order. */
async function teamLogos(s: Setup, v: VetoState) {
  const url = (name: string, i: number) => s.logos[s.teams[0] === name ? 0 : s.teams[1] === name ? 1 : i];
  return Promise.all(v.teams.map((nm, i) => loadImg(url(nm, i) || null, 160)));
}

/** Agent portraits for each game's comp. */
async function compImgs(s: Setup, maps: string[]) {
  const list = getAgents();
  return Promise.all(maps.map(id => Promise.all((s.comps[id] ?? []).map(n => loadImg(agentIcon(list, n) || null, 96)))));
}

/** The general note plus attack and defense notes, as one paragraph. */
const noteText = (s: Setup, id: string) =>
  [s.notes[id], s.notesAtk[id] && `Attack: ${s.notesAtk[id]}`, s.notesDef[id] && `Defense: ${s.notesDef[id]}`].filter(Boolean).join('  ');

function drawLogo(x: Ctx, img: HTMLImageElement | null, X: number, Y: number, size: number, col: string) {
  x.fillStyle = 'rgba(255,255,255,.06)';
  rr(x, X, Y, size, size, size * 0.22);
  x.fill();
  x.strokeStyle = col;
  x.lineWidth = 2;
  rr(x, X + 1, Y + 1, size - 2, size - 2, size * 0.22);
  x.stroke();
  if (!img) return;
  const pad = size * 0.12, sc = Math.min((size - 2 * pad) / img.width, (size - 2 * pad) / img.height);
  x.drawImage(img, X + (size - img.width * sc) / 2, Y + (size - img.height * sc) / 2, img.width * sc, img.height * sc);
}

function drawFaces(x: Ctx, faces: (HTMLImageElement | null)[], X: number, Y: number, size: number) {
  faces.forEach((im, i) => {
    const fx = X + i * (size + 6);
    x.save();
    x.beginPath();
    x.arc(fx + size / 2, Y + size / 2, size / 2, 0, Math.PI * 2);
    x.fillStyle = '#221a2c';
    x.fill();
    x.clip();
    if (im) x.drawImage(im, fx, Y, size, size);
    x.restore();
  });
}

/** Renders the match plan as a 1600px-wide shareable image. */
export async function buildPNG(s: Setup, v: VetoState): Promise<HTMLCanvasElement> {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const g = games(v.hist), t = v.teams, n = Math.max(1, g.length), name = (id: string) => getMap(s, id).name;
  const W = 1600, P = 64, gap = 22, cw = (W - 2 * P - gap * (n - 1)) / n, ch = n >= 4 ? 560 : 600, top = 220;
  const [imgs, logos, faces] = await Promise.all([
    Promise.all(g.map(gm => loadImg(imgFor(getMap(s, gm.map), n >= 4 ? 'tall' : 'splash')))),
    teamLogos(s, v),
    compImgs(s, g.map(gm => gm.map)),
  ]);

  const c = document.createElement('canvas'), x = c.getContext('2d')!;

  // lay out the veto log chips first so we know the canvas height
  const chips = v.hist.map(h => {
    const who = h.team != null ? t[h.team] : '';
    const tag = h.k === 'decider' ? 'DECIDER' : h.k.toUpperCase();
    const txt = h.k === 'side' ? `${who} starts ${h.side === 'atk' ? 'Attack' : 'Defense'} on ${name(h.map)}`
      : h.k === 'decider' ? `${name(h.map)} is the decider` : `${who} ${h.k === 'ban' ? 'banned' : 'picked'} ${name(h.map)}`;
    return { tag, txt, color: h.team != null ? TEAMC[h.team] : DECIDER, ban: h.k === 'ban' };
  });
  let cx = P, cy = 0;
  const lay = chips.map(chip => {
    x.font = '700 14px Poppins';
    const tw = x.measureText(chip.tag).width + 16;
    x.font = '600 19px Poppins';
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
  x.fillStyle = '#0d0a12';
  x.fillRect(0, 0, W, H);
  ([[0, '#7a160f'], [W, '#2c1257']] as const).forEach(([gx, col]) => {
    const rg = x.createRadialGradient(gx, 0, 0, gx, 0, 900);
    rg.addColorStop(0, col + 'b0');
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
  x.fillStyle = '#b7adc2';
  x.font = '600 18px Poppins';
  x.textAlign = 'left';
  x.fillText(`${FORMATS[s.format].name.toUpperCase()} MATCH PLAN`, P, 76);
  spacing(x, '0px');
  x.fillStyle = '#f3eff6';
  x.fillText(fit(x, s.title || `${t[0]} vs ${t[1]}`, W - 2 * P - 320, 56), P, 140);
  x.font = '700 26px Poppins';
  let tx = P;
  const hasLogo = logos.some(Boolean);
  ([[t[0], TEAMC[0], 0], ['  VS  ', '#8d8399', -1], [t[1], TEAMC[1], 1]] as const).forEach(([str, col, li]) => {
    if (hasLogo && li >= 0) { drawLogo(x, logos[li], tx, 160, 32, col); tx += 42; }
    x.fillStyle = col;
    x.fillText(str, tx, 184);
    tx += x.measureText(str).width;
  });
  // brand lockup, top right
  x.textAlign = 'right';
  spacing(x, '3px');
  x.font = '700 24px Poppins';
  x.fillStyle = '#ff2a36';
  x.fillText('VETO', W - P, 72);
  const vetoW = x.measureText('VETO').width;
  x.fillStyle = '#f3eff6';
  x.fillText('MAP ', W - P - vetoW, 72);
  const wordW = vetoW + x.measureText('MAP ').width;
  spacing(x, '2.5px');
  x.font = '600 11px Poppins';
  x.fillStyle = '#b7adc2';
  x.fillText('VALORANT MAP PICKER', W - P, 92);
  const lockW = Math.max(wordW, x.measureText('VALORANT MAP PICKER').width);
  spacing(x, '0px');
  drawMark(x, W - P - lockW - 66, 38, 54);
  x.font = '500 15px Poppins';
  x.fillStyle = '#8d8399';
  x.fillText(fit(x, matchLine(s) || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), 420, 15, 500, 'Poppins', 12), W - P, 124);
  x.textAlign = 'left';

  // game cards
  g.forEach((gm, i) => {
    const X = P + i * (cw + gap), Y = top, m = getMap(s, gm.map), col = gm.by != null ? TEAMC[gm.by] : DECIDER, img = imgs[i];
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
      x.font = '700 120px Poppins';
      x.fillStyle = 'rgba(255,255,255,.06)';
      x.fillText(m.name, X + 10, Y + ch * 0.55);
    }
    const sh = x.createLinearGradient(0, Y, 0, Y + ch);
    sh.addColorStop(0, 'rgba(9,6,13,.15)');
    sh.addColorStop(0.4, 'rgba(9,6,13,.35)');
    sh.addColorStop(0.7, 'rgba(9,6,13,.92)');
    sh.addColorStop(1, 'rgba(9,6,13,.98)');
    x.fillStyle = sh;
    x.fillRect(X, Y, cw, ch);
    x.restore();
    x.strokeStyle = col;
    x.lineWidth = 3;
    rr(x, X + 1.5, Y + 1.5, cw - 3, ch - 3, 19);
    x.stroke();

    const badge = `MAP ${i + 1}${gm.decider ? ' DECIDER' : ''}`;
    x.font = '700 15px Poppins';
    const bw = x.measureText(badge).width + 22;
    x.fillStyle = col;
    rr(x, X + 18, Y + 18, bw, 32, 8);
    x.fill();
    x.fillStyle = '#0d0a12';
    x.fillText(badge, X + 29, Y + 40);

    // text block, stacked upwards from the bottom
    const ix = X + 22, iw2 = cw - 44;
    let by = Y + ch - 24;
    const note = noteText(s, gm.map);
    if (note) {
      x.font = '500 16px Poppins';
      const lines = wrap(x, note, iw2 - 14, n >= 4 ? 4 : 3), nh = lines.length * 22 + 14;
      x.fillStyle = 'rgba(255,255,255,.06)';
      rr(x, ix, by - nh, iw2, nh, 8);
      x.fill();
      x.fillStyle = col;
      x.fillRect(ix, by - nh, 3, nh);
      x.fillStyle = '#d6cfdd';
      lines.forEach((l, j) => x.fillText(l, ix + 14, by - nh + 26 + j * 22));
      by -= nh + 14;
    }
    if (faces[i].length) {
      const fs = Math.min(40, (iw2 - 24) / 5);
      drawFaces(x, faces[i], ix, by - fs, fs);
      by -= fs + 12;
    }
    for (const team of [1, 0] as const) {
      const sd = sideFor(gm, team);
      x.fillStyle = 'rgba(255,255,255,.07)';
      rr(x, ix, by - 40, iw2, 40, 9);
      x.fill();
      x.fillStyle = TEAMC[team];
      x.fillRect(ix + 12, by - 24, 9, 9);
      const lbl = sd ? (sd === 'atk' ? 'ATK' : 'DEF') : gm.decider && s.deciderRule === 'knife' ? 'KNIFE' : 'TBD';
      x.font = '700 15px Poppins';
      const lw = x.measureText(lbl).width + 16;
      x.fillStyle = '#f3eff6';
      x.fillText(fit(x, t[team], iw2 - lw - 52, 17, 600, 'Poppins', 12), ix + 30, by - 14);
      x.font = '700 15px Poppins';
      x.fillStyle = sd === 'atk' ? 'rgba(255,138,76,.2)' : sd === 'def' ? 'rgba(142,163,255,.22)' : 'rgba(255,255,255,.06)';
      rr(x, ix + iw2 - lw - 8, by - 32, lw, 24, 5);
      x.fill();
      x.fillStyle = sd === 'atk' ? '#ff8a4c' : sd === 'def' ? '#8ea3ff' : '#8d8399';
      x.fillText(lbl, ix + iw2 - lw, by - 14);
      by -= 48;
    }
    by -= 4;
    x.font = '500 17px Poppins';
    x.fillStyle = '#b7adc2';
    const pb = gm.by == null ? 'Decider, the last map standing' : 'Picked by ';
    x.fillText(pb, ix, by);
    if (gm.by != null) {
      const pw = x.measureText(pb).width;
      x.fillStyle = col;
      x.fillText(fit(x, t[gm.by], iw2 - pw, 17, 700, 'Poppins', 12), ix + pw, by);
    }
    by -= 34;
    x.fillStyle = '#ffffff';
    x.fillText(fit(x, m.name.toUpperCase(), iw2, n >= 4 ? 40 : 52), ix, by);
    by -= n >= 4 ? 44 : 56;
    spacing(x, '2px');
    x.fillStyle = 'rgba(255,255,255,.6)';
    x.fillText(fit(x, `${m.loc}   SITES ${m.sites}`.toUpperCase(), iw2, 13, 600, 'Poppins', 10), ix, by);
    spacing(x, '0px');
  });

  // veto log
  spacing(x, '4px');
  x.font = '600 16px Poppins';
  x.fillStyle = '#b7adc2';
  x.fillText('VETO LOG', P, logY - 22);
  spacing(x, '0px');
  for (const l of lay) {
    const Y = logY + l.y;
    x.fillStyle = '#1b1424';
    rr(x, l.x, Y, l.w, 42, 9);
    x.fill();
    x.strokeStyle = '#2a2133';
    x.lineWidth = 1;
    rr(x, l.x + 0.5, Y + 0.5, l.w - 1, 41, 9);
    x.stroke();
    x.fillStyle = l.color;
    rr(x, l.x + 8, Y + 9, l.tw, 24, 5);
    x.fill();
    x.fillStyle = '#0d0a12';
    x.font = '700 14px Poppins';
    x.fillText(l.tag, l.x + 16, Y + 26);
    x.fillStyle = l.ban ? '#b7adc2' : '#f3eff6';
    x.font = '600 19px Poppins';
    x.fillText(l.txt, l.x + l.tw + 18, Y + 28);
  }

  // footer
  x.strokeStyle = '#2a2133';
  x.beginPath();
  x.moveTo(P, H - 60);
  x.lineTo(W - P, H - 60);
  x.stroke();
  x.font = '500 15px Poppins';
  x.fillStyle = '#8d8399';
  x.fillText(`${t[0]} vs ${t[1]}, ${FORMATS[s.format].name.toLowerCase()}${s.sidePick ? ', side selection on' : ''}${s.sidePick && s.deciderRule === 'knife' ? ', knife round on the decider' : ''}`, P, H - 28);
  x.textAlign = 'right';
  x.fillText('Planned with Map Veto: Valorant Map Picker', W - P, H - 28);
  x.textAlign = 'left';
  return c;
}

/** Renders the plan as a 1080x1920 story image for phones. */
export async function buildStory(s: Setup, v: VetoState): Promise<HTMLCanvasElement> {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const g = games(v.hist), t = v.teams, n = Math.max(1, g.length);
  const W = 1080, H = 1920, P = 64, top = 420, bottom = H - 200, gap = 24;
  const ch = Math.min(380, (bottom - top - gap * (n - 1)) / n), cw = W - 2 * P;
  const [imgs, logos] = await Promise.all([Promise.all(g.map(gm => loadImg(imgFor(getMap(s, gm.map), 'splash'), 1100))), teamLogos(s, v)]);
  const c = document.createElement('canvas'), x = c.getContext('2d')!;
  c.width = W;
  c.height = H;

  x.fillStyle = '#0d0a12';
  x.fillRect(0, 0, W, H);
  ([[0, '#7a160f'], [W, '#2c1257']] as const).forEach(([gx, col]) => {
    const rg = x.createRadialGradient(gx, 0, 0, gx, 0, 1100);
    rg.addColorStop(0, col + 'c0');
    rg.addColorStop(1, col + '00');
    x.fillStyle = rg;
    x.fillRect(0, 0, W, H);
  });

  // header: format, title, teams, match details
  const half = W / 2, ls = 64;
  x.textAlign = 'center';
  spacing(x, '5px');
  x.fillStyle = '#b7adc2';
  x.font = '600 24px Poppins';
  x.fillText(`${FORMATS[s.format].name.toUpperCase()} MATCH PLAN`, half, 130);
  spacing(x, '0px');
  x.fillStyle = '#f3eff6';
  x.fillText(fit(x, s.title || `${t[0]} vs ${t[1]}`, cw, 80), half, 220);
  ([0, 1] as const).forEach(i => {
    const lx = i ? half + 60 : half - 60 - ls;
    drawLogo(x, logos[i], lx, 252, ls, TEAMC[i]);
    if (!logos[i]) {
      x.fillStyle = TEAMC[i];
      x.font = '800 30px Poppins';
      x.fillText(i ? 'B' : 'A', lx + ls / 2, 295);
    }
  });
  x.fillStyle = '#8d8399';
  x.font = '700 28px Poppins';
  x.fillText('VS', half, 294);
  x.textAlign = 'right';
  x.fillStyle = TEAMC[0];
  x.fillText(fit(x, t[0], half - 100 - ls - P, 34), half - 80 - ls, 296);
  x.textAlign = 'left';
  x.fillStyle = TEAMC[1];
  x.fillText(fit(x, t[1], half - 100 - ls - P, 34), half + 80 + ls, 296);
  x.textAlign = 'center';
  const ml = matchLine(s);
  if (ml) {
    x.fillStyle = '#b7adc2';
    x.fillText(fit(x, ml, cw, 26, 500, 'Poppins'), half, 368);
  }
  x.textAlign = 'left';

  // one wide card per game, stacked and centred in the space left
  const y0 = top + Math.max(0, (bottom - top - (ch * n + gap * (n - 1))) / 2);
  g.forEach((gm, i) => {
    const X = P, Y = y0 + i * (ch + gap), m = getMap(s, gm.map), col = gm.by != null ? TEAMC[gm.by] : DECIDER, img = imgs[i];
    x.save();
    rr(x, X, Y, cw, ch, 24);
    x.clip();
    const lg = x.createLinearGradient(X, Y, X + cw, Y + ch);
    lg.addColorStop(0, m.c[0]);
    lg.addColorStop(1, m.c[1]);
    x.fillStyle = lg;
    x.fillRect(X, Y, cw, ch);
    if (img) {
      const sc = Math.max(cw / img.width, ch / img.height), iw = img.width * sc, ih = img.height * sc;
      x.drawImage(img, X + (cw - iw) / 2, Y + (ch - ih) / 2, iw, ih);
    }
    const sh = x.createLinearGradient(X, 0, X + cw, 0);
    sh.addColorStop(0, 'rgba(9,6,13,.94)');
    sh.addColorStop(0.55, 'rgba(9,6,13,.72)');
    sh.addColorStop(1, 'rgba(9,6,13,.3)');
    x.fillStyle = sh;
    x.fillRect(X, Y, cw, ch);
    x.restore();
    x.strokeStyle = col;
    x.lineWidth = 4;
    rr(x, X + 2, Y + 2, cw - 4, ch - 4, 22);
    x.stroke();

    const k = Math.min(1, ch / 300), ix = X + 36;
    const badge = `MAP ${i + 1}${gm.decider ? ' DECIDER' : ''}`;
    x.font = `700 ${Math.round(20 * k)}px Poppins`;
    const bw = x.measureText(badge).width + 24;
    x.fillStyle = col;
    rr(x, ix, Y + 30 * k, bw, 38 * k, 8);
    x.fill();
    x.fillStyle = '#0d0a12';
    x.fillText(badge, ix + 12, Y + 56 * k);
    x.fillStyle = '#ffffff';
    x.fillText(fit(x, m.name.toUpperCase(), cw * 0.55, Math.round(96 * k)), ix, Y + ch * 0.64);
    x.fillStyle = '#b7adc2';
    x.fillText(fit(x, gm.by == null ? 'Decider' : `Picked by ${t[gm.by]}`, cw * 0.55, Math.round(24 * k), 500, 'Poppins', 14), ix, Y + ch * 0.64 + 44 * k);

    // starting sides, right column
    const rx = X + cw - 36, rh = 56 * k;
    ([0, 1] as const).forEach((team, j) => {
      const sd = sideFor(gm, team), ry = Y + ch / 2 - rh - 6 + j * (rh + 12);
      const lbl = sd ? (sd === 'atk' ? 'ATTACK' : 'DEFENSE') : gm.decider && s.deciderRule === 'knife' ? 'KNIFE' : 'TBD';
      x.font = `700 ${Math.round(26 * k)}px Poppins`;
      const lw = x.measureText(lbl).width + 28;
      x.fillStyle = sd === 'atk' ? 'rgba(255,138,76,.22)' : sd === 'def' ? 'rgba(142,163,255,.24)' : 'rgba(255,255,255,.08)';
      rr(x, rx - lw, ry, lw, rh, 10);
      x.fill();
      x.fillStyle = sd === 'atk' ? '#ff8a4c' : sd === 'def' ? '#8ea3ff' : '#b7adc2';
      x.textAlign = 'right';
      x.fillText(lbl, rx - 14, ry + rh * 0.68);
      x.fillStyle = TEAMC[team];
      x.fillText(fit(x, t[team], 260, Math.round(25 * k), 600, 'Poppins', 12), rx - lw - 14, ry + rh * 0.66);
      x.textAlign = 'left';
    });
  });

  // brand lockup at the bottom
  const fy = H - 110, lx = half - 80;
  drawMark(x, lx - 72, fy - 40, 56);
  spacing(x, '3px');
  x.font = '700 30px Poppins';
  x.fillStyle = '#f3eff6';
  x.fillText('MAP ', lx, fy);
  x.fillStyle = '#ff2a36';
  x.fillText('VETO', lx + x.measureText('MAP ').width, fy);
  spacing(x, '2.5px');
  x.font = '600 13px Poppins';
  x.fillStyle = '#b7adc2';
  x.fillText('VALORANT MAP PICKER', lx, fy + 24);
  spacing(x, '0px');
  return c;
}

export const canvasBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
