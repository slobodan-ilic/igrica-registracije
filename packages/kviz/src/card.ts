import { clock } from './format'

/**
 * The result, drawn as a picture you can post.
 *
 * There is one drawing routine and it paints a canvas, which is both what the
 * summary shows and what gets saved or handed to the share sheet — so what
 * someone sees before they send it is the file that leaves. Rendering the
 * preview one way and the file another is how the two drift apart.
 *
 * Square rather than 1200×630: the only route to Instagram is a picture a
 * person posts themselves, and Instagram is the one target here that will not
 * take a link.
 */
export const SIDE = 1080

/**
 * The card is a printed artefact, not a surface in the app, so its colours are
 * fixed rather than taken from the theme: the picture that leaves this browser
 * has to be the same picture for whoever opens it, and a dark-theme card would
 * arrive as a different object than the one that was previewed. The values are
 * the light theme's own, kept in step by hand — the one place in the engine
 * where that is on purpose.
 *
 * Teal and orange are the app's answer colours rather than the green and black
 * of the pasted text, which has no teal square to reach for. Change RIGHT and
 * WRONG together if that trade ever stops being worth it.
 */
const PAPER = '#f2f1ec'
const INK = '#15171c'
const MUTED = '#5c626e'
const LINE = '#dcd9d1'
const BAND = '#0d3a86'
const PLATE_FACE = '#ffffff'
const PLATE_EDGE = '#14161a'
const RIGHT = '#009486'
const WRONG = '#f08b45'

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export type Result = {
  /** "Tablice #2", or "Tablice · Crna Gora" when it was not the challenge. */
  title: string
  score: number
  of: number
  /** Total milliseconds, or 0 when there is nothing worth printing. */
  ms: number
  /** One per question, in the order they were asked. */
  marks: boolean[]
  /** What the quiz is called, on the plate: TABLICE, or GEOGRAFIJA. */
  word: string
  /**
   * Where to go and play it. Only the host is printed: someone looking at this
   * picture on Instagram cannot copy a query string out of it, and a line of
   * one is a line of noise. The address that carries the round travels with the
   * text and the link, where it can be pressed.
   */
  link: string
}

/** Five to a row, the same shape the pasted text uses. */
const PER_ROW = 5

/** tablice.vercel.app, out of whatever the round's own address happens to be. */
function host(link: string) {
  try {
    return new URL(link).host
  } catch {
    return link.replace(/^https?:\/\//, '').split('/')[0]
  }
}

function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/**
 * The plate at the top reads TABLICE rather than a real regional code, and its
 * band carries no country letters. Both on purpose: the card is sent from six
 * different countries' rounds, and a plate that said SRB above a Croatian
 * result would be wrong in a way people from here notice immediately. Which
 * country it was is in the title instead.
 */
function plate(c: CanvasRenderingContext2D, mid: number, top: number, word: string) {
  const w = 880
  const h = 216
  const x = mid - w / 2
  const band = 104

  c.fillStyle = PLATE_EDGE
  rounded(c, x, top, w, h, 26)
  c.fill()

  c.fillStyle = PLATE_FACE
  rounded(c, x + 11, top + 11, w - 22, h - 22, 17)
  c.fill()

  c.fillStyle = BAND
  rounded(c, x + 22, top + 22, band, h - 44, 12)
  c.fill()

  // Centred in what the band leaves, rather than set against it: the plate is
  // the app's name here, not a code, and a name pushed left with a hand's width
  // of white after it reads like a rendering mistake.
  c.fillStyle = INK
  c.font = `700 116px ${FONT}`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(word, x + 22 + band + (w - 44 - band) / 2, top + h / 2 + 6)
}

/**
 * The squares, as one centred block. Ten fit two rows at full size; seventy-four
 * across Yugoslavia is fifteen, and it is the square that shrinks rather than
 * the card that grows — so every card sent is the same object whatever was
 * played.
 */
function marks(c: CanvasRenderingContext2D, mid: number, top: number, room: number, right: boolean[]) {
  const rows = Math.ceil(right.length / PER_ROW)
  let size = Math.min(112, Math.floor((room - 4 * (rows - 1)) / rows))
  const gap = Math.max(4, Math.round(size * 0.16))
  size = Math.min(112, Math.floor((room - gap * (rows - 1)) / rows))
  const tall = size * rows + gap * (rows - 1)
  const from = top + Math.max(0, (room - tall) / 2)

  right.forEach((ok, at) => {
    const row = Math.floor(at / PER_ROW)
    const col = at % PER_ROW
    const wide = Math.min(PER_ROW, right.length - row * PER_ROW)
    const left = mid - (wide * size + (wide - 1) * gap) / 2
    c.fillStyle = ok ? RIGHT : WRONG
    rounded(c, left + col * (size + gap), from + row * (size + gap), size, size, Math.max(4, size * 0.12))
    c.fill()
  })
}

/** Paints the whole card. Sizes the canvas itself, so callers cannot mismatch it. */
export function drawCard(canvas: HTMLCanvasElement, result: Result) {
  canvas.width = SIDE
  canvas.height = SIDE
  const c = canvas.getContext('2d')
  if (!c) return

  c.fillStyle = PAPER
  c.fillRect(0, 0, SIDE, SIDE)

  plate(c, SIDE / 2, 104, result.word)

  const mid = SIDE / 2
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'

  c.fillStyle = MUTED
  c.font = `600 44px ${FONT}`
  c.fillText(result.title, mid, 412)

  c.fillStyle = INK
  c.font = `700 184px ${FONT}`
  c.fillText(`${result.score}/${result.of}`, mid, 574)

  if (result.ms > 0) {
    c.fillStyle = MUTED
    c.font = `500 48px ${FONT}`
    c.fillText(clock(result.ms), mid, 642)
  }

  marks(c, mid, 682, 246, result.marks)

  c.strokeStyle = LINE
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(150, 962)
  c.lineTo(SIDE - 150, 962)
  c.stroke()

  c.fillStyle = MUTED
  c.font = `500 38px ${FONT}`
  c.fillText(host(result.link), mid, 1014)
}

/** The card as a file, ready for the share sheet or a download. */
export function toFile(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? new File([blob], name, { type: 'image/png' }) : null)
    }, 'image/png')
  })
}
