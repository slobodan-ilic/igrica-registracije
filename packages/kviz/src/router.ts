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
  /** Whether each question is against a clock. */
  timed: boolean
  /**
   * The exact questions, in order, when they were chosen rather than dealt from
   * the seed — a round of the codes you keep getting wrong.
   *
   * Written out in full rather than named by a rule, because the rule reads
   * *this browser's history* and would deal a different round to whoever opened
   * the link — which is the one thing a round's address may never do. Nothing
   * is given away by it: a code is the question, not the answer, and the place
   * it belongs to appears nowhere in the address.
   */
  deck?: string[]
}

export type Route =
  | { name: 'home' }
  | { name: 'progress' }
  | { name: 'daily' }
  | { name: 'setup'; topic: string }
  | { name: 'practice'; topic: string }
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
 * Codes are letters or a hyphenated name — never a dot — in every dataset the
 * two apps carry, so a dot separates them. The cap is there because the deck
 * arrives from an address, and an address is written by anyone.
 */
const MOST_DEALT = 200

/**
 * The round in the query string. Anything missing takes the plainest reading,
 * not the player's saved preference: a link has to mean the same thing to
 * whoever opens it.
 */
const round = (search: string): Round => {
  const q = new URLSearchParams(search)
  const n = Number(q.get('n'))
  const dealt = q.get('d')
  const deck = dealt ? dealt.split('.').filter(Boolean).slice(0, MOST_DEALT) : undefined
  return {
    // A chosen deck is its own length, so it is never written twice and cannot
    // be written twice differently.
    length: deck ? deck.length : Number.isFinite(n) && n > 0 ? n : 0,
    seed: q.get('s') ?? '',
    easy: q.get('m') === 'lako',
    kim: q.get('k') === '1',
    timed: q.get('t') === '1',
    ...(deck ? { deck } : {}),
  }
}

/** Paths that are the app's own, and so can never be a topic. */
const RESERVED: Record<string, Route> = {
  napredak: { name: 'progress' },
  dnevni: { name: 'daily' },
}

export function parseRoute(pathname: string, search: string): Route {
  const [topic, section] = pathname.split('/').filter(Boolean)

  if (topic && topic in RESERVED) return RESERVED[topic]

  if (root) {
    if (!topic) return { name: 'setup', topic: root }
    if (topic === 'igra') return { name: 'game', topic: root, ...round(search) }
    if (topic === 'greske') return { name: 'practice', topic: root }
  } else if (!topic) {
    return { name: 'home' }
  }

  if (section === 'igra') return { name: 'game', topic, ...round(search) }
  if (section === 'greske') return { name: 'practice', topic }
  return { name: 'setup', topic }
}

const query = ({ length, seed, easy, kim, timed, deck }: Round) =>
  [
    deck?.length ? `d=${deck.map(encodeURIComponent).join('.')}` : `n=${length}`,
    seed && `s=${seed}`,
    easy && 'm=lako',
    kim && 'k=1',
    timed && 't=1',
  ]
    .filter(Boolean)
    .join('&')

export const href = {
  home: () => '/',
  progress: () => '/napredak',
  daily: () => '/dnevni',
  setup: (topic: string) => `/${topic}`,
  game: (topic: string, r: Round) => `/${topic}/igra?${query(r)}`,
  /**
   * A doorway rather than a round: it reads this browser's history, deals the
   * codes still owed, and replaces itself with the round's own address. So it
   * can be bookmarked and always means "the ones I owe *now*", while the round
   * it opens is still a round anyone can be sent.
   */
  practice: (topic: string) => `/${topic}/greske`,
}

/**
 * Where a route ought to live. `/` and the old `/igra` forms still work and are
 * quietly rewritten to the address a person would be given, so what is in the
 * bar is always something worth copying.
 */
export function canonical(route: Route): string | null {
  // The mistake round replaces its own address once the dataset says which
  // codes are on the map; nothing here can know that yet.
  if (route.name === 'practice') return null
  if (route.name === 'home' || route.name === 'progress' || route.name === 'daily') return null
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
