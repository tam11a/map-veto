import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSetup } from '../data/maps';
import { type PublicRoom, type Role, handleApi, memoryStore } from './room-core';
import { payload } from './share';

const POOL = ['abyss', 'ascent', 'bind', 'haven', 'lotus', 'split', 'sunset'];
let store: ReturnType<typeof memoryStore>;
let clock: number;

async function api(method: string, path: string, body?: unknown) {
  const res = await handleApi(new Request('http://x' + path, { method, body: body ? JSON.stringify(body) : undefined }), store, clock);
  return { status: res!.status, body: await res!.json() };
}

async function create(timer = 0) {
  const s = { ...defaultSetup(), pool: POOL, format: 3 as const };
  const { body } = await api('POST', '/api/rooms', { plan: payload(s, { teams: ['Alpha', 'Bravo'], hist: [] }), timer });
  return body as { id: string; tokens: Record<Role, string>; room: PublicRoom };
}

async function move(id: string, token: string, m: unknown) {
  const { body: cur } = await api('GET', `/api/rooms/${id}`);
  return api('POST', `/api/rooms/${id}`, { token, rev: cur.room.rev, move: m });
}

beforeEach(() => { store = memoryStore(); clock = 1_000_000; });

describe('rooms', () => {
  it('creates a room and tells each link its seat', async () => {
    const { id, tokens } = await create();
    expect((await api('GET', `/api/rooms/${id}?t=${tokens.b}`)).body.role).toBe('b');
    expect((await api('GET', `/api/rooms/${id}`)).body.role).toBeNull();
    expect((await api('GET', `/api/rooms/${id}`)).body.room.tokens).toBeUndefined();
  });

  it('only lets the captain whose turn it is act', async () => {
    const { id, tokens } = await create();
    expect((await move(id, tokens.b, { type: 'act', map: 'bind' })).status).toBe(409);
    expect((await move(id, tokens.a, { type: 'act', map: 'bind' })).status).toBe(200);
    expect((await move(id, tokens.b, { type: 'act', map: 'bind' })).body.error).toMatch(/available/);
    expect((await move(id, 'spectator', { type: 'act', map: 'abyss' })).status).toBe(403);
  });

  it('rejects a move made against an old revision', async () => {
    const { id, tokens } = await create();
    await move(id, tokens.a, { type: 'act', map: 'bind' });
    const stale = await api('POST', `/api/rooms/${id}`, { token: tokens.b, rev: 0, move: { type: 'act', map: 'abyss' } });
    expect(stale.status).toBe(409);
  });

  it('adds the decider automatically and finishes', async () => {
    const { id, tokens } = await create();
    const t = (team: number | null) => (team === 1 ? tokens.b : tokens.a);
    for (let i = 0; i < 20; i++) {
      const { body } = await api('GET', `/api/rooms/${id}`);
      if (body.room.done) break;
      const h = body.room.veto.hist, used = new Set(h.map((x: { map: string }) => x.map));
      const last = h[h.length - 1];
      // side step follows each pick, chosen by the other team
      if (last && (last.k === 'pick' || last.k === 'decider') && !h.some((x: { k: string; map: string }) => x.k === 'side' && x.map === last.map)) {
        await move(id, tokens.host, { type: 'side', side: 'def' });
      } else {
        await move(id, t(i % 2), { type: 'act', map: POOL.find(m => !used.has(m)) });
        await move(id, tokens.host, { type: 'act', map: POOL.find(m => !used.has(m)) });
      }
    }
    const { body } = await api('GET', `/api/rooms/${id}`);
    expect(body.room.done).toBe(true);
    expect(body.room.veto.hist.some((x: { k: string }) => x.k === 'decider')).toBe(true);
  });

  it('lets captains undo only their own move; the host can undo anything', async () => {
    const { id, tokens } = await create();
    await move(id, tokens.a, { type: 'act', map: 'bind' });
    expect((await move(id, tokens.b, { type: 'undo' })).status).toBe(409);
    expect((await move(id, tokens.a, { type: 'undo' })).status).toBe(200);
    await move(id, tokens.a, { type: 'act', map: 'bind' });
    expect((await move(id, tokens.host, { type: 'undo' })).body.room.veto.hist).toHaveLength(0);
  });

  it('makes a random move when the turn timer runs out', async () => {
    const { id } = await create(20);
    clock += 21_000;
    const { body } = await api('GET', `/api/rooms/${id}`);
    expect(body.room.veto.hist).toHaveLength(1);
    expect(body.room.veto.hist[0].k).toBe('ban');
  });

  it('refuses bad input', async () => {
    expect((await api('POST', '/api/rooms', { plan: { app: 'other' } })).status).toBe(400);
    expect((await api('GET', '/api/rooms/BAD%20ID!')).status).toBe(404);
    expect((await api('GET', '/api/rooms/abcdefgh')).status).toBe(404);
  });
});

describe('short links', () => {
  it('stores a plan and reads it back', async () => {
    const s = { ...defaultSetup(), pool: POOL };
    const plan = payload(s, { teams: ['A', 'B'], hist: [] });
    const { body } = await api('POST', '/api/links', { plan });
    expect((await api('GET', `/api/links/${body.id}`)).body.plan).toEqual(plan);
  });
});
