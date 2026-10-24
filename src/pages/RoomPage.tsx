import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { MapArt } from '../components/MapArt';
import { Overlay } from '../components/Overlay';
import { MapCard, type Rec, TeamCard, Timeline, TurnBanner } from '../components/VetoView';
import { GOLD, TEAMC } from '../data/maps';
import { confetti, cx, vars } from '../lib/fx';
import { type Role, roomLinks, rememberToken, savedInvite, savedToken, useRoom } from '../lib/rooms';
import { copyText, payload, planPath } from '../lib/share';
import { cue, setSound, useSound } from '../lib/sound';
import { useTitle } from '../lib/useTitle';
import { curStep, games, getMap, remaining } from '../lib/veto';
import { useApp } from '../state';
import type { Side, TeamIdx } from '../types';

const ROLE_TEAM: Record<Role, TeamIdx | null> = { a: 0, b: 1, host: null };

/** A veto shared across devices: each captain acts on their own turns, everyone else watches. */
export function RoomPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useApp();

  // a ?t= token in the link is remembered, then removed from the address bar so it isn't shared by accident
  const [token] = useState(() => {
    const t = params.get('t') ?? '';
    if (t) rememberToken(id, t);
    return t || savedToken(id);
  });
  useEffect(() => {
    if (params.has('t')) { params.delete('t'); setParams(params, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { room, role, error, send } = useRoom(id, token);
  useTitle(room ? `${room.veto.teams[0]} vs ${room.veto.teams[1]}` : 'Veto room');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const [busy, setBusy] = useState(false);
  const sound = useSound();

  const S = room?.setup, hist = room?.veto.hist ?? [], teams = room?.veto.teams ?? ['', ''] as [string, string];
  const step = S ? curStep(S, hist) : null;
  const myTeam = role ? ROLE_TEAM[role] : null;
  const mine = !!step && step.team != null && (role === 'host' || myTeam === step.team);
  const live = mine && (step!.k === 'ban' || step!.k === 'pick');

  // cues for every new move, and confetti once at the end
  const seen = useRef(-1);
  useEffect(() => {
    if (!room) return;
    if (seen.current >= 0 && hist.length > seen.current) {
      const h = hist[hist.length - 1];
      cue(h.k === 'ban' ? 'ban' : h.k === 'pick' ? 'pick' : h.k === 'decider' ? 'decider' : 'side');
      if (room.done) { cue('done'); confetti(); }
    }
    seen.current = hist.length;
  }, [hist.length, room?.done]); // eslint-disable-line react-hooks/exhaustive-deps
  const secLeft = room?.deadline ? Math.ceil((room.deadline - now) / 1000) : 0;
  useEffect(() => { if (mine && secLeft > 0 && secLeft <= 5) cue('tick'); }, [secLeft, mine]);

  const move = async (m: Parameters<typeof send>[0]) => {
    if (busy) return;
    setBusy(true);
    const err = await send(m);
    setBusy(false);
    if (err) toast(err);
  };

  const rec = useMemo(() => {
    const r: Record<string, Rec> = {};
    let gi = 0;
    for (const h of hist) {
      if (h.k === 'ban') r[h.map] = { k: 'ban', team: h.team };
      if (h.k === 'pick' || h.k === 'decider') r[h.map] = { k: h.k, team: h.team, g: ++gi };
    }
    return r;
  }, [hist]);

  // keyboard: same keys as the local veto
  const open = live && S ? S.pool.filter(x => remaining(S, hist).includes(x)) : [];
  const keys = useRef({ open, move, side: false });
  keys.current = { open, move, side: mine && step?.k === 'side' };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keys.current, key = e.key.toLowerCase();
      if (/^[0-9]$/.test(key) && k.open.length) {
        const map = k.open[key === '0' ? 9 : Number(key) - 1];
        if (map) k.move({ type: 'act', map });
      } else if (k.side && (key === 'a' || key === 'd')) k.move({ type: 'side', side: key === 'a' ? 'atk' : 'def' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!room || !S) {
    return (
      <div className="container room-wait">
        <h1>{error ? 'Can’t open this room' : 'Joining the room…'}</h1>
        {error && <p>{error}</p>}
        {error && <Link className="btn" to="/veto">Start a new veto</Link>}
      </div>
    );
  }

  const openPlan = () => navigate(planPath(payload(S, room.veto)));
  const lastReal = [...hist].reverse().find(h => h.k !== 'decider');
  const canUndo = !!lastReal && (role === 'host' || (myTeam != null && lastReal.team === myTeam));
  const logoOf = (i: TeamIdx) => S.logos[S.teams[0] === teams[i] ? 0 : S.teams[1] === teams[i] ? 1 : i];
  const sideStep = step?.k === 'side' ? step : null;

  return (
    <div className="container page-app room">
      <div className="room-bar">
        <span className={cx('room-role', role && `r-${role}`)} style={vars({ '--tc': myTeam != null ? TEAMC[myTeam] : role === 'host' ? GOLD : 'var(--mute)' })}>
          <i />{role === 'host' ? 'You’re the host: you can act for both teams' : myTeam != null ? `You’re the captain of ${teams[myTeam]}` : 'Spectating'}
        </span>
        <span className="room-id">Room <b>{room.id}</b>{error && <em> · reconnecting</em>}</span>
      </div>

      {role === 'host' && !room.done && <Invite id={room.id} teams={teams} />}

      <div className="vbar">
        {([0, 1] as const).map(t => <TeamCard key={t} team={t} name={teams[t]} hist={hist} active={step?.team === t} logo={logoOf(t)} />)}
        <TurnBanner step={step} teams={teams} timer={S.timer} deadline={room.deadline} now={now} paused={null} setup={S} waiting={!!step && !mine} doneText="The match plan is ready to open" />
      </div>
      <Timeline teams={teams} hist={hist} setup={S} />
      <div className="grid" data-mode={live ? step!.k : 'idle'} style={vars({ '--tc': step?.team != null ? TEAMC[step.team] : GOLD })}>
        {S.pool.map(mapId => (
          <MapCard
            key={mapId}
            map={getMap(S, mapId)}
            rec={rec[mapId]}
            live={live && !rec[mapId] && !busy}
            done={!step}
            fresh={hist[hist.length - 1]?.map === mapId && hist[hist.length - 1]?.k !== 'side'}
            teams={teams}
            hasNotes={false}
            hotkey={open.includes(mapId) && open.indexOf(mapId) < 10 ? String((open.indexOf(mapId) + 1) % 10) : undefined}
            action={step?.k === 'pick' ? 'Pick' : 'Ban'}
            onAct={() => move({ type: 'act', map: mapId })}
          />
        ))}
      </div>

      <div className="vfoot">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {room.done && <button className="btn primary" onClick={openPlan}>Open the match plan</button>}
          {role && <button className="btn" onClick={() => move({ type: 'undo' })} disabled={!canUndo || busy}><Icon.undo /> Undo</button>}
          {role === 'host' && <button className="btn ghost" disabled={!hist.length || busy} onClick={() => { if (confirm('Restart the veto for everyone?')) move({ type: 'restart' }); }}>Restart</button>}
          <button className="btn ghost" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Sound on. Turn off' : 'Sound off. Turn on'}>{sound ? <Icon.sound /> : <Icon.mute />}</button>
        </div>
        <div className="hint" style={{ alignSelf: 'center' }}>
          {room.done ? `Finished. ${games(hist).length} map${games(hist).length === 1 ? '' : 's'} to play.` : role ? 'Moves sync to everyone in the room within a second.' : 'This is a watch-only link.'}
        </div>
      </div>

      <Overlay open={!!sideStep && mine} labelledBy="room-side-title">
        {sideStep && (
          <>
            <div className="hero-art"><MapArt map={getMap(S, sideStep.map)} kind="splash" watermark={false} /></div>
            <div className="body">
              <div className="kicker" style={{ color: sideStep.team != null ? TEAMC[sideStep.team] : undefined }}>{sideStep.team != null && teams[sideStep.team]} chooses a starting side</div>
              <h2 id="room-side-title">{getMap(S, sideStep.map).name}</h2>
              <div className="sides">
                {(['atk', 'def'] as Side[]).map(sd => (
                  <button key={sd} className={sd} disabled={busy} onClick={() => move({ type: 'side', side: sd })}>
                    <b>{sd === 'atk' ? 'ATTACK' : 'DEFENSE'}</b><small>{sd === 'atk' ? 'Start on offense and plant the spike' : 'Start holding the sites'}</small><kbd>{sd === 'atk' ? 'A' : 'D'}</kbd>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Overlay>
    </div>
  );
}

/** The host's invite panel: one link per seat. Tokens never appear in the page URL. */
function Invite({ id, teams }: { id: string; teams: [string, string] }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(true);
  const tokens = savedInvite(id);
  const links = tokens ? roomLinks(id, tokens) : null;
  if (!links) return null;
  const copy = async (label: string, url: string) => toast((await copyText(url)) ? `${label} copied` : 'Could not copy');
  const rows: [string, string, string][] = [
    [`${teams[0]} captain`, links.a, TEAMC[0]],
    [`${teams[1]} captain`, links.b, TEAMC[1]],
    ['Spectators', links.watch, 'var(--mute)'],
    ['Stream overlay (OBS browser source)', links.overlay, GOLD],
  ];
  return (
    <section className={cx('invite', !open && 'closed')} aria-label="Invite links">
      <header>
        <h2>Invite the captains</h2>
        <p className="hint">Send each captain their own link. Anyone with a captain link can act for that team, so share them privately.</p>
        <button className="btn ghost sm" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Hide' : 'Show links'}</button>
      </header>
      {open && (
        <ul>
          {rows.map(([label, url, col]) => (
            <li key={label} style={vars({ '--tc': col })}>
              <span><i />{label}</span>
              <code>{url.replace(/\?t=.+$/, '?t=…')}</code>
              <button className="btn sm" onClick={() => copy(label + ' link', url)}><Icon.link /> Copy</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
