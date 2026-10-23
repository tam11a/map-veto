import { MAPS } from '../data/maps';
import type { Action, ActionKind, Format, Game, MapInfo, SeqStep, Setup, Side, TeamIdx } from '../types';

export const other = (t: TeamIdx) => (1 - t) as TeamIdx;
export const allMaps = (s: Setup) => MAPS.concat(s.custom);
export const getMap = (s: Setup, id: string): MapInfo =>
  allMaps(s).find(m => m.id === id) ?? { id, name: id, loc: '—', sites: '—', tag: '', desc: '', c: ['#333', '#111'] };

/** Default ban/pick order for a format, adapted to the pool size. */
export function genSeq(fmt: Format, n: number): SeqStep[] {
  const s: SeqStep[] = [];
  let b = 0, p = 0;
  const ban = () => { s.push({ t: 'ban', team: (b++ % 2) as TeamIdx }); };
  const pick = () => { s.push({ t: 'pick', team: (p++ % 2) as TeamIdx }); };
  const rep = (k: number, f: () => void) => { for (let i = 0; i < k; i++) f(); };
  if (fmt === 1) rep(n - 1, ban);
  else if (fmt === 2) { rep(Math.max(0, n - 3), ban); pick(); pick(); }
  else if (fmt === 3) {
    const extra = Math.max(0, n - 3), first = Math.min(2, extra);
    rep(first, ban); pick(); pick(); rep(extra - first, ban);
  } else { rep(Math.max(0, n - 5), ban); rep(4, pick); }
  return s;
}

export const getSeq = (s: Setup) => s.seq ?? genSeq(s.format, s.pool.length);

export function simulate(s: Setup, seq = getSeq(s)) {
  const picks = seq.filter(x => x.t === 'pick').length;
  const left = s.pool.length - seq.length;
  const decider = left === 1 && picks < s.format ? 1 : 0;
  return {
    picks,
    bans: seq.length - picks,
    decider,
    games: picks + decider,
    unplayed: Math.max(0, left - decider),
    overflow: left < 0,
    valid: left >= 0 && picks + decider === s.format,
  };
}

/** The decider's side is chosen by the team that did NOT make the last ban. */
export function deciderSideTeam(seq: SeqStep[]): TeamIdx {
  for (let i = seq.length - 1; i >= 0; i--) if (seq[i].t === 'ban') return other(seq[i].team);
  return 1;
}

export interface PlanStep { k: ActionKind; team: TeamIdx | null }
export interface Step extends PlanStep { i: number; total: number; map: string }

/** Every step the veto will go through, including side choices and the decider. */
export function plan(s: Setup): PlanStep[] {
  const seq = getSeq(s), out: PlanStep[] = [];
  for (const x of seq) {
    out.push({ k: x.t, team: x.team });
    if (x.t === 'pick' && s.sidePick) out.push({ k: 'side', team: other(x.team) });
  }
  if (simulate(s, seq).decider) {
    out.push({ k: 'decider', team: null });
    if (s.sidePick) out.push({ k: 'side', team: deciderSideTeam(seq) });
  }
  return out;
}

export function remaining(s: Setup, hist: Action[]) {
  const used = new Set(hist.filter(h => h.k !== 'side').map(h => h.map));
  return s.pool.filter(id => !used.has(id));
}

export function curStep(s: Setup, hist: Action[]): Step | null {
  const p = plan(s), i = hist.length;
  if (i >= p.length) return null;
  const map = p[i].k === 'side' ? hist[i - 1].map : p[i].k === 'decider' ? remaining(s, hist)[0] : '';
  return { ...p[i], i, total: p.length, map };
}

export function games(hist: Action[]): Game[] {
  const g: Game[] = [];
  for (const h of hist) {
    if (h.k === 'pick' || h.k === 'decider') g.push({ map: h.map, by: h.k === 'pick' ? h.team : null, decider: h.k === 'decider' });
    if (h.k === 'side' && h.team != null && h.side) {
      const x = g.find(x => x.map === h.map);
      if (x) x.side = { team: h.team, side: h.side };
    }
  }
  return g;
}

export const flip = (s: Side): Side => (s === 'atk' ? 'def' : 'atk');
export const sideFor = (g: Game, team: TeamIdx): Side | null =>
  !g.side ? null : g.side.team === team ? g.side.side : flip(g.side.side);
export const sideLabel = (s: Side) => (s === 'atk' ? 'Attack' : 'Defense');
