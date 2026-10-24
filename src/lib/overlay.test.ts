import { describe, expect, it } from 'vitest';
import { OVERLAY_DEFAULTS, overlayQuery, readOverlayOptions } from './overlay';

describe('overlay link options', () => {
  it('defaults to the full bottom layout with an empty query', () => {
    expect(readOverlayOptions(new URLSearchParams())).toEqual(OVERLAY_DEFAULTS);
    expect(overlayQuery(OVERLAY_DEFAULTS)).toBe('');
  });

  it('round-trips every option', () => {
    const o = { pos: 'top', compact: true, maps: false, title: false } as const;
    const q = overlayQuery(o);
    expect(q).toBe('?pos=top&compact=1&maps=0&title=0');
    expect(readOverlayOptions(new URLSearchParams(q))).toEqual(o);
  });

  it('ignores unknown values', () => {
    expect(readOverlayOptions(new URLSearchParams('pos=left&compact=yes&maps=no'))).toEqual(OVERLAY_DEFAULTS);
  });
});
