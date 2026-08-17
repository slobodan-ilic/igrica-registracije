// Builds data/slovenija.json: one merged polygon per Slovenian registration
// area.
//
// Slovenia took more work than its neighbours, because its eleven codes are
// defined over the 58 *upravne enote* and nothing maps those directly:
//
//   - OSM has 11 of the 58 as boundary relations, and no more.
//   - geoBoundaries has the 212 občine, but with the Slovenian diacritics
//     mangled (Škocjan arrives as "Ckocjan"), so nothing can be matched to it;
//     OSM carries them correctly named and tagged with their ISO code.
//   - sl.wikipedia's article on the units gives the občine for only 31 of them;
//     the other 27 list their settlements instead.
//   - Wikidata has no items for them; the state's legal register is a
//     JavaScript shell with no text in the response.
//
// So the missing half is derived: each of those 27 units' settlements is placed
// inside an občina by point-in-polygon, and an občina goes to whichever unit
// most of its settlements came from. The majority matters — a handful of
// Slovenian settlement names repeat around the country, and a single stray hit
// would otherwise hand a municipality to a unit on the other side of it. Real
// members are backed by six settlements or more; the strays come in at one.
//
// The result is then checked outright: all 212 občine must be assigned, each to
// exactly one unit.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import polygonClipping from 'polygon-clipping'
import { key, toLatin } from '@kviz/build/serbian'
import { json, overpass, query, source, setApp } from '@kviz/build/sources'
import { featuresOf, inside } from '@kviz/build/osm'
import { fail, mergeAreas, writeAreas } from '@kviz/build/areas'

setApp(import.meta.url)
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PLATES =
  'https://sl.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Registrske tablice Slovenije') +
  '&action=raw'
const UNITS =
  'https://sl.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Upravne enote Slovenije') +
  '&action=raw'
/** Slovenia's real area, as the sanity check. */
const AREA_KM2 = 20271

/**
 * Slovenia's coastal občine take in the water it claims in the Bay of Piran, so
 * KP comes out with a wedge of open sea attached — which reads as a glitch on
 * the map, widens the frame, and is the very stretch Slovenia and Croatia
 * dispute. The areas are clipped to Natural Earth's land so the map shows land.
 */
const LAND =
  'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_land.json'

/**
 * The article contradicts itself once: both Grosuplje and Litija list Ivančna
 * Gorica among the občine they cover. Their own stated areas settle it —
 * Grosuplje gives 464 km², exactly Grosuplje (134) plus Dobrepolje (103) plus
 * Ivančna Gorica (227); Litija gives 321.97, exactly Litija (227) plus Šmartno
 * pri Litiji (95), with no room for it. So the mention under Litija is a
 * mistake in the source.
 */
const NOT_IN = { Litija: ['Ivančna Gorica'] }

/** Bilingual names on the coast: "Koper / Capodistria". */
const firstName = (name) => name.split('/')[0].trim()
const norm = (name) => key(toLatin(firstName(name)))

// --- code -> upravne enote ---------------------------------------------------

const platesText = await source('si_wiki.txt', PLATES)
const table = platesText.slice(
  platesText.indexOf('Geografske registracijske oznake'),
  platesText.indexOf('Posebne registrske oznake'),
)

/** code -> { seat, the units it covers } */
const AREAS = new Map()
let current = null
for (const line of table.split('\n')) {
  // "! rowspan=8 | CE – Celje", but a code covering one unit has no rowspan.
  const head = line.match(/^!\s*(?:rowspan="?\d+"?\s*\|\s*)?([A-ZČŠŽ]{2})\s*[–-]\s*(.+?)\s*$/)
  if (head) {
    current = head[1]
    AREAS.set(current, { seat: head[2], units: [] })
    continue
  }
  const unit = line.match(/^\|\s*\[\[(?:Mestna občina|Občina)\s+([^\]|]+)(?:\|[^\]]+)?\]\]\s*$/)
  if (unit && current) AREAS.get(current).units.push(unit[1])
}

const unitCount = [...AREAS.values()].reduce((n, a) => n + a.units.length, 0)
console.log(`${AREAS.size} codes over ${unitCount} upravne enote`)
if (unitCount !== 58) fail('upravne enote parsed, expected 58', [String(unitCount)])

// --- unit -> občine ----------------------------------------------------------

const obcine = featuresOf(await overpass('si_obcine_geom.json', query('slovenija.overpassql')))
if (obcine.length !== 212) fail('občine found, expected 212', [String(obcine.length)])
const obcinaAt = (point) =>
  obcine.find((f) => f.geometry.coordinates.some(([ring]) => inside(point, ring)))?.properties.name

const unitsText = await source('si_ue.txt', UNITS)
const sections = unitsText.split(/^===\s*Upravna enota\s+(.+?)\s*===\s*$/m)

// Settlement coordinates, keyed by name — and only where that name is unique in
// the country, since Slovenia has a great many Brezjes and Gradišč.
const nodes = new Map()
const seen = new Map()
for (const e of (await overpass('si_naselja.json', query('slovenija-naselja.overpassql'))).elements) {
  const n = e.tags?.name
  if (!n) continue
  seen.set(n, (seen.get(n) ?? 0) + 1)
  nodes.set(n, [e.lon, e.lat])
}
for (const [n, count] of seen) if (count > 1) nodes.delete(n)

const unitObcine = new Map()
/** občina -> how many of each unit's settlements landed in it. */
const votes = new Map()
let derived = 0
for (let i = 1; i < sections.length; i += 2) {
  // The heading is the unit's name, sometimes trailed by "s sedežem v …".
  const unit = sections[i].split(/\s+s sedežem\b/)[0].trim()
  const body = sections[i + 1]

  const listed = [
    ...body.split('Naselja')[0].matchAll(/\[\[(?:[Mm]estna )?ob[čc]ina ([^\]|]+)(?:\|[^\]]+)?\]\]/g),
  ].map((m) => m[1])

  if (listed.length) {
    const wrong = new Set((NOT_IN[unit] ?? []).map(norm))
    unitObcine.set(unit, new Set(listed.map(norm).filter((o) => !wrong.has(o))))
    continue
  }

  // No občine given: place this unit's settlements instead, counting how many
  // land in each municipality so the majority can decide later.
  for (const [, name] of body.matchAll(/^\*\s*\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]/gm)) {
    const at = nodes.get(name)
    if (!at) continue
    const obcina = obcinaAt(at)
    if (!obcina) continue
    const k = norm(obcina)
    if (!votes.has(k)) votes.set(k, new Map())
    const tally = votes.get(k)
    tally.set(unit, (tally.get(unit) ?? 0) + 1)
  }
  unitObcine.set(unit, new Set())
  derived++
}

// A municipality the lists named outright is settled; the rest go to whichever
// unit most of their settlements belong to.
const named = new Set([...unitObcine.values()].flatMap((set) => [...set]))
for (const [obcina, tally] of votes) {
  if (named.has(obcina)) continue
  const [best] = [...tally].sort((a, b) => b[1] - a[1])
  unitObcine.get(best[0]).add(obcina)
}
console.log(`${unitObcine.size} units mapped to občine, ${derived} of them derived from settlements`)

// --- check -------------------------------------------------------------------

const owner = new Map()
const contested = []
for (const [unit, set] of unitObcine) {
  for (const o of set) {
    if (owner.has(o) && owner.get(o) !== unit) contested.push(`${o}: ${owner.get(o)} and ${unit}`)
    else owner.set(o, unit)
  }
}
if (contested.length) fail('občine claimed by two units', contested.slice(0, 20))

const unassigned = obcine
  .map((f) => f.properties.name)
  .filter((n) => !owner.has(norm(n)))
if (unassigned.length) fail(`of ${obcine.length} občine belong to no unit`, unassigned)
console.log(`all ${obcine.length} občine assigned, none contested`)

// --- merge -------------------------------------------------------------------

const byNorm = new Map(obcine.map((f) => [norm(f.properties.name), f]))
const assigned = []
const missingUnits = []
for (const [code, { units }] of AREAS) {
  for (const unit of units) {
    const set = unitObcine.get(unit)
    if (!set || !set.size) {
      missingUnits.push(`${code}/${unit}`)
      continue
    }
    for (const o of set) assigned.push({ code, feature: byNorm.get(o) })
  }
}
if (missingUnits.length) fail('units with no občine', missingUnits)

const { features, thinned } = mergeAreas(assigned, (code) => {
  const { seat, units } = AREAS.get(code)
  return {
    name: seat,
    // Shown once answered: the other units the code covers.
    covers: units.filter((u) => u !== seat).slice(0, 12),
  }
})

// --- clip to land -------------------------------------------------------------

const land = (await json('ne_land_10m.geojson', LAND)).features.flatMap((f) =>
  f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates],
)

for (const f of features) {
  const clipped = polygonClipping.intersection(f.geometry.coordinates, land)
  if (clipped.length) f.geometry = { type: 'MultiPolygon', coordinates: clipped }
}

// --- write -------------------------------------------------------------------

const { count, summary } = writeAreas(app, 'slovenija', features, {
  expectKm2: AREA_KM2,
  sortLocale: 'sl',
})

console.log(`\nOK  ${count} registration areas`)
console.log(`    ${thinned}`)
console.log(`    ${summary}`)
