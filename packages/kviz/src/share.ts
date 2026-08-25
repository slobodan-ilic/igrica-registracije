import { clock } from './format'
import { shareHref, type Shared } from './result'
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
  { label, daily, link }: { label: string; daily: number | null; link: string },
) {
  return `${titleOf(round, { label, daily })}\n${grid(round)}\n${link}`
}

/** "Tablice #2", or "Tablice · Crna Gora · 7/10 · 2:50" when it was not one. */
export function titleOf(
  round: Played,
  { label, daily }: { label: string; daily: number | null },
) {
  const what = daily === null ? `Tablice · ${label}` : `Tablice #${daily}`
  const score = `${round.score}/${round.answers.length}`
  const time = round.ms > 0 ? ` · ${clock(round.ms)}` : ''
  return `${what} · ${score}${time}`
}

/** The round, in the shape a link can carry it. */
export function sharedOf(round: Played): Shared {
  return {
    topic: round.topic,
    seed: round.seed,
    easy: round.easy,
    kim: round.kim,
    timed: round.timed,
    marks: round.answers.map((a) => a.correct),
    seconds: round.ms > 0 ? Math.round(round.ms / 1000) : 0,
  }
}

/**
 * Where the link goes: a page that is this result.
 *
 * It was the bare hostname once, which dropped whoever opened it on the front
 * page. Then it was the round's own address, which at least dealt them the
 * questions — but a round's address previews as the country's plate, the same
 * picture for a perfect ten and a miserable two, because those tags are written
 * once when the app is built and cannot know what happened.
 *
 * So a result gets an address of its own, `/r/…`, answered by a function that
 * makes its tags when the link is opened. What it previews as is the score. The
 * round itself is one press away from there, and is what the page is for.
 *
 * Nothing in the address gives an answer away: which round it was, and which
 * questions went right. Never a code, never a place.
 */
export function shareLink(round: Played, { site }: { site: string }) {
  return `${site}${shareHref(sharedOf(round))}`
}

/**
 * Where a result can be sent, and how each one wants to be told.
 *
 * Every target here takes a link. Instagram does not — there is no address that
 * opens a prefilled post, by Instagram's own design — so it is reachable only
 * through the phone's own share sheet, with the picture attached, which is what
 * the sheet button is for and why the card is drawn square.
 *
 * Viber is worth the row it takes in this part of the world, and it is the one
 * that only exists on a phone.
 */
export type Target = { id: string; label: string; href: string; touchOnly?: boolean }

export function targets(text: string, link: string): Target[] {
  const t = encodeURIComponent(text)
  const u = encodeURIComponent(link)
  // The grid is the result; a target that takes only one field should carry it.
  const withoutLink = encodeURIComponent(text.slice(0, text.lastIndexOf('\n')))
  return [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${withoutLink}&url=${u}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${t}` },
    { id: 'viber', label: 'Viber', href: `viber://forward?text=${t}`, touchOnly: true },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${withoutLink}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ]
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

/**
 * The card itself, through the phone's own share sheet — the only route to
 * Instagram, and the one that puts the picture rather than a link into whatever
 * the person picks.
 *
 * The file must be ready before this is called. Building it here would put an
 * await between the tap and the sheet, and Safari refuses a sheet that is not
 * opened inside the gesture that asked for it.
 */
export function canSendFile(file: File | null): boolean {
  return (
    !!file &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] })
  )
}

export async function sendFile(file: File, text: string): Promise<'shared' | 'failed'> {
  try {
    await navigator.share({ files: [file], text })
    return 'shared'
  } catch (e) {
    // Dismissing the sheet is a decision, not a failure.
    return (e as Error)?.name === 'AbortError' ? 'shared' : 'failed'
  }
}
