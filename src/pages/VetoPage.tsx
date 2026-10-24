import { useCallback, useEffect, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import { CoinToss } from '../components/CoinToss';
import { ConfirmDialog } from '../components/kit';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { RecentVetoes } from '../components/RecentVetoes';
import { ResultView } from '../components/ResultView';
import { IMPORT_ERROR, SetupView } from '../components/SetupView';
import { VetoView } from '../components/VetoView';
import { confetti } from '../lib/fx';
import { createRoom } from '../lib/rooms';
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
  const navigate = useNavigate();

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
  const startRoom = async () => {
    const swap = setup.first === 'b' || (setup.first === 'coin' && Math.random() < 0.5);
    const teams: [string, string] = swap ? [setup.teams[1], setup.teams[0]] : [setup.teams[0], setup.teams[1]];
    try {
      const { id } = await createRoom(setup, teams);
      if (setup.first === 'coin') toast(`Coin toss: ${teams[0]} acts first`);
      navigate(`/room/${id}`);
    } catch (e) {
      toast((e as Error).message);
    }
  };
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
  const [backAsk, setBackAsk] = useState(false);
  const toSetup = () => {
    if (phase === 'veto' && !replay && veto?.hist.length) return setBackAsk(true);
    backToSetup();
  };
  const backToSetup = () => {
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
    <div className={`container pt-8 pb-16 ph-${phase}`}>
      {phase === 'setup' && (
        <>
          <SetupView onStart={start} onRoom={startRoom} onImport={json => openPlan(json, 'Plan imported')} />
          <RecentVetoes onOpen={plan => openPlan(plan, 'Plan opened from history')} />
        </>
      )}
      {phase === 'veto' && veto && (
        <VetoView veto={veto} updateHist={updateHist} replay={replay} onFinish={finish} onSkip={skipReplay} onExit={toSetup} />
      )}
      {phase === 'result' && veto && <ResultView veto={veto} onEdit={setVeto} onReplay={startReplay} onNew={toSetup} />}
      <Dialog open={coin}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()} aria-describedby={undefined}>
          {coin && <CoinToss teams={setup.teams} onDone={bWon => { setCoin(false); begin(bWon); }} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={backAsk} onOpenChange={setBackAsk} title="Back to setup?" confirmLabel="Leave the veto" cancelLabel="Keep vetoing" onConfirm={backToSetup}>
        This veto ends and its progress is cleared. Finished vetoes stay in your recent list.
      </ConfirmDialog>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={o => { if (!o) blocker.reset?.(); }}
        title="Leave the veto?"
        confirmLabel="Stay on the veto"
        cancelLabel="Leave"
        onConfirm={() => blocker.reset?.()}
        onCancel={() => blocker.proceed?.()}
        focusConfirm
      >
        Your progress is saved on this device. Use <b className="text-foreground">Resume veto</b> in the header to pick up where you left off.
      </ConfirmDialog>
    </div>
  );
}
