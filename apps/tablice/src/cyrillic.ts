/**
 * Latin to Cyrillic, for the plates that repeat their code in the other script:
 * Serbia under the shield, North Macedonia inside the red block.
 *
 * Each country supplies its own alphabet — Macedonian has ѓ and ќ where Serbian
 * has đ and ć — so this builds the converter rather than being one.
 */
export const transliterator = (alphabet: Record<string, string>) => (code: string) =>
  [...code].map((ch) => alphabet[ch] ?? ch).join('')
