import { Plate, Serial } from './Plate'
import { transliterator } from './cyrillic'

/** Macedonian Cyrillic — only the letters a registration code can contain. */
const toCyrillic = transliterator({
  A: 'А', B: 'Б', V: 'В', G: 'Г', D: 'Д', E: 'Е', Ž: 'Ж', Z: 'З', I: 'И',
  J: 'Ј', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', R: 'Р', S: 'С',
  T: 'Т', U: 'У', F: 'Ф', H: 'Х', C: 'Ц', Č: 'Ч', Š: 'Ш', Đ: 'Ѓ', Ć: 'Ќ',
})

/**
 * A North Macedonian plate: the blue band, then the small red block carrying
 * the code again in gold Cyrillic above the serial's letters — red and gold
 * being the national pairing. The country mark is NMK, not the pre-2019 MK.
 */
export function PlateMK({ code }: { code: string }) {
  return (
    <Plate
      country="mk"
      bandStyle="mk"
      code={code}
      band={<span className="plate__mark">NMK</span>}
      emblem={
        <span className="plate__cyrblock" aria-hidden="true">
          <span>{toCyrillic(code)}</span>
          <span>АА</span>
        </span>
      }
      serial={<Serial parts={['1234', 'AB']} />}
    />
  )
}
