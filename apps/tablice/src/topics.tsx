import { Plate } from './Plate'
import { allOf, cap, plural, type Topic, type RegionCollection, type Photos } from '@kviz/engine'

/**
 * The one quiz this app offers: a plate code, and the registration area it
 * belongs to. Everything else — the map, scoring, photographs, the Kosovo
 * switch — comes from the engine.
 */
export const TOPICS: Record<string, Topic> = {
  tablice: {
    id: 'tablice',
    label: 'Tablice',
    blurb: 'registarske oznake',
    title: 'Koja je ovo tablica?',
    card: 'Pogodi kojem području pripada oznaka sa tablice.',
    load: async () => ({
      regions: (await import('../data/regions.json')).default as unknown as RegionCollection,
      photos: (await import('../data/slike-tablice.json')).default as Photos,
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
}

export const TABLICE = 'tablice'
