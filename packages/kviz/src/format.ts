/**
 * How a duration reads. Its own module with no imports, for the same reason
 * rota.ts is: three things print a time — the end of a round, the text you
 * paste, and the card you send — and they must not be able to disagree. Two of
 * them already had their own copy of this function.
 */

/** 3:07, or 47s when it never reaches a minute. */
export function clock(ms: number) {
  const total = Math.round(ms / 1000)
  const min = Math.floor(total / 60)
  return min ? `${min}:${String(total % 60).padStart(2, '0')}` : `${total}s`
}
