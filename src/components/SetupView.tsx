import { Fragment, useRef, useState } from 'react';
import { ALL_MAP_IDS, COMPETITIVE_POOL, FORMATS, TEAMC } from '../data/maps';
import { BUILTIN_PRESETS, describePreset } from '../data/presets';
import { cx, vars } from '../lib/fx';
import { allMaps, deciderSider, getSeq, other, pickSider, poolPreset, simulate, sortPool } from '../lib/veto';
import { useApp } from '../state';
import type { DeciderRule, FirstTurn, Format, PoolPreset, RulePreset, SeqStep, Setup, SideRule, StepType, TeamIdx } from '../types';
import { Icon } from './Icons';
import { MapArt } from './MapArt';
import { Overlay } from './Overlay';
import { TeamMark } from './TeamMark';

const TIMERS = [0, 20, 45, 60];
export const IMPORT_ERROR = 'This file isn’t a Map Veto plan. Export one from a finished veto and try again.';

/** The pre-match lobby: who's playing, the format, the pool, and the exact veto order. */
export function SetupView({ onStart, onImport }: { onStart: () => void; onImport: (json: unknown) => void }) {
  const { setup: S, patch, toast } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const canStart = !sim.overflow && sim.games > 0;
  const [confirm, setConfirm] = useState(false);
  const [logoFor, setLogoFor] = useState<TeamIdx | null>(null);
  const start = () => (sim.valid ? onStart() : setConfirm(true));

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
          <LogoButton i={0} onClick={() => setLogoFor(0)} />
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
          <LogoButton i={1} onClick={() => setLogoFor(1)} />
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
          <div className="vs-meta">
            <label className="vs-title">
              <span className="vs-label">Match title</span>
              <input value={S.title} onChange={e => patch({ title: e.target.value })} placeholder="Optional, e.g. Upper final" maxLength={60} />
            </label>
            <label className="vs-event">
              <span className="vs-label">Event</span>
              <input value={S.event} onChange={e => patch({ event: e.target.value })} placeholder="Optional, e.g. Spring Cup" maxLength={40} />
            </label>
            <label className="vs-date">
              <span className="vs-label">Date and time</span>
              <input type="datetime-local" value={S.date} onChange={e => patch({ date: e.target.value })} />
            </label>
          </div>
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
          <TimerRule />
        </div>
        <RulesMore />
      </section>

      {/* ---------- pool + order ---------- */}
      <div className="lobby rise" style={vars({ '--i': 2 })}>
        <MapPool />
        <aside className="order" aria-label="Veto order">
          <div className="order-scroll"><VetoOrder /></div>
          <div className="order-foot">
            <OrderResult />
            <div className="order-go">
              <button className="btn primary lg" onClick={start} disabled={!canStart}>Start the veto</button>
              <ImportButton onImport={onImport} onError={() => toast(IMPORT_ERROR)} />
            </div>
          </div>
        </aside>
      </div>

      <Overlay open={confirm} onClose={() => setConfirm(false)} labelledBy="start-title">
        <div className="confirm">
          <h2 id="start-title">Start with this order?</h2>
          <p>
            This order gives {sim.games} map{sim.games === 1 ? '' : 's'}, but {FORMATS[S.format].name.toLowerCase()} needs {S.format}.
            You can still run it, for example as a practice veto.
          </p>
          <div className="confirm-actions">
            <button className="btn ghost" onClick={() => setConfirm(false)} autoFocus>Keep editing</button>
            <button className="btn primary" onClick={() => { setConfirm(false); onStart(); }}>Start anyway</button>
          </div>
        </div>
      </Overlay>
      <LogoSheet i={logoFor} onClose={() => setLogoFor(null)} />
    </div>
  );
}

/* ---------------- team logos ---------------- */
function LogoButton({ i, onClick }: { i: TeamIdx; onClick: () => void }) {
  const { setup: S } = useApp();
  return (
    <button className="vs-tag" onClick={onClick} aria-label={`${S.teams[i]} logo${S.logos[i] ? '' : ', none set'}. Change`} title="Set a team logo">
      <TeamMark i={i} url={S.logos[i]} />
    </button>
  );
}

function LogoSheet({ i, onClose }: { i: TeamIdx | null; onClose: () => void }) {
  const { setup: S, patch } = useApp();
  const [url, setUrl] = useState('');
  const [last, setLast] = useState<TeamIdx | null>(null);
  if (i !== last) { setLast(i); if (i != null) setUrl(S.logos[i]); }
  const save = (v: string) => {
    if (i == null) return;
    patch(s => { const logos: [string, string] = [...s.logos]; logos[i] = v; return { logos }; });
    onClose();
  };
  const ok = !url.trim() || /^https?:\/\/\S+$/.test(url.trim());
  return (
    <Overlay open={i != null} onClose={onClose} labelledBy="logo-title">
      <div className="confirm">
        <h2 id="logo-title">{i != null ? S.teams[i] : ''} logo</h2>
        <form className="logo-form" onSubmit={e => { e.preventDefault(); if (ok) save(url.trim()); }}>
          <div className="logo-prev">{i != null && <TeamMark i={i} url={ok ? url.trim() : ''} />}</div>
          <label className="field">
            <span className="vs-label">Image URL</span>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/logo.png" inputMode="url" aria-invalid={!ok} />
            <small className="hint">{ok ? 'Square PNG or SVG works best. Shown on the board, the plan and the image export.' : 'Use a full link starting with https://'}</small>
          </label>
          <div className="confirm-actions">
            {i != null && S.logos[i] && <button type="button" className="btn ghost" onClick={() => save('')}>Remove logo</button>}
            <button type="submit" className="btn primary" disabled={!ok}>Save logo</button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

/* ---------------- rules ---------------- */
function TimerRule() {
  const { setup: S, patch } = useApp();
  const custom = !TIMERS.includes(S.timer);
  const [editing, setEditing] = useState(custom);
  return (
    <div className="rule">
      <span className="vs-label" id="timer-label">Turn timer</span>
      <div className="seg" role="group" aria-labelledby="timer-label">
        {TIMERS.map(t => (
          <button key={t} className={cx(!editing && S.timer === t && 'on')} aria-pressed={!editing && S.timer === t} onClick={() => { setEditing(false); patch({ timer: t }); }}>
            {t ? `${t}s` : 'Off'}
          </button>
        ))}
        <button className={cx(editing && 'on')} aria-pressed={editing} onClick={() => { setEditing(true); if (!custom) patch({ timer: 30 }); }}>Custom</button>
      </div>
      {editing && (
        <label className="timer-custom">
          <input type="number" min={5} max={600} step={5} value={S.timer || ''} aria-label="Seconds per turn"
            onChange={e => patch({ timer: Math.max(0, Math.min(600, Math.round(Number(e.target.value) || 0))) })} />
          <span>s</span>
        </label>
      )}
    </div>
  );
}

const DECIDER_RULES: [DeciderRule, string][] = [
  ['lastban', 'Team that didn’t ban last'],
  ['teamA', 'Team A'],
  ['teamB', 'Team B'],
  ['knife', 'Knife round in game'],
];

const sameSeq = (a: SeqStep[], b: SeqStep[]) => a.length === b.length && a.every((x, i) => x.t === b[i].t && x.team === b[i].team);

function RulesMore() {
  const { setup: S, patch, toast } = useApp();
  const presets = [...BUILTIN_PRESETS, ...S.presets];
  const seq = getSeq(S);
  const active = presets.find(p => p.format === S.format && sameSeq(p.seq, seq) && p.sidePick === S.sidePick && p.sideRule === S.sideRule && p.deciderRule === S.deciderRule);
  const userPreset = active && S.presets.some(p => p.id === active.id) ? active : null;
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const apply = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    patch({ format: p.format, seq: p.seq.map(x => ({ ...x })), sidePick: p.sidePick, sideRule: p.sideRule, deciderRule: p.deciderRule });
    toast(p.poolSize === S.pool.length ? `Using ${p.name}` : `Using ${p.name}. It’s built for ${p.poolSize} maps; your pool has ${S.pool.length}`);
  };
  const save = () => {
    const n = name.trim();
    if (!n) return toast('Give the rule set a name');
    const p: RulePreset = { id: 'u_' + Date.now().toString(36), name: n.slice(0, 40), format: S.format, poolSize: S.pool.length, seq: seq.map(x => ({ ...x })), sidePick: S.sidePick, sideRule: S.sideRule, deciderRule: S.deciderRule };
    patch(s => ({ presets: [...s.presets, p].slice(-12), seq: p.seq }));
    setNaming(false);
    toast(`Saved ${p.name}`);
  };
  const del = () => {
    if (!userPreset) return;
    patch(s => ({ presets: s.presets.filter(p => p.id !== userPreset.id) }));
    toast(`Deleted ${userPreset.name}`);
  };

  return (
    <div className="rules-more">
      <div className="rule rule-preset">
        <label className="vs-label" htmlFor="preset-sel">Rule set</label>
        <select id="preset-sel" value={active?.id ?? ''} onChange={e => apply(e.target.value)}>
          {!active && <option value="" disabled>Custom order</option>}
          <optgroup label="Common orders">
            {BUILTIN_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
          {S.presets.length > 0 && (
            <optgroup label="Saved in this browser">
              {S.presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
        </select>
        {naming ? (
          <form className="preset-name" onSubmit={e => { e.preventDefault(); save(); }}>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={40} aria-label="Rule set name" placeholder="e.g. League Bo3" />
            <button className="btn sm" type="submit">Save</button>
            <button className="btn ghost sm" type="button" onClick={() => setNaming(false)}>Cancel</button>
          </form>
        ) : userPreset
          ? <button className="btn ghost sm" onClick={del}>Delete</button>
          : !active && <button className="btn ghost sm" onClick={() => { setName(`${FORMATS[S.format].label} house rules`); setNaming(true); }}>Save as rule set</button>}
      </div>
      {active && !naming && <span className="hint rule-desc">{describePreset(active)}</span>}
      {S.sidePick && (
        <div className="rule-sides">
          <div className="rule">
            <span className="vs-label" id="siderule-label">After a pick, side chosen by</span>
            <div className="seg" role="group" aria-labelledby="siderule-label">
              {([['opponent', 'Opponent'], ['picker', 'Picker']] as [SideRule, string][]).map(([k, l]) => (
                <button key={k} className={cx(S.sideRule === k && 'on')} aria-pressed={S.sideRule === k} onClick={() => patch({ sideRule: k })}>{l}</button>
              ))}
            </div>
          </div>
          <div className="rule">
            <label className="vs-label" htmlFor="decider-sel">Decider side</label>
            <select id="decider-sel" value={S.deciderRule} onChange={e => patch({ deciderRule: e.target.value as DeciderRule })}>
              {DECIDER_RULES.map(([k, l]) => <option key={k} value={k}>{k === 'teamA' ? S.teams[0] : k === 'teamB' ? S.teams[1] : l}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- map pool ---------------- */
function MapPool() {
  const { setup: S, patch, toast, openInfo } = useApp();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [img, setImg] = useState('');
  const maps = allMaps(S);

  const preset = poolPreset(S.pool);
  // the custom list on hand: the live pool when it's custom, otherwise the one we remembered
  const savedCustom = preset === 'custom' ? S.pool : S.customPool;

  /** Any hand edit makes the pool the team's custom list, so remember it. */
  const commit = (s: Setup, next: string[]) => {
    const pool = sortPool(s, next);
    return { pool, customPool: poolPreset(pool) === 'custom' ? pool : s.customPool, seq: null };
  };
  const toggle = (id: string) => patch(s => commit(s, s.pool.includes(id) ? s.pool.filter(x => x !== id) : [...s.pool, id]));

  const choose = (p: PoolPreset) => {
    if (p === preset) return;
    if (p === 'custom' && !savedCustom.length) {
      toast('Select or remove maps below to build your custom list');
      return;
    }
    patch(s => {
      const saved = poolPreset(s.pool) === 'custom' ? s.pool : s.customPool;
      const pool = p === 'competitive' ? COMPETITIVE_POOL : p === 'all' ? ALL_MAP_IDS : saved;
      return { pool: sortPool(s, pool), customPool: saved, seq: null };
    });
  };
  const startEdit = (id: string) => {
    const m = S.custom.find(x => x.id === id);
    if (!m) return;
    setEditId(id); setName(m.name); setImg(m.img ?? ''); setAdding(true);
  };
  const close = () => { setAdding(false); setEditId(null); setName(''); setImg(''); };
  const add = () => {
    const n = name.trim();
    if (!n) return toast('Give the map a name');
    if (editId) {
      const url = img.trim();
      patch(s => ({ custom: s.custom.map(m => (m.id === editId ? { ...m, name: n, img: /^https?:\/\//.test(url) ? url : '' } : m)) }));
      toast(`${n} updated`);
      return close();
    }
    const hue = Math.floor(Math.random() * 360), id = 'c_' + Date.now().toString(36);
    patch(s => {
      const custom = [...s.custom, {
        id, name: n, loc: 'Custom map', sites: '—', tag: 'Custom', desc: '', custom: true,
        img: /^https?:\/\//.test(img.trim()) ? img.trim() : '', c: [`hsl(${hue} 40% 32%)`, `hsl(${hue} 40% 9%)`] as [string, string],
      }];
      return { custom, ...commit({ ...s, custom }, [...s.pool, id]) };
    });
    setName('');
    setImg('');
    setAdding(false);
    toast(`${n} added to the pool`);
  };
  const remove = (id: string) => patch(s => ({
    custom: s.custom.filter(m => m.id !== id),
    pool: s.pool.filter(x => x !== id),
    customPool: s.customPool.filter(x => x !== id),
    seq: null,
  }));

  const presets: { k: PoolPreset; label: string; n: number | null }[] = [
    { k: 'competitive', label: 'Competitive', n: COMPETITIVE_POOL.length },
    { k: 'all', label: 'All maps', n: ALL_MAP_IDS.length },
    { k: 'custom', label: 'Custom', n: savedCustom.length || null },
  ];
  const presetHint = {
    competitive: 'The current competitive rotation.',
    all: 'Every official map.',
    custom: 'Your own list, saved in this browser. Select maps below to change it.',
  }[preset];

  return (
    <section className="pool-sec" aria-labelledby="pool-h">
      <header className="lobby-h pool-h">
        <h2 id="pool-h">Map pool</h2>
        <span className="lobby-meta">{S.pool.length} of {maps.length} in play</span>
        <div className="seg pool-presets" role="group" aria-label="Map pool preset">
          {presets.map(p => (
            <button key={p.k} className={cx(preset === p.k && 'on')} aria-pressed={preset === p.k} onClick={() => choose(p.k)}>
              {p.label}{p.n != null && <small>{p.n}</small>}
            </button>
          ))}
        </div>
      </header>
      <p className="hint pool-hint">{presetHint}</p>
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
              {m.custom && <button className="ed" aria-label={`Edit ${m.name}`} onClick={() => startEdit(m.id)}><Icon.edit /></button>}
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
          <button className="btn" type="submit">{editId ? 'Save map' : 'Add map'}</button>
          <button className="btn ghost" type="button" onClick={close}>Cancel</button>
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
  const decSider = deciderSider(S, seq);

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
              <li className="rail-sub" style={vars({ '--tc': TEAMC[pickSider(S, s.team)] })}><i />{short(pickSider(S, s.team))} picks a side</li>
            )}
          </Fragment>
        ))}
        {sim.decider > 0 && (
          <>
            <li className="rail-row decider">
              <span className="rail-no" aria-hidden="true">◆</span>
              <span className="rail-auto">Decider<small>The last map left is played</small></span>
            </li>
            {S.sidePick && (decSider != null
              ? <li className="rail-sub" style={vars({ '--tc': TEAMC[decSider] })}><i />{short(decSider)} picks a side</li>
              : <li className="rail-sub muted">Knife round decides sides</li>)}
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

