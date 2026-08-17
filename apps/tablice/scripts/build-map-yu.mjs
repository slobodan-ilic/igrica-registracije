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
import { inside } from '@kviz/build/osm'
import { fail } from '@kviz/build/areas'

setApp(import.meta.url)

const WIKI =
  'https://sr.wikipedia.org/w/index.php?title=' +
  encodeURIComponent('Регистарске ознаке у Југославији') +
  '&action=raw'

const BOUNDARIES = (iso) =>
  `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/${iso}/ADM0/geoBoundaries-${iso}-ADM0_simplified.geojson`

/** The same borders unthinned, which is what a town has to be tested against. */
const EXACT = (iso) =>
  `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/${iso}/ADM0/geoBoundaries-${iso}-ADM0.geojson`

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
// Битола in the local script, and the list is in Latin. Every place of that
// name is kept, not the first one found — these names repeat across the
// country, and which Požega or which Korenica is meant is settled below by the
// republic rather than here by whichever the query happened to return first.
const RANK = { city: 3, town: 2, village: 1 }
const byName = new Map()
for (const e of places.elements) {
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
    if (!k) continue
    const found = byName.get(k) ?? []
    if (!found.includes(e)) found.push(e)
    byName.set(k, found)
  }
}

// --- which republic a place is in ---------------------------------------------

/**
 * The successor state a point falls in, which is the republic it was in: none
 * of the internal borders moved. Serbia is the one that takes two, since its
 * autonomous provinces are countries now in Kosovo's case and not in
 * Vojvodina's, but the source lists both republics' towns as SR Srbija.
 */
const OF_REPUBLIC = {
  'SR Slovenija': ['SVN'],
  'SR Hrvatska': ['HRV'],
  'SR BiH': ['BIH'],
  'SR Srbija': ['SRB', 'XKX'],
  'SR Crna Gora': ['MNE'],
  'SR Makedonija': ['MKD'],
}

const shapes = []
for (const iso of REPUBLICS) {
  const fc = await json(`${iso.toLowerCase()}_adm0_exact.geojson`, EXACT(iso))
  const g = fc.features[0].geometry
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]
  shapes.push([iso, polys])
}

/**
 * How far a point is from a border, in kilometres. Longitude is scaled by the
 * latitude so a degree east counts for what it is worth this far north.
 */
const KM = 111.2
const distance = ([x, y], polys) => {
  const k = Math.cos((y * Math.PI) / 180)
  let best = Infinity
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 1; i < ring.length; i++) {
        const [ax, ay] = ring[i - 1]
        const [bx, by] = ring[i]
        const dx = (bx - ax) * k
        const dy = by - ay
        const len = dx * dx + dy * dy
        const t = len ? Math.max(0, Math.min(1, (((x - ax) * k * dx + (y - ay) * dy) / len))) : 0
        best = Math.min(best, Math.hypot((x - ax) * k - t * dx, y - ay - t * dy))
      }
    }
  }
  return best * KM
}

/**
 * The coastline these outlines carry is a coarse one — Slovenia's whole border
 * is a thousand points — so a seaside town can sit a few hundred metres out to
 * sea in them. A point inside no republic at all is therefore given to the
 * nearest, and only when it is close enough that the coastline is the obvious
 * explanation. It cannot rescue a wrong town: Serbia's Požega is squarely
 * inside Serbia, so asking for the Croatian one still finds nothing.
 */
const SLACK_KM = 5

const offshore = []
const placedIn = new Map()
const republicOf = (node) => {
  if (placedIn.has(node)) return placedIn.get(node)
  const at = [node.lon, node.lat]
  // A polygon holds a point when its outer ring does and none of its holes do.
  let iso =
    shapes.find(([, polys]) =>
      polys.some(([outer, ...holes]) => inside(at, outer) && !holes.some((h) => inside(at, h))),
    )?.[0] ?? null

  if (!iso) {
    const [nearest, km] = shapes
      .map(([id, polys]) => [id, distance(at, polys)])
      .sort((a, b) => a[1] - b[1])[0]
    if (km <= SLACK_KM) {
      iso = nearest
      offshore.push(`${node.tags.name} sits ${(km * 1000).toFixed(0)} m outside ${iso}'s coastline`)
    }
  }

  placedIn.set(node, iso)
  return iso
}

const missing = []
const ambiguous = []
const features = []
const seen = new Map()

for (const { code, town, republic } of CODES) {
  const today = RENAMED[town] ?? ALSO_KNOWN[town] ?? town
  const wanted = OF_REPUBLIC[republic]
  if (!wanted) fail('republics the code list names that this build does not know', [republic])

  // Only places in the right republic, then the largest of those: it keeps Bor
  // the town rather than some hamlet of the same name next door.
  const here = (byName.get(key(toLatin(today))) ?? [])
    .filter((n) => wanted.includes(republicOf(n)))
    .sort((a, b) => (RANK[b.tags.place] ?? 0) - (RANK[a.tags.place] ?? 0))

  const node = here[0]
  if (!node) {
    const elsewhere = (byName.get(key(toLatin(today))) ?? [])
      .map((n) => republicOf(n) ?? 'outside the country')
      .join(', ')
    missing.push(
      `${code} ${town}${today === town ? '' : ` (${today})`} in ${republic}` +
        (elsewhere ? ` — found only in ${elsewhere}` : ''),
    )
    continue
  }
  // Two places of one name and one size in one republic: nothing in the data
  // says which is meant, so it is not for the build to pick.
  if (here[1] && RANK[here[1].tags.place] === RANK[node.tags.place]) {
    ambiguous.push(
      `${code} ${today} in ${republic}: ` +
        here
          .filter((n) => RANK[n.tags.place] === RANK[node.tags.place])
          .map((n) => `${n.lat.toFixed(3)},${n.lon.toFixed(3)}`)
          .join(' and '),
    )
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

if (missing.length) fail('codes whose town could not be placed in its own republic', missing)
if (ambiguous.length) fail('codes whose town could be either of two places', ambiguous)

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
