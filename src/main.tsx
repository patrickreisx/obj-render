import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './pages/home.tsx'
import './styles/global.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
