import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LiveApp from './app/LiveApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveApp />
  </StrictMode>,
)
