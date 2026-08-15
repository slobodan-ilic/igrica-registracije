// Talking to sr.wikipedia and Wikimedia Commons.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { CACHE } from './sources.mjs'

const UA = 'igrica-registracije (github.com/slobodan-ilic/igrica-registracije)'

/** Latin -> Cyrillic. sr.wikipedia titles are Cyrillic; our datasets are Latin. */
const DIGRAPHS = { lj: 'љ', nj: 'њ', dž: 'џ' }
const LETTERS = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', đ: 'ђ', e: 'е', ž: 'ж', z: 'з', i: 'и',
  j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т',
  ć: 'ћ', u: 'у', f: 'ф', h: 'х', c: 'ц', č: 'ч', š: 'ш',
}

export function toCyrillic(s) {
  let out = ''
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2).toLowerCase()
    const upper = s[i] !== s[i].toLowerCase()
    if (DIGRAPHS[two]) {
      out += upper ? DIGRAPHS[two].toUpperCase() : DIGRAPHS[two]
      i += 2
      continue
    }
    const one = LETTERS[s[i].toLowerCase()]
    out += one ? (upper ? one.toUpperCase() : one) : s[i]
    i += 1
  }
  return out
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Wikimedia rate-limits hard and answers 429 with a Retry-After. Responses are
 * cached so a re-run costs nothing, and requests are spaced out so a first run
 * stays within what the API asks for.
 */
async function api(host, params) {
  const url = new URL(`https://${host}/w/api.php`)
  url.search = new URLSearchParams({ format: 'json', formatversion: '2', ...params })

  const name = `wiki_${createHash('sha1').update(url.href).digest('hex').slice(0, 16)}.json`
  const cached = resolve(CACHE, name)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8')).query ?? {}

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429 && attempt < 5) {
      const after = Number(res.headers.get('retry-after')) || 30 * (attempt + 1)
      console.log(`  rate limited, waiting ${after}s...`)
      await wait(after * 1000)
      continue
    }
    if (!res.ok) throw new Error(`${host}: HTTP ${res.status}`)
    const body = await res.text()
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(cached, body)
    await wait(300) // stay a polite distance from the rate limit
    return JSON.parse(body).query ?? {}
  }
}

const chunk = (list, n) =>
  list.length ? [list.slice(0, n), ...chunk(list.slice(n), n)] : []

/**
 * The lead image of each article: its File: name and a URL to fetch it from.
 * Titles are matched after redirects, so the answer is keyed by what was asked
 * for, not what resolved.
 *
 * The URL comes from the API rather than being assembled here, because Commons
 * only renders thumbnails at a fixed set of widths and rejects anything else.
 * One generous size is fetched and both of ours are cut from it locally.
 */
export async function leadImages(titles) {
  const found = new Map()
  for (const part of chunk(titles, 40)) {
    const q = await api('sr.wikipedia.org', {
      action: 'query',
      prop: 'pageimages',
      piprop: 'name|thumbnail',
      pithumbsize: '800',
      pilicense: 'any',
      titles: part.join('|'),
      redirects: '1',
    })
    // Redirects and normalisation rename pages; map them back to the request.
    const back = new Map()
    for (const r of [...(q.normalized ?? []), ...(q.redirects ?? [])]) {
      back.set(r.to, back.get(r.from) ?? r.from)
    }
    for (const page of q.pages ?? []) {
      const asked = back.get(page.title) ?? page.title
      if (page.missing || !page.pageimage || !page.thumbnail) continue
      found.set(asked, { file: page.pageimage, url: page.thumbnail.source.split('?')[0] })
    }
  }
  return found
}

/**
 * Licence and authorship for File: names, plus a thumbnail URL builder.
 *
 * `imagerepository` tells us whether a file lives on Commons ("shared") or was
 * uploaded locally — local files on sr.wikipedia are usually non-free, so only
 * shared ones are usable here.
 */
export async function fileInfo(names) {
  const info = new Map()
  for (const part of chunk(names, 20)) {
    const q = await api('sr.wikipedia.org', {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime|size',
      titles: part.map((n) => `File:${n}`).join('|'),
    })
    for (const page of q.pages ?? []) {
      const ii = page.imageinfo?.[0]
      if (!ii) continue
      const meta = ii.extmetadata ?? {}
      const text = (v) =>
        v?.value ? String(v.value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : ''
      // The API answers in the wiki's own namespace ("Датотека:"), not "File:".
      info.set(page.title.replace(/^[^:]+:/, '').replace(/_/g, ' '), {
        shared: page.imagerepository === 'shared',
        mime: ii.mime,
        width: ii.width,
        // Both URLs come back with a tracking query string appended.
        url: ii.url.split('?')[0],
        page: ii.descriptionurl.split('?')[0],
        licence: text(meta.LicenseShortName),
        author: text(meta.Artist),
        restrictions: text(meta.Restrictions),
      })
    }
  }
  return info
}

/**
 * Fetch an image, cached on disk. upload.wikimedia.org rate-limits separately
 * from the API and just as hard, so this backs off the same way.
 */
export async function download(url) {
  const cached = resolve(CACHE, `img_${createHash('sha1').update(url).digest('hex').slice(0, 16)}`)
  if (existsSync(cached)) return readFileSync(cached)

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429 && attempt < 5) {
      const after = Number(res.headers.get('retry-after')) || 30 * (attempt + 1)
      console.log(`  rate limited on images, waiting ${after}s...`)
      await wait(after * 1000)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = Buffer.from(await res.arrayBuffer())
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(cached, body)
    await wait(200)
    return body
  }
}
