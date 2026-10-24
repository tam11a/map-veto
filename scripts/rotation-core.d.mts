// Types for rotation-core.mjs, so the app and vite.config.ts can import it with type checking.
export interface StandardMap { id: string; name: string; sites: string; desc: string }
export type RotationSource = 'henrikdev' | 'wiki';
type FetchLike = typeof fetch;

export const WIKI_PAGE: string;
export function toId(name: unknown): string;
export function pickCompetitive(json: unknown): string[];
export function fetchRotation(opts: { key?: string; region?: string; fetchImpl?: FetchLike }): Promise<string[]>;
export function pickWikiRotation(wikitext: unknown, knownMaps: { id: string; name: string }[]): string[];
export function fetchWikiRotation(opts?: { knownMaps?: { id: string; name: string }[]; fetchImpl?: FetchLike }): Promise<string[]>;
export function resolveRotation(opts: { key?: string; region?: string; fetchImpl?: FetchLike }): Promise<{ source: RotationSource; pool: string[]; note?: string }>;
export function fetchStandardMaps(opts?: { fetchImpl?: FetchLike }): Promise<StandardMap[]>;
