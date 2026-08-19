import { appName, readJson, writeJson } from './prefs'
import type { Answer } from './useRound'

/**
 * Every round you finish, kept in this browser.
 *
 * Local first, and local always: playing signed out records just as much as
 * playing signed in. An account is what carries this between your phone and
 * your laptop, not what earns it — so a child on a borrowed iPad gets their
 * progress without ever meeting a login.
 */

export type Played = {
  /** Minted here, so sending the same round twice is harmless. */
  id: string
  app: string
  topic: string
  /** Kept so a round out of your history can be played again exactly. */
  seed: string
  length: number
  easy: boolean
  kim: boolean
  score: number
  /** How long the questions took altogether, in milliseconds. */
  ms: number
  /** When it finished, epoch milliseconds. */
  at: number
  answers: Answer[]
  /** Whether the server has this one. */
  synced?: boolean
}

const KEY = 'history'

/**
 * Rounds are small — a hundred bytes and a line per question — but storage is
 * not, and a browser that refuses to write would lose the newest round rather
 * than the oldest. Five hundred is more than anyone will look at and still
 * comfortably inside the limit.
 */
const KEEP = 500

const id = () =>
  crypto.randomUUID?.() ??
  `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`

/** Newest first. */
export const history = (): Played[] => readJson<Played[]>(KEY, [])

/** Records a finished round and hands it back, ready to be sent on. */
export function record(round: Omit<Played, 'id' | 'at' | 'app'>): Played {
  const played: Played = { ...round, id: id(), at: Date.now(), app: appName() }
  writeJson(KEY, [played, ...history()].slice(0, KEEP))
  return played
}

/** Marks rounds as safely on the server, so they are not sent twice. */
export function markSynced(ids: string[]) {
  const done = new Set(ids)
  writeJson(
    KEY,
    history().map((r) => (done.has(r.id) ? { ...r, synced: true } : r)),
  )
}

export const unsynced = () => history().filter((r) => !r.synced)

/** Forget everything. Offered because a person's own history is theirs to drop. */
export function forget() {
  writeJson(KEY, [])
}
