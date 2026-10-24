import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ROLES, agentIcon, useAgents } from '@/lib/agents';
import { cn } from '@/lib/utils';
import { useApp } from '@/state';
import type { Setup } from '@/types';

type NoteKey = 'notes' | 'notesAtk' | 'notesDef';
const COMP_SIZE = 5;

/** The team's prep for one map: general, attack and defense notes plus a five-agent comp. */
export function MapNotes({ mapId, hint }: { mapId: string; hint: string }) {
  const { setup, patch } = useApp();
  const set = (k: NoteKey, v: string) => patch(s => {
    const rec = { ...s[k] };
    if (v.trim()) rec[mapId] = v; else delete rec[mapId];
    return { [k]: rec } as Partial<Setup>;
  });
  const note = (k: NoteKey, label: string, placeholder: string, tone?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${k}-${mapId}`} className={cn('text-xs font-semibold text-muted-foreground', tone)}>{label}</Label>
      <Textarea id={`${k}-${mapId}`} value={setup[k][mapId] ?? ''} onChange={e => set(k, e.target.value)} placeholder={placeholder} maxLength={280} className="min-h-18 resize-y bg-black/25" />
    </div>
  );

  return (
    <section className="grid gap-3" aria-label="Team prep">
      <p className="text-sm font-semibold">Team prep <span className="font-normal text-dim">({hint})</span></p>
      {note('notes', 'General', 'Win conditions, anti-strat reminders…')}
      <div className="grid gap-3 sm:grid-cols-2">
        {note('notesAtk', 'Attack', 'Defaults, executes, who plays where', 'text-atk')}
        {note('notesDef', 'Defense', 'Setups, retakes, stack calls', 'text-def')}
      </div>
      <CompPicker mapId={mapId} />
    </section>
  );
}

function CompPicker({ mapId }: { mapId: string }) {
  const { setup, patch } = useApp();
  const agents = useAgents();
  const [open, setOpen] = useState(false);
  const comp = setup.comps[mapId] ?? [];

  const save = (next: string[]) => patch(s => {
    const comps = { ...s.comps };
    if (next.length) comps[mapId] = next; else delete comps[mapId];
    return { comps };
  });
  const toggle = (name: string) => {
    if (comp.includes(name)) save(comp.filter(n => n !== name));
    else if (comp.length < COMP_SIZE) save([...comp, name]);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Agent comp</span>
        <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'Done' : comp.length ? 'Change agents' : 'Choose agents'}
        </Button>
      </div>
      <ol className="grid grid-cols-5 gap-2 sm:max-w-md" aria-label={`Comp, ${comp.length} of ${COMP_SIZE} agents`}>
        {Array.from({ length: COMP_SIZE }, (_, i) => {
          const name = comp[i];
          return (
            <li key={i} className={cn('relative aspect-square overflow-hidden rounded-lg border bg-black/25', name ? 'border-white/10' : 'border-dashed border-white/15')}>
              {name && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="absolute inset-0 grid h-auto place-items-center rounded-none p-0 hover:bg-transparent hover:brightness-110 dark:hover:bg-transparent" onClick={() => save(comp.filter(n => n !== name))} aria-label={`Remove ${name}`}>
                      <Avatar className="absolute inset-0 size-full rounded-none after:hidden">
                        <AvatarImage src={agentIcon(agents, name)} alt="" className="rounded-none" />
                        <AvatarFallback className="rounded-none bg-transparent text-lg font-bold text-foreground">{name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <small className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-center text-[11px] font-semibold">{name}</small>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove {name}</TooltipContent>
                </Tooltip>
              )}
            </li>
          );
        })}
      </ol>
      {open && (
        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
          {!agents.length && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading agents…</p>}
          {ROLES.map(role => {
            const list = agents.filter(a => a.role === role);
            if (!list.length) return null;
            return (
              <div key={role}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{role}s</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
                  {list.map(a => {
                    const on = comp.includes(a.name);
                    return (
                      <Toggle
                        key={a.name}
                        pressed={on}
                        disabled={!on && comp.length >= COMP_SIZE}
                        onPressedChange={() => toggle(a.name)}
                        aria-label={a.name}
                        className={cn(
                          'relative grid h-auto justify-items-center gap-0.5 rounded-md border px-0.5 py-1.5 text-[11px] font-semibold active:scale-95 disabled:opacity-35',
                          'border-transparent text-muted-foreground hover:border-white/15 hover:bg-transparent hover:text-foreground data-[state=on]:border-pick data-[state=on]:bg-pick/10 data-[state=on]:text-foreground',
                        )}
                      >
                        <Avatar className="size-10 bg-white/10 after:hidden"><AvatarImage src={a.icon} alt="" loading="lazy" /><AvatarFallback className="bg-white/10 text-xs font-bold">{a.name.slice(0, 2)}</AvatarFallback></Avatar>
                        <span className="max-w-full truncate">{a.name}</span>
                        {on && <CheckIcon className="absolute top-1 right-1 size-3 text-pick" />}
                      </Toggle>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Small read-only row of agent portraits, used on the plan. */
export function CompRow({ names }: { names: string[] }) {
  const agents = useAgents();
  if (!names.length) return null;
  return (
    <div className="flex gap-1" aria-label={`Comp: ${names.join(', ')}`}>
      {names.map(n => (
        <Tooltip key={n}>
          <TooltipTrigger asChild>
            <Avatar className="size-7 ring-1 ring-white/15 after:hidden">
              <AvatarImage src={agentIcon(agents, n)} alt="" />
              <AvatarFallback className="bg-black/30 text-[10px] font-bold text-foreground">{n.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{n}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
