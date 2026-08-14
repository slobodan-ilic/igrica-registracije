import { useEffect, useState } from 'react'

/**
 * A very small path router. The route space here is fixed and shallow
 * (`/`, `/:topic`, `/:topic/igra`), so this earns its keep over a dependency —
 * it is the History API plus a re-render.
 */
export type Route =
  | { name: 'home' }
  | { name: 'setup'; topic: string }
  | { name: 'game'; topic: string; length: number }

export function parseRoute(pathname: string, search: string): Route {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'home' }
  const [topic, section] = parts
  if (section === 'igra') {
    const n = Number(new URLSearchParams(search).get('n'))
    return { name: 'game', topic, length: Number.isFinite(n) && n > 0 ? n : 0 }
  }
  return { name: 'setup', topic }
}

export const href = {
  home: () => '/',
  setup: (topic: string) => `/${topic}`,
  game: (topic: string, length: number) => `/${topic}/igra?n=${length}`,
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
