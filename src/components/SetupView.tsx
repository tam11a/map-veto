import { Fragment, useRef, useState } from 'react';
import { CheckIcon, DiamondIcon, PencilIcon, PlusIcon, UploadIcon, UsersIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ALL_MAP_IDS, COMPETITIVE_POOL, FORMATS, TEAMC } from '@/data/maps';
import { BUILTIN_PRESETS, describePreset } from '@/data/presets';
import { vars } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { allMaps, deciderSider, getSeq, other, pickSider, poolPreset, simulate, sortPool } from '@/lib/veto';
import { useApp } from '@/state';
import type { DeciderRule, FirstTurn, Format, PoolPreset, RulePreset, SeqStep, Setup, SideRule, StepType, TeamIdx } from '@/types';
import { ConfirmDialog, Field, Panel, SectionTitle, Segmented } from './kit';
import { MapArt } from './MapArt';
import { TeamMark } from './TeamMark';

const TIMERS = [0, 20, 45, 60];
export const IMPORT_ERROR = 'This file isn’t a Map Veto plan. Export one from a finished veto and try again.';

/** The pre-match lobby: who's playing, the format, the pool, and the exact veto order. */
export function SetupView({ onStart, onRoom, onImport }: { onStart: () => void; onRoom: () => Promise<void>; onImport: (json: unknown) => void }) {
  const { setup: S, toast } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const canStart = !sim.overflow && sim.games > 0;
  const [confirm, setConfirm] = useState(false);
  const [mode, setMode] = useState<'local' | 'room'>('local');
  const [creating, setCreating] = useState(false);
  const go = (m: 'local' | 'room') => { if (m === 'local') return onStart(); setCreating(true); onRoom().finally(() => setCreating(false)); };
  const start = (m: 'local' | 'room') => { setMode(m); if (sim.valid) go(m); else setConfirm(true); };

  return (
    <div className="grid gap-6">
      <Versus />
      <Rules />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <MapPool />
        <Panel className="grid lg:sticky lg:top-24" aria-label="Veto order">
          <div className="p-5"><VetoOrder /></div>
          <div className="grid gap-3 border-t border-white/10 p-5">
            <OrderResult />
            <Button size="lg" className="w-full" onClick={() => start('local')} disabled={!canStart}>Start the veto</Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="lg" variant="secondary" className="w-full" onClick={() => start('room')} disabled={!canStart || creating}>
                  <UsersIcon /> {creating ? 'Creating room…' : 'Start an online room'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Each captain vetoes from their own device</TooltipContent>
            </Tooltip>
            <ImportButton onImport={onImport} onError={() => toast(IMPORT_ERROR)} />
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Start with this order?"
        confirmLabel="Start anyway"
        cancelLabel="Keep editing"
        onConfirm={() => go(mode)}
      >
        This order gives {sim.games} map{sim.games === 1 ? '' : 's'}, but {FORMATS[S.format].name.toLowerCase()} needs {S.format}.
        You can still run it, for example as a practice veto.
      </ConfirmDialog>
    </div>
  );
}

/* ---------------- the match banner ---------------- */
function Versus() {
  const { setup: S, patch } = useApp();
  const [logoFor, setLogoFor] = useState<TeamIdx | null>(null);
  const setTeam = (i: TeamIdx, v: string) => patch(s => {
    const teams: [string, string] = [...s.teams];
    teams[i] = v;
    return { teams };
  });
  const fixTeams = () => patch(s => ({ teams: [s.teams[0].trim() || 'Team Alpha', s.teams[1].trim() || 'Team Omega'] }));
  const role = (i: TeamIdx) =>
    S.first === 'coin' ? 'Coin toss decides who acts first' : (S.first === 'a') === (i === 0) ? 'Acts first' : 'Acts second';

  const side = (i: TeamIdx) => (
    <div
      className={cn(
        'flex min-w-0 items-center gap-4 px-5 py-6 sm:py-7',
        i === 0
          ? 'bg-linear-to-r from-(--tc)/20 to-transparent shadow-[inset_4px_0_0_var(--tc)]'
          : 'bg-linear-to-l from-(--tc)/20 to-transparent shadow-[inset_-4px_0_0_var(--tc)] md:flex-row-reverse md:text-right',
      )}
      style={vars({ '--tc': TEAMC[i] })}
    >
      <button
        className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-lg bg-(--tc) text-2xl font-extrabold text-ink transition hover:ring-3 hover:ring-(--tc)/40 active:scale-95 has-[img]:bg-black/40"
        onClick={() => setLogoFor(i)}
        aria-label={`${S.teams[i]} logo${S.logos[i] ? '' : ', none set'}. Change`}
        title="Set a team logo"
      >
        <TeamMark i={i} url={S.logos[i]} />
      </button>
      <div className="min-w-0 flex-1">
        <input
          value={S.teams[i]}
          onChange={e => setTeam(i, e.target.value)}
          onBlur={fixTeams}
          maxLength={24}
          aria-label={`Team ${i ? 'B' : 'A'} name`}
          spellCheck={false}
          className={cn(
            'w-full truncate border-b-2 border-transparent bg-transparent py-0.5 text-3xl font-extrabold tracking-[-0.03em] text-foreground outline-none transition-colors hover:border-white/15 focus-visible:border-(--tc) sm:text-4xl',
            i === 1 && 'md:text-right',
          )}
        />
        <p className="mt-0.5 text-sm text-(--tc)">{role(i)}</p>
      </div>
    </div>
  );

  return (
    <Panel className="overflow-hidden" aria-label="Teams">
      <div className="grid md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)]">
        {side(0)}
        <div className="relative grid h-9 place-items-center md:h-auto" aria-hidden="true">
          <div className="absolute inset-y-0 left-1/2 w-14 -translate-x-1/2 -skew-x-12 border-x border-white/10 bg-black/30" />
          <span className="relative text-lg font-extrabold tracking-[0.12em] text-dim">VS</span>
        </div>
        {side(1)}
      </div>
      <div className="grid gap-4 border-t border-white/10 bg-black/25 px-5 py-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
        <Field label="First to act">
          <Segmented<FirstTurn>
            label="First to act"
            value={S.first}
            onChange={first => patch({ first })}
            options={[{ value: 'a', label: S.teams[0] }, { value: 'b', label: S.teams[1] }, { value: 'coin', label: 'Coin toss' }]}
            className="w-full sm:w-auto sm:min-w-[24rem]"
            stretch
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:ml-auto lg:max-w-3xl">
          <Field label="Match title" htmlFor="m-title">
            <Input id="m-title" value={S.title} onChange={e => patch({ title: e.target.value })} placeholder="Optional, e.g. Upper final" maxLength={60} />
          </Field>
          <Field label="Event" htmlFor="m-event">
            <Input id="m-event" value={S.event} onChange={e => patch({ event: e.target.value })} placeholder="Optional, e.g. Spring Cup" maxLength={40} />
          </Field>
          <Field label="Date and time" htmlFor="m-date">
            <Input id="m-date" type="datetime-local" value={S.date} onChange={e => patch({ date: e.target.value })} className="scheme-dark" />
          </Field>
        </div>
      </div>
      <LogoDialog i={logoFor} onClose={() => setLogoFor(null)} />
    </Panel>
  );
}

function LogoDialog({ i, onClose }: { i: TeamIdx | null; onClose: () => void }) {
  const { setup: S, patch } = useApp();
  const [url, setUrl] = useState('');
  const [last, setLast] = useState<TeamIdx | null>(null);
  if (i !== last) { setLast(i); if (i != null) setUrl(S.logos[i]); }
  const save = (v: string) => {
    if (i == null) return;
    patch(s => { const logos: [string, string] = [...s.logos]; logos[i] = v; return { logos }; });
    onClose();
  };
  const ok = !url.trim() || /^https?:\/\/\S+$/.test(url.trim());
  return (
    <Dialog open={i != null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent aria-describedby={undefined}>
        <form className="grid gap-4" onSubmit={e => { e.preventDefault(); if (ok) save(url.trim()); }}>
          <DialogHeader><DialogTitle className="text-2xl font-extrabold tracking-tight">{i != null ? S.teams[i] : ''} logo</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[88px_1fr] sm:items-start">
            <div className="grid size-22 place-items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 text-4xl font-extrabold text-dim">
              {i != null && <TeamMark i={i} url={ok ? url.trim() : ''} />}
            </div>
            <Field
              label="Image URL"
              htmlFor="logo-url"
              hint="Square PNG or SVG works best. Shown on the board, the plan and the image export."
              error={!ok && 'Use a full link starting with https://'}
            >
              <Input id="logo-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/logo.png" inputMode="url" aria-invalid={!ok} autoFocus />
            </Field>
          </div>
          <DialogFooter>
            {i != null && S.logos[i] && <Button type="button" variant="ghost" onClick={() => save('')}>Remove logo</Button>}
            <Button type="submit" disabled={!ok}>Save logo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- format & rules ---------------- */
function Rules() {
  const { setup: S, patch } = useApp();
  return (
    <section className="grid gap-4" aria-label="Format and rules">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-white/10">
        <div className="flex w-full gap-1 sm:w-auto" role="group" aria-label="Format">
          {(Object.keys(FORMATS).map(Number) as Format[]).map(k => (
            <button
              key={k}
              aria-pressed={S.format === k}
              onClick={() => patch({ format: k, seq: null })}
              className={cn(
                'relative flex-1 px-3 pt-1 pb-3 text-left text-muted-foreground transition-colors hover:text-foreground sm:flex-none sm:px-4',
                'after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t after:bg-ban after:opacity-0 after:transition-opacity sm:after:inset-x-4',
                S.format === k && 'text-foreground after:opacity-100',
              )}
            >
              <b className="block text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{FORMATS[k].label}</b>
              <small className="text-xs">{FORMATS[k].name}</small>
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 pb-3 sm:w-auto">
          <div className="flex items-center gap-3">
            <Label htmlFor="side-pick" className="text-sm text-muted-foreground">Side selection</Label>
            <Switch id="side-pick" checked={S.sidePick} onCheckedChange={sidePick => patch({ sidePick })} />
          </div>
          <TimerRule />
        </div>
      </div>
      <RuleSet />
    </section>
  );
}

function TimerRule() {
  const { setup: S, patch } = useApp();
  const custom = !TIMERS.includes(S.timer);
  const [editing, setEditing] = useState(custom);
  const value = editing ? 'custom' : String(S.timer);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground" id="timer-label">Turn timer</span>
      <Segmented
        label="Turn timer"
        value={value}
        onChange={v => {
          if (v === 'custom') { setEditing(true); if (!custom) patch({ timer: 30 }); return; }
          setEditing(false);
          patch({ timer: Number(v) });
        }}
        options={[...TIMERS.map(t => ({ value: String(t), label: t ? `${t}s` : 'Off' })), { value: 'custom', label: 'Custom' }]}
      />
      {editing && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Input
            type="number" min={5} max={600} step={5} value={S.timer || ''} aria-label="Seconds per turn"
            onChange={e => patch({ timer: Math.max(0, Math.min(600, Math.round(Number(e.target.value) || 0))) })}
            className="h-9 w-20 text-center tabular-nums"
          />
          s
        </div>
      )}
    </div>
  );
}

const DECIDER_RULES: [DeciderRule, string][] = [
  ['lastban', 'Team that didn’t ban last'],
  ['teamA', 'Team A'],
  ['teamB', 'Team B'],
  ['knife', 'Knife round in game'],
];

const sameSeq = (a: SeqStep[], b: SeqStep[]) => a.length === b.length && a.every((x, i) => x.t === b[i].t && x.team === b[i].team);

function RuleSet() {
  const { setup: S, patch, toast } = useApp();
  const presets = [...BUILTIN_PRESETS, ...S.presets];
  const seq = getSeq(S);
  const active = presets.find(p => p.format === S.format && sameSeq(p.seq, seq) && p.sidePick === S.sidePick && p.sideRule === S.sideRule && p.deciderRule === S.deciderRule);
  const userPreset = active && S.presets.some(p => p.id === active.id) ? active : null;
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const apply = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    patch({ format: p.format, seq: p.seq.map(x => ({ ...x })), sidePick: p.sidePick, sideRule: p.sideRule, deciderRule: p.deciderRule });
    toast(p.poolSize === S.pool.length ? `Using ${p.name}` : `Using ${p.name}. It’s built for ${p.poolSize} maps; your pool has ${S.pool.length}`);
  };
  const save = () => {
    const n = name.trim();
    if (!n) return toast('Give the rule set a name');
    const p: RulePreset = { id: 'u_' + Date.now().toString(36), name: n.slice(0, 40), format: S.format, poolSize: S.pool.length, seq: seq.map(x => ({ ...x })), sidePick: S.sidePick, sideRule: S.sideRule, deciderRule: S.deciderRule };
    patch(s => ({ presets: [...s.presets, p].slice(-12), seq: p.seq }));
    setNaming(false);
    toast(`Saved ${p.name}`);
  };
  const del = () => {
    if (!userPreset) return;
    patch(s => ({ presets: s.presets.filter(p => p.id !== userPreset.id) }));
    toast(`Deleted ${userPreset.name}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="preset-sel" className="text-sm text-muted-foreground">Rule set</Label>
        <Select value={active?.id ?? ''} onValueChange={apply}>
          <SelectTrigger id="preset-sel" className="min-w-52"><SelectValue placeholder="Custom order" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Common orders</SelectLabel>
              {BUILTIN_PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectGroup>
            {S.presets.length > 0 && (
              <SelectGroup>
                <SelectLabel>Saved in this browser</SelectLabel>
                {S.presets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        {naming ? (
          <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); save(); }}>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={40} aria-label="Rule set name" placeholder="e.g. League Bo3" className="h-9 w-44" />
            <Button size="sm" type="submit">Save</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setNaming(false)}>Cancel</Button>
          </form>
        ) : userPreset
          ? <Button size="sm" variant="ghost" onClick={del}>Delete</Button>
          : !active && <Button size="sm" variant="ghost" onClick={() => { setName(`${FORMATS[S.format].label} house rules`); setNaming(true); }}>Save as rule set</Button>}
      </div>
      {active && !naming && <span className="text-sm text-dim">{describePreset(active)}</span>}
      {S.sidePick && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:ml-auto">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">After a pick, side chosen by</span>
            <Segmented<SideRule>
              label="After a pick, side chosen by"
              value={S.sideRule}
              onChange={sideRule => patch({ sideRule })}
              options={[{ value: 'opponent', label: 'Opponent' }, { value: 'picker', label: 'Picker' }]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="decider-sel" className="text-sm text-muted-foreground">Decider side</Label>
            <Select value={S.deciderRule} onValueChange={v => patch({ deciderRule: v as DeciderRule })}>
              <SelectTrigger id="decider-sel" className="min-w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DECIDER_RULES.map(([k, l]) => <SelectItem key={k} value={k}>{k === 'teamA' ? S.teams[0] : k === 'teamB' ? S.teams[1] : l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- map pool ---------------- */
function MapPool() {
  const { setup: S, patch, toast, openInfo } = useApp();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [img, setImg] = useState('');
  const maps = allMaps(S);

  const preset = poolPreset(S.pool);
  // the custom list on hand: the live pool when it's custom, otherwise the one we remembered
  const savedCustom = preset === 'custom' ? S.pool : S.customPool;

  /** Any hand edit makes the pool the team's custom list, so remember it. */
  const commit = (s: Setup, next: string[]) => {
    const pool = sortPool(s, next);
    return { pool, customPool: poolPreset(pool) === 'custom' ? pool : s.customPool, seq: null };
  };
  const toggle = (id: string) => patch(s => commit(s, s.pool.includes(id) ? s.pool.filter(x => x !== id) : [...s.pool, id]));

  const choose = (p: PoolPreset) => {
    if (p === preset) return;
    if (p === 'custom' && !savedCustom.length) {
      toast('Select or remove maps below to build your custom list');
      return;
    }
    patch(s => {
      const saved = poolPreset(s.pool) === 'custom' ? s.pool : s.customPool;
      const pool = p === 'competitive' ? COMPETITIVE_POOL : p === 'all' ? ALL_MAP_IDS : saved;
      return { pool: sortPool(s, pool), customPool: saved, seq: null };
    });
  };
  const startEdit = (id: string) => {
    const m = S.custom.find(x => x.id === id);
    if (!m) return;
    setEditId(id); setName(m.name); setImg(m.img ?? ''); setAdding(true);
  };
  const close = () => { setAdding(false); setEditId(null); setName(''); setImg(''); };
  const add = () => {
    const n = name.trim();
    if (!n) return toast('Give the map a name');
    if (editId) {
      const url = img.trim();
      patch(s => ({ custom: s.custom.map(m => (m.id === editId ? { ...m, name: n, img: /^https?:\/\//.test(url) ? url : '' } : m)) }));
      toast(`${n} updated`);
      return close();
    }
    const hue = Math.floor(Math.random() * 360), id = 'c_' + Date.now().toString(36);
    patch(s => {
      const custom = [...s.custom, {
        id, name: n, loc: 'Custom map', sites: '—', tag: 'Custom', desc: '', custom: true,
        img: /^https?:\/\//.test(img.trim()) ? img.trim() : '', c: [`hsl(${hue} 40% 32%)`, `hsl(${hue} 40% 9%)`] as [string, string],
      }];
      return { custom, ...commit({ ...s, custom }, [...s.pool, id]) };
    });
    setName('');
    setImg('');
    setAdding(false);
    toast(`${n} added to the pool`);
  };
  const remove = (id: string) => patch(s => ({
    custom: s.custom.filter(m => m.id !== id),
    pool: s.pool.filter(x => x !== id),
    customPool: s.customPool.filter(x => x !== id),
    seq: null,
  }));

  const presetHint = {
    competitive: 'The current competitive rotation.',
    all: 'Every official map.',
    custom: 'Your own list, saved in this browser. Select maps below to change it.',
  }[preset];

  return (
    <section className="grid gap-3" aria-labelledby="pool-h">
      <SectionTitle id="pool-h" aside={<span className="text-sm text-muted-foreground tabular-nums">{S.pool.length} of {maps.length} in play</span>}>Map pool</SectionTitle>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dim">{presetHint}</p>
        <Segmented<PoolPreset>
          label="Map pool preset"
          value={preset}
          onChange={choose}
          options={[
            { value: 'competitive', label: 'Competitive', hint: COMPETITIVE_POOL.length },
            { value: 'all', label: 'All maps', hint: ALL_MAP_IDS.length },
            { value: 'custom', label: 'Custom', hint: savedCustom.length || undefined },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
        {maps.map(m => {
          const on = S.pool.includes(m.id);
          return (
            <div
              key={m.id}
              className={cn(
                'group relative h-26 overflow-hidden rounded-lg border transition-[opacity,border-color]',
                on ? 'border-pick' : 'border-white/10 opacity-50 hover:border-white/20 hover:opacity-80',
              )}
            >
              <MapArt map={m} watermark={false} className={cn('absolute inset-0 transition-[filter]', !on && 'grayscale')} />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-black/10" />
              <span className="pointer-events-none absolute inset-x-2.5 bottom-2 z-[2] flex flex-col leading-tight">
                <b className="text-base font-bold">{m.name}</b>
                <small className="truncate text-xs text-white/70">{m.tag}</small>
              </span>
              <span className={cn('pointer-events-none absolute top-2 right-2 z-[2] grid size-5.5 place-items-center rounded-full border-2 transition-colors', on ? 'border-pick bg-pick text-ink' : 'border-white/50')}>
                {on && <CheckIcon className="size-3.5" strokeWidth={3} />}
              </span>
              <button className="absolute inset-0 z-[3] rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-ring" aria-pressed={on} aria-label={`${m.name}, ${on ? 'in pool' : 'not in pool'}`} onClick={() => toggle(m.id)} />
              <div className="absolute top-1.5 left-1.5 z-[4] flex gap-1 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
                <Button size="icon-sm" variant="glass" className="size-7 rounded-full" aria-label={`${m.name} details and notes`} onClick={() => openInfo(m.id)}>
                  <span className="text-xs font-bold">i</span>
                </Button>
                {m.custom && <Button size="icon-sm" variant="glass" className="size-7 rounded-full" aria-label={`Edit ${m.name}`} onClick={() => startEdit(m.id)}><PencilIcon className="size-3.5" /></Button>}
                {m.custom && <Button size="icon-sm" variant="glass" className="size-7 rounded-full" aria-label={`Delete ${m.name}`} onClick={() => remove(m.id)}><XIcon className="size-3.5" /></Button>}
              </div>
            </div>
          );
        })}
        {!adding && (
          <button
            className="grid h-26 place-items-center rounded-lg border border-dashed border-white/20 text-sm font-semibold text-muted-foreground transition-colors hover:border-white/40 hover:text-foreground"
            onClick={() => setAdding(true)}
          >
            <span className="flex items-center gap-1.5"><PlusIcon className="size-4" /> Custom map</span>
          </button>
        )}
      </div>
      {adding && (
        <form className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto_auto]" onSubmit={e => { e.preventDefault(); add(); }}>
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Map name" maxLength={20} aria-label="Custom map name" />
          <Input value={img} onChange={e => setImg(e.target.value)} placeholder="Image URL (optional)" aria-label="Custom map image URL" />
          <Button type="submit" variant="secondary">{editId ? 'Save map' : 'Add map'}</Button>
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
        </form>
      )}
    </section>
  );
}

/* ---------------- veto order rail ---------------- */
function VetoOrder() {
  const { setup: S, patch } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const short = (t: TeamIdx) => S.teams[t] || (t ? 'Team Omega' : 'Team Alpha');
  const decSider = deciderSider(S, seq);

  const edit = (fn: (q: SeqStep[]) => void) => {
    const q = seq.map(x => ({ ...x }));
    fn(q);
    patch({ seq: q });
  };
  const addStep = (t: StepType) => edit(q => { const last = q[q.length - 1]; q.push({ t, team: last ? other(last.team) : 0 }); });

  const sub = (team: TeamIdx | null, text: string) => (
    <li className={cn('flex items-center gap-2 py-0.5 pl-11 text-sm', team == null ? 'text-dim' : 'text-muted-foreground')} style={team != null ? vars({ '--tc': TEAMC[team] }) : undefined}>
      {team != null && <i className="size-2 rounded-[2px] bg-(--tc)" />}{text}
    </li>
  );

  return (
    <>
      <SectionTitle className="mb-3" aside={S.seq && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => patch({ seq: null })}>Use default</Button>}>Veto order</SectionTitle>
      <ol className="relative grid gap-1.5 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-0.5 before:bg-white/10">
        {seq.map((s, i) => (
          <Fragment key={i}>
            <li className="relative grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-1">
              <span className={cn('relative z-[1] grid size-8 place-items-center rounded-full border-2 bg-[#1b1424] text-xs font-bold tabular-nums', s.t === 'ban' ? 'border-ban text-ban' : 'border-decider text-decider')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <button
                className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-black/25 px-2.5 py-1.5 text-left text-sm font-semibold transition-colors hover:border-(--tc)"
                style={vars({ '--tc': TEAMC[s.team] })}
                onClick={() => edit(q => { q[i].team = other(q[i].team); })}
                aria-label={`Step ${i + 1}: ${short(s.team)}. Switch to ${short(other(s.team))}`}
              >
                <i className="size-2.5 shrink-0 rounded-[3px] bg-(--tc)" /><span className="truncate">{short(s.team)}</span>
              </button>
              <div className="flex gap-0.5 rounded-md border border-white/10 bg-black/25 p-0.5" role="group" aria-label={`Step ${i + 1} action`}>
                {(['ban', 'pick'] as const).map(t => (
                  <button
                    key={t}
                    aria-pressed={s.t === t}
                    onClick={() => edit(q => { q[i].t = t; })}
                    className={cn(
                      'rounded-[5px] px-2.5 py-1 text-sm font-semibold text-dim transition-colors hover:text-foreground',
                      s.t === t && (t === 'ban' ? 'bg-ban/20 text-ban hover:text-ban' : 'bg-decider/20 text-decider hover:text-decider'),
                    )}
                  >
                    {t === 'ban' ? 'Ban' : 'Pick'}
                  </button>
                ))}
              </div>
              <Button size="icon-sm" variant="ghost" className="text-dim hover:text-foreground" aria-label={`Remove step ${i + 1}`} onClick={() => edit(q => { q.splice(i, 1); })}>
                <XIcon />
              </Button>
            </li>
            {s.t === 'pick' && S.sidePick && sub(pickSider(S, s.team), `${short(pickSider(S, s.team))} picks a side`)}
          </Fragment>
        ))}
        {sim.decider > 0 && (
          <>
            <li className="relative grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2">
              <span className="relative z-[1] grid size-8 place-items-center rounded-full bg-decider text-ink" aria-hidden="true"><DiamondIcon className="size-3.5" fill="currentColor" /></span>
              <span className="flex flex-col py-1 font-semibold text-decider">Decider<small className="text-xs font-normal text-muted-foreground">The last map left is played</small></span>
            </li>
            {S.sidePick && (decSider != null ? sub(decSider, `${short(decSider)} picks a side`) : sub(null, 'Knife round decides sides'))}
          </>
        )}
        {sim.unplayed > 0 && sub(null, `${sim.unplayed} map${sim.unplayed > 1 ? 's' : ''} left unplayed`)}
      </ol>
      <div className="mt-3 flex gap-2 pl-10">
        <Button size="sm" variant="secondary" onClick={() => addStep('ban')}><PlusIcon /> Add a ban</Button>
        <Button size="sm" variant="secondary" onClick={() => addStep('pick')}><PlusIcon /> Add a pick</Button>
      </div>
    </>
  );
}

function OrderResult() {
  const { setup: S } = useApp();
  const seq = getSeq(S), sim = simulate(S, seq);
  const F = FORMATS[S.format];
  const status = sim.overflow
    ? { ok: false, text: `More steps than maps. Remove a step or add ${seq.length - S.pool.length + 1 > 1 ? 'maps' : 'a map'} to the pool.` }
    : sim.valid
      ? { ok: true, text: `Ready for ${F.name.toLowerCase()}` }
      : sim.games < S.format
        ? { ok: false, text: `${F.label} needs ${S.format} maps. Add a pick, or remove bans until one map is left over as the decider.` }
        : { ok: false, text: `${F.label} needs ${S.format} maps. Change a pick to a ban.` };

  return (
    <div className={cn('rounded-lg border px-4 py-3', status.ok ? 'border-pick/40 bg-pick/6' : 'border-decider/45 bg-decider/6')} role="status">
      <div className="flex items-baseline gap-2">
        <b className="text-3xl leading-none font-extrabold tabular-nums">{sim.games}</b>
        <span className="text-muted-foreground">map{sim.games === 1 ? '' : 's'} from {S.pool.length}</span>
      </div>
      <p className={cn('mt-2 flex items-start gap-1.5 leading-snug font-semibold', status.ok ? 'text-pick' : 'text-decider')}>
        {status.ok && <CheckIcon className="mt-0.5 size-4 shrink-0" />}{status.text}
      </p>
      <small className="mt-1 block text-sm text-muted-foreground">{sim.bans} ban{sim.bans === 1 ? '' : 's'}, {sim.picks} pick{sim.picks === 1 ? '' : 's'}{sim.decider ? ', 1 decider' : ''}</small>
    </div>
  );
}

function ImportButton({ onImport, onError }: { onImport: (json: unknown) => void; onError: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const read = async (f?: File) => {
    if (!f) return;
    try { onImport(JSON.parse(await f.text())); } catch { onError(); }
  };
  return (
    <>
      <Button variant="ghost" size="sm" className="justify-self-center" onClick={() => ref.current?.click()}><UploadIcon /> Import a saved plan</Button>
      <input ref={ref} type="file" accept=".json,application/json" hidden onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}
