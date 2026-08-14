import { useCallback, useMemo } from 'react'
import { QuizMap } from '../components/QuizMap'
import { BackLink, Stat, Streak, ThemeToggle } from '../components/Chrome'
import { href, linkProps } from '../lib/router'
import { joinSr } from '../lib/game'
import { CHOICES, useRound } from '../lib/useRound'
import type { Theme } from '../lib/prefs'
import type { Topic, TopicData } from '../topics'
import type { RegionProps } from '../types'

type Props = {
  topic: Topic
  data: TopicData
  codes: string[]
  byCode: Map<string, RegionProps>
  centroids: Map<string, [number, number]>
  playable: Set<string>
  length: number
  easy: boolean
  touch: boolean
  theme: Theme
  onTheme: (t: Theme) => void
  /** Replaying lands on the same URL, so the round is restarted by remounting. */
  onReplay: () => void
}

export function Game(props: Props) {
  const { topic, data, codes, byCode, centroids, playable, length, easy, touch, theme, onTheme } =
    props
  const round = useRound({ codes, byCode, centroids, length, easy })

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
        <p className="intro__lead">Najduži niz: {round.best}</p>

        {round.missed.length > 0 && (
          <div className="recap">
            <h2 className="recap__title">Za ponavljanje</h2>
            <ul className="recap__list">
              {round.missed.map((m) => (
                <li key={m.code}>
                  {topic.showCode && <span className="recap__code">{m.code}</span>}
                  <span>{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="intro__actions">
          <button className="btn" onClick={props.onReplay}>
            Igraj ponovo
          </button>
          <a className="btn" {...linkProps(href.setup(topic.id))}>
            Promeni podešavanja
          </a>
          <a className="btn" {...linkProps(href.home())}>
            Sve igre
          </a>
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
          <div className="verdict" aria-live="polite">
            {!round.answer && <span className="verdict__ask">{ask}</span>}
            {round.answer?.correct && (
              <span className="verdict__ok">Tačno — {round.target?.name}</span>
            )}
            {round.answer && !round.answer.correct && (
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
          {round.answer && !round.answer.correct && (
            <button className="btn btn--sm" onClick={round.next} autoFocus>
              Dalje →
            </button>
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
