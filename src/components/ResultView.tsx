import { FORMATS, GOLD, TEAMC } from '../data/maps';
import { buildPNG, canvasBlob } from '../lib/exportPng';
import { vars } from '../lib/fx';
import { copyText, download, fileBase, payload, shareLink, textSummary } from '../lib/share';
import { games, getMap, sideFor } from '../lib/veto';
import { useApp } from '../state';
import type { VetoState } from '../types';
import { Icon } from './Icons';
import { MapArt } from './MapArt';

export function ResultView({ veto, onReplay, onNew }: { veto: VetoState; onReplay: () => void; onNew: () => void }) {
  const { setup: S, toast, openInfo } = useApp();
  const t = veto.teams, g = games(veto.hist), name = (id: string) => getMap(S, id).name;
  const used = new Set(veto.hist.filter(h => h.k !== 'side').map(h => h.map));
  const unplayed = S.pool.filter(id => !used.has(id));

  const exportPng = async () => {
    toast('Rendering image…');
    const blob = await canvasBlob(await buildPNG(S, veto));
    download(blob, fileBase(S, veto) + '.png');
    toast('Image downloaded');
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
  const copyLink = async () => toast((await copyText(shareLink(S, veto))) ? 'Share link copied' : 'Could not copy link');
  const copySummary = async () => toast((await copyText(textSummary(S, veto))) ? 'Plan copied as text' : 'Could not copy');
  const exportJson = () => {
    download(new Blob([JSON.stringify(payload(S, veto), null, 2)], { type: 'application/json' }), fileBase(S, veto) + '.json');
    toast('JSON exported');
  };

  return (
    <>
      <div className="rhead rise" style={vars({ '--i': 0 })}>
        <div className="kicker">{FORMATS[S.format].name} match plan</div>
        <h1>{S.title || `${t[0]} vs ${t[1]}`}</h1>
        <div className="vs"><span style={{ color: TEAMC[0] }}>{t[0]}</span><i>VS</i><span style={{ color: TEAMC[1] }}>{t[1]}</span></div>
      </div>

      <div className="games" style={vars({ '--n': Math.max(1, g.length) })}>
        {g.map((gm, i) => {
          const m = getMap(S, gm.map), color = gm.by != null ? TEAMC[gm.by] : GOLD;
          return (
            <div className="game" key={gm.map} style={vars({ '--i': i, '--mc': color })}>
              <MapArt map={m} kind={g.length >= 4 ? 'tall' : 'splash'} watermark={false} />
              <span className="badge">MAP {i + 1}{gm.decider ? ' DECIDER' : ''}</span>
              <button className="note-btn" aria-label={`${m.name} details and notes`} onClick={() => openInfo(gm.map)}><Icon.note /></button>
              <div className="gb">
                <div className="loc"><span>{m.loc}</span><span>Sites {m.sites}</span></div>
                <h3>{m.name}</h3>
                <div className="pickby">{gm.by == null ? 'Decider, the last map standing' : <>Picked by <b>{t[gm.by]}</b></>}</div>
                <div className="srow">
                  {([0, 1] as const).map(team => {
                    const sd = sideFor(gm, team);
                    return (
                      <div key={team}>
                        <span><i style={{ background: TEAMC[team] }} />{t[team]}</span>
                        {sd ? <em className={sd}>{sd === 'atk' ? 'ATTACK' : 'DEFENSE'}</em> : <em style={{ color: 'var(--dim)' }}>TBD</em>}
                      </div>
                    );
                  })}
                </div>
                {S.notes[gm.map] && <div className="note">{S.notes[gm.map]}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="logbox rise" style={vars({ '--i': 3 })}>
        <div className="kicker">Veto log</div>
        <div className="log">
          {veto.hist.map((h, i) => {
            const who = h.team != null ? t[h.team] : 'Auto';
            return (
              <div key={i} className={`log-item k-${h.k}`} style={vars({ '--i': i })}>
                <b style={{ background: h.team != null ? TEAMC[h.team] : GOLD }}>{h.k.toUpperCase()}</b>
                {h.k === 'ban' ? <>{who} banned <s>{name(h.map)}</s></>
                  : h.k === 'pick' ? <>{who} picked <strong>{name(h.map)}</strong></>
                  : h.k === 'side' ? <>{who} starts {h.side === 'atk' ? 'Attack' : 'Defense'} on {name(h.map)}</>
                  : <>{name(h.map)} is the decider</>}
              </div>
            );
          })}
          {unplayed.map((id, i) => (
            <div key={id} className="log-item" style={vars({ '--i': veto.hist.length + i, opacity: 0.6 })}>
              <b style={{ background: 'var(--dim)' }}>UNPLAYED</b>{name(id)}
            </div>
          ))}
        </div>
      </div>

      <div className="actions rise" style={vars({ '--i': 4 })}>
        <button className="btn primary" onClick={exportPng}><Icon.dl /> Download image</button>
        <button className="btn" onClick={copyImage}><Icon.img /> Copy image</button>
        <button className="btn" onClick={copyLink}><Icon.link /> Copy share link</button>
        <button className="btn" onClick={copySummary}><Icon.txt /> Copy as text</button>
        <button className="btn" onClick={exportJson}><Icon.dl /> Export JSON</button>
        <span className="sep" />
        <button className="btn" onClick={onReplay}><Icon.play /> Replay</button>
        <button className="btn ghost" onClick={onNew}>New veto</button>
      </div>
    </>
  );
}
