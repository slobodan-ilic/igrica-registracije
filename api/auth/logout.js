// Sign out: expire the cookie. Nothing is deleted — the rounds already synced
// stay, and signing back in as the same person finds them again.

import { setCookie, only } from '../_lib.js'

export default async function handler(req, res) {
  if (!only('POST', req, res)) return
  setCookie(res, '', 0)
  res.status(200).json({ ok: true })
}
