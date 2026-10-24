import { useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FORMATS, TEAMC } from '@/data/maps';
import { removeHistory, useHistory } from '@/lib/session';
import type { Payload } from '@/lib/share';
import { getMap } from '@/lib/veto';
import { useApp } from '@/state';
import { Panel, SectionTitle } from './kit';
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
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map(e => (
          <li key={e.id}>
            <Panel className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-2.5 pr-3 pl-2.5">
              <div className="flex h-16 gap-0.75" aria-hidden="true">
                {e.maps.slice(0, 5).map(id => <MapArt key={id} map={getMap(setup, id)} kind="tall" watermark={false} className="relative h-16 w-6.5 rounded-md first:rounded-l-lg last:rounded-r-lg" />)}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <b className="truncate font-bold">
                  <span style={{ color: TEAMC[0] }}>{e.teams[0]}</span> <span className="font-medium text-dim">vs</span> <span style={{ color: TEAMC[1] }}>{e.teams[1]}</span>
                </b>
                <small className="truncate text-sm text-muted-foreground">
                  {e.title ? `${e.title}, ` : ''}{FORMATS[e.format].name.toLowerCase()}, {e.maps.map(id => getMap(setup, id).name).join(', ')}
                </small>
                <small className="text-xs text-dim">{when(e.savedAt)}</small>
              </div>
              <div className="flex items-center gap-1">
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
              </div>
            </Panel>
          </li>
        ))}
      </ul>
      {items.length > SHOWN && (
        <Button size="sm" variant="ghost" className="justify-self-center" onClick={() => setAll(a => !a)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </Button>
      )}
    </section>
  );
}
