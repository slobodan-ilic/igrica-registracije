/**
 * Which country the daily challenge is, on a given day.
 *
 * Its own module, with no imports at all, because two things need it and they
 * must not be able to disagree: the challenge the app deals, and the picture a
 * shared link shows. They did disagree — the picture said Serbia every day —
 * and the reason was that only one of them knew the rule.
 */

/** The order the daily walks. Changing it renumbers nothing; it re-deals. */
export const ROTA = [
  'srbija',
  'hrvatska',
  'makedonija',
  'crnagora',
  'jugoslavija',
  'slovenija',
] as const

/**
 * The day turns over at midnight in Belgrade rather than at UTC. Almost
 * everyone playing is in that hour, and a challenge that changed at two in the
 * morning would be a puzzle about time zones rather than about plates.
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

/** Which country that challenge asks about. */
export const countryFor = (day: string = today()): string =>
  ROTA[(((number(day) - 1) % ROTA.length) + ROTA.length) % ROTA.length]

/** How long a daily round is. Short enough that anyone will finish it. */
export const LENGTH = 10
