import { BackLink } from './Chrome'
import { href, linkProps } from './router'
import { attempt, number, round, today, topicFor, LENGTH } from './challenge'
import { plural } from './sr'
import type { Topic } from './topic'

/**
 * Today's challenge. One round, the same for everyone, and once you have played
 * it you see what you got rather than another go at it — which is the whole
 * difference between a challenge and a practice round.
 */
export function Daily({ topics }: { topics: Record<string, Topic> }) {
  const day = today()
  const ids = Object.keys(topics)
  const topic = topics[topicFor(ids, day)]
  const n = Math.min(LENGTH, topic.count)
  const played = attempt(topic.id, day)

  const date = new Intl.DateTimeFormat('sr-Latn-RS', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${day}T12:00:00`))

  return (
    <div className="intro intro--menu daily">
      <BackLink to={href.setup(topic.id)} label={topic.label} />

      <div className="menu">
        <div className="menu__say">
          <p className="intro__eyebrow">Dnevni izazov · {date}</p>
          <h1 className="intro__title">#{number(day)}</h1>
          <p className="intro__lead">
            Danas su na redu tablice — <b>{topic.label}</b>. {n}{' '}
            {plural(n, 'pitanje', 'pitanja', 'pitanja')}, cela mapa, bez sata. Svi dobijaju
            ista pitanja, istim redom.
          </p>

          {played ? (
            <div className="daily__score">
              <b className="daily__points">
                {played.score} / {played.answers.length}
              </b>
              <span className="daily__said">
                Odigrali ste današnji izazov. Sutra je novi.
              </span>
            </div>
          ) : (
            <a className="btn btn--go" {...linkProps(href.game(topic.id, round(day, n)))}>
              Igraj
            </a>
          )}

          <p className="intro__aside">
            <a {...linkProps(href.progress())}>Pratite svoj napredak →</a>
          </p>
        </div>

        <div className="menu__show">
          <div className="intro__hero">{topic.prompt(topic.sample)}</div>
        </div>
      </div>
    </div>
  )
}
