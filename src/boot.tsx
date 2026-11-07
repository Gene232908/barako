import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'

// Production builds ship the page prerendered (scripts/prerender.mjs); adopt that HTML instead of
// rebuilding it, so nothing flashes or replays. The dev server serves an empty root.
export const boot = (root: HTMLElement) => {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  )
  if (root.hasChildNodes()) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
