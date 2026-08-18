// What every endpoint needs: the database, who is signed in, and how to say so.
//
// Files under api/ starting with an underscore are not routed, so this is a
// library rather than an endpoint.

import { neon } from '@neondatabase/serverless'
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose'

export const db = () => neon(process.env.DATABASE_URL)

/** Google's public keys, fetched once and cached by the library. */
const GOOGLE_KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET)

export const COOKIE = 'tablice_session'
const DAYS = 30

/**
 * Check the token the browser got from Google. Verifying the signature against
 * Google's own keys is the whole point — anyone can post a JSON blob claiming
 * to be someone, and only the signature says otherwise. The audience check
 * matters just as much: a token minted for a different site is a valid Google
 * token, and would let that site's owner walk in as any of their users.
 */
export async function googleClaims(credential) {
  const { payload } = await jwtVerify(credential, GOOGLE_KEYS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  return payload
}

/** Our own session token, signed with a secret only the server has. */
export async function issueSession(sub, name) {
  return new SignJWT({ name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret())
}

/** The signed-in player, or null. Never throws: not signed in is not an error. */
export async function session(req) {
  const raw = (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
  if (!raw) return null
  try {
    const { payload } = await jwtVerify(decodeURIComponent(raw.slice(COOKIE.length + 1)), secret())
    return { sub: payload.sub, name: payload.name }
  } catch {
    return null // expired, tampered with, or signed with a retired secret
  }
}

/**
 * httpOnly so no script can read it, Lax so it survives following a link back
 * into the site but is not sent from someone else's form, and Secure
 * everywhere but localhost, which has no https to offer.
 */
export function setCookie(res, value, maxAge = DAYS * 86400) {
  const secure = process.env.VERCEL_ENV ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  )
}

/** Endpoints answer one method each; anything else is a mistake worth naming. */
export function only(method, req, res) {
  if (req.method === method) return true
  res.status(405).json({ error: `${req.method} not allowed here` })
  return false
}
