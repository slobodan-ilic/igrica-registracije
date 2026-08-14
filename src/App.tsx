import { useEffect, useMemo, useState } from 'react'
import { geoCentroid } from 'd3-geo'
import { Home } from './screens/Home'
import { Setup } from './screens/Setup'
import { Game } from './screens/Game'
import { ThemeToggle } from './components/Chrome'
import { indexByCode, playableCodes } from './lib/game'
import { applyTheme, systemTheme, THEMES, usePref, type Theme } from './lib/prefs'
import { href, navigate, useRoute } from './lib/router'
import { CHOICES } from './lib/useRound'
import { TOPICS, type TopicData, type TopicId } from './topics'
import './App.css'

/** 'easy' narrows the map to four choices; 'classic' leaves all of it live. */
type Mode = 'easy' | 'classic'
const MODES = ['easy', 'classic'] as const
const KIM = ['on', 'off'] as const

const isTopic = (id: string): id is TopicId => id in TOPICS

export default function App() {
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
  const topic = topicId && isTopic(topicId) ? TOPICS[topicId] : null

  // An unknown topic in the URL is a dead end; send it home.
  useEffect(() => {
    if (route.name !== 'home' && !topic) navigate(href.home(), true)
  }, [route, topic])

  useEffect(() => {
    document.title = topic ? `${topic.label} · geografija Srbije` : 'Geografija Srbije · kviz'
  }, [topic])

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

  if (route.name === 'home' || !topic) {
    return (
      <main className="shell shell--scroll">
        <ThemeToggle theme={theme} onChange={setTheme} />
        <Home />
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
