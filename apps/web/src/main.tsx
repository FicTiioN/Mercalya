import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { router } from '@/app/router'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado.')

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>,
)
