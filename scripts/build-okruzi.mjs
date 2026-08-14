// Builds src/data/okruzi.json: Serbia's administrative districts.
//
// Source: geoBoundaries SRB ADM1 (OSM-derived, ODbL 1.0), which is exactly the
// 24 upravni okruzi plus the City of Belgrade. Kosovo's districts are a separate
// administrative division and are not included; the territory is carried as one
// unplayable shape so the map keeps the same outline across topics.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea } from 'd3-geo'
import { topology } from 'topojson-server'
import { merge } from 'topojson-client'
import rewind from '@mapbox/geojson-rewind'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const CACHE = resolve(root, 'scripts/.cache')

const SOURCES = {
  'srb_adm1.geojson':
    'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/SRB/ADM1/geoBoundaries-SRB-ADM1_simplified.geojson',
  'xkx_adm2.geojson':
    'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/XKX/ADM2/geoBoundaries-XKX-ADM2_simplified.geojson',
}

async function source(name) {
  const path = resolve(CACHE, name)
  if (existsSync(path)) return readFileSync(path, 'utf8')
  console.log(`fetching ${name}...`)
  const res = await fetch(SOURCES[name])
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const body = await res.text()
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(path, body)
  return body
}

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

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const adm1 = JSON.parse(await source('srb_adm1.geojson'))
const kosovo = JSON.parse(await source('xkx_adm2.geojson'))

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

const round = (v) => (Array.isArray(v) ? v.map(round) : Math.round(v * 1e4) / 1e4)
for (const f of features) f.geometry.coordinates = round(f.geometry.coordinates)

const out = rewind({ type: 'FeatureCollection', features }, true)

const total = out.features.reduce((s, f) => s + geoArea(f) * 6371 * 6371, 0)
if (total < 82000 || total > 95000) {
  console.error(`Sanity check failed: total area ${total.toFixed(0)} km2, expected ~88400`)
  process.exit(1)
}

mkdirSync(resolve(root, 'src/data'), { recursive: true })
writeFileSync(resolve(root, 'src/data/okruzi.json'), JSON.stringify(out))
console.log(`OK  ${features.length - 1} districts + Kosovo drawn as context`)
console.log(`    ${(JSON.stringify(out).length / 1024).toFixed(0)} KB, ${total.toFixed(0)} km2`)
