/**
 * Serbian numeral agreement. The noun form follows the last digit, except for
 * the teens, which always take the "many" form:
 *
 *   1, 21, 81   -> 81 oznaka   (one)
 *   2-4, 74     -> 74 oznake   (few)
 *   5-20, 25    -> 25 oznaka   (many)
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const last = n % 10
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

/**
 * "sva 81 oznaka" / "sve 74 oznake" / "svih 25 oznaka" — the determiner agrees
 * with the number too. Written for feminine nouns, which is all we need so far.
 */
export function allOf(n: number, one: string, few: string, many: string): string {
  return `${plural(n, 'sva', 'sve', 'svih')} ${n} ${plural(n, one, few, many)}`
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
