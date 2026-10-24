import type { RulePreset, SeqStep, TeamIdx } from '../types';

const s = (code: string): SeqStep[] =>
  code.split(' ').map(x => ({ t: x[0] === 'b' ? 'ban' : 'pick', team: (x[1] === 'A' ? 0 : 1) as TeamIdx }));

/** Common tournament orders for a seven-map pool. */
export const BUILTIN_PRESETS: RulePreset[] = [
  { id: 'bo1-six-bans', name: 'Bo1, six bans', format: 1, poolSize: 7, seq: s('bA bB bA bB bA bB'), sidePick: true, sideRule: 'opponent', deciderRule: 'lastban' },
  { id: 'bo1-knife', name: 'Bo1, knife for sides', format: 1, poolSize: 7, seq: s('bA bB bA bB bA bB'), sidePick: true, sideRule: 'opponent', deciderRule: 'knife' },
  { id: 'bo2-series', name: 'Bo2 series', format: 2, poolSize: 7, seq: s('bA bB bA bB pA pB'), sidePick: true, sideRule: 'opponent', deciderRule: 'lastban' },
  { id: 'bo3-tournament', name: 'Bo3 tournament', format: 3, poolSize: 7, seq: s('bA bB pA pB bA bB'), sidePick: true, sideRule: 'opponent', deciderRule: 'lastban' },
  { id: 'bo5-tournament', name: 'Bo5 tournament', format: 5, poolSize: 7, seq: s('bA bB pA pB pA pB'), sidePick: true, sideRule: 'opponent', deciderRule: 'lastban' },
];

/** Short description of a preset's order, e.g. "Ban, ban, pick, pick, ban, ban, decider". */
export function describePreset(p: RulePreset) {
  const steps = p.seq.map(x => x.t);
  const left = p.poolSize - p.seq.length;
  return `${p.seq.length} steps: ${steps.filter(t => t === 'ban').length} bans, ${steps.filter(t => t === 'pick').length} picks${left === 1 && steps.filter(t => t === 'pick').length < p.format ? ', decider' : ''}`;
}
