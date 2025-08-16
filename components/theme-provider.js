'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect } from 'react'

export function ThemeProvider({ children }){
  useEffect(() => {
    // Initialize theme from localStorage
    const theme = localStorage.getItem('theme')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>{children}</NextThemesProvider>
  )
}

export function ThemeToggle(){
  return (
    <button
      onClick={()=>{
        const root = document.documentElement
        const isDark = root.classList.contains('dark')
        root.classList.toggle('dark', !isDark)
        if(!isDark){ localStorage.setItem('theme','dark') } else { localStorage.removeItem('theme') }
      }}
      className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      <Sun className="w-4 h-4 hidden dark:block"/>
      <Moon className="w-4 h-4 block dark:hidden"/>
    </button>
  )
}
