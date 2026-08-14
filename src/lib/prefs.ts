import { useEffect, useState } from 'react'

const NS = 'tablice.'

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

export type Theme = 'light' | 'dark'
export const THEMES = ['light', 'dark'] as const

/** Used only when the player has never chosen. */
export const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}
