import { useCallback, useEffect, useMemo, useState } from 'react'
import { geoDistance } from 'd3-geo'
import { buildDeck, shuffle } from './game'
import type { RegionProps, RegionState, Result } from '../types'

/** How many areas are live per question in easy mode. */
export const CHOICES = 4
/** Decoys come from this many nearest neighbours, so the choices form one
 *  cluster on the map instead of being scattered across the country. */
const NEAR_POOL = 8

type Answer = { picked: string; correct: boolean }

type Options = {
  codes: string[]
  byCode: Map<string, RegionProps>
  centroids: Map<string, [number, number]>
  length: number
  easy: boolean
}

/** Everything that makes up one round: the deck, the score, and what the map shows. */
export function useRound({ codes, byCode, centroids, length, easy }: Options) {
  const [deck] = useState(() => buildDeck(codes, length))
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [missed, setMissed] = useState<RegionProps[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})
  const [done, setDone] = useState(false)

  const code = deck[step]
  const target = code ? byCode.get(code) : undefined

  const pick = useCallback(
    (picked: string) => {
      if (answer || !code) return
      const correct = picked === code
      setAnswer({ picked, correct })
      setResults((r) => ({ ...r, [code]: correct ? 'correct' : 'missed' }))
      if (correct) {
        setScore((s) => s + 1)
        setStreak((s) => {
          const nextStreak = s + 1
          setBest((b) => Math.max(b, nextStreak))
          return nextStreak
        })
      } else {
        setStreak(0)
        const props = byCode.get(code)
        if (props) setMissed((m) => [...m, props])
      }
    },
    [answer, code, byCode],
  )

  const next = useCallback(() => {
    setAnswer(null)
    setStep((s) => {
      if (s + 1 >= deck.length) {
        setDone(true)
        return s
      }
      return s + 1
    })
  }, [deck.length])

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

  // Easy mode: the answer plus three of its nearest neighbours.
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
    return new Set([code, ...shuffle(near).slice(0, CHOICES - 1)])
  }, [easy, code, codes, centroids])

  const states = useMemo(() => {
    // Start from the round so far, then let the live answer paint over it.
    const s: Record<string, RegionState> = { ...results }
    if (answer && code) {
      if (answer.correct) {
        s[code] = 'correct'
      } else {
        s[code] = 'revealed'
        s[answer.picked] = 'wrong'
      }
    }
    return s
  }, [results, answer, code])

  const labelled = useMemo(() => {
    if (!answer || !code) return []
    return answer.correct ? [code] : [code, answer.picked]
  }, [answer, code])

  return {
    deck, step, code, target, answer, score, streak, best, missed, done, results,
    choices, states, labelled, pick, next,
  }
}
