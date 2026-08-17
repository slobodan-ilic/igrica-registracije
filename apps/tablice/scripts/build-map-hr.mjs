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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { key, toLatin } from '@kviz/build/serbian'
import { overpass, query, source, setApp } from '@kviz/build/sources'
import { simplify, sqkm, round } from '@kviz/build/geo'
import { geoCentroid } from 'd3-geo'

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
 * How far a boundary may be moved when thinning it, in degrees — about 150 m.
 * OSM's administrative geometry is far denser than this map can show: Croatia
 * is drawn some 600px wide, so one pixel is already ~800 m. Straight from OSM
 * the file is 7.4 MB.
 */
const TOLERANCE = 0.0018

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
  // The first bolded link is the town the code is named after.
  const seat = row.match(/'''\[\[([^\]|]+)/)?.[1]
  if (places.length) AREAS.set(code, { seat: stripQualifier(seat ?? places[0]), places })
}
console.log(`${AREAS.size} codes covering ${[...AREAS.values()].reduce((n, a) => n + a.places.length, 0)} places`)

// --- boundaries --------------------------------------------------------------

const osm = await overpass('hr_adm7_geom.json', query('hrvatska.overpassql'))

const same = (a, b) => a[0] === b[0] && a[1] === b[1]

/**
 * OSM hands back a relation as unordered, arbitrarily-directed member ways, so
 * the rings have to be chained together by their endpoints before there is a
 * polygon to speak of.
 */
function assemble(ways) {
  const open = ways.filter((w) => w.length > 1).map((w) => [...w])
  const rings = []
  while (open.length) {
    let ring = open.pop()
    for (let joined = true; joined && !same(ring[0], ring.at(-1)); ) {
      joined = false
      for (let i = 0; i < open.length; i++) {
        const w = open[i]
        if (same(ring.at(-1), w[0])) ring = ring.concat(w.slice(1))
        else if (same(ring.at(-1), w.at(-1))) ring = ring.concat([...w].reverse().slice(1))
        else if (same(ring[0], w.at(-1))) ring = w.slice(0, -1).concat(ring)
        else if (same(ring[0], w[0])) ring = [...w].reverse().slice(0, -1).concat(ring)
        else continue
        open.splice(i, 1)
        joined = true
        break
      }
    }
    if (same(ring[0], ring.at(-1)) && ring.length >= 4) rings.push(ring)
  }
  return rings
}

/** Ray casting, to decide which outer ring a hole belongs to. */
function inside(point, ring) {
  const [x, y] = point
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** Assemble every relation in a response into named features. */
function featuresOf(response) {
  const out = []
  for (const rel of response.elements) {
    const name = rel.tags?.name
    if (!name) continue
    const coords = (role) =>
      rel.members
        .filter((m) => m.type === 'way' && (m.role || 'outer') === role && m.geometry)
        .map((m) => m.geometry.map((p) => [p.lon, p.lat]))
    const outers = assemble(coords('outer'))
    const inners = assemble(coords('inner'))
    if (!outers.length) continue
    // Rewound here, not later: the rings come out of OSM in whatever direction
    // the member ways happened to run, and d3 reads a clockwise ring
    // spherically as "the globe except this", which puts geoCentroid on the
    // far side of the planet and quietly breaks the county lookup below.
    out.push(rewind({
      type: 'Feature',
      properties: { name },
      geometry: {
        type: 'MultiPolygon',
        coordinates: outers.map((o) => [o, ...inners.filter((h) => inside(h[0], o))]),
      },
    }, true))
  }
  return out
}

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

if (missing.length) {
  console.error(`\n${missing.length} places in the list with no boundary:`)
  for (const m of missing) console.error(`    ${m}`)
  process.exit(1)
}

/**
 * One topology for the whole country, rather than one per code. Neighbouring
 * areas then share the very same arc, so quantising cannot pull their common
 * border apart into a sliver of no-man's-land — and the arc is stored once
 * instead of twice.
 */
const topo = topology({
  m: { type: 'FeatureCollection', features: assigned.map((a) => a.feature) },
})

// Thinning the arcs rather than the finished rings is what keeps the borders
// shut: two neighbouring areas are built from the very same arc, so they are
// simplified identically and cannot drift apart into a sliver of no-man's-land.
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
  const geometry = merge(topo, mine)

  // Drop the specks: Croatia has over a thousand islets, and an islet a few
  // hundred metres across is unclickable and only makes the file bigger.
  const kept = geometry.coordinates.filter((poly) => {
    const one = { type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: {} }
    return sqkm(rewind(one, true)) >= MIN_ISLAND_KM2
  })

  const { seat, places } = AREAS.get(code)
  features.push({
    type: 'Feature',
    properties: {
      code,
      name: seat,
      // Shown once answered: the other towns the code covers.
      covers: places.map(stripQualifier).filter((p) => p !== seat).slice(0, 12),
      dropped: geometry.coordinates.length - kept.length,
    },
    geometry: { type: 'MultiPolygon', coordinates: kept.length ? kept : geometry.coordinates },
  })
}

// Anything Croatian still unclaimed would be a hole in the map.
const orphans = municipalities.filter(
  (f) => !claimed.has(f) && countyOf(f)?.endsWith('županija'),
)

// --- write -------------------------------------------------------------------

const out = rewind({ type: 'FeatureCollection', features }, true)
const totalDropped = out.features.reduce((n, f) => n + f.properties.dropped, 0)
for (const f of out.features) {
  delete f.properties.dropped
  f.geometry.coordinates = round(f.geometry.coordinates)
}
out.features.sort((a, b) => a.properties.code.localeCompare(b.properties.code, 'hr'))

const total = out.features.reduce((s, f) => s + sqkm(f), 0)
const drift = Math.abs(total - AREA_KM2) / AREA_KM2
if (drift > 0.05) {
  console.error(`Sanity check failed: ${total.toFixed(0)} km2, expected about ${AREA_KM2}`)
  process.exit(1)
}

mkdirSync(resolve(app, 'data'), { recursive: true })
const path = resolve(app, 'data/hrvatska.json')
writeFileSync(path, JSON.stringify(out))

console.log(`\nOK  ${out.features.length} registration areas`)
console.log(`    ${thinned}`)
console.log(`    ${total.toFixed(0)} km2 (${(drift * 100).toFixed(1)}% off Croatia's ${AREA_KM2})`)
console.log(`    dropped ${totalDropped} islets under ${MIN_ISLAND_KM2} km2`)
if (orphans.length) {
  console.error(`\n${orphans.length} Croatian municipalities belong to no code, which would leave holes:`)
  for (const f of orphans) console.error(`    ${f.properties.name}`)
  process.exit(1)
}
console.log(`    ${(readFileSync(path).length / 1024).toFixed(0)} KB`)
