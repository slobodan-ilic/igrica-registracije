import { useEffect, useState } from 'react'

/**
 * Prefix for everything this app remembers. Each app sets its own, and the
 * same prefix appears in its index.html, where the theme is read before the
 * first paint so a remembered dark theme never flashes light.
 */
let NS = 'kviz.'

export const setStorageNamespace = (ns: string) => {
  NS = `${ns}.`
}

/** Which app this is, for records that will one day be shared with a server. */
export const appName = () => NS.replace(/\.$/, '')

function read(key: string): string | null {
  try {
    return localStorage.getItem(NS + key)
  } catch {
    return null // private mode or storage disabled
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(NS + key, value)
  } catch {
    // Not being able to remember a choice is not worth breaking the app over.
  }
}

/**
 * A setting the player picked, remembered across visits. Anything unrecognised
 * in storage falls back, so a stale or hand-edited value can't wedge the app.
 */
export function usePref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: () => T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = read(key)
    return saved && (allowed as readonly string[]).includes(saved) ? (saved as T) : fallback()
  })
  useEffect(() => write(key, value), [key, value])
  return [value, setValue]
}

/**
 * Anything larger than a setting: the rounds you have played, so far. Parsed
 * defensively — a half-written or hand-edited value costs you your history,
 * which is a shame, but it must never stop the app from opening.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = read(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  write(key, JSON.stringify(value))
}

export type Theme = 'light' | 'dark'
export const THEMES = ['light', 'dark'] as const

/** Used only when the player has never chosen. */
export const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}
