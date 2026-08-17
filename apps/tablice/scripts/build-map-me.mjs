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

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { key, toLatin } from '@kviz/build/serbian'
import { overpass, query, source, setApp } from '@kviz/build/sources'
import { featuresOf } from '@kviz/build/osm'
import { fail, lettersMatch, mergeAreas, writeAreas } from '@kviz/build/areas'

setApp(import.meta.url)
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WIKI =
  'https://sr.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Регистарске ознаке у Црној Гори') +
  '&action=raw'

/** Montenegro's real area, as the sanity check. */
const AREA_KM2 = 13812

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

if (missing.length) fail('codes with no boundary', missing)

// Every municipality must have a code, or the map has a hole in it.
const claimed = new Set(assigned.map((a) => a.feature))
const orphans = [...units.values()].filter((f) => !claimed.has(f))
if (orphans.length) fail('municipalities belong to no code', orphans.map((f) => f.properties.name))

const mismatched = assigned.filter(({ code, name }) => !lettersMatch(code, name))
if (mismatched.length) {
  fail('codes whose letters do not come from their municipality',
    mismatched.map(({ code, name }) => `${code} -> ${name}`))
}

// --- merge and write ----------------------------------------------------------

const { features, thinned } = mergeAreas(assigned, (code) => {
  const { name } = assigned.find((a) => a.code === code)
  return { name, covers: [] }
})
const { count, summary } = writeAreas(app, 'crnagora', features, { expectKm2: AREA_KM2 })

console.log(`\nOK  ${count} registration areas`)
console.log(`    ${thinned}`)
console.log(`    ${summary}`)
