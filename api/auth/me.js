// Who is signed in, if anyone. Signed out is a perfectly good answer, so it is
// a 200 with null rather than a 401.

import { session, only } from '../_lib.js'

export default async function handler(req, res) {
  if (!only('GET', req, res)) return
  res.status(200).json({ player: await session(req) })
}
