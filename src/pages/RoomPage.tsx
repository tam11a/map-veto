import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ExternalLinkIcon, LinkIcon, Undo2Icon } from 'lucide-react';
import { ConfirmDialog, Panel, Segmented } from '../components/kit';
import { Board, MapCard, type Rec, SideDialog, SoundButton, TeamCard, Timeline, TurnBanner } from '../components/VetoView';
import { Button } from '../components/ui/button';
import { CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '../components/ui/item';
import { Label } from '../components/ui/label';
import { DECIDER, TEAMC } from '../data/maps';
import { confetti, vars } from '../lib/fx';
import { OVERLAY_DEFAULTS, type OverlayOptions, overlayQuery } from '../lib/overlay';
import { type Role, roomLinks, rememberToken, savedInvite, savedToken, useRoom } from '../lib/rooms';
import { copyText, payload, planPath } from '../lib/share';
import { cue, useSound } from '../lib/sound';
import { useTitle } from '../lib/useTitle';
import { curStep, games, getMap, remaining } from '../lib/veto';
import { useApp } from '../state';
import type { TeamIdx } from '../types';

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
  const [restart, setRestart] = useState(false);
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
      <div className="container grid justify-items-center gap-4 py-32 text-center">
        <h1 className="text-4xl font-extrabold tracking-[-0.03em]">{error ? 'Can’t open this room' : 'Joining the room…'}</h1>
        {error && <p className="max-w-[52ch] text-muted-foreground">{error}</p>}
        {error && <Button asChild variant="secondary"><Link to="/veto">Start a new veto</Link></Button>}
      </div>
    );
  }

  const openPlan = () => navigate(planPath(payload(S, room.veto)));
  const lastReal = [...hist].reverse().find(h => h.k !== 'decider');
  const canUndo = !!lastReal && (role === 'host' || (myTeam != null && lastReal.team === myTeam));
  const logoOf = (i: TeamIdx) => S.logos[S.teams[0] === teams[i] ? 0 : S.teams[1] === teams[i] ? 1 : i];
  const sideStep = step?.k === 'side' ? step : null;
  const seat = myTeam != null ? TEAMC[myTeam] : role === 'host' ? DECIDER : 'var(--mute)';

  return (
    <div className="container grid gap-0 pt-8 pb-16">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span
          data-role-badge
          className="inline-flex items-center gap-2 rounded-full border border-(--tc)/50 bg-(--tc)/10 px-3.5 py-1.5 text-sm font-semibold"
          style={vars({ '--tc': seat })}
        >
          <i className="size-2 rounded-full bg-(--tc) shadow-[0_0_0_3px_color-mix(in_srgb,var(--tc)_25%,transparent)]" />
          {role === 'host' ? 'You’re the host: you can act for both teams' : myTeam != null ? `You’re the captain of ${teams[myTeam]}` : 'Spectating'}
        </span>
        <span className="text-sm text-muted-foreground">
          Room <b className="font-bold tracking-[0.06em] text-foreground">{room.id}</b>
          {error && <em className="not-italic text-decider"> · reconnecting</em>}
        </span>
      </div>

      {role === 'host' && !room.done && <Invite id={room.id} teams={teams} />}

      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-[1fr_minmax(320px,auto)_1fr]">
        {([0, 1] as const).map(t => <TeamCard key={t} team={t} name={teams[t]} hist={hist} active={step?.team === t} logo={logoOf(t)} />)}
        <TurnBanner step={step} teams={teams} timer={S.timer} deadline={room.deadline} now={now} paused={null} setup={S} waiting={!!step && !mine} doneText="The match plan is ready to open" />
      </div>
      <Timeline teams={teams} hist={hist} setup={S} />
      <Board mode={live ? step!.k : 'idle'} color={step?.team != null ? TEAMC[step.team] : DECIDER}>
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
      </Board>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {room.done && <Button onClick={openPlan}>Open the match plan</Button>}
          {role && <Button variant="secondary" onClick={() => move({ type: 'undo' })} disabled={!canUndo || busy}><Undo2Icon /> Undo</Button>}
          {role === 'host' && <Button variant="ghost" disabled={!hist.length || busy} onClick={() => setRestart(true)}>Restart</Button>}
          <SoundButton sound={sound} />
        </div>
        <p className="text-sm text-muted-foreground">
          {room.done ? `Finished. ${games(hist).length} map${games(hist).length === 1 ? '' : 's'} to play.` : role ? 'Moves sync to everyone in the room within a second.' : 'This is a watch-only link.'}
        </p>
      </div>

      <ConfirmDialog open={restart} onOpenChange={setRestart} title="Restart the veto for everyone?" confirmLabel="Restart" onConfirm={() => move({ type: 'restart' })}>
        Every step is cleared for both captains and spectators, and the veto starts again from the first ban.
      </ConfirmDialog>
      <SideDialog
        step={sideStep && mine ? sideStep : null}
        setup={S}
        teams={teams}
        mapNo={sideStep ? games(hist).findIndex(g => g.map === sideStep.map) + 1 : 0}
        disabled={busy}
        onChoose={sd => move({ type: 'side', side: sd })}
      />
    </div>
  );
}

/** The host's invite panel: one link per seat. Tokens never appear in the page URL. */
function Invite({ id, teams }: { id: string; teams: [string, string] }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(true);
  const [ov, setOv] = useState<OverlayOptions>(OVERLAY_DEFAULTS);
  const tokens = savedInvite(id);
  const links = tokens ? roomLinks(id, tokens) : null;
  if (!links) return null;
  const copy = async (label: string, url: string) => toast((await copyText(url)) ? `${label} copied` : 'Could not copy');
  const rows: [string, string, string][] = [
    [`${teams[0]} captain`, links.a, TEAMC[0]],
    [`${teams[1]} captain`, links.b, TEAMC[1]],
    ['Spectators', links.watch, 'var(--mute)'],
    ['Stream overlay for OBS', links.overlay + overlayQuery(ov), DECIDER],
  ];
  const set = (p: Partial<OverlayOptions>) => setOv(o => ({ ...o, ...p }));
  const preview = links.overlay + overlayQuery(ov) + (overlayQuery(ov) ? '&' : '?') + 'bg=1';
  const check = (key: 'maps' | 'title', label: string) => (
    <div className="flex items-center gap-2">
      <Checkbox id={`ov-${key}`} checked={ov[key]} onCheckedChange={v => set({ [key]: v === true })} />
      <Label htmlFor={`ov-${key}`} className="text-sm">{label}</Label>
    </div>
  );
  return (
    <Panel data-invite className="mb-4 grid gap-4 py-5" aria-label="Invite links">
      <CardHeader className="px-5">
        <CardTitle className="text-xl">Invite the captains</CardTitle>
        <CardDescription>Send each captain their own link. Anyone with a captain link can act for that team, so share them privately.</CardDescription>
        <CardAction><Button size="sm" variant="ghost" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Hide' : 'Show links'}</Button></CardAction>
      </CardHeader>
      {open && (
        <CardContent className="px-5">
        <ItemGroup className="gap-1.5">
          {rows.map(([label, url, col]) => (
            <Item key={label} role="listitem" variant="outline" size="sm" className="flex-nowrap border-white/10 bg-black/25 py-1.5 pr-1.5 pl-3" style={vars({ '--tc': col })}>
              <ItemMedia><i className="size-2 shrink-0 rounded-[2px] bg-(--tc)" /></ItemMedia>
              <ItemContent className="min-w-0 gap-0 md:flex-row md:items-center md:gap-3">
                <ItemTitle className="font-semibold md:w-52 md:shrink-0"><span className="truncate">{label}</span></ItemTitle>
                <ItemDescription className="hidden min-w-0 md:block"><code className="block truncate text-xs">{url.replace(/\?t=.+$/, '?t=…')}</code></ItemDescription>
              </ItemContent>
              <ItemActions><Button size="sm" variant="secondary" onClick={() => copy(label + ' link', url)}><LinkIcon /> Copy</Button></ItemActions>
            </Item>
          ))}
          <Item role="listitem" variant="outline" size="sm" className="border-white/10 bg-black/25 px-3 py-2.5" aria-label="Overlay layout">
            <ItemContent className="gap-2 md:flex-row md:items-center md:gap-3">
            <ItemTitle className="font-semibold md:w-52 md:shrink-0">Overlay layout</ItemTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Segmented<'bottom' | 'top'> label="Position" size="sm" value={ov.pos} onChange={pos => set({ pos })} options={[{ value: 'bottom', label: 'Bottom' }, { value: 'top', label: 'Top' }]} />
              <Segmented<'full' | 'row'> label="Style" size="sm" value={ov.compact ? 'row' : 'full'} onChange={v => set({ compact: v === 'row' })} options={[{ value: 'full', label: 'Full' }, { value: 'row', label: 'One row' }]} />
              {check('maps', 'Maps')}
              {check('title', 'Title')}
              <Button asChild size="sm" variant="ghost"><a href={preview} target="_blank" rel="noreferrer"><ExternalLinkIcon /> Preview</a></Button>
            </div>
            </ItemContent>
          </Item>
        </ItemGroup>
        </CardContent>
      )}
    </Panel>
  );
}
