import { useState } from 'react';
import { cx } from '../lib/fx';
import { minimapFor, useMapArtVersion } from '../lib/images';

/** The official minimap with named callouts; pick an area to see only its callouts. */
export function Minimap({ mapId, name }: { mapId: string; name: string }) {
  useMapArtVersion();
  const mini = minimapFor(mapId);
  const [region, setRegion] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [hot, setHot] = useState<string | null>(null);

  if (!mini) return null;
  const regions = [...new Set(mini.callouts.map(c => c.region))].sort();
  const label = (c: { name: string; region: string }) => (/^[A-C]$/.test(c.region) ? `${c.region} ${c.name}` : c.name);
  const shown = mini.callouts
    .filter(c => !region || c.region === region)
    .sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));

  return (
    <section className="card minimap-card" aria-labelledby="mm-h">
      <div className="mm-head">
        <h2 id="mm-h">Callouts</h2>
        <span className="lobby-meta">{shown.length} on the map</span>
        <button className={cx('btn ghost sm', !labels && 'off')} onClick={() => setLabels(l => !l)} aria-pressed={labels}>
          {labels ? 'Hide labels' : 'Show labels'}
        </button>
      </div>
      <div className="mm-regions" role="group" aria-label="Filter by area">
        <button className={cx(!region && 'on')} aria-pressed={!region} onClick={() => setRegion(null)}>All</button>
        {regions.map(r => (
          <button key={r} className={cx(region === r && 'on')} aria-pressed={region === r} onClick={() => setRegion(r === region ? null : r)}>{r}</button>
        ))}
      </div>
      <div className="mm-body">
        <div className="mm-map">
          <img src={mini.icon} alt={`${name} minimap`} loading="lazy" />
          {shown.map(c => (
            <span
              key={c.region + c.name}
              className={cx('mm-pin', hot === c.region + c.name && 'hot', !labels && 'dot')}
              style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
              onMouseEnter={() => setHot(c.region + c.name)}
              onMouseLeave={() => setHot(null)}
            >
              {labels ? label(c) : ''}
            </span>
          ))}
        </div>
        <ul className="mm-list" aria-label="Callout names">
          {shown.map(c => (
            <li key={c.region + c.name} className={cx(hot === c.region + c.name && 'hot')} onMouseEnter={() => setHot(c.region + c.name)} onMouseLeave={() => setHot(null)}>
              <small>{c.region}</small>{label(c)}
            </li>
          ))}
        </ul>
      </div>
      <p className="hint">Minimap and callout names from valorant-api.com.</p>
    </section>
  );
}
