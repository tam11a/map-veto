import { useState } from 'react';
import type { TeamIdx } from '../types';

/** A team's logo, or its letter (A/B) when there is none or the image fails to load. */
export function TeamMark({ i, url }: { i: TeamIdx; url: string }) {
  const [failed, setFailed] = useState('');
  if (url && failed !== url) {
    return <img className="size-full object-contain p-[12%]" src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(url)} />;
  }
  return <>{i ? 'B' : 'A'}</>;
}
