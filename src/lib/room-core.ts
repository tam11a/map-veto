/**
 * Captain rooms and short links: the server side, shared by the Netlify function
 * (netlify/functions/rooms.mts) and the dev server (vite.config.ts). Storage is passed in,
 * so this file has no I/O of its own. Every move is checked against the veto rules here.
 *
 *   POST /api/rooms            { plan, timer }        -> { id, tokens: { a, b, host }, room }
 *   GET  /api/rooms/:id?t=token                       -> { room, role }
 *   POST /api/rooms/:id        { token, rev, move }   -> { room }
 *   POST /api/links            { plan }               -> { id }
 *   GET  /api/links/:id                               -> { plan }
 */
import { defaultSetup } from '../data/maps';
import type { Setup, Side, VetoState } from '../types';
import { type Payload, loadPayload } from './share';
import { curStep, remaining } from './veto';

export type Role = 'a' | 'b' | 'host';
export type Move = { type: 'act'; map: string } | { type: 'side'; side: Side } | { type: 'undo' } | { type: 'restart' };

export interface Room {
  id: string;
  v: 1;
  setup: Setup;
  veto: VetoState;
  /** bumped on every change; clients send it back so a stale move can't land */
  rev: number;
  /** when the current turn times out (ms since epoch), 0 = no timer */
  deadline: number;
  created: number;
  updated: number;
}
interface StoredRoom extends Room { tokens: Record<Role, string> }
export type PublicRoom = Room & { done: boolean };

export interface Store {
  getRoom(id: string): Promise<StoredRoom | null>;
  setRoom(room: StoredRoom): Promise<void>;
  getLink(id: string): Promise<Payload | null>;
  setLink(id: string, plan: Payload): Promise<void>;
}

const ROOM_TTL = 3 * 864e5;
const ID = /^[a-z0-9]{6,16}$/;

function randomId(len: number) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789', bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => abc[b % abc.length]).join('');
}
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const fail = (status: number, error: string) => json({ error }, status);

export const isDone = (r: Room) => !curStep(r.setup, r.veto.hist);
const publicRoom = ({ tokens: _t, ...r }: StoredRoom): PublicRoom => ({ ...r, done: isDone(r) });

/** Adds automatic steps (the decider) and restarts the turn clock. */
function settle(r: StoredRoom, now: number) {
  for (let s = curStep(r.setup, r.veto.hist); s?.k === 'decider'; s = curStep(r.setup, r.veto.hist)) {
    r.veto.hist.push({ k: 'decider', team: null, map: s.map });
  }
  const s = curStep(r.setup, r.veto.hist);
  r.deadline = r.setup.timer > 0 && s ? now + r.setup.timer * 1000 : 0;
  r.rev++;
  r.updated = now;
}

/** If the clock ran out, make that one move at random (like the local veto does). */
function expire(r: StoredRoom, now: number) {
  if (!r.deadline || now < r.deadline) return false;
  const s = curStep(r.setup, r.veto.hist);
  if (!s) { r.deadline = 0; return true; }
  if (s.k === 'side') r.veto.hist.push({ k: 'side', team: s.team, map: s.map, side: Math.random() < 0.5 ? 'atk' : 'def' });
  else {
    const left = remaining(r.setup, r.veto.hist);
    r.veto.hist.push({ k: s.k, team: s.team, map: left[Math.floor(Math.random() * left.length)] });
  }
  settle(r, now);
  return true;
}

function applyMove(r: StoredRoom, role: Role, move: Move): string | null {
  const s = curStep(r.setup, r.veto.hist);
  const mine = (team: number | null) => role === 'host' || (team === 0 && role === 'a') || (team === 1 && role === 'b');
  switch (move.type) {
    case 'act': {
      if (!s || (s.k !== 'ban' && s.k !== 'pick')) return 'It isn’t time to ban or pick.';
      if (!mine(s.team)) return 'It’s the other captain’s turn.';
      if (!remaining(r.setup, r.veto.hist).includes(move.map)) return 'That map isn’t available.';
      r.veto.hist.push({ k: s.k, team: s.team, map: move.map });
      return null;
    }
    case 'side': {
      if (!s || s.k !== 'side') return 'It isn’t time to choose a side.';
      if (!mine(s.team)) return 'The other captain chooses this side.';
      if (move.side !== 'atk' && move.side !== 'def') return 'Choose attack or defense.';
      r.veto.hist.push({ k: 'side', team: s.team, map: s.map, side: move.side });
      return null;
    }
    case 'undo': {
      const h = r.veto.hist;
      // step back past automatic deciders to the last real move
      let i = h.length - 1;
      while (i >= 0 && h[i].k === 'decider') i--;
      if (i < 0) return 'Nothing to undo.';
      if (role !== 'host' && !mine(h[i].team)) return 'Only the host can undo the other captain’s move.';
      h.length = i;
      return null;
    }
    case 'restart':
      if (role !== 'host') return 'Only the host can restart.';
      r.veto.hist = [];
      return null;
    default:
      return 'Unknown move.';
  }
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 200_000) throw new Error('too large');
  const v = JSON.parse(text || '{}');
  return v && typeof v === 'object' ? v : {};
}

function planFrom(body: Record<string, unknown>): { setup: Setup; veto: VetoState } | null {
  try {
    const p = body.plan as Payload;
    if (!p || p.app !== 'mapveto') return null;
    return loadPayload(p, defaultSetup());
  } catch {
    return null;
  }
}

/** Handles every /api/rooms and /api/links request. Returns null for other paths. */
export async function handleApi(req: Request, store: Store, now = Date.now()): Promise<Response | null> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  const [, api, kind, id] = path.split('/');
  if (api !== 'api' || (kind !== 'rooms' && kind !== 'links')) return null;
  if (id !== undefined && !ID.test(id)) return fail(404, 'Not found.');

  try {
    if (kind === 'links') {
      if (req.method === 'POST' && !id) {
        const body = await readBody(req);
        if (!planFrom(body)) return fail(400, 'That isn’t a Map Veto plan.');
        const linkId = randomId(7);
        await store.setLink(linkId, body.plan as Payload);
        return json({ id: linkId });
      }
      if (req.method === 'GET' && id) {
        const plan = await store.getLink(id);
        return plan ? json({ plan }) : fail(404, 'This short link doesn’t exist.');
      }
      return fail(405, 'Method not allowed.');
    }

    // rooms
    if (req.method === 'POST' && !id) {
      const body = await readBody(req);
      const p = planFrom(body);
      if (!p) return fail(400, 'That isn’t a Map Veto setup.');
      const timer = Number(body.timer);
      p.setup.timer = Number.isFinite(timer) && timer >= 0 && timer <= 600 ? Math.round(timer) : 0;
      const room: StoredRoom = {
        id: randomId(8), v: 1, setup: p.setup, veto: { teams: p.veto.teams, hist: [] },
        rev: 0, deadline: 0, created: now, updated: now,
        tokens: { a: token(), b: token(), host: token() },
      };
      settle(room, now);
      await store.setRoom(room);
      return json({ id: room.id, tokens: room.tokens, room: publicRoom(room) });
    }
    if (!id) return fail(405, 'Method not allowed.');
    const room = await store.getRoom(id);
    if (!room || now - room.updated > ROOM_TTL) return fail(404, 'This room doesn’t exist or has closed. Rooms close three days after the last move.');

    if (req.method === 'GET') {
      if (expire(room, now)) await store.setRoom(room);
      const t = new URL(req.url).searchParams.get('t');
      const role = t ? (Object.keys(room.tokens) as Role[]).find(k => room.tokens[k] === t) ?? null : null;
      return json({ room: publicRoom(room), role });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const role = (Object.keys(room.tokens) as Role[]).find(k => room.tokens[k] === body.token);
      if (!role) return fail(403, 'This link can only watch the veto.');
      if (expire(room, now)) {
        await store.setRoom(room);
        return json({ room: publicRoom(room), error: 'Time ran out, so that turn was made at random.' }, 409);
      }
      if (body.rev !== room.rev) return json({ room: publicRoom(room), error: 'The veto moved on. Try again.' }, 409);
      const err = applyMove(room, role, body.move as Move);
      if (err) return json({ room: publicRoom(room), error: err }, 409);
      settle(room, now);
      await store.setRoom(room);
      return json({ room: publicRoom(room) });
    }
    return fail(405, 'Method not allowed.');
  } catch {
    return fail(400, 'Bad request.');
  }
}

/** In-memory store for the dev server (rooms vanish on restart). */
export function memoryStore(): Store {
  const rooms = new Map<string, string>(), links = new Map<string, string>();
  return {
    getRoom: async id => (rooms.has(id) ? JSON.parse(rooms.get(id)!) : null),
    setRoom: async r => { rooms.set(r.id, JSON.stringify(r)); },
    getLink: async id => (links.has(id) ? JSON.parse(links.get(id)!) : null),
    setLink: async (id, p) => { links.set(id, JSON.stringify(p)); },
  };
}
