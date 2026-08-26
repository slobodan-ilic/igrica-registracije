// The page a shared result points at.
//
// Every other route's preview tags are written into its HTML at build time,
// which works because those routes say the same thing every day. A result does
// not: it is a different score, a different grid and a different round every
// time, so its tags have to be made when the link is opened rather than when
// the app is built. That is the whole reason this is a function.
//
// Everyone is served the same HTML, crawler and browser alike — no sniffing the
// user agent, no showing a timeline something a person would not see. A crawler
// reads the tags and stops; a person reads the page and presses the button.

import { neon } from '@neondatabase/serverless'
import { decode, encode, headline, playHref, score, spell, type Shared } from '../packages/kviz/src/result.js'

export const config = { runtime: 'edge' }

/**
 * A stored result, by the id in its address. This is what makes a shared link
 * short enough to send: /r/ab12cd34 rather than the whole round written out in
 * a query string.
 *
 * A link whose id is not in the table is not an error worth a page — a row may
 * have been cleared, or the id mistyped — so it falls through to the long form
 * and then, failing that, to the country's own page.
 */
async function stored(id: string): Promise<Shared | null> {
  if (!/^[0-9a-hjkmnp-tv-z]{8}$/.test(id)) return null
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const [row] = await sql`
      select topic, seed, easy, kim, timed, grid, seconds from shared where id = ${id}
    `
    if (!row) return null
    return {
      topic: String(row.topic),
      seed: String(row.seed),
      easy: Boolean(row.easy),
      kim: Boolean(row.kim),
      timed: Boolean(row.timed),
      marks: [...String(row.grid)].map((c) => c === '1'),
      seconds: Number(row.seconds) || 0,
    }
  } catch (e) {
    console.error('share:', e)
    return null
  }
}

/** The same names the app gives its topics, and the only ones this will serve. */
const LABELS: Record<string, string> = {
  srbija: 'Srbija',
  hrvatska: 'Hrvatska',
  makedonija: 'Makedonija',
  crnagora: 'Crna Gora',
  slovenija: 'Slovenija',
  jugoslavija: 'Jugoslavija',
  // The geography quiz shares this engine, so it shares this page.
  okruzi: 'Okruzi',
  reke: 'Reke',
  planine: 'Planine',
  banje: 'Banje',
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default async function handler(req: Request) {
  const url = new URL(req.url)
  // The rewrite hands the path segment over as `t`. It is either a stored
  // result's id or, for every link shared before there was a table to store
  // them in, the topic with the whole round written out beside it.
  const key = url.searchParams.get('t') ?? url.pathname.split('/').filter(Boolean)[1] ?? ''
  const shared = LABELS[key] ? decode(key, url.searchParams) : await stored(key)
  const topic = shared?.topic ?? key
  const label = LABELS[topic]
  const site = `${url.protocol}//${url.host}`

  // A link somebody typed by hand, or one that lost half of itself on the way
  // through a chat app. There is nothing to show and nothing to preview, so it
  // goes where it was probably meant to go.
  if (!shared || !label) {
    return Response.redirect(`${site}/${label ? topic : ''}`, 302)
  }

  const line = headline(shared, label)
  const play = `${site}${playHref(shared)}`
  // Written out of the result rather than copied from the address, because a
  // short link has no result in its address to copy.
  const picture = `${site}/api/og?t=${encodeURIComponent(topic)}&${encode(shared)}`
  const description =
    shared.seconds > 0
      ? `${score(shared)} od ${shared.marks.length} tačno, za ${spell(shared.seconds)}. Probajte isti krug — ista pitanja, isti redosled.`
      : `${score(shared)} od ${shared.marks.length} tačno. Probajte isti krug — ista pitanja, isti redosled.`

  // Five to a row, the same shape the pasted text and both cards use — left to
  // wrap on its own it came out seven and three, which is nobody's grid.
  const rows: boolean[][] = []
  for (let at = 0; at < shared.marks.length; at += 5) rows.push(shared.marks.slice(at, at + 5))
  const squares = rows
    .map(
      (row) =>
        `<div class="r__row">${row.map((ok) => `<i class="m${ok ? '' : ' m--no'}"></i>`).join('')}</div>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="sr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(line)}</title>
    <meta name="description" content="${escape(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escape(site + url.pathname + url.search)}" />
    <meta property="og:title" content="${escape(line)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:image" content="${escape(picture)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(line)}" />
    <meta name="twitter:description" content="${escape(description)}" />
    <meta name="twitter:image" content="${escape(picture)}" />
    <meta name="theme-color" content="#f2f1ec" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#131519" media="(prefers-color-scheme: dark)" />
    <style>
      :root {
        --paper: #f2f1ec; --card: #fff; --text: #15171c; --muted: #5c626e;
        --line: #dcd9d1; --accent: #0d3a86; --accent-ink: #fff;
        --ok: #009486; --miss: #f08b45;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --paper: #131519; --card: #1c2028; --text: #e9ecf1; --muted: #99a1ae;
          --line: #2d323b; --accent: #74a2ee; --accent-ink: #10161f;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; display: flex; align-items: center;
        justify-content: center; padding: 1.5rem;
        background: var(--paper); color: var(--text);
        font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      .r {
        display: flex; flex-direction: column; align-items: center; gap: 1rem;
        max-width: 26rem; width: 100%; padding: 1.8rem 1.4rem;
        border: 1px solid var(--line); border-radius: 12px; background: var(--card);
        box-shadow: 0 1px 2px rgb(20 22 26 / .05), 0 10px 30px rgb(20 22 26 / .06);
        text-align: center;
      }
      .r__what { margin: 0; color: var(--muted); font-size: .9rem; }
      .r__score { margin: 0; font-size: 3.4rem; font-weight: 700; letter-spacing: -.02em; }
      .r__grid { display: flex; flex-direction: column; gap: 6px; }
      .r__row { display: flex; gap: 6px; }
      /* The subject, drawn once. A result page without it is a number on a
         beige field and could belong to any quiz anywhere. */
      .r__plate {
        display: inline-flex; align-items: stretch; height: 46px; padding: 3px;
        border-radius: 7px; background: #fff;
        box-shadow: 0 0 0 3px #14161a inset; user-select: none;
      }
      .r__band { width: 20px; border-radius: 4px; background: #0d3a86; }
      .r__word {
        display: flex; align-items: center; padding: 0 14px;
        font-size: 1.45rem; font-weight: 700; letter-spacing: .01em; color: #101215;
      }
      .m { width: 26px; height: 26px; border-radius: 5px; background: var(--ok); }
      .m--no { background: var(--miss); }
      .r__go {
        display: inline-block; margin-top: .3rem; padding: .7rem 1.3rem;
        border-radius: 10px; background: var(--accent); color: var(--accent-ink);
        font-weight: 700; text-decoration: none;
      }
      .r__note { margin: 0; color: var(--muted); font-size: .82rem; }
    </style>
  </head>
  <body>
    <main class="r">
      <span class="r__plate" aria-hidden="true"><i class="r__band"></i><span class="r__word">TABLICE</span></span>
      <p class="r__what">${escape(line)}</p>
      <p class="r__score">${score(shared)}/${shared.marks.length}</p>
      <div class="r__grid" aria-hidden="true">${squares}</div>
      <a class="r__go" href="${escape(play)}">Probaj isti krug</a>
      <p class="r__note">Ista pitanja, isti redosled — ništa ovde ne odaje odgovor.</p>
    </main>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // A finished round never changes.
      'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
