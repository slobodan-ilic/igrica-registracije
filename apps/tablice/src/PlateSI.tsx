import { EuStars, Plate, Serial } from './Plate'

/**
 * A Slovenian plate. The arms are the distinctive part: a real one carries the
 * arms of the *municipality*, not the region — a GO plate from Idrija shows
 * Idrija's. There is one plate per code here, so each shows the arms of the
 * town its code is named after, which is what a plate registered in that town
 * looks like. They come from Commons; see scripts/build-grbovi-si.mjs.
 *
 * The green frame is Slovenia's, and is what makes one recognisable at a
 * distance.
 */
export function PlateSI({ code }: { code: string }) {
  return (
    <Plate
      country="si"
      bandStyle="eu"
      code={code}
      band={
        <>
          <EuStars />
          <span className="plate__mark">SLO</span>
        </>
      }
      emblem={<img className="plate__grb" src={`/img/grbovi/${code}.webp`} alt="" loading="lazy" />}
      serial={<Serial parts={['AA', '000']} separator="-" />}
    />
  )
}
