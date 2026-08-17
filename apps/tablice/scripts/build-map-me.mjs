// Builds data/crnagora.json: one polygon per Montenegrin registration area.
//
// Sources:
//   - Codes: sr.wikipedia's table, one row per code.
//   - Boundaries: OpenStreetMap admin_level=6 relations — Montenegro's 25
//     municipalities.
//
// The simplest of the three: every municipality has its own code and every code
// covers exactly one municipality, so there is nothing to group. The borders are
// still thinned through a shared topology so neighbours cannot part company.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { key, toLatin } from '@kviz/build/serbian'
import { overpass, query, source, setApp } from '@kviz/build/sources'
import { simplify, sqkm, round } from '@kviz/build/geo'
import { featuresOf } from '@kviz/build/osm'

setApp(import.meta.url)
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WIKI =
  'https://sr.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Регистарске ознаке у Црној Гори') +
  '&action=raw'

/** Montenegro's real area, as the sanity check. */
const AREA_KM2 = 13812

/** About 150 m — see build-map-hr.mjs for why boundaries are thinned at all. */
const TOLERANCE = 0.0018

/**
 * OSM names each unit by what it is: most are an opština, Podgorica is the
 * capital and Cetinje the old royal one. Ulcinj carries both its Montenegrin
 * and Albanian name in the same tag.
 */
const stripPrefix = (name) =>
  name.replace(/^(Opština|Opstina|Glavni grad|Prijestolnica|Општина)\s+/i, '').trim()
const firstName = (name) => name.split(/\s+-\s+/)[0].trim()
const norm = (name) => key(toLatin(firstName(stripPrefix(name))))

// --- the codes ---------------------------------------------------------------

const wikitext = await source('me_wiki.txt', WIKI)

/** code -> the municipality it belongs to, in Latin. */
const AREAS = new Map()
for (const row of wikitext.slice(wikitext.indexOf('{|')).split('\n|-')) {
  // Codes are wrapped in -{ }-, the marker that keeps them out of sr.wikipedia's
  // script conversion.
  const m = row.match(/'''-\{([A-ZČŠŽĆĐ]{2})\}-'''\s*\|\|\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
  if (!m) continue
  AREAS.set(m[1], toLatin(stripPrefix(m[3] ?? m[2]).replace(/\s*\([^)]*\)\s*$/, '')))
}
console.log(`${AREAS.size} codes`)

// --- boundaries --------------------------------------------------------------

const osm = await overpass('me_adm6_geom.json', query('crnagora.overpassql'))
const units = new Map()
for (const feature of featuresOf(osm)) units.set(norm(feature.properties.name), feature)
console.log(`${units.size} municipalities assembled`)

const missing = []
const assigned = []
for (const [code, name] of AREAS) {
  const unit = units.get(norm(name))
  if (!unit) {
    missing.push(`${code}/${name}`)
    continue
  }
  assigned.push({ code, name, feature: unit })
}

if (missing.length) {
  console.error(`\n${missing.length} codes with no boundary:`)
  for (const m of missing) console.error(`    ${m}`)
  process.exit(1)
}

// Every municipality must have a code, or the map has a hole in it.
const claimed = new Set(assigned.map((a) => a.feature))
const orphans = [...units.values()].filter((f) => !claimed.has(f))
if (orphans.length) {
  console.error(`\n${orphans.length} municipalities belong to no code:`)
  for (const f of orphans) console.error(`    ${f.properties.name}`)
  process.exit(1)
}

/** The code's letters must come from its municipality: PG from PodGorica. */
const inOrder = (code, name) => {
  const n = key(toLatin(name))
  let at = -1
  return [...key(toLatin(code))].every((ch) => (at = n.indexOf(ch, at + 1)) !== -1)
}
const mismatched = assigned.filter(({ code, name }) => !inOrder(code, name))
if (mismatched.length) {
  console.error('\ncodes whose letters do not come from their municipality:')
  for (const { code, name } of mismatched) console.error(`    ${code} -> ${name}`)
  process.exit(1)
}

// --- merge -------------------------------------------------------------------

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

const features = assigned.map(({ code, name }, i) => ({
  type: 'Feature',
  properties: { code, name, covers: [] },
  geometry: merge(topo, [topo.objects.m.geometries[i]]),
}))

// --- write -------------------------------------------------------------------

const out = rewind({ type: 'FeatureCollection', features }, true)
for (const f of out.features) f.geometry.coordinates = round(f.geometry.coordinates)
out.features.sort((a, b) => a.properties.code.localeCompare(b.properties.code, 'sr'))

const total = out.features.reduce((s, f) => s + sqkm(f), 0)
const drift = Math.abs(total - AREA_KM2) / AREA_KM2
if (drift > 0.05) {
  console.error(`Sanity check failed: ${total.toFixed(0)} km2, expected about ${AREA_KM2}`)
  process.exit(1)
}

mkdirSync(resolve(app, 'data'), { recursive: true })
const path = resolve(app, 'data/crnagora.json')
writeFileSync(path, JSON.stringify(out))

console.log(`\nOK  ${out.features.length} registration areas`)
console.log(`    ${thinned}`)
console.log(`    ${total.toFixed(0)} km2 (${(drift * 100).toFixed(1)}% off ${AREA_KM2})`)
console.log(`    ${(readFileSync(path).length / 1024).toFixed(0)} KB`)
