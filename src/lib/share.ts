import { FORMATS, defaultSetup } from '../data/maps';
import type { Action, Format, MapInfo, Setup, Side, TeamIdx, VetoState } from '../types';
import { games, getMap, getSeq, sideFor } from './veto';

/** Compact, URL-safe representation of a finished (or partial) plan. */
export interface Payload {
  app: 'mapveto';
  v: 1;
  title: string;
  teams: [string, string];
  format: Format;
  pool: string[];
  custom: MapInfo[];
  seq: string;
  side: 0 | 1;
  hist: [string, number, string, Side | 0][];
  notes: Record<string, string>;
}

const b64e = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export function payload(s: Setup, v: VetoState): Payload {
  const notes: Record<string, string> = {};
  for (const id of s.pool) if (s.notes[id]) notes[id] = s.notes[id];
  return {
    app: 'mapveto', v: 1, title: s.title, teams: v.teams, format: s.format, pool: s.pool,
    custom: s.custom.filter(m => s.pool.includes(m.id)),
    seq: getSeq(s).map(x => (x.t === 'ban' ? 'b' : 'p') + x.team).join(''),
    side: s.sidePick ? 1 : 0,
    hist: v.hist.map(h => [h.k[0], h.team ?? -1, h.map, h.side ?? 0]),
    notes,
  };
}

const KIND: Record<string, Action['k']> = { b: 'ban', p: 'pick', s: 'side', d: 'decider' };

export function loadPayload(o: Payload, base: Setup): { setup: Setup; veto: VetoState } {
  if (!o || !Array.isArray(o.pool) || !Array.isArray(o.hist) || !Array.isArray(o.teams)) throw new Error('Not a Map Veto plan');
  const custom = [...base.custom];
  for (const m of o.custom ?? []) if (!custom.some(x => x.id === m.id)) custom.push(m);
  const teams: [string, string] = [String(o.teams[0]), String(o.teams[1])];
  const setup: Setup = {
    ...base,
    title: o.title ?? '',
    format: ([1, 2, 3, 5].includes(+o.format) ? +o.format : 3) as Format,
    pool: o.pool,
    custom,
    sidePick: !!o.side,
    seq: (o.seq.match(/[bp][01]/g) ?? []).map(x => ({ t: x[0] === 'b' ? 'ban' : 'pick', team: +x[1] as TeamIdx })),
    notes: { ...base.notes, ...(o.notes ?? {}) },
    teams,
    first: 'a',
  };
  const hist: Action[] = o.hist.map(([k, t, map, side]) => ({
    k: KIND[k], team: t < 0 ? null : (t as TeamIdx), map, ...(side ? { side } : {}),
  }));
  return { setup, veto: { teams, hist } };
}

export function readHashPlan(): Payload | null {
  const m = location.hash.match(/^#plan=(.+)$/);
  return m ? (JSON.parse(b64d(m[1])) as Payload) : null;
}

export function shareLink(s: Setup, v: VetoState) {
  const url = location.origin + '/veto#plan=' + b64e(JSON.stringify(payload(s, v)));
  try { history.replaceState(null, '', url); } catch { /* ignore */ }
  return url;
}

export function clearHash() {
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch { /* ignore */ }
}

export function textSummary(s: Setup, v: VetoState) {
  const t = v.teams, name = (id: string) => getMap(s, id).name;
  const L = [`🗺️ ${s.title ? s.title + ': ' : ''}${t[0]} vs ${t[1]}, ${FORMATS[s.format].name.toLowerCase()}`, '', 'VETO'];
  v.hist.forEach((h, i) => {
    const who = h.team != null ? t[h.team] : '';
    L.push(`${String(i + 1).padStart(2, ' ')}. ` + (
      h.k === 'ban' ? `❌ ${who} bans ${name(h.map)}`
        : h.k === 'pick' ? `✅ ${who} picks ${name(h.map)}`
        : h.k === 'side' ? `   ↳ ${who} starts ${h.side === 'atk' ? 'Attack' : 'Defense'}`
        : `⚖️ ${name(h.map)} is the decider`));
  });
  L.push('', 'MAPS');
  games(v.hist).forEach((g, i) => {
    const s0 = sideFor(g, 0);
    L.push(`Map ${i + 1}: ${name(g.map)} (${g.decider || g.by == null ? 'decider' : t[g.by] + ' pick'})`
      + (s0 ? ` — ${t[0]} ${s0.toUpperCase()} / ${t[1]} ${s0 === 'atk' ? 'DEF' : 'ATK'}` : ''));
    if (s.notes[g.map]) L.push('   📝 ' + s.notes[g.map].replace(/\n/g, ' / '));
  });
  L.push('', 'Planned with Map Veto: Valorant Map Picker');
  return L.join('\n');
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'veto';
export const fileBase = (s: Setup, v: VetoState) => slug(s.title || v.teams.join('-vs-')) + '-map-veto';

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const STORE = 'mapveto.setup';
export function loadSetup(): Setup {
  try {
    const o = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (o && Array.isArray(o.pool)) return { ...defaultSetup(), ...o };
  } catch { /* ignore */ }
  return defaultSetup();
}
export function saveSetup(s: Setup) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* ignore */ }
}
