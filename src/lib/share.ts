import { FORMATS, defaultSetup } from '../data/maps';
import type { Action, DeciderRule, Format, MapInfo, RulePreset, SeqStep, Setup, Side, SideRule, TeamIdx, VetoState } from '../types';
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
  // optional additions (older links simply don't have them)
  rules?: { side: SideRule; decider: DeciderRule };
  event?: string;
  date?: string;
  logos?: [string, string];
  notesAtk?: Record<string, string>;
  notesDef?: Record<string, string>;
  comps?: Record<string, string[]>;
}

const b64e = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

/** Only the entries for maps in the pool, and none when empty, to keep links short. */
function pick<T>(rec: Record<string, T>, pool: string[], keep: (v: T) => boolean) {
  const out: Record<string, T> = {};
  for (const id of pool) if (rec[id] !== undefined && keep(rec[id])) out[id] = rec[id];
  return Object.keys(out).length ? out : undefined;
}

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
    ...(s.sideRule !== 'opponent' || s.deciderRule !== 'lastban' ? { rules: { side: s.sideRule, decider: s.deciderRule } } : {}),
    ...(s.event ? { event: s.event } : {}),
    ...(s.date ? { date: s.date } : {}),
    ...(s.logos[0] || s.logos[1] ? { logos: s.logos } : {}),
    ...(pick(s.notesAtk, s.pool, Boolean) ? { notesAtk: pick(s.notesAtk, s.pool, Boolean) } : {}),
    ...(pick(s.notesDef, s.pool, Boolean) ? { notesDef: pick(s.notesDef, s.pool, Boolean) } : {}),
    ...(pick(s.comps, s.pool, c => c.length > 0) ? { comps: pick(s.comps, s.pool, c => c.length > 0) } : {}),
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
    notesAtk: { ...base.notesAtk, ...(o.notesAtk ?? {}) },
    notesDef: { ...base.notesDef, ...(o.notesDef ?? {}) },
    comps: { ...base.comps, ...(o.comps ?? {}) },
    sideRule: o.rules?.side === 'picker' ? 'picker' : 'opponent',
    deciderRule: (['lastban', 'teamA', 'teamB', 'knife'] as DeciderRule[]).includes(o.rules?.decider as DeciderRule) ? (o.rules!.decider as DeciderRule) : 'lastban',
    event: typeof o.event === 'string' ? o.event : '',
    date: typeof o.date === 'string' ? o.date : '',
    logos: Array.isArray(o.logos) && o.logos.length === 2 ? [String(o.logos[0] ?? ''), String(o.logos[1] ?? '')] : ['', ''],
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
/** Reads the saved setup field by field; anything missing or malformed falls back to the default. */
export function loadSetup(): Setup {
  const d = defaultSetup();
  let o: Record<string, unknown> | null = null;
  try { o = JSON.parse(localStorage.getItem(STORE) ?? 'null'); } catch { /* corrupt JSON */ }
  if (!o || typeof o !== 'object') return d;
  const strs = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === 'string');
  const teams = o.teams as unknown[];
  return {
    title: typeof o.title === 'string' ? o.title : d.title,
    teams: Array.isArray(teams) && teams.length === 2 && strs(teams) ? [teams[0] as string, teams[1] as string] : d.teams,
    first: o.first === 'a' || o.first === 'b' || o.first === 'coin' ? o.first : d.first,
    format: [1, 2, 3, 5].includes(o.format as number) ? (o.format as Format) : d.format,
    pool: strs(o.pool) && (o.pool as string[]).length > 0 ? (o.pool as string[]) : d.pool,
    customPool: strs(o.customPool) ? (o.customPool as string[]) : d.customPool,
    custom: Array.isArray(o.custom) ? (o.custom as MapInfo[]).filter(m => m && typeof m.id === 'string' && typeof m.name === 'string' && Array.isArray(m.c)) : d.custom,
    seq: Array.isArray(o.seq) && (o.seq as SeqStep[]).every(x => (x?.t === 'ban' || x?.t === 'pick') && (x.team === 0 || x.team === 1)) ? (o.seq as SeqStep[]) : null,
    sidePick: typeof o.sidePick === 'boolean' ? o.sidePick : d.sidePick,
    timer: typeof o.timer === 'number' && o.timer >= 0 && o.timer <= 600 ? Math.round(o.timer) : d.timer,
    notes: strRecord(o.notes),
    notesAtk: strRecord(o.notesAtk),
    notesDef: strRecord(o.notesDef),
    comps: o.comps && typeof o.comps === 'object' && !Array.isArray(o.comps)
      ? Object.fromEntries(Object.entries(o.comps as Record<string, unknown>).filter(([, v]) => strs(v)).map(([k, v]) => [k, (v as string[]).slice(0, 5)]))
      : d.comps,
    sideRule: o.sideRule === 'picker' ? 'picker' : d.sideRule,
    deciderRule: (['lastban', 'teamA', 'teamB', 'knife'] as unknown[]).includes(o.deciderRule) ? (o.deciderRule as DeciderRule) : d.deciderRule,
    event: typeof o.event === 'string' ? o.event : d.event,
    date: typeof o.date === 'string' ? o.date : d.date,
    logos: Array.isArray(o.logos) && o.logos.length === 2 && strs(o.logos) ? [o.logos[0] as string, o.logos[1] as string] : d.logos,
    presets: Array.isArray(o.presets) ? (o.presets as RulePreset[]).filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.seq)) : d.presets,
  };
}

function strRecord(v: unknown): Record<string, string> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string')) as Record<string, string>
    : {};
}
export function saveSetup(s: Setup) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* ignore */ }
}
