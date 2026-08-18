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
  // Half the bird, drawn once and mirrored about the middle. What has to
  // survive at twenty-odd pixels is the silhouette — two heads above two
  // wings, over a fanned tail — so the wings are broad sweeps with stepped
  // feather edges rather than the spread of separate quills on the real arms.
  const half = (
    <>
      {/* Neck, rising from the body to a head that looks outward. */}
      <path d="M20 17.6c0-3.4 1.6-6.4 4.3-8.4l2.2 3.1c-1.9 1.5-3 3.4-3.2 5.7z" />
      <circle cx="26.7" cy="8.4" r="3" />
      <path d="M29.2 6.7 33.6 8.1 29.4 10z" />
      {/* Wing: up and out, then stepped back down in three ranks of feathers. */}
      <path
        d="M20.6 14.6c3.4-3 8-4.2 12.8-3.2-.8 1.8-2 3.2-3.6 4.2 1.8.8 3.2 2 4.2 3.6
           -1.8.6-3.6.8-5.4.6 1.2 1.4 2 3 2.4 4.8-3-2-6.6-3.4-10.4-4z"
      />
      {/* Foot. */}
      <path d="M20.4 25.4c1.5.1 2.9.6 4.1 1.4l-1.9.7 1.5 1.2-3.7-.4z" />
    </>
  )

  return (
    <svg className="plate__roundel" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19.4" fill={GOLD} />
      <circle cx="20" cy="20" r="16.6" fill={FIELD} />

      <g fill={GOLD}>
        {/* The crown, where the two necks part. */}
        <path d="M16.4 5.6h7.2v1.8h-7.2z" />
        <path d="M16.6 5.3 17.1 2.6l2.9 1.8 2.9-1.8.5 2.7z" />
        {/* Body, and the tail fanned below it. */}
        <path d="M18.2 13.8h3.6l-.5 10h-2.6z" />
        <path d="M17.1 23.8h5.8l-.9 4.2 1.1 1.2-1.9.6-1.2 3.4-1.2-3.4-1.9-.6 1.1-1.2z" />
        {half}
        <g transform="translate(40 0) scale(-1 1)">{half}</g>
      </g>

      <circle cx="20" cy="20" r="18" fill="none" stroke={GOLD_DARK} strokeWidth="0.8" />
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
      serial={<Serial parts={['AB', '375']} />}
    />
  )
}
