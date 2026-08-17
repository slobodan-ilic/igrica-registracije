// Builds src/data/rivers.json (answerable river lines) and src/data/outline.json
// (Serbia's silhouette, drawn underneath as context).
//
// Sources:
//   - River courses: OpenStreetMap via Overpass, waterway=river inside Serbia (ODbL 1.0)
//   - Outline: geoBoundaries SRB + XKX ADM2, merged (OSM-derived, ODbL 1.0)

import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import { toLatin, slug } from '@kviz/build/serbian'
import { setApp, json, overpass, query } from '@kviz/build/sources'
import { simplify, writeData } from '@kviz/build/geo'

// Data and queries resolve inside this app, not the workspace root.
setApp(import.meta.url)

const BOUNDARIES = (iso) =>
  `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/${iso}/ADM2/geoBoundaries-${iso}-ADM2_simplified.geojson`

/**
 * The rivers a Serbian school pupil is expected to know, and where each ends up.
 * The mouth doubles as the hover hint: naming the river would give the answer
 * away, but "uliva se u Savu" rewards knowing the drainage. Written out in full
 * because Serbian needs the accusative here ("u Savu", not "u Sava").
 */
const RIVERS = {
  Dunav: 'uliva se u Crno more',
  Sava: 'uliva se u Dunav',
  Tisa: 'uliva se u Dunav',
  Drina: 'uliva se u Savu',
  'Velika Morava': 'uliva se u Dunav',
  'Zapadna Morava': 'gradi Veliku Moravu',
  'Južna Morava': 'gradi Veliku Moravu',
  Ibar: 'uliva se u Zapadnu Moravu',
  Nišava: 'uliva se u Južnu Moravu',
  Timok: 'uliva se u Dunav',
  'Beli Timok': 'uliva se u Timok',
  'Crni Timok': 'uliva se u Timok',
  Kolubara: 'uliva se u Savu',
  Tamiš: 'uliva se u Dunav',
  Begej: 'uliva se u Tisu',
  Mlava: 'uliva se u Dunav',
  Lim: 'uliva se u Drinu',
  Uvac: 'uliva se u Lim',
  Pek: 'uliva se u Dunav',
  Resava: 'uliva se u Veliku Moravu',
  Jadar: 'uliva se u Drinu',
  Toplica: 'uliva se u Južnu Moravu',
  Rasina: 'uliva se u Zapadnu Moravu',
  Đetinja: 'gradi Zapadnu Moravu',
  // Kosovo and Metohija, where three drainage basins meet: the Sitnica runs to
  // the Black Sea, the Beli Drim to the Adriatic, the Lepenac to the Aegean.
  'Beli Drim': 'gradi Drim',
  Sitnica: 'uliva se u Ibar',
  Lepenac: 'uliva se u Vardar',
  'Binačka Morava': 'gradi Južnu Moravu',
}

/** Asked only when Kosovo and Metohija is switched on. */
const KIM = new Set(['Beli Drim', 'Sitnica', 'Lepenac', 'Binačka Morava'])

/** Rough distance in km; fine at this scale and cheap in a hot loop. */
const KM = ([x1, y1], [x2, y2]) => Math.hypot((x1 - x2) * 80, (y1 - y2) * 111)
const lengthOf = (line) => line.reduce((s, p, i) => (i ? s + KM(line[i - 1], p) : 0), 0)
/** Every 4th point is plenty for proximity tests and keeps this O(n^2) cheap. */
const thin = (line) => line.filter((_, i) => i % 4 === 0 || i === line.length - 1)

/**
 * Rivers do not stop at the border, and neither should the map — but they change
 * name when they cross it. These are the foreign forms of the same river.
 * (Cyrillic spellings need no entry; they transliterate to the Serbian name.)
 */
const ALIASES = {
  Duna: 'Dunav',
  'Dunărea': 'Dunav',
  Donau: 'Dunav',
  Tisza: 'Tisa',
  'Ibër': 'Ibar',
  Ibri: 'Ibar',
  Bega: 'Begej',
  'Timiș': 'Tamiš',
  Timis: 'Tamiš',
  Nishava: 'Nišava',
  // The Bega reaches Serbia as a canal; without it the river arrives in pieces.
  'Begejski kanal': 'Begej',
  // Kosovo's rivers are mapped under their Albanian names.
  'Drini i Bardhë': 'Beli Drim',
  'Drini i Bardhe': 'Beli Drim',
  'Sitnicë': 'Sitnica',
  Lepenc: 'Lepenac',
  Lepenec: 'Lepenac',
  'Morava e Binçës': 'Binačka Morava',
}

/**
 * Two different rivers share this name in the region — there is a Toplica that
 * joins the Kolubara as well as the famous southern one. This is the only real
 * collision, so it is stated outright rather than guessed at from distances.
 */
const ONLY_WITHIN = {
  Toplica: [21.1, 22.0, 42.9, 43.45],
}

/** OSM sometimes carries both languages in one name: "Dunav / Дунав". */
function canonical(raw) {
  for (const part of toLatin(raw).split('/').map((x) => x.trim())) {
    const name = ALIASES[part] ?? part
    if (RIVERS[name]) return name
  }
  return null
}

/** Reports where a river arrives in disconnected pieces, so gaps stay visible. */
function gaps(lines) {
  const pts = lines.map(thin)
  const touching = (a, b) => pts[a].some((p) => pts[b].some((q) => KM(p, q) < 6))

  const clusters = []
  for (let i = 0; i < lines.length; i++) {
    const found = clusters.find((c) => c.some((j) => touching(i, j)))
    if (found) found.push(i)
    else clusters.push([i])
  }
  for (let merged = true; merged; ) {
    merged = false
    outer: for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        if (clusters[a].some((i) => clusters[b].some((j) => touching(i, j)))) {
          clusters[a].push(...clusters[b])
          clusters.splice(b, 1)
          merged = true
          break outer
        }
      }
    }
  }
  return clusters.map((c) => c.reduce((s, i) => s + lengthOf(lines[i]), 0)).sort((x, y) => y - x)
}

// --- rivers ------------------------------------------------------------------

const osm = await overpass('rivers_osm.json', query('rivers.overpassql'))
const byName = new Map()

for (const way of osm.elements) {
  if (!way.geometry?.length) continue
  const raw = way.tags?.name
  if (!raw) continue
  const name = canonical(raw)
  if (!name) continue
  const line = simplify(
    way.geometry.map((p) => [Math.round(p.lon * 1e4) / 1e4, Math.round(p.lat * 1e4) / 1e4]),
    0.0012, // ~120 m, well under one screen pixel at this map's scale
  )
  if (line.length < 2) continue
  const box = ONLY_WITHIN[name]
  if (box && !line.some(([x, y]) => x >= box[0] && x <= box[1] && y >= box[2] && y <= box[3])) {
    continue
  }
  if (!byName.has(name)) byName.set(name, [])
  byName.get(name).push(line)
}

const missing = Object.keys(RIVERS).filter((n) => !byName.has(n))
if (missing.length) {
  console.error('NO GEOMETRY for:', missing.join(', '))
  process.exit(1)
}

const rivers = [...byName.entries()]
  .sort(([a], [b]) => a.localeCompare(b, 'sr'))
  .map(([name, lines]) => {
    const pieces = gaps(lines)
    if (pieces.length > 1) {
      console.log(
        `    ${name}: ${pieces.length} pieces (${pieces.map((k) => k.toFixed(0)).join(' + ')} km) ` +
          '— OSM tags the connecting reach differently',
      )
    }
    return {
      type: 'Feature',
      properties: {
        code: slug(name),
        name,
        // Shown on hover, where the name itself would be the answer.
        covers: [RIVERS[name]],
        ...(KIM.has(name) && { kim: true }),
      },
      geometry: { type: 'MultiLineString', coordinates: lines },
    }
  })

// --- outline -----------------------------------------------------------------

const land = {
  type: 'FeatureCollection',
  features: [
    ...(await json('srb_adm2.geojson', BOUNDARIES('SRB'))).features,
    ...(await json('xkx_adm2.geojson', BOUNDARIES('XKX'))).features,
  ],
}
const topo = topology({ m: land }, 1e5)
const outline = [
  {
    type: 'Feature',
    properties: { code: 'srbija', name: 'Srbija', covers: [] },
    geometry: merge(topo, topo.objects.m.geometries),
  },
]

const riversOut = writeData('rivers', rivers)
const outlineOut = writeData('outline', outline, { expectKm2: 88400 })

const points = rivers.reduce(
  (n, f) => n + f.geometry.coordinates.reduce((m, l) => m + l.length, 0),
  0,
)
console.log(`OK  ${rivers.length} rivers, ${points} points after simplifying`)
console.log(`    rivers ${riversOut.kb.toFixed(0)} KB, outline ${outlineOut.kb.toFixed(0)} KB`)
