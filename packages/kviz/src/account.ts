import { useCallback, useEffect, useRef, useState } from 'react'
import { sync } from './history'

/**
 * Signing in, which is optional everywhere it appears.
 *
 * The app works signed out and always will: an account is what carries your
 * history from your phone to your laptop, not what lets you play. So every
 * failure here is quiet — no account is a perfectly ordinary state, and a
 * network that will not answer should never stop a round.
 *
 * An app switches this on by setting VITE_GOOGLE_CLIENT_ID and deploying the
 * api/auth endpoints. Where it is unset there is simply no button.
 */

export type Player = { sub: string; name: string }

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GSI = 'https://accounts.google.com/gsi/client'

export const accountsOffered = () => Boolean(CLIENT_ID)

async function ask<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: 'same-origin', ...init })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

/** Google's script, fetched once however many components ask for it. */
let loading: Promise<void> | null = null
const loadGoogle = () =>
  (loading ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = GSI
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      loading = null // let a later attempt try again
      reject(new Error('gsi'))
    }
    document.head.appendChild(el)
  }))

type Gsi = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void
      renderButton: (el: HTMLElement, o: Record<string, string | number>) => void
      disableAutoSelect: () => void
    }
  }
}

/**
 * The signed-in player, and the two ways that changes. `ready` tells a caller
 * the question has been asked and answered, so nothing flashes "sign in" at
 * someone who already is.
 */
export type Account = ReturnType<typeof useAccount>

export function useAccount() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!accountsOffered()) {
      setReady(true)
      return
    }
    let live = true
    ask<{ player: Player | null }>('/api/auth/me').then((r) => {
      if (!live) return
      setPlayer(r?.player ?? null)
      setReady(true)
      // Signing in on a second device should find the first device's rounds
      // waiting, so the exchange happens as soon as we know who this is.
      if (r?.player) void sync()
    })
    return () => {
      live = false
    }
  }, [])

  /** After signing in, hand over whatever was played before signing in. */
  const arrived = useCallback((p: Player) => {
    setPlayer(p)
    void sync()
  }, [])

  const signOut = useCallback(async () => {
    await ask('/api/auth/logout', { method: 'POST' })
    ;(window as unknown as { google?: Gsi }).google?.accounts.id.disableAutoSelect()
    setPlayer(null)
  }, [])

  return { player, ready, setPlayer: arrived, signOut }
}

/**
 * Draws Google's own button into `el`. It has to be theirs: the sign-in flow
 * only trusts a button it rendered, and a lookalike of our own would be both a
 * policy breach and a worse thing to ask someone to trust.
 *
 * Takes the element rather than a ref on purpose. The chip renders nothing
 * until it knows whether anyone is signed in, so the element does not exist on
 * the first pass — and a ref object is the same object forever, so an effect
 * watching one would never hear that the element had arrived.
 */
export function useGoogleButton(
  el: HTMLDivElement | null,
  onSignedIn: (p: Player) => void,
  theme: 'light' | 'dark',
) {
  const latest = useRef(onSignedIn)
  latest.current = onSignedIn

  useEffect(() => {
    if (!CLIENT_ID || !el) return
    let live = true

    loadGoogle()
      .then(() => {
        if (!live) return
        const google = (window as unknown as { google?: Gsi }).google
        if (!google) return
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            const p = await ask<Player>('/api/auth/google', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ credential }),
            })
            if (p) latest.current(p)
          },
        })
        el.replaceChildren()
        google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'medium',
          shape: 'pill',
          text: 'signin',
          locale: 'sr-Latn',
        })
      })
      .catch(() => {
        // Blocked, offline, or a tracker blocker: no button, and no harm.
      })

    return () => {
      live = false
      // Whatever Google put in there is Google's, and React will not clear it.
      el.replaceChildren()
    }
  }, [el, theme])
}
