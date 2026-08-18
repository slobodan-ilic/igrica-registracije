// Sign in. The browser hands us the token Google gave it; we check that Google
// really signed it and that it was minted for this site, then remember the
// person and hand back a session cookie of our own.
//
// Only the subject id and display name are kept. Google also sends the email
// address and a photo, and neither is stored — the quiz has no use for either,
// and what is not kept cannot leak.

import { db, googleClaims, issueSession, setCookie, only } from '../_lib.js'

export default async function handler(req, res) {
  if (!only('POST', req, res)) return

  const { credential } = req.body ?? {}
  if (!credential) return res.status(400).json({ error: 'no credential' })

  let claims
  try {
    claims = await googleClaims(credential)
  } catch {
    return res.status(401).json({ error: 'that token did not check out' })
  }

  const name = claims.given_name || claims.name || 'Igrač'
  const sql = db()
  await sql`
    insert into player (sub, name) values (${claims.sub}, ${name})
    on conflict (sub) do update set name = excluded.name, seen_at = now()
  `

  setCookie(res, await issueSession(claims.sub, name))
  res.status(200).json({ sub: claims.sub, name })
}
