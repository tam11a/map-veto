import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../data/maps';
import { examplePlan } from '../data/examples';
import { loadPayload, normalizeSetup, payload } from './share';

describe('share payload', () => {
  it('round-trips a plan with rules, match details and prep', () => {
    const p = examplePlan(3);
    const { setup, veto } = loadPayload(p, defaultSetup());
    setup.event = 'Spring Cup';
    setup.date = '2026-11-12T18:00';
    setup.deciderRule = 'knife';
    setup.notesAtk = { ascent: 'Fast A' };
    setup.comps = { ascent: ['Jett', 'Sova'] };
    setup.logos = ['https://example.com/a.png', ''];

    const back = loadPayload(JSON.parse(JSON.stringify(payload(setup, veto))), defaultSetup());
    expect(back.veto).toEqual(veto);
    expect(back.setup.event).toBe('Spring Cup');
    expect(back.setup.deciderRule).toBe('knife');
    expect(back.setup.notesAtk.ascent).toBe('Fast A');
    expect(back.setup.comps.ascent).toEqual(['Jett', 'Sova']);
    expect(back.setup.logos[0]).toBe('https://example.com/a.png');
  });

  it('still opens links made before the new fields existed', () => {
    const p = examplePlan(1) as unknown as Record<string, unknown>;
    for (const k of ['rules', 'event', 'date', 'logos', 'notesAtk', 'notesDef', 'comps']) delete p[k];
    const { setup } = loadPayload(p as never, defaultSetup());
    expect(setup.sideRule).toBe('opponent');
    expect(setup.deciderRule).toBe('lastban');
    expect(setup.logos).toEqual(['', '']);
  });
});

describe('normalizeSetup', () => {
  it('returns defaults for junk', () => {
    expect(normalizeSetup(null)).toEqual(defaultSetup());
    expect(normalizeSetup('nope')).toEqual(defaultSetup());
  });

  it('keeps valid fields and repairs bad ones', () => {
    const s = normalizeSetup({ title: 'Final', timer: 9999, deciderRule: 'coinflip', logos: [1, 2], presets: [{ id: 1 }], comps: { ascent: 'Jett' } });
    expect(s.title).toBe('Final');
    expect(s.timer).toBe(defaultSetup().timer);
    expect(s.deciderRule).toBe('lastban');
    expect(s.logos).toEqual(['', '']);
    expect(s.presets).toEqual([]);
    expect(s.comps).toEqual({});
  });
});
