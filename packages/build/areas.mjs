// The parts every registration-area build does the same way.
//
// Each country's script does its own thing to work out which municipalities a
// code covers — the sources differ wildly — but from there on the work is
// identical: merge them, thin the borders, check the total against the
// country's real area, and write.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { key, toLatin } from './serbian.mjs'
import { simplify, sqkm, round } from './geo.mjs'

/** About 150 m. Finer than any of these maps can show — a country is drawn a
 *  few hundred pixels wide, so one pixel is already most of a kilometre. */
export const TOLERANCE = 0.0018

/**
 * A code's letters are taken from its town's name, in order: ST from SpliT, ČK
 * from ČaKovec, PG from PodGorica. Checking it catches a code paired with the
 * wrong place, which is otherwise invisible on the map — it was how ST came to
 * be labelled Hvar.
 */
export function lettersMatch(code, name) {
  const n = key(toLatin(name))
  let at = -1
  return [...key(toLatin(code))].every((ch) => (at = n.indexOf(ch, at + 1)) !== -1)
}

/** Stop the build, listing what went wrong. */
export function fail(what, lines) {
  console.error(`\n${lines.length} ${what}:`)
  for (const line of lines) console.error(`    ${line}`)
  process.exit(1)
}

/**
 * Merge each code's municipalities into one shape.
 *
 * One topology for the whole country, not one per code: neighbouring areas are
 * then built from the very same arc, so thinning moves both identically and
 * cannot pull their shared border apart into a sliver of no-man's-land. The
 * arcs are thinned rather than the finished rings for exactly that reason.
 *
 * `assigned` is one entry per municipality: its code and its feature.
 */
export function mergeAreas(assigned, describe) {
  const topo = topology({
    m: { type: 'FeatureCollection', features: assigned.map((a) => a.feature) },
  })

  const points = (arcs) => arcs.reduce((n, a) => n + a.length, 0)
  const before = points(topo.arcs)
  topo.arcs = topo.arcs.map((arc) => {
    const thin = simplify(arc, TOLERANCE)
    return thin.length >= 2 ? thin : arc
  })

  const features = []
  for (const code of [...new Set(assigned.map((a) => a.code))]) {
    const mine = topo.objects.m.geometries.filter((_, i) => assigned[i].code === code)
    features.push({
      type: 'Feature',
      properties: { code, ...describe(code) },
      geometry: merge(topo, mine),
    })
  }

  return {
    features,
    thinned: `${before} boundary points thinned to ${points(topo.arcs)}`,
  }
}

/**
 * Normalise the winding, round the coordinates, check the total against the
 * country's real area, and write. The area check is the guard that catches a
 * whole region quietly going missing.
 */
export function writeAreas(app, name, features, { expectKm2, sortLocale = 'sr', tolerance = 0.05 }) {
  const out = rewind({ type: 'FeatureCollection', features }, true)
  for (const f of out.features) f.geometry.coordinates = round(f.geometry.coordinates)
  out.features.sort((a, b) => a.properties.code.localeCompare(b.properties.code, sortLocale))

  const total = out.features.reduce((s, f) => s + sqkm(f), 0)
  const drift = Math.abs(total - expectKm2) / expectKm2
  if (drift > tolerance) {
    console.error(`Sanity check failed: ${total.toFixed(0)} km2, expected about ${expectKm2}`)
    process.exit(1)
  }

  mkdirSync(resolve(app, 'data'), { recursive: true })
  const path = resolve(app, `data/${name}.json`)
  writeFileSync(path, JSON.stringify(out))

  return {
    count: out.features.length,
    summary:
      `${total.toFixed(0)} km2 (${(drift * 100).toFixed(1)}% off ${expectKm2})\n` +
      `    ${(readFileSync(path).length / 1024).toFixed(0)} KB`,
  }
}
