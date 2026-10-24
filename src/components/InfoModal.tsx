import { DialogTitle } from '@/components/ui/dialog';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { getMap } from '@/lib/veto';
import { useApp } from '@/state';
import type { MapInfo } from '@/types';
import { MapArt } from './MapArt';
import { MapNotes } from './MapNotes';

/** Sites, release year and signature mechanic, as three small tiles. */
export function MapFacts({ map: m }: { map: MapInfo }) {
  const facts: [string, string][] = [['Sites', m.sites], ['Released', m.year ? String(m.year) : '—'], ['Signature', m.tag || '—']];
  return (
    <ItemGroup className="grid grid-cols-3 gap-2">
      {facts.map(([k, v]) => (
        <Item key={k} role="listitem" variant="outline" size="sm" className="items-start border-white/10 bg-black/25 px-3 py-2.5">
          <ItemContent className="gap-0.5">
            <ItemDescription className="text-xs">{k}</ItemDescription>
            <ItemTitle className="line-clamp-2 font-bold">{v}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

/** Map details plus the team's notes for that map (shown in a dialog). */
export function InfoSheet({ mapId }: { mapId: string }) {
  const { setup } = useApp();
  const m = getMap(setup, mapId);
  return (
    <>
      <div className="relative h-56 shrink-0">
        <MapArt map={m} kind="splash" watermark={false} className="absolute inset-0" />
        <div className="absolute inset-0 bg-linear-to-t from-popover via-popover/30 to-transparent" />
      </div>
      <div className="relative -mt-14 grid gap-4 px-6 pb-6">
        <div>
          <p className="text-sm text-muted-foreground">{m.loc}</p>
          <DialogTitle className="text-4xl font-extrabold tracking-[-0.03em]">{m.name}</DialogTitle>
        </div>
        <MapFacts map={m} />
        {m.desc && <p className="leading-relaxed text-muted-foreground">{m.desc}</p>}
        <MapNotes mapId={mapId} hint="shown on the plan and export" />
      </div>
    </>
  );
}
