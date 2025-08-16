"use client"

import { useEffect, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = ({ title, description, duration = 3000 }) => {
    const id = Date.now()
    const newToast = { id, title, description }
    
    setToasts(prev => [...prev, newToast])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  return { toast, toasts }
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right-full"
        >
          {toast.title && (
            <div className="font-semibold text-sm">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {toast.description}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
