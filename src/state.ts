import { createContext, useContext } from 'react';
import type { Setup } from './types';

export type SetupPatch = Partial<Setup> | ((s: Setup) => Partial<Setup>);

export interface AppCtx {
  setup: Setup;
  patch: (p: SetupPatch) => void;
  replaceSetup: (s: Setup) => void;
  toast: (msg: string) => void;
  openInfo: (mapId: string) => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp must be used inside <AppContext.Provider>');
  return c;
}
