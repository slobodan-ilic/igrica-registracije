// Builds public/img/grbovi/<name>.webp: every coat of arms stamped on a plate.
//
// Two kinds. The national arms — Croatia's and Montenegro's — are one file
// each, drawn on every plate of that country. Slovenia's are municipal, one per
// registration code.
//
// These were drawn by hand in SVG before, and hand-drawn heraldry does not
// survive being shrunk to twenty pixels: Croatia's crown of five came out a
// smudge and Montenegro's eagle a sunburst. The real artwork is on Commons and
// in the public domain, so there is no reason to approximate it.
//
// Slovenian plates carry the arms of the *municipality*, not of the
// registration area — a GO plate from Idrija shows Idrija's arms, not Nova
// Gorica's. Since the quiz asks about the area and shows one plate per code,
// each code takes the arms of the town it is named after, which is exactly what
// a plate registered in that town looks like.
//
// Source: Wikimedia Commons. All eleven are public domain or CC0, so no
// attribution is legally required, but the file each came from is recorded in
// DATA.md all the same.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { fileInfo, download } from '@kviz/build/wiki'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The arms a whole country's plates carry. */
const NATIONAL = {
  hr: 'Coat of arms of Croatia.svg',
  me: 'Coat of arms of Montenegro.svg',
  // Serbia's plates carry the shield alone — the cross and four firesteels, no
  // crown and no eagle. The small arms with the crowned double-headed eagle
  // are a grander thing than a number plate gets.
  rs: 'Serbian Cross.svg',
}

/** Registration code -> the Commons file holding its town's arms. */
const ARMS = {
  CE: 'Coat of arms of Celje.svg',
  GO: 'COA-Nova Gorica.svg',
  KK: 'Coat of arms of the City Municipality of Krško.svg',
  KP: 'Coa Koper.grb.svg',
  KR: 'Coat of arms of Kranj.svg',
  LJ: 'Blason ville si Ljubljana (Slovénie).svg',
  MB: 'Coat of arms of Maribor.svg',
  MS: 'Coat of arms of Murska Sobota.svg',
  NM: 'Coat of arms of Novo Mesto.svg',
  PO: 'Coat of arms of Postojna.svg',
  SG: 'Grb Mestne občine Slovenj Gradec.png',
}

/** Licences that let us ship the file without an attribution line on the plate. */
const FREE = /^(cc0|public domain|pd)/i

/** Rendered at about 30 px on the plate; 160 covers a retina screen. */
const HEIGHT = 160

const ALL = { ...NATIONAL, ...ARMS }

const info = await fileInfo(Object.values(ALL))
const dir = resolve(app, 'public/img/grbovi')
mkdirSync(dir, { recursive: true })

const problems = []
for (const [code, file] of Object.entries(ALL)) {
  const meta = info.get(file)
  const why =
    !meta ? 'not found on Commons'
    : !meta.shared ? 'not a Commons file'
    : !FREE.test(meta.licence) ? `licence "${meta.licence || 'unknown'}"`
    : null
  if (why) {
    problems.push(`${code}: ${file} — ${why}`)
    continue
  }

  const src = await download(meta.url)

  // An SVG is rasterised at whatever DPI it is given, and these declare wildly
  // different intrinsic sizes — a fixed density either blows past sharp's pixel
  // limit or renders a postage stamp. So the density is worked out from the
  // file's own dimensions to land near the height wanted.
  const natural = await sharp(src).metadata()
  const density = Math.min(2400, Math.max(72, Math.round((72 * HEIGHT * 2) / (natural.height || HEIGHT))))

  // Trimmed of its surrounding transparency, so every arms fills its box the
  // same way whatever padding the original was drawn with.
  await sharp(src, { density })
    .trim()
    .resize({ height: HEIGHT, fit: 'inside', withoutEnlargement: false })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(resolve(dir, `${code}.webp`))
  console.log(`    ${code}  ${meta.licence.padEnd(15)} ${file}`)
}

if (problems.length) {
  console.error('\ncoats of arms that cannot be used:')
  for (const p of problems) console.error(`    ${p}`)
  process.exit(1)
}

writeFileSync(resolve(app, 'data/grbovi.json'), JSON.stringify(ALL))
console.log(`\nOK  ${Object.keys(ALL).length} coats of arms`)
