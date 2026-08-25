import { useEffect, useRef, useState } from 'react'
import { drawCard, toFile } from './card'
import { canSendFile, send, sendFile, shareLink, shareText, targets, titleOf } from './share'
import { numberOf } from './challenge'
import type { Played } from './history'

/**
 * How a finished round leaves.
 *
 * Not a button. A button that quietly copies is the whole of what this used to
 * be, and it told nobody what it had done or offered anywhere to put it — so
 * the result went out, when it went out at all, as text with a bare hostname
 * stuck to the end of it.
 *
 * What is here instead is the card itself, drawn, with the places it can go
 * underneath. Nothing to open first: the summary is already the moment someone
 * decides whether to send it, and putting that behind a press is one press
 * between them and the only thing that brings anyone else here.
 */

/**
 * Marks rather than logos. Every one of these is drawn as a shape in the house
 * style — the design system says no emoji as UI, and a row of five different
 * brands' PNGs would look like a plugin bolted on rather than part of the app.
 */
const MARKS: Record<string, string> = {
  x: 'M4 3h4l4 5.5L16.5 3H20l-6 8 6.5 10h-4L12 15.2 7.2 21H4l7-9Z',
  whatsapp:
    'M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.2 1.2-1.7 1.2-.5 0-1 .2-3.3-.7a11.6 11.6 0 0 1-4.8-4.3c-.4-.6-.9-1.5-.9-2.4 0-1 .5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 1.9c0 .2.1.3 0 .5l-.4.5-.3.3c-.1.1-.2.3 0 .5a8 8 0 0 0 1.5 1.8c.8.7 1.4.9 1.6 1 .2.1.4.1.5 0l.8-1c.2-.2.3-.2.5-.1l2 .9c.2.1.3.2.4.3v.9Z',
  viber:
    'M12 2C6.9 2 3 5.3 3 10c0 2.6 1.2 4.8 3.2 6.2V21l3.2-2c.8.2 1.6.2 2.6.2 5.1 0 9-3.3 9-8s-3.9-9.2-9-9.2Zm.6 12.4c-.7 0-2.2-.6-3.6-2s-2-2.9-2-3.6c0-.5.2-.8.5-1.1l.5-.4c.2-.2.4-.1.6.1l1.1 1.6c.1.2.1.4-.1.6l-.5.5c.2.6.6 1.1 1.1 1.6s1 .9 1.6 1.1l.5-.5c.2-.2.4-.2.6-.1l1.6 1.1c.2.2.3.4.1.6l-.4.5c-.3.3-.6.5-1.1.5Z',
  telegram: 'M21.5 4.3 2.9 11.4c-.9.3-.9.9-.1 1.1l4.6 1.4 1.8 5.4c.2.6.4.7 1 .3l2.6-1.9 4.5 3.3c.8.5 1.3.2 1.5-.8l3-13.7c.2-1-.5-1.5-1.3-1.2ZM9.6 14l8.6-5.4c.4-.3.8-.1.5.2l-7 6.3-.3 3Z',
  facebook:
    'M14 8.5V7c0-.8.2-1.2 1.3-1.2H17V3h-2.6c-3 0-4 1.5-4 3.9v1.6H8V11h2.4v10h3.4V11h2.6l.4-2.5Z',
}

const COPY = 'M8 3h9a2 2 0 0 1 2 2v11h-2.5V5.5H8ZM5.5 7H14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z'
const SAVE = 'M12 3v9.2l3.1-3.1 1.8 1.8-6 6-6-6 1.8-1.8L10 12.2V3ZM4 18h16v3H4Z'
const SHEET = 'M14 3h7v7h-2.5V7.3l-6.6 6.6-1.8-1.8L16.7 5.5H14ZM4 7h5v2.5H6.5v8h8V15H17v5H4Z'

function Mark({ d }: { d: string }) {
  return (
    <svg className="share__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export function Share({ round, label, site }: { round: Played; label: string; site: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [said, setSaid] = useState<string | null>(null)

  const daily = numberOf(round)
  const link = shareLink(round, { daily, site })
  const text = shareText(round, { label, daily, link })
  const title = titleOf(round, { label, daily })

  // Drawn once the summary is on screen, and turned into a file straight away
  // so that pressing the sheet has nothing to wait for.
  useEffect(() => {
    if (!canvas.current) return
    drawCard(canvas.current, {
      title: daily === null ? `Tablice · ${label}` : `Tablice #${daily}`,
      score: round.score,
      of: round.answers.length,
      ms: round.ms,
      marks: round.answers.map((a) => a.correct),
      link,
    })
    let live = true
    void toFile(canvas.current, 'tablice.png').then((f) => live && setFile(f))
    return () => {
      live = false
    }
  }, [round, label, daily, link])

  const say = (what: string) => {
    setSaid(what)
    window.setTimeout(() => setSaid(null), 2400)
  }

  /**
   * Where a finger is the pointer. Two things hang off this. Viber has no
   * desktop web address worth offering. And the sheet is offered only here for
   * the reason share.ts already records: desktop Chrome exposes the API and
   * then, if the sheet does not open, returns a promise that never settles
   * either way — a control that does nothing and says nothing about it.
   */
  const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  const places = targets(text, link).filter((t) => !t.touchOnly || touch)

  return (
    <section className="share" aria-label="Podeli rezultat">
      <canvas
        className="share__card"
        ref={canvas}
        role="img"
        aria-label={`${title}. Slika rezultata.`}
      />

      <ul className="share__targets">
        {places.map((t) => (
          <li key={t.id}>
            <a
              className="share__target"
              href={t.href}
              target="_blank"
              rel="noreferrer noopener"
              title={t.label}
            >
              <Mark d={MARKS[t.id]} />
              {/* X's mark is its whole name; printing it again reads "X X". */}
              {t.id !== 'x' && <span className="share__name">{t.label}</span>}
            </a>
          </li>
        ))}

        {touch && canSendFile(file) && (
          <li>
            <button
              className="share__target"
              type="button"
              title="Ostalo"
              onClick={async () => {
                if (!file) return
                say((await sendFile(file, text)) === 'shared' ? 'Poslato' : 'Nije uspelo')
              }}
            >
              <Mark d={SHEET} />
              <span className="share__name">Ostalo</span>
            </button>
          </li>
        )}

        <li>
          <button
            className="share__target"
            type="button"
            title="Sačuvaj sliku"
            onClick={() => {
              if (!canvas.current) return
              const a = document.createElement('a')
              a.href = canvas.current.toDataURL('image/png')
              a.download = `${daily === null ? 'tablice' : `tablice-${daily}`}.png`
              a.click()
              say('Sačuvano')
            }}
          >
            <Mark d={SAVE} />
            <span className="share__name">Slika</span>
          </button>
        </li>

        <li>
          <button
            className="share__target btn--share"
            type="button"
            data-share={text}
            title="Kopiraj rezultat"
            onClick={async () => {
              const how = await send(text)
              say(how === 'failed' ? 'Nije uspelo' : how === 'shared' ? 'Poslato' : 'Kopirano')
            }}
          >
            <Mark d={COPY} />
            <span className="share__name">Kopiraj</span>
          </button>
        </li>
      </ul>

      {/* Copying has nothing to show for itself, so it says so. Kept at a fixed
          height, and empty until there is something to report, so that nothing
          on the summary moves when there is. */}
      <p className="share__said" role="status">
        {said}
      </p>
    </section>
  )
}
