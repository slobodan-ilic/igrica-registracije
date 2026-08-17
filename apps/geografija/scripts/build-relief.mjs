// Builds src/data/relief.json: Serbia's terrain as vector elevation bands.
//
// Source: AWS Terrain Tiles (terrarium encoding, SRTM/NED-derived, public domain
// / CC-BY depending on region — see registry.opendata.aws/terrain-tiles).
//
// Measured elevation, contoured. Nothing here is drawn by hand or inferred: a
// pixel is high because the DEM says it is.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { contours } from 'd3-contour'
import { setApp, CACHE } from '@kviz/build/sources'
import { simplify, writeData } from '@kviz/build/geo'

// Data and queries resolve inside this app, not the workspace root.
setApp(import.meta.url)

const Z = 9
const BB = [18.55, 41.7, 23.15, 46.3] // lon0, lat0, lon1, lat1

/** Bands chosen to separate the Pannonian plain, the hills, and the massifs. */
const BANDS = [200, 400, 600, 900, 1200, 1500, 1800, 2100]

const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z
const lat2y = (lat, z) =>
  ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
    2) *
  2 ** z
const x2lon = (x, z) => (x / 2 ** z) * 360 - 180
const y2lat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

const X0 = Math.floor(lon2x(BB[0], Z))
const X1 = Math.floor(lon2x(BB[2], Z))
const Y0 = Math.floor(lat2y(BB[3], Z))
const Y1 = Math.floor(lat2y(BB[1], Z))
const W = (X1 - X0 + 1) * 256
const H = (Y1 - Y0 + 1) * 256

async function tile(x, y) {
  const path = resolve(CACHE, `${Z}_${x}_${y}.png`)
  if (!existsSync(path)) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  return PNG.sync.read(readFileSync(path))
}

console.log(`fetching ${(X1 - X0 + 1) * (Y1 - Y0 + 1)} terrain tiles at z${Z}...`)
const grid = new Float32Array(W * H)

for (let ty = Y0; ty <= Y1; ty++) {
  for (let tx = X0; tx <= X1; tx++) {
    const png = await tile(tx, ty)
    const ox = (tx - X0) * 256
    const oy = (ty - Y0) * 256
    for (let py = 0; py < 256; py++) {
      for (let px = 0; px < 256; px++) {
        const i = (py * 256 + px) * 4
        // terrarium: height = (R * 256 + G + B / 256) - 32768
        const h = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768
        grid[(oy + py) * W + ox + px] = h
      }
    }
  }
}

/** A light blur keeps contours from fraying into speckle at band edges. */
function blur(src, w, h, radius = 2) {
  const out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let n = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          sum += src[yy * w + xx]
          n++
        }
      }
      out[y * w + x] = sum / n
    }
  }
  return out
}

const smoothed = blur(grid, W, H)

/** Grid-space area, for dropping specks the map can never show. */
const ringArea = (ring) => {
  let a = 0
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(a / 2)
}

const toLngLat = ([px, py]) => [
  Math.round(x2lon(X0 + px / 256, Z) * 1e4) / 1e4,
  Math.round(y2lat(Y0 + py / 256, Z) * 1e4) / 1e4,
]

const bands = contours()
  .size([W, H])
  .thresholds(BANDS)(smoothed)
  .map((c) => ({
    type: 'Feature',
    properties: { level: c.value },
    geometry: {
      type: 'MultiPolygon',
      coordinates: c.coordinates
        .map((poly) =>
          poly
            // A ring under ~60 grid cells is a speck at any zoom this map allows.
            .filter((ring) => ringArea(ring) > 60)
            .map((ring) => simplify(ring, 4).map(toLngLat))
            .filter((ring) => ring.length >= 4),
        )
        .filter((poly) => poly.length),
    },
  }))
  .filter((f) => f.geometry.coordinates.length)


// d3-contour works in grid space, where y grows downward. Converting to lat/lon
// flips that axis and reverses every ring; writeData normalises the winding.
const { kb } = writeData('relief', bands)

console.log(`OK  ${bands.length} elevation bands from a ${W}x${H} DEM (~220 m/px)`)
for (const f of bands) {
  const rings = f.geometry.coordinates.reduce((n, p) => n + p.length, 0)
  console.log(`    above ${String(f.properties.level).padStart(4)} m — ${rings} rings`)
}
console.log(`    ${kb.toFixed(0)} KB`)
