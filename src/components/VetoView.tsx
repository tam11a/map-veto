import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardIcon, NotebookPenIcon, PauseIcon, PlayIcon, Undo2Icon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DECIDER, TEAMC } from '@/data/maps';
import { vars } from '@/lib/fx';
import { cue, setSound, useSound } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { type Step, curStep, games, getMap, plan, remaining, sideLabel } from '@/lib/veto';
import { useApp } from '@/state';
import type { Action, ActionKind, MapInfo, Setup, Side, TeamIdx, VetoState } from '@/types';
import { ConfirmDialog } from './kit';
import { MapArt } from './MapArt';
import { TeamMark } from './TeamMark';

type HistUpdate = (fn: (h: Action[]) => Action[]) => void;
export interface Rec { k: ActionKind; team: TeamIdx | null; g?: number }

interface Props {
  veto: VetoState;
  updateHist: HistUpdate;
  /** when set, the veto plays these actions back automatically */
  replay: Action[] | null;
  onFinish: (celebrate: boolean) => void;
  onSkip: () => void;
  onExit: () => void;
}

export function VetoView({ veto, updateHist, replay, onFinish, onSkip, onExit }: Props) {
  const { setup: S, toast, openInfo } = useApp();
  const { teams, hist } = veto;
  const step = curStep(S, hist);
  const live = !!step && (step.k === 'ban' || step.k === 'pick') && !replay;
  const finish = useRef(onFinish);
  finish.current = onFinish;

  const push = useCallback((a: Action) => updateHist(h => [...h, a]), [updateHist]);

  const act = (map: string) => {
    if (!live || !step || !remaining(S, hist).includes(map)) return;
    push({ k: step.k, team: step.team, map });
  };
  const chooseSide = (side: Side) => {
    if (replay || !step || step.k !== 'side') return;
    push({ k: 'side', team: step.team, map: step.map, side });
  };
  const undo = () => {
    if (replay || !hist.length) return;
    updateHist(h => {
      const n = h.slice();
      // the decider is automatic, so step back past the move that caused it
      if (n.pop()?.k === 'decider') n.pop();
      return n;
    });
    toast('Step undone');
  };
  const undoRef = useRef(undo);
  undoRef.current = undo;

  // automatic steps: reveal the decider, then move on to the plan
  useEffect(() => {
    if (replay) return;
    if (step?.k === 'decider') {
      const map = step.map;
      const t = setTimeout(() => push({ k: 'decider', team: null, map }), 900);
      return () => clearTimeout(t);
    }
    if (!step) {
      const t = setTimeout(() => finish.current(true), 1400);
      return () => clearTimeout(t);
    }
  }, [hist.length, replay]); // eslint-disable-line react-hooks/exhaustive-deps

  // replay playback
  useEffect(() => {
    if (!replay) return;
    if (hist.length < replay.length) {
      const t = setTimeout(() => push(replay[hist.length]), 750);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => finish.current(false), 900);
    return () => clearTimeout(t);
  }, [replay, hist.length, push]);

  // turn timer; pausing keeps the time that was left
  const [deadline, setDeadline] = useState(0);
  const [paused, setPaused] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const s = curStep(S, hist);
    setPaused(null);
    setDeadline(S.timer && s && s.k !== 'decider' && !replay ? Date.now() + S.timer * 1000 : 0);
    setNow(Date.now());
  }, [hist.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const timed = S.timer > 0 && !replay && !!step && step.k !== 'decider';
  const togglePause = () => {
    if (!timed) return;
    if (paused != null) {
      setDeadline(Date.now() + paused);
      setPaused(null);
      toast('Timer resumed');
    } else if (deadline) {
      setPaused(Math.max(0, deadline - Date.now()));
      setDeadline(0);
      toast('Timer paused');
    }
  };
  const pauseRef = useRef(togglePause);
  pauseRef.current = togglePause;

  // sound: a cue for each move, and a tick for the last five seconds
  const sound = useSound();
  useEffect(() => {
    const h = hist[hist.length - 1];
    if (!h) return;
    cue(h.k === 'ban' ? 'ban' : h.k === 'pick' ? 'pick' : h.k === 'decider' ? 'decider' : 'side');
  }, [hist.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!step && hist.length) cue('done'); }, [!step]); // eslint-disable-line react-hooks/exhaustive-deps
  const secLeft = deadline ? Math.ceil((deadline - now) / 1000) : 0;
  useEffect(() => { if (secLeft > 0 && secLeft <= 5) cue('tick'); }, [secLeft]);
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [deadline]);
  useEffect(() => {
    if (!deadline || now < deadline || !step) return;
    setDeadline(0);
    if (step.k === 'side') {
      const sd: Side = Math.random() < 0.5 ? 'atk' : 'def';
      chooseSide(sd);
      toast(`Time’s up. ${sideLabel(sd)} was picked at random.`);
    } else if (live) {
      const r = remaining(S, hist), m = r[Math.floor(Math.random() * r.length)];
      act(m);
      toast(`Time’s up. ${getMap(S, m).name} was ${step.k === 'ban' ? 'banned' : 'picked'} at random.`);
    }
  }, [now, deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard: 1-9 and 0 act on the available maps in order, A/D choose a side, P pauses, M mutes
  const open = live ? S.pool.filter(id => remaining(S, hist).includes(id)) : [];
  const keys = useRef({ open, act, chooseSide, side: step?.k === 'side' });
  keys.current = { open, act, chooseSide, side: step?.k === 'side' };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keys.current, key = e.key.toLowerCase();
      if (/^[0-9]$/.test(key) && k.open.length) {
        const map = k.open[key === '0' ? 9 : Number(key) - 1];
        if (map) { e.preventDefault(); k.act(map); }
      } else if (k.side && (key === 'a' || key === 'd')) {
        e.preventDefault();
        k.chooseSide(key === 'a' ? 'atk' : 'def');
      } else if (key === 'p') {
        pauseRef.current();
      } else if (key === 'm') {
        setSound(!soundRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const logoOf = (i: TeamIdx) => S.logos[S.teams[0] === teams[i] ? 0 : S.teams[1] === teams[i] ? 1 : i];

  const rec = useMemo(() => {
    const r: Record<string, Rec> = {};
    let gi = 0;
    for (const h of hist) {
      if (h.k === 'ban') r[h.map] = { k: 'ban', team: h.team };
      if (h.k === 'pick' || h.k === 'decider') r[h.map] = { k: h.k, team: h.team, g: ++gi };
    }
    return r;
  }, [hist]);

  // the map touched by the latest ban/pick/decider plays its one-shot feedback
  const last = hist[hist.length - 1];
  const fresh = last && last.k !== 'side' ? last.map : null;

  const sideStep = step?.k === 'side' ? step : null;
  const [restart, setRestart] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-[1fr_minmax(320px,auto)_1fr] motion-safe:animate-rise">
        {([0, 1] as const).map(t => <TeamCard key={t} team={t} name={teams[t]} hist={hist} active={step?.team === t} logo={logoOf(t)} />)}
        <TurnBanner step={step} teams={teams} timer={S.timer} deadline={deadline} now={now} paused={paused} />
      </div>
      <Timeline teams={teams} hist={hist} />
      <Board mode={live ? step!.k : 'idle'} color={step?.team != null ? TEAMC[step.team] : DECIDER}>
        {S.pool.map(id => (
          <MapCard
            key={id}
            map={getMap(S, id)}
            rec={rec[id]}
            live={live && !rec[id]}
            done={!step}
            fresh={fresh === id}
            teams={teams}
            hasNotes={!!(S.notes[id] || S.notesAtk[id] || S.notesDef[id] || S.comps[id]?.length)}
            hotkey={open.indexOf(id) < 10 && open.includes(id) ? String((open.indexOf(id) + 1) % 10) : undefined}
            action={step?.k === 'pick' ? 'Pick' : 'Ban'}
            onAct={() => act(id)}
            onInfo={() => openInfo(id)}
          />
        ))}
      </Board>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={undo} disabled={!hist.length || !!replay}><Undo2Icon /> Undo</Button>
          {S.timer > 0 && (
            <Button variant={paused != null ? 'pick' : 'secondary'} onClick={togglePause} disabled={!timed} aria-pressed={paused != null}>
              {paused != null ? <><PlayIcon /> Resume timer</> : <><PauseIcon /> Pause timer</>}
            </Button>
          )}
          <SoundButton sound={sound} />
          <Button variant="ghost" disabled={!!replay || !hist.length} onClick={() => setRestart(true)}>Restart</Button>
          <Button variant="ghost" onClick={onExit}>Back to setup</Button>
        </div>
        <KeyHints timer={S.timer > 0} />
      </div>
      {replay && (
        <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/15 bg-popover/90 py-1.5 pr-1.5 pl-4 text-xs font-bold tracking-[0.12em] backdrop-blur-xl" role="status">
          <i className="size-2 rounded-full bg-ban motion-safe:animate-blink" />REPLAYING VETO
          <Button size="sm" variant="ghost" onClick={onSkip}>Skip</Button>
        </div>
      )}
      <ConfirmDialog open={restart} onOpenChange={setRestart} title="Restart the veto?" confirmLabel="Restart" onConfirm={() => updateHist(() => [])}>
        Every step so far is cleared and the veto starts again from the first ban.
      </ConfirmDialog>
      <SideDialog
        step={step?.k === 'side' ? step : null}
        setup={S}
        teams={teams}
        mapNo={sideStep ? games(hist).findIndex(g => g.map === sideStep.map) + 1 : 0}
        disabled={!!replay}
        onChoose={chooseSide}
      />
    </>
  );
}

/** The grid of map cards. `mode` tints the hover state (red for bans). */
export function Board({ mode, color, children }: { mode: string; color: string; children: ReactNode }) {
  return (
    <div
      data-mode={mode}
      className="group/board grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] sm:gap-3 motion-safe:animate-rise"
      style={vars({ '--tc': color })}
    >
      {children}
    </div>
  );
}

/** Mute toggle shared by the local veto and rooms. */
export function SoundButton({ sound }: { sound: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Sound on. Turn off' : 'Sound off. Turn on'}>
          {sound ? <Volume2Icon /> : <VolumeXIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{sound ? 'Sound on' : 'Sound off'} <Kbd>M</Kbd></TooltipContent>
    </Tooltip>
  );
}

function KeyHints({ timer }: { timer: boolean }) {
  const k = (s: string) => <Kbd className="bg-white/10 text-foreground">{s}</Kbd>;
  return (
    <p className="hidden flex-wrap items-center gap-1.5 text-sm text-muted-foreground [@media(hover:hover)]:flex">
      <KeyboardIcon className="size-4 text-dim" />
      {k('1')}–{k('9')} choose a map, {k('A')}/{k('D')} pick a side, {timer && <>{k('P')} pause, </>}{k('M')} sound, {k('Ctrl')} + {k('Z')} undo
    </p>
  );
}

/** Attack or defense for the team whose turn it is. Can't be dismissed: a side has to be chosen. */
export function SideDialog({ step, setup, teams, mapNo, disabled, onChoose }: {
  step: Step | null; setup: Setup; teams: [string, string]; mapNo: number; disabled?: boolean; onChoose: (s: Side) => void;
}) {
  // keep the content while the dialog animates closed
  const last = useRef<Step | null>(null);
  if (step) last.current = step;
  const s = last.current;
  const m = s ? getMap(setup, s.map) : null;
  return (
    <Dialog open={!!step}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-describedby={undefined}
      >
        {s && m && s.team != null && (
          <>
            <div className="relative h-52">
              <MapArt map={m} kind="splash" watermark={false} className="absolute inset-0" />
              <div className="absolute inset-0 bg-linear-to-t from-popover via-popover/30 to-transparent" />
            </div>
            <div className="relative -mt-16 grid gap-1 px-6 pb-6">
              <p className="text-sm font-semibold" style={{ color: TEAMC[s.team] }}>{teams[s.team]} chooses a starting side</p>
              <DialogTitle className="text-4xl font-extrabold tracking-[-0.03em]">{m.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{mapNo > 0 ? `Map ${mapNo} in ` : ''}{m.loc}, sites {m.sites}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['atk', 'def'] as const).map(sd => (
                  <button
                    key={sd}
                    disabled={disabled}
                    onClick={() => onChoose(sd)}
                    className={cn(
                      'relative rounded-xl border border-white/15 bg-black/30 px-4 py-5 text-left transition-[border-color,background-color,scale] active:scale-[0.98] disabled:opacity-50',
                      sd === 'atk' ? 'hover:border-atk hover:bg-atk/10 focus-visible:border-atk' : 'hover:border-def hover:bg-def/10 focus-visible:border-def',
                    )}
                  >
                    <b className={cn('block text-2xl font-extrabold tracking-[0.04em]', sd === 'atk' ? 'text-atk' : 'text-def')}>{sd === 'atk' ? 'ATTACK' : 'DEFENSE'}</b>
                    <small className="text-sm text-muted-foreground">{sd === 'atk' ? 'Start on offense and plant the spike' : 'Start holding the sites'}</small>
                    <Kbd className="absolute top-3 right-3 bg-white/10 text-muted-foreground [@media(hover:none)]:hidden">{sd === 'atk' ? 'A' : 'D'}</Kbd>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MapCardProps {
  map: MapInfo;
  rec?: Rec;
  live: boolean;
  done: boolean;
  fresh: boolean;
  teams: [string, string];
  hasNotes: boolean;
  /** keyboard shortcut shown while the card can be chosen */
  hotkey?: string;
  action: 'Ban' | 'Pick';
  onAct?: () => void;
  onInfo?: () => void;
}

/** A map on the veto board. Every state has a static cue (stamp, grayscale, border), never motion alone. */
export function MapCard({ map: m, rec: r, live, done, fresh, teams, hasNotes, hotkey, action, onAct, onInfo }: MapCardProps) {
  const color = r?.team != null ? TEAMC[r.team] : r ? DECIDER : 'var(--dim)';
  const banned = r?.k === 'ban', chosen = r?.k === 'pick' || r?.k === 'decider', unplayed = done && !r;
  const stamp = r ? (banned ? 'BANNED' : r.k === 'pick' ? `MAP ${r.g} PICK` : `MAP ${r.g} DECIDER`) : unplayed ? 'UNPLAYED' : '';
  const status = r ? (banned ? `banned by ${teams[r.team!]}` : r.k === 'pick' ? `map ${r.g}, picked by ${teams[r.team!]}` : `map ${r.g}, decider`) : unplayed ? 'unplayed' : 'available';
  return (
    <div
      className={cn(
        'group/card relative isolate aspect-[3/4.3] overflow-hidden rounded-lg border border-white/10 bg-card transition-[border-color,box-shadow,opacity,translate] duration-200',
        banned && 'border-(--mc)/45',
        chosen && 'border-(--mc) shadow-[0_0_0_2px_var(--mc),0_20px_48px_-18px_var(--mc)] motion-safe:-translate-y-1',
        r?.k === 'decider' && 'motion-safe:animate-decider-glow',
        unplayed && 'opacity-40',
        live && '[@media(hover:hover)]:hover:border-(--tc) [@media(hover:hover)]:hover:shadow-[0_0_0_1px_var(--tc),0_18px_40px_-16px_var(--tc)] motion-safe:[@media(hover:hover)]:hover:-translate-y-1.5',
        fresh && banned && 'motion-safe:animate-shake',
        fresh && r?.k === 'pick' && 'motion-safe:animate-pop',
      )}
      style={vars({ '--mc': color })}
    >
      <MapArt map={m} className={cn('absolute inset-0 transition-[filter] duration-300', banned && 'brightness-35 grayscale', unplayed && 'grayscale')} />
      <div
        className={cn(
          'absolute inset-0 bg-linear-to-t from-[rgb(9_6_13/0.96)] from-8% via-[rgb(9_6_13/0.35)] via-50% to-[rgb(9_6_13/0.05)]',
          live && action === 'Ban' && '[@media(hover:hover)]:group-hover/card:from-[rgb(48_8_14/0.96)] [@media(hover:hover)]:group-hover/card:via-[rgb(48_8_14/0.35)]',
        )}
      />
      {/* the ban slash */}
      <div
        className={cn(
          'pointer-events-none absolute top-1/2 left-[-10%] z-[2] h-[3px] w-[120%] origin-left -rotate-55 bg-(--mc) shadow-[0_0_16px_var(--mc)] transition-[opacity,scale] duration-300',
          banned ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
        )}
      />
      <span className={cn('pointer-events-none absolute top-3 left-3 z-[2] max-w-[70%] truncate text-xs font-bold tracking-[0.08em] text-(--mc) uppercase transition-opacity', r?.team != null ? 'opacity-100' : 'opacity-0')}>
        {r?.team != null ? teams[r.team] : ''}
      </span>
      <div className={cn('pointer-events-none absolute inset-x-3 bottom-3 z-[2] transition-opacity', banned && 'opacity-55')}>
        <span className="text-xs text-white/75">{m.loc}</span>
        <h3 className="mt-0.5 text-xl leading-tight font-extrabold tracking-[-0.02em] sm:text-2xl">{m.name}</h3>
        {live && (
          <div className="mt-1.5 hidden flex-wrap gap-1 group-focus-within/card:flex [@media(hover:hover)]:group-hover/card:flex">
            <Badge variant="glass">Sites {m.sites}</Badge>
            {m.tag && <Badge variant="glass">{m.tag}</Badge>}
            {hasNotes && <Badge variant="glass"><NotebookPenIcon /> Notes</Badge>}
          </div>
        )}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-[42%] left-1/2 z-[2] -translate-1/2 rounded-md border-3 border-(--mc) bg-[rgb(13_10_18/0.72)] px-3 py-1 font-extrabold tracking-[0.12em] whitespace-nowrap text-(--mc) transition-[opacity,scale,rotate] duration-300 ease-[cubic-bezier(0.2,1.4,0.4,1)]',
          stamp ? 'scale-100 opacity-100' : 'scale-150 opacity-0',
          chosen ? 'rotate-0 text-sm' : '-rotate-8 text-lg',
        )}
      >
        {stamp}
      </div>
      {live && hotkey && <Kbd aria-hidden="true" className="absolute top-2 left-2 z-[4] border border-white/20 bg-black/60 text-foreground [@media(hover:none)]:hidden">{hotkey}</Kbd>}
      {onAct && (
        <button
          className="absolute inset-0 z-[3] rounded-[inherit] disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-(--tc,var(--pick))"
          disabled={!live}
          onClick={onAct}
          aria-label={live ? `${action} ${m.name}` : `${m.name}, ${status}`}
          aria-keyshortcuts={live && hotkey ? hotkey : undefined}
        />
      )}
      {onInfo && (
        <Button
          size="icon-sm"
          variant="glass"
          className="absolute top-2 right-2 z-[4] size-7 rounded-full transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/card:opacity-100 [@media(hover:hover)]:group-hover/card:opacity-100"
          onClick={onInfo}
          aria-label={`${m.name} details`}
        >
          <span className="text-xs font-bold">i</span>
        </Button>
      )}
    </div>
  );
}

export function TeamCard({ team, name, hist, active, logo = '' }: { team: TeamIdx; name: string; hist: Action[]; active: boolean; logo?: string }) {
  const bans = hist.filter(h => h.k === 'ban' && h.team === team).length;
  const picks = hist.filter(h => h.k === 'pick' && h.team === team).length;
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-card px-3 py-2.5 backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300 sm:px-4 sm:py-3',
        team === 1 && 'flex-row-reverse text-right lg:order-3',
        active && 'border-(--tc) bg-(--tc)/10 shadow-[0_0_0_1px_var(--tc),0_10px_36px_-12px_var(--tc)]',
      )}
      style={vars({ '--tc': TEAMC[team] })}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center overflow-hidden rounded-md text-sm font-extrabold text-ink sm:size-9 sm:text-base', logo ? 'bg-black/40' : 'bg-(--tc)')}>
        <TeamMark i={team} url={logo} />
      </span>
      <div className="min-w-0">
        <b className="block truncate text-base font-bold tracking-[-0.02em] sm:text-xl">{name}</b>
        <small className="text-xs text-muted-foreground tabular-nums">{bans} ban{bans === 1 ? '' : 's'}, {picks} pick{picks === 1 ? '' : 's'}</small>
      </div>
    </div>
  );
}

export function TurnBanner({ step, teams, timer, deadline, now, paused, setup: given, waiting, doneText = 'Building your match plan…' }: { step: Step | null; teams: [string, string]; timer: number; deadline: number; now: number; paused: number | null; setup?: Setup; waiting?: boolean; doneText?: string }) {
  const app = useApp();
  const setup = given ?? app.setup;
  let who: string, what: string, color: string;
  if (!step) { who = 'Veto complete'; what = doneText; color = DECIDER; }
  else if (step.k === 'decider' || step.team == null) { who = 'Decider'; what = `${getMap(setup, step.map).name} is the last map standing`; color = DECIDER; }
  else {
    who = teams[step.team];
    color = TEAMC[step.team];
    what = step.k === 'ban' ? 'Ban a map' : step.k === 'pick' ? 'Pick a map' : `Choose starting side on ${getMap(setup, step.map).name}`;
  }
  const left = paused != null ? paused : deadline ? Math.max(0, deadline - now) : timer * 1000;
  const low = deadline > 0 && left < 5000;
  return (
    <div className="col-span-2 lg:order-2 lg:col-span-1">
      <div
        key={`${step?.i ?? 'done'}:${step?.k}`}
        className="relative flex h-full items-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-white/8 py-3 pr-4 pl-5 backdrop-blur-xl before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--tc) motion-safe:animate-rise"
        style={vars({ '--tc': color })}
      >
        {timer > 0 && (
          <div className="relative size-11 shrink-0">
            <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
              <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-white/10" />
              <circle
                cx="22" cy="22" r="18" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray="113.1"
                className={cn('transition-[stroke-dashoffset] duration-100 ease-linear', low ? 'stroke-ban' : 'stroke-(--tc)')}
                style={{ strokeDashoffset: timer ? 113.1 * (1 - left / (timer * 1000)) : 0 }}
              />
            </svg>
            <span className={cn('absolute inset-0 grid place-items-center text-sm font-bold tabular-nums', low && 'text-ban motion-safe:animate-blink')}>
              {paused != null ? <PauseIcon className="size-3.5" /> : deadline ? Math.ceil(left / 1000) : timer}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-lg font-bold tracking-[-0.02em] text-(--tc) sm:text-xl">{who}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{paused != null ? 'Timer paused' : waiting && step?.team != null ? `Waiting for ${teams[step.team]}: ${what.toLowerCase()}` : what}</div>
        </div>
        <div className="ml-auto pl-2 text-xs tracking-[0.12em] whitespace-nowrap text-dim tabular-nums">{step ? `STEP ${step.i + 1}/${step.total}` : 'DONE'}</div>
      </div>
    </div>
  );
}

export function Timeline({ teams, hist, setup: given }: { teams: [string, string]; hist: Action[]; setup?: Setup }) {
  const app = useApp();
  const setup = given ?? app.setup;
  const ref = useRef<HTMLDivElement>(null);
  const p = plan(setup), n = hist.length;

  useEffect(() => {
    const tl = ref.current;
    const el = (tl?.querySelector('[data-now]') ?? tl?.lastElementChild) as HTMLElement | null;
    if (tl && el) tl.scrollTo({ left: el.offsetLeft - tl.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [n]);

  return (
    <div className="my-3 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pt-1 pb-3 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]" ref={ref}>
      {p.map((st, i) => {
        const h = hist[i];
        const name = h ? getMap(setup, h.map).name : '';
        const sub = h ? (h.k === 'side' && h.side ? `${sideLabel(h.side)} on ${name}` : name) : st.team != null ? teams[st.team].slice(0, 10) : 'Auto';
        const now = i === n;
        return (
          <div
            key={i}
            data-now={now || undefined}
            className={cn(
              'tl relative min-w-23 shrink-0 rounded-md border border-white/10 bg-card px-2.5 py-1.5 transition-[opacity,border-color,box-shadow]',
              i < n || now ? 'opacity-100' : 'opacity-60',
              i < n && 'done',
              now && 'border-(--tc) shadow-[0_0_0_1px_var(--tc)] after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:bg-(--tc) motion-safe:after:animate-pulse-line',
            )}
            style={vars({ '--tc': st.team != null ? TEAMC[st.team] : DECIDER })}
          >
            <span className={cn('flex items-center gap-1.5 text-xs font-bold tracking-[0.1em]', st.k === 'ban' ? 'text-ban' : st.k === 'side' ? 'text-def' : 'text-decider')}>
              <i className="size-2 rounded-[2px] bg-(--tc)" />{st.k.toUpperCase()}
            </span>
            <em key={sub} className="mt-0.5 block min-h-4.5 max-w-28 truncate text-sm not-italic">{sub}</em>
          </div>
        );
      })}
    </div>
  );
}
