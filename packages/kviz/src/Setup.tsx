import { useMemo, useState } from 'react'
import { BackLink, OtherApp, type Elsewhere } from './Chrome'
import { hasChooser, href, linkProps } from './router'
import { randomSeed } from './deck'
import { budget, CHOICES } from './useRound'
import { plural } from './sr'
import type { Topic } from './topic'
import type { RegionProps } from './types'

/**
 * One topic's own page.
 *
 * There is one button on it. Everything that can be chosen is remembered from
 * last time and summed up in a line under that button, which opens the choices
 * if anyone wants them — so the page reads as "play this" rather than as a
 * form to fill in first. Someone arriving cold should be answering a question
 * within a second of landing, and someone who has set the game up their way
 * should find it that way without saying so again.
 */

export type Length = '10' | '25' | 'sve'

type Props = {
  topic: Topic
  /** The app's other topics, when there is no chooser page to reach them from. */
  siblings: Topic[]
  /** Heading for that switcher — "Druge zemlje", say. Omit to hide it. */
  siblingsLabel?: string
  hero: RegionProps
  codes: string[]
  length: Length
  onLength: (n: Length) => void
  mode: 'easy' | 'classic'
  onMode: (m: 'easy' | 'classic') => void
  withKim: boolean
  onKim: (on: boolean) => void
  kimCount: number
  timed: boolean
  onTimed: (on: boolean) => void
  choices: number
  /** The sibling app, named once at the foot of the page. */
  elsewhere?: Elsewhere
}

/** A row of two or three choices, the shape every setting here takes. */
function Pick<T extends string>({
  label,
  value,
  onChange,
  of,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  of: [T, string][]
}) {
  return (
    <div className="choice">
      <span className="choice__label">{label}</span>
      <div className="choice__row" role="group" aria-label={label}>
        {of.map(([v, text]) => (
          <button
            key={v}
            type="button"
            className={`choice__pick${value === v ? ' choice__pick--on' : ''}`}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Setup({
  topic, siblings, siblingsLabel, hero, codes,
  length, onLength, mode, onMode, withKim, onKim, kimCount, timed, onTimed, choices, elsewhere,
}: Props) {
  const [open, setOpen] = useState(false)

  const asked = length === 'sve' ? codes.length : Math.min(Number(length), codes.length)
  const seconds = budget(mode === 'easy' ? CHOICES : codes.length)

  // One seed per visit, so reloading deals a new round and the button below
  // does not quietly hand out the same one twice.
  const seed = useMemo(() => randomSeed(), [])
  const round = { length: asked, seed, easy: mode === 'easy', kim: withKim, timed }

  /** What the button is about to start, in one line. */
  const summary = [
    `${asked} ${plural(asked, 'pitanje', 'pitanja', 'pitanja')}`,
    mode === 'easy' ? `${choices} ponuđena` : 'cela mapa',
    timed ? `${seconds}s po pitanju` : null,
    withKim ? 'sa Kosovom' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="intro intro--menu">
      {/* With one quiz this page is the front page, so there is nowhere back. */}
      {hasChooser() && <BackLink to={href.home()} label="Sve igre" />}

      <div className="menu">
        <div className="menu__say">
          <p className="intro__eyebrow">{topic.blurb}</p>
          <h1 className="intro__title">{topic.title}</h1>
          <p className="intro__lead">{topic.lead(codes.length)}</p>

          <a className="btn btn--go" {...linkProps(href.game(topic.id, round))}>
            Igraj
          </a>

          <button
            type="button"
            className="tweak"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <span className="tweak__summary">{summary}</span>
            <span className="tweak__more">{open ? 'Sakrij' : 'Podesi'}</span>
          </button>

          {open && (
            <div className="tweaks">
              <Pick
                label="Koliko pitanja"
                value={length}
                onChange={onLength}
                of={[['10', '10'], ['25', '25'], ['sve', `Sve · ${codes.length}`]]}
              />
              <Pick
                label="Težina"
                value={mode}
                onChange={onMode}
                of={[['classic', 'Cela mapa'], ['easy', `${choices} ponuđena`]]}
              />
              <Pick
                label="Sat"
                value={timed ? 'on' : 'off'}
                onChange={(v) => onTimed(v === 'on')}
                of={[['off', 'Bez sata'], ['on', `${seconds}s po pitanju`]]}
              />
              {topic.offersKim && (
                <Pick
                  label="Kosovo i Metohija"
                  value={withKim ? 'on' : 'off'}
                  onChange={(v) => onKim(v === 'on')}
                  of={[['off', 'Bez'], ['on', `Sa · ${kimCount}`]]}
                />
              )}
              {topic.offersKim && withKim && <p className="tweaks__note">{topic.kimNote?.(kimCount)}</p>}
            </div>
          )}

          <p className="intro__aside">
            <a {...linkProps(href.progress())}>Pratite svoj napredak →</a>
          </p>
        </div>

        <div className="menu__show">
          <div className="intro__hero">{topic.prompt(hero)}</div>
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

      {elsewhere && <OtherApp to={elsewhere} />}
    </div>
  )
}
