import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { Quiz, setRootTopic, setStorageNamespace } from '@kviz/engine'
import '@kviz/engine/tokens.css'
import { TOPICS, ROOT } from './topics'

// Page views only: no cookies, no accounts, nothing about a person — just
// whether anyone is playing. Production only, since the script it fetches is
// served by the host and 404s anywhere else.
if (import.meta.env.PROD) inject()

// Serbia is the front page; the other countries sit at /hrvatska and so on.
setStorageNamespace('tablice')
setRootTopic(ROOT)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Quiz
      topics={TOPICS}
      siblingsLabel="Druge zemlje"
      title={(topic) =>
        topic && topic.id !== ROOT
          ? `Tablice · ${topic.label}`
          : 'Registarske oznake · kviz'
      }
    />
  </StrictMode>,
)
