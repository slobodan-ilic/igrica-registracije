import { history } from './history'
import { appName } from './prefs'

/**
 * The daily challenge: one round a day, the same one for everyone.
 *
 * The day turns over at midnight in Belgrade rather than at UTC. Almost
 * everyone playing this is in that hour, and a challenge that changed at two in
 * the morning — or that handed Australia tomorrow's round while Serbia was
 * still on today's — would be a puzzle about time zones rather than plates.
 */
export const ZONE = 'Europe/Belgrade'

/** Today there, as YYYY-MM-DD. Swedish formatting is ISO order, which is why. */
export const today = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE }).format(now)

/** Day one. Fixed forever, or every past challenge would be renumbered. */
const EPOCH = '2026-08-24'

/** Which challenge a day is — #1, #2, and so on. */
export const number = (day: string = today()): number =>
  Math.round((Date.parse(day) - Date.parse(EPOCH)) / 86_400_000) + 1

/**
 * Which quiz today's is. It walks the countries rather than staying on one, so
 * "which one is it today" is itself a small reason to come back — and so a
 * daily player meets all six rather than only the flagship.
 */
export const topicFor = (ids: string[], day: string = today()): string =>
  ids[((number(day) - 1) % ids.length + ids.length) % ids.length]

/** How long a daily round is. Short enough that anyone will finish it. */
export const LENGTH = 10

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

/** Today's attempt, if there has been one. A challenge is played once. */
export function attempt(topic: string, day: string = today()) {
  return history().find(
    (r) => r.app === appName() && r.topic === topic && r.seed === day && !r.easy && !r.timed,
  )
}
