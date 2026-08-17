import type { ReactNode } from 'react'
import type { Photos, RegionCollection, RegionProps } from './types'

/**
 * A topic is one thing the map can quiz you on. Everything else — the deck,
 * scoring, the progress map, the gestures — is shared, so adding a topic means
 * supplying a dataset and how its question reads.
 *
 * This is the whole contract between an app and the engine. Nothing here knows
 * what a licence plate is, or a mountain.
 */
/** A topic's map data, fetched only when that topic is opened. */
export type TopicData = {
  regions: RegionCollection
  base?: RegionCollection
  relief?: unknown
  /** Photograph credits by code; absent for topics that have no photographs. */
  photos?: Photos
}

export type Topic = {
  /** Unique within the app; also the URL segment in multi-topic apps. */
  id: string
  /** Menu button. */
  label: string
  blurb: string
  /** Headline on the topic's own page — must not talk about another topic. */
  title: string
  /** One line on the home card. */
  card: string
  /** Loaded on demand, so opening one topic does not download the rest. */
  load: () => Promise<TopicData>
  /** A stand-in for the home card, so the chooser needs no dataset at all. */
  sample: RegionProps
  /** How many questions the topic holds, for the card. */
  count: number
  /** Whether the Kosovo and Metohija set can be switched on for this topic. */
  offersKim: boolean
  /**
   * The fine print under that switch, since what the set contains differs by
   * topic. n is how many answers it adds. Required wherever offersKim is true.
   */
  kimNote?: (n: number) => string
  /** Sentence under the title on the menu; n is how many are in play. */
  lead: (n: number) => string
  /** What a single answerable area is called, for the instruction line. */
  unit: string
  /** Label for the button that plays the whole set. */
  allLabel: string
  /** Heading for the extra detail shown on reveal and in the tooltip. */
  detail: string
  /** Whether the code is worth showing as a badge (meaningless for districts). */
  showCode: boolean
  prompt: (item: RegionProps) => ReactNode
  /** The bold line of the wrong-answer reveal. */
  reveal: (item: RegionProps) => ReactNode
  /**
   * What hovering (or arming, on touch) reveals about an area. Where the name
   * IS the answer, this must not be the name, or the map gives the game away —
   * districts show their seat instead, which rewards knowing the geography.
   * Once an area has been answered, showing the real name is reinforcement.
   */
  hover: (item: RegionProps, answered: boolean) => { title: string; sub?: string }
  /** How answers are drawn on the map. */
  kind?: 'area' | 'line' | 'point'
  /** Point topics pick their marker, so a spa is not mistaken for a peak. */
  marker?: 'peak' | 'spa'
}
