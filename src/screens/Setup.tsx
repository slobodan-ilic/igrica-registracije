import { BackLink } from '../components/Chrome'
import { href, linkProps } from '../lib/router'
import { plural } from '../lib/sr'
import type { Topic } from '../topics'
import type { RegionProps } from '../types'

type Props = {
  topic: Topic
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
  topic, hero, codes, mode, onMode, withKim, onKim, kimCount, choices,
}: Props) {
  const rounds = [10, 25, codes.length].filter(
    (n, i, a) => a.indexOf(n) === i && n <= codes.length,
  )

  return (
    <div className="intro">
      <BackLink to={href.home()} label="Sve igre" />

      <div className="intro__hero">{topic.prompt(hero)}</div>
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

      <div className="intro__actions">
        {rounds.map((n) => (
          <a key={n} className="btn" {...linkProps(href.game(topic.id, n))}>
            {n === codes.length
              ? `${topic.allLabel} · ${n}`
              : `${n} ${plural(n, 'pitanje', 'pitanja', 'pitanja')}`}
          </a>
        ))}
      </div>
    </div>
  )
}
