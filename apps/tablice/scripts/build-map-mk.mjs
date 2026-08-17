// Builds data/makedonija.json: one merged polygon per North Macedonian
// registration area.
//
// Sources:
//   - Which municipalities each code covers: mk.wikipedia's table, which gives
//     code, region and covered municipalities in one row.
//   - Boundaries: OpenStreetMap admin_level=7 relations — the 80 municipalities
//     the list is written in terms of — plus admin_level=6 for the City of
//     Skopje, which the list names as a single unit under SK.
//
// Names arrive in Cyrillic on both sides and are transliterated for display,
// so the app stays in Latin script like the rest of it.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoCentroid } from 'd3-geo'
import { key, toLatin } from '@kviz/build/serbian'
import { overpass, query, source, setApp } from '@kviz/build/sources'
import { featuresOf, inside } from '@kviz/build/osm'
import { fail, lettersMatch, mergeAreas, writeAreas } from '@kviz/build/areas'

setApp(import.meta.url)
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WIKI =
  'https://mk.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Автомобилски регистарски таблички во Македонија') +
  '&action=raw'

/** North Macedonia's real area, as the sanity check. */
const AREA_KM2 = 25713

/**
 * Where the list and the map spell a municipality differently. The map's
 * spelling is the official one in both cases.
 */
const ALIAS = {
  debrca: 'Дебарца', // the list writes Дебрца
  mavrovoirostuse: 'Маврово и Ростуша', // the list writes Ростуше
}

const stripPrefix = (name) => name.replace(/^(Општина|Град)\s+/, '').trim()
/** OSM sometimes carries two languages in one name: "Демир Хисар/Мургашево". */
const firstName = (name) => name.split('/')[0].trim()
const norm = (name) => {
  const bare = firstName(stripPrefix(name))
  // Keyed on the transliterated form, which is what key() produces.
  const k = key(toLatin(bare))
  return ALIAS[k] ? key(toLatin(ALIAS[k])) : k
}

// --- what each code covers ---------------------------------------------------

const wikitext = await source('mk_wiki.txt', WIKI)
const table = wikitext.slice(
  wikitext.indexOf('Автомобилски регистарски таблички'),
  wikitext.indexOf('Неважечки регистарски кодови'),
)

/** code -> { region, the municipalities it registers } */
const AREAS = new Map()
for (const row of table.split('\n|-')) {
  const m = row.match(/^\s*\|\s*([A-ZČŠŽĆĐ]{2})\s*\|\|\s*([^|]+?)\s*\|\|/)
  if (!m) continue
  // "Општина X" for a municipality, "Град Скопје" for the City of Skopje.
  const places = [...row.matchAll(/\[\[(Општина|Град) ([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(
    (p) => `${p[1]} ${p[2]}`,
  )
  if (!places.length) continue
  AREAS.set(m[1], { region: toLatin(m[2].trim()), places })
}

const referenced = [...AREAS.values()].reduce((n, a) => n + a.places.length, 0)
console.log(`${AREAS.size} codes covering ${referenced} units`)

// --- boundaries --------------------------------------------------------------

const osm = await overpass('mk_adm67_geom.json', query('makedonija.overpassql'))
const units = new Map()
const duplicates = []

for (const feature of featuresOf(osm)) {
  const k = norm(feature.properties.name)
  if (units.has(k)) duplicates.push(feature.properties.name)
  else units.set(k, feature)
}
console.log(`${units.size} boundaries assembled`)
if (duplicates.length) console.log(`    duplicate names ignored: ${duplicates.join(', ')}`)

// --- match -------------------------------------------------------------------

const claimed = new Set()
const missing = []
const assigned = []

for (const [code, { places }] of AREAS) {
  for (const place of places) {
    const unit = units.get(norm(place))
    if (!unit) {
      missing.push(`${code}/${place}`)
      continue
    }
    claimed.add(unit)
    assigned.push({ code, feature: unit })
  }
}

if (missing.length) fail('places in the list with no boundary', missing)

/**
 * The ten municipalities inside the City of Skopje are covered by that one
 * unit, so they are expected to be unclaimed. Anything else unclaimed would be
 * a hole in the map, which on a quiz is a wrong answer rather than a gap.
 */
const skopje = units.get(norm('Град Скопје'))
if (!skopje) {
  console.error('the City of Skopje has no boundary')
  process.exit(1)
}
// Point-in-polygon, not a shared vertex: Čair and Centar sit wholly inside the
// city and touch its outer boundary nowhere at all.
const inSkopje = (f) =>
  skopje.geometry.coordinates.some(([ring]) => inside(geoCentroid(f), ring))

const orphans = [...units.values()].filter(
  (f) => !claimed.has(f) && f !== skopje && !inSkopje(f),
)
if (orphans.length) {
  fail('municipalities belong to no code, which would leave holes',
    orphans.map((f) => f.properties.name))
}

const mismatched = [...AREAS].filter(([code, { region }]) => !lettersMatch(code, region))
if (mismatched.length) {
  fail('codes whose letters do not come from their region',
    mismatched.map(([code, { region }]) => `${code} -> ${region}`))
}

// --- merge and write ----------------------------------------------------------

const { features, thinned } = mergeAreas(assigned, (code) => {
  const { region, places } = AREAS.get(code)
  return {
    name: region,
    // Shown once answered: the other municipalities the code covers.
    covers: places.map((p) => toLatin(stripPrefix(p))).filter((p) => p !== region).slice(0, 12),
  }
})
const { count, summary } = writeAreas(app, 'makedonija', features, {
  expectKm2: AREA_KM2,
  sortLocale: 'mk',
})

console.log(`\nOK  ${count} registration areas`)
console.log(`    ${thinned}`)
console.log(`    ${summary}`)
