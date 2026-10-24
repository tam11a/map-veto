import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Panel, SectionTitle } from './kit';
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
    <Panel className="mt-6 p-5 sm:p-6" aria-labelledby="mm-h">
      <SectionTitle
        id="mm-h"
        aside={<>
          <span className="text-sm text-muted-foreground tabular-nums">{shown.length} on the map</span>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setLabels(l => !l)} aria-pressed={labels}>
            {labels ? 'Hide labels' : 'Show labels'}
          </Button>
        </>}
      >
        Callouts
      </SectionTitle>
      <div className="mt-3 mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by area">
        {[null, ...regions].map(r => {
          const on = region === r;
          return (
            <Button key={r ?? 'all'} size="sm" variant={on ? 'secondary' : 'ghost'} aria-pressed={on} onClick={() => setRegion(r === region ? null : r)}
              className={cn('rounded-full border', on ? 'border-pick bg-pick/12 text-foreground' : 'border-white/10 text-muted-foreground')}>
              {r ?? 'All'}
            </Button>
          );
        })}
      </div>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative mx-auto aspect-square w-full max-w-170 rounded-xl bg-black/25">
          <img src={mini.icon} alt={`${name} minimap`} loading="lazy" className="size-full object-contain" />
          {shown.map(c => {
            const key = c.region + c.name, isHot = hot === key;
            return (
              <span
                key={key}
                data-pin
                className={cn(
                  'absolute z-[1] -translate-1/2 cursor-default rounded-full border whitespace-nowrap transition-colors',
                  labels ? 'px-1.5 text-[9px] leading-[1.4] font-semibold sm:text-[11px]' : 'size-2.5',
                  isHot ? 'z-[2] border-pick bg-pick text-ink' : labels ? 'border-white/15 bg-[rgb(11_8_15/0.8)]' : 'border-black/50 bg-pick',
                )}
                style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                onMouseEnter={() => setHot(key)}
                onMouseLeave={() => setHot(null)}
              >
                {labels ? label(c) : ''}
              </span>
            );
          })}
        </div>
        <ScrollArea className="h-64 md:h-155">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-0.5 pr-3 md:grid-cols-1" aria-label="Callout names">
          {shown.map(c => {
            const key = c.region + c.name;
            return (
              <li key={key} className={cn('grid cursor-default rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors', hot === key && 'bg-white/8 text-pick')} onMouseEnter={() => setHot(key)} onMouseLeave={() => setHot(null)}>
                <small className="text-[11px] font-medium text-dim">{c.region}</small>{label(c)}
              </li>
            );
          })}
        </ul>
        </ScrollArea>
      </div>
      <p className="mt-3 text-xs text-dim">Minimap and callout names from valorant-api.com.</p>
    </Panel>
  );
}
