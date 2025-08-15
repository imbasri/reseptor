"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ThemeToggle } from './theme-provider'

export default function Navbar(){
  const [savedCount, setSavedCount] = useState(0)
  useEffect(()=>{
  const load = ()=>{ try{ const s = JSON.parse(localStorage.getItem('savedRecipes')||'[]'); setSavedCount(s.length||0) }catch{} }
    load()
  const onStorage = (e)=>{ if(e.key==='savedRecipes') load() }
  const onLocalUpdate = ()=> load()
    window.addEventListener('storage', onStorage)
  window.addEventListener('savedRecipesUpdated', onLocalUpdate)
  return ()=> { window.removeEventListener('storage', onStorage); window.removeEventListener('savedRecipesUpdated', onLocalUpdate) }
  },[])
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/60 dark:bg-[#0b1020]/50 border-b border-slate-200/60 dark:border-white/10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight inline-flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor">
            <path d="M6 7a6 6 0 0112 0v1h1a1 1 0 011 1v4a8 8 0 11-16 0V9a1 1 0 011-1h1V7zm2 1h8V7a4 4 0 10-8 0v1zm10 2H6v3a6 6 0 1012 0V10z"/>
          </svg>
          <span>Reseptor</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/recipes" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition">Resep</Link>
          <Link href="/todolist" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition inline-flex items-center gap-2">
            <span>Todolist</span>
            {savedCount>0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">{savedCount}</span>}
          </Link>
          <Link href="/chat" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition">Chat</Link>
          <div className="ml-1"><ThemeToggle /></div>
        </nav>
      </div>
    </header>
  )
}
