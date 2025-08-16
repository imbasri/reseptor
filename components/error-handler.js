'use client'
import { useEffect } from 'react'

export default function GlobalErrorHandler() {
  useEffect(() => {
    // Handle browser extension related errors
    const originalError = console.error
    console.error = (...args) => {
      const message = args[0]?.toString() || ''
      
      // Suppress known browser extension warnings
      if (
        message.includes('cz-shortcut-listen') ||
        message.includes('XrayWrapper') ||
        message.includes('cross-origin object') ||
        message.includes('Extra attributes from the server')
      ) {
        return // Suppress these warnings
      }
      
      // Log other errors normally
      originalError.apply(console, args)
    }

    // Handle uncaught errors from browser extensions
    const handleError = (event) => {
      const message = event.message || ''
      if (
        message.includes('XrayWrapper') ||
        message.includes('cross-origin object') ||
        message.includes('cz-shortcut-listen')
      ) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleError)
    
    return () => {
      console.error = originalError
      window.removeEventListener('error', handleError)
    }
  }, [])

  return null
}
