import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { geoCentroid } from 'd3-geo'
import { Setup } from './Setup'
import { Game } from './Game'
import { ThemeToggle } from './Chrome'
import { indexByCode, playableCodes } from './deck'
import { applyTheme, systemTheme, THEMES, usePref, type Theme } from './prefs'
import { href, navigate, useRoute } from './router'
import { CHOICES } from './useRound'
import type { Topic, TopicData } from './topic'
import './styles.css'

/** 'easy' narrows the map to four choices; 'classic' leaves all of it live. */
type Mode = 'easy' | 'classic'
const MODES = ['easy', 'classic'] as const
const KIM = ['on', 'off'] as const

export type QuizProps = {
  /** Every quiz this app offers, by id. */
  topics: Record<string, Topic>
  /**
   * The chooser, for apps with more than one quiz. An app with a single quiz
   * omits it: its menu is the front page and the chooser would be one card.
   */
  home?: ReactNode
  /** Browser tab title, given the open topic (null on the chooser). */
  title: (topic: Topic | null) => string
  /**
   * Heading for the switcher between topics, shown on a topic's menu when the
   * app has no chooser page — "Druge zemlje" for the plate quiz. Omit it and no
   * switcher appears.
   */
  siblingsLabel?: string
}

/**
 * A whole quiz app: routing, remembered settings, and loading the open topic's
 * data. Everything specific to a subject lives in its Topic, so this is the
 * same code whether the answers are licence plates or mountains.
 */
export function Quiz({ topics, home, title, siblingsLabel }: QuizProps) {
  const route = useRoute()

  // Every choice the player makes is remembered for next time.
  const [theme, setTheme] = usePref<Theme>('theme', THEMES, systemTheme)
  useEffect(() => applyTheme(theme), [theme])
  const [mode, setMode] = usePref<Mode>('mode', MODES, () => 'classic')
  const [kim, setKim] = usePref<'on' | 'off'>('kim', KIM, () => 'off')

  const touch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
    [],
  )

  const topicId = route.name === 'home' ? null : route.topic
  const topic = topicId && topicId in topics ? topics[topicId] : null

  // An unknown topic in the URL is a dead end; send it home.
  useEffect(() => {
    if (route.name !== 'home' && !topic) navigate(href.home(), true)
  }, [route, topic])

  useEffect(() => {
    document.title = title(topic)
  }, [topic, title])

  // Datasets are fetched per topic, so the chooser downloads none of them.
  const [replay, setReplay] = useState(0)
  const [data, setData] = useState<TopicData | null>(null)
  useEffect(() => {
    if (!topic) {
      setData(null)
      return
    }
    let live = true
    setData(null)
    topic.load().then((d) => {
      if (live) setData(d)
    })
    return () => {
      live = false
    }
  }, [topic])

  const regions = data?.regions
  const withKim = kim === 'on' && (topic?.offersKim ?? false)

  const codes = useMemo(
    () => (regions ? playableCodes(regions, withKim) : []),
    [regions, withKim],
  )
  const playable = useMemo(() => new Set(codes), [codes])
  const byCode = useMemo(() => (regions ? indexByCode(regions) : new Map()), [regions])
  const centroids = useMemo(
    () =>
      new Map(
        (regions?.features ?? []).map((f) => [
          f.properties.code,
          geoCentroid(f as unknown as GeoJSON.Feature) as [number, number],
        ]),
      ),
    [regions],
  )
  const kimCount = useMemo(
    () => (regions?.features ?? []).filter((f) => f.properties.kim).length,
    [regions],
  )
  // A different question greets you on each visit to a topic's page.
  const hero = useMemo(() => {
    const live = (regions?.features ?? []).filter((f) => !f.properties.kim)
    return live.length ? live[Math.floor(Math.random() * live.length)].properties : null
  }, [regions])

  if (!topic) {
    return (
      <main className="shell shell--scroll">
        <ThemeToggle theme={theme} onChange={setTheme} />
        {home}
      </main>
    )
  }

  if (!data) {
    return (
      <main className="shell shell--center">
        <ThemeToggle theme={theme} onChange={setTheme} />
        <p className="loading">Učitavanje mape…</p>
      </main>
    )
  }

  if (route.name === 'game' && route.length > 0) {
    return (
      <main className="shell shell--game">
        <Game
          key={`${topic.id}-${route.length}-${mode}-${withKim}-${replay}`}
          topic={topic}
          data={data}
          codes={codes}
          byCode={byCode}
          centroids={centroids}
          playable={playable}
          length={route.length}
          easy={mode === 'easy'}
          touch={touch}
          theme={theme}
          onTheme={setTheme}
          onReplay={() => setReplay((r) => r + 1)}
        />
      </main>
    )
  }

  return (
    <main className="shell shell--center">
      <ThemeToggle theme={theme} onChange={setTheme} />
      {hero && (
        <Setup
          topic={topic}
          siblings={Object.values(topics).filter((t) => t.id !== topic.id)}
          siblingsLabel={siblingsLabel}
          hero={hero}
          codes={codes}
          mode={mode}
          onMode={setMode}
          withKim={withKim}
          onKim={(on) => setKim(on ? 'on' : 'off')}
          kimCount={kimCount}
          choices={CHOICES}
        />
      )}
    </main>
  )
}
