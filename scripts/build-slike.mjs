// Builds public/img/<topic>/ and src/data/slike-<topic>.json: one photograph
// per answer, shown after it has been answered.
//
// Source: the lead image of each feature's sr.wikipedia article, which is on
// Wikimedia Commons (CC BY / CC BY-SA / CC0 / public domain — recorded per
// image and credited in the app).
//
// Two rules keep this honest:
//
//   - Nothing that could give an answer away. District articles lead with
//     "Bor_in_Serbia.svg", a locator map with the answer highlighted on it, so
//     okruzi have no photos at all and every diagram-shaped file is rejected.
//   - Nothing whose licence we cannot state. Files uploaded locally rather than
//     to Commons are usually non-free, and are skipped.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { ROOT } from './lib/sources.mjs'
import { leadImages, fileInfo, download, toCyrillic } from './lib/wiki.mjs'

/** Datasets that get photographs, and the file each reads. */
const TOPICS = {
  tablice: 'regions',
  planine: 'planine',
  banje: 'banje',
  reke: 'rivers',
}

/**
 * Titles that no rule can derive: a place whose article is filed under a name
 * unlike its own, or a disambiguator this build cannot guess.
 *
 * Deliberately short. Hand-typed titles are the least trustworthy thing here —
 * a wrong one is a redlink, and a redlink silently means "no photograph" rather
 * than an error. So the candidate list below does the work instead, and an
 * override that resolves to nothing is reported rather than shrugged off.
 */
const ARTICLE = {
  Tara: 'Тара (планина)',
  Cer: 'Цер (планина)',
  Golija: 'Голија (Србија)',
  'Banjska Banja': 'Бањска',
  Lim: 'Лим (река)',
  Kula: 'Кула (град)',
  Petrovac: 'Петровац на Млави',
}

/** The disambiguator sr.wikipedia uses when a topic's names collide. */
const QUALIFIER = { planine: 'планина', reke: 'река', banje: 'бања' }

/**
 * Titles worth trying, best first. sr.wikipedia is mostly Cyrillic but files a
 * few articles under their Latin name (Suva planina, Povlen), and disambiguates
 * others by kind — so both are tried before giving up. The first candidate that
 * yields a usable photograph wins, which means a page that exists but leads
 * with a relief map falls through to the next instead of ending the search.
 */
function candidates(name, topic) {
  const cyrillic = toCyrillic(name)
  const qualifier = QUALIFIER[topic]
  return [...new Set([
    ARTICLE[name],
    cyrillic,
    name,
    qualifier && `${cyrillic} (${qualifier})`,
  ].filter(Boolean))]
}

/** Diagrams, flags and crests: never a photograph of the place. */
const NOT_A_PHOTO =
  /(^|[_ ])(in[_ ]serbia|locator|location|map|karta|mapa|grb|coat[_ ]of[_ ]arms|zastava|flag|logo|seal|scheme|diagram)([_ .]|$)/i

/** Licences we can state plainly and that permit reuse. */
const FREE = /^(cc0|cc[ -]by|public domain|pd|gfdl|fal|attribution)/i

const report = { used: 0, none: [], badOverride: [] }

for (const [topic, file] of Object.entries(TOPICS)) {
  const features = JSON.parse(
    readFileSync(resolve(ROOT, `src/data/${file}.json`), 'utf8'),
  ).features

  const tries = new Map(features.map((f) => [f.properties.code, candidates(f.properties.name, topic)]))
  const { images, exists } = await leadImages([...new Set([...tries.values()].flat())])
  const info = await fileInfo([...new Set([...images.values()].map((i) => i.file))])

  /** Why this file cannot be used, or null if it can. */
  const reject = (fileName, meta) =>
    !meta ? 'no file info'
    : !meta.shared ? 'not on Commons, so probably non-free'
    : !/^image\/(jpeg|png|webp)$/.test(meta.mime ?? '') ? `${meta.mime} is a diagram, not a photo`
    : NOT_A_PHOTO.test(fileName) ? 'a map, crest or flag'
    : meta.restrictions ? `restricted: ${meta.restrictions}`
    : !FREE.test(meta.licence) ? `licence "${meta.licence || 'unknown'}"`
    : null

  const credits = {}
  const dir = resolve(ROOT, 'public/img', topic)
  mkdirSync(resolve(dir, 't'), { recursive: true })

  for (const f of features) {
    const { code, name } = f.properties

    // Walk the candidates and take the first that yields a usable photograph.
    let picked = null
    const tried = []
    for (const title of tries.get(code)) {
      const image = images.get(title)
      if (!image) {
        tried.push(`${title}: no article or no lead image`)
        continue
      }
      const meta = info.get(image.file.replace(/_/g, ' '))
      const why = reject(image.file, meta)
      if (why) {
        tried.push(`${title}: ${image.file} — ${why}`)
        continue
      }
      picked = { title, ...image, meta }
      break
    }

    // An override pointing at a redlink is a typo, and would otherwise show up
    // only as a place quietly missing its photograph. An article that exists
    // but has no lead image is fine — that is just Wikipedia.
    const override = ARTICLE[name]
    if (override && !exists.has(override)) {
      report.badOverride.push(`${topic}/${name}: ARTICLE["${name}"] = "${override}" is not an article`)
    }

    if (!picked) {
      report.none.push(`${topic}/${name}\n${tried.map((t) => `        ${t}`).join('\n')}`)
      continue
    }

    const { file: fileName, url, meta } = picked

    // One download, cut to a 640 card for the reveal and a 160 tile for the
    // summary grid. Both are cropped to 4:3 so the grid does not go ragged.
    try {
      const src = await download(url)
      await sharp(src).resize(640, 480, { fit: 'cover' }).webp({ quality: 78 })
        .toFile(resolve(dir, `${code}.webp`))
      await sharp(src).resize(160, 120, { fit: 'cover' }).webp({ quality: 72 })
        .toFile(resolve(dir, 't', `${code}.webp`))
    } catch (err) {
      report.none.push(`${topic}/${name}\n        ${fileName} — download failed: ${err.message}`)
      continue
    }

    credits[code] = { a: meta.author || 'nepoznat autor', l: meta.licence, u: meta.page }
    report.used++
  }

  writeFileSync(
    resolve(ROOT, `src/data/slike-${topic}.json`),
    JSON.stringify(credits),
  )
  const pct = Math.round((Object.keys(credits).length / features.length) * 100)
  console.log(`${topic.padEnd(8)} ${Object.keys(credits).length}/${features.length} photos (${pct}%)`)
}

if (report.none.length) {
  console.log(`\nno usable photograph (${report.none.length}), and what was tried:`)
  for (const line of report.none) console.log(`    ${line}`)
}

// A typo in ARTICLE is the one failure that looks exactly like "this place has
// no photograph", so it ends the build rather than hiding in the output.
if (report.badOverride.length) {
  console.error('\nARTICLE overrides that resolve to nothing:')
  for (const line of report.badOverride) console.error(`    ${line}`)
  process.exit(1)
}

// A broken API would otherwise quietly empty every manifest.
if (report.used < 100) {
  console.error(`\nOnly ${report.used} photos — expected well over 100. Refusing to write that.`)
  process.exit(1)
}
console.log(`\nOK  ${report.used} photos`)
