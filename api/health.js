// Proof that a function can run and reach the database, and nothing more.
//
// It is here because two things about this layout could quietly not work: the
// single-page rewrite claims every path unless told otherwise, and the driver
// has to resolve from the repository root rather than from the app. Both are
// cheaper to find out now than underneath a login.

import { neon } from '@neondatabase/serverless'

export default async function handler(_req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL)
    const [{ tables }] = await sql`
      select count(*)::int as tables
      from information_schema.tables
      where table_schema = 'public'
    `
    res.status(200).json({ ok: true, tables })
  } catch (e) {
    // The message, never the connection string it might be carrying.
    res.status(500).json({ ok: false, error: e.constructor.name })
  }
}
