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
 * Where the article is not simply the Serbian name. Mountains collide with the
 * rivers and towns they are named after, so most of these are disambiguators.
 */
const ARTICLE = {
  Tara: 'Тара (планина)',
  Golija: 'Голија (планина)',
  Zlatar: 'Златар (планина)',
  Cer: 'Цер (планина)',
  Radan: 'Радан (планина)',
  Jastrebac: 'Јастребац (планина)',
  'Suva planina': 'Сува планина (планина)',
  Povlen: 'Повлен (планина)',
  Kučaj: 'Кучајске планине',
  Mučanj: 'Мучањ (планина)',
  'Deli Jovan': 'Дели Јован (планина)',
  Beljanica: 'Бељаница (планина)',
  Rtanj: 'Ртањ (планина)',
  'Banjska Banja': 'Бањска',
  Lim: 'Лим (река)',
  Kula: 'Кула (град)',
  Petrovac: 'Петровац на Млави',
}

/** Diagrams, flags and crests: never a photograph of the place. */
const NOT_A_PHOTO =
  /(^|[_ ])(in[_ ]serbia|locator|location|map|karta|mapa|grb|coat[_ ]of[_ ]arms|zastava|flag|logo|seal|scheme|diagram)([_ .]|$)/i

/** Licences we can state plainly and that permit reuse. */
const FREE = /^(cc0|cc[ -]by|public domain|pd|gfdl|fal|attribution)/i

const report = { used: 0, noArticle: [], noImage: [], rejected: [] }

for (const [topic, file] of Object.entries(TOPICS)) {
  const features = JSON.parse(
    readFileSync(resolve(ROOT, `src/data/${file}.json`), 'utf8'),
  ).features

  // name -> article title, then article title -> File: name.
  const titles = new Map(
    features.map((f) => [f.properties.code, ARTICLE[f.properties.name] ?? toCyrillic(f.properties.name)]),
  )
  const images = await leadImages([...new Set(titles.values())])
  const info = await fileInfo([...new Set([...images.values()].map((i) => i.file))])

  const credits = {}
  const dir = resolve(ROOT, 'public/img', topic)
  mkdirSync(resolve(dir, 't'), { recursive: true })

  for (const f of features) {
    const { code, name } = f.properties
    const title = titles.get(code)
    const image = images.get(title)
    if (!image) {
      report[images.size ? 'noImage' : 'noArticle'].push(`${topic}/${name}`)
      continue
    }

    const { file: fileName, url } = image
    const meta = info.get(fileName.replace(/_/g, ' '))
    const why =
      !meta ? 'no file info'
      : !meta.shared ? 'not on Commons, so probably non-free'
      : !/^image\/(jpeg|png|webp)$/.test(meta.mime ?? '') ? `${meta.mime} is a diagram, not a photo`
      : NOT_A_PHOTO.test(fileName) ? 'a map, crest or flag'
      : meta.restrictions ? `restricted: ${meta.restrictions}`
      : !FREE.test(meta.licence) ? `licence "${meta.licence || 'unknown'}"`
      : null
    if (why) {
      report.rejected.push(`${topic}/${name}: ${fileName} — ${why}`)
      continue
    }

    // One download, cut to a 640 card for the reveal and a 160 tile for the
    // summary grid. Both are cropped to 4:3 so the grid does not go ragged.
    try {
      const src = await download(url)
      await sharp(src).resize(640, 480, { fit: 'cover' }).webp({ quality: 78 })
        .toFile(resolve(dir, `${code}.webp`))
      await sharp(src).resize(160, 120, { fit: 'cover' }).webp({ quality: 72 })
        .toFile(resolve(dir, 't', `${code}.webp`))
    } catch (err) {
      report.rejected.push(`${topic}/${name}: ${fileName} — ${err.message}`)
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

for (const [label, list] of [
  ['no article', report.noArticle],
  ['no lead image', report.noImage],
  ['rejected', report.rejected],
]) {
  if (!list.length) continue
  console.log(`\n${label}:`)
  for (const line of list) console.log(`    ${line}`)
}

// A broken API would otherwise quietly empty every manifest.
if (report.used < 100) {
  console.error(`\nOnly ${report.used} photos — expected well over 100. Refusing to write that.`)
  process.exit(1)
}
console.log(`\nOK  ${report.used} photos`)
