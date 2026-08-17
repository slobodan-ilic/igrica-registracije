export type RegionProps = {
  /** Registration code as printed on the plate, e.g. "NS". */
  code: string
  /** Latin name of the registration area, e.g. "Novi Sad". */
  name: string
  /** Cyrillic name, e.g. "Нови Сад". Plates only. */
  cyrillic?: string
  /** Other municipalities that register under the same code. */
  covers: string[]
  /** Set for the areas Serbia lists for Kosovo and Metohija. */
  kim?: boolean
}

export type RegionFeature = {
  type: 'Feature'
  properties: RegionProps
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon
}

export type RegionCollection = {
  type: 'FeatureCollection'
  features: RegionFeature[]
}

/**
 * How a region should be painted right now.
 * `correct` and `missed` persist for the whole round — together they are the
 * player's progress map. `wrong` and `revealed` last only while an answer is
 * on screen.
 */
export type RegionState = 'idle' | 'correct' | 'missed' | 'wrong' | 'revealed'

/** The lasting outcome of a region's question, once it has been asked. */
export type Result = 'correct' | 'missed'

/**
 * What Commons asks us to say about a photograph: author, licence, and a link
 * to the file's page. Kept to one letter each because there is one of these per
 * answer and they ship with the topic.
 */
export type Credit = { a: string; l: string; u: string }

/** Credits by region code. A region with no photograph simply has no entry. */
export type Photos = Record<string, Credit>
