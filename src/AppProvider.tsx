import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { toast as notify } from 'sonner';
import { InfoSheet } from './components/InfoModal';
import { Dialog, DialogContent } from './components/ui/dialog';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { ensureMapArt } from './lib/images';
import { initRotation, useCatalog, useCatalogVersion } from './lib/rotation';
import { loadSetup, saveSetup } from './lib/share';
import { type AppCtx, AppContext, type SetupPatch } from './state';
import type { Setup } from './types';

/** Global state shared by every page: the saved setup, toasts and the map info sheet. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState(loadSetup);
  // the sheet keeps its map while it animates closed
  const [info, setInfo] = useState<{ id: string; open: boolean } | null>(null);

  useEffect(() => { saveSetup(setup); }, [setup]);
  useEffect(() => { ensureMapArt(); initRotation(); }, []);
  const rotation = useCatalog();
  const catalogVersion = useCatalogVersion();

  const toast = useCallback((text: string) => { notify(text, { id: 'app' }); }, []);
  const patch = useCallback((p: SetupPatch) => setSetup(s => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);
  const replaceSetup = useCallback((s: Setup) => setSetup(s), []);
  const openInfo = useCallback((id: string) => setInfo({ id, open: true }), []);
  // catalogVersion changes when maps are added or the rotation updates, so every consumer re-renders
  const ctx = useMemo<AppCtx>(() => ({ setup, patch, replaceSetup, toast, openInfo, rotation, catalogVersion }), [setup, patch, replaceSetup, toast, openInfo, rotation, catalogVersion]);

  return (
    <AppContext.Provider value={ctx}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Dialog open={!!info?.open} onOpenChange={o => { if (!o) setInfo(i => (i ? { ...i, open: false } : i)); }}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl" aria-describedby={undefined}>
            {info && <InfoSheet mapId={info.id} />}
          </DialogContent>
        </Dialog>
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </AppContext.Provider>
  );
}
