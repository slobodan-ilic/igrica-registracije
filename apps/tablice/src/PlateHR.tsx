import { EuStars, Plate, Serial } from './Plate'

/**
 * A Croatian plate: the EU band, then the šahovnica under its crown of five —
 * the oldest Croatian arms, Dubrovnik, Dalmatia, Istria and Slavonia.
 *
 * The arms are the real ones from Commons rather than drawn here; see
 * scripts/build-grbovi.mjs. Hand-drawn heraldry does not survive being shrunk
 * to twenty pixels, and the crown of five is exactly the part that goes first.
 */
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
      emblem={<img className="plate__grb" src="/img/grbovi/hr.webp" alt="" loading="lazy" />}
      serial={<Serial parts={['0000', 'AA']} separator="-" />}
    />
  )
}
