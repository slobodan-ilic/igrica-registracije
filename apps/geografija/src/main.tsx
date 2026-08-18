import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { Quiz, setStorageNamespace } from '@kviz/engine'
import '@kviz/engine/tokens.css'
import { TOPICS } from './topics'
import { Home } from './Home'

// Page views only: no cookies, no accounts, nothing about a person — just
// whether anyone is playing. Production only, since the script it fetches is
// served by the host and 404s anywhere else.
if (import.meta.env.PROD) inject()

setStorageNamespace('geografija')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Quiz
      topics={TOPICS}
      home={<Home />}
      title={(topic) =>
        topic ? `${topic.label} · geografija Srbije` : 'Geografija Srbije · kviz'
      }
    />
  </StrictMode>,
)
