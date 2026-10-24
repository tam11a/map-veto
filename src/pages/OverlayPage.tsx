import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapArt } from '@/components/MapArt';
import { TeamAvatar } from '@/components/TeamMark';
import { DECIDER, TEAMC } from '@/data/maps';
import { vars } from '@/lib/fx';
import { ensureMapArt } from '@/lib/images';
import { readOverlayOptions } from '@/lib/overlay';
import { useRoom } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { curStep, games, getMap, sideFor } from '@/lib/veto';
import type { Game, TeamIdx } from '@/types';

/**
 * Chrome-free broadcast view of a room, for an OBS browser source (1920x1080).
 * Transparent by default; layout options come from the link (see lib/overlay.ts).
 */
export function OverlayPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const opt = readOverlayOptions(params);
  const { room, error } = useRoom(id, '');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => {
    ensureMapArt();
    document.documentElement.classList.add('is-overlay');
    if (params.get('bg') === '1') document.documentElement.classList.add('overlay-bg');
    return () => document.documentElement.classList.remove('is-overlay', 'overlay-bg');
  }, [params]);

  const top = opt.pos === 'top';
  if (!room) {
    return <div className={cn('fixed inset-x-0 p-10 text-3xl font-extrabold text-white [text-shadow:0_2px_8px_#000]', top ? 'top-0' : 'bottom-0')}>{error || 'Connecting to the room…'}</div>;
  }
  const S = room.setup, hist = room.veto.hist, t = room.veto.teams;
  const step = curStep(S, hist), g = games(hist);
  const logoOf = (i: TeamIdx) => S.logos[S.teams[0] === t[i] ? 0 : S.teams[1] === t[i] ? 1 : i];
  const left = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;
  const action = !step ? 'Veto complete' : step.k === 'side' ? `Side on ${getMap(S, step.map).name}` : step.k === 'decider' ? 'Decider' : step.k === 'ban' ? 'Ban' : 'Pick';
  const who = step?.team != null ? t[step.team] : '';
  const heading = S.title || S.event || `Best of ${S.format}`;
  const c = opt.compact;

  // what happened to each map in the pool
  const state = (mapId: string) => {
    const ban = hist.find(h => h.k === 'ban' && h.map === mapId);
    const gi = g.findIndex(x => x.map === mapId), game: Game | undefined = g[gi];
    const col = ban ? (ban.team != null ? TEAMC[ban.team] : DECIDER) : game ? (game.by != null ? TEAMC[game.by] : DECIDER) : 'transparent';
    return { ban, gi, game, col };
  };

  const team = (i: TeamIdx) => (
    <div
      key={i}
      className={cn(
        'flex min-w-0 items-center border-2 border-transparent bg-[rgb(16_11_24/0.86)] transition-[border-color,box-shadow] duration-300',
        c ? 'gap-2.5 rounded-[14px] px-3.5 py-2' : 'gap-3.5 rounded-[18px] px-4.5 py-3',
        i === 1 && 'flex-row-reverse text-right',
        step?.team === i && 'border-(--tc) shadow-[0_0_32px_-6px_var(--tc)]',
      )}
      style={vars({ '--tc': TEAMC[i], order: i ? 3 : 1 })}
    >
      <TeamAvatar i={i} url={logoOf(i)} className={c ? 'size-10 rounded-[10px] text-xl' : 'size-14 rounded-[14px] text-[28px]'} />
      <b className={cn('truncate leading-none font-extrabold tracking-[-0.02em] text-(--tc)', c ? 'max-w-85 text-[28px]' : 'text-[40px]')}>{t[i]}</b>
    </div>
  );
  const turn = (
    <div
      className={cn(
        'relative grid content-center bg-[rgb(16_11_24/0.92)] [border-bottom:4px_solid_var(--tc)]',
        c ? 'rounded-[14px] py-1.5 pr-15 pl-5.5 text-left' : 'rounded-[18px] px-17.5 py-2.5 text-center',
      )}
      style={vars({ order: 2, '--tc': step?.team != null ? TEAMC[step.team] : DECIDER })}
    >
      {opt.title && <small className={cn('font-semibold text-[#b7adc2]', c ? 'text-xs' : 'text-[15px]')}>{heading}</small>}
      <b className={cn('leading-[1.1] font-extrabold whitespace-nowrap text-(--tc)', c ? 'text-2xl' : 'text-[32px]')}>{who ? `${who}: ${action}` : action}</b>
      {left > 0 && (
        <span className={cn('absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full border-2 font-extrabold', c ? 'right-3 size-9 text-lg' : 'right-4 size-11 text-[22px]', left <= 5 ? 'border-ban text-ban' : 'border-(--tc)')}>
          {left}
        </span>
      )}
    </div>
  );

  return (
    <div data-overlay data-pos={opt.pos} data-compact={c || undefined} className={cn('fixed inset-x-0 grid gap-3.5 px-12 text-white', top ? 'top-0 pt-10' : 'bottom-0 pb-10')}>
      {c ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2.5">
          {team(0)}
          <div className="flex min-w-0 items-stretch justify-center gap-2.5" style={{ order: 2 }}>
            {turn}
            {opt.maps && (
              <div className="flex items-center gap-1.5 rounded-[14px] bg-[rgb(16_11_24/0.86)] px-3">
                {S.pool.map(mapId => {
                  const { ban, gi, game, col } = state(mapId);
                  return (
                    <span
                      key={mapId}
                      data-chip={game ? 'played' : ban ? 'banned' : 'open'}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border-2 border-white/15 bg-white/5 px-2.75 py-1.25 text-lg font-extrabold whitespace-nowrap transition-[opacity,border-color]',
                        game && 'border-(--mc) bg-(--mc)/16',
                        ban && 'opacity-40 line-through decoration-(--mc) decoration-2',
                      )}
                      style={vars({ '--mc': col })}
                    >
                      {game && <i className="grid h-5 min-w-5 place-items-center rounded-md bg-(--mc) px-1 text-[13px] text-ink not-italic">{game.decider ? 'D' : gi + 1}</i>}
                      {getMap(S, mapId).name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          {team(1)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_minmax(360px,auto)_1fr] items-stretch gap-2.5">{team(0)}{turn}{team(1)}</div>
          {opt.maps && (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${S.pool.length}, minmax(0, 1fr))` }}>
              {S.pool.map(mapId => {
                const m = getMap(S, mapId), { ban, gi, game, col } = state(mapId);
                return (
                  <div
                    key={mapId}
                    className={cn('relative h-50 overflow-hidden rounded-2xl border-3 border-(--mc) bg-[#160f1f] transition-[opacity,filter] duration-500', ban && 'opacity-55 grayscale-90')}
                    style={vars({ '--mc': col })}
                  >
                    <MapArt map={m} kind="tall" watermark={false} className="absolute inset-0" />
                    <div className="absolute inset-0 bg-linear-to-t from-[rgb(8_5_11/0.95)] to-[rgb(8_5_11/0.1)] to-70%" />
                    <div className="absolute inset-x-3 bottom-2.5 z-[1] grid gap-1">
                      {ban && <span className="max-w-full justify-self-start truncate rounded-md bg-(--mc) px-2 py-0.5 text-[13px] font-extrabold tracking-[0.04em] text-ink">BAN · {ban.team != null ? t[ban.team] : ''}</span>}
                      {game && <span className="max-w-full justify-self-start truncate rounded-md bg-(--mc) px-2 py-0.5 text-[13px] font-extrabold tracking-[0.04em] text-ink">MAP {gi + 1}{game.decider ? ' DECIDER' : ` · ${game.by != null ? t[game.by] : ''}`}</span>}
                      <b className="text-[30px] leading-none font-extrabold">{m.name}</b>
                      {game?.side && (
                        <small className="grid gap-px text-xs font-bold">
                          {([0, 1] as const).map(i => <span key={i} className={sideFor(game, i) === 'atk' ? 'text-atk' : 'text-def'}>{t[i]} {sideFor(game, i) === 'atk' ? 'ATK' : 'DEF'}</span>)}
                        </small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
