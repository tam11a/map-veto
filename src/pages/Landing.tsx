import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../brand/Logo';
import { Icon } from '../components/Icons';
import { MapArt } from '../components/MapArt';
import { MapCard, type Rec, TeamCard } from '../components/VetoView';
import { FORMATS, GOLD, MAPS, TEAMC } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { useTitle } from '../lib/useTitle';
import { genSeq } from '../lib/veto';
import type { Action, Format } from '../types';

const mapById = (id: string) => MAPS.find(m => m.id === id)!;

export function Landing() {
  useTitle();
  return (
    <>
      <section className="hud-hero">
        <div className="container">
          <div className="hero-head">
            <h1>
              <span><i style={{ background: TEAMC[1] }} />Ban smart.</span>
              <span><i style={{ background: TEAMC[0] }} />Pick sharp.</span>
              <span><i style={{ background: GOLD }} />Own the veto.</span>
            </h1>
            <div className="hero-side">
              <p>Run Bo1 to Bo5 map vetoes with side selection, turn timers and team notes, then share the result as an image or a link.</p>
              <div className="hero-cta">
                <Link to="/veto" className="btn primary lg">Start a veto</Link>
                <Link to="/maps" className="btn lg">Browse maps</Link>
              </div>
            </div>
          </div>
          <DemoBoard />
          <Legend />
        </div>
      </section>
      <MapStrip />
      <Formats />
      <ExportPlan />
    </>
  );
}

/* ---------------- the live board: the page's one orchestrated moment ---------------- */
const DEMO_TEAMS: [string, string] = ['Phantoms', 'Vandals'];
const DEMO_POOL = ['abyss', 'ascent', 'bind', 'haven', 'lotus', 'split', 'sunset'];
const DEMO: Action[] = [
  { k: 'ban', team: 0, map: 'bind' },
  { k: 'ban', team: 1, map: 'abyss' },
  { k: 'pick', team: 0, map: 'ascent' },
  { k: 'pick', team: 1, map: 'haven' },
  { k: 'ban', team: 0, map: 'split' },
  { k: 'ban', team: 1, map: 'lotus' },
  { k: 'decider', team: null, map: 'sunset' },
];

function DemoBoard() {
  const [n, setN] = useState(0);
  const [run, setRun] = useState(1);

  // plays once on load; "Replay" runs it again
  useEffect(() => {
    if (n >= DEMO.length) return;
    const t = setTimeout(() => setN(x => x + 1), n === 0 ? 700 : 1000);
    return () => clearTimeout(t);
  }, [n, run]);

  const hist = DEMO.slice(0, n), next = DEMO[n], done = !next;
  const color = next?.team != null ? TEAMC[next.team] : GOLD;
  const who = done ? 'Plan ready' : next.team != null ? DEMO_TEAMS[next.team] : 'Decider';
  const what = done ? 'Ascent, Haven, then Sunset as the decider' : next.k === 'ban' ? 'Ban a map' : next.k === 'pick' ? 'Pick a map' : 'Last map standing';
  const rec: Record<string, Rec> = {};
  let g = 0;
  hist.forEach(a => { rec[a.map] = { k: a.k, team: a.team, g: a.k === 'ban' ? undefined : ++g }; });
  const last = hist[hist.length - 1];

  return (
    <figure className="board">
      <div className="vbar">
        <TeamCard team={0} name={DEMO_TEAMS[0]} hist={hist} active={next?.team === 0} />
        <div className="board-turn" style={{ order: 2 }}>
          <div className="turn-in" key={n} style={vars({ '--tc': color })}>
            <div style={{ minWidth: 0 }}><div className="who">{who}</div><div className="what">{what}</div></div>
            <div className="stepno">{done ? 'DONE' : `STEP ${n + 1}/${DEMO.length}`}</div>
          </div>
        </div>
        <TeamCard team={1} name={DEMO_TEAMS[1]} hist={hist} active={next?.team === 1} />
      </div>
      <div className="timeline" aria-hidden="true">
        {DEMO.map((a, i) => (
          <div key={i} className={cx('tl', a.k, i < n && 'done', i === n && 'now')} style={vars({ '--tc': a.team != null ? TEAMC[a.team] : GOLD })}>
            <span><i />{a.k.toUpperCase()}</span>
            <em>{i < n ? mapById(a.map).name : a.team != null ? DEMO_TEAMS[a.team] : 'Auto'}</em>
          </div>
        ))}
      </div>
      <div className="grid board-grid" aria-hidden="true">
        {DEMO_POOL.map(id => (
          <MapCard
            key={id}
            map={mapById(id)}
            rec={rec[id]}
            live={false}
            done={done}
            fresh={last?.map === id}
            teams={DEMO_TEAMS}
            hasNotes={false}
            action="Ban"
          />
        ))}
      </div>
      <figcaption className="board-foot">
        <span>Example veto: best of 3, seven-map pool</span>
        {done && <button className="btn ghost sm" onClick={() => { setN(0); setRun(r => r + 1); }}><Icon.play /> Replay</button>}
      </figcaption>
    </figure>
  );
}

const LEGEND = [
  { i: Icon.clock, t: 'Turn timer', d: '20, 45 or 60 seconds per turn. When it runs out, a random choice is locked in.' },
  { i: Icon.shield, t: 'Side selection', d: 'The opponent of each picker chooses Attack or Defense.' },
  { i: Icon.sliders, t: 'Custom order', d: 'Change any step’s team or action to match your league’s rules.' },
  { i: Icon.note, t: 'Map notes', d: 'Comp and anti-strat notes travel with the plan.' },
  { i: Icon.img, t: 'Image export', d: 'A 1600px match card, ready for Discord.' },
  { i: Icon.share, t: 'Share and replay', d: 'Links rebuild the plan in any browser, step by step.' },
];

function Legend() {
  return (
    <ul className="legend">
      {LEGEND.map(({ i: I, t, d }) => (
        <li key={t}><I /><div><b>{t}</b><p>{d}</p></div></li>
      ))}
    </ul>
  );
}

/* ---------------- maps ---------------- */
function MapStrip() {
  return (
    <section className="section">
      <div className="container">
        <div className="sec-title">
          <div>
            <h2>Twelve maps, each with intel</h2>
            <p>Sites, the signature mechanic and a short read on how each map plays.</p>
          </div>
          <Link to="/maps" className="btn">Browse maps</Link>
        </div>
        <div className="strip">
          {MAPS.map(m => (
            <Link to={`/maps/${m.id}`} key={m.id} className="strip-tile">
              <MapArt map={m} kind="wide" watermark={false} />
              <span>{m.name}</span>
              <small>{m.tag}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- formats ---------------- */
const FORMAT_RULE: Record<Format, string> = {
  1: 'Teams alternate bans until one map is left.',
  2: 'Bans thin the pool, then each team picks one map.',
  3: 'Two bans, two picks, two more bans and a decider.',
  5: 'Two bans, four alternating picks and a decider.',
};

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

function Formats() {
  return (
    <section className="section" id="formats">
      <div className="container">
        <div className="sec-title">
          <div>
            <h2>Four formats</h2>
            <p>Default orders for a seven-map pool. Larger or smaller pools add or remove bans automatically, and every step can be changed.</p>
          </div>
        </div>
        <div className="fmt-table">
          {([1, 2, 3, 5] as Format[]).map(f => (
            <div className="fmt-row" key={f}>
              <div className="fmt-name"><b>{FORMATS[f].label}</b><small>{FORMATS[f].name}</small></div>
              <p>{FORMAT_RULE[f]}</p>
              <SeqChips fmt={f} />
              <Link to={`/veto?format=${f}`} className="btn sm">Plan a {FORMATS[f].label}</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- export ---------------- */
const MOCK = [
  { map: 'ascent', badge: 'MAP 1', mc: TEAMC[0], a: 'ATK', b: 'DEF' },
  { map: 'haven', badge: 'MAP 2', mc: TEAMC[1], a: 'ATK', b: 'DEF' },
  { map: 'sunset', badge: 'MAP 3 DECIDER', mc: GOLD, a: 'DEF', b: 'ATK' },
];

function ExportPlan() {
  return (
    <section className="section">
      <div className="container export">
        <div>
          <div className="sec-title" style={{ marginBottom: 0 }}>
            <div>
              <h2>The plan you share</h2>
              <p>When the last side is chosen, Map Veto builds a match plan with sides, notes and the full veto log.</p>
            </div>
          </div>
          <ul className="ticks">
            <li><Icon.img /><span><b>Image</b> 1600px wide, with map art, sides and notes</span></li>
            <li><Icon.link /><span><b>Share link</b> rebuilds the plan in any browser</span></li>
            <li><Icon.txt /><span><b>Text summary</b> formatted for chat</span></li>
            <li><Icon.dl /><span><b>JSON</b> to archive and import again later</span></li>
            <li><Icon.play /><span><b>Replay</b> walks through the veto step by step</span></li>
          </ul>
          <Link to="/veto" className="btn primary lg">Start a veto</Link>
        </div>
        <div className="plan-mock" aria-label="Example exported match plan">
          <div className="pm-head">
            <div>
              <div className="kicker">Best of 3 match plan</div>
              <h4>Grand final</h4>
              <div className="vs"><span style={{ color: TEAMC[0] }}>Phantoms</span><i>VS</i><span style={{ color: TEAMC[1] }}>Vandals</span></div>
            </div>
            <LogoMark size={40} />
          </div>
          <div className="pm-games">
            {MOCK.map(m => (
              <div key={m.map} className="pm-game" style={vars({ '--mc': m.mc })}>
                <MapArt map={mapById(m.map)} kind="tall" watermark={false} />
                <span className="bd">{m.badge}</span>
                <h5>{mapById(m.map).name}</h5>
                <div className="sd"><span style={{ color: TEAMC[0] }}>Phantoms</span><em>{m.a}</em></div>
                <div className="sd"><span style={{ color: TEAMC[1] }}>Vandals</span><em>{m.b}</em></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
