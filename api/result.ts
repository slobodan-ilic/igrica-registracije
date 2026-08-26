// Keeps a result so that a link to it can be short.
//
// The address a result used to get carried the whole result inside it, which
// worked and read like a debug string: /r/srbija?s=8qhgq&m=lako&g=1111111111&q=41.
// Nobody sends that to anybody. This stores the result once and hands back
// /r/AB12CD34 instead.
//
// It is written without an account, and it has to be: a result only its author
// can open is not a shared result. Nothing here belongs to a person — which
// round it was, which questions went right, how long it took. There is no
// player column and nothing to join one to.

import { neon } from '@neondatabase/serverless'

export const config = { runtime: 'edge' }

const TOPICS = new Set([
  'srbija', 'hrvatska', 'makedonija', 'crnagora', 'slovenija', 'jugoslavija',
  // The geography quiz shares this engine and this table.
  'okruzi', 'reke', 'planine', 'banje',
])

/**
 * Crockford's alphabet, which drops the four characters people mistake for one
 * another when they read a link aloud or type it off a screen.
 */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

/**
 * The id is the front of a hash of what is being stored, rather than something
 * random, so that sharing one result twice writes one row and hands back one
 * link. Eight characters of it: a thousand billion of them, against a table
 * that will hold thousands.
 */
async function idFor(canonical: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)),
  )
  let id = ''
  for (let at = 0; at < 8; at++) id += ALPHABET[digest[at] % ALPHABET.length]
  return id
}

/** Taken only if every field is what it claims to be. */
function clean(body: Record<string, unknown>) {
  const topic = String(body?.topic ?? '')
  const seed = String(body?.seed ?? '')
  const grid = String(body?.grid ?? '')
  const seconds = Number(body?.seconds ?? 0)
  if (!TOPICS.has(topic)) return null
  if (!/^[a-z0-9-]{1,32}$/i.test(seed)) return null
  if (!/^[01]{1,200}$/.test(grid)) return null
  return {
    app: String(body?.app ?? 'tablice').slice(0, 40),
    topic,
    seed,
    grid,
    easy: Boolean(body?.easy),
    kim: Boolean(body?.kim),
    timed: Boolean(body?.timed),
    seconds: Number.isFinite(seconds) && seconds > 0 && seconds < 86_400 ? Math.round(seconds) : 0,
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'not json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const r = clean(body)
  if (!r) {
    return new Response(JSON.stringify({ error: 'not a result' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const id = await idFor(
    [r.app, r.topic, r.seed, r.easy, r.kim, r.timed, r.grid, r.seconds].join('|'),
  )

  try {
    const sql = neon(process.env.DATABASE_URL!)
    // Nothing to update: a finished round does not change, and neither does the
    // hash of it.
    await sql`
      insert into shared (id, app, topic, seed, easy, kim, timed, grid, seconds)
      values (${id}, ${r.app}, ${r.topic}, ${r.seed}, ${r.easy}, ${r.kim}, ${r.timed},
              ${r.grid}, ${r.seconds})
      on conflict (id) do nothing
    `
  } catch (e) {
    // Never the message: it can quote the statement, and the statement quotes
    // the connection it ran on.
    console.error('result:', e)
    return new Response(JSON.stringify({ error: 'could not keep that' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ id }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
