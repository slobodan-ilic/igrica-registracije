// One photograph per answer, for the topics that have them. Okruzi are absent
// on purpose: their articles lead with a locator map of the answer.
// See @kviz/build/slike for the rules.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPhotos, reportPhotos } from '@kviz/build/slike'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const topics = { planine: 'planine', banje: 'banje', reke: 'rivers' }
reportPhotos(await buildPhotos({ app, topics }), 60)
