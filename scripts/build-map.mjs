// Builds src/data/regions.json: one merged polygon per licence-plate registration area.
//
// Sources:
//   - Municipality boundaries: geoBoundaries SRB ADM2 (OSM-derived, ODbL 1.0)
//   - Code -> municipality mapping: sr.wikipedia "Регистарске ознаке у Србији",
//     which cites Правилник о регистрацији моторних и прикључних возила, Прилог 1 (5. мај 2025)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea } from 'd3-geo'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { key, toLatin } from './lib/serbian.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const SCRATCH = process.env.SRC_DIR ?? resolve(root, 'scripts/.cache')

/**
 * Kosovo's municipalities keyed to the registration areas Serbia's list uses.
 * The list predates the current 38-municipality division, so municipalities
 * created since are assigned the code of the one they were split from
 * (noted in brackets).
 */
const KOSOVO = {
  decan: 'ĐA', gjakova: 'ĐA', junik: 'ĐA',                    // Junik [Dečani]
  gjilan: 'GL', kamenica: 'GL', novoberde: 'GL', viti: 'GL',
  kllokot: 'GL',                                              // Klokot [Vitina]
  partesh: 'GL',                                              // Parteš [Gnjilane]
  ranillug: 'GL',                                             // Ranilug [K. Kamenica]
  leposaviq: 'KM', mitrovica: 'KM', northmitrovica: 'KM',     // North Mitrovica [K. Mitrovica]
  skenderaj: 'KM', vushtrri: 'KM', zubinpotok: 'KM', zvecan: 'KM',
  istog: 'PE', klina: 'PE', peja: 'PE',
  drenas: 'PR', fushekosove: 'PR', lipjan: 'PR', obiliq: 'PR',
  podujeva: 'PR', pristina: 'PR',
  gracanica: 'PR',                                            // Gračanica [Priština]
  dragash: 'PZ', prizren: 'PZ', rahovec: 'PZ', suhareka: 'PZ',
  malisheva: 'PZ',                                            // Mališevo [Orahovac]
  mamusha: 'PZ',                                              // Mamuša [Prizren]
  ferizaj: 'UR', kacanik: 'UR', shtime: 'UR', shterpce: 'UR',
  hanielezit: 'UR',                                           // Elez Han [Kačanik]
}

// Municipalities the ADM2 layer models differently than the Правилник does.
const MANUAL = {
  belgrade: 'BG',   // all 17 Belgrade city municipalities are one ADM2 feature
  novisad: 'NS',    // Novi Sad + Petrovaradin are one ADM2 feature
}

// Some code cells are typed in Cyrillic look-alikes (e.g. "КМ").
const CODE_LATIN = { К: 'K', М: 'M', Р: 'P', Е: 'E', А: 'A', В: 'B', С: 'C', Т: 'T', О: 'O', Н: 'H', Х: 'X', Ј: 'J', У: 'U', Г: 'G', З: 'Z', Ђ: 'Đ' }

function parseWikitable(wikitext, fromHeading, toHeading) {
  const start = wikitext.indexOf(fromHeading)
  const end = wikitext.indexOf(toHeading)
  if (start < 0 || end < 0) throw new Error(`could not locate section ${fromHeading}`)
  // Inline "||" separators mean the same thing as a new "|" line.
  const table = wikitext.slice(start, end).replace(/\|\|/g, '\n|')

  const areas = []
  // Rows are "|-" separated; cells begin at line start with "|".
  for (const row of table.split(/\n\|-\n/).slice(1)) {
    const cells = row
      .split(/\n\|(?!\})/)
      .map((c) => c.replace(/^\|/, '').trim())
    if (cells.length < 4) continue

    const code = [...cells[0].replace(/-\{|\}-|'''/g, '').trim()]
      .map((ch) => CODE_LATIN[ch] ?? ch)
      .join('')
    const region = cells[2].replace(/-\{|\}-|'''/g, '').trim()
    if (!/^[A-ZČĆŠŽĐ]{2}$/.test(code)) continue

    const munis = [...cells[3].matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => {
      const [target, display] = m[1].split('|')
      const strip = (s) => s.replace(/^(Градска општина|Општина|Град)\s+/, '').trim()
      return { target: strip(target), display: strip(display ?? target) }
    })
    areas.push({ code, region, latin: toLatin(region), munis })
  }
  return areas
}

const SOURCES = {
  'wiki_raw.txt':
    'https://sr.wikipedia.org/w/index.php?title=%D0%A0%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D0%B0%D1%80%D1%81%D0%BA%D0%B5_%D0%BE%D0%B7%D0%BD%D0%B0%D0%BA%D0%B5_%D1%83_%D0%A1%D1%80%D0%B1%D0%B8%D1%98%D0%B8&action=raw',
  'srb_adm2.geojson':
    'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/SRB/ADM2/geoBoundaries-SRB-ADM2_simplified.geojson',
  'xkx_adm2.geojson':
    'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/XKX/ADM2/geoBoundaries-XKX-ADM2_simplified.geojson',
}

/** Fetch the upstream sources once and cache them next to this script. */
async function source(name) {
  const path = resolve(SCRATCH, name)
  if (existsSync(path)) return readFileSync(path, 'utf8')
  console.log(`fetching ${name}...`)
  const res = await fetch(SOURCES[name])
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const body = await res.text()
  mkdirSync(SCRATCH, { recursive: true })
  writeFileSync(path, body)
  return body
}

const wikitext = await source('wiki_raw.txt')
const geo = JSON.parse(await source('srb_adm2.geojson'))
const kosovoGeo = JSON.parse(await source('xkx_adm2.geojson'))
// One collection, so the shared Serbia/Kosovo border quantises identically.
const allGeo = {
  type: 'FeatureCollection',
  features: [...geo.features, ...kosovoGeo.features],
}
const serbia = parseWikitable(
  wikitext,
  '== Ознаке на стандардним таблицама ==',
  '== Косово и Метохија ==',
)
// Codes Serbia issued for Kosovo and Metohija; no longer issued there since 2023.
const kim = parseWikitable(
  wikitext,
  'Бивше ознаке на Косову и Метохији',
  '== Ознаке које су раније биле у употреби ==',
).map((a) => ({ ...a, kim: true }))
const areas = [...serbia, ...kim]

// --- Assign every ADM2 feature to a code -------------------------------------
const byKey = new Map()
for (const a of areas) {
  for (const m of a.munis) {
    byKey.set(key(m.target), a.code)
    byKey.set(key(m.display), a.code)
  }
}
for (const [k, code] of Object.entries(MANUAL)) byKey.set(k, code)

/** The registration area a municipality belongs to, by either naming. */
const codeFor = (shapeName) => {
  const k = key(shapeName)
  return byKey.get(k) ?? KOSOVO[k] ?? null
}

const assigned = new Map() // code -> features[]
const orphans = []
for (const f of allGeo.features) {
  const code = codeFor(f.properties.shapeName)
  if (!code) {
    orphans.push(f.properties.shapeName)
    continue
  }
  if (!assigned.has(code)) assigned.set(code, [])
  assigned.get(code).push(f)
}

const empty = areas.filter((a) => !assigned.has(a.code)).map((a) => a.code)
if (orphans.length || empty.length) {
  console.error('UNMATCHED municipalities:', orphans)
  console.error('CODES with no geometry:', empty)
  process.exit(1)
}

// --- Merge each area's municipalities into one polygon ------------------------
// Quantising first snaps shared borders so interior arcs cancel on merge.
const topo = topology({ m: allGeo }, 1e5)
const features = areas.map((a) => {
  const objs = topo.objects.m.geometries.filter(
    (g) => codeFor(g.properties.shapeName) === a.code,
  )
  return {
    type: 'Feature',
    properties: {
      code: a.code,
      name: a.latin,
      cyrillic: a.region,
      // Areas Serbia lists for Kosovo and Metohija, kept as a separate set.
      ...(a.kim ? { kim: true } : {}),
      // Other municipalities sharing the code, shown when the player misses.
      // Belgrade's and Novi Sad's own city municipalities are not separate places
      // to a player, so they are left out.
      covers:
        a.code === 'BG'
          ? []
          : a.munis
              .map((m) => toLatin(m.display))
              .filter((n) => key(n) !== key(a.latin) && key(n) !== 'petrovaradin')
              .sort((x, y) => x.localeCompare(y, 'sr')),
    },
    geometry: merge(topo, objs),
  }
})

// Quantising can leave pinhole interior rings where two municipality borders
// failed to cancel. No genuine enclave is possible below the smallest
// municipality (~51 km2), so anything under 20 km2 is an artifact.
const SPHERE = 4 * Math.PI * 6371 * 6371
let dropped = 0
for (const f of features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const rings of polys) {
    for (let i = rings.length - 1; i >= 1; i--) {
      // Winding here is still the source's, so measure both sides of the ring
      // and take the smaller — that is the pinhole's real footprint either way.
      const a = geoArea({ type: 'Polygon', coordinates: [rings[i]] }) * 6371 * 6371
      if (Math.min(a, SPHERE - a) < 20) {
        rings.splice(i, 1)
        dropped++
      }
    }
  }
}

// ~11 m precision is far below what the map renders; it roughly halves the payload.
const round = (v) =>
  Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4
for (const f of features) f.geometry.coordinates = round(f.geometry.coordinates)

// The source data (and so topojson.merge's output) uses clockwise exterior rings.
// d3-geo reads those spherically as "everything except this polygon" and fills the
// whole globe, so flip the winding on the way out.
const out = rewind({ type: 'FeatureCollection', features }, true)

const sqkm = (f) => geoArea(f) * 6371 * 6371
const total = out.features.reduce((s, f) => s + sqkm(f), 0)
// Serbia proper ~77,500 km2 plus Kosovo ~10,900 km2.
if (total < 82000 || total > 95000) {
  console.error(`Sanity check failed: total area ${total.toFixed(0)} km2, expected ~88400`)
  process.exit(1)
}
mkdirSync(resolve(root, 'src/data'), { recursive: true })
writeFileSync(resolve(root, 'src/data/regions.json'), JSON.stringify(out))

const kimCount = features.filter((f) => f.properties.kim).length
console.log(
  `OK  ${features.length} registration areas (${kimCount} for Kosovo and Metohija) ` +
    `from ${allGeo.features.length} municipalities`,
)
console.log(`    dropped ${dropped} pinhole ring(s)`)
console.log(`    ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`)
