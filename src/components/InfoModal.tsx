import { useApp } from '../state';
import { getMap } from '../lib/veto';
import { MapArt } from './MapArt';
import { MapNotes } from './MapNotes';

/** Map details plus the team's notes for that map. */
export function InfoSheet({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const { setup } = useApp();
  const m = getMap(setup, mapId);
  return (
    <>
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="hero-art"><MapArt map={m} kind="splash" watermark={false} /></div>
      <div className="body">
        <div className="kicker">{m.loc}</div>
        <h2 id="info-title">{m.name}</h2>
        <div className="facts">
          <div><small>Sites</small><b>{m.sites}</b></div>
          <div><small>Released</small><b>{m.year ?? '—'}</b></div>
          <div><small>Signature</small><b style={{ fontSize: 14 }}>{m.tag || '—'}</b></div>
        </div>
        {m.desc && <p>{m.desc}</p>}
        <MapNotes mapId={mapId} hint="shown on the plan and export" />
      </div>
    </>
  );
}
