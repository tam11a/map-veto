import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InfoSheet } from './components/InfoModal';
import { Overlay } from './components/Overlay';
import { ensureMapArt } from './lib/images';
import { initRotation, useCatalog, useCatalogVersion } from './lib/rotation';
import { loadSetup, saveSetup } from './lib/share';
import { type AppCtx, AppContext, type SetupPatch } from './state';
import type { Setup } from './types';

/** Global state shared by every page: the saved setup, toasts and the map info sheet. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState(loadSetup);
  const [info, setInfo] = useState<{ id: string; open: boolean } | null>(null);
  const [toastMsg, setToastMsg] = useState({ text: '', show: false });
  const toastT = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { saveSetup(setup); }, [setup]);
  useEffect(() => { ensureMapArt(); initRotation(); }, []);
  const rotation = useCatalog();
  const catalogVersion = useCatalogVersion();

  const toast = useCallback((text: string) => {
    setToastMsg({ text, show: true });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(t => ({ ...t, show: false })), 2200);
  }, []);
  const patch = useCallback((p: SetupPatch) => setSetup(s => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);
  const replaceSetup = useCallback((s: Setup) => setSetup(s), []);
  const openInfo = useCallback((id: string) => setInfo({ id, open: true }), []);
  // catalogVersion changes when maps are added or the rotation updates, so every consumer re-renders
  const ctx = useMemo<AppCtx>(() => ({ setup, patch, replaceSetup, toast, openInfo, rotation, catalogVersion }), [setup, patch, replaceSetup, toast, openInfo, rotation, catalogVersion]);
  const closeInfo = useCallback(() => setInfo(i => (i ? { ...i, open: false } : i)), []);

  return (
    <AppContext.Provider value={ctx}>
      {children}
      <Overlay open={!!info?.open} onClose={closeInfo} labelledBy="info-title">
        {info && <InfoSheet mapId={info.id} onClose={closeInfo} />}
      </Overlay>
      <div id="toast" className={toastMsg.show ? 'show' : ''} role="status">{toastMsg.text}</div>
    </AppContext.Provider>
  );
}
