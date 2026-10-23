import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CoinToss } from '../components/CoinToss';
import { Overlay } from '../components/Overlay';
import { ResultView } from '../components/ResultView';
import { SetupView } from '../components/SetupView';
import { VetoView } from '../components/VetoView';
import { confetti } from '../lib/fx';
import { type Payload, clearHash, loadPayload, readHashPlan } from '../lib/share';
import { useTitle } from '../lib/useTitle';
import { useApp } from '../state';
import type { Action, Format, Phase, Setup, VetoState } from '../types';

type Boot = { plan: { setup: Setup; veto: VetoState } } | { error: true } | null;

export function VetoPage() {
  const { setup, patch, replaceSetup, toast } = useApp();
  const [params, setParams] = useSearchParams();

  // a #plan=… share link opens straight into the result
  const [boot] = useState<Boot>(() => {
    try {
      const p = readHashPlan();
      return p ? { plan: loadPayload(p, setup) } : null;
    } catch {
      return { error: true };
    }
  });
  const shared = boot && 'plan' in boot ? boot.plan : null;
  const [phase, setPhase] = useState<Phase>(shared ? 'result' : 'setup');
  const [veto, setVeto] = useState<VetoState | null>(shared?.veto ?? null);
  const [ready, setReady] = useState(!shared);
  const [replay, setReplay] = useState<Action[] | null>(null);
  const [coin, setCoin] = useState(false);

  useTitle(phase === 'setup' ? 'New veto' : phase === 'veto' ? 'Live veto' : 'Match plan');

  useEffect(() => {
    if (shared) { replaceSetup(shared.setup); setReady(true); toast('Shared plan loaded'); }
    else if (boot) toast('Share link is invalid or truncated');
    // /veto?format=3 and /veto?map=ascent presets from the landing & map pages
    const f = Number(params.get('format'));
    if ([1, 2, 3, 5].includes(f)) patch({ format: f as Format, seq: null });
    if (params.has('format')) { params.delete('format'); setParams(params, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [phase]);

  const updateHist = useCallback((fn: (h: Action[]) => Action[]) => setVeto(v => (v ? { ...v, hist: fn(v.hist) } : v)), []);

  const begin = (swap: boolean) => {
    setVeto({ teams: swap ? [setup.teams[1], setup.teams[0]] : [setup.teams[0], setup.teams[1]], hist: [] });
    setReplay(null);
    setPhase('veto');
  };
  const start = () => (setup.first === 'coin' ? setCoin(true) : begin(setup.first === 'b'));
  const finish = (celebrate: boolean) => {
    if (celebrate) confetti();
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
    setReplay(null);
    setPhase('setup');
  };
  const importPlan = (json: unknown) => {
    try {
      const r = loadPayload(json as Payload, setup);
      replaceSetup(r.setup);
      setVeto(r.veto);
      setPhase('result');
      toast('Plan imported');
    } catch {
      toast('That file is not a valid Map Veto plan');
    }
  };

  if (!ready) return null;
  return (
    <div className={`container page-app ph-${phase} enter`}>
      {phase === 'setup' && <SetupView onStart={start} onImport={importPlan} />}
      {phase === 'veto' && veto && (
        <VetoView veto={veto} updateHist={updateHist} replay={replay} onFinish={finish} onSkip={skipReplay} onExit={toSetup} />
      )}
      {phase === 'result' && veto && <ResultView veto={veto} onReplay={startReplay} onNew={toSetup} />}
      <Overlay open={coin}>
        {coin && <CoinToss teams={setup.teams} onDone={bWon => { setCoin(false); begin(bWon); }} />}
      </Overlay>
    </div>
  );
}
