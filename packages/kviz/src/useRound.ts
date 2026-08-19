import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { geoDistance } from 'd3-geo'
import { buildDeck, rngFrom, shuffle } from './deck'
import type { RegionProps, RegionState, Result } from './types'

/** How many areas are live per question in easy mode. */
export const CHOICES = 4

/**
 * How long a question is worth against the clock.
 *
 * It has to depend on how much map is being searched, or the same number is
 * generous on Montenegro's twenty-five and cruel on Yugoslavia's hundred and
 * twenty-five. Search narrows by region rather than sweeping every candidate,
 * so the time grows with the logarithm of the field: four seconds to read the
 * plate, then about three per doubling of the map.
 *
 *     4 choices  10s      74 (Srbija)      24s
 *    25 (C. Gora) 19s    125 (SFRJ)        27s
 */
export const budget = (choices: number) =>
  Math.min(30, Math.max(8, Math.round(4 + 3.2 * Math.log2(Math.max(choices, 2)))))
/** Decoys come from this many nearest neighbours, so the choices form one
 *  cluster on the map instead of being scattered across the country. */
const NEAR_POOL = 8

/**
 * One question, answered. This is the whole record of a round: the score, the
 * streak, the progress map and the summary are all read back out of a list of
 * these rather than counted up as you go. It is what gets shared, stored and —
 * once there are accounts — uploaded, so it holds what was picked instead of
 * the right answer, not merely whether it was right.
 */
export type Answer = {
  code: string
  picked: string
  correct: boolean
  /** How long the question took, in milliseconds. */
  ms: number
}

type Options = {
  codes: string[]
  byCode: Map<string, RegionProps>
  centroids: Map<string, [number, number]>
  length: number
  easy: boolean
  /** Names the round: the same seed deals the same questions in the same order. */
  seed: string
  /** Seconds a question is worth, or 0 when the round is not against a clock. */
  seconds: number
}

/** The longest run of correct answers, and the run still going. */
function runs(answers: Answer[]) {
  let streak = 0
  let best = 0
  for (const a of answers) {
    streak = a.correct ? streak + 1 : 0
    best = Math.max(best, streak)
  }
  return { streak, best }
}

/** Everything that makes up one round: the deck, the score, and what the map shows. */
export function useRound({ codes, byCode, centroids, length, easy, seed, seconds }: Options) {
  const [deck] = useState(() => buildDeck(codes, length, seed))
  const [answers, setAnswers] = useState<Answer[]>([])
  // Whether the answer just given is still on screen. The reveal is a moment in
  // the round, not a fact about it, so it is the one thing held apart.
  const [showing, setShowing] = useState(false)

  const step = answers.length - (showing ? 1 : 0)
  const code = deck[step]
  const target = code ? byCode.get(code) : undefined
  const answer = showing ? answers[answers.length - 1] : null
  const done = !showing && deck.length > 0 && answers.length >= deck.length

  // Restarted for each question, so every answer carries how long it took.
  const asked = useRef(0)
  useEffect(() => {
    asked.current = performance.now()
  }, [step])

  const pick = useCallback(
    (picked: string) => {
      if (showing || !code) return
      setAnswers((a) => [
        ...a,
        { code, picked, correct: picked === code, ms: Math.round(performance.now() - asked.current) },
      ])
      setShowing(true)
    },
    [showing, code],
  )

  /**
   * The clock, when there is one. It runs down while a question is on screen
   * and stops the moment one is answered, so the time on the bar is the time
   * left to answer rather than a wall clock that carries on through the reveal.
   *
   * Running out is recorded as an unanswered question — wrong, but with nothing
   * picked, so it never turns up among the mistakes as a place you confused
   * with somewhere. Not answering is not the same as answering wrongly.
   */
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (!seconds || showing || !code) return
    setLeft(seconds)
    const started = performance.now()
    const tick = window.setInterval(() => {
      const remains = seconds - (performance.now() - started) / 1000
      if (remains > 0) {
        setLeft(remains)
        return
      }
      window.clearInterval(tick)
      setLeft(0)
      setAnswers((a) => [...a, { code, picked: '', correct: false, ms: seconds * 1000 }])
      setShowing(true)
    }, 100)
    return () => window.clearInterval(tick)
  }, [seconds, showing, code])

  const next = useCallback(() => setShowing(false), [])

  // A hit is self-explanatory, so move on by itself; a miss waits to be read.
  useEffect(() => {
    if (!answer?.correct) return
    const t = window.setTimeout(next, 900)
    return () => window.clearTimeout(t)
  }, [answer, next])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && answer && !answer.correct) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, next])

  // Easy mode: the answer plus three of its nearest neighbours. Drawn from the
  // seed and the question, so a shared round offers the same four choices.
  const choices = useMemo(() => {
    if (!easy || !code) return null
    const here = centroids.get(code)
    if (!here) return null
    const near = codes
      .filter((c) => c !== code)
      .map((c) => ({ c, d: geoDistance(here, centroids.get(c)!) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, NEAR_POOL)
      .map((x) => x.c)
    return new Set([code, ...shuffle(near, rngFrom(seed + code)).slice(0, CHOICES - 1)])
  }, [easy, code, codes, centroids, seed])

  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers])
  const { streak, best } = useMemo(() => runs(answers), [answers])

  const results = useMemo(() => {
    const r: Record<string, Result> = {}
    for (const a of answers) r[a.code] = a.correct ? 'correct' : 'missed'
    return r
  }, [answers])

  const missed = useMemo(
    () =>
      answers
        .filter((a) => !a.correct)
        .map((a) => byCode.get(a.code))
        .filter((p) => p !== undefined),
    [answers, byCode],
  )

  const states = useMemo(() => {
    // Start from the round so far, then let the live answer paint over it.
    const s: Record<string, RegionState> = { ...results }
    if (answer) {
      if (answer.correct) {
        s[answer.code] = 'correct'
      } else {
        s[answer.code] = 'revealed'
        if (answer.picked) s[answer.picked] = 'wrong'
      }
    }
    return s
  }, [results, answer])

  const labelled = useMemo(() => {
    if (!answer) return []
    if (answer.correct) return [answer.code]
    return answer.picked ? [answer.code, answer.picked] : [answer.code]
  }, [answer])

  return {
    deck, step, code, target, answers, answer, score, streak, best, missed, done, results,
    choices, states, labelled, pick, next,
    /** Seconds left on this question, and how many it started with. */
    left, seconds,
    /** How long the whole round has taken so far, in milliseconds. */
    spent: answers.reduce((t, a) => t + a.ms, 0),
  }
}
