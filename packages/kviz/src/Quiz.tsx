import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { geoCentroid } from 'd3-geo'
import { Daily } from './Daily'
import { Progress } from './Progress'
import { Setup, type Length } from './Setup'
import { Game } from './Game'
import { Corner, OtherApp, type Elsewhere } from './Chrome'
import { accountsOffered, useAccount } from './account'
import { indexByCode, playableCodes, randomSeed } from './deck'
import { history } from './history'
import { deckOf, due, ENOUGH } from './practice'
import { applyTheme, systemTheme, THEMES, usePref, type Theme } from './prefs'
import { canonical, href, navigate, useRoute, type Round } from './router'
import { CHOICES } from './useRound'
import type { Topic, TopicData } from './topic'
import './styles.css'

/** 'easy' narrows the map to four choices; 'classic' leaves all of it live. */
type Mode = 'easy' | 'classic'
const MODES = ['easy', 'classic'] as const
const KIM = ['on', 'off'] as const
const TIMED = ['on', 'off'] as const
const LENGTHS = ['10', '25', 'sve'] as const

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
  /** The sibling app, named once at the foot of the front page. */
  elsewhere?: Elsewhere
}

/**
 * A whole quiz app: routing, remembered settings, and loading the open topic's
 * data. Everything specific to a subject lives in its Topic, so this is the
 * same code whether the answers are licence plates or mountains.
 */
export function Quiz({ topics, home, title, siblingsLabel, elsewhere }: QuizProps) {
  const route = useRoute()

  // Every choice the player makes is remembered for next time.
  const [theme, setTheme] = usePref<Theme>('theme', THEMES, systemTheme)
  useEffect(() => applyTheme(theme), [theme])
  const [mode, setMode] = usePref<Mode>('mode', MODES, () => 'classic')
  const [kim, setKim] = usePref<'on' | 'off'>('kim', KIM, () => 'off')
  const [timed, setTimed] = usePref<'on' | 'off'>('timed', TIMED, () => 'off')
  // Ten to begin with: short enough to finish, long enough to be a game.
  const [length, setLength] = usePref<Length>('duzina', LENGTHS, () => '10')

  const account = useAccount()

  const touch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
    [],
  )

  const topicId =
    route.name === 'home' || route.name === 'progress' || route.name === 'daily'
      ? null
      : route.topic
  const topic = topicId && topicId in topics ? topics[topicId] : null

  // An unknown topic in the URL is a dead end; send it home.
  useEffect(() => {
    if (!('topic' in route) && route.name !== 'home') return
    if (route.name !== 'home' && !topic) navigate(href.home(), true)
  }, [route, topic])

  useEffect(() => {
    document.title = title(topic)
  }, [topic, title])

  // Datasets are fetched per topic, so the chooser downloads none of them.
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

  // A round without a seed is not yet a round anyone could be sent, so one is
  // minted and put in the URL before play starts. Everything else is nudged to
  // the address it ought to have — navigate is a no-op when it is already there.
  useEffect(() => {
    if (route.name === 'game' && route.length > 0 && !route.seed) {
      navigate(href.game(route.topic, { ...route, seed: randomSeed() }), true)
      return
    }
    const where = canonical(route)
    if (where) navigate(where, true)
  }, [route])

  const regions = data?.regions
  // In a round the URL decides; on the menu the remembered preference does.
  const withKim =
    (route.name === 'game' ? route.kim : kim === 'on') && (topic?.offersKim ?? false)

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

  /**
   * `/:topic/greske` is a doorway, not a round: it reads what this browser
   * still owes, deals it, and replaces itself with the round's own address —
   * `replace`, so pressing back does not land on a doorway that deals again.
   *
   * It happens here rather than on the button that links to it because only
   * here is the dataset loaded, and only the dataset says which codes are on
   * the map. It plays the way you play: the remembered difficulty, clock and
   * Kosovo setting, exactly as pressing Igraj would.
   *
   * Too few owed and it goes to the topic's page instead. Three questions is
   * not a round, and dealing one teaches whoever pressed it that this is not
   * for them.
   */
  useEffect(() => {
    if (route.name !== 'practice' || !topic || !data) return
    const deck = deckOf(due(history(), topic.id, playable))
    navigate(
      deck.length >= ENOUGH
        ? href.game(topic.id, {
            length: deck.length,
            seed: randomSeed(),
            easy: mode === 'easy',
            kim: withKim,
            timed: timed === 'on',
            deck,
          })
        : href.setup(topic.id),
      true,
    )
  }, [route.name, topic, data, playable, mode, withKim, timed])

  const corner = (
    <Corner theme={theme} onTheme={setTheme} account={account} />
  )

  if (route.name === 'daily') {
    return (
      <main className="shell shell--scroll">
        {corner}
        <Daily topics={topics} />
      </main>
    )
  }

  if (route.name === 'progress') {
    return (
      <main className="shell shell--scroll">
        {corner}
        <Progress topics={topics} player={account.player} accounts={accountsOffered()} />
      </main>
    )
  }

  if (!topic) {
    return (
      <main className="shell shell--scroll">
        {corner}
        {home}
        {elsewhere && <OtherApp to={elsewhere} />}
      </main>
    )
  }

  if (!data) {
    return (
      <main className="shell shell--center">
        {corner}
        <p className="loading">Učitavanje mape…</p>
      </main>
    )
  }

  // Between the dataset arriving and the redirect above, so the topic's page
  // does not flash up on the way to a round.
  if (route.name === 'practice') {
    return (
      <main className="shell shell--center">
        {corner}
        <p className="loading">Spremam vaše greške…</p>
      </main>
    )
  }

  if (route.name === 'game' && route.length > 0 && route.seed) {
    const settings: Round = { ...route, kim: withKim }
    return (
      <main className="shell shell--game">
        <Game
          // The round's identity is its settings, so a new seed is a new round.
          key={href.game(topic.id, settings)}
          topic={topic}
          data={data}
          codes={codes}
          byCode={byCode}
          centroids={centroids}
          playable={playable}
          round={settings}
          touch={touch}
          theme={theme}
          onTheme={setTheme}
        />
      </main>
    )
  }

  return (
    <main className="shell shell--center">
      {corner}
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
          elsewhere={elsewhere}
          timed={timed === 'on'}
          onTimed={(on) => setTimed(on ? 'on' : 'off')}
          length={length}
          onLength={setLength}
        />
      )}
    </main>
  )
}
