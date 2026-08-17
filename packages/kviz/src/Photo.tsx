import type { Credit, Photos, RegionProps, Result } from './types'
import './Photo.css'

/** Where build-slike.mjs puts its output. */
const photoSrc = (topic: string, code: string, size: 'card' | 'tile') =>
  size === 'card' ? `/img/${topic}/${code}.webp` : `/img/${topic}/t/${code}.webp`

/**
 * Commons requires the photographer and licence to be named. The author field
 * arrives as free text and is sometimes a paragraph, so it is clipped by CSS
 * rather than truncated here — the full text stays in the title attribute.
 */
function Byline({ credit }: { credit: Credit }) {
  return (
    <a className="photo__credit" href={credit.u} target="_blank" rel="noreferrer noopener"
       title={`${credit.a} · ${credit.l}`}>
      <span className="photo__author">{credit.a}</span>
      <span className="photo__licence">{credit.l}</span>
    </a>
  )
}

/**
 * Everywhere the round went, as one grid — the screen worth screenshotting.
 * The outcome is carried by the border rather than a tint, so it reads in
 * greyscale and does not fight the photograph underneath.
 */
export function ContactSheet({
  topic, items, results, photos,
}: {
  topic: string
  items: RegionProps[]
  results: Record<string, Result>
  photos?: Photos
}) {
  if (!items.length) return null
  const missedAny = items.some((i) => results[i.code] === 'missed')
  // Topics with no photographs at all (okruzi) would be a grid of empty boxes,
  // so they get a plain list of names instead.
  const anyPhoto = items.some((i) => photos?.[i.code])

  if (!anyPhoto) {
    return (
      <section className="sheet">
        <h2 className="sheet__title">Gde ste bili</h2>
        <ul className="sheet__list">
          {items.map((item) => (
            <li
              key={item.code}
              className={results[item.code] === 'missed' ? 'sheet__miss' : undefined}
            >
              {item.name}
            </li>
          ))}
        </ul>
        <ul className="sheet__key">
          <li><i className="sheet__swatch" />Tačno</li>
          {missedAny && <li><i className="sheet__swatch sheet__swatch--missed" />Promašeno</li>}
        </ul>
      </section>
    )
  }

  return (
    <section className="sheet">
      <h2 className="sheet__title">Gde ste bili</h2>
      <ul className="sheet__grid">
        {items.map((item) => {
          const missed = results[item.code] === 'missed'
          const has = Boolean(photos?.[item.code])
          return (
            <li
              key={item.code}
              className={`sheet__item${missed ? ' sheet__item--missed' : ''}${has ? '' : ' sheet__item--bare'}`}
            >
              {has && (
                <img src={photoSrc(topic, item.code, 'tile')} alt="" loading="lazy" />
              )}
              <span className="sheet__name">{item.name}</span>
            </li>
          )
        })}
      </ul>
      <ul className="sheet__key">
        <li><i className="sheet__swatch" />Tačno</li>
        {missedAny && <li><i className="sheet__swatch sheet__swatch--missed" />Promašeno</li>}
      </ul>
      {/* The tiles are too small for a byline each, but the licences still
          require one, so they are collected here. */}
      <details className="sheet__credits">
        <summary>Fotografije</summary>
        <ul>
          {items.map((item) => {
            const credit = photos?.[item.code]
            return credit ? (
              <li key={item.code}>
                {item.name}:{' '}
                <a href={credit.u} target="_blank" rel="noreferrer noopener">
                  {credit.a}
                </a>{' '}
                · {credit.l}
              </li>
            ) : null
          })}
        </ul>
      </details>
    </section>
  )
}

/**
 * The photograph shown once an answer is known. Not every place has one, so
 * every caller has to cope with this rendering nothing.
 */
export function Photo({
  topic, code, name, photos,
}: {
  topic: string
  code: string
  name: string
  photos?: Photos
}) {
  const credit = photos?.[code]
  if (!credit) return null
  return (
    <figure className="photo">
      <img className="photo__img" src={photoSrc(topic, code, 'card')} alt={name} loading="lazy" />
      <Byline credit={credit} />
    </figure>
  )
}
