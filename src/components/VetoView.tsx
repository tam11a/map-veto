import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GOLD, TEAMC } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { type Step, curStep, games, getMap, plan, remaining, sideLabel } from '../lib/veto';
import { useApp } from '../state';
import type { Action, ActionKind, MapInfo, Side, TeamIdx, VetoState } from '../types';
import { Icon } from './Icons';
import { MapArt } from './MapArt';
import { Overlay } from './Overlay';

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

  // turn timer
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const s = curStep(S, hist);
    setDeadline(S.timer && s && s.k !== 'decider' && !replay ? Date.now() + S.timer * 1000 : 0);
    setNow(Date.now());
  }, [hist.length]); // eslint-disable-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? '';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(tag)) {
        e.preventDefault();
        undoRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // keep the side sheet's content while it fades out
  const lastSide = useRef<Step | null>(null);
  if (step?.k === 'side') lastSide.current = step;
  const sideStep = lastSide.current;

  return (
    <>
      <div className="vbar rise" style={vars({ '--i': 0 })}>
        {([0, 1] as const).map(t => <TeamCard key={t} team={t} name={teams[t]} hist={hist} active={step?.team === t} />)}
        <TurnBanner step={step} teams={teams} timer={S.timer} deadline={deadline} now={now} />
      </div>
      <div className="rise" style={vars({ '--i': 1 })}><Timeline teams={teams} hist={hist} /></div>
      <div className="grid rise" data-mode={live ? step!.k : 'idle'} style={vars({ '--i': 2, '--tc': step?.team != null ? TEAMC[step.team] : GOLD })}>
        {S.pool.map(id => (
          <MapCard
            key={id}
            map={getMap(S, id)}
            rec={rec[id]}
            live={live && !rec[id]}
            done={!step}
            fresh={fresh === id}
            teams={teams}
            hasNotes={!!S.notes[id]}
            action={step?.k === 'pick' ? 'Pick' : 'Ban'}
            onAct={() => act(id)}
            onInfo={() => openInfo(id)}
          />
        ))}
      </div>
      <div className="vfoot">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={undo} disabled={!hist.length || !!replay}><Icon.undo /> Undo</button>
          <button className="btn ghost" disabled={!!replay} onClick={() => { if (confirm('Restart the veto from the first step?')) updateHist(() => []); }}>Restart</button>
          <button className="btn ghost" onClick={onExit}>Back to setup</button>
        </div>
        <div className="hint" style={{ alignSelf: 'center' }}>Press <kbd>Ctrl</kbd> + <kbd>Z</kbd> to undo. Use <kbd>i</kbd> on a card for map details.</div>
      </div>
      {replay && (
        <div className="replaying" role="status"><i />REPLAYING VETO
          <button className="btn ghost sm" onClick={onSkip}>Skip</button>
        </div>
      )}
      <Overlay open={step?.k === 'side'} labelledBy="side-title">
        {sideStep && sideStep.team != null && (
          <>
            <div className="hero-art"><MapArt map={getMap(S, sideStep.map)} kind="splash" watermark={false} /></div>
            <div className="body">
              <div className="kicker" style={{ color: TEAMC[sideStep.team] }}>{teams[sideStep.team]} chooses a starting side</div>
              <h2 id="side-title">{getMap(S, sideStep.map).name}</h2>
              <div className="hint">
                Map {games(hist).findIndex(g => g.map === sideStep.map) + 1} in {getMap(S, sideStep.map).loc}, sites {getMap(S, sideStep.map).sites}
              </div>
              <div className="sides">
                <button className="atk" disabled={!!replay} onClick={() => chooseSide('atk')}><b>ATTACK</b><small>Start on offense and plant the spike</small></button>
                <button className="def" disabled={!!replay} onClick={() => chooseSide('def')}><b>DEFENSE</b><small>Start holding the sites</small></button>
              </div>
            </div>
          </>
        )}
      </Overlay>
    </>
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
  action: 'Ban' | 'Pick';
  onAct?: () => void;
  onInfo?: () => void;
}

/** A map on the veto board. State lives in classes driven by transitions; the action is a real button. */
export function MapCard({ map: m, rec: r, live, done, fresh, teams, hasNotes, action, onAct, onInfo }: MapCardProps) {
  const color = r?.team != null ? TEAMC[r.team] : r ? GOLD : 'var(--dim)';
  const stamp = r ? (r.k === 'ban' ? 'BANNED' : r.k === 'pick' ? `MAP ${r.g} PICK` : `MAP ${r.g} DECIDER`) : done ? 'UNPLAYED' : '';
  const status = r ? (r.k === 'ban' ? `banned by ${teams[r.team!]}` : r.k === 'pick' ? `map ${r.g}, picked by ${teams[r.team!]}` : `map ${r.g}, decider`) : done ? 'unplayed' : 'available';
  return (
    <div
      className={cx('mcard', r?.k === 'ban' && 'banned', r?.k === 'pick' && 'picked', r?.k === 'decider' && 'decider', done && !r && 'unplayed', live && 'live')}
      data-fresh={fresh || undefined}
      style={vars({ '--mc': color })}
    >
      <MapArt map={m} />
      <div className="shade" />
      <span className="by">{r?.team != null ? teams[r.team] : ''}</span>
      <div className="meta">
        <span className="loc">{m.loc}</span>
        <h3>{m.name}</h3>
        <div className="det">
          <span>Sites {m.sites}</span>
          {m.tag && <span>{m.tag}</span>}
          {hasNotes && <span><Icon.note /> Notes</span>}
        </div>
      </div>
      <div className="stamp" aria-hidden="true">{stamp}</div>
      {onAct && (
        <button className="mcard-hit" disabled={!live} onClick={onAct} aria-label={live ? `${action} ${m.name}` : `${m.name}, ${status}`} />
      )}
      {onInfo && <button className="info" onClick={onInfo} aria-label={`${m.name} details`}>i</button>}
    </div>
  );
}

export function TeamCard({ team, name, hist, active }: { team: TeamIdx; name: string; hist: Action[]; active: boolean }) {
  const bans = hist.filter(h => h.k === 'ban' && h.team === team).length;
  const picks = hist.filter(h => h.k === 'pick' && h.team === team).length;
  return (
    <div className={cx('tmc', team === 1 && 'r', active && 'active')} style={vars({ '--tc': TEAMC[team], order: team ? 3 : 1 })}>
      <span className="tag" style={{ background: TEAMC[team] }}>{team ? 'B' : 'A'}</span>
      <div><b>{name}</b><small>{bans} ban{bans === 1 ? '' : 's'}, {picks} pick{picks === 1 ? '' : 's'}</small></div>
    </div>
  );
}

function TurnBanner({ step, teams, timer, deadline, now }: { step: Step | null; teams: [string, string]; timer: number; deadline: number; now: number }) {
  const { setup } = useApp();
  let who: string, what: string, color: string;
  if (!step) { who = 'Veto complete'; what = 'Building your match plan…'; color = GOLD; }
  else if (step.k === 'decider' || step.team == null) { who = 'Decider'; what = `${getMap(setup, step.map).name} is the last map standing`; color = GOLD; }
  else {
    who = teams[step.team];
    color = TEAMC[step.team];
    what = step.k === 'ban' ? 'Ban a map' : step.k === 'pick' ? 'Pick a map' : `Choose starting side on ${getMap(setup, step.map).name}`;
  }
  const left = deadline ? Math.max(0, deadline - now) : timer * 1000;
  return (
    <div id="turn" className={cx(timer > 0 && 'timed')} style={{ order: 2 }}>
      <div className="turn-in" key={`${step?.i ?? 'done'}:${step?.k}`} style={vars({ '--tc': color })}>
        <div className={cx('ring', deadline > 0 && left < 5000 && 'low')}>
          <svg viewBox="0 0 44 44">
            <circle className="trk" cx="22" cy="22" r="18" />
            <circle className="prog" cx="22" cy="22" r="18" style={{ strokeDashoffset: timer ? 113.1 * (1 - left / (timer * 1000)) : 0 }} />
          </svg>
          <span className="sec">{deadline ? Math.ceil(left / 1000) : timer}</span>
        </div>
        <div style={{ minWidth: 0 }}><div className="who">{who}</div><div className="what">{what}</div></div>
        <div className="stepno">{step ? `STEP ${step.i + 1}/${step.total}` : 'DONE'}</div>
      </div>
    </div>
  );
}

function Timeline({ teams, hist }: { teams: [string, string]; hist: Action[] }) {
  const { setup } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const p = plan(setup), n = hist.length;

  useEffect(() => {
    const tl = ref.current;
    const el = (tl?.querySelector('.tl.now') ?? tl?.lastElementChild) as HTMLElement | null;
    if (tl && el) tl.scrollTo({ left: el.offsetLeft - tl.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [n]);

  return (
    <div className="timeline" ref={ref}>
      {p.map((st, i) => {
        const h = hist[i];
        const name = h ? getMap(setup, h.map).name : '';
        const sub = h ? (h.k === 'side' && h.side ? `${sideLabel(h.side)} on ${name}` : name) : st.team != null ? teams[st.team].slice(0, 10) : 'Auto';
        return (
          <div key={i} className={cx('tl', st.k, i < n && 'done', i === n && 'now')} style={vars({ '--tc': st.team != null ? TEAMC[st.team] : GOLD })}>
            <span><i />{st.k.toUpperCase()}</span>
            <em key={sub}>{sub}</em>
          </div>
        );
      })}
    </div>
  );
}
