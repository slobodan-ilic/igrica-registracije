import { useState, type ReactNode } from 'react'
import { linkProps } from './router'
import { accountsOffered, useGoogleButton, type Account, type Player } from './account'
import type { Theme } from './prefs'

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme
  onChange: (t: Theme) => void
}) {
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="theme"
      onClick={() => onChange(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Svetla tema' : 'Tamna tema'}
      title={dark ? 'Svetla tema' : 'Tamna tema'}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="10" cy="10" r="4" />
            <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.9 3.9l1.4 1.4M14.7 14.7l1.4 1.4M16.1 3.9l-1.4 1.4M5.3 14.7l-1.4 1.4" />
          </>
        ) : (
          <path d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1z" />
        )}
      </svg>
    </button>
  )
}

/** Rising bars for the streak — a drawn mark rather than an emoji. */
export function Streak({ n }: { n: number }) {
  if (n === 0) return <>—</>
  return (
    <span className="streak">
      <svg className="streak__mark" viewBox="0 0 13 10" aria-hidden="true">
        <rect y="6.5" width="3" height="3.5" rx="1" opacity={n >= 1 ? 1 : 0.25} />
        <rect x="5" y="3.5" width="3" height="6.5" rx="1" opacity={n >= 3 ? 1 : 0.25} />
        <rect x="10" width="3" height="10" rx="1" opacity={n >= 5 ? 1 : 0.25} />
      </svg>
      {n}
    </span>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  )
}

/** Back to the previous screen, shown top-left on every page but home. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <a className="back" {...linkProps(to)}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3 5 8l5 5" />
      </svg>
      {label}
    </a>
  )
}

/**
 * Theme and account, in the same corner of every screen.
 *
 * Defined here rather than inside the screen that draws it: a component
 * declared during render is a new type on every render, and React would
 * unmount and rebuild it each time — which would take Google's button with it.
 */
export function Corner({
  theme,
  onTheme,
  account,
}: {
  theme: Theme
  onTheme: (t: Theme) => void
  account: Account
}) {
  return (
    <div className="corner">
      <AccountChip
        player={account.player}
        ready={account.ready}
        onSignedIn={account.setPlayer}
        onSignOut={account.signOut}
        theme={theme}
      />
      <ThemeToggle theme={theme} onChange={onTheme} />
    </div>
  )
}

/**
 * Google's own sign-in button when signed out, your name and a way out when
 * signed in. Absent entirely where an app has no accounts.
 */
function AccountChip({
  player,
  ready,
  onSignedIn,
  onSignOut,
  theme,
}: {
  player: Player | null
  ready: boolean
  onSignedIn: (p: Player) => void
  onSignOut: () => void
  theme: Theme
}) {
  // A callback ref, so the hook hears about the element the moment it exists.
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  useGoogleButton(slot, onSignedIn, theme)

  // Nothing at all until we know: flashing "sign in" at someone who already is
  // reads as having been logged out.
  if (!accountsOffered() || !ready) return null

  if (player) {
    return (
      // Keyed apart from the signed-out slot below. Both branches are a div in
      // the same place, so without this React reuses the one node and merely
      // adds these children — leaving Google's button sitting beside them,
      // since that button was never in React's tree for React to remove.
      <div className="account" key="in">
        <span className="account__name" title="Prijavljeni ste">{player.name}</span>
        <button type="button" className="account__out" onClick={onSignOut}>
          Odjava
        </button>
      </div>
    )
  }
  return <div className="account account--google" key="out" ref={setSlot} />
}
