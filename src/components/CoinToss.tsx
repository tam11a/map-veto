import { useEffect, useRef, useState } from 'react';
import { TEAMC } from '../data/maps';
import type { TeamIdx } from '../types';

/** Flips a coin, shows the winner, then reports whether team B won (teams get swapped). */
export function CoinToss({ teams, onDone }: { teams: [string, string]; onDone: (bWon: boolean) => void }) {
  const [win] = useState<TeamIdx>(() => (Math.random() < 0.5 ? 0 : 1));
  const [spin, setSpin] = useState(false);
  const [landed, setLanded] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setSpin(true)));
    const t1 = setTimeout(() => setLanded(true), 2250);
    const t2 = setTimeout(() => done.current(win === 1), 3600);
    return () => { cancelAnimationFrame(r); clearTimeout(t1); clearTimeout(t2); };
  }, [win]);

  return (
    <div className="coinwrap" style={{ padding: '30px 22px' }}>
      <div className="kicker">Coin toss</div>
      <div className="coin-stage">
        <div className="toss">
          <div className="coin" style={{ transform: spin ? `rotateY(${1800 + win * 180}deg)` : undefined }}>
            <div className="fa">A</div>
            <div className="fb">B</div>
          </div>
        </div>
      </div>
      <h3>{landed && <><span style={{ color: TEAMC[win] }}>{teams[win]}</span> starts the veto</>}</h3>
      <p>{teams[0]} = A · {teams[1]} = B</p>
    </div>
  );
}
