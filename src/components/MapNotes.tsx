import { useState } from 'react';
import { ROLES, agentIcon, useAgents } from '../lib/agents';
import { cx } from '../lib/fx';
import { useApp } from '../state';
import type { Setup } from '../types';
import { Icon } from './Icons';

type NoteKey = 'notes' | 'notesAtk' | 'notesDef';
const COMP_SIZE = 5;

/** The team's prep for one map: general, attack and defense notes plus a five-agent comp. */
export function MapNotes({ mapId, hint }: { mapId: string; hint: string }) {
  const { setup, patch } = useApp();
  const set = (k: NoteKey, v: string) => patch(s => {
    const rec = { ...s[k] };
    if (v.trim()) rec[mapId] = v; else delete rec[mapId];
    return { [k]: rec } as Partial<Setup>;
  });

  return (
    <div className="map-notes">
      <div className="label">Team prep <span className="dim">({hint})</span></div>
      <label className="note-field">
        <span>General</span>
        <textarea value={setup.notes[mapId] ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Win conditions, anti-strat reminders…" maxLength={280} />
      </label>
      <div className="note-sides">
        <label className="note-field atk">
          <span>Attack</span>
          <textarea value={setup.notesAtk[mapId] ?? ''} onChange={e => set('notesAtk', e.target.value)} placeholder="Defaults, executes, who plays where" maxLength={280} />
        </label>
        <label className="note-field def">
          <span>Defense</span>
          <textarea value={setup.notesDef[mapId] ?? ''} onChange={e => set('notesDef', e.target.value)} placeholder="Setups, retakes, stack calls" maxLength={280} />
        </label>
      </div>
      <CompPicker mapId={mapId} />
    </div>
  );
}

function CompPicker({ mapId }: { mapId: string }) {
  const { setup, patch } = useApp();
  const agents = useAgents();
  const [open, setOpen] = useState(false);
  const comp = setup.comps[mapId] ?? [];

  const save = (next: string[]) => patch(s => {
    const comps = { ...s.comps };
    if (next.length) comps[mapId] = next; else delete comps[mapId];
    return { comps };
  });
  const toggle = (name: string) => {
    if (comp.includes(name)) save(comp.filter(n => n !== name));
    else if (comp.length < COMP_SIZE) save([...comp, name]);
  };

  return (
    <div className="comp">
      <div className="comp-head">
        <span>Agent comp</span>
        <button className="btn ghost sm" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'Done' : comp.length ? 'Change agents' : 'Choose agents'}
        </button>
      </div>
      <ol className="comp-slots" aria-label={`Comp, ${comp.length} of ${COMP_SIZE} agents`}>
        {Array.from({ length: COMP_SIZE }, (_, i) => {
          const name = comp[i];
          return (
            <li key={i} className={cx(!name && 'slot-free')}>
              {name ? (
                <button onClick={() => save(comp.filter(n => n !== name))} aria-label={`Remove ${name}`} title={`Remove ${name}`}>
                  {agentIcon(agents, name) ? <img src={agentIcon(agents, name)} alt="" /> : <b>{name.slice(0, 2)}</b>}
                  <small>{name}</small>
                </button>
              ) : <span aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      {open && (
        <div className="comp-grid">
          {!agents.length && <p className="hint">Loading agents…</p>}
          {ROLES.map(role => {
            const list = agents.filter(a => a.role === role);
            if (!list.length) return null;
            return (
              <div key={role} className="comp-role">
                <small>{role}s</small>
                <div>
                  {list.map(a => {
                    const on = comp.includes(a.name);
                    return (
                      <button key={a.name} className={cx('agent', on && 'on')} aria-pressed={on} disabled={!on && comp.length >= COMP_SIZE} onClick={() => toggle(a.name)} title={a.name}>
                        <img src={a.icon} alt="" loading="lazy" />
                        <span>{a.name}</span>
                        {on && <i><Icon.check /></i>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Small read-only row of agent portraits, used on the plan. */
export function CompRow({ names }: { names: string[] }) {
  const agents = useAgents();
  if (!names.length) return null;
  return (
    <div className="comp-row" aria-label={`Comp: ${names.join(', ')}`}>
      {names.map(n => (
        <span key={n} title={n}>{agentIcon(agents, n) ? <img src={agentIcon(agents, n)} alt="" /> : n.slice(0, 2)}</span>
      ))}
    </div>
  );
}
