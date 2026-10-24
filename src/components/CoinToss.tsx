import { useEffect, useRef, useState } from 'react';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { TEAMC } from '@/data/maps';
import { prefersReducedMotion, vars } from '@/lib/fx';
import { cue } from '@/lib/sound';
import { cn } from '@/lib/utils';
import type { TeamIdx } from '@/types';

const SIZE = 176;
const THICK = 14;
const LAYERS = 14;
const FLIP_MS = 2300;
const WAIT_MS = 450;

/** Metal for each face, light to dark: team A teal, team B red. */
const METAL: Record<TeamIdx, [string, string, string, string]> = {
  0: ['#b4fff8', '#2bd4c8', '#0f8a82', '#053f3b'],
  1: ['#ffa3a9', '#e8131f', '#8f0710', '#3d0206'],
};

/** Flips a 3D coin, shows the winner, then reports whether team B won (teams get swapped). */
export function CoinToss({ teams, onDone }: { teams: [string, string]; onDone: (bWon: boolean) => void }) {
  const [win] = useState<TeamIdx>(() => (Math.random() < 0.5 ? 0 : 1));
  const [phase, setPhase] = useState<'ready' | 'flying' | 'landed'>('ready');
  const toss = useRef<HTMLDivElement>(null), coin = useRef<HTMLDivElement>(null), shadow = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const end = `rotateX(${(reduced ? 0 : 360 * 5) + win * 180}deg)`;
    const timers: number[] = [], anims: Animation[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const land = () => { setPhase('landed'); cue('coinWin', { unlessMuted: true }); };

    if (reduced) {
      if (coin.current) coin.current.style.transform = end;
      later(land, 500);
      later(() => done.current(win === 1), 2400);
    } else {
      later(() => {
        setPhase('flying');
        cue('coinFlip', { unlessMuted: true });
        // the flip slows as it falls, so it settles face-up as it lands
        const c = coin.current?.animate([{ transform: 'rotateX(0deg)' }, { transform: end }], { duration: FLIP_MS, easing: 'cubic-bezier(.15,.55,.25,1)', fill: 'forwards' });
        const arc = [
          { transform: 'translateY(0) scale(1)', easing: 'cubic-bezier(.2,.7,.4,1)' },
          { transform: 'translateY(-150px) scale(1.16)', offset: 0.42, easing: 'cubic-bezier(.6,0,.85,.4)' },
          { transform: 'translateY(0) scale(1)', offset: 0.82, easing: 'ease-out' },
          { transform: 'translateY(-16px) scale(1.02)', offset: 0.9, easing: 'ease-in' },
          { transform: 'translateY(0) scale(1)' },
        ];
        const t = toss.current?.animate(arc, { duration: FLIP_MS, fill: 'forwards' });
        // the shadow on the table shrinks and fades while the coin is high
        const s = shadow.current?.animate([
          { transform: 'scale(1)', opacity: 0.75, easing: 'cubic-bezier(.2,.7,.4,1)' },
          { transform: 'scale(.45)', opacity: 0.2, offset: 0.42, easing: 'cubic-bezier(.6,0,.85,.4)' },
          { transform: 'scale(1)', opacity: 0.75, offset: 0.82 },
          { transform: 'scale(.9)', opacity: 0.6, offset: 0.9 },
          { transform: 'scale(1)', opacity: 0.75 },
        ], { duration: FLIP_MS, fill: 'forwards' });
        [c, t, s].forEach(a => a && anims.push(a));
      }, WAIT_MS);
      later(() => cue('coinLand', { unlessMuted: true }), WAIT_MS + FLIP_MS * 0.82);
      later(land, WAIT_MS + FLIP_MS + 60);
      later(() => done.current(win === 1), WAIT_MS + FLIP_MS + 2000);
    }
    return () => { timers.forEach(clearTimeout); anims.forEach(a => a.cancel()); };
  }, [win]);

  const landed = phase === 'landed';
  return (
    <div className="grid justify-items-center text-center" style={vars({ '--tc': TEAMC[win] })}>
      <DialogTitle className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">Coin toss</DialogTitle>
      <DialogDescription className="sr-only">A coin flip decides which team acts first.</DialogDescription>

      <div className="relative grid h-96 w-full place-items-end justify-center perspective-[1100px]">
        {/* the winner's glow, behind the coin */}
        <div className={cn('absolute top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-(--tc)/35 blur-3xl transition-opacity duration-700', landed ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
        <div ref={shadow} className="absolute bottom-7 left-1/2 -ml-20 h-6 w-40 rounded-[50%] bg-black opacity-75 blur-md" aria-hidden="true" />
        <div ref={toss} className="relative mb-12 transform-3d" style={{ width: SIZE, height: SIZE }} aria-hidden="true">
          {/* tilted toward the viewer so the coin's edge shows */}
          <div className="size-full transform-3d [transform:rotateX(-14deg)_rotateY(-8deg)]">
            <div ref={coin} className="relative size-full transform-3d">
              {Array.from({ length: LAYERS }, (_, k) => (
                <div
                  key={k}
                  className="absolute inset-0 rounded-full bg-[repeating-conic-gradient(#5b5266_0_3deg,#2a2431_3deg_6deg)]"
                  style={{ transform: `translateZ(${-THICK / 2 + 1 + (k * (THICK - 2)) / (LAYERS - 1)}px)` }}
                />
              ))}
              <Face i={0} name={teams[0]} />
              <Face i={1} name={teams[1]} back />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-20" aria-live="polite">
        {landed ? (
          <div className="motion-safe:animate-rise">
            <p className="text-3xl font-extrabold tracking-[-0.02em] text-(--tc)">{teams[win]}</p>
            <p className="mt-1 text-muted-foreground">wins the toss and acts first</p>
          </div>
        ) : (
          <p className="pt-3 text-muted-foreground">{phase === 'flying' ? 'Flipping…' : 'Get ready…'}</p>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {([0, 1] as const).map(i => (
          <span key={i} className="inline-flex items-center gap-2">
            <b className="grid size-5 place-items-center rounded-full text-[11px] font-extrabold text-ink" style={{ background: TEAMC[i] }}>{i ? 'B' : 'A'}</b>
            {teams[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One side of the coin: brushed team-coloured metal, a milled rim and the embossed letter. */
function Face({ i, name, back }: { i: TeamIdx; name: string; back?: boolean }) {
  const [hi, mid, low, deep] = METAL[i];
  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden rounded-full backface-hidden"
      style={{
        transform: `${back ? 'rotateX(180deg) ' : ''}translateZ(${THICK / 2}px)`,
        background: `radial-gradient(circle at 32% 26%, ${hi} 0%, ${mid} 34%, ${low} 74%, ${deep} 100%)`,
        boxShadow: 'inset 0 0 0 5px rgb(255 255 255 / .3), inset 0 0 0 7px rgb(0 0 0 / .3), inset 0 0 0 15px rgb(255 255 255 / .07), inset 0 -20px 40px rgb(0 0 0 / .35)',
      }}
    >
      {/* milled ring just inside the rim */}
      <div
        className="absolute inset-[10px] rounded-full bg-[repeating-conic-gradient(rgb(255_255_255/.55)_0_1.4deg,transparent_1.4deg_4deg)] opacity-40"
        style={{ mask: 'radial-gradient(circle closest-side, transparent 86%, #000 87%, #000 96%, transparent 97%)' }}
      />
      <div className="relative flex flex-col items-center">
        <span className="text-[84px] leading-[0.9] font-extrabold text-black/65 [text-shadow:0_1.5px_0_rgb(255_255_255/.45),0_-1px_0_rgb(0_0_0/.35)]">{i ? 'B' : 'A'}</span>
        <span className="mt-1 max-w-28 truncate text-[10px] font-bold tracking-[0.18em] text-black/55 uppercase">{name}</span>
      </div>
      {/* a soft sheen across the metal */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(115deg,transparent_28%,rgb(255_255_255/.38)_44%,transparent_60%)] mix-blend-overlay" />
    </div>
  );
}
