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

import { decode, headline, playHref, score, spell } from '../packages/kviz/src/result.js'

export const config = { runtime: 'edge' }

/** The same names the app gives its topics, and the only ones this will serve. */
const LABELS: Record<string, string> = {
  srbija: 'Srbija',
  hrvatska: 'Hrvatska',
  makedonija: 'Makedonija',
  crnagora: 'Crna Gora',
  slovenija: 'Slovenija',
  jugoslavija: 'Jugoslavija',
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default function handler(req: Request) {
  const url = new URL(req.url)
  // The rewrite hands the topic over as `t`; the path is the readable form.
  const topic = url.searchParams.get('t') ?? url.pathname.split('/').filter(Boolean)[1] ?? ''
  const label = LABELS[topic]
  const shared = label ? decode(topic, url.searchParams) : null
  const site = `${url.protocol}//${url.host}`

  // A link somebody typed by hand, or one that lost half of itself on the way
  // through a chat app. There is nothing to show and nothing to preview, so it
  // goes where it was probably meant to go.
  if (!shared) {
    return Response.redirect(`${site}/${label ? topic : ''}`, 302)
  }

  const line = headline(shared, label)
  const play = `${site}${playHref(shared)}`
  // Built by taking the ask apart rather than by patching its string: the
  // rewrite may put `t` first or last, and stripping it with a pattern leaves a
  // stray separator at whichever end it was.
  const ask = new URLSearchParams(url.searchParams)
  ask.delete('t')
  // The rewrite passes the path segment through as its own name as well, which
  // the picture has no use for and which would ride along in every preview URL.
  ask.delete('topic')
  const picture = `${site}/api/og?t=${encodeURIComponent(topic)}&${ask.toString()}`
  const description =
    shared.seconds > 0
      ? `${score(shared)} od ${shared.marks.length} tačno, za ${spell(shared.seconds)}. Probajte isti krug — ista pitanja, isti redosled.`
      : `${score(shared)} od ${shared.marks.length} tačno. Probajte isti krug — ista pitanja, isti redosled.`

  const squares = shared.marks
    .map((ok) => `<i class="m${ok ? '' : ' m--no'}"></i>`)
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
      .r__grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; max-width: 15rem; }
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
