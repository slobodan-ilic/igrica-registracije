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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { key, toLatin } from '@kviz/build/serbian'
import { overpass, query, source, setApp } from '@kviz/build/sources'
import { simplify, sqkm, round } from '@kviz/build/geo'
import { featuresOf, inside } from '@kviz/build/osm'
import { geoCentroid } from 'd3-geo'

setApp(import.meta.url)
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WIKI =
  'https://mk.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Автомобилски регистарски таблички во Македонија') +
  '&action=raw'

/** North Macedonia's real area, as the sanity check. */
const AREA_KM2 = 25713

/** About 150 m — see build-map-hr.mjs for why boundaries are thinned at all. */
const TOLERANCE = 0.0018

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

if (missing.length) {
  console.error(`\n${missing.length} places in the list with no boundary:`)
  for (const m of missing) console.error(`    ${m}`)
  process.exit(1)
}

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
  console.error(`\n${orphans.length} municipalities belong to no code, which would leave holes:`)
  for (const f of orphans) console.error(`    ${f.properties.name}`)
  process.exit(1)
}

/**
 * Every code is built from letters of its region's name, in order: BT from
 * BiTola, SK from SKopje, DH from Demir Hisar. Checking it catches a region
 * paired with the wrong code, which is otherwise invisible.
 */
const inOrder = (code, region) => {
  const r = key(toLatin(region))
  let at = -1
  return [...key(toLatin(code))].every((ch) => (at = r.indexOf(ch, at + 1)) !== -1)
}
const mismatched = [...AREAS].filter(([code, { region }]) => !inOrder(code, region))
if (mismatched.length) {
  console.error('\ncodes whose letters do not come from their region:')
  for (const [code, { region }] of mismatched) console.error(`    ${code} -> ${region}`)
  process.exit(1)
}

// --- merge -------------------------------------------------------------------

// One topology for the whole country, so neighbouring areas share their border
// arc and thin identically rather than parting into a sliver of no-man's-land.
const topo = topology({
  m: { type: 'FeatureCollection', features: assigned.map((a) => a.feature) },
})
const points = (arcs) => arcs.reduce((n, a) => n + a.length, 0)
const before = points(topo.arcs)
topo.arcs = topo.arcs.map((arc) => {
  const thin = simplify(arc, TOLERANCE)
  return thin.length >= 2 ? thin : arc
})
const thinned = `${before} boundary points thinned to ${points(topo.arcs)}`

const features = []
for (const code of [...new Set(assigned.map((a) => a.code))]) {
  const mine = topo.objects.m.geometries.filter((_, i) => assigned[i].code === code)
  const { region, places } = AREAS.get(code)
  features.push({
    type: 'Feature',
    properties: {
      code,
      name: region,
      // Shown once answered: the other municipalities the code covers.
      covers: places
        .map((p) => toLatin(stripPrefix(p)))
        .filter((p) => p !== region)
        .slice(0, 12),
    },
    geometry: merge(topo, mine),
  })
}

// --- write -------------------------------------------------------------------

const out = rewind({ type: 'FeatureCollection', features }, true)
for (const f of out.features) f.geometry.coordinates = round(f.geometry.coordinates)
out.features.sort((a, b) => a.properties.code.localeCompare(b.properties.code, 'mk'))

const total = out.features.reduce((s, f) => s + sqkm(f), 0)
const drift = Math.abs(total - AREA_KM2) / AREA_KM2
if (drift > 0.05) {
  console.error(`Sanity check failed: ${total.toFixed(0)} km2, expected about ${AREA_KM2}`)
  process.exit(1)
}

mkdirSync(resolve(app, 'data'), { recursive: true })
const path = resolve(app, 'data/makedonija.json')
writeFileSync(path, JSON.stringify(out))

console.log(`\nOK  ${out.features.length} registration areas`)
console.log(`    ${thinned}`)
console.log(`    ${total.toFixed(0)} km2 (${(drift * 100).toFixed(1)}% off ${AREA_KM2})`)
console.log(`    ${(readFileSync(path).length / 1024).toFixed(0)} KB`)
