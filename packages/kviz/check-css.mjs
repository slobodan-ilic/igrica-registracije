// Two things the engine must not do: claim one class name from two
// stylesheets, or name two files the same but for their case.
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

/**
 * macOS does not distinguish Daily.tsx from daily.ts, and TypeScript refuses
 * the pair rather than guess which was meant. It has caught us twice — a
 * component and the module behind it are the obvious thing to name alike.
 */
// The clash is between module names, so the extension comes off first:
// Progress.tsx beside Progress.css is a component and its stylesheet and is
// fine, while Daily.tsx beside daily.ts is the pair that cannot both exist.
const stem = (f) => f.replace(/\.[^.]+$/, '')
const byLowercase = new Map()
const twins = []
for (const f of readdirSync(src)) {
  const seen = byLowercase.get(stem(f).toLowerCase())
  if (seen && stem(seen) !== stem(f)) twins.push(`  ${seen} and ${f}`)
  byLowercase.set(stem(f).toLowerCase(), f)
}

if (twins.length) {
  console.error('files whose names differ only in case:')
  console.error(twins.join('\n'))
  process.exit(1)
}

console.log(
  `  ✓ no component borrows a class the system already owns — ${owners.size} checked` +
    `\n  ✓ no two source files differ only in case — ${byLowercase.size} checked`,
)
