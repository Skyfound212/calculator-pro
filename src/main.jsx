import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope)

        // Check for updates
        registration.addEventListener('updatefound', () => {
          // Bug 8 fix: Cek newWorker tidak null sebelum addEventListener
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available, notify user (optional)
                console.log('New version available')
                
                // Optional: Show update notification to user
                if (window.confirm('Versi baru CalculatorPro tersedia. Muat ulang sekarang?')) {
                  window.location.reload()
                }
              }
            })
          } else {
            console.warn('[SW] updatefound event fired but installing worker is null')
          }
        })
      })
      .catch((error) => {
        console.error('SW registration failed:', error)
      })
  })
}

// Mount React app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)