import Link from 'next/link'

export default function Footer(){
  return (
    <footer className="mt-10 border-t w-full border-slate-200/60 dark:border-white/10">
      <div className="mx-auto container px-4 py-6 text-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="text-slate-600 dark:text-slate-300">© {new Date().getFullYear()} Reseptor · Memasak lebih cerdas dengan Granite AI lokal</div>
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Link className="hover:underline" href="/recipes">Resep</Link>
          <Link className="hover:underline" href="/todolist">Todolist</Link>
          <Link className="hover:underline" href="/chat">Chat</Link>
        </div>
      </div>
    </footer>
  )
}
