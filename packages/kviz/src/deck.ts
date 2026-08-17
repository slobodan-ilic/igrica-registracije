import type { RegionCollection, RegionProps } from './types'

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
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

/** A round is a shuffled slice of the codes in play. */
export function buildDeck(codes: string[], length: number): string[] {
  return shuffle(codes).slice(0, Math.min(length, codes.length))
}

export function indexByCode(regions: RegionCollection): Map<string, RegionProps> {
  return new Map(regions.features.map((f) => [f.properties.code, f.properties]))
}

/** "Novi Sad, Bač i Titel" — Serbian list joining, for the reveal text. */
export function joinSr(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`
}
