import type { RegionCollection, RegionProps } from './types'

/**
 * Rounds are drawn from a seed rather than from chance, so a round can be named
 * by a short string and played again — by you, or by whoever you send it to.
 * The daily challenge is the same machinery with the date as the seed.
 */

/** mulberry32: tiny, fast, and good enough to shuffle a hundred codes. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Any string to a number, so a seed can read as "8fa2" or "2026-08-18". */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const rngFrom = (seed: string) => rng(hash(seed))

/** Short, lowercase, and easy to read down a phone line. */
export const randomSeed = () => Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, '0')

export function shuffle<T>(items: T[], next: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The codes in play, which may or may not include the Kosovo and Metohija set. */
export function playableCodes(regions: RegionCollection, withKim: boolean): string[] {
  return regions.features
    .filter((f) => withKim || !f.properties.kim)
    .map((f) => f.properties.code)
}

/**
 * A round is a shuffled slice of the codes in play. Sorted first, so the same
 * seed gives the same round whatever order the dataset happens to arrive in.
 */
export function buildDeck(codes: string[], length: number, seed: string): string[] {
  return shuffle([...codes].sort(), rngFrom(seed)).slice(0, Math.min(length, codes.length))
}

export function indexByCode(regions: RegionCollection): Map<string, RegionProps> {
  return new Map(regions.features.map((f) => [f.properties.code, f.properties]))
}

/** "Novi Sad, Bač i Titel" — Serbian list joining, for the reveal text. */
export function joinSr(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`
}
