/**
 * A finished round, small enough to fit in a link.
 *
 * Its own module with no imports but rota's, for the reason rota has none at
 * all: three things read this and they must not be able to disagree — the app
 * that writes the link, the page that answers it, and the picture that page
 * tells a crawler to draw. A shared result whose preview says a different score
 * from the page behind it is worse than no preview.
 *
 * Nothing here can give an answer away. What travels is which round it was and
 * which questions went right — never a code, never a place.
 */

import { countryFor, number } from './rota.js'

export type Shared = {
  topic: string
  seed: string
  easy: boolean
  kim: boolean
  timed: boolean
  /** One per question, in the order they were asked. */
  marks: boolean[]
  /** Whole seconds the round took, or 0 when there is nothing worth printing. */
  seconds: number
}

/**
 * The round's own letters are kept where they can be — `s`, `m` and `k` mean
 * here exactly what they mean in a round's address — so a share link reads as
 * the round it was plus what happened. `g` is the grid and `q` how long it
 * took; the length is the grid's own, so it is not written twice and cannot be
 * written wrong.
 *
 * The clock is `c` rather than the round's `t`, and that is not a preference.
 * `t` already means *which topic* to both the picture and the page that draw
 * this, and Vercel's rewrite hands the topic over in the query — so a clocked
 * round arrived as `t=1&t=crnagora`, and came out the other side unclocked.
 * One letter, two meanings, and the loser was silent.
 */
export function encode(r: Shared): string {
  return [
    `s=${encodeURIComponent(r.seed)}`,
    r.easy && 'm=lako',
    r.kim && 'k=1',
    r.timed && 'c=1',
    `g=${r.marks.map((ok) => (ok ? 1 : 0)).join('')}`,
    r.seconds > 0 && `q=${r.seconds}`,
  ]
    .filter(Boolean)
    .join('&')
}

/** Reads one back, or null if it is not one — a hand-typed link is not an error. */
export function decode(topic: string, params: URLSearchParams): Shared | null {
  const seed = params.get('s')
  const grid = params.get('g')
  if (!topic || !seed || !grid) return null
  if (!/^[01]{1,200}$/.test(grid)) return null
  if (!/^[a-z0-9-]{1,32}$/i.test(seed)) return null

  const seconds = Number(params.get('q') ?? 0)
  return {
    topic,
    seed,
    easy: params.get('m') === 'lako',
    kim: params.get('k') === '1',
    timed: params.get('c') === '1',
    marks: [...grid].map((c) => c === '1'),
    seconds: Number.isFinite(seconds) && seconds > 0 && seconds < 86_400 ? Math.round(seconds) : 0,
  }
}

export const score = (r: Shared) => r.marks.filter(Boolean).length

/**
 * Which challenge this was, or null. The same three tests the app makes: the
 * seed is a date, the country is the one that date deals, and it was played the
 * shape the challenge deals — anything else is a practice round that happens to
 * share a seed.
 */
export function challengeNumber(r: Shared): number | null {
  if (r.easy || r.timed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.seed)) return null
  if (r.topic !== countryFor(r.seed)) return null
  return number(r.seed)
}

/** 3:07, or 47s. Seconds here rather than milliseconds, so it is not format.ts. */
export function spell(seconds: number) {
  const min = Math.floor(seconds / 60)
  return min ? `${min}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`
}

/** "Tablice #3 · 10/10 · 2:50" — one line, the same one everywhere it appears. */
export function headline(r: Shared, label: string) {
  const n = challengeNumber(r)
  const what = n === null ? `Tablice · ${label}` : `Tablice #${n}`
  const time = r.seconds > 0 ? ` · ${spell(r.seconds)}` : ''
  return `${what} · ${score(r)}/${r.marks.length}${time}`
}

/** Where the link points, and where its "play it" goes. */
export const shareHref = (r: Shared) => `/r/${r.topic}?${encode(r)}`

/**
 * The round itself. A challenge is sent as `/dnevni`, since everyone's is the
 * same that day and a seeded copy of it would be a second address for one
 * thing; everything else is sent as the round it was.
 */
export function playHref(r: Shared): string {
  if (challengeNumber(r) !== null) return '/dnevni'
  const q = [
    `n=${r.marks.length}`,
    `s=${encodeURIComponent(r.seed)}`,
    r.easy && 'm=lako',
    r.kim && 'k=1',
    r.timed && 't=1',
  ]
    .filter(Boolean)
    .join('&')
  return `/${r.topic}/igra?${q}`
}
