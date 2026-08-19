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
      if (a.correct) continue
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

/** Everything the progress page shows, from what this browser has kept. */
export function progress(app?: string) {
  const rounds = history().filter((r) => (app ? r.app === app : true) && r.answers.length > 0)
  return {
    rounds,
    all: tally(rounds),
    topics: byTopic(rounds),
    confused: confusions(rounds),
    line: overTime(rounds),
  }
}
