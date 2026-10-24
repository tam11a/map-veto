export type TeamIdx = 0 | 1;
export type Format = 1 | 2 | 3 | 5;
export type StepType = 'ban' | 'pick';
export type ActionKind = StepType | 'side' | 'decider';
export type Side = 'atk' | 'def';
export type Phase = 'setup' | 'veto' | 'result';
export type FirstTurn = 'a' | 'b' | 'coin';
export type PoolPreset = 'competitive' | 'all' | 'custom';
/** who chooses the starting side after a pick */
export type SideRule = 'opponent' | 'picker';
/** who chooses the starting side on the decider; 'knife' = decided in game, no side step */
export type DeciderRule = 'lastban' | 'teamA' | 'teamB' | 'knife';

/** A saved veto rule set (order + side rules), e.g. a league's format. */
export interface RulePreset {
  id: string;
  name: string;
  format: Format;
  poolSize: number;
  seq: SeqStep[];
  sidePick: boolean;
  sideRule: SideRule;
  deciderRule: DeciderRule;
}

export interface MapInfo {
  id: string;
  name: string;
  loc: string;
  year?: number;
  sites: string;
  tag: string;
  desc: string;
  /** gradient used as fallback art: [from, to] */
  c: [string, string];
  custom?: boolean;
  img?: string;
}

/** One configured step of the veto order. */
export interface SeqStep {
  t: StepType;
  team: TeamIdx;
}

/** One thing that actually happened during the veto. */
export interface Action {
  k: ActionKind;
  team: TeamIdx | null;
  map: string;
  side?: Side;
}

export interface Setup {
  title: string;
  teams: [string, string];
  first: FirstTurn;
  format: Format;
  pool: string[];
  /** the team's own pool, remembered while a preset is active */
  customPool: string[];
  custom: MapInfo[];
  /** null = auto-generated from format + pool size */
  seq: SeqStep[] | null;
  sidePick: boolean;
  sideRule: SideRule;
  deciderRule: DeciderRule;
  timer: number;
  /** general notes per map */
  notes: Record<string, string>;
  /** attack-side and defense-side notes per map */
  notesAtk: Record<string, string>;
  notesDef: Record<string, string>;
  /** planned agent composition per map (agent display names) */
  comps: Record<string, string[]>;
  /** optional match details shown on the plan */
  event: string;
  date: string;
  /** team logo image URLs ('' = none) */
  logos: [string, string];
  /** saved rule sets */
  presets: RulePreset[];
}

export interface VetoState {
  /** index 0 always acts first */
  teams: [string, string];
  hist: Action[];
}

export interface Game {
  map: string;
  by: TeamIdx | null;
  decider: boolean;
  side?: { team: TeamIdx; side: Side };
}
