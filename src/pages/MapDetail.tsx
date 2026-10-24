import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckIcon, ChevronLeftIcon, PlusIcon } from 'lucide-react';
import { MapFacts } from '../components/InfoModal';
import { Panel } from '../components/kit';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { MapArt } from '../components/MapArt';
import { MapNotes } from '../components/MapNotes';
import { Minimap } from '../components/Minimap';
import { MAPS } from '../data/maps';
import { useTitle } from '../lib/useTitle';
import { useApp } from '../state';
import { NotFound } from './NotFound';

export function MapDetail() {
  const { id = '' } = useParams();
  const idx = MAPS.findIndex(m => m.id === id);
  const m = MAPS[idx];
  useTitle(m?.name ?? 'Map not found');
  const { setup, patch, toast } = useApp();
  const navigate = useNavigate();
  if (!m) return <NotFound />;

  const inPool = setup.pool.includes(m.id);
  const prev = MAPS[(idx - 1 + MAPS.length) % MAPS.length], next = MAPS[(idx + 1) % MAPS.length];
  const order = MAPS.map(x => x.id);
  const addToPool = (s: typeof setup) => [...s.pool, m.id].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  const togglePool = () => {
    patch(s => ({ pool: inPool ? s.pool.filter(x => x !== m.id) : addToPool(s), seq: null }));
    toast(inPool ? `${m.name} removed from your pool` : `${m.name} added to your pool`);
  };
  const vetoWith = () => {
    if (!inPool) patch(s => ({ pool: addToPool(s), seq: null }));
    navigate('/veto');
  };

  return (
    <>
      <section key={m.id} className="relative isolate flex h-[min(60vh,540px)] min-h-90 items-end overflow-hidden">
        <MapArt map={m} kind="splash" watermark={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/40 to-background/20" />
        <div className="container pb-10">
          <Link to="/maps" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ChevronLeftIcon className="size-4" /> All maps</Link>
          <p className="mt-4 text-sm text-[#ddd6e3]">{m.year ? `${m.loc}, released ${m.year}` : m.loc}</p>
          <h1 className="text-6xl font-extrabold tracking-[-0.04em] sm:text-7xl lg:text-8xl motion-safe:animate-rise">{m.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="glass">Sites {m.sites}</Badge>
            <Badge variant="glass">{m.tag}</Badge>
            {inPool && <Badge variant="pick"><CheckIcon /> In your pool</Badge>}
          </div>
        </div>
      </section>
      <div className="container">
        <div className="grid items-start gap-4 py-4 lg:grid-cols-[1.45fr_1fr]">
          <Panel className="grid gap-4 p-5 sm:p-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">How it plays</p>
              <p className="mt-1.5 leading-relaxed">{m.desc}</p>
            </div>
            <MapFacts map={m} />
            <MapNotes mapId={m.id} hint="saved in this browser, shown on your plan and export" />
          </Panel>
          <Panel className="grid gap-3 p-5 sm:p-6 lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-muted-foreground">Plan around {m.name}</p>
            <p className="leading-relaxed">{inPool ? `${m.name} is in your veto pool.` : `${m.name} isn’t in your veto pool yet.`} Your pool currently has {setup.pool.length} maps.</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button onClick={vetoWith}>Start a veto with {m.name}</Button>
              <Button variant="secondary" onClick={togglePool}>{inPool ? 'Remove from pool' : <><PlusIcon /> Add to pool</>}</Button>
            </div>
          </Panel>
        </div>
        <Minimap mapId={m.id} name={m.name} />
        <nav className="mt-6 grid grid-cols-2 gap-3" aria-label="Other maps">
          {([[prev, 'Previous map'], [next, 'Next map']] as const).map(([x, label], i) => (
            <Link key={label} to={`/maps/${x.id}`} className={cn('group relative grid h-28 content-end overflow-hidden rounded-xl border border-white/10 p-4 transition-colors hover:border-white/30', i === 1 && 'text-right')}>
              <MapArt map={x} kind="wide" watermark={false} className="absolute inset-0 -z-10 opacity-60 transition-[opacity,scale] duration-500 group-hover:scale-105 group-hover:opacity-80" />
              <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 to-black/20" />
              <small className="text-xs text-muted-foreground">{label}</small>
              <b className="text-2xl font-extrabold tracking-[-0.02em]">{x.name}</b>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
