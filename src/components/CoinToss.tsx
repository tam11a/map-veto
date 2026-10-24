import { useEffect, useRef, useState } from 'react';
import { DialogTitle } from '@/components/ui/dialog';
import { TEAMC } from '@/data/maps';
import { cn } from '@/lib/utils';
import type { TeamIdx } from '@/types';

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

  const face = 'absolute inset-0 grid place-items-center rounded-full text-5xl font-extrabold text-ink shadow-[inset_0_0_0_8px_rgb(255_255_255/0.25),inset_0_-10px_30px_rgb(0_0_0/0.25)] backface-hidden';
  return (
    <div className="px-2 py-4 text-center">
      <DialogTitle className="text-sm font-medium text-muted-foreground">Coin toss</DialogTitle>
      <div className="grid h-56 place-items-center perspective-[900px]">
        <div className="motion-safe:animate-toss">
          <div
            className="relative size-36 transition-transform duration-[2200ms] ease-[cubic-bezier(0.15,0.7,0.2,1)] transform-3d motion-reduce:duration-0"
            style={{ transform: spin ? `rotateY(${1800 + win * 180}deg)` : undefined }}
          >
            <div className={cn(face, 'bg-pick')}>A</div>
            <div className={cn(face, 'bg-ban rotate-y-180')}>B</div>
          </div>
        </div>
      </div>
      <p className="min-h-9 text-2xl font-extrabold tracking-[-0.02em]" aria-live="polite">
        {landed && <><span style={{ color: TEAMC[win] }}>{teams[win]}</span> starts the veto</>}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">A is {teams[0]}, B is {teams[1]}</p>
    </div>
  );
}
