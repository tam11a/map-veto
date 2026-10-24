import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckIcon, DiamondIcon, NotebookPenIcon, PlayIcon } from 'lucide-react';
import { LogoMark } from '@/brand/Logo';
import { Panel, Segmented } from '@/components/kit';
import { MapArt } from '@/components/MapArt';
import { Button } from '@/components/ui/button';
import { COMPETITIVE_POOL, FORMATS, DECIDER, MAPS, TEAMC } from '@/data/maps';
import { vars } from '@/lib/fx';
import { useCatalog } from '@/lib/rotation';
import { useTitle } from '@/lib/useTitle';
import { cn } from '@/lib/utils';
import { genSeq, other, sortPool } from '@/lib/veto';
import { useApp } from '@/state';
import type { Action, Format, TeamIdx } from '@/types';

const mapById = (id: string) => MAPS.find(m => m.id === id)!;

export function Landing() {
  useTitle();
  return (
    <>
      <VetoWall />
      <FormatExplainer />
      <Roles />
      <PoolPreview />
      <section className="container pt-8 pb-4">
        <Panel className="grid justify-items-center gap-5 px-6 py-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Both captains ready?</h2>
          <Button asChild size="lg"><Link to="/veto">Start a veto</Link></Button>
        </Panel>
      </section>
    </>
  );
}

/** Section heading with an optional lead and a control on the right. */
function SectionHead({ title, lead, aside }: { title: ReactNode; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">{title}</h2>
        {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ================= hero: the broadcast veto wall ================= */
const TEAMS = ['Phantoms', 'Vandals'] as const;
const WALL = ['abyss', 'bind', 'corrode', 'haven', 'lotus', 'summit', 'sunset'];
const PLAY: Action[] = [
  { k: 'ban', team: 0, map: 'bind' },
  { k: 'ban', team: 1, map: 'abyss' },
  { k: 'pick', team: 0, map: 'haven' },
  { k: 'pick', team: 1, map: 'summit' },
  { k: 'ban', team: 0, map: 'corrode' },
  { k: 'ban', team: 1, map: 'lotus' },
  { k: 'decider', team: null, map: 'sunset' },
];

function VetoWall() {
  const [n, setN] = useState(0);
  const [run, setRun] = useState(0);
  // null = the scripted demo plays; an array = the visitor is running the veto by clicking the wall
  const [mine, setMine] = useState<Action[] | null>(null);

  // plays once on load; Replay runs it again
  useEffect(() => {
    if (mine || n >= PLAY.length) return;
    const t = setTimeout(() => setN(x => x + 1), n === 0 ? 900 : 1100);
    return () => clearTimeout(t);
  }, [n, run, mine]);

  const hist = mine ?? PLAY.slice(0, n);
  const done = hist.length >= PLAY.length, next = PLAY[hist.length];
  const left = WALL.filter(id => !hist.some(h => h.map === id));
  // in try mode the decider falls into place on its own
  useEffect(() => {
    if (!mine || next?.k !== 'decider') return;
    const t = setTimeout(() => setMine(h => (h ? [...h, { k: 'decider', team: null, map: left[0] }] : h)), 700);
    return () => clearTimeout(t);
  }, [mine, next?.k]); // eslint-disable-line react-hooks/exhaustive-deps

  const rec: Record<string, { k: Action['k']; team: TeamIdx | null; g?: number }> = {};
  let g = 0;
  hist.forEach(a => { rec[a.map] = { k: a.k, team: a.team, g: a.k === 'ban' ? undefined : ++g }; });
  const name = (id: string) => mapById(id).name;
  const played = hist.filter(a => a.k !== 'ban').map(a => name(a.map));

  const status = done
    ? `${played.slice(0, -1).join(', ')}, then ${played[played.length - 1]} as the decider`
    : next.team == null ? `${name(left[0])} is the last map standing` : mine ? `${TEAMS[next.team]}: click a map to ${next.k}` : `${TEAMS[next.team]} to ${next.k}`;
  const choose = (id: string) => {
    if (!mine || !next || next.team == null || rec[id]) return;
    setMine([...mine, { k: next.k, team: next.team, map: id }]);
  };

  return (
    <section className="relative isolate flex h-[clamp(660px,100svh,960px)] flex-col justify-end overflow-hidden max-md:h-auto max-md:min-h-svh">
      {/* the wall: one slice per map */}
      <div className="absolute inset-0 -z-20 grid grid-cols-7" aria-hidden={!mine}>
        {WALL.map(id => {
          const m = mapById(id), r = rec[id];
          const mc = r?.team != null ? TEAMC[r.team] : DECIDER;
          const tag = !r ? '' : r.k === 'ban' ? `${TEAMS[r.team!]} ban` : r.k === 'pick' ? `Map ${r.g}  ${TEAMS[r.team!]}` : `Map ${r.g}  Decider`;
          const open = !!mine && !r && !!next && next.team != null;
          const chosen = r?.k === 'pick' || r?.k === 'decider';
          return (
            <div
              key={id}
              data-slice={r?.k ?? 'open'}
              className="group/slice relative overflow-hidden border-r-2 border-ink last:border-r-0"
              style={vars({ '--mc': mc, '--tc': next?.team != null ? TEAMC[next.team] : DECIDER })}
            >
              <MapArt
                map={m}
                kind="tall"
                watermark={false}
                className={cn(
                  'absolute inset-0 brightness-80 transition-[filter] duration-300',
                  r?.k === 'ban' && 'brightness-28 grayscale',
                  chosen && 'brightness-105 saturate-110',
                  r?.k === 'decider' && 'shadow-[inset_0_0_0_2px_var(--decider)]',
                  open && '[@media(hover:hover)]:group-hover/slice:brightness-110',
                )}
              />
              {/* top bar for picks, the slash for bans */}
              <span className={cn('absolute inset-x-0 top-0 z-[2] h-1.5 transition-[opacity,background-color] duration-300', open ? 'bg-(--tc) opacity-0 group-has-[button:focus-visible]/slice:opacity-100 [@media(hover:hover)]:group-hover/slice:opacity-100' : 'bg-(--mc)', chosen ? 'opacity-100' : !open && 'opacity-0')} />
              <span className={cn('absolute top-1/2 left-1/2 z-[2] h-[140%] w-1 -translate-1/2 rotate-24 bg-(--mc) shadow-[0_0_24px_var(--mc)] transition-opacity duration-300', r?.k === 'ban' ? 'opacity-90' : 'opacity-0')} />
              <span
                className={cn(
                  'absolute top-31 left-1/2 z-[2] -translate-x-1/2 rotate-180 text-[clamp(1.5rem,3.2vw,2.75rem)] font-extrabold tracking-[0.02em] whitespace-nowrap uppercase [text-shadow:0_2px_24px_rgb(0_0_0/0.6)] [writing-mode:vertical-rl] transition-colors',
                  r?.k === 'ban' ? 'text-white/30' : 'text-white/95',
                )}
              >
                {m.name}
              </span>
              {tag && (
                <span className="absolute top-22 left-2 z-[2] max-w-[calc(100%-16px)] truncate rounded-full border border-white/12 bg-[rgb(12_9_18/0.55)] px-2.5 py-1 text-xs font-bold tracking-[0.06em] whitespace-pre text-(--mc) uppercase backdrop-blur-md motion-safe:animate-rise">
                  {tag}
                </span>
              )}
              {open && <button className="absolute inset-0 z-[3] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring" onClick={() => choose(id)} aria-label={`${next.k === 'ban' ? 'Ban' : 'Pick'} ${m.name} for ${TEAMS[next.team!]}`} />}
            </div>
          );
        })}
      </div>
      {/* scrim: dark under the headline, open through the middle, tinted ember and velvet */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 70% at 0% 100%, color-mix(in srgb, var(--ember) 70%, transparent), transparent 70%),'
            + 'radial-gradient(55% 70% at 100% 85%, color-mix(in srgb, var(--velvet) 75%, transparent), transparent 70%),'
            + 'linear-gradient(0deg, var(--range) 3%, rgb(13 10 18 / 0.84) 30%, rgb(13 10 18 / 0.18) 60%, rgb(13 10 18 / 0.6) 100%)',
        }}
      />

      {/* the copy lets clicks through to the wall, except on its own controls */}
      <div className="pointer-events-none container z-[3] flex flex-col justify-between gap-8 pt-48 pb-16 md:flex-row md:items-end">
        <div>
          <h1 className="max-w-[12ch] text-[clamp(3rem,6vw,5.25rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance motion-safe:animate-rise">
            Run the veto like it’s the grand final.
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-[#d6cfdd] motion-safe:animate-rise sm:text-xl">
            Bans, picks, sides and a decider for Bo1 to Bo5. When it’s done, your whole team gets the plan as an image or a link.
          </p>
          <div className="pointer-events-auto mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/veto">Start a veto</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link to="/maps">Browse maps</Link></Button>
          </div>
        </div>
        <Panel className="pointer-events-auto w-full shrink-0 p-4 text-sm text-muted-foreground md:w-80" aria-label="Example veto status">
          <p><b className="font-semibold" style={{ color: TEAMC[0] }}>{TEAMS[0]}</b> vs <b className="font-semibold" style={{ color: TEAMC[1] }}>{TEAMS[1]}</b>, best of 3</p>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {PLAY.map((a, i) => (
              <i key={i} className={cn('h-1 flex-1 rounded-sm transition-colors duration-300', i < hist.length ? 'bg-(--tc)' : 'bg-white/12')} style={vars({ '--tc': a.team != null ? TEAMC[a.team] : DECIDER })} />
            ))}
          </div>
          <div key={hist.length} className="mt-3 flex flex-col gap-1 border-t border-white/12 pt-3 text-base font-medium text-foreground motion-safe:animate-rise" role="status">
            <em className="text-xs font-bold tracking-[0.1em] text-dim uppercase not-italic tabular-nums">{done ? 'Veto complete' : `Step ${hist.length + 1} of ${PLAY.length}`}</em>
            {status}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 empty:hidden">
            {done && !mine && <Button size="sm" variant="secondary" onClick={() => { setN(0); setRun(r => r + 1); }}><PlayIcon /> Replay</Button>}
            {(!mine || done) && <Button size="sm" variant="secondary" onClick={() => { setMine([]); setN(PLAY.length); }}>{mine ? 'Try again' : 'Try it yourself'}</Button>}
            {mine && !done && <Button size="sm" variant="ghost" onClick={() => { setMine(null); setN(0); setRun(r => r + 1); }}>Watch the demo</Button>}
          </div>
        </Panel>
      </div>
    </section>
  );
}

/* ================= formats, step by step ================= */
const FORMAT_RULE: Record<Format, string> = {
  1: 'Teams alternate bans until one map is left. That map is played, and the team that didn’t make the last ban picks the side.',
  2: 'Four bans thin the pool, then each team picks a map. The opponent of each picker chooses sides. One map is left unplayed.',
  3: 'Two bans, two picks, two more bans. The last map standing is the decider for map 3.',
  5: 'Two bans, then the teams alternate four picks. The last map standing is the decider for map 5.',
};

/** Ban/pick chips for a format; also used by the guide page. */
export function SeqChips({ fmt, n = 7 }: { fmt: Format; n?: number }) {
  const seq = genSeq(fmt, n), picks = seq.filter(s => s.t === 'pick').length, left = n - seq.length;
  const decider = left === 1 && picks < fmt;
  const chip = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-[0.04em]';
  return (
    <div className="flex flex-wrap gap-1.5">
      {seq.map((s, i) => (
        <span key={i} className={cn(chip, s.t === 'ban' ? 'bg-ban/15 text-ban' : 'bg-decider/18 text-decider')}>
          <i className="size-1.5 rounded-full" style={{ background: TEAMC[s.team] }} />{s.t === 'ban' ? 'BAN' : 'PICK'}
        </span>
      ))}
      {decider && <span className={cn(chip, 'bg-decider text-ink')}>DECIDER</span>}
      {!decider && left > 0 && <span className={cn(chip, 'bg-white/8 text-dim')}>{left} UNPLAYED</span>}
    </div>
  );
}

function FormatExplainer() {
  const [f, setF] = useState<Format>(3);
  const seq = genSeq(f, 7), picks = seq.filter(s => s.t === 'pick').length, left = 7 - seq.length;
  const decider = left === 1 && picks < f;
  const lastBan = [...seq].reverse().find(s => s.t === 'ban');
  const deciderSide: TeamIdx = lastBan ? other(lastBan.team) : 1;
  const team = (t: TeamIdx) => (t ? 'Team B' : 'Team A');

  const step = (key: string, kind: 'ban' | 'pick' | 'side' | 'decider', no: ReactNode, label: string, sub: string, tc?: string) => (
    <li key={key} className="grid min-w-23 shrink-0 gap-1.5 motion-safe:animate-rise" style={tc ? vars({ '--tc': tc }) : undefined}>
      <span className={cn(
        'grid size-8 place-items-center rounded-full border-2 text-xs font-bold tabular-nums',
        kind === 'ban' && 'border-ban text-ban', kind === 'pick' && 'border-decider text-decider',
        kind === 'decider' && 'border-decider bg-decider text-ink', kind === 'side' && 'border-transparent',
      )}>{no}</span>
      <span className={cn('h-1 rounded-sm', kind === 'decider' ? 'bg-decider' : kind === 'side' ? 'bg-(--tc)/45' : 'bg-(--tc)')} />
      <b className={cn('text-sm font-bold', kind === 'side' && 'font-semibold text-muted-foreground')}>{label}</b>
      <small className="text-xs text-dim">{sub}</small>
    </li>
  );

  return (
    <section className="container py-16 sm:py-24">
      <Panel className="p-6 sm:p-8">
        <SectionHead
          title="Every format, step by step"
          lead="The default order for a seven-map pool. In the lobby you can change any step to match your league’s rules."
          aside={<Segmented<string> label="Format" value={String(f)} onChange={v => setF(Number(v) as Format)} options={([1, 2, 3, 5] as Format[]).map(k => ({ value: String(k), label: FORMATS[k].label }))} />}
        />
        <ol key={f} className="flex gap-2 overflow-x-auto pb-2" aria-label={`${FORMATS[f].name} veto order`}>
          {seq.map((s, i) => (
            <Fragment key={i}>
              {step(`s${i}`, s.t, String(i + 1).padStart(2, '0'), s.t === 'ban' ? 'Ban' : 'Pick', team(s.team), TEAMC[s.team])}
              {s.t === 'pick' && step(`side${i}`, 'side', '', 'Side', team(other(s.team)), TEAMC[other(s.team)])}
            </Fragment>
          ))}
          {decider && (
            <>
              {step('dec', 'decider', <DiamondIcon className="size-3.5" fill="currentColor" />, 'Decider', 'Last map')}
              {step('decside', 'side', '', 'Side', team(deciderSide), TEAMC[deciderSide])}
            </>
          )}
        </ol>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <p className="max-w-2xl leading-relaxed text-muted-foreground"><b className="text-foreground">{FORMATS[f].name}.</b> {FORMAT_RULE[f]}</p>
          <Button asChild variant="secondary"><Link to={`/veto?format=${f}`}>Plan a {FORMATS[f].label}</Link></Button>
        </div>
      </Panel>
    </section>
  );
}

/* ================= who it's for ================= */
function Roles() {
  const rows: { who: string; h: string; points: string[]; visual: ReactNode }[] = [
    {
      who: 'Captains', h: 'Run it live, on stream or in voice.',
      points: ['Turn timers of 20, 45 or 60 seconds', 'A coin toss for who acts first', 'Undo when someone misclicks'],
      visual: <CaptainVisual />,
    },
    {
      who: 'Coaches', h: 'Plan every map before the match.',
      points: ['Notes on each map that travel with the plan', 'Competitive, all-map or custom pools', 'Change any step of the order'],
      visual: <CoachVisual />,
    },
    {
      who: 'The team', h: 'Everyone sees the same plan.',
      points: ['A 1600px match card for Discord', 'A link that rebuilds the plan', 'Replay the veto step by step'],
      visual: <TeamVisual />,
    },
  ];
  return (
    <section className="container pb-16 sm:pb-24">
      <SectionHead title="Built for everyone in the room" />
      <div className="grid gap-4">
        {rows.map(r => (
          <div key={r.who} className="grid items-center gap-6 border-t border-white/10 pt-6 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1.1fr)]">
            <span className="text-sm font-semibold text-muted-foreground">{r.who}</span>
            <div>
              <h3 className="text-2xl font-extrabold tracking-[-0.02em]">{r.h}</h3>
              <ul className="mt-3 grid gap-1.5">
                {r.points.map(p => <li key={p} className="flex items-center gap-2 text-muted-foreground"><CheckIcon className="size-4 shrink-0 text-pick" />{p}</li>)}
              </ul>
            </div>
            <Panel className="p-4" aria-hidden="true">{r.visual}</Panel>
          </div>
        ))}
      </div>
    </section>
  );
}

function CaptainVisual() {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-white/8 py-3 pr-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--tc)" style={vars({ '--tc': TEAMC[1] })}>
      <div className="relative size-11 shrink-0">
        <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-white/10" />
          <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray="113.1" className="stroke-ban" style={{ strokeDashoffset: 113.1 * 0.82 }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold text-ban motion-safe:animate-blink">4</span>
      </div>
      <div className="min-w-0"><div className="text-xl font-bold tracking-[-0.02em] text-(--tc)">Vandals</div><div className="text-sm text-muted-foreground">Ban a map</div></div>
      <div className="ml-auto text-xs tracking-[0.12em] text-dim">STEP 2/7</div>
    </div>
  );
}

function CoachVisual() {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 max-sm:grid-cols-1">
      <div className="relative h-24 overflow-hidden rounded-lg">
        <MapArt map={mapById('haven')} kind="wide" watermark={false} className="absolute inset-0" />
        <span className="absolute bottom-2 left-2.5 font-extrabold [text-shadow:0_1px_8px_rgb(0_0_0/0.8)]">Haven</span>
      </div>
      <div className="border-l-2 border-pick pl-4">
        <small className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><NotebookPenIcon className="size-3.5" /> Team notes</small>
        <p className="mt-1.5 text-sm leading-relaxed">Win garage early, then split. Stack A on pistol and default to C long on attack.</p>
      </div>
    </div>
  );
}

function TeamVisual() {
  const games = [
    { map: 'haven', badge: 'MAP 1', mc: TEAMC[0] },
    { map: 'summit', badge: 'MAP 2', mc: TEAMC[1] },
    { map: 'sunset', badge: 'DECIDER', mc: DECIDER },
  ];
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Best of 3 match plan</p>
          <h4 className="text-lg font-extrabold tracking-[-0.02em]">Phantoms vs Vandals</h4>
        </div>
        <LogoMark size={32} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {games.map(m => (
          <div key={m.map} className="relative h-28 overflow-hidden rounded-lg border-2 border-(--mc)" style={vars({ '--mc': m.mc })}>
            <MapArt map={mapById(m.map)} kind="tall" watermark={false} className="absolute inset-0" />
            <div className="absolute inset-0 bg-linear-to-t from-black/85 to-transparent" />
            <span className="absolute top-1.5 left-1.5 rounded bg-(--mc) px-1.5 py-0.5 text-[10px] font-bold text-ink">{m.badge}</span>
            <h5 className="absolute bottom-1.5 left-2 font-extrabold">{mapById(m.map).name}</h5>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= map pool ================= */
function PoolPreview() {
  useCatalog();
  const [view, setView] = useState<'competitive' | 'all'>('competitive');
  const { patch, toast } = useApp();
  const navigate = useNavigate();
  const usePool = () => {
    patch(s => ({ pool: sortPool(s, view === 'all' ? MAPS.map(m => m.id) : COMPETITIVE_POOL), seq: null }));
    toast(view === 'all' ? 'Veto pool set to every map' : 'Veto pool set to the competitive rotation');
    navigate('/veto');
  };
  return (
    <section className="container pb-16 sm:pb-24">
      <SectionHead
        title="Every map, your pool"
        lead="Start from the competitive rotation, every map, or your own list. Each map page has the essentials and room for your notes."
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<'competitive' | 'all'> label="Highlight" value={view} onChange={setView} options={[{ value: 'competitive', label: 'Competitive' }, { value: 'all', label: 'All maps' }]} />
            <Button size="sm" variant="secondary" onClick={usePool}>Veto with {view === 'all' ? `all ${MAPS.length} maps` : `these ${COMPETITIVE_POOL.length} maps`}</Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {MAPS.map(m => {
          const live = view === 'all' || COMPETITIVE_POOL.includes(m.id);
          return (
            <Link
              to={`/maps/${m.id}`}
              key={m.id}
              className={cn(
                'group relative h-36 overflow-hidden rounded-xl border border-white/10 transition-[opacity,border-color,translate] duration-200 hover:border-white/30 motion-safe:hover:-translate-y-1',
                !live && 'opacity-40 hover:opacity-80',
              )}
            >
              <MapArt map={m} kind="wide" watermark={false} className={cn('absolute inset-0 transition-[filter,scale] duration-500 group-hover:scale-105', !live && 'grayscale')} />
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
              <span className="absolute inset-x-3 bottom-2.5 flex flex-col">
                <span className="text-lg font-extrabold tracking-[-0.02em]">{m.name}</span>
                <small className="truncate text-xs text-white/70">{live ? m.tag : 'Out of rotation'}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
