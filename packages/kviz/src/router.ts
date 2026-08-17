import { useEffect, useState } from 'react'

/**
 * A very small path router. The route space is fixed and shallow, so this earns
 * its keep over a dependency — it is the History API plus a re-render.
 *
 * It has two shapes. An app with several quizzes needs a chooser and a topic in
 * the path (`/`, `/:topic`, `/:topic/igra`). An app with only one quiz has
 * nothing to choose, so the topic drops out of the URL entirely and its menu is
 * the front page (`/`, `/igra`).
 */
export type Route =
  | { name: 'home' }
  | { name: 'setup'; topic: string }
  | { name: 'game'; topic: string; length: number }

/**
 * The single topic's id when the app has only one, otherwise null. Set once at
 * startup by the app's entry point — it is a build-time fact about the app, not
 * state, so it does not belong in React.
 */
let only: string | null = null

export const setOnlyTopic = (id: string | null) => {
  only = id
}

/** Whether there is a chooser to go back to, or just the one quiz. */
export const hasChooser = () => only === null

const length = (search: string) => {
  const n = Number(new URLSearchParams(search).get('n'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function parseRoute(pathname: string, search: string): Route {
  const parts = pathname.split('/').filter(Boolean)

  if (only) {
    if (parts[0] === 'igra') return { name: 'game', topic: only, length: length(search) }
    return { name: 'setup', topic: only }
  }

  if (parts.length === 0) return { name: 'home' }
  const [topic, section] = parts
  if (section === 'igra') return { name: 'game', topic, length: length(search) }
  return { name: 'setup', topic }
}

export const href = {
  home: () => '/',
  setup: (topic: string) => (only ? '/' : `/${topic}`),
  game: (topic: string, n: number) => (only ? `/igra?n=${n}` : `/${topic}/igra?n=${n}`),
}

export function navigate(to: string, replace = false) {
  const current = window.location.pathname + window.location.search
  if (to === current) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): Route {
  const [loc, setLoc] = useState(() => ({
    path: window.location.pathname,
    search: window.location.search,
  }))
  useEffect(() => {
    const sync = () =>
      setLoc({ path: window.location.pathname, search: window.location.search })
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  return parseRoute(loc.path, loc.search)
}

/** Anchors keep middle-click and "open in new tab" working; this handles the rest. */
export function linkProps(to: string) {
  return {
    href: to,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      navigate(to)
    },
  }
}
