// Geometry helpers shared by the dataset builds.

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoArea } from 'd3-geo'
import rewind from '@mapbox/geojson-rewind'
import { APP } from './sources.mjs'

const EARTH_KM = 6371

/** Square kilometres of a GeoJSON feature. */
export const sqkm = (feature) => geoArea(feature) * EARTH_KM * EARTH_KM

/** ~11 m precision — far below anything this map renders, and half the bytes. */
export const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4)

/**
 * Douglas–Peucker. Sources trace coastlines and rivers far finer than a map of
 * a whole country can show.
 */
export function simplify(points, tolerance) {
  if (points.length < 3) return points
  const sqTol = tolerance * tolerance
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]

  while (stack.length) {
    const [first, last] = stack.pop()
    let index = -1
    let furthest = sqTol
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
      const off = ex * ex + ey * ey
      if (off > furthest) {
        index = i
        furthest = off
      }
    }
    if (index > 0) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/**
 * Write a dataset to src/data.
 *
 * Winding is normalised on the way out: most sources hand back clockwise
 * exterior rings, which d3-geo reads spherically as "everything except this
 * shape" — the symptom is a map flooded with one colour. `expectKm2` is a
 * guard against silently losing or double-counting geometry.
 */
export function writeData(name, features, { expectKm2, tolerance = 0.06 } = {}) {
  // Winding is decided at full precision and only then rounded: rounding first
  // can flip the signed area of a near-degenerate ring, which flips rewind's
  // verdict and turns a hole into fill.
  const out = rewind({ type: 'FeatureCollection', features }, true)
  for (const f of out.features) {
    if (f.geometry?.coordinates) f.geometry.coordinates = round(f.geometry.coordinates)
  }

  if (expectKm2) {
    const total = out.features.reduce((s, f) => s + sqkm(f), 0)
    const drift = Math.abs(total - expectKm2) / expectKm2
    if (drift > tolerance) {
      console.error(
        `Sanity check failed: ${total.toFixed(0)} km2, expected about ${expectKm2}`,
      )
      process.exit(1)
    }
  }

  mkdirSync(resolve(APP, 'data'), { recursive: true })
  const path = resolve(APP, `data/${name}.json`)
  const text = JSON.stringify(out)
  writeFileSync(path, text)
  return { out, kb: text.length / 1024 }
}
