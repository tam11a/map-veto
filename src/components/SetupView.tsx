import { useRef, useState } from 'react';
import { FORMATS, TEAMC } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { allMaps, getSeq, simulate } from '../lib/veto';
import { useApp } from '../state';
import type { FirstTurn, Format, SeqStep, TeamIdx } from '../types';
import { Icon } from './Icons';
import { MapArt } from './MapArt';

const TIMERS = [0, 20, 45, 60];

export function SetupView({ onStart, onImport }: { onStart: () => void; onImport: (json: unknown) => void }) {
  const { setup: S, patch, toast, openInfo } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq), n = S.pool.length;
  const fileRef = useRef<HTMLInputElement>(null);
  const [cmName, setCmName] = useState('');
  const [cmImg, setCmImg] = useState('');

  const editSeq = (fn: (q: SeqStep[]) => void) => {
    const q = seq.map(x => ({ ...x }));
    fn(q);
    patch({ seq: q });
  };
  const setTeam = (i: TeamIdx, v: string) => patch(s => {
    const teams: [string, string] = [...s.teams];
    teams[i] = v;
    return { teams };
  });
  const fixTeams = () => patch(s => ({ teams: [s.teams[0].trim() || 'Team A', s.teams[1].trim() || 'Team B'] }));

  const togglePool = (id: string) => patch(s => {
    const order = allMaps(s).map(m => m.id);
    const pool = s.pool.includes(id) ? s.pool.filter(x => x !== id) : [...s.pool, id];
    pool.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return { pool, seq: null };
  });
  const addMap = () => {
    const name = cmName.trim();
    if (!name) return toast('Give the map a name');
    const hue = Math.floor(Math.random() * 360), id = 'c_' + Date.now().toString(36);
    patch(s => ({
      custom: [...s.custom, {
        id, name, loc: 'Custom map', sites: '—', tag: 'Custom', desc: '', custom: true,
        img: /^https?:\/\//.test(cmImg.trim()) ? cmImg.trim() : '', c: [`hsl(${hue} 40% 32%)`, `hsl(${hue} 40% 9%)`],
      }],
      pool: [...s.pool, id],
      seq: null,
    }));
    setCmName('');
    setCmImg('');
    toast(`${name} added to the pool`);
  };
  const delMap = (id: string) => patch(s => ({ custom: s.custom.filter(m => m.id !== id), pool: s.pool.filter(x => x !== id), seq: null }));

  const importFile = async (f?: File) => {
    if (!f) return;
    try { onImport(JSON.parse(await f.text())); } catch { toast('That file is not a valid Veto Lab plan'); }
  };

  const firstOpts: [FirstTurn, string][] = [['a', S.teams[0]], ['b', S.teams[1]], ['coin', 'Coin toss']];
  const plural = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;

  return (
    <>
      <section className="hero rise" style={vars({ '--i': 0 })}>
        <div className="kicker">New veto</div>
        <h1>Set up the <em>match.</em></h1>
        <p>Name the teams, choose a format and lock your map pool. Everything is saved in this browser, so your setup is ready next time.</p>
      </section>

      <div className="setup">
        <div className="card rise" style={vars({ '--i': 1 })}>
          <h2><b>01</b>Match</h2>
          <div className="label">Plan title (optional)</div>
          <input value={S.title} onChange={e => patch({ title: e.target.value })} placeholder="e.g. Scrim · Week 3 playoffs" maxLength={60} />
          <div className="label">Teams</div>
          <div className="teams">
            {([0, 1] as const).map(i => (
              <div className="tin" key={i}>
                <span style={{ background: TEAMC[i] }}>{i ? 'B' : 'A'}</span>
                <input value={S.teams[i]} onChange={e => setTeam(i, e.target.value)} onBlur={fixTeams} maxLength={24} />
              </div>
            ))}
          </div>
          <div className="label">Who starts the veto</div>
          <div className="seg">
            {firstOpts.map(([k, l]) => <button key={k} className={cx(S.first === k && 'on')} onClick={() => patch({ first: k })}>{l}</button>)}
          </div>
        </div>

        <div className="card rise" style={vars({ '--i': 2 })}>
          <h2><b>02</b>Format</h2>
          <div className="fmts">
            {(Object.keys(FORMATS).map(Number) as Format[]).map(k => (
              <button key={k} className={cx('fmt', S.format === k && 'on')} onClick={() => patch({ format: k, seq: null })}>
                <b>{FORMATS[k].label}</b><small>{FORMATS[k].d}</small>
              </button>
            ))}
          </div>
          <div className="toggle">
            <div><b style={{ fontSize: 14 }}>Side selection</b><div className="hint">Opponent of the picker chooses Attack or Defense</div></div>
            <button className={cx('sw', S.sidePick && 'on')} onClick={() => patch({ sidePick: !S.sidePick })} aria-label="Toggle side selection" aria-pressed={S.sidePick} />
          </div>
          <div className="label" style={{ marginTop: 4 }}>Turn timer</div>
          <div className="seg">
            {TIMERS.map(t => <button key={t} className={cx(S.timer === t && 'on')} onClick={() => patch({ timer: t })}>{t ? `${t}s` : 'Off'}</button>)}
          </div>
          <div className="hint" style={{ marginTop: 8 }}>When time runs out, a random choice is made — just like a live veto.</div>
        </div>

        <div className="card wide rise" style={vars({ '--i': 3 })}>
          <h2><b>03</b>Map pool <span className="pill" style={{ marginLeft: 'auto' }}><b>{n}</b> selected</span></h2>
          <div className="hint">Tap a map to toggle it. Use “i” for details and to add strategy notes.</div>
          <div className="pool">
            {allMaps(S).map(m => (
              <div key={m.id} className={cx('ptile', S.pool.includes(m.id) && 'on')} onClick={() => togglePool(m.id)}>
                <MapArt map={m} watermark={false} />
                <span className="nm">{m.name}</span>
                <span className="ck" />
                <span className="pi" onClick={e => { e.stopPropagation(); openInfo(m.id); }}>i</span>
                {m.custom && <span className="x" onClick={e => { e.stopPropagation(); delMap(m.id); }}>×</span>}
              </div>
            ))}
          </div>
          <div className="addmap">
            <input value={cmName} onChange={e => setCmName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMap()} placeholder="Custom map name" maxLength={20} />
            <input value={cmImg} onChange={e => setCmImg(e.target.value)} placeholder="Image URL (optional)" />
            <button className="btn" onClick={addMap}>+ Add map</button>
          </div>
        </div>

        <div className="card wide rise" style={vars({ '--i': 4 })}>
          <h2>
            <b>04</b>Veto sequence
            {S.seq && <button className="btn ghost" style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: 12 }} onClick={() => patch({ seq: null })}>Reset to default</button>}
          </h2>
          <div className="hint">Auto-generated for {FORMATS[S.format].name} with {n} maps. Click a team badge or action to customise; a single leftover map becomes the decider.</div>
          <div className="seqbar">
            {seq.map((s, i) => (
              <div key={i} className={cx('step', s.t)}>
                <span className="no">{i + 1}</span>
                <button className="tm" style={{ background: TEAMC[s.team] }} title="Switch team" onClick={() => editSeq(q => { q[i].team = (1 - q[i].team) as TeamIdx; })}>{s.team ? 'B' : 'A'}</button>
                <button className="ty" title="Switch ban/pick" onClick={() => editSeq(q => { q[i].t = q[i].t === 'ban' ? 'pick' : 'ban'; })}>{s.t.toUpperCase()}</button>
                <button className="del" title="Remove" onClick={() => editSeq(q => { q.splice(i, 1); })}>×</button>
              </div>
            ))}
            <div className="stepadd">
              {(['ban', 'pick'] as const).map(t => (
                <button key={t} onClick={() => editSeq(q => { const last = q[q.length - 1]; q.push({ t, team: last ? ((1 - last.team) as TeamIdx) : 0 }); })}>+ {t === 'ban' ? 'Ban' : 'Pick'}</button>
              ))}
            </div>
          </div>
          <div className="summary">
            {sim.overflow ? <span className="pill warn">Sequence has more steps than maps in the pool</span>
              : sim.valid ? <span className="pill ok">✓ Produces exactly {plural(sim.games, 'map')}</span>
              : <span className="pill warn">Produces {plural(sim.games, 'map')} — {FORMATS[S.format].label} needs {S.format}</span>}
            <span className="pill"><b>{sim.bans}</b> bans</span>
            <span className="pill"><b>{sim.picks}</b> picks</span>
            {sim.decider > 0 && <span className="pill"><b>1</b> decider</span>}
            {sim.unplayed > 0 && <span className="pill"><b>{sim.unplayed}</b> left unplayed</span>}
          </div>
        </div>
      </div>

      <div className="launch rise" style={vars({ '--i': 5 })}>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}><Icon.up /> Import plan (.json)</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button className="btn primary big" onClick={onStart} disabled={sim.overflow || sim.games < 1}>Start veto →</button>
      </div>
    </>
  );
}
