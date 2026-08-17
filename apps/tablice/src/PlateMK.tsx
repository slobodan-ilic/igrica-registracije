import './Plate.css'

/**
 * Macedonian Cyrillic, for the small red block. Only the letters that actually
 * occur in a registration code are needed.
 */
const CYRILLIC: Record<string, string> = {
  A: 'А', B: 'Б', V: 'В', G: 'Г', D: 'Д', E: 'Е', Ž: 'Ж', Z: 'З', I: 'И',
  J: 'Ј', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', R: 'Р', S: 'С',
  T: 'Т', U: 'У', F: 'Ф', H: 'Х', C: 'Ц', Č: 'Ч', Š: 'Ш', Đ: 'Ѓ', Ć: 'Ќ',
}

const toCyrillic = (code: string) => [...code].map((ch) => CYRILLIC[ch] ?? ch).join('')

/**
 * A North Macedonian plate: the blue country band, the region code, then the
 * small red block carrying the same letters in gold Cyrillic — red and gold
 * being the national pairing — and the serial left faint, since it is not the
 * question.
 *
 * The country mark is NMK, not the MK it was before 2019.
 */
export function PlateMK({ code }: { code: string }) {
  return (
    <div className="plate plate--mk" role="img" aria-label={`Registarska tablica ${code}`}>
      <div className="plate__band plate__band--mk">
        <span className="plate__nmk">NMK</span>
      </div>

      <div className="plate__body">
        <span className="plate__code" key={code}>{code}</span>
        <span className="plate__cyrblock" aria-hidden="true">
          <span>{toCyrillic(code)}</span>
          <span>АА</span>
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
