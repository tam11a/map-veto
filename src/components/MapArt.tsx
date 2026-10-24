import { useState } from 'react';
import { type ArtKind, imgFor, useMapArtVersion } from '@/lib/images';
import { vars } from '@/lib/fx';
import { cn } from '@/lib/utils';
import type { MapInfo } from '@/types';

/** Map artwork with a gradient fallback; fades the image in once it loads. */
export function MapArt({ map, kind = 'tall', watermark = true, className }: { map: MapInfo; kind?: ArtKind; watermark?: boolean; className?: string }) {
  useMapArtVersion();
  const url = imgFor(map, kind);
  return (
    <div className={cn('art overflow-hidden bg-linear-150 from-(--g1) to-(--g2)', className)} style={vars({ '--g1': map.c[0], '--g2': map.c[1] })}>
      {watermark && <span className="absolute -right-1.5 -bottom-4 text-7xl font-extrabold whitespace-nowrap text-white/7">{map.name}</span>}
      {url && <ArtImg key={url} src={url} />}
    </div>
  );
}

function ArtImg({ src }: { src: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  if (state === 'err') return null;
  return (
    <img
      alt=""
      src={src}
      className={cn('absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500', state === 'ok' && 'opacity-100')}
      onLoad={() => setState('ok')}
      onError={() => setState('err')}
    />
  );
}
