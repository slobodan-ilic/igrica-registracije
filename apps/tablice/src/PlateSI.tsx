import './Plate.css'

/** A five-pointed star in a 10x10 box, point up — the EU's, drawn once. */
const STAR =
  'M5 0.6 6.35 4.35 10.2 4.35 7.1 6.72 8.27 10.5 5 8.2 1.73 10.5 2.9 6.72 -0.2 4.35 3.65 4.35Z'

function EuStars() {
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

/**
 * A Slovenian plate: the EU band with SLO, the region code, the coat of arms,
 * and the serial left faint.
 *
 * The arms are the distinctive part. A real plate carries the arms of the
 * *municipality* the car is registered in, not of the region — so a GO plate
 * from Idrija shows Idrija's arms rather than Nova Gorica's. There is one plate
 * per code here, so each shows the arms of the town its code is named after,
 * which is what a plate registered in that town looks like.
 *
 * The green frame is Slovenia's too, and is what makes one recognisable across
 * a car park.
 */
export function PlateSI({ code }: { code: string }) {
  return (
    <div className="plate plate--si" role="img" aria-label={`Registrska tablica ${code}`}>
      <div className="plate__band plate__band--eu">
        <EuStars />
        <span className="plate__srb">SLO</span>
      </div>

      <div className="plate__body">
        <span className="plate__code" key={code}>{code}</span>
        <span className="plate__stamp">
          <img className="plate__grb" src={`/img/grbovi/${code}.webp`} alt="" loading="lazy" />
        </span>
        <span className="plate__digits">
          <span className="plate__dots">AA</span>
          <span className="plate__dash">-</span>
          <span className="plate__dots">000</span>
        </span>
      </div>
    </div>
  )
}
