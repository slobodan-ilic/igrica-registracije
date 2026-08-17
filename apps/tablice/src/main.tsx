import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Quiz, setOnlyTopic, setStorageNamespace } from '@kviz/engine'
import '@kviz/engine/tokens.css'
import { TOPICS, TABLICE } from './topics'

// One quiz, so the topic drops out of the URL and its menu is the front page.
setStorageNamespace('tablice')
setOnlyTopic(TABLICE)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Quiz
      topics={TOPICS}
      title={(topic) => (topic ? 'Koja je ovo tablica? · kviz' : 'Registarske oznake · kviz')}
    />
  </StrictMode>,
)
