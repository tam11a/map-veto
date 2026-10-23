import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../brand/Logo';
import { Icon } from '../components/Icons';
import { MapArt } from '../components/MapArt';
import { COMPETITIVE_POOL, FORMATS, GOLD, MAPS, TEAMC } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { useTitle } from '../lib/useTitle';
import { genSeq, other } from '../lib/veto';
import type { Action, Format, TeamIdx } from '../types';

const mapById = (id: string) => MAPS.find(m => m.id === id)!;

export function Landing() {
  useTitle();
  return (
    <>
      <VetoWall />
      <FormatExplainer />
      <Roles />
      <PoolPreview />
      <section className="closing">
        <div className="container"><div className="closing-in frost">
          <h2>Both captains ready?</h2>
          <Link to="/veto" className="btn primary lg">Start a veto</Link>
        </div></div>
      </section>
    </>
  );
}

/* ================= hero: the broadcast veto wall ================= */
const TEAMS = ['Phantoms', 'Vandals'] as const;
const WALL = ['abyss', 'ascent', 'bind', 'haven', 'lotus', 'split', 'sunset'];
const PLAY: Action[] = [
  { k: 'ban', team: 0, map: 'bind' },
  { k: 'ban', team: 1, map: 'abyss' },
  { k: 'pick', team: 0, map: 'ascent' },
  { k: 'pick', team: 1, map: 'haven' },
  { k: 'ban', team: 0, map: 'split' },
  { k: 'ban', team: 1, map: 'lotus' },
  { k: 'decider', team: null, map: 'sunset' },
];

function VetoWall() {
  const [n, setN] = useState(0);
  const [run, setRun] = useState(0);

  // plays once on load; Replay runs it again
  useEffect(() => {
    if (n >= PLAY.length) return;
    const t = setTimeout(() => setN(x => x + 1), n === 0 ? 900 : 1100);
    return () => clearTimeout(t);
  }, [n, run]);

  const done = n >= PLAY.length, next = PLAY[n];
  const rec: Record<string, { k: Action['k']; team: TeamIdx | null; g?: number }> = {};
  let g = 0;
  PLAY.slice(0, n).forEach(a => { rec[a.map] = { k: a.k, team: a.team, g: a.k === 'ban' ? undefined : ++g }; });

  const status = done
    ? 'Ascent, Haven, then Sunset as the decider'
    : next.team == null ? 'Sunset is the last map standing' : `${TEAMS[next.team]} to ${next.k}`;

  return (
    <section className="wall-hero">
      <div className="wall" aria-hidden="true">
        {WALL.map(id => {
          const m = mapById(id), r = rec[id];
          const mc = r?.team != null ? TEAMC[r.team] : GOLD;
          const tag = !r ? '' : r.k === 'ban' ? `${TEAMS[r.team!]} ban` : r.k === 'pick' ? `Map ${r.g}  ${TEAMS[r.team!]}` : `Map ${r.g}  Decider`;
          return (
            <div key={id} className={cx('slice', r?.k)} style={vars({ '--mc': mc })}>
              <MapArt map={m} kind="tall" watermark={false} />
              <span className="slice-name">{m.name}</span>
              <span className="slice-tag">{tag}</span>
            </div>
          );
        })}
      </div>

      <div className="wall-copy container">
        <div>
          <h1>Run the veto like it’s the grand final.</h1>
          <p>Bans, picks, sides and a decider for Bo1 to Bo5. When it’s done, your whole team gets the plan as an image or a link.</p>
          <div className="hero-cta">
            <Link to="/veto" className="btn primary lg">Start a veto</Link>
            <Link to="/maps" className="btn glassy lg">Browse maps</Link>
          </div>
        </div>
        <aside className="wall-hud frost" aria-label="Example veto status">
          <div className="match"><b style={{ color: TEAMC[0] }}>{TEAMS[0]}</b> vs <b style={{ color: TEAMC[1] }}>{TEAMS[1]}</b>, best of 3</div>
          <div className="wall-steps" aria-hidden="true">
            {PLAY.map((a, i) => <i key={i} className={cx(i < n && 'done')} style={vars({ '--tc': a.team != null ? TEAMC[a.team] : GOLD })} />)}
          </div>
          <div className="wall-status" role="status" key={n}>
            <em>{done ? 'Veto complete' : `Step ${n + 1} of ${PLAY.length}`}</em>{status}
          </div>
          {done && <button className="btn glassy sm" onClick={() => { setN(0); setRun(r => r + 1); }}><Icon.play /> Replay</button>}
        </aside>
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
  return (
    <div className="chips">
      {seq.map((s, i) => (
        <span key={i} className={cx('chip', s.t)}><i style={{ background: TEAMC[s.team] }} />{s.t === 'ban' ? 'BAN' : 'PICK'}</span>
      ))}
      {decider && <span className="chip dec">DECIDER</span>}
      {!decider && left > 0 && <span className="chip left">{left} UNPLAYED</span>}
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

  return (
    <section className="section">
      <div className="container">
        <div className="explain frost">
        <div className="sec-title">
          <div>
            <h2>Every format, step by step</h2>
            <p>The default order for a seven-map pool. In the lobby you can change any step to match your league’s rules.</p>
          </div>
          <div className="seg fmt-switch" role="group" aria-label="Format">
            {([1, 2, 3, 5] as Format[]).map(k => (
              <button key={k} className={cx(f === k && 'on')} aria-pressed={f === k} onClick={() => setF(k)}>{FORMATS[k].label}</button>
            ))}
          </div>
        </div>
        <ol className="seqline" key={f} aria-label={`${FORMATS[f].name} veto order`}>
          {seq.map((s, i) => (
            <Fragment key={i}>
              <li className={cx('sq', s.t)} style={vars({ '--tc': TEAMC[s.team] })}>
                <span className="sq-no">{String(i + 1).padStart(2, '0')}</span>
                <span className="sq-bar" />
                <b>{s.t === 'ban' ? 'Ban' : 'Pick'}</b>
                <small>{team(s.team)}</small>
              </li>
              {s.t === 'pick' && (
                <li className="sq side" style={vars({ '--tc': TEAMC[other(s.team)] })}>
                  <span className="sq-no" />
                  <span className="sq-bar" />
                  <b>Side</b>
                  <small>{team(other(s.team))}</small>
                </li>
              )}
            </Fragment>
          ))}
          {decider && (
            <>
              <li className="sq decider">
                <span className="sq-no">◆</span>
                <span className="sq-bar" />
                <b>Decider</b>
                <small>Last map</small>
              </li>
              <li className="sq side" style={vars({ '--tc': TEAMC[deciderSide] })}>
                <span className="sq-no" />
                <span className="sq-bar" />
                <b>Side</b>
                <small>{team(deciderSide)}</small>
              </li>
            </>
          )}
        </ol>
        <div className="seq-note">
          <p><b>{FORMATS[f].name}.</b> {FORMAT_RULE[f]}</p>
          <Link to={`/veto?format=${f}`} className="btn glassy">Plan a {FORMATS[f].label}</Link>
        </div>
        </div>
      </div>
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
    <section className="section roles">
      <div className="container">
        <div className="sec-title">
          <div>
            <h2>Built for everyone in the room</h2>
          </div>
        </div>
        {rows.map(r => (
          <div className="role" key={r.who}>
            <span className="role-who">{r.who}</span>
            <div className="role-text">
              <h3>{r.h}</h3>
              <ul>{r.points.map(p => <li key={p}><Icon.check />{p}</li>)}</ul>
            </div>
            <div className="role-vis frost" aria-hidden="true">{r.visual}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CaptainVisual() {
  return (
    <div className="timed">
      <div className="turn-in" style={vars({ '--tc': TEAMC[1] })}>
        <div className="ring low">
          <svg viewBox="0 0 44 44"><circle className="trk" cx="22" cy="22" r="18" /><circle className="prog" cx="22" cy="22" r="18" style={{ strokeDashoffset: 113.1 * 0.82 }} /></svg>
          <span className="sec">4</span>
        </div>
        <div style={{ minWidth: 0 }}><div className="who">Vandals</div><div className="what">Ban a map</div></div>
        <div className="stepno">STEP 2/7</div>
      </div>
    </div>
  );
}

function CoachVisual() {
  return (
    <div className="note-vis">
      <div className="note-map"><MapArt map={mapById('ascent')} kind="wide" watermark={false} /><span>Ascent</span></div>
      <div className="note-body">
        <small><Icon.note /> Team notes</small>
        <p>Double controller default. Close B door early on anti-ecos and stack market.</p>
      </div>
    </div>
  );
}

function TeamVisual() {
  const games = [
    { map: 'ascent', badge: 'MAP 1', mc: TEAMC[0] },
    { map: 'haven', badge: 'MAP 2', mc: TEAMC[1] },
    { map: 'sunset', badge: 'DECIDER', mc: GOLD },
  ];
  return (
    <div className="plan-mock">
      <div className="pm-head">
        <div>
          <div className="kicker">Best of 3 match plan</div>
          <h4>Phantoms vs Vandals</h4>
        </div>
        <LogoMark size={32} />
      </div>
      <div className="pm-games">
        {games.map(m => (
          <div key={m.map} className="pm-game" style={vars({ '--mc': m.mc })}>
            <MapArt map={mapById(m.map)} kind="tall" watermark={false} />
            <span className="bd">{m.badge}</span>
            <h5>{mapById(m.map).name}</h5>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= map pool ================= */
function PoolPreview() {
  const [view, setView] = useState<'competitive' | 'all'>('competitive');
  return (
    <section className="section">
      <div className="container">
        <div className="sec-title">
          <div>
            <h2>Twelve maps, your pool</h2>
            <p>Start from the competitive rotation, every map, or your own list. Each map page has the essentials and room for your notes.</p>
          </div>
          <div className="seg fmt-switch" role="group" aria-label="Highlight">
            <button className={cx(view === 'competitive' && 'on')} aria-pressed={view === 'competitive'} onClick={() => setView('competitive')}>Competitive</button>
            <button className={cx(view === 'all' && 'on')} aria-pressed={view === 'all'} onClick={() => setView('all')}>All maps</button>
          </div>
        </div>
        <div className="pool-grid">
          {MAPS.map(m => {
            const live = view === 'all' || COMPETITIVE_POOL.includes(m.id);
            return (
              <Link to={`/maps/${m.id}`} key={m.id} className={cx('pool-card', !live && 'out')}>
                <MapArt map={m} kind="wide" watermark={false} />
                <span className="pc-label">
                  <span className="pc-name">{m.name}</span>
                  <small>{live ? m.tag : 'Out of rotation'}</small>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
