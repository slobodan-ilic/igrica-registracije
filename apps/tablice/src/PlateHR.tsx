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

const AZURE = '#1c4fa1'
const GOLD = '#f2c200'
const RED = '#d7141a'

/** The outline every shield here uses, in a 10-wide box. */
const CREST = 'M0.6 0.6h8.8v6.1c0 3.3-2.9 4.9-4.4 5.5C3.5 11.6 0.6 10 0.6 6.7V0.6z'

/**
 * One of the five historic arms in the crown, drawn in its own 10x12 box:
 * the oldest Croatian arms, Dubrovnik, Dalmatia, Istria and Slavonia, left to
 * right. At the size a plate is actually read these are a few pixels across,
 * so each is its field colour plus the one charge that identifies it.
 */
function Crest({ which }: { which: number }) {
  const charge = [
    // Oldest arms: a gold six-pointed star over a silver crescent.
    <g key="a">
      <path d="M5 2.2 5.8 4 7.7 4 6.2 5.2 6.8 7 5 5.9 3.2 7 3.8 5.2 2.3 4 4.2 4Z" fill={GOLD} />
      <path d="M2.8 8.2a2.3 2.3 0 0 0 4.4 0 2.9 2.9 0 0 1-4.4 0Z" fill="#fff" />
    </g>,
    // Dubrovnik: two red bars.
    <g key="b">
      <rect x="0.6" y="3.4" width="8.8" height="1.9" fill={RED} />
      <rect x="0.6" y="6.6" width="8.8" height="1.9" fill={RED} />
    </g>,
    // Dalmatia: three crowned leopard heads, two over one.
    <g key="c" fill={GOLD}>
      <circle cx="3.2" cy="4" r="1.5" />
      <circle cx="6.8" cy="4" r="1.5" />
      <circle cx="5" cy="7.6" r="1.5" />
    </g>,
    // Istria: a gold goat.
    <g key="d" fill={GOLD}>
      <path d="M2.4 6.6c0-1.5 1.2-2.6 2.8-2.6s2.6 0.9 2.6 2.2c0 1.5-1.2 2.6-2.8 2.6S2.4 8 2.4 6.6Z" />
      <path d="M2.6 4.2 1.5 2.6M7.4 4.2 8.5 2.6" stroke={GOLD} strokeWidth="0.8" strokeLinecap="round" />
    </g>,
    // Slavonia: a silver band between blue and red, with a star above.
    <g key="e">
      <rect x="0.6" y="7.2" width="8.8" height="4.4" fill={RED} />
      <rect x="0.6" y="4.4" width="8.8" height="2.9" fill="#fff" />
      <path d="M5 1 5.7 2.6 7.4 2.6 6 3.6 6.5 5.2 5 4.2 3.5 5.2 4 3.6 2.6 2.6 4.3 2.6Z" fill={GOLD} />
    </g>,
  ][which]

  return (
    <g>
      <path d={CREST} fill={AZURE} />
      <g clipPath={`url(#hr-crest-${which})`}>{charge}</g>
      <path d={CREST} fill="none" stroke="#6b3b12" strokeWidth="0.7" />
    </g>
  )
}

/**
 * The full arms as stamped on the plate: the šahovnica, twenty-five fields
 * chequy red and white with the first one red, under the crown of five shields
 * for the oldest Croatian arms, Dubrovnik, Dalmatia, Istria and Slavonia.
 *
 * The chequy is drawn oversized and clipped, so the fields run to every edge
 * and the bottom point cuts through them the way it does on the real one.
 */
function CoatOfArms() {
  const cell = 7.6
  const fields = []
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      if ((row + col) % 2 !== 0) continue
      fields.push(
        <rect
          key={`${row}-${col}`}
          x={2 + col * cell}
          y={14 + row * cell}
          width={cell}
          height={cell}
          fill={RED}
        />,
      )
    }
  }

  // The five sit in a shallow arc, the outer ones dropped and tilted outward.
  const crown = [
    { x: -1.6, y: 4.6, r: -24 },
    { x: 6.9, y: 1.0, r: -12 },
    { x: 15.0, y: -0.3, r: 0 },
    { x: 23.1, y: 1.0, r: 12 },
    { x: 31.6, y: 4.6, r: 24 },
  ]

  return (
    // Wider than the shield itself: the crown reaches past it on both sides.
    <svg className="plate__shield" viewBox="-2.5 0 45 64" aria-hidden="true">
      <defs>
        <path id="hr-shield" d="M2 14h36v27.6c0 12.4-11.2 18.6-18 20.4C13.2 60.2 2 54 2 41.6V14z" />
        <clipPath id="hr-clip">
          <use href="#hr-shield" />
        </clipPath>
        {crown.map((_, i) => (
          <clipPath key={i} id={`hr-crest-${i}`}>
            <path d={CREST} />
          </clipPath>
        ))}
      </defs>

      {crown.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.r} 5 6)`}>
          <Crest which={i} />
        </g>
      ))}

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
          <CoatOfArms />
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
