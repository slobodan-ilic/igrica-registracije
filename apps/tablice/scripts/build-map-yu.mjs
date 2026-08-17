// Builds data/jugoslavija.json: the towns that held a registration code in the
// SFRJ, as points, as the map stood in the mid-1980s.
//
// Sources:
//   - Codes: sr.wikipedia's table of code, town and republic.
//   - Coordinates: OpenStreetMap place nodes.
//   - Outline: the six republics' present-day borders, merged — which is the
//     country's border, since none of it moved.
//
// This one is points rather than areas, and deliberately so. The codes were
// issued over groups of opštine, and which opština belonged to which code in
// 1990 is not published anywhere that can be relied on. Guessing it — nearest
// town, say — would be inventing a map. The towns themselves are exact, so the
// quiz asks for the town.
//
// Ten of them no longer exist under the name they had. That is half the point
// of the thing, so they are listed here with what they are called now.

import { key, toLatin } from '@kviz/build/serbian'
import { json, overpass, query, source, setApp } from '@kviz/build/sources'
import { simplify, writeData } from '@kviz/build/geo'
import { fail } from '@kviz/build/areas'

setApp(import.meta.url)

const WIKI =
  'https://sr.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Регистарске ознаке у Југославији') +
  '&action=raw'

const BOUNDARIES = (iso) =>
  `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/${iso}/ADM0/geoBoundaries-${iso}-ADM0_simplified.geojson`

/** The successor states. Together they are the SFRJ, border for border. */
const REPUBLICS = ['SVN', 'HRV', 'BIH', 'SRB', 'MNE', 'MKD', 'XKX']

/**
 * The towns whose names have changed since 1990, and what to look for on a
 * present-day map. Six were named for Tito; the rest were renamed as the
 * country came apart or dropped a regional qualifier.
 */
const RENAMED = {
  Ivangrad: 'Berane',
  'Podravska Slatina': 'Slatina',
  'Slavonska Požega': 'Požega',
  Svetozarevo: 'Jagodina',
  'Titov Drvar': 'Drvar',
  Titograd: 'Podgorica',
  'Titova Korenica': 'Korenica',
  'Titova Mitrovica': 'Kosovska Mitrovica',
  'Titovo Užice': 'Užice',
  'Titov Veles': 'Veles',
}

/** Serbo-Croat forms the map may not carry. */
const ALSO_KNOWN = { Bitolj: 'Bitola' }

// --- the codes ---------------------------------------------------------------

const wikitext = await source('yu_wiki.txt', WIKI)
const table = wikitext.slice(
  wikitext.indexOf('{|'),
  wikitext.indexOf('== Registarske oznake država naslednica'),
)

const ALL = []
for (const row of table.split(/\n\|-/)) {
  const m = row.match(
    /!\s*(?:-\{)?([A-ZČĆŽŠĐ]{2})(?:\}-)?\s*\n\|\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*\n\|\s*(SR [^\n|]+?|SAP [^\n|]+?)\s*\n([^]*)$/,
  )
  if (!m) continue
  ALL.push({
    code: m[1],
    town: (m[3] ?? m[2]).trim(),
    republic: m[4].trim(),
    note: m[5].replace(/[|'\n]/g, ' ').trim(),
  })
}

/**
 * The year this map is a picture of. The mid-eighties is when the country was
 * most itself and the names are at their best: Titova Mitrovica was only called
 * that between 1981 and 1989, so a snapshot taken in 1990 would miss it and
 * take the dull Kosovska Mitrovica instead.
 */
const SNAPSHOT = 1985

/**
 * Which name a town had then, decided by the dates the source itself gives
 * rather than by taste. A note reading "od 1992 se zove Berane" means the row's
 * own name was still current; one reading "od 1989 Kosovska Mitrovica" means
 * that row had already been replaced by then.
 */
const renamedFrom = (note) => Number(note.match(/od (\d{4})/)?.[1] ?? 0)
const supersededBy1990 = (c) => {
  const year = renamedFrom(c.note)
  return year > 0 && year <= SNAPSHOT
}

const CODES = []
const dropped = []
for (const entry of ALL) {
  if (supersededBy1990(entry)) {
    dropped.push(`${entry.code} ${entry.town} — ${entry.note}`)
    continue
  }
  // Where two surviving codes name the same town, the one the source dates
  // past the snapshot wins over the one it does not date at all.
  const clash = CODES.find((c) => (RENAMED[c.town] ?? c.town) === (RENAMED[entry.town] ?? entry.town))
  if (clash) {
    const keep = renamedFrom(entry.note) > renamedFrom(clash.note) ? entry : clash
    const lose = keep === entry ? clash : entry
    dropped.push(`${lose.code} ${lose.town} — same town as ${keep.code} ${keep.town}`)
    if (keep === entry) CODES[CODES.indexOf(clash)] = entry
    continue
  }
  CODES.push(entry)
}

console.log(`${ALL.length} codes listed; ${CODES.length} were current in ${SNAPSHOT}`)
for (const d of dropped) console.log(`    not in ${SNAPSHOT}: ${d}`)

// --- where those towns are ----------------------------------------------------

const places = await overpass('yu_places.json', query('jugoslavija.overpassql'))

// Keyed by every name a place carries, transliterated: OSM holds Ужице and
// Битола in the local script, and the list is in Latin.
const RANK = { city: 3, town: 2, village: 1 }
const byName = new Map()
for (const e of [...places.elements].sort((a, b) => (RANK[b.tags.place] ?? 0) - (RANK[a.tags.place] ?? 0))) {
  for (const name of [
    e.tags?.name,
    e.tags?.['name:sr-Latn'],
    e.tags?.['name:sr'],
    e.tags?.['name:hr'],
    e.tags?.['name:bs'],
    e.tags?.int_name,
  ]) {
    if (!name) continue
    const k = key(toLatin(name.split('/')[0].trim()))
    if (k && !byName.has(k)) byName.set(k, e)
  }
}

const missing = []
const features = []
const seen = new Map()

for (const { code, town, republic } of CODES) {
  const today = RENAMED[town] ?? ALSO_KNOWN[town] ?? town
  const node = byName.get(key(toLatin(today)))
  if (!node) {
    missing.push(`${code} ${town}${today === town ? '' : ` (${today})`}`)
    continue
  }

  const at = `${node.lat.toFixed(3)},${node.lon.toFixed(3)}`
  if (seen.has(at)) {
    fail('towns sharing one spot, which would make a marker unclickable',
      [`${code} ${town} and ${seen.get(at)}`])
  }
  seen.set(at, `${code} ${town}`)

  features.push({
    type: 'Feature',
    properties: {
      code,
      name: town,
      // The republic is the hint before you answer; the present-day name is
      // the payoff after.
      covers: RENAMED[town] ? [republic, `danas ${RENAMED[town]}`] : [republic],
    },
    geometry: {
      type: 'Point',
      coordinates: [Math.round(node.lon * 1e4) / 1e4, Math.round(node.lat * 1e4) / 1e4],
    },
  })
}

if (missing.length) fail('codes whose town could not be placed', missing)

features.sort((a, b) => a.properties.code.localeCompare(b.properties.code, 'sr'))

// --- the country's outline ----------------------------------------------------

/**
 * Each republic drawn separately rather than merged into one silhouette. The
 * hint before you answer is which republic a code was in, so the borders are
 * worth seeing — and 1990's map had them. Kosovo appears in its own right, as
 * the autonomous province it was.
 */
const NAMES = {
  SVN: 'SR Slovenija',
  HRV: 'SR Hrvatska',
  BIH: 'SR Bosna i Hercegovina',
  SRB: 'SR Srbija',
  MNE: 'SR Crna Gora',
  MKD: 'SR Makedonija',
  XKX: 'SAP Kosovo',
}

const outline = []
for (const iso of REPUBLICS) {
  const fc = await json(`${iso.toLowerCase()}_adm0.geojson`, BOUNDARIES(iso))
  const g = fc.features[0].geometry
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]
  outline.push({
    type: 'Feature',
    properties: { code: iso, name: NAMES[iso], covers: [] },
    geometry: {
      type: 'MultiPolygon',
      // Drawn behind 125 markers at country scale, so thinned hard: the coast
      // only has to read as the coast.
      coordinates: polys
        .map((poly) => poly.map((ring) => simplify(ring, 0.004)).filter((r) => r.length >= 4))
        .filter((poly) => poly.length),
    },
  })
}

const townsOut = writeData('jugoslavija', features)
const outlineOut = writeData('jugoslavija-outline', outline, { expectKm2: 255800, tolerance: 0.06 })

console.log(`\nOK  ${features.length} towns`)
console.log(`    ${Object.keys(RENAMED).length} of them renamed since`)
console.log(`    towns ${townsOut.kb.toFixed(1)} KB, outline ${outlineOut.kb.toFixed(0)} KB`)
