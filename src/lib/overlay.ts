/**
 * Stream overlay options, carried in the overlay link so each OBS scene can have its own layout:
 *   ?pos=top        anchor to the top edge (default: bottom)
 *   ?compact=1      one slim row instead of the bar plus map cards
 *   ?maps=0         hide the maps
 *   ?title=0        hide the match title / event line
 *   ?bg=1           dark backdrop, for previewing in a normal browser (leave off in OBS)
 */
export interface OverlayOptions {
  pos: 'top' | 'bottom';
  compact: boolean;
  maps: boolean;
  title: boolean;
}

export const OVERLAY_DEFAULTS: OverlayOptions = { pos: 'bottom', compact: false, maps: true, title: true };

export function readOverlayOptions(p: URLSearchParams): OverlayOptions {
  return {
    pos: p.get('pos') === 'top' ? 'top' : 'bottom',
    compact: p.get('compact') === '1',
    maps: p.get('maps') !== '0',
    title: p.get('title') !== '0',
  };
}

/** Query string for the options that differ from the defaults ('' when all are default). */
export function overlayQuery(o: OverlayOptions) {
  const q = new URLSearchParams();
  if (o.pos !== OVERLAY_DEFAULTS.pos) q.set('pos', o.pos);
  if (o.compact) q.set('compact', '1');
  if (!o.maps) q.set('maps', '0');
  if (!o.title) q.set('title', '0');
  const s = q.toString();
  return s ? '?' + s : '';
}
