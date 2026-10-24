import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapArt } from '../components/MapArt';
import { TeamMark } from '../components/TeamMark';
import { GOLD, TEAMC } from '../data/maps';
import { cx, vars } from '../lib/fx';
import { ensureMapArt } from '../lib/images';
import { useRoom } from '../lib/rooms';
import { curStep, games, getMap, sideFor } from '../lib/veto';
import type { TeamIdx } from '../types';

/**
 * Chrome-free broadcast view of a room, for an OBS browser source (1920x1080).
 * Transparent by default; ?bg=1 adds a dark backdrop for previewing.
 */
export function OverlayPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { room, error } = useRoom(id, '');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => {
    ensureMapArt();
    document.documentElement.classList.add('is-overlay');
    if (params.get('bg') === '1') document.documentElement.classList.add('overlay-bg');
    return () => document.documentElement.classList.remove('is-overlay', 'overlay-bg');
  }, [params]);

  if (!room) return <div className="ov-wait">{error || 'Connecting to the room…'}</div>;
  const S = room.setup, hist = room.veto.hist, t = room.veto.teams;
  const step = curStep(S, hist), g = games(hist);
  const logoOf = (i: TeamIdx) => S.logos[S.teams[0] === t[i] ? 0 : S.teams[1] === t[i] ? 1 : i];
  const left = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;
  const action = !step ? 'Veto complete' : step.k === 'side' ? `Side on ${getMap(S, step.map).name}` : step.k === 'decider' ? 'Decider' : step.k === 'ban' ? 'Ban' : 'Pick';
  const who = step?.team != null ? t[step.team] : '';

  return (
    <div className="ov">
      <div className="ov-bar">
        {([0, 1] as const).map(i => (
          <div key={i} className={cx('ov-team', i === 1 && 'b', step?.team === i && 'on')} style={vars({ '--tc': TEAMC[i], order: i ? 3 : 1 })}>
            <span className="ov-logo"><TeamMark i={i} url={logoOf(i)} /></span>
            <b>{t[i]}</b>
          </div>
        ))}
        <div className="ov-turn" style={vars({ order: 2, '--tc': step?.team != null ? TEAMC[step.team] : GOLD })}>
          <small>{S.title || S.event || `Best of ${S.format}`}</small>
          <b>{who ? `${who}: ${action}` : action}</b>
          {left > 0 && <span className={cx('ov-clock', left <= 5 && 'low')}>{left}</span>}
        </div>
      </div>
      <div className="ov-maps" style={vars({ '--n': S.pool.length })}>
        {S.pool.map(mapId => {
          const m = getMap(S, mapId);
          const ban = hist.find(h => h.k === 'ban' && h.map === mapId);
          const gi = g.findIndex(x => x.map === mapId), game = g[gi];
          const col = ban ? (ban.team != null ? TEAMC[ban.team] : GOLD) : game ? (game.by != null ? TEAMC[game.by] : GOLD) : 'transparent';
          return (
            <div key={mapId} className={cx('ov-map', ban && 'banned', game && 'played')} style={vars({ '--mc': col })}>
              <MapArt map={m} kind="tall" watermark={false} />
              <div className="ov-map-in">
                {ban && <span className="ov-tag">BAN · {ban.team != null ? t[ban.team] : ''}</span>}
                {game && <span className="ov-tag">MAP {gi + 1}{game.decider ? ' DECIDER' : ` · ${game.by != null ? t[game.by] : ''}`}</span>}
                <b>{m.name}</b>
                {game?.side && (
                  <small>
                    {([0, 1] as const).map(i => <span key={i} className={sideFor(game, i) ?? ''}>{t[i]} {sideFor(game, i) === 'atk' ? 'ATK' : 'DEF'}</span>)}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
