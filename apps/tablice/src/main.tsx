import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Quiz, setRootTopic, setStorageNamespace } from '@kviz/engine'
import '@kviz/engine/tokens.css'
import { TOPICS, ROOT } from './topics'

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
