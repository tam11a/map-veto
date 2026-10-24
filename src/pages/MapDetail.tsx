import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { MapArt } from '../components/MapArt';
import { MAPS } from '../data/maps';
import { useTitle } from '../lib/useTitle';
import { useApp } from '../state';
import { NotFound } from './NotFound';

export function MapDetail() {
  const { id = '' } = useParams();
  const idx = MAPS.findIndex(m => m.id === id);
  const m = MAPS[idx];
  useTitle(m?.name ?? 'Map not found');
  const { setup, patch, toast } = useApp();
  const navigate = useNavigate();
  if (!m) return <NotFound />;

  const inPool = setup.pool.includes(m.id);
  const prev = MAPS[(idx - 1 + MAPS.length) % MAPS.length], next = MAPS[(idx + 1) % MAPS.length];
  const order = MAPS.map(x => x.id);
  const addToPool = (s: typeof setup) => [...s.pool, m.id].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  const togglePool = () => {
    patch(s => ({ pool: inPool ? s.pool.filter(x => x !== m.id) : addToPool(s), seq: null }));
    toast(inPool ? `${m.name} removed from your pool` : `${m.name} added to your pool`);
  };
  const vetoWith = () => {
    if (!inPool) patch(s => ({ pool: addToPool(s), seq: null }));
    navigate('/veto');
  };
  const setNote = (v: string) => patch(s => {
    const notes = { ...s.notes };
    if (v.trim()) notes[m.id] = v; else delete notes[m.id];
    return { notes };
  });

  return (
    <>
      <section className="md-hero" key={m.id}>
        <MapArt map={m} kind="splash" watermark={false} />
        <div className="container">
          <Link to="/maps" className="back">All maps</Link>
          <div className="kicker">{m.loc}, released {m.year}</div>
          <h1>{m.name}</h1>
          <div className="tagline"><span>Sites {m.sites}</span><span>{m.tag}</span>{inPool && <span style={{ color: 'var(--pick)' }}><Icon.check /> In your pool</span>}</div>
        </div>
      </section>
      <div className="container">
        <div className="md-body">
          <div className="card">
            <div className="kicker">How it plays</div>
            <p>{m.desc}</p>
            <div className="facts">
              <div><small>Sites</small><b>{m.sites}</b></div>
              <div><small>Released</small><b>{m.year}</b></div>
              <div><small>Signature</small><b style={{ fontSize: 14 }}>{m.tag}</b></div>
            </div>
            <div className="label">Team notes <span style={{ color: 'var(--dim)' }}>(saved in this browser, shown on your plan and export)</span></div>
            <textarea value={setup.notes[m.id] ?? ''} onChange={e => setNote(e.target.value)} placeholder="Comp, default setups, anti-strat reminders…" maxLength={280} />
          </div>
          <div className="card">
            <div className="kicker">Plan around {m.name}</div>
            <p>{inPool ? `${m.name} is in your veto pool.` : `${m.name} isn’t in your veto pool yet.`} Your pool currently has {setup.pool.length} maps.</p>
            <div className="md-actions">
              <button className="btn primary" onClick={vetoWith}>Start a veto with {m.name}</button>
              <button className="btn" onClick={togglePool}>{inPool ? 'Remove from pool' : '+ Add to pool'}</button>
            </div>
          </div>
        </div>
        <div className="md-nav">
          <Link to={`/maps/${prev.id}`}><MapArt map={prev} kind="wide" watermark={false} /><small>Previous map</small><b>{prev.name}</b></Link>
          <Link to={`/maps/${next.id}`} className="next"><MapArt map={next} kind="wide" watermark={false} /><small>Next map</small><b>{next.name}</b></Link>
        </div>
      </div>
    </>
  );
}
