import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QuizMap } from './QuizMap'
import { BackLink, Stat, Streak, ThemeToggle } from './Chrome'
import { ContactSheet, Photo } from './Photo'
import { hasChooser, href, linkProps, navigate, type Round } from './router'
import { joinSr } from './deck'
import { plural } from './sr'
import { randomSeed } from './deck'
import { record, sync, type Played } from './history'
import { against } from './stats'
import { Share } from './ShareCard'
import { clock } from './format'
import { budget, CHOICES, useRound } from './useRound'
import type { Theme } from './prefs'
import type { Topic, TopicData } from './topic'
import type { RegionProps } from './types'

type Props = {
  topic: Topic
  data: TopicData
  codes: string[]
  byCode: Map<string, RegionProps>
  centroids: Map<string, [number, number]>
  playable: Set<string>
  /** What round this is: how long, dealt from which seed, played how. */
  round: Round
  touch: boolean
  theme: Theme
  onTheme: (t: Theme) => void
}

/**
 * What the score means, given the ones before it. Nine out of ten is a triumph
 * across Yugoslavia's hundred and twenty-five towns and unremarkable among four
 * choices, so the number alone tells nobody how they did.
 *
 * Silent on a first round, because there is nothing honest to say yet.
 */
function InContext({ round }: { round: Played }) {
  const seen = against(round, round.app)
  if (!seen) return null

  // "u prethodnoj partiji" · "u prethodne 3 partije" · "u prethodnih 8 partija" —
  // the adjective and the noun both decline, and the number drops out entirely
  // when there is one.
  const n = seen.rounds
  const before =
    n === 1
      ? 'u prethodnoj partiji'
      : `u ${plural(n, 'prethodnu', 'prethodne', 'prethodnih')} ${n} ${plural(n, 'partiju', 'partije', 'partija')}`

  if (seen.best) {
    return <p className="context context--best">Najbolje do sada — bolje nego {before}.</p>
  }
  if (seen.equalled) {
    return <p className="context">Izjednačeno sa vašim najboljim rezultatom.</p>
  }

  const gap = Math.abs(seen.better)
  return (
    <p className="context">
      Vaš prosek za ovu zemlju je {seen.usual}%
      {gap >= 1 && <> — ovo je {gap} {plural(gap, 'poen', 'poena', 'poena')} {seen.better > 0 ? 'iznad' : 'ispod'} toga</>}.
    </p>
  )
}

export function Game(props: Props) {
  const { topic, data, codes, byCode, centroids, playable, touch, theme, onTheme } = props
  const { length, easy, seed, timed } = props.round
  // Against however many places are actually live, which is four on easy.
  const seconds = timed ? budget(easy ? CHOICES : codes.length) : 0
  const round = useRound({ codes, byCode, centroids, length, easy, seed, seconds })

  // A fresh seed is a fresh round, and the URL says so — no remount trickery.
  const again = () => navigate(href.game(topic.id, { ...props.round, seed: randomSeed() }))

  // Kept the moment it is over, and only then: an abandoned round is not a
  // result. The guard is because `done` stays true while the summary is on
  // screen, and this must happen once rather than on every render of it.
  // Kept so the share button has something to describe, and so pressing it
  // twice sends the same thing rather than a second, slightly different round.
  const [played, setPlayed] = useState<Played | null>(null)

  const kept = useRef(false)
  useEffect(() => {
    if (!round.done || kept.current) return
    kept.current = true
    setPlayed(record({
      topic: topic.id,
      seed,
      length,
      easy,
      kim: props.round.kim,
      timed,
      score: round.score,
      ms: round.answers.reduce((t, a) => t + a.ms, 0),
      answers: round.answers,
    }))
    // Signed out this is refused and quietly does nothing, which is the point.
    void sync()
  }, [round.done, round.answers, round.score, topic.id, seed, length, easy, timed, props.round.kim])

  const describe = useCallback(
    (regionCode: string, isAnswered: boolean) => {
      const item = byCode.get(regionCode)
      return item ? topic.hover(item, isAnswered) : { title: '' }
    },
    [byCode, topic],
  )

  const inPlay = round.choices ?? playable

  const ask = useMemo(() => {
    if (easy) {
      return touch
        ? `Dodirni jedno od ${CHOICES} osvetljena, pa potvrdi`
        : `Kliknite jedno od ${CHOICES} osvetljena na mapi`
    }
    return touch ? `Dodirni ${topic.unit}, pa potvrdi` : `Kliknite ${topic.unit} na mapi`
  }, [easy, touch, topic.unit])

  if (round.done) {
    const pct = Math.round((round.score / round.deck.length) * 100)
    return (
      <div className="intro">
        <BackLink to={href.setup(topic.id)} label={topic.label} />
        <p className="intro__eyebrow">Kraj partije</p>
        <h1 className="intro__title">
          {round.score} / {round.deck.length} <span className="intro__accent">· {pct}%</span>
        </h1>
        <p className="intro__lead">
          Najduži niz: {round.best}
          {round.spent > 0 && (
            <>
              {' · '}
              {clock(round.spent)}
              {' · '}
              {(round.spent / 1000 / round.deck.length).toFixed(1)}s po pitanju
            </>
          )}
        </p>

        {played && <InContext round={played} />}

        <ContactSheet
          topic={topic.id}
          items={round.deck.map((c) => byCode.get(c)).filter((i) => i !== undefined)}
          results={round.results}
          photos={data.photos}
        />

        {played && <Share round={played} label={topic.label} site={window.location.origin} />}

        <div className="intro__actions">
          <button className="btn" onClick={again}>
            Igraj ponovo
          </button>
          <a className="btn" {...linkProps(href.setup(topic.id))}>
            Promeni podešavanja
          </a>
          {/* An app with one quiz has nowhere else to go. */}
          {hasChooser() && (
            <a className="btn" {...linkProps(href.home())}>
              Sve igre
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className="side">
        <div className="bar">
          <BackLink to={href.setup(topic.id)} label={topic.label} />
          <ThemeToggle theme={theme} onChange={onTheme} />
        </div>

        <div className="bar__stats">
          <Stat label="Poeni" value={`${round.score}`} />
          <Stat label="Niz" value={<Streak n={round.streak} />} />
          <Stat label="Pitanje" value={`${round.step + 1}/${round.deck.length}`} />
        </div>

        <div className="progress">
          <span style={{ width: `${(round.step / round.deck.length) * 100}%` }} />
        </div>

        <ul className="legend">
          <li><i className="legend__dot legend__dot--ok" />Tačno</li>
          <li><i className="legend__dot legend__dot--missed" />Promašeno</li>
          {easy && <li><i className="legend__dot legend__dot--pick" />Na izboru</li>}
          <li>
            <i className={`legend__dot legend__dot--${easy ? 'off' : 'idle'}`} />
            Preostalo
          </li>
          {!easy && topic.offersKim && (
            <li><i className="legend__dot legend__dot--kim" />K i M</li>
          )}
        </ul>

        <div className="quiz">
          {round.target && topic.prompt(round.target)}

          {round.seconds > 0 && (
            <div
              className={`clock${round.left <= 3 ? ' clock--last' : ''}`}
              data-seconds={round.seconds}
              role="timer"
              aria-label={`Preostalo ${Math.ceil(round.left)} sekundi`}
            >
              <span className="clock__track">
                <span
                  className="clock__left"
                  style={{ width: `${(round.left / round.seconds) * 100}%` }}
                />
              </span>
              <b className="clock__count">{Math.ceil(round.left)}</b>
            </div>
          )}
          <div className="verdict" aria-live="polite">
            {!round.answer && <span className="verdict__ask">{ask}</span>}
            {round.answer?.correct && (
              <span className="verdict__ok">Tačno — {round.target?.name}</span>
            )}
            {round.answer && !round.answer.correct && !round.answer.picked && (
              <span className="verdict__bad">
                <span>Isteklo vreme — </span>
                {round.target && topic.reveal(round.target)}
              </span>
            )}
            {round.answer && !round.answer.correct && round.answer.picked && (
              <span className="verdict__bad">
                {round.target && topic.reveal(round.target)}
                {round.target?.covers.length ? (
                  <em>
                    {topic.detail} {joinSr(round.target.covers)}
                  </em>
                ) : null}
              </span>
            )}
          </div>
          {round.answer && !round.answer.correct && round.target && (
            <>
              {/* Shown at the one moment attention is guaranteed: you were
                  wrong, and here is what the place actually looks like. */}
              <Photo
                topic={topic.id}
                code={round.target.code}
                name={round.target.name}
                photos={data.photos}
              />
              <button className="btn btn--sm" onClick={round.next} autoFocus>
                Dalje →
              </button>
            </>
          )}
        </div>
      </aside>

      <QuizMap
        regions={data.regions}
        states={round.states}
        labelled={round.labelled}
        playable={inPlay}
        spotlight={easy}
        showCode={topic.showCode}
        describe={describe}
        kind={topic.kind}
        marker={topic.marker}
        base={data.base}
        relief={data.relief as never}
        disabled={round.answer !== null}
        onPick={round.pick}
      />
    </>
  )
}
