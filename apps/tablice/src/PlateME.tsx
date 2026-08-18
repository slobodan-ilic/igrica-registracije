import { Plate, Serial } from './Plate'

/**
 * A Montenegrin plate: the union's blue band with the stars' place left empty —
 * Montenegro is a candidate, not a member — then the state arms, the crowned
 * double-headed eagle on its red roundel. The serial runs two letters then
 * three digits, unlike its neighbours.
 *
 * The arms come from Commons rather than being drawn here; see
 * scripts/build-grbovi.mjs.
 */
export function PlateME({ code }: { code: string }) {
  return (
    <Plate
      country="me"
      bandStyle="me"
      code={code}
      band={<span className="plate__mark">MNE</span>}
      emblem={<img className="plate__grb" src="/img/grbovi/me.webp" alt="" loading="lazy" />}
      serial={<Serial parts={['AB', '375']} />}
    />
  )
}
