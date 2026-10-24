import { describe, expect, it } from 'vitest';
import { pickCompetitive, pickWikiRotation, toId } from './rotation-core.mjs';

const KNOWN = ['Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Haven', 'Lotus', 'Pearl', 'Split', 'Summit', 'Sunset'].map(name => ({ id: toId(name), name }));

describe('pickCompetitive (HenrikDev queue status)', () => {
  it('reads the enabled maps of the competitive queue', () => {
    const maps = ['Abyss', 'Ascent', 'Bind', 'Corrode', 'Haven', 'Lotus', 'Sunset', 'Pearl'];
    const json = {
      data: [
        { mode_id: 'unrated', maps: [] },
        { mode_id: 'competitive', maps: maps.map((name, i) => ({ map: { name }, enabled: i < 7 })) },
      ],
    };
    expect(pickCompetitive(json)).toEqual(['abyss', 'ascent', 'bind', 'corrode', 'haven', 'lotus', 'sunset']);
  });

  it('refuses a response without a competitive queue', () => {
    expect(() => pickCompetitive({ data: [] })).toThrow();
  });
});

describe('pickWikiRotation (Valorant wiki)', () => {
  it('reads the maps under the Current heading only', () => {
    const text = `== Map rotations ==
=== Current ===
* [[Abyss]] * [[Ascent]] * [[Bind]] * [[Corrode]] * [[Haven]] * [[Lotus]] * [[Sunset]]
Rotated out: [[Pearl]], [[Split]]
== Trivia ==
[[Breeze]]`;
    expect(pickWikiRotation(text, KNOWN)).toEqual(['abyss', 'ascent', 'bind', 'corrode', 'haven', 'lotus', 'sunset']);
  });

  it('refuses a half-edited section that lists more than the 7-map pool', () => {
    const text = `=== Current ===
[[Ascent]] [[Haven]] [[Lotus]] [[Split]] [[Corrode]] Summit, Sunset, Abyss
Rotated out: [[Bind]]`;
    expect(() => pickWikiRotation(text, KNOWN)).toThrow(/expected 7/);
  });

  it('refuses a page without the section', () => {
    expect(() => pickWikiRotation('nothing here', KNOWN)).toThrow();
  });
});
