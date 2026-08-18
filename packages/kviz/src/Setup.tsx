import { useMemo } from 'react'
import { BackLink } from './Chrome'
import { hasChooser, href, linkProps } from './router'
import { randomSeed } from './deck'
import { plural } from './sr'
import type { Topic } from './topic'
import type { RegionProps } from './types'

type Props = {
  topic: Topic
  /** The app's other topics, when there is no chooser page to reach them from. */
  siblings: Topic[]
  /** Heading for that switcher — "Druge zemlje", say. Omit to hide it. */
  siblingsLabel?: string
  hero: RegionProps
  codes: string[]
  mode: 'easy' | 'classic'
  onMode: (m: 'easy' | 'classic') => void
  withKim: boolean
  onKim: (on: boolean) => void
  kimCount: number
  choices: number
}

/** One topic's own page: how you want to play it, then start. */
export function Setup({
  topic, siblings, siblingsLabel, hero, codes, mode, onMode, withKim, onKim, kimCount, choices,
}: Props) {
  const rounds = [10, 25, codes.length].filter(
    (n, i, a) => a.indexOf(n) === i && n <= codes.length,
  )

  // One seed per visit to this page, so the three buttons offer one round in
  // three lengths rather than three unrelated ones — and reloading deals anew.
  const seed = useMemo(() => randomSeed(), [])

  return (
    <div className="intro intro--menu">
      {/* With one quiz this page is the front page, so there is nowhere back. */}
      {hasChooser() && <BackLink to={href.home()} label="Sve igre" />}

      {/* Two columns on a wide screen: what the quiz is and how to start it on
          the left, the plate on the right. The left column is word for word the
          same shape in every country — Serbia's Kosovo switch belongs to the
          plate rather than to the invitation, so it sits under it and nothing
          below it moves. On a narrow screen the whole thing folds back into one
          column, in the order it reads best: the question, then the plate. */}
      <div className="menu">
        <div className="menu__say">
          <p className="intro__eyebrow">{topic.blurb}</p>
          <h1 className="intro__title">{topic.title}</h1>
          <p className="intro__lead">{topic.lead(codes.length)}</p>

          <div className="modes" role="group" aria-label="Težina">
            <button
              type="button"
              className={`mode${mode === 'easy' ? ' mode--on' : ''}`}
              onClick={() => onMode('easy')}
            >
              <b>Lako</b>
              <em>{choices} ponuđena područja</em>
            </button>
            <button
              type="button"
              className={`mode${mode === 'classic' ? ' mode--on' : ''}`}
              onClick={() => onMode('classic')}
            >
              <b>Klasično</b>
              <em>cela mapa</em>
            </button>
          </div>

          <div className="intro__actions">
            {rounds.map((n) => (
              <a
                key={n}
                className="btn"
                {...linkProps(
                  href.game(topic.id, { length: n, seed, easy: mode === 'easy', kim: withKim }),
                )}
              >
                {n === codes.length
                  ? `${topic.allLabel} · ${n}`
                  : `${n} ${plural(n, 'pitanje', 'pitanja', 'pitanja')}`}
              </a>
            ))}
          </div>
        </div>

        <div className="menu__show">
          <div className="intro__hero">{topic.prompt(hero)}</div>

          {topic.offersKim && (
            <label className="switch">
              <input type="checkbox" checked={withKim} onChange={(e) => onKim(e.target.checked)} />
              <span className="switch__track" aria-hidden="true" />
              <span className="switch__text">
                Kosovo i Metohija
                <em>{topic.kimNote?.(kimCount)}</em>
              </span>
            </label>
          )}
        </div>
      </div>

      {/* With a topic at the root there is no chooser, so the other topics are
          reached from here. Each shows its own prompt, which for a plate quiz
          means you can see at a glance what the other country's plate looks
          like — the thing the quiz is actually about. */}
      {siblingsLabel && siblings.length > 0 && (
        <nav className="siblings" aria-label={siblingsLabel}>
          <h2 className="siblings__title">{siblingsLabel}</h2>
          <div className="siblings__row">
            {siblings.map((s) => (
              <a key={s.id} className="sibling" {...linkProps(href.setup(s.id))}>
                <span className="sibling__preview">{s.prompt(s.sample)}</span>
                <span className="sibling__label">{s.label}</span>
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
