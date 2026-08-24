import type { Played } from './history'

/**
 * The result, in a shape you can paste into a message.
 *
 * It has to give away nothing. A line naming the codes you missed would feel
 * like a kindness and would ruin the day's challenge for everyone who read it,
 * so what goes out is the score, one mark per question in the order they were
 * asked, and a link — never a code and never a place.
 *
 * Green against black rather than green against red. Red and green are the one
 * pairing that collapses for the six percent of men who cannot tell them apart,
 * and these squares carry no label to fall back on; green and black differ in
 * brightness as well as hue, so they survive any eyes and any screen.
 */
const RIGHT = '🟩'
const WRONG = '⬛'

/** Five to a row, which keeps ten on two lines and seventy-four on fifteen. */
const PER_ROW = 5

/** 1:47, or 47s when it never reaches a minute. */
function clock(ms: number) {
  const total = Math.round(ms / 1000)
  const min = Math.floor(total / 60)
  return min ? `${min}:${String(total % 60).padStart(2, '0')}` : `${total}s`
}

function grid(round: Played) {
  const marks = round.answers.map((a) => (a.correct ? RIGHT : WRONG))
  const rows = []
  for (let at = 0; at < marks.length; at += PER_ROW) rows.push(marks.slice(at, at + PER_ROW).join(''))
  return rows.join('\n')
}

/**
 * `daily` is the challenge's number when this round was that challenge, and
 * null otherwise — an ordinary practice round must not go out wearing today's
 * number, or the first person to compare two of them finds the number means
 * nothing.
 */
export function shareText(
  round: Played,
  { label, daily, site }: { label: string; daily: number | null; site: string },
) {
  const what = daily === null ? `Tablice · ${label}` : `Tablice #${daily}`
  const score = `${round.score}/${round.answers.length}`
  const time = round.ms > 0 ? ` · ${clock(round.ms)}` : ''
  return `${what} · ${score}${time}\n${grid(round)}\n${site}`
}

/**
 * Hand it over however this browser prefers: the share sheet on a phone, where
 * it is the whole point, and the clipboard everywhere else.
 *
 * The sheet is only offered where a finger is the pointer. Desktop Chrome
 * exposes navigator.share and then, if the sheet does not open, returns a
 * promise that never settles either way — no resolve, no reject — which leaves
 * a button that does nothing at all and says nothing about it. Even where the
 * sheet is wanted the call is raced against a clock for the same reason.
 */
const SHEET_GIVES_UP_AFTER = 30_000

export async function send(text: string): Promise<'shared' | 'copied' | 'failed'> {
  const sheet =
    typeof navigator.share === 'function' && window.matchMedia('(hover: none)').matches

  if (sheet) {
    try {
      const settled = await Promise.race([
        navigator.share({ text }).then(() => 'shared' as const),
        new Promise<'stuck'>((r) => window.setTimeout(() => r('stuck'), SHEET_GIVES_UP_AFTER)),
      ])
      if (settled === 'shared') return 'shared'
    } catch (e) {
      // Dismissing the sheet is a decision, not a failure, and must not then
      // paste over whatever the person had on their clipboard.
      if ((e as Error)?.name === 'AbortError') return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    // The clipboard API is refused more often than it looks: Safari outside a
    // direct gesture, any page not served over https, and every browser with
    // the permission denied. The old way still works in all of them, so a
    // button that would otherwise do nothing at all falls back to it.
    return legacyCopy(text) ? 'copied' : 'failed'
  }
}

/** Select hidden text and let the browser copy it, as everyone did before. */
function legacyCopy(text: string) {
  const box = document.createElement('textarea')
  box.value = text
  // Off-screen rather than hidden: a display:none textarea cannot be selected,
  // and scrolling to a visible one would jump the page under the reader.
  box.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0'
  box.setAttribute('readonly', '')
  document.body.appendChild(box)
  try {
    box.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    box.remove()
  }
}
