import { useApp } from '../state';
import { getMap } from '../lib/veto';
import { MapArt } from './MapArt';

/** Map details plus the team's notes for that map. */
export function InfoSheet({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const { setup, patch } = useApp();
  const m = getMap(setup, mapId);
  const setNote = (v: string) => patch(s => {
    const notes = { ...s.notes };
    if (v.trim()) notes[mapId] = v; else delete notes[mapId];
    return { notes };
  });
  return (
    <>
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="hero-art"><MapArt map={m} kind="splash" watermark={false} /></div>
      <div className="body">
        <div className="kicker">{m.loc}</div>
        <h2>{m.name}</h2>
        <div className="facts">
          <div><small>Sites</small><b>{m.sites}</b></div>
          <div><small>Released</small><b>{m.year ?? '—'}</b></div>
          <div><small>Signature</small><b style={{ fontSize: 14 }}>{m.tag || '—'}</b></div>
        </div>
        {m.desc && <p>{m.desc}</p>}
        <div className="label">Team notes for this map <span style={{ color: 'var(--dim)' }}>— shown on the plan &amp; export</span></div>
        <textarea
          value={setup.notes[mapId] ?? ''}
          onChange={e => setNote(e.target.value)}
          placeholder="Comp, default setups, anti-strat reminders…"
          maxLength={280}
        />
      </div>
    </>
  );
}
