import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { Quiz, setRootTopic, setStorageNamespace } from '@kviz/engine'
import '@kviz/engine/tokens.css'
import { TOPICS, ROOT } from './topics'

// Serbia is the front page; the other countries sit at /hrvatska and so on.
setStorageNamespace('tablice')
setRootTopic(ROOT)

// Page views only — no cookies, no accounts, nothing about a person. It answers
// "is anyone playing", which is not the question signing in answers. Production
// alone: in development the script is not served, and a 404 in the console is
// worse than not counting.
if (import.meta.env.PROD) inject()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Quiz
      topics={TOPICS}
      siblingsLabel="Druge zemlje"
      elsewhere={{
        href: 'https://geografija-srbija.vercel.app',
        label: 'Geografija Srbije',
        blurb: 'Reke, planine, banje i okruzi — na istoj mapi.',
      }}
      title={(topic) =>
        topic && topic.id !== ROOT
          ? `Tablice · ${topic.label}`
          : 'Registarske oznake · kviz'
      }
    />
  </StrictMode>,
)
