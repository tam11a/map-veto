import { defaultSetup } from './maps';
import { type Payload, payload } from '../lib/share';
import { curStep, remaining } from '../lib/veto';
import type { Action, Format } from '../types';

const POOL = ['abyss', 'bind', 'corrode', 'haven', 'lotus', 'summit', 'sunset'];
// the order the example teams reach for maps: bans take from the front, picks from the back
const BAN_ORDER = ['bind', 'abyss', 'corrode', 'lotus', 'haven', 'summit', 'sunset'];
const PICK_ORDER = ['haven', 'summit', 'sunset', 'lotus', 'corrode', 'abyss', 'bind'];

/** A finished example veto for a format, built with the default order, for the guide's replays. */
export function examplePlan(format: Format): Payload {
  const s = { ...defaultSetup(), title: `Example ${['', 'Bo1', 'Bo2', 'Bo3', '', 'Bo5'][format]}`, teams: ['Team Alpha', 'Team Omega'] as [string, string], format, pool: POOL, seq: null };
  const hist: Action[] = [];
  for (let step = curStep(s, hist), n = 0; step && n < 40; step = curStep(s, hist), n++) {
    const left = remaining(s, hist);
    if (step.k === 'side') hist.push({ k: 'side', team: step.team, map: step.map, side: n % 3 ? 'def' : 'atk' });
    else if (step.k === 'decider') hist.push({ k: 'decider', team: null, map: step.map });
    else {
      const prefs = step.k === 'ban' ? BAN_ORDER : PICK_ORDER;
      hist.push({ k: step.k, team: step.team, map: prefs.find(m => left.includes(m))! });
    }
  }
  return payload(s, { teams: s.teams, hist });
}
