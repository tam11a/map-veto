import { useCallback, useEffect, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { CoinToss } from '../components/CoinToss';
import { Overlay } from '../components/Overlay';
import { RecentVetoes } from '../components/RecentVetoes';
import { ResultView } from '../components/ResultView';
import { IMPORT_ERROR, SetupView } from '../components/SetupView';
import { VetoView } from '../components/VetoView';
import { confetti } from '../lib/fx';
import { addHistory, clearLive, loadLive, saveLive } from '../lib/session';
import { type Payload, clearHash, loadPayload, readHashPlan, shareLink } from '../lib/share';
import { useTitle } from '../lib/useTitle';
import { useApp } from '../state';
import type { Action, Format, Phase, Setup, VetoState } from '../types';

type Boot =
  | { kind: 'shared'; setup: Setup; veto: VetoState }
  | { kind: 'resume'; setup: Setup; veto: VetoState; phase: Exclude<Phase, 'setup'> }
  | { kind: 'bad-link' }
  | null;

export function VetoPage() {
  const { setup, patch, replaceSetup, toast } = useApp();
  const [params, setParams] = useSearchParams();

  // a #plan=… share link wins; otherwise pick up a veto saved on this device
  const [boot] = useState<Boot>(() => {
    try {
      const p = readHashPlan();
      if (p) return { kind: 'shared', ...loadPayload(p, setup) };
    } catch {
      return { kind: 'bad-link' };
    }
    const live = loadLive();
    return live ? { kind: 'resume', setup: live.setup, veto: live.veto, phase: live.phase } : null;
  });
  const restored = boot && boot.kind !== 'bad-link' ? boot : null;
  const [phase, setPhase] = useState<Phase>(restored ? (restored.kind === 'resume' ? restored.phase : 'result') : 'setup');
  const [veto, setVeto] = useState<VetoState | null>(restored?.veto ?? null);
  const [ready, setReady] = useState(!restored);
  const [replay, setReplay] = useState<Action[] | null>(null);
  const [coin, setCoin] = useState(false);

  useTitle(phase === 'setup' ? 'New veto' : phase === 'veto' ? 'Live veto' : 'Match plan');

  useEffect(() => {
    if (restored) {
      replaceSetup(restored.setup);
      setReady(true);
      toast(restored.kind === 'shared' ? 'Shared plan loaded' : restored.phase === 'veto' ? 'Veto resumed where you left off' : 'Your last plan is back');
    } else if (boot?.kind === 'bad-link') toast('Share link is invalid or truncated');
    // /veto?format=3 presets from the landing & guide pages
    const f = Number(params.get('format'));
    if ([1, 2, 3, 5].includes(f)) patch({ format: f as Format, seq: null });
    if (params.has('format')) { params.delete('format'); setParams(params, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // an unfinished veto is saved after every step (replays never are). A finished plan moves into
  // the URL instead, so a reload keeps it while the header's "Start a veto" opens a fresh setup.
  useEffect(() => {
    if (!ready || !veto || replay) return;
    if (phase === 'veto') saveLive('veto', setup, veto);
    if (phase === 'result') { clearLive(); shareLink(setup, veto); }
  }, [ready, phase, veto, replay, setup]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [phase]);

  // leave guard: progress is saved, but say so before someone walks away from a running veto
  const inProgress = phase === 'veto' && !replay && (veto?.hist.length ?? 0) > 0;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => inProgress && currentLocation.pathname !== nextLocation.pathname);

  const updateHist = useCallback((fn: (h: Action[]) => Action[]) => setVeto(v => (v ? { ...v, hist: fn(v.hist) } : v)), []);

  const begin = (swap: boolean) => {
    setVeto({ teams: swap ? [setup.teams[1], setup.teams[0]] : [setup.teams[0], setup.teams[1]], hist: [] });
    setReplay(null);
    setPhase('veto');
  };
  const start = () => (setup.first === 'coin' ? setCoin(true) : begin(setup.first === 'b'));
  const finish = (celebrate: boolean) => {
    if (celebrate) {
      confetti();
      if (veto) addHistory(setup, veto);
    }
    setReplay(null);
    setPhase('result');
  };
  const startReplay = () => {
    if (!veto) return;
    setReplay(veto.hist);
    setVeto({ ...veto, hist: [] });
    setPhase('veto');
  };
  const skipReplay = () => {
    if (replay) updateHist(() => replay);
    finish(false);
  };
  const toSetup = () => {
    if (phase === 'veto' && !replay && veto?.hist.length && !confirm('Leave this veto and go back to setup?')) return;
    clearHash();
    clearLive();
    setReplay(null);
    setPhase('setup');
  };
  const openPlan = (json: unknown, message: string) => {
    try {
      const r = loadPayload(json as Payload, setup);
      replaceSetup(r.setup);
      setVeto(r.veto);
      setReplay(null);
      setPhase('result');
      toast(message);
    } catch {
      toast(IMPORT_ERROR);
    }
  };

  if (!ready) return null;
  return (
    <div className={`container page-app ph-${phase} enter`}>
      {phase === 'setup' && (
        <>
          <SetupView onStart={start} onImport={json => openPlan(json, 'Plan imported')} />
          <RecentVetoes onOpen={plan => openPlan(plan, 'Plan opened from history')} />
        </>
      )}
      {phase === 'veto' && veto && (
        <VetoView veto={veto} updateHist={updateHist} replay={replay} onFinish={finish} onSkip={skipReplay} onExit={toSetup} />
      )}
      {phase === 'result' && veto && <ResultView veto={veto} onReplay={startReplay} onNew={toSetup} />}
      <Overlay open={coin} label="Coin toss">
        {coin && <CoinToss teams={setup.teams} onDone={bWon => { setCoin(false); begin(bWon); }} />}
      </Overlay>
      <Overlay open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} labelledBy="leave-title">
        <div className="confirm">
          <h2 id="leave-title">Leave the veto?</h2>
          <p>Your progress is saved on this device. Use <b>Resume veto</b> in the header to pick up where you left off.</p>
          <div className="confirm-actions">
            <button className="btn ghost" onClick={() => blocker.proceed?.()}>Leave</button>
            <button className="btn primary" onClick={() => blocker.reset?.()} autoFocus>Stay on the veto</button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}
