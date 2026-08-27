import type { Played } from './history'

/**
 * Which questions you owe.
 *
 * This is the one thing here that a lookup site cannot copy: every answer
 * records *what you picked*, so the codes you keep getting wrong are already
 * written down. All this does is read them back and put them in order.
 *
 * Pure, and deliberately so — no React, no browser, no storage. A list of
 * finished rounds goes in and a list of codes comes out, which is what lets it
 * be checked without a browser open.
 */

export type Due = {
  code: string
  /** How many times it has been got wrong, across every round ever played. */
  missed: number
  /** Correct answers in a row since the most recent miss. */
  since: number
  /** When it was last missed, epoch milliseconds. The tiebreak. */
  at: number
}

/**
 * Right this many times running and a code leaves the list.
 *
 * Two rather than one because one correct answer after a miss is as likely to
 * be a lucky click as a thing learned — and rather than five, because a list
 * that never shrinks is a list nobody believes. It is the shrinking that makes
 * this a study tool instead of a harder round.
 */
export const GRADUATES_AT = 2

/**
 * Fewer than this and there is no round worth offering. Three questions is not
 * a game, and a button that deals one teaches whoever presses it that the
 * feature is not for them.
 */
export const ENOUGH = 4

/** How long a practice round is when there is that much to practise. */
export const LENGTH = 10

/**
 * The codes still owed for one topic, worst first.
 *
 * Every round counts here, whatever shape it was — easy, clocked, or a practice
 * round itself. That is not the "never average incomparable rounds" rule being
 * broken: nothing here is averaged. Getting a code wrong among four neighbours
 * and getting it wrong on the whole map are different admissions, but they are
 * both admissions, and this is choosing what to ask rather than scoring what
 * was answered. Practice rounds count for the same reason — they are how a code
 * graduates.
 *
 * A question the clock ran out on counts as a miss. It is a weaker signal than
 * picking the wrong place — you might have had it with two more seconds — but
 * it is not knowing it, which is what this list is for. (`confusions` in
 * stats.ts drops those, and should: a timeout is not somewhere you confused
 * with somewhere else.)
 *
 * `playable` is what is on the map right now, so a Kosovo code cannot be dealt
 * into a round played without that set. Callers that have no dataset loaded
 * omit it and get the whole list.
 */
export function due(rounds: Played[], topic: string, playable?: Set<string>): Due[] {
  const seen = new Map<string, Due>()

  // Oldest first. "Twice in a row since the last miss" is a fact about order,
  // and history() hands rounds over newest first.
  for (const round of [...rounds].sort((a, b) => a.at - b.at)) {
    if (round.topic !== topic) continue
    for (const answer of round.answers) {
      const at = seen.get(answer.code) ?? { code: answer.code, missed: 0, since: 0, at: 0 }
      if (answer.correct) {
        at.since++
      } else {
        at.missed++
        at.since = 0
        at.at = round.at
      }
      seen.set(answer.code, at)
    }
  }

  return [...seen.values()]
    .filter((d) => d.missed > 0 && d.since < GRADUATES_AT)
    .filter((d) => !playable || playable.has(d.code))
    .sort((a, b) => b.missed - a.missed || b.at - a.at || a.code.localeCompare(b.code))
}

/**
 * The deck for one practice round: the worst of them, in that order.
 *
 * Worst first rather than shuffled, because the first question is the one asked
 * while attention is freshest, and because an order derived from something is
 * explainable in a way a shuffle is not. Which ten they are changes on its own
 * as codes graduate off the top.
 */
export const deckOf = (list: Due[], length = LENGTH) =>
  list.slice(0, length).map((d) => d.code)
