import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../data/maps';
import { BUILTIN_PRESETS } from '../data/presets';
import type { Format, Setup } from '../types';
import { curStep, deciderSider, games, genSeq, pickSider, plan, simulate } from './veto';

const POOL = ['abyss', 'ascent', 'bind', 'haven', 'lotus', 'split', 'sunset'];
const setup = (o: Partial<Setup> = {}): Setup => ({ ...defaultSetup(), pool: POOL, ...o });

describe('genSeq', () => {
  it.each([1, 2, 3, 5] as Format[])('gives a valid Bo%i order for pools of 5 to 12 maps', format => {
    for (let n = Math.max(format, 5); n <= 12; n++) {
      const s = setup({ format, pool: Array.from({ length: n }, (_, i) => `m${i}`) });
      expect(simulate(s, genSeq(format, n)).valid, `Bo${format} with ${n} maps`).toBe(true);
    }
  });

  it('alternates teams for bans and picks', () => {
    const seq = genSeq(3, 7);
    expect(seq.map(x => x.t[0] + x.team).join(' ')).toBe('b0 b1 p0 p1 b0 b1');
  });
});

describe('side rules', () => {
  it('lets the opponent of the picker choose by default, or the picker when set', () => {
    expect(pickSider({ sideRule: 'opponent' }, 0)).toBe(1);
    expect(pickSider({ sideRule: 'picker' }, 0)).toBe(0);
  });

  it('picks the decider side by rule', () => {
    const seq = genSeq(3, 7); // last ban is team B's, so team A chooses
    expect(deciderSider({ deciderRule: 'lastban' }, seq)).toBe(0);
    expect(deciderSider({ deciderRule: 'teamB' }, seq)).toBe(1);
    expect(deciderSider({ deciderRule: 'knife' }, seq)).toBeNull();
  });

  it('has no side step on the decider for a knife round', () => {
    const p = plan(setup({ deciderRule: 'knife' }));
    expect(p[p.length - 1]).toEqual({ k: 'decider', team: null });
  });

  it('has no side steps at all when side selection is off', () => {
    expect(plan(setup({ sidePick: false })).some(x => x.k === 'side')).toBe(false);
  });
});

describe('a full veto', () => {
  it('walks the plan to a finished Bo3 with three games', () => {
    const s = setup();
    const hist: Parameters<typeof curStep>[1] = [];
    for (let st = curStep(s, hist); st; st = curStep(s, hist)) {
      if (st.k === 'side') hist.push({ k: 'side', team: st.team, map: st.map, side: 'atk' });
      else if (st.k === 'decider') hist.push({ k: 'decider', team: null, map: st.map });
      else hist.push({ k: st.k, team: st.team, map: POOL.find(m => !hist.some(h => h.map === m))! });
    }
    const g = games(hist);
    expect(g).toHaveLength(3);
    expect(g[2].decider).toBe(true);
    expect(g.every(x => x.side)).toBe(true);
  });
});

describe('built-in rule sets', () => {
  it.each(BUILTIN_PRESETS.map(p => [p.name, p] as const))('%s fits its pool size and format', (_, p) => {
    const s = setup({ format: p.format, pool: POOL.slice(0, p.poolSize), seq: p.seq });
    expect(simulate(s, p.seq).valid).toBe(true);
  });
});
