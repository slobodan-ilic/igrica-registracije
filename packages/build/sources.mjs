// Fetching and caching the upstream data every build script starts from.
// Nothing is committed: `scripts/.cache` is ignored and refilled on demand.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The workspace root, which is where the shared download cache lives. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const CACHE = resolve(ROOT, '.cache')

/**
 * The app whose data is being built — its package directory. Every build script
 * sets this from its own location, so `data/` and `scripts/queries/` resolve
 * inside that app rather than at the workspace root.
 */
export let APP = ROOT

export const setApp = (metaUrl) => {
  APP = resolve(dirname(fileURLToPath(metaUrl)), '..')
  return APP
}

/**
 * An Overpass query kept with the code. These are source, not cache: they say
 * exactly which features a dataset is made of, and without them a fresh clone
 * cannot rebuild anything.
 */
export const query = (name) => readFileSync(resolve(APP, 'scripts/queries', name), 'utf8')

/** Read a cached file, fetching it once from `url` if it is not there yet. */
export async function source(name, url) {
  const path = resolve(CACHE, name)
  if (!existsSync(path)) {
    if (!url) throw new Error(`missing ${name} and no URL to fetch it from`)
    console.log(`fetching ${name}...`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  return readFileSync(path, 'utf8')
}

export const json = async (name, url) => JSON.parse(await source(name, url))

/**
 * Overpass refuses anonymous clients and its main instance is often at
 * capacity, so every mirror gets a turn before the build gives up.
 */
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const UA = 'igrica-registracije (github.com/slobodan-ilic/igrica-registracije)'

/** Run an Overpass query, caching the response under `name`. */
export async function overpass(name, ql) {
  const path = resolve(CACHE, name)
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
  console.log(`querying overpass for ${name}...`)

  // A busy Overpass answers 504 and means "later", so each round of mirrors is
  // retried after a wait rather than failing the build.
  const problems = []
  for (let round = 0; round < 4; round++) {
    if (round) await new Promise((r) => setTimeout(r, round * 30_000))
    for (const mirror of MIRRORS) {
      const host = new URL(mirror).host
      let body
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain', 'User-Agent': UA },
          body: ql,
        })
        if (!res.ok) {
          problems.push(`${host}: HTTP ${res.status}`)
          continue
        }
        body = await res.text()
      } catch (err) {
        problems.push(`${host}: ${err.message}`)
        continue
      }
      mkdirSync(CACHE, { recursive: true })
      writeFileSync(path, body)
      return JSON.parse(body)
    }
    console.log(`  all mirrors busy (${problems.slice(-MIRRORS.length).join('; ')}), retrying...`)
  }
  throw new Error(`overpass ${name} failed everywhere — ${problems.join('; ')}`)
}
