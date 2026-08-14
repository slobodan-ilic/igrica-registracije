// Builds src/data/banje.json: Serbia's spa towns, as points.
//
// Source: OpenStreetMap place nodes (ODbL 1.0). Every coordinate comes from OSM;
// the only hand-entered data is which spa is worth teaching and, where the spa
// and its settlement are named differently, what OSM calls it.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { geoContains } from 'd3-geo'
import { toLatin, slug, key } from './lib/serbian.mjs'
import { overpass, source, ROOT } from './lib/sources.mjs'
import { writeData } from './lib/geo.mjs'

/** spa name -> the name OSM uses, when the settlement is called something else */
const BANJE = {
  'Vrnjačka Banja': null,
  Sokobanja: null,
  'Niška Banja': null,
  'Banja Koviljača': null,
  'Bukovička Banja': 'Aranđelovac',
  'Prolom Banja': 'Prolom',
  'Ribarska Banja': null,
  'Atomska Banja': 'Gornja Trepča',
  'Vranjska Banja': null,
  'Mataruška Banja': null,
  'Ovčar Banja': null,
  'Jošanička Banja': null,
  'Sijarinska Banja': null,
  'Kuršumlijska Banja': null,
  'Gamzigradska Banja': null,
  'Brestovačka Banja': 'Brestovačka banja',
  'Bogutovačka Banja': null,
  'Banja Vrujci': 'Vrujci',
  Rusanda: 'Melenci',
  Vrdnik: null,
  Slankamen: 'Stari Slankamen',
  'Banja Junaković': null,
  'Banja Kanjiža': 'Kanjiža',
}

/**
 * Serbia's statistical regions, used when a spa's district would give its name
 * away (Niška Banja sits in the Nišavski okrug).
 */
const REGIONS = {
  'Severnobački okrug': 'Vojvodina',
  'Srednjebanatski okrug': 'Vojvodina',
  'Severnobanatski okrug': 'Vojvodina',
  'Južnobanatski okrug': 'Vojvodina',
  'Zapadnobački okrug': 'Vojvodina',
  'Južnobački okrug': 'Vojvodina',
  'Sremski okrug': 'Vojvodina',
  'Grad Beograd': 'Beogradski region',
  'Mačvanski okrug': 'Šumadija i zapadna Srbija',
  'Kolubarski okrug': 'Šumadija i zapadna Srbija',
  'Moravički okrug': 'Šumadija i zapadna Srbija',
  'Zlatiborski okrug': 'Šumadija i zapadna Srbija',
  'Šumadijski okrug': 'Šumadija i zapadna Srbija',
  'Pomoravski okrug': 'Šumadija i zapadna Srbija',
  'Raški okrug': 'Šumadija i zapadna Srbija',
  'Rasinski okrug': 'Šumadija i zapadna Srbija',
  'Borski okrug': 'Južna i istočna Srbija',
  'Braničevski okrug': 'Južna i istočna Srbija',
  'Zaječarski okrug': 'Južna i istočna Srbija',
  'Podunavski okrug': 'Južna i istočna Srbija',
  'Nišavski okrug': 'Južna i istočna Srbija',
  'Toplički okrug': 'Južna i istočna Srbija',
  'Pirotski okrug': 'Južna i istočna Srbija',
  'Jablanički okrug': 'Južna i istočna Srbija',
  'Pčinjski okrug': 'Južna i istočna Srbija',
}

/** The most telling word of a name — "Banja" alone identifies nothing. */
const stem = (name) =>
  toLatin(name)
    .split(/\s+/)
    .map(key)
    .filter((w) => w && w !== 'banja' && w !== 'okrug')
    .sort((a, b) => b.length - a.length)[0] ?? ''

const sharesRoot = (a, b) => {
  const x = stem(a)
  return toLatin(b)
    .split(/\s+/)
    .map(key)
    .some((w) => w.length >= 3 && x.length >= 3 && (w.startsWith(x.slice(0, 3)) || x.startsWith(w.slice(0, 3))))
}

// Every named node from both spa queries, keyed by normalised name.
const nodes = new Map()
for (const [file, ql] of [['banje.json', 'banje.ql'], ['banje2.json', 'banje2.ql']]) {
  for (const e of (await overpass(file, await source(ql))).elements) {
    const name = e.tags?.name
    if (!name || e.lat === undefined) continue
    const k = key(toLatin(name))
    // Prefer a real settlement over a pool or restaurant of the same name.
    const rank = e.tags.place ? 2 : 1
    const prev = nodes.get(k)
    if (!prev || rank > prev.rank) nodes.set(k, { lat: e.lat, lon: e.lon, rank })
  }
}

const okruzi = JSON.parse(readFileSync(resolve(ROOT, 'src/data/okruzi.json'), 'utf8'))

const features = []
const missing = []

for (const [name, osmName] of Object.entries(BANJE)) {
  const hit = nodes.get(key(toLatin(osmName ?? name)))
  if (!hit) {
    missing.push(name)
    continue
  }
  const point = [Math.round(hit.lon * 1e4) / 1e4, Math.round(hit.lat * 1e4) / 1e4]

  const okrug = okruzi.features.find(
    (f) => !f.properties.kim && geoContains(f, point),
  )?.properties.name

  // The name is the answer, so the district is the hint — unless the two share
  // a root, which is enough to hand it over: Niška Banja sits in the Nišavski
  // okrug. A shared three-letter stem counts, not just a whole substring.
  const hint = !okrug ? 'Srbija' : sharesRoot(name, okrug) ? REGIONS[okrug] ?? 'Srbija' : okrug

  features.push({
    type: 'Feature',
    properties: { code: slug(name), name, covers: [hint] },
    geometry: { type: 'Point', coordinates: point },
  })
}

if (missing.length) {
  console.error('NOT FOUND in the OSM extract:', missing.join(', '))
  process.exit(1)
}

const leaking = features.filter((f) => sharesRoot(f.properties.name, f.properties.covers[0]))
if (leaking.length) {
  console.error('hint gives the answer away:', leaking.map((f) => f.properties.name).join(', '))
  process.exit(1)
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'sr'))

const { kb } = writeData('banje', features)

console.log(`OK  ${features.length} spa towns`)
for (const f of features) {
  console.log(`    ${f.properties.name.padEnd(20)} ${f.properties.covers[0]}`)
}
console.log(`    ${kb.toFixed(1)} KB`)
