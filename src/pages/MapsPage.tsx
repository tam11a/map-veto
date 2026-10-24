import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { MapArt } from '../components/MapArt';
import { COMPETITIVE_POOL, MAPS } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { useTitle } from '../lib/useTitle';
import { poolPreset, sortPool } from '../lib/veto';
import { WIKI_PAGE } from '../../scripts/rotation-core.mjs';
import type { RotationInfo } from '../lib/rotation';
import type { MapInfo } from '../types';
import { useApp } from '../state';

type Rotation = 'all' | 'competitive';
type Sites = 'any' | '2' | '3';

const siteCount = (sites: string) => sites.split(',').length;

type Sort = 'name' | 'newest' | 'oldest' | 'sites';
const SORTS: [Sort, string][] = [['name', 'Name'], ['newest', 'Newest'], ['oldest', 'Oldest'], ['sites', 'Most sites']];
const sorters: Record<Sort, (a: MapInfo, b: MapInfo) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  newest: (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.name.localeCompare(b.name),
  oldest: (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.name.localeCompare(b.name),
  sites: (a, b) => siteCount(b.sites) - siteCount(a.sites) || a.name.localeCompare(b.name),
};

/** Filters live in the URL (?rotation=competitive&sites=3&mine=1&q=door) so a view can be shared. */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const rotation: Rotation = params.get('rotation') === 'competitive' ? 'competitive' : 'all';
  const sites: Sites = params.get('sites') === '2' || params.get('sites') === '3' ? (params.get('sites') as Sites) : 'any';
  const mine = params.get('mine') === '1';
  const q = params.get('q') ?? '';
  const sort: Sort = SORTS.some(([k]) => k === params.get('sort')) ? (params.get('sort') as Sort) : 'name';
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value == null || value === '') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  return {
    rotation, sites, mine, q, sort,
    setSort: (v: Sort) => set('sort', v === 'name' ? null : v),
    active: rotation !== 'all' || sites !== 'any' || mine || q.trim() !== '',
    setRotation: (v: Rotation) => set('rotation', v === 'all' ? null : v),
    setSites: (v: Sites) => set('sites', v === 'any' ? null : v),
    setMine: (v: boolean) => set('mine', v ? '1' : null),
    setQ: (v: string) => set('q', v),
    clear: () => setParams(sort === 'name' ? new URLSearchParams() : new URLSearchParams({ sort }), { replace: true }),
  };
}

export function MapsPage() {
  useTitle('Map pool');
  const { setup, patch, toast, rotation } = useApp();
  const f = useFilters();

  const list = MAPS.filter(m => {
    const query = f.q.trim().toLowerCase();
    if (query && !`${m.name} ${m.loc} ${m.tag}`.toLowerCase().includes(query)) return false;
    if (f.rotation === 'competitive' && !COMPETITIVE_POOL.includes(m.id)) return false;
    if (f.sites !== 'any' && siteCount(m.sites) !== +f.sites) return false;
    if (f.mine && !setup.pool.includes(m.id)) return false;
    return true;
  }).sort(sorters[f.sort]);

  const ids = list.map(m => m.id);
  const isCurrentPool = ids.length === setup.pool.length && ids.every(id => setup.pool.includes(id));
  const usePool = () => {
    patch(s => {
      const pool = sortPool(s, ids);
      // a list that isn't a preset becomes the team's custom list in the lobby
      return { pool, customPool: poolPreset(pool) === 'custom' ? pool : s.customPool, seq: null };
    });
    toast(`Veto pool set to ${ids.length} maps`);
  };

  // "2 of 12 maps: competitive, 3 sites"
  const quals = [
    f.rotation === 'competitive' && 'competitive',
    f.sites !== 'any' && `${f.sites} sites`,
    f.mine && 'in your veto pool',
    f.q.trim() && `matching “${f.q.trim()}”`,
  ].filter(Boolean) as string[];
  const count = f.active ? `${list.length} of ${MAPS.length} maps` : `All ${MAPS.length} maps`;

  return (
    <div className="container">
      <section className="page-hero">
        <h1>Map pool</h1>
        <p>Sites, the signature mechanic and how each map plays. Open a map to add notes for your team.</p>
        <RotationSource info={rotation} />
      </section>

      <section className="filters frost" aria-label="Filter maps">
        <label className="filter-search">
          <Icon.search />
          <input value={f.q} onChange={e => f.setQ(e.target.value)} placeholder="Search maps, locations, mechanics" aria-label="Search maps" type="search" />
        </label>
        <div className="filter-group">
          <span className="filter-label" id="rot-label">Rotation</span>
          <div className="seg" role="group" aria-labelledby="rot-label">
            {([['competitive', 'Competitive'], ['all', 'All maps']] as [Rotation, string][]).map(([k, l]) => (
              <button key={k} className={cx(f.rotation === k && 'on')} aria-pressed={f.rotation === k} onClick={() => f.setRotation(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label" id="sites-label">Sites</span>
          <div className="seg" role="group" aria-labelledby="sites-label">
            {([['any', 'Any'], ['2', '2'], ['3', '3']] as [Sites, string][]).map(([k, l]) => (
              <button key={k} className={cx(f.sites === k && 'on')} aria-pressed={f.sites === k} onClick={() => f.setSites(k)}>{l}</button>
            ))}
          </div>
        </div>
        <button className={cx('filter-toggle', f.mine && 'on')} aria-pressed={f.mine} onClick={() => f.setMine(!f.mine)}>
          <span className="ft-box">{f.mine && <Icon.check />}</span>My veto pool
        </button>
      </section>

      <div className="results-bar" role="status">
        <span className="results-text"><b>{count}</b>{quals.length > 0 && <span className="mute">: {quals.join(', ')}</span>}</span>
        <div className="results-actions">
          <label className="results-sort">
            <span className="filter-label">Sort</span>
            <select value={f.sort} onChange={e => f.setSort(e.target.value as Sort)}>
              {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {f.active && <button className="btn ghost sm" onClick={f.clear}>Clear filters</button>}
          {list.length >= 2 && (
            <button className="btn glassy sm" onClick={usePool} disabled={isCurrentPool} title={isCurrentPool ? 'These maps are already your veto pool' : undefined}>
              {isCurrentPool ? <><Icon.check /> Your veto pool</> : `Use as veto pool`}
            </button>
          )}
        </div>
      </div>

      {list.length ? (
        <div className="map-grid">
          {list.map((m, i) => {
            const comp = COMPETITIVE_POOL.includes(m.id);
            return (
              <Link to={`/maps/${m.id}`} key={m.id} className="map-tile" style={vars({ '--i': i })}>
                <MapArt map={m} kind="tall" watermark={false} />
                {setup.pool.includes(m.id) && <span className="inpool"><Icon.check /> In pool</span>}
                <div className="mt-label">
                  <div className="loc">{m.loc}</div>
                  <h3>{m.name}</h3>
                  <div className="tags">
                    <span className={cx('rot', comp ? 'comp' : 'off')}>{comp ? 'Competitive' : 'Not in rotation'}</span>
                    <span>Sites {m.sites}</span>
                    <span>{m.tag}</span>
                    {setup.notes[m.id] && <span><Icon.note /> Notes</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty frost">
          <h2>No maps match these filters</h2>
          <p>Active filters: {quals.join(', ')}. Turn one off, or clear them all.</p>
          <button className="btn primary" onClick={f.clear}>Clear filters</button>
        </div>
      )}
    </div>
  );
}

const RANKED_POOL_SIZE = 7;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

/** Says where the competitive rotation came from, so a stale list is never mistaken for a live one. */
function RotationSource({ info }: { info: RotationInfo }) {
  const label = info.source === 'live' ? 'Live rotation' : info.source === 'snapshot' ? 'Rotation snapshot' : 'Built-in rotation';
  const from = info.origin === 'wiki'
    ? <> from the <a href={WIKI_PAGE} target="_blank" rel="noreferrer">Valorant Wiki</a></>
    : info.origin === 'henrikdev' ? ' from Riot’s queue data' : null;
  const note = info.source === 'built-in' ? 'May be out of date'
    : info.origin === 'wiki' ? 'Community-edited, CC BY-SA'
    : <>Via the <a href="https://docs.henrikdev.xyz/" target="_blank" rel="noreferrer">HenrikDev API</a></>;
  // the ranked pool is 7 maps; a different count usually means the source is mid-update
  const odd = info.source !== 'built-in' && COMPETITIVE_POOL.length !== RANKED_POOL_SIZE;
  // two text blocks only, so the pill never splits the sentence into columns
  return (
    <p className={`rot-source ${info.source}`}>
      <i aria-hidden="true" />
      <span className="rs-main"><b>{label}</b>{from}{info.updated && <span className="rs-date">{fmtDate(info.updated)}</span>}</span>
      <span className="rs-note">{note}</span>
      {odd && (
        <span className="rs-warn">
          Lists {COMPETITIVE_POOL.length} maps; the ranked pool is usually {RANKED_POOL_SIZE}, so this may be mid-update.
        </span>
      )}
    </p>
  );
}
