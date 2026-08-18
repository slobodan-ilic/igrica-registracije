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
 *   root topic      /            a doorway to the root topic — no chooser
 *                   /:topic      that topic's menu, the root topic included
 *                   /:topic/igra a round of it
 *
 * The second shape is for an app with a clear flagship: the plate quiz opens on
 * Serbia, so `/` leads there — but it leads there, it is not a second address
 * for it. Every topic has one path of its own, so Serbia is `/srbija` like
 * Croatia is `/hrvatska`, and a link to a country looks the same whichever
 * country it is. The older rootless forms are still read, since rounds have
 * been shared as `/igra?n=10`.
 */
/**
 * Everything that makes a round what it is. A round's URL is the round: same
 * link, same questions, in the same order, played the same way — which is what
 * lets a result be shared as a challenge rather than as a boast.
 */
export type Round = {
  length: number
  /** Absent only until the app mints one; see Quiz. */
  seed: string
  easy: boolean
  kim: boolean
}

export type Route =
  | { name: 'home' }
  | { name: 'setup'; topic: string }
  | ({ name: 'game'; topic: string } & Round)

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

/**
 * The round in the query string. Anything missing takes the plainest reading,
 * not the player's saved preference: a link has to mean the same thing to
 * whoever opens it.
 */
const round = (search: string): Round => {
  const q = new URLSearchParams(search)
  const n = Number(q.get('n'))
  return {
    length: Number.isFinite(n) && n > 0 ? n : 0,
    seed: q.get('s') ?? '',
    easy: q.get('m') === 'lako',
    kim: q.get('k') === '1',
  }
}

export function parseRoute(pathname: string, search: string): Route {
  const [topic, section] = pathname.split('/').filter(Boolean)

  if (root) {
    if (!topic) return { name: 'setup', topic: root }
    if (topic === 'igra') return { name: 'game', topic: root, ...round(search) }
  } else if (!topic) {
    return { name: 'home' }
  }

  if (section === 'igra') return { name: 'game', topic, ...round(search) }
  return { name: 'setup', topic }
}

const query = ({ length, seed, easy, kim }: Round) =>
  [`n=${length}`, seed && `s=${seed}`, easy && 'm=lako', kim && 'k=1']
    .filter(Boolean)
    .join('&')

export const href = {
  home: () => '/',
  setup: (topic: string) => `/${topic}`,
  game: (topic: string, r: Round) => `/${topic}/igra?${query(r)}`,
}

/**
 * Where a route ought to live. `/` and the old `/igra` forms still work and are
 * quietly rewritten to the address a person would be given, so what is in the
 * bar is always something worth copying.
 */
export function canonical(route: Route): string | null {
  if (route.name === 'home') return null
  if (route.name === 'game') {
    return route.length > 0 && route.seed
      ? href.game(route.topic, route)
      : href.setup(route.topic)
  }
  return href.setup(route.topic)
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
