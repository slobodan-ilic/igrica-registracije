// The map-quiz engine. An app supplies topics and a name; everything else —
// rendering, gestures, scoring, photographs, routing, remembered settings and
// the design system — comes from here.

export { Quiz, type QuizProps } from './Quiz'
export type { Topic, TopicData } from './topic'
export type {
  Credit,
  Photos,
  RegionCollection,
  RegionFeature,
  RegionProps,
  RegionState,
  Result,
} from './types'

// Building blocks an app needs to describe its own topics.
export { NameCard } from './NameCard'
export { plural, allOf, cap } from './sr'
export { joinSr } from './deck'
export { href, linkProps, setRootTopic, hasChooser } from './router'
export { setStorageNamespace } from './prefs'
