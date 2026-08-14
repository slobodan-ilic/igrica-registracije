// Builds src/data/okruzi.json: Serbia's administrative districts.
//
// Sources:
//   - geoBoundaries SRB ADM1 (OSM-derived, ODbL 1.0) — exactly the 24 upravni
//     okruzi plus the City of Belgrade.
//   - geoBoundaries XKX ADM2 (same licence) — Kosovo's 38 municipalities, which
//     are grouped here into the five okruzi Serbia's own division recognises.
//
// The five Kosovo districts are taught in Serbian schools, so they are asked
// like any other — behind the same Kosovo toggle as the plate codes.

import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'
import { slug, toLatin, key } from './lib/serbian.mjs'
import { json } from './lib/sources.mjs'
import { writeData, sqkm } from './lib/geo.mjs'

const ADM1 =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/SRB/ADM1/geoBoundaries-SRB-ADM1_simplified.geojson'
const XKX_ADM2 =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/XKX/ADM2/geoBoundaries-XKX-ADM2_simplified.geojson'

/** English boundary names -> the Serbian name and the district's seat. */
const OKRUZI = {
  Belgrade: ['Grad Beograd', 'Beograd'],
  'Bor District': ['Borski okrug', 'Bor'],
  'Branicevo District': ['Braničevski okrug', 'Požarevac'],
  'Central Banat District': ['Srednjebanatski okrug', 'Zrenjanin'],
  'Jablanica District': ['Jablanički okrug', 'Leskovac'],
  'Kolubara District': ['Kolubarski okrug', 'Valjevo'],
  'Macva District': ['Mačvanski okrug', 'Šabac'],
  'Moravica District': ['Moravički okrug', 'Čačak'],
  'Nisava District': ['Nišavski okrug', 'Niš'],
  'North Backa District': ['Severnobački okrug', 'Subotica'],
  'North Banat District': ['Severnobanatski okrug', 'Kikinda'],
  'Pcinja District': ['Pčinjski okrug', 'Vranje'],
  'Pirot District': ['Pirotski okrug', 'Pirot'],
  'Podunavlje District': ['Podunavski okrug', 'Smederevo'],
  'Pomoravlje District': ['Pomoravski okrug', 'Jagodina'],
  'Rasina District': ['Rasinski okrug', 'Kruševac'],
  'Raska District': ['Raški okrug', 'Kraljevo'],
  'South Backa District': ['Južnobački okrug', 'Novi Sad'],
  'South Banat District': ['Južnobanatski okrug', 'Pančevo'],
  'Sumadija District': ['Šumadijski okrug', 'Kragujevac'],
  'Syrmia District': ['Sremski okrug', 'Sremska Mitrovica'],
  'Toplica District': ['Toplički okrug', 'Prokuplje'],
  'West Backa District': ['Zapadnobački okrug', 'Sombor'],
  'Zajecar District': ['Zaječarski okrug', 'Zaječar'],
  'Zlatibor District': ['Zlatiborski okrug', 'Užice'],
}

/**
 * The five okruzi of Kosovo and Metohija as Serbia's division defines them:
 * name, seat, the municipalities that make them up, and the district's official
 * area in km².
 *
 * Serbia's division predates 1999 and Kosovo's own does not, so the two do not
 * share a municipality list — the boundary layer here carries the 38 present-day
 * municipalities, several of which were carved out of the older ones (Junik out
 * of Dečani, Elez Han out of Kačanik, Gračanica out of Priština, and so on).
 * Each is placed in the okrug its parent belonged to, so the areas below double
 * as a check that the grouping is right.
 *
 * Source: sr.wikipedia "Управни окрузи Србије", itself the Уредба о управним
 * окрузима. Municipalities are named as the boundary layer names them.
 */
const KIM = {
  'Kosovski okrug': ['Priština', 3117,
    ['Drenas', 'Kacanik', 'Han i Elezit', 'Fushe Kosove', 'Lipjan', 'Obiliq',
     'Podujeva', 'Pristina', 'Gracanica', 'Ferizaj', 'Shtime', 'Shterpce']],
  'Kosovskomitrovački okrug': ['Kosovska Mitrovica', 2050,
    ['Vushtrri', 'Zvecan', 'Zubin Potok', 'Mitrovica', 'North Mitrovica',
     'Leposaviq', 'Skenderaj']],
  'Kosovskopomoravski okrug': ['Gnjilane', 1412,
    ['Viti', 'Kllokot', 'Partesh', 'Gjilan', 'Kamenica', 'Ranillug', 'Novoberde']],
  'Pećki okrug': ['Peć', 2450,
    ['Decan', 'Junik', 'Gjakova', 'Istog', 'Klina', 'Peja']],
  'Prizrenski okrug': ['Prizren', 1910,
    ['Dragash', 'Rahovec', 'Prizren', 'Mamusha', 'Suhareka', 'Malisheva']],
}

// Mališevo was assembled in 2000 out of pieces of four older municipalities,
// two of which sat in different okruzi. Its whole 307 km² lands in Prizrenski
// here, which is where most of it came from — the ~140 km² that Pećki loses to
// it is the one place these two divisions cannot be reconciled without drawing
// a boundary that no source provides. Everything else agrees to within 1%.
const KIM_TOLERANCE = 0.07

const adm1 = await json('srb_adm1.geojson', ADM1)
const kosovo = await json('xkx_adm2.geojson', XKX_ADM2)

const unknown = adm1.features.map((f) => f.properties.shapeName).filter((n) => !OKRUZI[n])
if (unknown.length) {
  console.error('UNMAPPED districts:', unknown)
  process.exit(1)
}

const features = adm1.features.map((f) => {
  const [name, seat] = OKRUZI[f.properties.shapeName]
  return {
    type: 'Feature',
    properties: { code: slug(name), name, covers: [seat] },
    geometry: f.geometry,
  }
})

// --- Kosovo and Metohija -----------------------------------------------------

const byName = new Map(
  kosovo.features.map((f) => [key(toLatin(f.properties.shapeName)), f]),
)
const claimed = new Set()
const drift = []

for (const [name, [seat, expectKm2, munis]] of Object.entries(KIM)) {
  const parts = munis.map((m) => {
    const f = byName.get(key(toLatin(m)))
    if (!f) {
      console.error(`UNKNOWN municipality "${m}" in ${name}`)
      process.exit(1)
    }
    claimed.add(key(toLatin(m)))
    return f
  })

  const topo = topology({ m: { type: 'FeatureCollection', features: parts } }, 1e5)
  // Rewound here rather than left to writeData: merge returns clockwise rings,
  // which d3-geo reads as "the globe minus this district" — the area check below
  // would then compare 510 million km² against 3,117 and blame the grouping.
  const feature = rewind({
    type: 'Feature',
    properties: { code: slug(name), name, covers: [seat], kim: true },
    geometry: merge(topo, topo.objects.m.geometries),
  }, true)
  features.push(feature)

  const area = sqkm(feature)
  drift.push([name, area, (area - expectKm2) / expectKm2])
}

const orphans = [...byName.keys()].filter((k) => !claimed.has(k))
if (orphans.length) {
  console.error('municipalities in no okrug:', orphans.join(', '))
  process.exit(1)
}

const wrong = drift.filter(([, , d]) => Math.abs(d) > KIM_TOLERANCE)
if (wrong.length) {
  console.error('district areas are off — check the municipality lists:')
  for (const [name, area, d] of wrong) {
    console.error(`  ${name}: ${area.toFixed(0)} km2, ${(d * 100).toFixed(1)}% off`)
  }
  process.exit(1)
}

const { kb } = writeData('okruzi', features, { expectKm2: 88400 })

console.log(`OK  ${features.length - drift.length} districts + ${drift.length} in Kosovo and Metohija`)
for (const [name, area, d] of drift) {
  console.log(`    ${name.padEnd(26)} ${area.toFixed(0).padStart(5)} km2  ${(d * 100).toFixed(1).padStart(5)}%`)
}
console.log(`    ${kb.toFixed(0)} KB`)
