// Your rounds, on the server.
//
// POST sends up what a browser has been keeping; GET hands back everything
// that account has ever stored, which is how a second device catches up.
//
// Rounds carry an id minted by the browser that played them, so sending the
// same batch twice stores nothing the second time. That is the whole of the
// conflict handling, and it is enough: there is one writer per round and it
// never changes its mind about what happened.

import { db, session, only } from './_lib.js'

/** Enough for a long backlog on first sign-in, small enough to refuse abuse. */
const MAX_ROUNDS = 200
/**
 * The longest round either app can deal is Yugoslavia's 125 towns, and this was
 * 100 — so a round of the whole map arrived on a second device twenty-five
 * questions short, silently. The same shape of loss as the dropped timeouts
 * below. Two hundred, which is also the cap on a deck written into an address.
 */
const MAX_ANSWERS = 200

const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : null)
const int = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null)

/**
 * A round is taken only if every field of it is what it claims to be.
 *
 * Exported so the suite can put a round through it without a database: what
 * this drops never reaches a row, and never comes back down to another device.
 */
export function clean(r) {
  const id = str(r?.id, 64)
  const topic = str(r?.topic, 40)
  const seed = str(r?.seed, 40)
  const app = str(r?.app, 40)
  const length = int(r?.length, 1000)
  const score = int(r?.score, 1000)
  const ms = int(r?.ms, 86_400_000)
  const at = int(r?.at, 4_000_000_000_000)
  if (!id || !topic || !seed || !app || length === null || score === null || ms === null) return null
  if (score > length) return null

  const answers = Array.isArray(r.answers) ? r.answers.slice(0, MAX_ANSWERS) : []
  const clean_answers = answers
    .map((a, step) => ({
      step,
      // Forty, not twelve: a plate code is two letters but a geography answer is
      // its name — "severnobanatski-okrug" is twenty-one — and anything longer
      // was being dropped on the way up.
      code: str(a?.code, 40),
      picked: str(a?.picked, 40),
      correct: typeof a?.correct === 'boolean' ? a.correct : null,
      ms: int(a?.ms, 86_400_000),
    }))
    // An empty pick is a question the clock ran out on, not a malformed answer:
    // it is how running out is recorded, so that it never turns up among the
    // confusions. Dropping it here made a round arrive on the next device
    // shorter and more accurate than the one that was actually played.
    .filter((a) => a.code && a.picked !== null && a.correct !== null && a.ms !== null)

  return {
    id, app, topic, seed, length, score, ms,
    easy: Boolean(r.easy),
    kim: Boolean(r.kim),
    // Accuracy under a clock is a different number from accuracy without one,
    // and a round that arrives without this is compared against neither.
    timed: Boolean(r.timed),
    // Whether the deck was chosen from this player's own mistakes rather than
    // dealt. Same reason as the clock: such a round is harder on purpose, so it
    // is never averaged in with the rest, and one that arrived without this
    // would be.
    practice: Boolean(r.practice),
    at: new Date(at ?? Date.now()).toISOString(),
    answers: clean_answers,
  }
}

export default async function handler(req, res) {
  const player = await session(req)
  if (!player) return res.status(401).json({ error: 'not signed in' })
  const sql = db()
  try {
    return await serve(req, res, sql, player)
  } catch (e) {
    // Never the message: it can quote the statement, and the statement quotes
    // the connection this ran on.
    console.error('rounds:', e)
    return res.status(500).json({ error: 'could not store that' })
  }
}

async function serve(req, res, sql, player) {

  if (req.method === 'GET') {
    const rounds = await sql`
      select r.id, r.app, r.topic, r.seed, r.length, r.easy, r.kim, r.timed, r.practice,
             r.score, r.ms,
             -- float8, or the driver hands epoch milliseconds back as a string
             (extract(epoch from r.finished_at) * 1000)::float8 as at,
             coalesce(
               (select json_agg(json_build_object('code', a.code, 'picked', a.picked,
                                                  'correct', a.correct, 'ms', a.ms)
                                order by a.step)
                from answer a where a.round = r.id),
               '[]'::json) as answers
      from round r
      where r.player = ${player.sub}
      order by r.finished_at desc
      limit 500
    `
    return res.status(200).json({ rounds })
  }

  if (!only('POST', req, res)) return

  const sent = Array.isArray(req.body?.rounds) ? req.body.rounds.slice(0, MAX_ROUNDS) : []
  const rounds = sent.map(clean).filter(Boolean)
  if (!rounds.length) return res.status(200).json({ stored: [] })

  // A valid session is proof we signed this person in at some point, so the
  // player they belong to is made sure of rather than assumed. Without this a
  // session outliving its row — a cleared table, a deleted account — turns
  // every sync into a foreign key error, which is a 500 for something that is
  // not the caller's fault.
  await sql`
    insert into player (sub, name) values (${player.sub}, ${player.name ?? 'Igrač'})
    on conflict (sub) do update set seen_at = now()
  `

  for (const r of rounds) {
    // Nothing to update on conflict: a finished round does not change.
    const [row] = await sql`
      insert into round (id, player, app, topic, seed, length, easy, kim, timed, practice,
                         score, ms, finished_at)
      values (${r.id}, ${player.sub}, ${r.app}, ${r.topic}, ${r.seed}, ${r.length},
              ${r.easy}, ${r.kim}, ${r.timed}, ${r.practice}, ${r.score}, ${r.ms}, ${r.at})
      on conflict (id) do nothing
      returning id
    `
    if (row && r.answers.length) {
      await sql.query(
        `insert into answer (round, step, code, picked, correct, ms) values ${r.answers
          .map((_, i) => `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`)
          .join(', ')} on conflict do nothing`,
        [r.id, ...r.answers.flatMap((a) => [a.step, a.code, a.picked, a.correct, a.ms])],
      )
    }
  }

  res.status(200).json({ stored: rounds.map((r) => r.id) })
}
