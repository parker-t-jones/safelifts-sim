/**
 * Browser entry point. Mounts the React app into the #root element
 * from index.html.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
