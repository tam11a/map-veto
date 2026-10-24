import { useState } from 'react';
import { FORMATS, TEAMC } from '../data/maps';
import { removeHistory, useHistory } from '../lib/session';
import type { Payload } from '../lib/share';
import { getMap } from '../lib/veto';
import { useApp } from '../state';
import { Icon } from './Icons';
import { MapArt } from './MapArt';

const SHOWN = 4;
const when = (ts: number) => {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Finished plans saved on this device, newest first. */
export function RecentVetoes({ onOpen }: { onOpen: (plan: Payload) => void }) {
  const { setup, toast } = useApp();
  const items = useHistory();
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const list = all ? items : items.slice(0, SHOWN);

  return (
    <section className="recent rise" style={{ ['--i' as string]: 3 }} aria-labelledby="recent-h">
      <header className="lobby-h">
        <h2 id="recent-h">Recent vetoes</h2>
        <span className="lobby-meta">Saved on this device</span>
      </header>
      <ul className="recent-list">
        {list.map(e => (
          <li key={e.id} className="recent-item frost">
            <div className="recent-maps" aria-hidden="true">
              {e.maps.slice(0, 5).map(id => <MapArt key={id} map={getMap(setup, id)} kind="tall" watermark={false} />)}
            </div>
            <div className="recent-text">
              <b>
                <span style={{ color: TEAMC[0] }}>{e.teams[0]}</span> vs <span style={{ color: TEAMC[1] }}>{e.teams[1]}</span>
              </b>
              <small>
                {e.title ? `${e.title}, ` : ''}{FORMATS[e.format].name.toLowerCase()}, {e.maps.map(id => getMap(setup, id).name).join(', ')}
              </small>
              <small className="recent-when">{when(e.savedAt)}</small>
            </div>
            <div className="recent-actions">
              <button className="btn glassy sm" onClick={() => onOpen(e.plan)}>Open plan</button>
              <button
                className="btn ghost sm recent-del"
                aria-label={`Remove ${e.teams[0]} vs ${e.teams[1]} from recent vetoes`}
                onClick={() => { removeHistory(e.id); toast('Removed from recent vetoes'); }}
              >
                <Icon.close />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length > SHOWN && (
        <button className="btn ghost sm recent-more" onClick={() => setAll(a => !a)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
