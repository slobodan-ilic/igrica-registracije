import { EuStars, Plate, Serial } from './Plate'

const AZURE = '#1b4a9c'
const GOLD = '#f0c419'
const RED = '#d7141a'
const EDGE = '#8a5a12'

/**
 * The crown of five: the oldest Croatian arms, Dubrovnik, Dalmatia, Istria and
 * Slavonia, left to right along the top of the shield.
 *
 * Each is drawn in its own 20x26 box and they are set side by side with a hair
 * of white between them, because the thing that makes the crown readable at
 * plate size is the five separate shields — not the charges inside them, which
 * are two or three pixels across on a real plate too. So each keeps its field
 * colour and the one mark that identifies it, drawn as boldly as it will go.
 */
const CREST = 'M1 1h18v14.5c0 5.4-5.4 8.6-9 10.2C6.4 24.1 1 20.9 1 15.5V1z'

function Crest({ which }: { which: number }) {
  const charge = [
    // The oldest arms: a gold star above a silver crescent.
    <g key="a">
      <path d="M10 3.4l1.5 3.4 3.7.4-2.8 2.5.8 3.6L10 11.4 6.8 13.3l.8-3.6L4.8 7.2l3.7-.4z" fill={GOLD} />
      <path d="M5.6 15.6a4.5 4.5 0 0 0 8.8 0 5.6 5.6 0 0 1-8.8 0z" fill="#fff" />
    </g>,
    // Dubrovnik: two red bars on azure.
    <g key="b">
      <rect x="1" y="6.4" width="18" height="3.6" fill={RED} />
      <rect x="1" y="13.4" width="18" height="3.6" fill={RED} />
    </g>,
    // Dalmatia: three crowned leopard heads, two over one.
    <g key="c" fill={GOLD}>
      <circle cx="6.4" cy="8" r="3" />
      <circle cx="13.6" cy="8" r="3" />
      <circle cx="10" cy="16" r="3" />
    </g>,
    // Istria: a gold goat, rampant.
    <g key="d">
      <path
        d="M5 14.5c0-3 2.3-5.2 5.4-5.2 2.9 0 5 1.8 5 4.4 0 3-2.3 5.2-5.4 5.2-2.9 0-5-1.8-5-4.4z"
        fill={GOLD}
      />
      <path d="M5.6 9.6 3.2 6.2M14.4 9.6l2.4-3.4" stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" />
    </g>,
    // Slavonia: azure above, a silver band, red below, with a star on the blue.
    <g key="e">
      <rect x="1" y="15" width="18" height="11" fill={RED} />
      <rect x="1" y="9.4" width="18" height="5.6" fill="#fff" />
      <path d="M10 2l1.3 3 3.2.3-2.4 2.1.7 3.1L10 8.9 7.2 10.5l.7-3.1L5.5 5.3l3.2-.3z" fill={GOLD} />
    </g>,
  ][which]

  return (
    <g>
      <path d={CREST} fill={AZURE} />
      <g clipPath={`url(#hr-crest-${which})`}>{charge}</g>
      <path d={CREST} fill="none" stroke={EDGE} strokeWidth="1.1" />
    </g>
  )
}

/**
 * The full arms: the šahovnica — twenty-five fields chequy red and white, the
 * first one red — under that crown.
 *
 * The chequy is laid out over the shield's bounding box and clipped to it, so
 * the fields run to every edge and the point at the bottom cuts through them
 * the way it does on the real one.
 */
const SHIELD = 'M6 24h84v50.4c0 21.6-18.6 33.6-42 43.6C24.6 108 6 96 6 74.4V24z'

function CoatOfArms() {
  const cell = 84 / 5
  const fields = []
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      if ((row + col) % 2 !== 0) continue
      fields.push(
        <rect
          key={`${row}-${col}`}
          x={6 + col * cell}
          y={24 + row * cell}
          width={cell}
          height={cell}
          fill={RED}
        />,
      )
    }
  }

  // Five across the top, the outer ones dropped and tilted outward so the row
  // sits in a shallow arc rather than a straight line.
  const crown = [
    { x: -2, y: 6, r: -20 },
    { x: 17, y: 1.5, r: -10 },
    { x: 38, y: 0, r: 0 },
    { x: 59, y: 1.5, r: 10 },
    { x: 78, y: 6, r: 20 },
  ]

  return (
    // Wider than the shield: the crown reaches past it on both sides.
    <svg className="plate__shield" viewBox="-4 0 104 120" aria-hidden="true">
      <defs>
        <path id="hr-shield" d={SHIELD} />
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
        <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.r} 10 13)`}>
          <Crest which={i} />
        </g>
      ))}

      <use href="#hr-shield" fill="#fff" />
      <g clipPath="url(#hr-clip)">{fields}</g>
      <use href="#hr-shield" fill="none" stroke="#9b0f22" strokeWidth="2.4" />
    </svg>
  )
}

/** A Croatian plate: the EU band, and the šahovnica under its crown. */
export function PlateHR({ code }: { code: string }) {
  return (
    <Plate
      country="hr"
      bandStyle="eu"
      code={code}
      band={
        <>
          <EuStars />
          <span className="plate__mark">HR</span>
        </>
      }
      emblem={<CoatOfArms />}
      serial={<Serial parts={['0000', 'AA']} separator="-" />}
    />
  )
}
