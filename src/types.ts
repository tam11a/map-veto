export type TeamIdx = 0 | 1;
export type Format = 1 | 2 | 3 | 5;
export type StepType = 'ban' | 'pick';
export type ActionKind = StepType | 'side' | 'decider';
export type Side = 'atk' | 'def';
export type Phase = 'setup' | 'veto' | 'result';
export type FirstTurn = 'a' | 'b' | 'coin';

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
  custom: MapInfo[];
  /** null = auto-generated from format + pool size */
  seq: SeqStep[] | null;
  sidePick: boolean;
  timer: number;
  notes: Record<string, string>;
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
