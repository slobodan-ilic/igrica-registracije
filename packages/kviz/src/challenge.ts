import { history } from './history'
import { appName } from './prefs'
import { countryFor, number, today, LENGTH } from './rota'

/**
 * The daily challenge, as the app meets it: which round today deals, and
 * whether it has been played.
 *
 * The rule itself — the day, the number, the country — lives in rota.ts, with
 * no imports, because the picture a shared link shows has to follow the same
 * rule and cannot import anything that touches a browser.
 */

export { ZONE, ROTA, today, number, countryFor, LENGTH } from './rota'

/**
 * The round itself. The seed is the day, so everyone dealt it on the same date
 * is dealt the same questions in the same order — and no clock and no easy
 * mode, because a board can only rank one shape of round.
 */
export const round = (day: string = today(), of = LENGTH) => ({
  length: of,
  seed: day,
  easy: false,
  kim: false,
  timed: false,
})

/**
 * Which challenge a finished round was, or null if it was not one. A round
 * counts only if it is the shape the challenge deals — someone who plays the
 * same country on the same date with a clock has played something else.
 */
export function numberOf(
  round: { topic: string; seed: string; easy: boolean; timed: boolean },
): number | null {
  if (round.easy || round.timed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(round.seed)) return null
  if (round.topic !== countryFor(round.seed)) return null
  return number(round.seed)
}

/** Today's attempt, if there has been one. A challenge is played once. */
export function attempt(topic: string, day: string = today()) {
  return history().find(
    (r) => r.app === appName() && r.topic === topic && r.seed === day && !r.easy && !r.timed,
  )
}
