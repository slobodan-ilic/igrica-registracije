import { Plate, Serial } from './Plate'

const GOLD = '#e3b23c'
const GOLD_DARK = '#b8860b'
const FIELD = '#c40308'

/**
 * Montenegro's arms as they appear on the plate: a gold-rimmed red roundel with
 * the crowned double-headed eagle. It is stamped about 5 mm across in reality
 * and renders here at roughly twenty pixels, so the eagle is a silhouette —
 * two heads, spread wings, a fanned tail — rather than the full achievement.
 */
function Emblem() {
  return (
    <svg className="plate__roundel" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19.2" fill={GOLD} />
      <circle cx="20" cy="20" r="16.4" fill={FIELD} />

      <g fill={GOLD}>
        {/* Crown over the middle, where the two necks part. */}
        <path d="M16.6 8.9h6.8v1.9h-6.8z" />
        <path d="M16.8 8.6l.6-2.5 2.6 1.7 2.6-1.7.6 2.5z" />

        {/* The body: a narrow trunk down the middle with a fanned tail. */}
        <path d="M18.4 15h3.2l-.5 9.4h-2.2z" />
        <path d="M17.6 24.2h4.8l-2.4 8.4z" />

        {/* One half of the bird, mirrored about the centre: a head turned
            outward, and a wing spread up and out in three layers of feathers. */}
        {[1, -1].map((side) => (
          <g key={side} transform={side === 1 ? undefined : 'translate(40 0) scale(-1 1)'}>
            <path d="M20.4 16.4l2.6-4.2 2.4 1.5-3.4 5z" />
            <circle cx="24.9" cy="11.4" r="2.4" />
            <path d="M26.7 10.1l3.5 1.1-3.3 1.8z" />
            <path d="M21 15.9c3.2-1.5 7-2 10.6-.6-1.9 1-4 1.6-6 1.7 2.4.9 4.4 2.2 5.8 3.9-2.3-.5-4.6-.5-6.7.1 1.8 1.1 3.2 2.6 4 4.3-2.4-1.6-5-2.6-7.7-2.9z" />
            <path d="M21 25.1c1.3.2 2.5.7 3.5 1.5l-1.7.6 1.4 1.2-3.2-.4z" />
          </g>
        ))}
      </g>

      <circle cx="20" cy="20" r="17.8" fill="none" stroke={GOLD_DARK} strokeWidth="0.7" />
    </svg>
  )
}

/**
 * A Montenegrin plate: the union's blue band, but with the stars' place left
 * empty — Montenegro is a candidate, not a member — then the state arms. The
 * serial runs two letters then three digits, unlike its neighbours.
 */
export function PlateME({ code }: { code: string }) {
  return (
    <Plate
      country="me"
      bandStyle="me"
      code={code}
      band={<span className="plate__mark">MNE</span>}
      emblem={<Emblem />}
      serial={<Serial parts={['AA', '000']} />}
    />
  )
}
