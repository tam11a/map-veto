import { useState } from 'react';
import { type ArtKind, imgFor, useMapArtVersion } from '../lib/images';
import { vars } from '../lib/fx';
import type { MapInfo } from '../types';

/** Map artwork with a gradient fallback; fades the image in once it loads. */
export function MapArt({ map, kind = 'tall', watermark = true }: { map: MapInfo; kind?: ArtKind; watermark?: boolean }) {
  useMapArtVersion();
  const url = imgFor(map, kind);
  return (
    <div className="art" style={vars({ '--g1': map.c[0], '--g2': map.c[1] })}>
      {watermark && <span className="wm">{map.name}</span>}
      {url && <ArtImg key={url} src={url} />}
    </div>
  );
}

function ArtImg({ src }: { src: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  if (state === 'err') return null;
  return <img alt="" src={src} className={state === 'ok' ? 'ld' : ''} onLoad={() => setState('ok')} onError={() => setState('err')} />;
}
