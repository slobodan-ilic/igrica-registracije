// Builds src/data/rivers.json (answerable river lines) and src/data/outline.json
// (Serbia's silhouette, drawn underneath as context).
//
// Sources:
//   - River courses: OpenStreetMap via Overpass, waterway=river inside Serbia (ODbL 1.0)
//   - Outline: geoBoundaries SRB + XKX ADM2, merged (OSM-derived, ODbL 1.0)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { toLatin, slug } from './lib/serbian.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const CACHE = resolve(root, 'scripts/.cache')

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
}

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

const read = (name) => {
  const path = resolve(CACHE, name)
  if (!existsSync(path)) throw new Error(`missing ${name} — see scripts/README`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Douglas–Peucker. OSM traces rivers far finer than this map can show. */
function simplify(points, tolerance) {
  if (points.length < 3) return points
  const sqTol = tolerance * tolerance
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]

  while (stack.length) {
    const [first, last] = stack.pop()
    let index = -1
    let maxSq = sqTol
    const [ax, ay] = points[first]
    const [bx, by] = points[last]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy

    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i]
      let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0
      t = Math.max(0, Math.min(1, t))
      const ex = ax + t * dx - px
      const ey = ay + t * dy - py
      const sq = ex * ex + ey * ey
      if (sq > maxSq) {
        index = i
        maxSq = sq
      }
    }
    if (index > 0) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

const KM = ([x1, y1], [x2, y2]) => Math.hypot((x1 - x2) * 80, (y1 - y2) * 111)
const lengthOf = (line) => line.reduce((s, p, i) => (i ? s + KM(line[i - 1], p) : 0), 0)
/** Every 4th point is plenty for proximity tests and keeps this O(n^2) cheap. */
const thin = (line) => line.filter((_, i) => i % 4 === 0 || i === line.length - 1)

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

const osm = read('rivers_osm.json')
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
      },
      geometry: { type: 'MultiLineString', coordinates: lines },
    }
  })

// --- outline -----------------------------------------------------------------

const land = {
  type: 'FeatureCollection',
  features: [...read('srb_adm2.geojson').features, ...read('xkx_adm2.geojson').features],
}
const topo = topology({ m: land }, 1e5)
const outline = rewind(
  {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { code: 'srbija', name: 'Srbija', covers: [] },
        geometry: merge(topo, topo.objects.m.geometries),
      },
    ],
  },
  true,
)
const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4)
outline.features[0].geometry.coordinates = round(outline.features[0].geometry.coordinates)

mkdirSync(resolve(root, 'src/data'), { recursive: true })
const out = { type: 'FeatureCollection', features: rivers }
writeFileSync(resolve(root, 'src/data/rivers.json'), JSON.stringify(out))
writeFileSync(resolve(root, 'src/data/outline.json'), JSON.stringify(outline))

const points = rivers.reduce(
  (n, f) => n + f.geometry.coordinates.reduce((m, l) => m + l.length, 0),
  0,
)
console.log(`OK  ${rivers.length} rivers, ${points} points after simplifying`)
console.log(`    rivers ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`)
console.log(`    outline ${(JSON.stringify(outline).length / 1024).toFixed(0)} KB`)
