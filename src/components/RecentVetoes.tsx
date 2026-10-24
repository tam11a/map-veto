import { useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { FORMATS, TEAMC } from '@/data/maps';
import { removeHistory, useHistory } from '@/lib/session';
import type { Payload } from '@/lib/share';
import { getMap } from '@/lib/veto';
import { useApp } from '@/state';
import { SectionTitle } from './kit';
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
    <section className="mt-12 grid gap-3" aria-labelledby="recent-h">
      <SectionTitle id="recent-h" aside={<span className="text-sm text-muted-foreground">Saved on this device</span>}>Recent vetoes</SectionTitle>
      <ItemGroup className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {list.map(e => (
            <Item key={e.id} role="listitem" variant="outline" className="flex-nowrap gap-4 rounded-xl border-white/10 bg-card py-2.5 pr-3 pl-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl">
              <ItemMedia className="flex h-16 gap-0.75" aria-hidden="true">
                {e.maps.slice(0, 5).map(id => <MapArt key={id} map={getMap(setup, id)} kind="tall" watermark={false} className="relative h-16 w-6.5 rounded-md first:rounded-l-lg last:rounded-r-lg" />)}
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0.5">
                <ItemTitle className="block w-full truncate text-base font-bold">
                  <span style={{ color: TEAMC[0] }}>{e.teams[0]}</span> <span className="font-medium text-dim">vs</span> <span style={{ color: TEAMC[1] }}>{e.teams[1]}</span>
                </ItemTitle>
                <ItemDescription className="line-clamp-1">
                  {e.title ? `${e.title}, ` : ''}{FORMATS[e.format].name.toLowerCase()}, {e.maps.map(id => getMap(setup, id).name).join(', ')}
                </ItemDescription>
                <small className="text-xs text-dim">{when(e.savedAt)}</small>
              </ItemContent>
              <ItemActions className="gap-1">
                <Button size="sm" variant="secondary" onClick={() => onOpen(e.plan)}>Open plan</Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-dim hover:text-foreground"
                  aria-label={`Remove ${e.teams[0]} vs ${e.teams[1]} from recent vetoes`}
                  onClick={() => { removeHistory(e.id); toast('Removed from recent vetoes'); }}
                >
                  <XIcon />
                </Button>
              </ItemActions>
            </Item>
        ))}
      </ItemGroup>
      {items.length > SHOWN && (
        <Button size="sm" variant="ghost" className="justify-self-center" onClick={() => setAll(a => !a)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </Button>
      )}
    </section>
  );
}
