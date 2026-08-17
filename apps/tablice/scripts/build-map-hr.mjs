// Builds data/hrvatska.json: one merged polygon per Croatian registration area.
//
// Sources:
//   - Which places each code covers: hr.wikipedia's table, which cites HAK's
//     "Popis registarskih oznaka za RH" (ODbL-irrelevant; text is CC BY-SA).
//   - Boundaries: OpenStreetMap admin_level=7 relations, which are exactly
//     Croatia's 127 gradovi and 428 općine — the units that list is written in.
//
// geoBoundaries was the obvious source and is used for Serbia, but its Croatian
// ADM2 layer is missing eight municipalities outright, misspells several
// (Hvratska Dubica, Veliki Pisanica, Opicina Pirovac) and models the inhabited
// islands as islands rather than as the municipalities on them. A missing
// municipality does not leave a hole — its territory ends up inside a
// neighbour, which on a map quiz means a wrong answer. OSM has all 555.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoCentroid } from 'd3-geo'
import rewind from '@mapbox/geojson-rewind'
import { key, toLatin } from '@kviz/build/serbian'
import { overpass, query, source, setApp } from '@kviz/build/sources'
import { sqkm } from '@kviz/build/geo'
import { featuresOf, inside } from '@kviz/build/osm'
import { fail, lettersMatch, mergeAreas, writeAreas } from '@kviz/build/areas'

setApp(import.meta.url)
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WIKI =
  'https://hr.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Registracijske oznake za cestovna vozila u Hrvatskoj') +
  '&action=raw'

/**
 * Croatia's real area, as the sanity check. The merged areas should come to
 * this, less the sea between the islands.
 */
const AREA_KM2 = 56594

/** An island smaller than this is a speck at any zoom this map allows. */
const MIN_ISLAND_KM2 = 4

/**
 * Where the list and the map name a place differently. Each is a real naming
 * difference, not a guess about which municipality is meant.
 */
const ALIAS = {
  murter: 'murterkornati', // the municipality is Murter-Kornati
}

/**
 * The two places the list leaves genuinely ambiguous: it writes plain
 * "Novigrad" and "Sveta Nedelja" under PU, where the county is what tells them
 * apart from the Zadar and Zagreb ones. Both are Istrian — PU is Pula.
 */
const COUNTY = {
  'PU/Novigrad': 'Istarska županija',
  'PU/Sveta Nedelja': 'Istarska županija',
}

/**
 * Municipalities that exist on the map but not in the list, because they were
 * split off after it was written. Each takes the code of the municipality it
 * came from — the same rule the Serbian build uses for Kosovo's post-1999
 * municipalities. Without them the map has holes.
 */
const SINCE = {
  Funtana: 'PU', // Istria, from Vrsar
  'Tar-Vabriga': 'PU', // Istria, from Poreč
  Vrsi: 'ZD', // Zadar county, from Nin
  Lopar: 'RI', // Primorje-Gorski kotar, on Rab
  Kolan: 'ZD', // Zadar county, on Pag
  Kamanje: 'KA', // Karlovac county, from Ozalj
  Tribunj: 'ŠI', // Šibenik-Knin county, from Vodice
}

// Only the unit type is a prefix. "Otok" is not: there are two municipalities
// actually called Otok, and stripping it would leave nothing to match on.
const stripPrefix = (name) => name.replace(/^(Grad|Općina|Opcina)\s+/i, '').trim()
/** The bracketed part of "Novigrad (Zadarska županija)". */
const qualifierOf = (name) => name.match(/\(([^)]*)\)\s*$/)?.[1] ?? null
const stripQualifier = (name) => name.replace(/\s*\([^)]*\)\s*$/, '').trim()
const norm = (name) => {
  const k = key(toLatin(stripQualifier(stripPrefix(name))))
  return ALIAS[k] ?? k
}

// --- what each code covers ---------------------------------------------------

const wikitext = await source('hr_wiki.txt', WIKI)
const table = wikitext.slice(
  wikitext.indexOf('Registracijske oznake gradova'),
  wikitext.indexOf('Bivše oznake'),
)

/** code -> the places it registers, and the town it is named for. */
const AREAS = new Map()
for (const row of table.split('\n|-')) {
  const code = row.match(/\|\s*'''([A-ZČĆŽŠĐ]{1,2})'''/)?.[1]
  if (!code) continue
  // The raw link target is kept: its bracketed county is what tells the two
  // Novigrads apart, and stripping it here would throw that away.
  const places = [...row.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map((m) => m[1])
  // The town the code is named after is the bolded one — but the list bolds it
  // two different ways, outside the link ('''[[Delnice]]''') and inside it
  // ([[Split|'''Split''']]). Missing the second form silently yields whichever
  // town happens to be first alphabetically, which is how ST became Hvar.
  const seat =
    row.match(/'''\[\[([^\]|]+)(?:\|[^\]]*)?\]\]'''/)?.[1] ??
    row.match(/\[\[([^\]|]+)\|'''[^']+'''\]\]/)?.[1] ??
    row.match(/\[\['''([^\]|']+)'''\]\]/)?.[1]
  if (!places.length) continue
  if (!seat) {
    console.error(`${code}: no town is marked as the one it is named after`)
    process.exit(1)
  }
  AREAS.set(code, { seat: stripQualifier(seat), places })
}
console.log(`${AREAS.size} codes covering ${[...AREAS.values()].reduce((n, a) => n + a.places.length, 0)} places`)

// --- boundaries --------------------------------------------------------------

const osm = await overpass('hr_adm7_geom.json', query('hrvatska.overpassql'))

const counties = featuresOf(await overpass('hr_adm4_geom.json', query('hrvatska-zupanije.overpassql')))
const countyOf = (feature) => {
  const at = geoCentroid(feature)
  return counties.find((c) => c.geometry.coordinates.some(([ring]) => inside(at, ring)))
    ?.properties.name ?? null
}

// Municipalities keyed by name, and — for the handful that share one — by
// "name|county", which is exactly how the registration list tells them apart.
const units = new Map()
const ambiguous = new Set()

const municipalities = featuresOf(osm)
for (const feature of municipalities) {
  const k = norm(feature.properties.name)
  const county = countyOf(feature)
  units.set(`${k}|${norm(county ?? '')}`, feature)
  if (units.has(k)) ambiguous.add(k)
  else units.set(k, feature)
}

// The City of Zagreb is a county in its own right, so it is not an
// admin_level=7 unit at all.
const zagreb = counties.find((c) => c.properties.name === 'Grad Zagreb')
if (!zagreb) {
  console.error('Grad Zagreb missing from the county set')
  process.exit(1)
}
units.set(norm('Zagreb'), zagreb)


console.log(`${municipalities.length} municipalities assembled, plus Zagreb`)
if (ambiguous.size) console.log(`    shared names, resolved by county: ${[...ambiguous].join(', ')}`)

// --- match, merge ------------------------------------------------------------

const claimed = new Set()
const missing = []

/** Which code each municipality belongs to, resolved before any geometry work. */
const assigned = []

for (const [code, { places }] of AREAS) {
  for (const place of places) {
    const k = norm(place)
    const q = COUNTY[`${code}/${stripQualifier(place)}`] ?? qualifierOf(place)
    // A qualified name wins, so "Novigrad (Zadarska županija)" cannot pick up
    // the Istrian Novigrad just because it was seen first.
    const unit = (q && units.get(`${k}|${norm(q)}`)) || (ambiguous.has(k) ? null : units.get(k))
    if (!unit) {
      missing.push(`${code}/${place}`)
      continue
    }
    claimed.add(unit)
    assigned.push({ code, feature: unit })
  }
}

for (const [name, code] of Object.entries(SINCE)) {
  const unit = units.get(norm(name))
  if (!unit) {
    console.error(`SINCE names "${name}", which is not a municipality`)
    process.exit(1)
  }
  claimed.add(unit)
  assigned.push({ code, feature: unit })
}

if (missing.length) fail('places in the list with no boundary', missing)

/**
 * One topology for the whole country, rather than one per code. Neighbouring
 * areas then share the very same arc, so quantising cannot pull their common
 * border apart into a sliver of no-man's-land — and the arc is stored once
 * instead of twice.
 */
const mismatched = [...AREAS].filter(([code, { seat }]) => !lettersMatch(code, seat))
if (mismatched.length) {
  fail('codes whose letters do not come from their town',
    mismatched.map(([code, { seat }]) => `${code} -> ${seat}`))
}

// Anything Croatian still unclaimed would be a hole in the map.
const orphans = municipalities.filter(
  (f) => !claimed.has(f) && countyOf(f)?.endsWith('županija'),
)
if (orphans.length) {
  fail('Croatian municipalities belong to no code, which would leave holes',
    orphans.map((f) => f.properties.name))
}

// --- merge and write ----------------------------------------------------------

const { features, thinned } = mergeAreas(assigned, (code) => {
  const { seat, places } = AREAS.get(code)
  return {
    name: seat,
    // Shown once answered: the other towns the code covers.
    covers: places.map(stripQualifier).filter((p) => p !== seat).slice(0, 12),
  }
})

// Drop the specks: Croatia has over a thousand islets, and one a few hundred
// metres across is unclickable and only makes the file bigger.
let dropped = 0
for (const f of features) {
  const kept = f.geometry.coordinates.filter((poly) => {
    const one = { type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: {} }
    return sqkm(rewind(one, true)) >= MIN_ISLAND_KM2
  })
  dropped += f.geometry.coordinates.length - kept.length
  if (kept.length) f.geometry.coordinates = kept
}

const { count, summary } = writeAreas(app, 'hrvatska', features, {
  expectKm2: AREA_KM2,
  sortLocale: 'hr',
})

console.log(`\nOK  ${count} registration areas`)
console.log(`    ${thinned}`)
console.log(`    dropped ${dropped} islets under ${MIN_ISLAND_KM2} km2`)
console.log(`    ${summary}`)
