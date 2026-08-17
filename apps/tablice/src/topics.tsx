import { Plate } from './Plate'
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
export const TOPICS: Record<string, Topic> = {
  srbija: {
    id: 'srbija',
    label: 'Srbija',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojem području pripada oznaka sa tablice.',
    load: async () => ({
      regions: (await import('../data/srbija.json')).default as unknown as RegionCollection,
      photos: (await import('../data/slike-srbija.json')).default as Photos,
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

  hrvatska: {
    id: 'hrvatska',
    label: 'Hrvatska',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojem području pripada oznaka sa hrvatske tablice.',
    load: async () => ({
      regions: (await import('../data/hrvatska.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'ZG', name: 'Zagreb', covers: [] },
    count: 34,
    // Croatia has no such set, and the switch would be meaningless there.
    offersKim: false,
    lead: (n) =>
      'Dobijate oznaku sa hrvatske tablice — kliknite na registarsko područje ' +
      `kojem pripada. ${cap(allOf(n, 'oznaka', 'oznake', 'oznaka'))}, ` +
      'od Zagreba do Dubrovnika.',
    unit: 'područje',
    allLabel: 'Sve oznake',
    detail: 'takođe',
    showCode: true,
    prompt: (item) => <PlateHR code={item.code} />,
    hover: (item) => ({ title: item.name, sub: item.covers.join(' · ') }),
    reveal: (item) => (
      <span>
        <b>{item.code}</b> je {item.name}
      </span>
    ),
  },

  makedonija: {
    id: 'makedonija',
    label: 'Makedonija',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojem području pripada oznaka sa makedonske tablice.',
    load: async () => ({
      regions: (await import('../data/makedonija.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'SK', name: 'Skopje', covers: [] },
    count: 34,
    offersKim: false,
    lead: (n) =>
      'Dobijate oznaku sa makedonske tablice — kliknite na registarsko područje ' +
      `kojem pripada. ${cap(allOf(n, 'oznaka', 'oznake', 'oznaka'))}, ` +
      'od Skoplja do Ohrida.',
    unit: 'područje',
    allLabel: 'Sve oznake',
    detail: 'takođe',
    showCode: true,
    prompt: (item) => <PlateMK code={item.code} />,
    hover: (item) => ({ title: item.name, sub: item.covers.join(' · ') }),
    reveal: (item) => (
      <span>
        <b>{item.code}</b> je {item.name}
      </span>
    ),
  },

  crnagora: {
    id: 'crnagora',
    label: 'Crna Gora',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojoj opštini pripada oznaka sa crnogorske tablice.',
    load: async () => ({
      regions: (await import('../data/crnagora.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'PG', name: 'Podgorica', covers: [] },
    count: 25,
    offersKim: false,
    lead: (n) =>
      'Dobijate oznaku sa crnogorske tablice — kliknite na opštinu kojoj ' +
      `pripada. ${cap(allOf(n, 'oznaka', 'oznake', 'oznaka'))}, ` +
      'po jedna za svaku opštinu.',
    unit: 'opštinu',
    allLabel: 'Sve oznake',
    detail: 'takođe',
    showCode: true,
    prompt: (item) => <PlateME code={item.code} />,
    hover: (item) => ({ title: item.name, sub: item.covers.join(' · ') }),
    reveal: (item) => (
      <span>
        <b>{item.code}</b> je {item.name}
      </span>
    ),
  },

  slovenija: {
    id: 'slovenija',
    label: 'Slovenija',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojem području pripada oznaka sa slovenačke tablice.',
    load: async () => ({
      regions: (await import('../data/slovenija.json')).default as unknown as RegionCollection,
    }),
    sample: { code: 'LJ', name: 'Ljubljana', covers: [] },
    count: 11,
    offersKim: false,
    lead: (n) =>
      'Dobijate oznaku sa slovenačke tablice — kliknite na registarsko područje ' +
      `kojem pripada. ${cap(allOf(n, 'oznaka', 'oznake', 'oznaka'))}, ` +
      'od Ljubljane do Maribora.',
    unit: 'područje',
    allLabel: 'Sve oznake',
    detail: 'takođe',
    showCode: true,
    prompt: (item) => <PlateSI code={item.code} />,
    hover: (item) => ({ title: item.name, sub: item.covers.join(' · ') }),
    reveal: (item) => (
      <span>
        <b>{item.code}</b> je {item.name}
      </span>
    ),
  },
}

/** The country the app opens on, and therefore the one served at `/`. */
export const ROOT = 'srbija'
