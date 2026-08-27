import { history, type Played } from './history'

/**
 * What the rounds add up to. Kept apart from the drawing of it, so the numbers
 * can be checked without a browser.
 */

export type Tally = {
  rounds: number
  questions: number
  correct: number
  /** Percentage, rounded. */
  accuracy: number
  /** The longest run of correct answers across any one round. */
  streak: number
  /** Median time to answer, in seconds. The median, because one interruption
   *  in a hundred questions would drag a mean around by itself. */
  pace: number
}

export type ByTopic = Tally & { topic: string }

/** A wrong answer someone keeps giving: the code asked, and what they said. */
export type Confusion = { code: string; picked: string; times: number }

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

function median(xs: number[]) {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function tally(rounds: Played[]): Tally {
  const answers = rounds.flatMap((r) => r.answers)
  const correct = answers.filter((a) => a.correct).length

  let streak = 0
  for (const r of rounds) {
    let run = 0
    for (const a of r.answers) {
      run = a.correct ? run + 1 : 0
      streak = Math.max(streak, run)
    }
  }

  return {
    rounds: rounds.length,
    questions: answers.length,
    correct,
    accuracy: pct(correct, answers.length),
    streak,
    pace: Math.round(median(answers.map((a) => a.ms)) / 100) / 10,
  }
}

/** One tally per topic, busiest first. */
export function byTopic(rounds: Played[]): ByTopic[] {
  const groups = new Map<string, Played[]>()
  for (const r of rounds) groups.set(r.topic, [...(groups.get(r.topic) ?? []), r])
  return [...groups]
    .map(([topic, rs]) => ({ topic, ...tally(rs) }))
    .sort((a, b) => b.questions - a.questions)
}

/**
 * The mistakes worth naming. Only pairs given more than once: a single slip is
 * noise, and telling someone about it would bury the habit underneath it.
 */
export function confusions(rounds: Played[], least = 2): Confusion[] {
  const seen = new Map<string, Confusion>()
  for (const r of rounds) {
    for (const a of r.answers) {
      // Nothing picked means the clock ran out, which is not a place someone
      // confused with somewhere else.
      if (a.correct || !a.picked) continue
      const key = `${a.code}>${a.picked}`
      const at = seen.get(key)
      if (at) at.times++
      else seen.set(key, { code: a.code, picked: a.picked, times: 1 })
    }
  }
  return [...seen.values()].filter((c) => c.times >= least).sort((a, b) => b.times - a.times)
}

/** Accuracy round by round, oldest first, for the line. */
export function overTime(rounds: Played[], most = 24) {
  return [...rounds]
    .sort((a, b) => a.at - b.at)
    .slice(-most)
    .map((r) => ({
      at: r.at,
      topic: r.topic,
      accuracy: pct(r.answers.filter((a) => a.correct).length, r.answers.length),
      questions: r.answers.length,
    }))
}

/**
 * Which rounds are being counted. Easy and classic must not be averaged
 * together: on easy you choose one of four, so guessing alone scores about
 * 25%, while on the whole map it scores about one in seventy. A single
 * accuracy figure over both says nothing about either.
 */
export type Mode = 'all' | 'easy' | 'classic'

const inMode = (r: Played, mode: Mode) =>
  mode === 'all' || (mode === 'easy' ? r.easy : !r.easy)

/**
 * How a round compares with the ones before it — the same country, played the
 * same way, and not counting the round itself.
 *
 * A score on its own says nothing: nine out of ten is a triumph on the whole
 * map of Yugoslavia and unremarkable among four choices. This is what turns the
 * number at the end of a round into a sentence about you.
 */
export function against(round: Played, app?: string) {
  const before = history().filter(
    (r) =>
      r.id !== round.id &&
      r.topic === round.topic &&
      r.easy === round.easy &&
      r.timed === round.timed &&
      // A deck chosen from your mistakes is harder than one dealt at random, so
      // the two never compare. Same rule as easy and the clock.
      Boolean(r.practice) === Boolean(round.practice) &&
      r.answers.length > 0 &&
      (app ? r.app === app : true),
  )
  if (!before.length) return null

  const here = pct(round.score, round.answers.length)
  const usual = tally(before).accuracy
  const bestBefore = Math.max(...before.map((r) => pct(r.score, r.answers.length)))

  return {
    rounds: before.length,
    usual,
    /** Percentage points above or below the usual, which may be negative. */
    better: here - usual,
    best: here > bestBefore,
    /** True when this ties the best rather than beating it. */
    equalled: here === bestBefore,
  }
}

/** Everything the progress page shows, from what this browser has kept. */
export function progress(app?: string, mode: Mode = 'all') {
  const every = history().filter((r) => (app ? r.app === app : true) && r.answers.length > 0)
  /**
   * Practice rounds are held out of every figure below. Their decks are chosen
   * to be the things you get wrong, so counting them would pull accuracy down
   * the harder you worked at it — the one number on this page that must never
   * punish practising. They are counted on their own, and what they are for is
   * measured by the list shrinking rather than by a percentage.
   */
  const drilled = every.filter((r) => r.practice)
  const played = every.filter((r) => !r.practice)
  const rounds = played.filter((r) => inMode(r, mode))
  return {
    /** Practice rounds finished, and questions asked in them. */
    drilled: {
      rounds: drilled.length,
      questions: drilled.reduce((n, r) => n + r.answers.length, 0),
    },
    /** What is on offer, so the page can hide a filter with nothing to filter. */
    modes: {
      easy: played.filter((r) => r.easy).reduce((n, r) => n + r.answers.length, 0),
      classic: played.filter((r) => !r.easy).reduce((n, r) => n + r.answers.length, 0),
    },
    rounds,
    all: tally(rounds),
    topics: byTopic(rounds),
    // Counted across practice rounds too: a mistake made while practising is
    // still a mistake, and nothing here is averaged.
    confused: confusions(every.filter((r) => inMode(r, mode))),
    line: overTime(rounds),
  }
}
