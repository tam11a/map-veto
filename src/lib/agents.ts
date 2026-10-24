import { useSyncExternalStore } from 'react';

export interface Agent { name: string; role: string; icon: string }

const KEY = 'mapveto.agents';
const ROLE_ORDER = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];

let agents: Agent[] = read();
let started = false;
const subs = new Set<() => void>();

function read(): Agent[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return Array.isArray(v?.list) ? v.list : [];
  } catch { return []; }
}

/** Playable agents from valorant-api.com, cached in the browser for a week. */
function load() {
  if (started) return;
  started = true;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && Date.now() - v.at < 7 * 864e5 && agents.length) return;
  } catch { /* refetch */ }
  fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
    .then(r => r.json())
    .then((j: { data?: { displayName: string; displayIconSmall?: string; displayIcon?: string; role?: { displayName?: string } | null }[] }) => {
      const list = (j.data ?? [])
        .map(a => ({ name: a.displayName, role: a.role?.displayName ?? 'Agent', icon: a.displayIconSmall ?? a.displayIcon ?? '' }))
        .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name));
      if (!list.length) return;
      agents = list;
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), list })); } catch { /* storage full or blocked */ }
      subs.forEach(f => f());
    })
    .catch(() => {});
}

export function useAgents(): Agent[] {
  load();
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => agents,
  );
}

/** The cached list, for code outside React (the image export). */
export const getAgents = () => agents;

export const agentIcon = (list: Agent[], name: string) => list.find(a => a.name === name)?.icon ?? '';
export const ROLES = ROLE_ORDER;
