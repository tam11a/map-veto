import type { Format, MapInfo, Setup } from '../types';

export const TEAMC = ['#2ee6c5', '#ff4655'] as const;
export const GOLD = '#ffc861';

export const MAPS: MapInfo[] = [
  { id: 'abyss', name: 'Abyss', loc: 'Norway', year: 2024, sites: 'A, B', tag: 'Open map edges', c: ['#24506b', '#0c1824'],
    desc: 'No boundaries on the outer edges — players can fall off the map. Vertical angles, drop-downs and mid control decide most rounds.' },
  { id: 'ascent', name: 'Ascent', loc: 'Venice, Italy', year: 2020, sites: 'A, B', tag: 'Closable site doors', c: ['#7a6a4f', '#1c1913'],
    desc: 'A wide open mid ties both sites together. Mechanical doors on each site can be shut to cut off rotates and retakes.' },
  { id: 'bind', name: 'Bind', loc: 'Rabat, Morocco', year: 2020, sites: 'A, B', tag: 'One-way teleporters', c: ['#9b6a3c', '#251710'],
    desc: 'No middle lane. Two one-way teleporters let teams fake and rotate faster than the walk suggests — sound cues matter.' },
  { id: 'breeze', name: 'Breeze', loc: 'Bermuda Triangle', year: 2021, sites: 'A, B', tag: 'Long sightlines', c: ['#2f8f8a', '#0b211f'],
    desc: 'Huge open spaces and long-range duels. Favors Operators and agents that can cover distance or block wide angles.' },
  { id: 'corrode', name: 'Corrode', loc: 'Radianite facility', year: 2025, sites: 'A, B', tag: 'Newest layout', c: ['#6b4a7d', '#170f1d'],
    desc: 'One of the newest maps in rotation. Classic two-site structure with tight chokes — less stored knowledge, more room for prepared strats.' },
  { id: 'fracture', name: 'Fracture', loc: 'Santa Fe, USA', year: 2021, sites: 'A, B', tag: 'Split attacker spawn', c: ['#a3532f', '#26130c'],
    desc: 'Attackers spawn on both sides of the map while defenders hold the middle. Pincer pressure and flank timing are everything.' },
  { id: 'haven', name: 'Haven', loc: 'Thimphu, Bhutan', year: 2020, sites: 'A, B, C', tag: 'Three sites', c: ['#8c6f45', '#1f170e'],
    desc: 'Three bomb sites stretch the defense thin. Garage controls rotations between A and C; reading early info is key.' },
  { id: 'icebox', name: 'Icebox', loc: 'Bennett Island', year: 2020, sites: 'A, B', tag: 'Ziplines & verticality', c: ['#3d7aa8', '#0c1a26'],
    desc: 'Tight vertical sites with ziplines and many off-angles. Default setups are complex; utility for clearing is essential.' },
  { id: 'lotus', name: 'Lotus', loc: 'Western Ghats, India', year: 2023, sites: 'A, B, C', tag: 'Rotating doors', c: ['#3f7d5b', '#0d1d15'],
    desc: 'Three sites with rotating doors and a breakable wall. Fast rotations and loud door audio create bait opportunities.' },
  { id: 'pearl', name: 'Pearl', loc: 'Lisbon, Portugal', year: 2022, sites: 'A, B', tag: 'Pure fundamentals', c: ['#2c5f86', '#0b1622'],
    desc: 'An underwater city with no gimmicks — long mid, wide sites and lots of corners. Pure aim, spacing and coordination.' },
  { id: 'split', name: 'Split', loc: 'Tokyo, Japan', year: 2020, sites: 'A, B', tag: 'Ropes & high ground', c: ['#86405a', '#1e0d14'],
    desc: 'Vertical map with ropes connecting levels. Mid control is huge; heaven positions make sites strong for defenders.' },
  { id: 'sunset', name: 'Sunset', loc: 'Los Angeles, USA', year: 2023, sites: 'A, B', tag: 'Tight mid fights', c: ['#b2643a', '#28140b'],
    desc: 'A compact two-site map with a contested mid. Quick rotations and close-quarters fights around market and courtyard.' },
];

export const FORMATS: Record<Format, { label: string; name: string; d: string }> = {
  1: { label: 'Bo1', name: 'Best of 1', d: 'Ban down to one' },
  2: { label: 'Bo2', name: 'Best of 2', d: 'One pick each' },
  3: { label: 'Bo3', name: 'Best of 3', d: '2 picks + decider' },
  5: { label: 'Bo5', name: 'Best of 5', d: '4 picks + decider' },
};

export const defaultSetup = (): Setup => ({
  title: '',
  teams: ['Team Alpha', 'Team Bravo'],
  first: 'a',
  format: 3,
  pool: ['abyss', 'ascent', 'bind', 'corrode', 'haven', 'lotus', 'sunset'],
  custom: [],
  seq: null,
  sidePick: true,
  timer: 0,
  notes: {},
});
