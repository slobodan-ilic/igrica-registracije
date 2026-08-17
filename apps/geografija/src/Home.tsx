import { href, linkProps } from '@kviz/engine'
import { TOPICS, UPCOMING } from './topics'

/**
 * The chooser. A scroll-snapping row of game cards, with the topics still to
 * come sketched in so the direction of the app is visible rather than implied.
 */
export function Home() {
  return (
    <div className="home">
      <header className="home__head">
        <p className="home__eyebrow">Geografija Srbije, kroz igru</p>
        <h1 className="home__title">
          Šta danas <span className="home__accent">vežbamo</span>?
        </h1>
      </header>

      <div className="deck" role="list">
        {Object.entries(TOPICS).map(([id, topic]) => {
          return (
            <a
              key={id}
              role="listitem"
              className="gamecard"
              {...linkProps(href.setup(id))}
            >
              <span className="gamecard__preview">{topic.prompt(topic.sample)}</span>
              <span className="gamecard__body">
                <b className="gamecard__title">{topic.label}</b>
                <span className="gamecard__text">{topic.card}</span>
                <span className="gamecard__meta">{topic.count} pitanja</span>
              </span>
              <span className="gamecard__cta">Igraj →</span>
            </a>
          )
        })}

        {UPCOMING.map((t) => (
          <div key={t.label} role="listitem" className="gamecard gamecard--soon">
            <span className="gamecard__preview gamecard__preview--empty" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path d="M8 34c6-4 8-16 14-16s8 12 14 12 4-8 4-8" />
              </svg>
            </span>
            <span className="gamecard__body">
              <b className="gamecard__title">{t.label}</b>
              <span className="gamecard__text">{t.blurb}</span>
            </span>
            <span className="gamecard__cta gamecard__cta--soon">Uskoro</span>
          </div>
        ))}
      </div>
    </div>
  )
}
