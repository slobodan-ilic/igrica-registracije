// Builds src/data/planine.json: Serbia's mountains, as points.
//
// Source: OpenStreetMap natural=peak nodes with an elevation (ODbL 1.0).
//
// A mountain is not a single OSM object, so each one is defined here by a rough
// box and resolved to *the highest peak inside it*. That keeps every coordinate
// and elevation from OSM while the only hand-entered data is an approximate
// region — far safer than typing coordinates, and it fails loudly if two
// mountains ever resolve to the same summit.

import { toLatin, slug } from './lib/serbian.mjs'
import { overpass, source } from './lib/sources.mjs'
import { writeData } from './lib/geo.mjs'

/** name: [lonMin, lonMax, latMin, latMax, peakNameOverride?] */
const MOUNTAINS = {
  Kopaonik: [20.6, 21.05, 43.15, 43.45],
  'Stara planina': [22.3, 23.05, 43.15, 43.55, 'Midžor'],
  Zlatibor: [19.5, 19.95, 43.6, 43.9],
  Tara: [19.2, 19.62, 43.85, 44.08],
  Golija: [20.05, 20.55, 43.2, 43.48],
  Zlatar: [19.6, 19.98, 43.32, 43.55],
  'Suva planina': [21.95, 22.4, 43.05, 43.35],
  Rtanj: [21.78, 22.02, 43.7, 43.87],
  'Fruška gora': [19.35, 20.05, 45.03, 45.28, 'Crveni čot'],
  Avala: [20.45, 20.62, 44.6, 44.76],
  Maljen: [19.88, 20.25, 43.98, 44.22],
  Rudnik: [20.4, 20.72, 44.0, 44.22],
  Cer: [19.35, 19.75, 44.5, 44.72],
  Povlen: [19.6, 19.92, 44.02, 44.28],
  Jastrebac: [21.15, 21.65, 43.28, 43.55],
  Beljanica: [21.55, 21.85, 44.02, 44.18],
  'Deli Jovan': [22.15, 22.45, 44.22, 44.45],
  'Vršačke planine': [21.28, 21.62, 45.02, 45.22],
  Radan: [21.25, 21.72, 42.85, 43.15],
  Kučaj: [21.72, 22.02, 43.85, 44.0],
  Mučanj: [19.98, 20.35, 43.48, 43.72],
  Tupižnica: [22.05, 22.42, 43.65, 43.92],
  // Kosovo and Metohija; both are standard Serbian school geography.
  'Šar-planina': [20.6, 21.2, 42.0, 42.35],
  Prokletije: [20.0, 20.35, 42.45, 42.68, 'Đeravica'],
}

const osm = await overpass('peaks_osm.json', await source('peaks.ql'))

const peaks = osm.elements
  .filter((e) => /^\d+(\.\d+)?$/.test(String(e.tags?.ele ?? '')))
  .map((e) => ({
    name: toLatin(String(e.tags.name).split('/')[0].trim()),
    ele: Math.round(Number(e.tags.ele)),
    lat: e.lat,
    lon: e.lon,
  }))

const seen = new Map()
const features = []

for (const [name, [x0, x1, y0, y1, override]] of Object.entries(MOUNTAINS)) {
  const inside = peaks.filter((p) => p.lon >= x0 && p.lon <= x1 && p.lat >= y0 && p.lat <= y1)
  if (!inside.length) {
    console.error(`NO PEAK found in the box for ${name}`)
    process.exit(1)
  }
  const top = inside.reduce((a, b) => (b.ele > a.ele ? b : a))
  const at = `${top.lat.toFixed(4)},${top.lon.toFixed(4)}`
  if (seen.has(at)) {
    console.error(`${name} and ${seen.get(at)} resolve to the same summit — fix their boxes`)
    process.exit(1)
  }
  seen.set(at, name)

  // The hint is the summit — but some summits carry the mountain's own name
  // (Avala, Beljanica, Deli Jovan, Mučanj), which would hand over the answer.
  // Those fall back to the elevation alone.
  const peak = override ?? top.name
  const leaks = slug(peak).includes(slug(name)) || slug(name).includes(slug(peak))
  features.push({
    type: 'Feature',
    properties: {
      code: slug(name),
      name,
      covers: [leaks ? `${top.ele} m` : `${peak} · ${top.ele} m`],
    },
    geometry: {
      type: 'Point',
      coordinates: [Math.round(top.lon * 1e4) / 1e4, Math.round(top.lat * 1e4) / 1e4],
    },
  })
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'sr'))

const { kb } = writeData('planine', features)

const leaking = features.filter((f) =>
  slug(f.properties.covers[0]).includes(slug(f.properties.name)),
)
if (leaking.length) {
  console.error('hint gives the answer away:', leaking.map((f) => f.properties.name).join(', '))
  process.exit(1)
}

console.log(`OK  ${features.length} mountains, all resolved to distinct summits`)
for (const f of features) {
  console.log(`    ${f.properties.name.padEnd(18)} ${f.properties.covers[0]}`)
}
console.log(`    ${kb.toFixed(1)} KB`)
