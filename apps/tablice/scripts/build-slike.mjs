// One photograph per registration area: the lead image of its town's
// sr.wikipedia article. See @kviz/build/slike for the rules.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPhotos, reportPhotos } from '@kviz/build/slike'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
reportPhotos(await buildPhotos({ app, topics: { srbija: 'srbija' } }), 70)
