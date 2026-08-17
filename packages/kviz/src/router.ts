import { useEffect, useState } from 'react'

/**
 * A very small path router. The route space is fixed and shallow, so this earns
 * its keep over a dependency — it is the History API plus a re-render.
 *
 * It has two shapes, depending on whether one topic is the app's front page:
 *
 *   no root topic   /            the chooser
 *                   /:topic      that topic's menu
 *                   /:topic/igra a round
 *
 *   root topic      /            the root topic's menu — there is no chooser
 *                   /igra        a round of it
 *                   /:topic      another topic's menu
 *                   /:topic/igra a round of that
 *
 * The second shape is for an app with a clear flagship: the plate quiz opens on
 * Serbia at `/`, and Croatia lives at `/hrvatska` rather than both sitting one
 * click behind a chooser. It also covers the single-topic case, where there is
 * simply nothing else to route to.
 */
export type Route =
  | { name: 'home' }
  | { name: 'setup'; topic: string }
  | { name: 'game'; topic: string; length: number }

/**
 * The topic served at `/`, or null when the front page is a chooser. Set once
 * at startup by the app's entry point — it is a build-time fact about the app,
 * not state, so it does not belong in React.
 */
let root: string | null = null

export const setRootTopic = (id: string | null) => {
  root = id
}

/** Whether there is a chooser to go back to, or a topic sitting at the root. */
export const hasChooser = () => root === null

const length = (search: string) => {
  const n = Number(new URLSearchParams(search).get('n'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function parseRoute(pathname: string, search: string): Route {
  const [topic, section] = pathname.split('/').filter(Boolean)

  if (root) {
    if (!topic) return { name: 'setup', topic: root }
    if (topic === 'igra') return { name: 'game', topic: root, length: length(search) }
  } else if (!topic) {
    return { name: 'home' }
  }

  if (section === 'igra') return { name: 'game', topic, length: length(search) }
  return { name: 'setup', topic }
}

export const href = {
  home: () => '/',
  setup: (topic: string) => (topic === root ? '/' : `/${topic}`),
  game: (topic: string, n: number) =>
    topic === root ? `/igra?n=${n}` : `/${topic}/igra?n=${n}`,
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
