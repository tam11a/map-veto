import { getStore } from '@netlify/blobs';
import { type Store, handleApi } from '../../src/lib/room-core';

/**
 * Captain rooms and short share links, stored in Netlify Blobs.
 * All the rules live in src/lib/room-core.ts (the dev server uses the same file).
 */
function blobStore(): Store {
  const rooms = getStore({ name: 'rooms', consistency: 'strong' });
  const links = getStore({ name: 'links', consistency: 'strong' });
  return {
    getRoom: id => rooms.get(id, { type: 'json' }),
    setRoom: r => rooms.setJSON(r.id, r),
    getLink: id => links.get(id, { type: 'json' }),
    setLink: (id, plan) => links.setJSON(id, plan),
  };
}

export default async (req: Request) => (await handleApi(req, blobStore())) ?? new Response('Not found', { status: 404 });

export const config = {
  path: ['/api/rooms', '/api/rooms/*', '/api/links', '/api/links/*'],
};
