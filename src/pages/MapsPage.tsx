import { Link, useSearchParams } from 'react-router-dom';
import { CheckIcon, NotebookPenIcon, SearchIcon } from 'lucide-react';
import { PageHeader, Panel, Segmented } from '../components/kit';
import { MapArt } from '../components/MapArt';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/ui/empty';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { COMPETITIVE_POOL, MAPS } from '../data/maps';
import { vars } from '../lib/fx';
import { cn } from '../lib/utils';
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
      <PageHeader title="Map pool" className="pb-6">
        <p>Sites, the signature mechanic and how each map plays. Open a map to add notes for your team.</p>
        <RotationSource info={rotation} />
      </PageHeader>

      <Panel className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3" aria-label="Filter maps">
        <div className="relative min-w-60 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
          <Input value={f.q} onChange={e => f.setQ(e.target.value)} placeholder="Search maps, locations, mechanics" aria-label="Search maps" type="search" className="pl-9" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-muted-foreground">Rotation</span>
          <Segmented<Rotation> label="Rotation" value={f.rotation} onChange={f.setRotation} options={[{ value: 'competitive', label: 'Competitive' }, { value: 'all', label: 'All maps' }]} />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-muted-foreground">Sites</span>
          <Segmented<Sites> label="Sites" value={f.sites} onChange={f.setSites} options={[{ value: 'any', label: 'Any' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="mine" checked={f.mine} onCheckedChange={v => f.setMine(v === true)} />
          <Label htmlFor="mine">My veto pool</Label>
        </div>
      </Panel>

      <div className="my-4 flex flex-wrap items-center justify-between gap-3 px-1" role="status">
        <p className="text-sm"><b className="font-semibold">{count}</b>{quals.length > 0 && <span className="text-muted-foreground">: {quals.join(', ')}</span>}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="sort" className="text-sm text-muted-foreground">Sort</Label>
          <Select value={f.sort} onValueChange={v => f.setSort(v as Sort)}>
            <SelectTrigger id="sort" size="sm" className="min-w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          {f.active && <Button size="sm" variant="ghost" onClick={f.clear}>Clear filters</Button>}
          {list.length >= 2 && (
            <Button size="sm" variant="secondary" onClick={usePool} disabled={isCurrentPool}>
              {isCurrentPool ? <><CheckIcon /> Your veto pool</> : 'Use as veto pool'}
            </Button>
          )}
        </div>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((m, i) => {
            const comp = COMPETITIVE_POOL.includes(m.id);
            return (
              <Link
                to={`/maps/${m.id}`}
                key={m.id}
                data-map-tile
                className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-xl border border-white/12 p-2.5 transition-[border-color,translate] duration-200 hover:border-white/30 motion-safe:animate-rise motion-safe:hover:-translate-y-1"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <MapArt map={m} kind="tall" watermark={false} className="absolute inset-0 transition-[scale] duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-linear-to-t from-black/55 to-transparent to-55%" />
                {setup.pool.includes(m.id) && <Badge className="absolute top-3 right-3 z-[2] bg-pick text-ink"><CheckIcon /> In pool</Badge>}
                <div className="relative z-[2] rounded-lg border border-white/12 bg-[rgb(14_10_20/0.5)] px-3.5 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] backdrop-blur-xl">
                  <p className="text-sm text-white/80">{m.loc}</p>
                  <h3 className="text-3xl leading-none font-extrabold tracking-[-0.03em]">{m.name}</h3>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge variant={comp ? 'pick' : 'glass'} className={cn(!comp && 'text-dim')}>{comp ? 'Competitive' : 'Not in rotation'}</Badge>
                    <Badge variant="glass">Sites {m.sites}</Badge>
                    <Badge variant="glass">{m.tag}</Badge>
                    {setup.notes[m.id] && <Badge variant="glass"><NotebookPenIcon /> Notes</Badge>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Panel>
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon"><SearchIcon /></EmptyMedia>
              <EmptyTitle className="text-2xl font-extrabold tracking-tight">No maps match these filters</EmptyTitle>
              <EmptyDescription>Active filters: {quals.join(', ')}. Turn one off, or clear them all.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button onClick={f.clear}>Clear filters</Button></EmptyContent>
          </Empty>
        </Panel>
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
  const link = 'underline decoration-white/30 underline-offset-2 hover:text-foreground';
  const from = info.origin === 'wiki'
    ? <> from the <a href={WIKI_PAGE} target="_blank" rel="noreferrer" className={link}>Valorant Wiki</a></>
    : info.origin === 'henrikdev' ? ' from Riot’s queue data' : null;
  const note = info.source === 'built-in' ? 'May be out of date'
    : info.origin === 'wiki' ? 'Community-edited, CC BY-SA'
    : <>Via the <a href="https://docs.henrikdev.xyz/" target="_blank" rel="noreferrer" className={link}>HenrikDev API</a></>;
  // the ranked pool is 7 maps; a different count usually means the source is mid-update
  const odd = info.source !== 'built-in' && COMPETITIVE_POOL.length !== RANKED_POOL_SIZE;
  const tone = info.source === 'live' ? 'var(--pick)' : info.source === 'snapshot' ? 'var(--decider)' : 'var(--ban)';
  return (
    <p
      data-rotation={info.source}
      className="mt-5 inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-(--tc)/35 bg-(--tc)/8 px-3.5 py-2 text-sm"
      style={vars({ '--tc': tone })}
    >
      <i className="size-2 shrink-0 rounded-full bg-(--tc) shadow-[0_0_0_3px_color-mix(in_srgb,var(--tc)_25%,transparent)]" aria-hidden="true" />
      <span className="min-w-0 text-muted-foreground">
        <b className="font-semibold text-foreground">{label}</b>{from}
        {info.updated && <span className="ml-2 border-l border-white/15 pl-2 tabular-nums">{fmtDate(info.updated)}</span>}
      </span>
      <span className="border-l border-white/15 pl-3 text-xs text-dim">{note}</span>
      {odd && (
        <span className="basis-full text-xs text-decider">
          Lists {COMPETITIVE_POOL.length} maps; the ranked pool is usually {RANKED_POOL_SIZE}, so this may be mid-update.
        </span>
      )}
    </p>
  );
}
