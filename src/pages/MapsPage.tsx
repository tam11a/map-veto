import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { MapArt } from '../components/MapArt';
import { MAPS } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { useTitle } from '../lib/useTitle';
import { useApp } from '../state';

type Filter = 'all' | 'pool' | '2' | '3';
const FILTERS: [Filter, string][] = [['all', 'All maps'], ['pool', 'My pool'], ['2', '2 sites'], ['3', '3 sites']];

export function MapsPage() {
  useTitle('Map pool');
  const { setup } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = MAPS.filter(m => {
    const query = q.trim().toLowerCase();
    if (query && !`${m.name} ${m.loc} ${m.tag}`.toLowerCase().includes(query)) return false;
    if (filter === 'pool') return setup.pool.includes(m.id);
    if (filter === '2') return m.sites.split(',').length === 2;
    if (filter === '3') return m.sites.split(',').length === 3;
    return true;
  });

  return (
    <div className="container">
      <section className="page-hero">
        <h1>Map pool</h1>
        <p>Every map with its sites, signature mechanic and a quick read on how it plays. Open a map to add your team’s notes. They show up in the veto and on your exported plan.</p>
      </section>
      <div className="toolbar">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search maps, locations, mechanics…" aria-label="Search maps" />
        <div className="seg">
          {FILTERS.map(([k, l]) => <button key={k} className={cx(filter === k && 'on')} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        <span className="count">{list.length} of {MAPS.length} maps</span>
      </div>
      {list.length ? (
        <div className="map-grid">
          {list.map((m, i) => (
            <Link to={`/maps/${m.id}`} key={m.id} className="map-tile" style={vars({ '--i': i })}>
              <MapArt map={m} kind="tall" watermark={false} />
              {setup.pool.includes(m.id) && <span className="inpool"><Icon.check /> In pool</span>}
              <div className="mt-label">
                <div className="loc">{m.loc}</div>
                <h3>{m.name}</h3>
                <div className="tags">
                  <span>Sites {m.sites}</span>
                  <span>{m.tag}</span>
                  {setup.notes[m.id] && <span><Icon.note /> Notes</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">No maps match “{q}”.</div>
      )}
    </div>
  );
}
