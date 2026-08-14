// Fetching and caching the upstream data every build script starts from.
// Nothing is committed: `scripts/.cache` is ignored and refilled on demand.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const CACHE = resolve(ROOT, 'scripts/.cache')

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

/** Run an Overpass query, caching the response under `name`. */
export async function overpass(name, query) {
  const path = resolve(CACHE, name)
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
  console.log(`querying overpass for ${name}...`)
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  })
  if (!res.ok) throw new Error(`overpass ${name}: HTTP ${res.status}`)
  const body = await res.text()
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(path, body)
  return JSON.parse(body)
}
