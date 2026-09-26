import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LiveApp from './app/LiveApp.tsx'
import { ConfirmProvider } from './shared/ConfirmDialog.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <LiveApp />
    </ConfirmProvider>
  </StrictMode>,
)
