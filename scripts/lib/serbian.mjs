// Serbian Cyrillic <-> Latin is a strict 1:1 mapping, so display names can be
// transliterated rather than hand-listed. Shared by every dataset build.

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
}

/** Proper Latin, diacritics intact: "Аранђеловац" -> "Aranđelovac". */
export const toLatin = (s) =>
  [...s]
    .map((ch) => {
      const lower = ch.toLowerCase()
      const mapped = CYR[lower]
      if (!mapped) return ch
      return ch === lower ? mapped : mapped[0].toUpperCase() + mapped.slice(1)
    })
    .join('')

const FOLD = { đ: 'dj', ž: 'z', ć: 'c', č: 'c', dž: 'dz', š: 's' }

/** Diacritics folded to ASCII, for matching against foreign-language sources. */
export const translit = (s) =>
  toLatin(s)
    .toLowerCase()
    .replace(/dž|đ|ž|ć|č|š/g, (m) => FOLD[m])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Normalised join key: latin, alnum only, admin suffixes stripped. */
export const key = (s) =>
  translit(s)
    .replace(/\b(municipality|municipal\*?|city|opstina|grad|gradska|of)\b/g, '')
    .replace(/[^a-z0-9]/g, '')

export const slug = (s) =>
  translit(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
