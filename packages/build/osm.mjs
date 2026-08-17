// Turning OpenStreetMap boundary relations into GeoJSON.
//
// Overpass returns a relation as unordered, arbitrarily-directed member ways,
// so anything that wants a polygon has to chain them into rings itself.

import rewind from '@mapbox/geojson-rewind'

const same = (a, b) => a[0] === b[0] && a[1] === b[1]

/**
 * OSM hands back a relation as unordered, arbitrarily-directed member ways, so
 * the rings have to be chained together by their endpoints before there is a
 * polygon to speak of.
 */
export function assemble(ways) {
  const open = ways.filter((w) => w.length > 1).map((w) => [...w])
  const rings = []
  while (open.length) {
    let ring = open.pop()
    for (let joined = true; joined && !same(ring[0], ring.at(-1)); ) {
      joined = false
      for (let i = 0; i < open.length; i++) {
        const w = open[i]
        if (same(ring.at(-1), w[0])) ring = ring.concat(w.slice(1))
        else if (same(ring.at(-1), w.at(-1))) ring = ring.concat([...w].reverse().slice(1))
        else if (same(ring[0], w.at(-1))) ring = w.slice(0, -1).concat(ring)
        else if (same(ring[0], w[0])) ring = [...w].reverse().slice(0, -1).concat(ring)
        else continue
        open.splice(i, 1)
        joined = true
        break
      }
    }
    if (same(ring[0], ring.at(-1)) && ring.length >= 4) rings.push(ring)
  }
  return rings
}

/** Ray casting, to decide which outer ring a hole belongs to. */
export function inside(point, ring) {
  const [x, y] = point
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** Assemble every relation in a response into named features. */
export function featuresOf(response) {
  const out = []
  for (const rel of response.elements) {
    const name = rel.tags?.name
    if (!name) continue
    const coords = (role) =>
      rel.members
        .filter((m) => m.type === 'way' && (m.role || 'outer') === role && m.geometry)
        .map((m) => m.geometry.map((p) => [p.lon, p.lat]))
    const outers = assemble(coords('outer'))
    const inners = assemble(coords('inner'))
    if (!outers.length) continue
    // Rewound here, not later: the rings come out of OSM in whatever direction
    // the member ways happened to run, and d3 reads a clockwise ring
    // spherically as "the globe except this", which puts geoCentroid on the
    // far side of the planet and quietly breaks the county lookup below.
    out.push(rewind({
      type: 'Feature',
      properties: { name },
      geometry: {
        type: 'MultiPolygon',
        coordinates: outers.map((o) => [o, ...inners.filter((h) => inside(h[0], o))]),
      },
    }, true))
  }
  return out
}
