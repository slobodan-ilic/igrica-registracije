import { Plate, Serial } from './Plate'
import { transliterator } from './cyrillic'

/** Serbian Cyrillic, for the code repeated small under the shield. */
const toCyrillic = transliterator({
  A: 'А', B: 'Б', V: 'В', G: 'Г', D: 'Д', Đ: 'Ђ', E: 'Е', Ž: 'Ж', Z: 'З', I: 'И',
  J: 'Ј', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', R: 'Р', S: 'С', T: 'Т',
  Ć: 'Ћ', U: 'У', F: 'Ф', H: 'Х', C: 'Ц', Č: 'Ч', Š: 'Ш',
})

/** The tricolour on the band: red, blue and white, with the arms left off. */
function Flag() {
  return (
    <svg className="plate__flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.7" fill="#c6363c" />
      <rect y="6.7" width="30" height="6.6" fill="#0c4076" />
      <rect width="30" height="20" fill="none" stroke="#fff" strokeWidth="1.6" />
    </svg>
  )
}

/**
 * A Serbian plate: the tricolour band, the small arms of Serbia, and the code
 * repeated small in Cyrillic beneath them.
 *
 * The arms are the real ones from Commons; see scripts/build-grbovi.mjs. What
 * was drawn here before was the cross and four firesteels alone, which is the
 * shield on the eagle's breast rather than the arms a plate carries.
 */
export function PlateRS({ code }: { code: string }) {
  return (
    <Plate
      bandStyle="rs"
      code={code}
      band={
        <>
          <Flag />
          <span className="plate__mark">SRB</span>
        </>
      }
      emblem={
        <>
          <img className="plate__grb" src="/img/grbovi/rs.webp" alt="" loading="lazy" />
          <span className="plate__cyr">{toCyrillic(code)}</span>
        </>
      }
      serial={<Serial parts={['000', 'AA']} separator="-" />}
    />
  )
}
