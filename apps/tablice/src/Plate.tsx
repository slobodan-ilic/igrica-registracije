import { Fragment, type ReactNode } from 'react'
import './Plate.css'

/**
 * The shell every plate is built from. A plate is the same three things
 * everywhere — a country band, the registration code, and the serial that
 * follows — with an emblem of some kind between the last two. Only those
 * pieces differ by country, so only those are passed in.
 */
export function Plate({
  country, band, bandStyle, code, emblem, serial,
}: {
  /** Modifier for the country's own styling, e.g. "hr". Serbia needs none. */
  country?: string
  /** The country strip. Yugoslavia had none, so it is optional. */
  band?: ReactNode
  /** Modifier for the band — the EU members share one, so it is separate. */
  bandStyle?: string
  code: string
  emblem?: ReactNode
  serial: ReactNode
}) {
  return (
    <div
      className={`plate${country ? ` plate--${country}` : ''}`}
      role="img"
      aria-label={`Registarska oznaka ${code}`}
    >
      {band && (
        <div className={`plate__band${bandStyle ? ` plate__band--${bandStyle}` : ''}`}>{band}</div>
      )}

      <div className="plate__body">
        {/* Keyed on the code so it replays its entrance on each new question. */}
        <span className="plate__code" key={code}>{code}</span>
        {emblem && <span className="plate__stamp">{emblem}</span>}
        <span className="plate__digits">{serial}</span>
      </div>
    </div>
  )
}

/**
 * The specimen number, in the shape that country writes it: "000-AA" for most,
 * "AA 000" for Montenegro. Deliberately faint — it is not what is being asked.
 *
 * The parts are emitted flat, without wrappers, because `.plate__digits` is a
 * flex row and its gap applies to whatever its direct children are.
 */
export function Serial({ parts, separator }: { parts: string[]; separator?: string }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && separator && <span className="plate__dash">{separator}</span>}
          <span className="plate__dots">{part}</span>
        </Fragment>
      ))}
    </>
  )
}

/** A five-pointed star in a 10x10 box, point up. */
const STAR =
  'M5 0.6 6.35 4.35 10.2 4.35 7.1 6.72 8.27 10.5 5 8.2 1.73 10.5 2.9 6.72 -0.2 4.35 3.65 4.35Z'

/** The twelve stars of the European flag, for the members' bands. */
export function EuStars() {
  return (
    <svg className="plate__stars" viewBox="0 0 100 100" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6
        return (
          <g
            key={i}
            transform={`translate(${50 + 33 * Math.sin(angle) - 8.5} ${50 - 33 * Math.cos(angle) - 8.5}) scale(1.7)`}
          >
            <path d={STAR} fill="#ffcc00" />
          </g>
        )
      })}
    </svg>
  )
}
