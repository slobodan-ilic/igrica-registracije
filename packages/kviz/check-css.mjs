// Two stylesheets in the engine must not claim the same class name.
//
// This has bitten twice: a page called its wrapper .progress and inherited the
// game's 4px progress bar, hiding itself; a list of countries called its rows
// .bar and inherited the score row's flex layout, collapsing every track to
// nothing. Both looked like layout puzzles and were neither.

import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), 'src')

const classes = (file) =>
  new Set([...readFileSync(file, 'utf8').matchAll(/^\.([a-z][a-z0-9_-]*)/gm)].map((m) => m[1]))

/**
 * styles/ is one system split across files by subject, so those may and do
 * share selectors — .shell--center is laid out in one and given its corner in
 * another. What must not happen is a component naming something the system has
 * already named, since the component gets the system's styling for free and
 * without being asked.
 */
const system = new Set()
for (const f of readdirSync(join(src, 'styles'))) {
  for (const c of classes(join(src, 'styles', f))) system.add(c)
}

/** Deliberate: a page extends the shared shell rather than colliding with it. */
const EXTENDS = new Set(['intro', 'shell', 'btn', 'back', 'theme'])

const owners = new Map()
const clashes = []
for (const file of readdirSync(src).filter((f) => f.endsWith('.css'))) {
  for (const cls of classes(join(src, file))) {
    if (system.has(cls) && !EXTENDS.has(cls)) clashes.push(`  .${cls} — ${file} and styles/`)
    const at = owners.get(cls)
    if (at) clashes.push(`  .${cls} — ${file} and ${at}`)
    owners.set(cls, file)
  }
}

if (clashes.length) {
  console.error(`${clashes.length} class name(s) claimed by two stylesheets:`)
  console.error(clashes.join('\n'))
  process.exit(1)
}
console.log(`  ✓ no component borrows a class the system already owns — ${owners.size} checked`)
