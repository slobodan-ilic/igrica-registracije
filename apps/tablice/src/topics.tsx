import type { ReactNode } from 'react'
import { PlateRS } from './PlateRS'
import { PlateHR } from './PlateHR'
import { PlateMK } from './PlateMK'
import { PlateME } from './PlateME'
import { PlateSI } from './PlateSI'
import {
  allOf, cap, plural,
  type Photos, type RegionCollection, type Topic,
} from '@kviz/engine'

/**
 * One quiz per country: a plate code, and the registration area it belongs to.
 * Everything else — the map, scoring, photographs, the Kosovo switch — is the
 * engine's. The UI is Serbian throughout, whichever country you are playing.
 */

type Country = {
  id: string
  /** Menu button and switcher card. */
  label: string
  /** One line on the switcher card. */
  card: string
  load: Topic['load']
  /** Shown on cards, so the chooser needs no dataset. */
  sample: Topic['sample']
  /** How many codes are in play by default, for the card. */
  count: number
  /** How its plate is drawn. */
  plate: (code: string) => ReactNode
  /** The sentence under the title; n is how many codes are in play. */
  lead: Topic['lead']
  /** What one answerable area is called there — an okrug is not an opština. */
  unit?: string
  /** Serbia alone offers the Kosovo set. */
  kim?: Topic['kimNote']
}

/**
 * Everything the five countries share. A plate quiz always asks the same
 * question in the same words — only the plate, the map and the count change —
 * so the wording lives here once rather than five times.
 */
function country({ unit = 'područje', kim, plate, ...rest }: Country): Topic {
  return {
    ...rest,
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    unit,
    allLabel: 'Sve oznake',
    detail: 'takođe',
    showCode: true,
    offersKim: kim !== undefined,
    kimNote: kim,
    prompt: (item) => plate(item.code),
    // The code is the question, so naming the area is a hint, not the answer.
    hover: (item) => ({ title: item.name, sub: item.covers.join(' · ') }),
    reveal: (item) => (
      <span>
        <b>{item.code}</b> je {item.name}
      </span>
    ),
  }
}

/**
 * The lead sentence. Every country's is the same shape — where the plate is
 * from, what to click, how many there are — but the middle clause has to agree
 * with what is being clicked: a područje is neuter and takes "kojem", an
 * opština is feminine and takes "kojoj".
 */
const lead = (from: string, tail: string, target = 'registarsko područje kojem') =>
  (n: number) =>
    `Dobijate oznaku sa ${from} — kliknite na ${target} pripada. ` +
    `${cap(allOf(n, 'oznaka', 'oznake', 'oznaka'))}, ${tail}.`

export const TOPICS: Record<string, Topic> = {
  srbija: country({
    id: 'srbija',
    label: 'Srbija',
    card: 'Pogodi kojem području pripada oznaka sa tablice.',
    load: async () => ({
      regions: (await import('../data/srbija.json')).default as unknown as RegionCollection,
      photos: (await import('../data/slike-srbija.json')).default as Photos,
    }),
    sample: { code: 'NS', name: 'Novi Sad', covers: [] },
    count: 74,
    plate: (code) => <PlateRS code={code} />,
    lead: lead('tablice', 'tačno onako kako je Srbija podeljena'),
    kim: (n) =>
      `${n} ${plural(n, 'oznaka koju', 'oznake koje', 'oznaka koje')} Srbija vodi za ` +
      'pokrajinu · na terenu se od 2023. koriste RKS tablice',
  }),

  hrvatska: country({
    id: 'hrvatska',
    label: 'Hrvatska',
    card: 'Pogodi kojem području pripada oznaka sa hrvatske tablice.',
    load: async () => ({
      regions: (await import('../data/hrvatska.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'ZG', name: 'Zagreb', covers: [] },
    count: 34,
    plate: (code) => <PlateHR code={code} />,
    lead: lead('hrvatske tablice', 'od Zagreba do Dubrovnika'),
  }),

  makedonija: country({
    id: 'makedonija',
    label: 'Makedonija',
    card: 'Pogodi kojem području pripada oznaka sa makedonske tablice.',
    load: async () => ({
      regions: (await import('../data/makedonija.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'SK', name: 'Skopje', covers: [] },
    count: 34,
    plate: (code) => <PlateMK code={code} />,
    lead: lead('makedonske tablice', 'od Skoplja do Ohrida'),
  }),

  crnagora: country({
    id: 'crnagora',
    label: 'Crna Gora',
    card: 'Pogodi kojoj opštini pripada oznaka sa crnogorske tablice.',
    load: async () => ({
      regions: (await import('../data/crnagora.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'PG', name: 'Podgorica', covers: [] },
    count: 25,
    unit: 'opštinu',
    plate: (code) => <PlateME code={code} />,
    lead: lead('crnogorske tablice', 'po jedna za svaku opštinu', 'opštinu kojoj'),
  }),

  slovenija: country({
    id: 'slovenija',
    label: 'Slovenija',
    card: 'Pogodi kojem području pripada oznaka sa slovenačke tablice.',
    load: async () => ({
      regions: (await import('../data/slovenija.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'LJ', name: 'Ljubljana', covers: [] },
    count: 11,
    plate: (code) => <PlateSI code={code} />,
    lead: lead('slovenačke tablice', 'od Ljubljane do Maribora'),
  }),
}

/** The country the app opens on, and therefore the one served at `/`. */
export const ROOT = 'srbija'
