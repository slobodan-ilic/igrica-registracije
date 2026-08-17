import './Plate.css'

/** A five-pointed star in a 10x10 box, point up — the EU's, drawn once. */
const STAR =
  'M5 0.6 6.35 4.35 10.2 4.35 7.1 6.72 8.27 10.5 5 8.2 1.73 10.5 2.9 6.72 -0.2 4.35 3.65 4.35Z'

/** The twelve stars of the European flag, in a circle on the blue band. */
function EuStars() {
  return (
    <svg className="plate__stars" viewBox="0 0 100 100" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6
        const x = 50 + 33 * Math.sin(angle)
        const y = 50 - 33 * Math.cos(angle)
        return (
          <g key={i} transform={`translate(${x - 8.5} ${y - 8.5}) scale(1.7)`}>
            <path d={STAR} fill="#ffcc00" />
          </g>
        )
      })}
    </svg>
  )
}

/**
 * The šahovnica: twenty-five fields chequy red and white, the first one red.
 * Drawn oversized and clipped to the shield, so the fields run to every edge
 * and the bottom point cuts through them the way it does on the real one.
 */
function Sahovnica() {
  const cell = 7.6
  const fields = []
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      if ((row + col) % 2 !== 0) continue
      fields.push(
        <rect
          key={`${row}-${col}`}
          x={2 + col * cell}
          y={2 + row * cell}
          width={cell}
          height={cell}
          fill="#d7141a"
        />,
      )
    }
  }
  return (
    <svg className="plate__shield" viewBox="0 0 40 52" aria-hidden="true">
      <defs>
        <path id="hr-shield" d="M2 2h36v27.6c0 12.4-11.2 18.6-18 20.4C13.2 48.2 2 42 2 29.6V2z" />
        <clipPath id="hr-clip">
          <use href="#hr-shield" />
        </clipPath>
      </defs>
      <use href="#hr-shield" fill="#fff" />
      <g clipPath="url(#hr-clip)">{fields}</g>
      <use href="#hr-shield" fill="none" stroke="#8c0c20" strokeWidth="1.4" />
    </svg>
  )
}

/**
 * A Croatian plate: the EU band, the town code, the šahovnica as separator, and
 * the number itself left faint because it is not what is being asked.
 */
export function PlateHR({ code }: { code: string }) {
  return (
    <div className="plate plate--hr" role="img" aria-label={`Registracijska oznaka ${code}`}>
      <div className="plate__band plate__band--eu">
        <EuStars />
        <span className="plate__srb">HR</span>
      </div>

      <div className="plate__body">
        <span className="plate__code" key={code}>{code}</span>
        <span className="plate__stamp">
          <Sahovnica />
        </span>
        <span className="plate__digits">
          <span className="plate__dots">000</span>
          <span className="plate__dash">-</span>
          <span className="plate__dots">AA</span>
        </span>
      </div>
    </div>
  )
}
