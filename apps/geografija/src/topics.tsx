import { NameCard, plural, type Topic, type RegionCollection, type Photos } from '@kviz/engine'

/**
 * The quizzes this app offers. Each supplies a dataset and how its question
 * reads; the map, scoring, photographs and the Kosovo switch are the engine's.
 */
export const TOPICS: Record<string, Topic> = {
  okruzi: {
    id: 'okruzi',
    label: 'Okruzi',
    blurb: 'upravni okruzi Srbije',
    title: 'Gde je koji okrug?',
    card: 'Pronađi upravni okrug na mapi Srbije.',
    load: async () => ({
      regions: (await import('../data/okruzi.json')).default as unknown as RegionCollection,
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
      regions: (await import('../data/rivers.json')).default as unknown as RegionCollection,
      photos: (await import('../data/slike-reke.json')).default as Photos,
      base: (await import('../data/outline.json')).default as unknown as RegionCollection,
      relief: (await import('../data/relief.json')).default,
    }),
    sample: { code: 'dunav', name: 'Dunav', covers: ['uliva se u Crno more'] },
    count: 24,
    kind: 'line',
    offersKim: true,
    kimNote: (n) =>
      `${n} ${plural(n, 'reka', 'reke', 'reka')} sa Kosova i Metohije · ` +
      'odatle vode otiču u tri različita mora',
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
      regions: (await import('../data/planine.json')).default as unknown as RegionCollection,
      photos: (await import('../data/slike-planine.json')).default as Photos,
      base: (await import('../data/outline.json')).default as unknown as RegionCollection,
      relief: (await import('../data/relief.json')).default,
    }),
    sample: { code: 'kopaonik', name: 'Kopaonik', covers: ['Pančićev vrh · 2017 m'] },
    count: 22,
    kind: 'point',
    marker: 'peak',
    offersKim: true,
    kimNote: (n) =>
      `${n} ${plural(n, 'planina', 'planine', 'planina')} sa Kosova i Metohije · ` +
      'među njima i najviši vrh koji Srbija broji',
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
      regions: (await import('../data/banje.json')).default as unknown as RegionCollection,
      photos: (await import('../data/slike-banje.json')).default as Photos,
      base: (await import('../data/outline.json')).default as unknown as RegionCollection,
      relief: (await import('../data/relief.json')).default,
    }),
    sample: { code: 'vrnjacka-banja', name: 'Vrnjačka Banja', covers: ['Raški okrug'] },
    count: 23,
    kind: 'point',
    marker: 'spa',
    offersKim: true,
    kimNote: (n) =>
      `${n} ${plural(n, 'banja', 'banje', 'banja')} sa Kosova i Metohije · ` +
      'sa zvaničnog spiska banja u Srbiji',
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

/** Sketched on the home screen so the direction is visible. */
export const UPCOMING = [
  { label: 'Nacionalni parkovi', blurb: 'Đerdap, Tara, Fruška gora…' },
]
