import { Fragment, useRef, useState } from 'react';
import {
  ArrowLeftRightIcon, CheckIcon, ChevronDownIcon, DownloadIcon, FileJsonIcon, ImageIcon, LinkIcon, NotebookPenIcon,
  PencilIcon, PlayIcon, ShareIcon, SmartphoneIcon, TextIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FORMATS, DECIDER, TEAMC } from '@/data/maps';
import { buildPNG, buildStory, canvasBlob, matchLine } from '@/lib/exportPng';
import { vars } from '@/lib/fx';
import { shortLink } from '@/lib/rooms';
import { copyText, download, fileBase, payload, shareLink, textSummary } from '@/lib/share';
import { cn } from '@/lib/utils';
import { flip, games, getMap, sideFor } from '@/lib/veto';
import { useApp } from '@/state';
import type { TeamIdx, VetoState } from '@/types';
import { DateTimePicker, Field, Panel } from './kit';
import { MapArt } from './MapArt';
import { CompRow } from './MapNotes';
import { TeamMark } from './TeamMark';

interface Props {
  veto: VetoState;
  onEdit: (v: VetoState) => void;
  onReplay: () => void;
  onNew: () => void;
}

export function ResultView({ veto, onEdit, onReplay, onNew }: Props) {
  const { setup: S, patch, toast, openInfo } = useApp();
  const [editing, setEditing] = useState(false);
  const t = veto.teams, g = games(veto.hist), name = (id: string) => getMap(S, id).name;
  const used = new Set(veto.hist.filter(h => h.k !== 'side').map(h => h.map));
  const unplayed = S.pool.filter(id => !used.has(id));
  const details = matchLine(S);
  // logos follow the team names, since the plan's team order can differ from the lobby's
  const logo = (i: TeamIdx) => S.logos[S.teams[0] === t[i] ? 0 : S.teams[1] === t[i] ? 1 : i];

  const exportImage = async (story: boolean) => {
    toast('Rendering image…');
    const blob = await canvasBlob(await (story ? buildStory : buildPNG)(S, veto));
    download(blob, fileBase(S, veto) + (story ? '-story' : '') + '.png');
    toast(story ? 'Story image downloaded' : 'Image downloaded');
  };
  const copyImage = async () => {
    try {
      const blob = await canvasBlob(await buildPNG(S, veto));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Image copied. Paste it into Discord.');
    } catch {
      toast('This browser can’t copy images. Use Download image instead.');
    }
  };
  // a short /p/… link when the server is there, otherwise the long self-contained one
  const shorts = useRef(new Map<string, string>());
  const copyLink = async () => {
    const long = shareLink(S, veto), key = JSON.stringify(payload(S, veto));
    let url = shorts.current.get(key);
    if (!url) {
      try { url = await shortLink(S, veto); shorts.current.set(key, url); } catch { url = long; }
    }
    toast((await copyText(url)) ? 'Share link copied' : 'Could not copy link');
  };
  const copySummary = async () => toast((await copyText(textSummary(S, veto))) ? 'Plan copied as text' : 'Could not copy');
  const exportJson = () => {
    download(new Blob([JSON.stringify(payload(S, veto), null, 2)], { type: 'application/json' }), fileBase(S, veto) + '.json');
    toast('JSON exported');
  };

  /* ---- edit mode: names and starting sides, without replaying the veto ---- */
  const rename = (i: TeamIdx, v: string) => {
    const old = t[i], teams: [string, string] = [...t];
    teams[i] = v;
    onEdit({ ...veto, teams });
    // keep the lobby's names in step so logos and the next veto match
    patch(s => ({ teams: s.teams.map(x => (x === old ? v : x)) as [string, string] }));
  };
  const flipSide = (map: string) => onEdit({ ...veto, hist: veto.hist.map(h => (h.k === 'side' && h.map === map && h.side ? { ...h, side: flip(h.side) } : h)) });

  return (
    <>
      <header className="grid justify-items-center gap-2 pb-8 text-center motion-safe:animate-rise">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {FORMATS[S.format].name} match plan
          {details && <><span className="h-3.5 w-px bg-white/20" aria-hidden="true" /><span className="font-medium text-foreground">{details}</span></>}
        </p>
        {editing
          ? <Input value={S.title} onChange={e => patch({ title: e.target.value })} placeholder={`${t[0]} vs ${t[1]}`} maxLength={60} aria-label="Match title" className="h-14 max-w-xl text-center text-3xl! font-extrabold" />
          : <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">{S.title || `${t[0]} vs ${t[1]}`}</h1>}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xl font-bold tracking-[-0.02em]">
          {([0, 1] as const).map(i => (
            <Fragment key={i}>
              {i === 1 && <span className="text-sm font-semibold tracking-[0.2em] text-dim">VS</span>}
              <span className="inline-flex items-center gap-2 text-(--tc)" style={vars({ '--tc': TEAMC[i] })}>
                {logo(i) && <span className="grid size-8 place-items-center overflow-hidden rounded-md border border-(--tc) bg-black/40 text-sm"><TeamMark i={i} url={logo(i)} /></span>}
                {editing
                  ? <Input value={t[i]} onChange={e => rename(i, e.target.value)} onBlur={e => { if (!e.target.value.trim()) rename(i, i ? 'Team Omega' : 'Team Alpha'); }} maxLength={24} aria-label={`Team ${i ? 'B' : 'A'} name`} className="w-44 text-center text-lg! font-bold text-(--tc)" />
                  : t[i]}
              </span>
            </Fragment>
          ))}
        </div>
        {editing && (
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-left">
            <Field label="Event" htmlFor="p-event" className="w-60"><Input id="p-event" value={S.event} onChange={e => patch({ event: e.target.value })} maxLength={40} placeholder="Optional" /></Field>
            <Field label="Date and time" htmlFor="p-date" className="w-60"><DateTimePicker id="p-date" value={S.date} onChange={date => patch({ date })} /></Field>
          </div>
        )}
      </header>

      <div className={cn('grid gap-4', g.length <= 1 ? 'mx-auto max-w-md' : g.length === 2 ? 'md:grid-cols-2' : g.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-5')}>
        {g.map((gm, i) => {
          const m = getMap(S, gm.map), color = gm.by != null ? TEAMC[gm.by] : DECIDER;
          const knife = !gm.side && gm.decider && S.sidePick && S.deciderRule === 'knife';
          const atk = S.notesAtk[gm.map], def = S.notesDef[gm.map], comp = S.comps[gm.map] ?? [];
          return (
            <article
              key={gm.map}
              data-game
              className="relative flex min-h-100 flex-col justify-end overflow-hidden rounded-xl border border-(--mc) shadow-[0_24px_60px_-28px_var(--mc)] motion-safe:animate-rise"
              style={vars({ '--mc': color, animationDelay: `${120 + i * 90}ms` })}
            >
              <MapArt map={m} kind={g.length >= 4 ? 'tall' : 'splash'} watermark={false} className="absolute inset-0" />
              <div className="absolute inset-0 bg-linear-to-t from-[rgb(9_6_13/0.97)] from-35% via-[rgb(9_6_13/0.55)] via-60% to-[rgb(9_6_13/0.1)]" />
              <span className="absolute top-3 left-3 z-[2] rounded-md bg-(--mc) px-2.5 py-1 text-xs font-bold tracking-[0.08em] text-ink">MAP {i + 1}{gm.decider ? ' DECIDER' : ''}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="glass" className="absolute top-3 right-3 z-[2] rounded-full" aria-label={`${m.name} details and team prep`} onClick={() => openInfo(gm.map)}>
                    <NotebookPenIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Team prep</TooltipContent>
              </Tooltip>
              <div className="relative z-[2] grid gap-2 p-4">
                <p className="flex gap-3 text-xs text-white/70"><span>{m.loc}</span><span>Sites {m.sites}</span></p>
                <h3 className="text-3xl leading-none font-extrabold tracking-[-0.03em]">{m.name}</h3>
                <p className="text-sm text-muted-foreground">{gm.by == null ? 'Decider, the last map standing' : <>Picked by <b className="font-semibold text-(--mc)">{t[gm.by]}</b></>}</p>
                <div className="grid gap-1.5">
                  {([0, 1] as const).map(team => {
                    const sd = sideFor(gm, team);
                    return (
                      <div key={team} data-side-row className="flex items-center justify-between gap-2 rounded-md bg-white/6 px-2.5 py-1.5 text-sm font-semibold">
                        <span className="flex min-w-0 items-center gap-2"><i className="size-2 shrink-0 rounded-[2px]" style={{ background: TEAMC[team] }} /><span className="truncate">{t[team]}</span></span>
                        {sd ? <Badge variant={sd} className="tracking-[0.08em]">{sd === 'atk' ? 'ATTACK' : 'DEFENSE'}</Badge> : <Badge variant="outline" className="text-dim">{knife ? 'KNIFE' : 'TBD'}</Badge>}
                      </div>
                    );
                  })}
                </div>
                {editing && gm.side && <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => flipSide(gm.map)}><ArrowLeftRightIcon /> Swap starting sides</Button>}
                <CompRow names={comp} />
                {(S.notes[gm.map] || atk || def) && (
                  <div className="grid gap-1 rounded-r-md border-l-2 border-(--mc) bg-white/5 px-2.5 py-2 text-sm leading-snug whitespace-pre-wrap text-[#d6cfdd]">
                    {S.notes[gm.map] && <p>{S.notes[gm.map]}</p>}
                    {atk && <p><b className="text-xs font-bold tracking-[0.08em] text-atk uppercase">Attack</b> {atk}</p>}
                    {def && <p><b className="text-xs font-bold tracking-[0.08em] text-def uppercase">Defense</b> {def}</p>}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-10 grid gap-3" aria-labelledby="log-h">
        <h2 id="log-h" className="text-sm font-medium text-muted-foreground">Veto log</h2>
        <ol className="flex flex-wrap gap-2">
          {veto.hist.map((h, i) => {
            const who = h.team != null ? t[h.team] : 'Auto';
            return (
              <li key={i} className="flex items-center gap-2.5 rounded-full border border-white/10 bg-card py-1 pr-3.5 pl-1 text-sm backdrop-blur-xl motion-safe:animate-rise" style={{ animationDelay: `${300 + i * 40}ms` }}>
                <b className="rounded-full px-2 py-0.5 text-xs font-bold text-ink" style={{ background: h.team != null ? TEAMC[h.team] : DECIDER }}>{h.k.toUpperCase()}</b>
                <span className={cn(h.k === 'ban' && 'text-muted-foreground')}>
                  {h.k === 'ban' ? <>{who} banned <s>{name(h.map)}</s></>
                    : h.k === 'pick' ? <>{who} picked <strong>{name(h.map)}</strong></>
                    : h.k === 'side' ? <>{who} starts {h.side === 'atk' ? 'Attack' : 'Defense'} on {name(h.map)}</>
                    : <>{name(h.map)} is the decider</>}
                </span>
              </li>
            );
          })}
          {unplayed.map(id => (
            <li key={id} className="flex items-center gap-2.5 rounded-full border border-white/10 bg-card py-1 pr-3.5 pl-1 text-sm opacity-60">
              <b className="rounded-full bg-dim px-2 py-0.5 text-xs font-bold text-ink">UNPLAYED</b>{name(id)}
            </li>
          ))}
        </ol>
      </section>

      <Panel className="mt-8 flex flex-wrap items-center justify-center gap-2 p-2.5">
        <Button onClick={() => exportImage(false)}><DownloadIcon /> Download image</Button>
        <Button variant="secondary" onClick={copyLink}><LinkIcon /> Copy share link</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary"><ShareIcon /> More exports <ChevronDownIcon className="size-3.5 opacity-70" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-60">
            <DropdownMenuItem onSelect={() => exportImage(true)}><SmartphoneIcon /> Story image <span className="ml-auto text-xs text-dim">1080×1920</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={copyImage}><ImageIcon /> Copy image</DropdownMenuItem>
            <DropdownMenuItem onSelect={copySummary}><TextIcon /> Copy as text</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={exportJson}><FileJsonIcon /> Export JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="mx-1 hidden h-6! sm:block" />
        <Button variant={editing ? 'pick' : 'secondary'} onClick={() => setEditing(e => !e)} aria-pressed={editing}>
          {editing ? <><CheckIcon /> Done editing</> : <><PencilIcon /> Edit plan</>}
        </Button>
        <Button variant="secondary" onClick={onReplay}><PlayIcon /> Replay</Button>
        <Button variant="ghost" onClick={onNew}>New veto</Button>
      </Panel>
    </>
  );
}
