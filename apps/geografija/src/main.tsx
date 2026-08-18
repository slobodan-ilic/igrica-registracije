import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Quiz, setStorageNamespace } from '@kviz/engine'
import '@kviz/engine/tokens.css'
import { TOPICS } from './topics'
import { Home } from './Home'

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
