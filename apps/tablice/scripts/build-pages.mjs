// Writes one HTML file per route, each carrying its own preview tags.
//
// The app is a single page, so every route has always been served the same
// index.html — and the crawlers that draw link previews do not run JavaScript,
// so whatever React sets afterwards is invisible to them. A link to any country
// previewed as a grey rectangle, which is a poor advertisement for an app about
// how a plate looks.
//
// This writes the tags into the file instead. Everyone gets the same HTML,
// crawler and browser alike — no sniffing the user agent, no serving one thing
// to Facebook and another to a person. The browser then boots the app on top
// exactly as before.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://tablice.vercel.app'

/** Every route worth previewing, and what it should say when it is shared. */
const PAGES = {
  srbija: ['Registarske oznake Srbije', 'Pogodi kojem području pripada oznaka sa tablice. 81 oznaka, cela mapa Srbije.'],
  hrvatska: ['Registarske oznake Hrvatske', 'Pogodi kojem području pripada oznaka sa hrvatske tablice. 34 oznake, od Zagreba do Dubrovnika.'],
  makedonija: ['Registarske oznake Makedonije', 'Pogodi kojem području pripada oznaka sa makedonske tablice. 34 oznake, od Skoplja do Ohrida.'],
  crnagora: ['Registarske oznake Crne Gore', 'Pogodi kojoj opštini pripada oznaka sa crnogorske tablice. 25 oznaka, po jedna za svaku opštinu.'],
  slovenija: ['Registarske oznake Slovenije', 'Pogodi kojem području pripada oznaka sa slovenačke tablice. 11 oznaka, od Ljubljane do Maribora.'],
  jugoslavija: ['Registarske oznake Jugoslavije', 'Stare oznake SFRJ — 125 gradova, uključujući Titograd, Titovo Užice i bosanske koje više ne postoje.'],
  dnevni: ['Dnevni izazov · Tablice', 'Jedan krug dnevno, isti za sve. Deset pitanja, cela mapa, druga zemlja svakog dana.'],
  napredak: ['Vaš napredak · Tablice', 'Tačnost kroz vreme, po zemljama, i oznake koje vas najviše muče.'],
}

/** The picture each route shares. The daily borrows whichever country it is. */
const picture = (route) =>
  `${SITE}/api/og?t=${route === 'dnevni' || route === 'napredak' ? 'srbija' : route}`

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const template = readFileSync(resolve(app, 'dist/index.html'), 'utf8')

if (!template.includes('<title>')) {
  console.error('dist/index.html has no <title> to replace — has the build changed?')
  process.exit(1)
}

const problems = []

for (const [route, [title, description]] of Object.entries(PAGES)) {
  const url = `${SITE}/${route}`
  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:image" content="${picture(route)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${picture(route)}" />`,
  ].join('\n    ')

  // Everything the template said about itself comes out first. Left in, each
  // page would carry two og:image values — its own and the site's — and which
  // one a crawler believes is up to the crawler.
  const page = template
    .replace(/\n\s*<meta\s+(?:property|name)="(?:og:|twitter:|description)[^>]*>/g, '')
    .replace(/\n\s*<!--[^>]*What a shared link shows[\s\S]*?-->/, '')
    .replace(/<title>[^<]*<\/title>/, tags)

  const once = (what, pattern) => {
    const found = page.match(pattern)?.length ?? 0
    if (found !== 1) problems.push(`${route}.html has ${found} ${what}`)
  }
  once('titles', /<title>/g)
  once('og:title tags', /property="og:title"/g)
  once('og:image tags', /property="og:image"/g)
  once('descriptions', /name="description"/g)

  writeFileSync(resolve(app, `dist/${route}.html`), page)
}

if (problems.length) {
  console.error('\npages a crawler would read two ways:')
  for (const p of problems) console.error(`    ${p}`)
  process.exit(1)
}

console.log(`OK  ${Object.keys(PAGES).length} pages with their own preview tags`)
