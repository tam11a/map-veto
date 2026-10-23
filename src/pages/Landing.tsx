import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND, LogoMark } from '../brand/Logo';
import { MapArt } from '../components/MapArt';
import { Reveal } from '../components/layout/Layout';
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
      <Hero />
      <Marquee />
      <Formats />
      <Features />
      <HowItWorks />
      <Showcase />
      <section className="section tight">
        <div className="container">
          <Reveal className="cta-band">
            <LogoMark size={340} className="wm-mark" />
            <div className="kicker">Ready when you are</div>
            <h2 style={{ marginTop: 12 }}>Your series starts<br />with the <span className="grad">veto.</span></h2>
            <p>Set up both teams, pick a format and run the veto in under a minute. No accounts, nothing to install.</p>
            <Link to="/veto" className="btn primary xl">Start a veto <span className="arr">→</span></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ---------------- hero ---------------- */
function Hero() {
  return (
    <section className="hero-land">
      <div className="hero-bg">
        <MapArt map={mapById('ascent')} kind="splash" watermark={false} />
        <div className="glow g1" />
        <div className="glow g2" />
      </div>
      <div className="container hero-grid">
        <div>
          <span className="eyebrow"><i />Free · No sign-up · Bo1 to Bo5</span>
          <h1>
            <span className="ln"><span style={vars({ '--l': 0 })}><span className="hl-ban">Ban</span> smart.</span></span>
            <span className="ln"><span style={vars({ '--l': 1 })}><span className="hl-pick">Pick</span> sharp.</span></span>
            <span className="ln"><span style={vars({ '--l': 2 })} className="hl-own">Own the veto.</span></span>
          </h1>
          <p className="lead">{BRAND.full} runs a pro-style, turn-based map veto with side selection, turn timers and map intel — then turns the result into a plan your whole team can see.</p>
          <div className="hero-cta">
            <Link to="/veto" className="btn primary xl">Start a veto <span className="arr">→</span></Link>
            <Link to="/maps" className="btn xl">Explore maps</Link>
          </div>
          <div className="hero-stats">
            <div><b>{MAPS.length}</b><small>Maps with intel</small></div>
            <div><b>4</b><small>Match formats</small></div>
            <div><b>5</b><small>Ways to share</small></div>
          </div>
        </div>
        <DemoVeto />
      </div>
    </section>
  );
}

const DEMO_TEAMS = ['Phantoms', 'Vandals'] as const;
const DEMO_MAPS = ['ascent', 'bind', 'haven', 'lotus', 'sunset'];
const DEMO: Action[] = [
  { k: 'ban', team: 0, map: 'bind' },
  { k: 'ban', team: 1, map: 'lotus' },
  { k: 'pick', team: 0, map: 'ascent' },
  { k: 'pick', team: 1, map: 'haven' },
  { k: 'decider', team: null, map: 'sunset' },
];

/** A self-playing Bo3 veto that loops in the hero. */
function DemoVeto() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const done = n >= DEMO.length;
    const t = setTimeout(() => setN(x => (x >= DEMO.length ? 0 : x + 1)), done ? 3000 : n === 0 ? 1100 : 1300);
    return () => clearTimeout(t);
  }, [n]);

  const next = DEMO[n];
  const color = next?.team != null ? TEAMC[next.team] : GOLD;
  const who = !next ? 'Plan ready' : next.team != null ? DEMO_TEAMS[next.team] : 'Decider';
  const what = !next ? 'Ascent · Haven · Sunset' : next.k === 'ban' ? 'Ban a map' : next.k === 'pick' ? 'Pick a map' : 'Last map standing';
  let g = 0;
  const rec: Record<string, { k: string; team: 0 | 1 | null; g?: number }> = {};
  DEMO.slice(0, n).forEach(a => { rec[a.map] = { k: a.k, team: a.team, g: a.k === 'ban' ? undefined : ++g }; });

  return (
    <div className="demo-wrap">
      <div className="demo-win">
        <div className="demo-top"><i /><i /><i /><span>BO3 · LIVE VETO</span></div>
        <div className="turn-in" key={n} style={vars({ '--tc': color })}>
          <div style={{ minWidth: 0 }}><div className="who">{who}</div><div className="what">{what}</div></div>
          <div className="stepno">{next ? `STEP ${n + 1}/${DEMO.length}` : 'DONE'}</div>
        </div>
        <div className="demo-grid">
          {DEMO_MAPS.map(id => {
            const m = mapById(id), r = rec[id];
            const mc = r?.team != null ? TEAMC[r.team] : r ? GOLD : 'var(--dim)';
            return (
              <div key={id} className={cx('mcard', r?.k === 'ban' && 'banned', r?.k === 'pick' && 'picked', r?.k === 'decider' && 'decider')} style={vars({ '--mc': mc })}>
                <MapArt map={m} />
                <div className="shade" />
                <span className="by">{r?.team != null ? DEMO_TEAMS[r.team] : ''}</span>
                <div className="meta"><h3>{m.name}</h3></div>
                <div className="stamp">{r ? (r.k === 'ban' ? 'BANNED' : r.k === 'pick' ? `MAP ${r.g}` : 'DECIDER') : ''}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="float-chip c1"><b style={{ background: GOLD }}>DECIDER</b>Sunset · Phantoms pick side</div>
      <div className="float-chip c2"><b style={{ background: 'var(--a)' }}>EXPORT</b>Plan copied for Discord ✓</div>
    </div>
  );
}

/* ---------------- marquee ---------------- */
function Marquee() {
  const tiles = [...MAPS, ...MAPS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {tiles.map((m, i) => (
          <Link to={`/maps/${m.id}`} className="mq-tile" key={i} tabIndex={-1}>
            <MapArt map={m} kind="wide" watermark={false} />
            <span>{m.name}</span>
            <small>{m.sites}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------------- formats ---------------- */
const FORMAT_COPY: Record<Format, { d: string; c: string }> = {
  1: { d: 'Teams alternate bans until a single map survives. Quick and fair — ideal for groups and open cups.', c: 'var(--a)' },
  2: { d: 'Bans thin the pool, then each team picks one map. Built for league weeks where a draw is allowed.', c: '#7cc7ff' },
  3: { d: 'Two bans, two picks, two more bans and a decider. The standard playoff veto.', c: 'var(--b)' },
  5: { d: 'Two bans, then four alternating picks and a decider. Grand-final energy.', c: 'var(--gold)' },
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
      {!decider && left > 0 && <span className="chip left">+{left} UNPLAYED</span>}
    </div>
  );
}

function Formats() {
  return (
    <section className="section" id="formats">
      <div className="container">
        <Reveal className="sec-head">
          <div className="kicker">Every format, one flow</div>
          <h2>From quick Bo1s to <span className="grad">grand-final Bo5s.</span></h2>
          <p>Each format ships with a tournament-style order that adapts to your map pool — or rewrite it step by step to match your league's rulebook.</p>
        </Reveal>
        <div className="fmt-grid">
          {([1, 2, 3, 5] as Format[]).map((f, i) => (
            <Reveal key={f} delay={i * 90}>
              <Link to={`/veto?format=${f}`} className="fcard" style={vars({ '--fc': FORMAT_COPY[f].c, height: '100%' })}>
                <div className="big" style={{ color: FORMAT_COPY[f].c }}>{FORMATS[f].label}<small>{FORMATS[f].name.toUpperCase()}</small></div>
                <p>{FORMAT_COPY[f].d}</p>
                <SeqChips fmt={f} />
                <span className="go">Plan a {FORMATS[f].label} <span className="arr">→</span></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- features ---------------- */
const ic = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const FEATURES: { t: string; d: string; c: string; i: ReactNode }[] = [
  { t: 'Turn timers', c: 'var(--b)', i: ic(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>),
    d: 'Keep the room honest with 20, 45 or 60-second turns. Miss the clock and a random choice is locked in — just like a live veto.' },
  { t: 'Side selection', c: '#7cc7ff', i: ic(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M12 3v18" /></>),
    d: 'After every pick the opponent chooses Attack or Defense. The decider side goes to the team that didn’t make the last ban.' },
  { t: 'Custom sequences', c: 'var(--gold)', i: ic(<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>),
    d: 'Swap any step’s team or action, add or remove steps. Map Veto checks the order produces the right number of maps.' },
  { t: 'Map intel & notes', c: 'var(--a)', i: ic(<><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>),
    d: 'Every map comes with sites, mechanics and a quick read. Add your own comp and anti-strat notes — they travel with the plan.' },
  { t: 'Export as image', c: '#c58bff', i: ic(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>),
    d: 'One click renders a crisp 1600px match card with map art, sides, notes and the full veto log. Download it or copy straight to Discord.' },
  { t: 'Share & replay', c: '#ff9f5a', i: ic(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>),
    d: 'Share links rebuild the whole plan in anyone’s browser. Hit replay to watch the veto unfold step by step for your VOD review.' },
];

function Features() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="sec-head center">
          <div className="kicker">Built for scrims, leagues and finals</div>
          <h2>Everything a real veto needs.<br /><span className="mute">Nothing it doesn’t.</span></h2>
        </Reveal>
        <div className="feat-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 90}>
              <div
                className="feat"
                style={vars({ '--fc': f.c, height: '100%' })}
                onMouseMove={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <div className="ic">{f.i}</div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- how it works ---------------- */
const STEPS = [
  { t: 'Set the match', d: 'Name both teams, choose Bo1–Bo5, pick your map pool and decide who starts — or flip the coin.', c: 'var(--a)' },
  { t: 'Run the veto', d: 'Teams take turns banning and picking with live turn banners, timers and side selection. Undo anytime.', c: 'var(--b)' },
  { t: 'Share the plan', d: 'Get a clean match plan with sides and notes. Export an image, copy a link or paste a text summary.', c: 'var(--gold)' },
];

function HowItWorks() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="sec-head">
          <div className="kicker">How it works</div>
          <h2>Three steps. <span className="grad">About a minute.</span></h2>
        </Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 110}>
              <div className="stepc" style={vars({ '--sc': s.c, height: '100%' })}>
                <span className="n">0{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- export showcase ---------------- */
const MOCK = [
  { map: 'ascent', badge: 'MAP 1', mc: TEAMC[0], a: 'ATK', b: 'DEF' },
  { map: 'haven', badge: 'MAP 2', mc: TEAMC[1], a: 'ATK', b: 'DEF' },
  { map: 'sunset', badge: 'DECIDER', mc: GOLD, a: 'DEF', b: 'ATK' },
];

function Showcase() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container showcase">
        <Reveal>
          <div className="kicker">Share the plan</div>
          <div className="sec-head" style={{ marginBottom: 0 }}>
            <h2>Your plan, ready for <span className="grad">Discord.</span></h2>
            <p>When the last side is chosen, Map Veto builds a match plan you can drop anywhere your team talks.</p>
          </div>
          <ul className="ticks">
            <li><i>✓</i><span><b>1600px image</b> with map art, sides, notes and the full veto log</span></li>
            <li><i>✓</i><span><b>Share link</b> that rebuilds the plan in any browser</span></li>
            <li><i>✓</i><span><b>Text summary</b> formatted for chat</span></li>
            <li><i>✓</i><span><b>JSON export</b> to archive and re-import later</span></li>
            <li><i>✓</i><span><b>Replay</b> the veto step by step for review</span></li>
          </ul>
          <div className="hero-cta"><Link to="/veto" className="btn mint xl">Try it now <span className="arr">→</span></Link></div>
        </Reveal>
        <Reveal delay={120}>
          <div className="plan-mock">
            <div className="pm-head">
              <div>
                <div className="kicker">Match plan · Best of 3</div>
                <h4>Grand Final</h4>
                <div className="vs"><span style={{ color: TEAMC[0] }}>Phantoms</span><i>VS</i><span style={{ color: TEAMC[1] }}>Vandals</span></div>
              </div>
              <LogoMark size={40} />
            </div>
            <div className="pm-games">
              {MOCK.map(m => (
                <div key={m.map} className="pm-game" style={vars({ '--mc': m.mc })}>
                  <MapArt map={mapById(m.map)} kind="tall" watermark={false} />
                  <span className="bd">{m.badge}</span>
                  <h5>{mapById(m.map).name.toUpperCase()}</h5>
                  <div className="sd"><span style={{ color: TEAMC[0] }}>Phantoms</span><em>{m.a}</em></div>
                  <div className="sd"><span style={{ color: TEAMC[1] }}>Vandals</span><em>{m.b}</em></div>
                </div>
              ))}
            </div>
            <div className="pm-log">
              {DEMO.map((a, i) => (
                <span key={i} className={cx('chip', a.k === 'ban' ? 'ban' : a.k === 'pick' ? 'pick' : 'dec')}>
                  {a.k.toUpperCase()} · {mapById(a.map).name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
