import { useRef, useState } from 'react';
import { FORMATS, DECIDER, TEAMC } from '../data/maps';
import { buildPNG, buildStory, canvasBlob, matchLine } from '../lib/exportPng';
import { cx, vars } from '../lib/fx';
import { shortLink } from '../lib/rooms';
import { copyText, download, fileBase, payload, shareLink, textSummary } from '../lib/share';
import { flip, games, getMap, sideFor } from '../lib/veto';
import { useApp } from '../state';
import type { TeamIdx, VetoState } from '../types';
import { Icon } from './Icons';
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
      <div className="rhead rise" style={vars({ '--i': 0 })}>
        <div className="kicker">{FORMATS[S.format].name} match plan{details && <span className="rh-details">{details}</span>}</div>
        {editing
          ? <input className="rh-title-input" value={S.title} onChange={e => patch({ title: e.target.value })} placeholder={`${t[0]} vs ${t[1]}`} maxLength={60} aria-label="Match title" />
          : <h1>{S.title || `${t[0]} vs ${t[1]}`}</h1>}
        <div className="vs">
          {([0, 1] as const).map(i => (
            <span key={i} className={cx('rh-team', i === 1 && 'b')} style={vars({ '--tc': TEAMC[i] })}>
              {logo(i) && <span className="rh-logo"><TeamMark i={i} url={logo(i)} /></span>}
              {editing
                ? <input value={t[i]} onChange={e => rename(i, e.target.value)} onBlur={e => { if (!e.target.value.trim()) rename(i, i ? 'Team B' : 'Team A'); }} maxLength={24} aria-label={`Team ${i ? 'B' : 'A'} name`} />
                : t[i]}
              {i === 0 && <i>VS</i>}
            </span>
          ))}
        </div>
        {editing && (
          <div className="rh-edit">
            <label><span className="vs-label">Event</span><input value={S.event} onChange={e => patch({ event: e.target.value })} maxLength={40} placeholder="Optional" /></label>
            <label><span className="vs-label">Date and time</span><input type="datetime-local" value={S.date} onChange={e => patch({ date: e.target.value })} /></label>
          </div>
        )}
      </div>

      <div className="games" style={vars({ '--n': Math.max(1, g.length) })}>
        {g.map((gm, i) => {
          const m = getMap(S, gm.map), color = gm.by != null ? TEAMC[gm.by] : DECIDER;
          const knife = !gm.side && gm.decider && S.sidePick && S.deciderRule === 'knife';
          const atk = S.notesAtk[gm.map], def = S.notesDef[gm.map], comp = S.comps[gm.map] ?? [];
          return (
            <div className="game" key={gm.map} style={vars({ '--i': i, '--mc': color })}>
              <MapArt map={m} kind={g.length >= 4 ? 'tall' : 'splash'} watermark={false} />
              <span className="badge">MAP {i + 1}{gm.decider ? ' DECIDER' : ''}</span>
              <button className="note-btn" aria-label={`${m.name} details and team prep`} onClick={() => openInfo(gm.map)}><Icon.note /></button>
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
                        {sd ? <em className={sd}>{sd === 'atk' ? 'ATTACK' : 'DEFENSE'}</em> : <em style={{ color: 'var(--dim)' }}>{knife ? 'KNIFE' : 'TBD'}</em>}
                      </div>
                    );
                  })}
                </div>
                {editing && gm.side && <button className="btn sm flip" onClick={() => flipSide(gm.map)}>Swap starting sides</button>}
                <CompRow names={comp} />
                {(S.notes[gm.map] || atk || def) && (
                  <div className="note">
                    {S.notes[gm.map] && <p>{S.notes[gm.map]}</p>}
                    {atk && <p><b className="atk">Attack</b> {atk}</p>}
                    {def && <p><b className="def">Defense</b> {def}</p>}
                  </div>
                )}
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
                <b style={{ background: h.team != null ? TEAMC[h.team] : DECIDER }}>{h.k.toUpperCase()}</b>
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
        <button className="btn primary" onClick={() => exportImage(false)}><Icon.dl /> Download image</button>
        <button className="btn" onClick={() => exportImage(true)}><Icon.dl /> Story image</button>
        <button className="btn" onClick={copyImage}><Icon.img /> Copy image</button>
        <button className="btn" onClick={copyLink}><Icon.link /> Copy share link</button>
        <button className="btn" onClick={copySummary}><Icon.txt /> Copy as text</button>
        <button className="btn" onClick={exportJson}><Icon.dl /> Export JSON</button>
        <span className="sep" />
        <button className={cx('btn', editing && 'mint')} onClick={() => setEditing(e => !e)} aria-pressed={editing}>
          {editing ? <><Icon.check /> Done editing</> : <><Icon.edit /> Edit plan</>}
        </button>
        <button className="btn" onClick={onReplay}><Icon.play /> Replay</button>
        <button className="btn ghost" onClick={onNew}>New veto</button>
      </div>
    </>
  );
}
