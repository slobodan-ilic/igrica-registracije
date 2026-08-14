// Builds src/data/okruzi.json: Serbia's administrative districts.
//
// Source: geoBoundaries SRB ADM1 (OSM-derived, ODbL 1.0), which is exactly the
// 24 upravni okruzi plus the City of Belgrade. Kosovo's districts are a separate
// administrative division and are not included; the territory is carried as one
// unplayable shape so the map keeps the same outline across topics.

import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import { slug } from './lib/serbian.mjs'
import { json } from './lib/sources.mjs'
import { writeData } from './lib/geo.mjs'

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

// Kosovo as one shape: drawn for context, never asked in this topic.
const topo = topology({ m: kosovo }, 1e5)
features.push({
  type: 'Feature',
  properties: { code: 'kosovo-i-metohija', name: 'Kosovo i Metohija', covers: [], kim: true },
  geometry: merge(topo, topo.objects.m.geometries),
})

const { kb } = writeData('okruzi', features, { expectKm2: 88400 })

console.log(`OK  ${features.length - 1} districts + Kosovo drawn as context`)
console.log(`    ${kb.toFixed(0)} KB`)
