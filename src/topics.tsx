import type { ReactNode } from 'react'
import { Plate } from './components/Plate'
import { NameCard } from './components/NameCard'
import type { RegionCollection, RegionProps } from './types'
import { allOf, plural } from './lib/sr'

/**
 * A topic is one thing the map can quiz you on. Everything else — the deck,
 * scoring, the progress map, the gestures — is shared, so adding a topic means
 * supplying a dataset and how its question reads.
 */
/** A topic's map data, fetched only when that topic is opened. */
export type TopicData = {
  regions: RegionCollection
  base?: RegionCollection
  relief?: unknown
}

export type Topic = {
  id: TopicId
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

export type TopicId = 'tablice' | 'okruzi' | 'reke' | 'planine' | 'banje'
export const TOPIC_IDS = ['tablice', 'okruzi', 'reke', 'planine', 'banje'] as const

export const TOPICS: Record<TopicId, Topic> = {
  tablice: {
    id: 'tablice',
    label: 'Tablice',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojem području pripada oznaka sa tablice.',
    load: async () => ({
      regions: (await import('./data/regions.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'NS', name: 'Novi Sad', covers: [] },
    count: 74,
    offersKim: true,
    kimNote: (n) =>
      `${n} ${plural(n, 'oznaka koju', 'oznake koje', 'oznaka koje')} Srbija vodi za ` +
      'pokrajinu · na terenu se od 2023. koriste RKS tablice',
    lead: (n) =>
      `Dobijate oznaku sa tablice — kliknite na registarsko područje kojem pripada. ` +
      `${cap(allOf(n, 'oznaka', 'oznake', 'oznaka'))}, tačno onako kako je Srbija podeljena.`,
    unit: 'područje',
    allLabel: 'Sve oznake',
    detail: 'takođe',
    showCode: true,
    prompt: (item) => <Plate code={item.code} />,
    // The code is the question, so naming the area is a hint, not the answer.
    hover: (item) => ({ title: item.name, sub: item.covers.join(' · ') }),
    reveal: (item) => (
      <span>
        <b>{item.code}</b> je {item.name}
      </span>
    ),
  },

  okruzi: {
    id: 'okruzi',
    label: 'Okruzi',
    blurb: 'upravni okruzi Srbije',
    title: 'Gde je koji okrug?',
    card: 'Pronađi upravni okrug na mapi Srbije.',
    load: async () => ({
      regions: (await import('./data/okruzi.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'zlatiborski-okrug', name: 'Zlatiborski okrug', covers: ['Užice'] },
    count: 25,
    offersKim: true,
    kimNote: (n) =>
      `${n} ${plural(n, 'upravni okrug', 'upravna okruga', 'upravnih okruga')} po podeli ` +
      'Srbije · Kosovo istu teritoriju deli na sedam svojih okruga',
    // Belgrade is a city, not an okrug, so it is counted apart from the rest.
    lead: (n) =>
      'Dobijate ime okruga — kliknite gde se nalazi na mapi. ' +
      `${n - 1} ${plural(n - 1, 'upravni okrug', 'upravna okruga', 'upravnih okruga')} ` +
      'i Grad Beograd.',
    unit: 'okrug',
    allLabel: 'Svi okruzi',
    detail: 'sedište',
    showCode: false,
    prompt: (item) => <NameCard kicker="Gde je" title={item.name} />,
    hover: (item, answered) =>
      answered
        ? { title: item.name, sub: item.covers[0] }
        : { title: item.covers[0] ?? '?', sub: 'sedište okruga' },
    reveal: (item) => <span>{item.name}</span>,
  },

  reke: {
    id: 'reke',
    label: 'Reke',
    blurb: 'reke Srbije',
    title: 'Gde teče koja reka?',
    card: 'Prati tok reke kroz Srbiju i pronađi je na mapi.',
    load: async () => ({
      regions: (await import('./data/rivers.json')).default as unknown as RegionCollection,
      base: (await import('./data/outline.json')).default as unknown as RegionCollection,
      relief: (await import('./data/relief.json')).default,
    }),
    sample: { code: 'dunav', name: 'Dunav', covers: ['uliva se u Crno more'] },
    count: 24,
    kind: 'line',
    offersKim: false,
    lead: (n) =>
      `Dobijate ime reke — kliknite na njen tok. ${n} ` +
      `${plural(n, 'reka koja se uči', 'reke koje se uče', 'reka koje se uče')} u školi, ` +
      'od Dunava do Uvca.',
    unit: 'reku',
    allLabel: 'Sve reke',
    detail: '',
    showCode: false,
    prompt: (item) => <NameCard kicker="Gde je" title={item.name} />,
    reveal: (item) => <span>{item.name}</span>,
    // The name is the answer, so unanswered rivers show where they end up.
    hover: (item, answered) =>
      answered
        ? { title: item.name, sub: item.covers[0] }
        : { title: item.covers[0] ?? '', sub: undefined },
  },

  planine: {
    id: 'planine',
    label: 'Planine',
    blurb: 'planine Srbije',
    title: 'Gde je koja planina?',
    card: 'Pronađi planinu na mapi — od Fruške gore do Kopaonika.',
    load: async () => ({
      regions: (await import('./data/planine.json')).default as unknown as RegionCollection,
      base: (await import('./data/outline.json')).default as unknown as RegionCollection,
      relief: (await import('./data/relief.json')).default,
    }),
    sample: { code: 'kopaonik', name: 'Kopaonik', covers: ['Pančićev vrh · 2017 m'] },
    count: 24,
    kind: 'point',
    marker: 'peak',
    offersKim: false,
    lead: (n) =>
      `Dobijate ime planine — kliknite gde se nalazi. ${n} ` +
      `${plural(n, 'planina koja se uči', 'planine koje se uče', 'planina koje se uče')} u školi.`,
    unit: 'planinu',
    allLabel: 'Sve planine',
    detail: 'najviši vrh',
    showCode: false,
    prompt: (item) => <NameCard kicker="Gde je" title={item.name} />,
    reveal: (item) => <span>{item.name}</span>,
    // The name is the answer, so unanswered mountains show their summit.
    hover: (item, answered) =>
      answered
        ? { title: item.name, sub: item.covers[0] }
        : { title: item.covers[0] ?? '', sub: 'najviši vrh' },
  },

  banje: {
    id: 'banje',
    label: 'Banje',
    blurb: 'banje Srbije',
    title: 'Gde je koja banja?',
    card: 'Pronađi poznate srpske banje na mapi.',
    load: async () => ({
      regions: (await import('./data/banje.json')).default as unknown as RegionCollection,
      base: (await import('./data/outline.json')).default as unknown as RegionCollection,
      relief: (await import('./data/relief.json')).default,
    }),
    sample: { code: 'vrnjacka-banja', name: 'Vrnjačka Banja', covers: ['Raški okrug'] },
    count: 23,
    kind: 'point',
    marker: 'spa',
    offersKim: false,
    lead: (n) =>
      `Dobijate ime banje — kliknite gde se nalazi. ${n} ` +
      `${plural(n, 'banja koja se uči', 'banje koje se uče', 'banja koje se uče')} u školi.`,
    unit: 'banju',
    allLabel: 'Sve banje',
    detail: 'okrug',
    showCode: false,
    prompt: (item) => <NameCard kicker="Gde je" title={item.name} />,
    reveal: (item) => <span>{item.name}</span>,
    // The name is the answer, so unanswered spas show only their district.
    hover: (item, answered) =>
      answered
        ? { title: item.name, sub: item.covers[0] }
        : { title: item.covers[0] ?? '', sub: undefined },
  },
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Sketched on the home screen so the direction is visible. */
export const UPCOMING = [
  { label: 'Nacionalni parkovi', blurb: 'Đerdap, Tara, Fruška gora…' },
]
