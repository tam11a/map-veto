import { useCallback, useEffect, useRef, useState } from 'react';
import type { Setup, VetoState } from '../types';
import type { Move, PublicRoom, Role } from './room-core';
import { payload } from './share';

export type { Move, PublicRoom, Role };

const KEY = 'mapveto.rooms';
const INVITE = 'mapveto.invite.';

/** Tokens for rooms this browser created or joined, so a reload keeps your seat. */
function saved(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; }
}
export function rememberToken(id: string, token: string) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...saved(), [id]: token })); } catch { /* ignore */ }
}
export const savedToken = (id: string) => saved()[id] ?? '';
/** All seat tokens, kept only on the host's device. */
export function savedInvite(id: string): Record<Role, string> | null {
  try { return JSON.parse(localStorage.getItem(INVITE + id) ?? 'null'); } catch { return null; }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
  } catch {
    throw new Error('Can’t reach the server. Check your connection.');
  }
  const body = await r.json().catch(() => null);
  if (r.status === 404 && !body) throw new Error('Rooms need the Netlify functions. Deploy with Git or the Netlify CLI, not drag and drop.');
  if (!r.ok && !(r.status === 409 && body?.room)) throw new Error(body?.error ?? `Request failed (${r.status})`);
  return body as T;
}

export async function createRoom(s: Setup, teams: [string, string]) {
  const plan = payload(s, { teams, hist: [] });
  const out = await call<{ id: string; tokens: Record<Role, string>; room: PublicRoom }>('/api/rooms', { method: 'POST', body: JSON.stringify({ plan, timer: s.timer }) });
  rememberToken(out.id, out.tokens.host);
  try { localStorage.setItem(INVITE + out.id, JSON.stringify(out.tokens)); } catch { /* ignore */ }
  return out;
}

export const roomLinks = (id: string, tokens: Record<Role, string>) => ({
  host: `${location.origin}/room/${id}?t=${tokens.host}`,
  a: `${location.origin}/room/${id}?t=${tokens.a}`,
  b: `${location.origin}/room/${id}?t=${tokens.b}`,
  watch: `${location.origin}/room/${id}`,
  overlay: `${location.origin}/overlay/${id}`,
});

/** Saves a plan under a short id and returns the /p/… link. */
export async function shortLink(s: Setup, v: VetoState) {
  const { id } = await call<{ id: string }>('/api/links', { method: 'POST', body: JSON.stringify({ plan: payload(s, v) }) });
  return `${location.origin}/p/${id}`;
}
export const readShortLink = (id: string) => call<{ plan: unknown }>(`/api/links/${encodeURIComponent(id)}`);

/**
 * Follows a room: polls about once a second while the tab is visible (every 5s in the
 * background, and slower once the veto is finished). `send` posts a move and applies the answer.
 */
export function useRoom(id: string, token: string) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const rev = useRef(-1);

  const apply = useCallback((r: PublicRoom) => {
    if (r.rev >= rev.current) { rev.current = r.rev; setRoom(r); }
  }, []);

  useEffect(() => {
    let alive = true, timer = 0;
    const tick = async () => {
      try {
        const q = token ? `?t=${encodeURIComponent(token)}` : '';
        const { room: r, role: me } = await call<{ room: PublicRoom; role: Role | null }>(`/api/rooms/${encodeURIComponent(id)}${q}`);
        if (!alive) return;
        apply(r);
        setRole(me);
        setError('');
        const wait = document.hidden ? 5000 : r.done ? 4000 : 1000;
        timer = window.setTimeout(tick, wait);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        timer = window.setTimeout(tick, 4000);
      }
    };
    tick();
    const wake = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', wake);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener('visibilitychange', wake); };
  }, [id, token, apply]);

  const send = useCallback(async (move: Move): Promise<string | null> => {
    try {
      const out = await call<{ room: PublicRoom; error?: string }>(`/api/rooms/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({ token, rev: rev.current, move }),
      });
      apply(out.room);
      return out.error ?? null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [id, token, apply]);

  return { room, role, error, send };
}
