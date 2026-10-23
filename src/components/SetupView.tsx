import { Fragment, useRef, useState } from 'react';
import { FORMATS, TEAMC, defaultSetup } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { allMaps, deciderSideTeam, getSeq, other, simulate } from '../lib/veto';
import { useApp } from '../state';
import type { FirstTurn, Format, SeqStep, StepType, TeamIdx } from '../types';
import { Icon } from './Icons';
import { MapArt } from './MapArt';

const TIMERS = [0, 20, 45, 60];
export const IMPORT_ERROR = 'This file isn’t a Map Veto plan. Export one from a finished veto and try again.';

/** The pre-match lobby: who's playing, the format, the pool, and the exact veto order. */
export function SetupView({ onStart, onImport }: { onStart: () => void; onImport: (json: unknown) => void }) {
  const { setup: S, patch, toast } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const canStart = !sim.overflow && sim.games > 0;

  const setTeam = (i: TeamIdx, v: string) => patch(s => {
    const teams: [string, string] = [...s.teams];
    teams[i] = v;
    return { teams };
  });
  const fixTeams = () => patch(s => ({ teams: [s.teams[0].trim() || 'Team A', s.teams[1].trim() || 'Team B'] }));
  const role = (i: TeamIdx) =>
    S.first === 'coin' ? 'Coin toss decides who acts first' : (S.first === 'a') === (i === 0) ? 'Acts first' : 'Acts second';

  return (
    <div className="lobby-page">
      {/* ---------- the match banner ---------- */}
      <section className="versus rise" style={vars({ '--i': 0 })} aria-label="Teams">
        <div className="vs-side a" style={vars({ '--tc': TEAMC[0] })}>
          <span className="vs-tag">A</span>
          <div className="vs-name">
            <input value={S.teams[0]} onChange={e => setTeam(0, e.target.value)} onBlur={fixTeams} maxLength={24} aria-label="Team A name" spellCheck={false} />
            <small>{role(0)}</small>
          </div>
        </div>
        <div className="vs-seam" aria-hidden="true"><span>VS</span></div>
        <div className="vs-side b" style={vars({ '--tc': TEAMC[1] })}>
          <div className="vs-name">
            <input value={S.teams[1]} onChange={e => setTeam(1, e.target.value)} onBlur={fixTeams} maxLength={24} aria-label="Team B name" spellCheck={false} />
            <small>{role(1)}</small>
          </div>
          <span className="vs-tag">B</span>
        </div>
        <div className="vs-base">
          <div className="vs-first">
            <span className="vs-label" id="first-label">First to act</span>
            <div className="seg" role="group" aria-labelledby="first-label">
              {([['a', S.teams[0]], ['b', S.teams[1]], ['coin', 'Coin toss']] as [FirstTurn, string][]).map(([k, l]) => (
                <button key={k} className={cx(S.first === k && 'on')} aria-pressed={S.first === k} onClick={() => patch({ first: k })}>{l}</button>
              ))}
            </div>
          </div>
          <label className="vs-title">
            <span className="vs-label">Match title</span>
            <input value={S.title} onChange={e => patch({ title: e.target.value })} placeholder="Optional, e.g. Week 3 playoffs" maxLength={60} />
          </label>
        </div>
      </section>

      {/* ---------- format & rules ---------- */}
      <section className="rules rise" style={vars({ '--i': 1 })} aria-label="Format and rules">
        <div className="fmt-tabs" role="group" aria-label="Format">
          {(Object.keys(FORMATS).map(Number) as Format[]).map(k => (
            <button key={k} className={cx('fmt-tab', S.format === k && 'on')} aria-pressed={S.format === k} onClick={() => patch({ format: k, seq: null })}>
              <b>{FORMATS[k].label}</b>
              <small>{FORMATS[k].name}</small>
            </button>
          ))}
        </div>
        <div className="rule-opts">
          <div className="rule">
            <span className="vs-label" id="side-label">Side selection</span>
            <button className={cx('sw', S.sidePick && 'on')} onClick={() => patch({ sidePick: !S.sidePick })} aria-pressed={S.sidePick} aria-labelledby="side-label" />
          </div>
          <div className="rule">
            <span className="vs-label" id="timer-label">Turn timer</span>
            <div className="seg" role="group" aria-labelledby="timer-label">
              {TIMERS.map(t => <button key={t} className={cx(S.timer === t && 'on')} aria-pressed={S.timer === t} onClick={() => patch({ timer: t })}>{t ? `${t}s` : 'Off'}</button>)}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- pool + order ---------- */}
      <div className="lobby rise" style={vars({ '--i': 2 })}>
        <MapPool />
        <aside className="order" aria-label="Veto order">
          <div className="order-scroll"><VetoOrder /></div>
          <div className="order-foot">
            <OrderResult />
            <div className="order-go">
              <button className="btn primary lg" onClick={onStart} disabled={!canStart}>Start the veto</button>
              <ImportButton onImport={onImport} onError={() => toast(IMPORT_ERROR)} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- map pool ---------------- */
function MapPool() {
  const { setup: S, patch, toast, openInfo } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [img, setImg] = useState('');
  const maps = allMaps(S);

  const toggle = (id: string) => patch(s => {
    const order = allMaps(s).map(m => m.id);
    const pool = s.pool.includes(id) ? s.pool.filter(x => x !== id) : [...s.pool, id];
    pool.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return { pool, seq: null };
  });
  const add = () => {
    const n = name.trim();
    if (!n) return toast('Give the map a name');
    const hue = Math.floor(Math.random() * 360), id = 'c_' + Date.now().toString(36);
    patch(s => ({
      custom: [...s.custom, {
        id, name: n, loc: 'Custom map', sites: '—', tag: 'Custom', desc: '', custom: true,
        img: /^https?:\/\//.test(img.trim()) ? img.trim() : '', c: [`hsl(${hue} 40% 32%)`, `hsl(${hue} 40% 9%)`],
      }],
      pool: [...s.pool, id],
      seq: null,
    }));
    setName('');
    setImg('');
    setAdding(false);
    toast(`${n} added to the pool`);
  };
  const remove = (id: string) => patch(s => ({ custom: s.custom.filter(m => m.id !== id), pool: s.pool.filter(x => x !== id), seq: null }));
  const isDefault = S.pool.join() === defaultSetup().pool.join();

  return (
    <section className="pool-sec" aria-labelledby="pool-h">
      <header className="lobby-h">
        <h2 id="pool-h">Map pool</h2>
        <span className="lobby-meta">{S.pool.length} of {maps.length} in play</span>
        {!isDefault && <button className="btn ghost sm" onClick={() => patch({ pool: defaultSetup().pool, seq: null })}>Reset pool</button>}
      </header>
      <div className="pool">
        {maps.map(m => {
          const on = S.pool.includes(m.id);
          return (
            <div key={m.id} className={cx('ptile', on && 'on')}>
              <MapArt map={m} watermark={false} />
              <span className="nm">{m.name}<small>{m.tag}</small></span>
              <span className="ck">{on && <Icon.check />}</span>
              <button className="ptile-hit" aria-pressed={on} aria-label={`${m.name}, ${on ? 'in pool' : 'not in pool'}`} onClick={() => toggle(m.id)} />
              <button className="pi" aria-label={`${m.name} details and notes`} onClick={() => openInfo(m.id)}>i</button>
              {m.custom && <button className="x" aria-label={`Delete ${m.name}`} onClick={() => remove(m.id)}><Icon.close /></button>}
            </div>
          );
        })}
        {!adding && (
          <button className="ptile ptile-add" onClick={() => setAdding(true)}>
            <span>+ Custom map</span>
          </button>
        )}
      </div>
      {adding && (
        <form className="addmap" onSubmit={e => { e.preventDefault(); add(); }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Map name" maxLength={20} aria-label="Custom map name" />
          <input value={img} onChange={e => setImg(e.target.value)} placeholder="Image URL (optional)" aria-label="Custom map image URL" />
          <button className="btn" type="submit">Add map</button>
          <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}
    </section>
  );
}

/* ---------------- veto order rail ---------------- */
function VetoOrder() {
  const { setup: S, patch } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const short = (t: TeamIdx) => S.teams[t] || (t ? 'Team B' : 'Team A');

  const edit = (fn: (q: SeqStep[]) => void) => {
    const q = seq.map(x => ({ ...x }));
    fn(q);
    patch({ seq: q });
  };
  const addStep = (t: StepType) => edit(q => { const last = q[q.length - 1]; q.push({ t, team: last ? other(last.team) : 0 }); });

  return (
    <>
      <header className="lobby-h">
        <h2>Veto order</h2>
        {S.seq && <button className="btn ghost sm" onClick={() => patch({ seq: null })}>Use default</button>}
      </header>
      <ol className="rail">
        {seq.map((s, i) => (
          <Fragment key={i}>
            <li className={cx('rail-row', s.t)}>
              <span className="rail-no">{String(i + 1).padStart(2, '0')}</span>
              <button
                className="team-chip"
                style={vars({ '--tc': TEAMC[s.team] })}
                onClick={() => edit(q => { q[i].team = other(q[i].team); })}
                aria-label={`Step ${i + 1}: ${short(s.team)}. Switch to ${short(other(s.team))}`}
              >
                <i />{short(s.team)}
              </button>
              <div className="act" role="group" aria-label={`Step ${i + 1} action`}>
                {(['ban', 'pick'] as const).map(t => (
                  <button key={t} className={t} aria-pressed={s.t === t} onClick={() => edit(q => { q[i].t = t; })}>{t === 'ban' ? 'Ban' : 'Pick'}</button>
                ))}
              </div>
              <button className="rail-del" aria-label={`Remove step ${i + 1}`} onClick={() => edit(q => { q.splice(i, 1); })}><Icon.close /></button>
            </li>
            {s.t === 'pick' && S.sidePick && (
              <li className="rail-sub" style={vars({ '--tc': TEAMC[other(s.team)] })}><i />{short(other(s.team))} picks a side</li>
            )}
          </Fragment>
        ))}
        {sim.decider > 0 && (
          <>
            <li className="rail-row decider">
              <span className="rail-no" aria-hidden="true">◆</span>
              <span className="rail-auto">Decider<small>The last map left is played</small></span>
            </li>
            {S.sidePick && (
              <li className="rail-sub" style={vars({ '--tc': TEAMC[deciderSideTeam(seq)] })}><i />{short(deciderSideTeam(seq))} picks a side</li>
            )}
          </>
        )}
        {sim.unplayed > 0 && <li className="rail-sub muted">{sim.unplayed} map{sim.unplayed > 1 ? 's' : ''} left unplayed</li>}
      </ol>
      <div className="rail-add">
        <button className="btn sm" onClick={() => addStep('ban')}>Add a ban</button>
        <button className="btn sm" onClick={() => addStep('pick')}>Add a pick</button>
      </div>
    </>
  );
}

function OrderResult() {
  const { setup: S } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const F = FORMATS[S.format];
  const status = sim.overflow
    ? { ok: false, text: `More steps than maps. Remove a step or add ${seq.length - S.pool.length + 1 > 1 ? 'maps' : 'a map'} to the pool.` }
    : sim.valid
      ? { ok: true, text: `Ready for ${F.name.toLowerCase()}` }
      : sim.games < S.format
        ? { ok: false, text: `${F.label} needs ${S.format} maps. Add a pick, or remove bans until one map is left over as the decider.` }
        : { ok: false, text: `${F.label} needs ${S.format} maps. Change a pick to a ban.` };

  return (
    <div className={cx('order-result', status.ok ? 'ok' : 'warn')} role="status">
      <div className="res-num"><b>{sim.games}</b><span>map{sim.games === 1 ? '' : 's'} from {S.pool.length}</span></div>
      <p>{status.ok && <Icon.check />}{status.text}</p>
      <small>{sim.bans} ban{sim.bans === 1 ? '' : 's'}, {sim.picks} pick{sim.picks === 1 ? '' : 's'}{sim.decider ? ', 1 decider' : ''}</small>
    </div>
  );
}

function ImportButton({ onImport, onError }: { onImport: (json: unknown) => void; onError: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const read = async (f?: File) => {
    if (!f) return;
    try { onImport(JSON.parse(await f.text())); } catch { onError(); }
  };
  return (
    <>
      <button className="btn ghost sm" onClick={() => ref.current?.click()}><Icon.up /> Import a saved plan</button>
      <input ref={ref} type="file" accept=".json,application/json" hidden onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}

