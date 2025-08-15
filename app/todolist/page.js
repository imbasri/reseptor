'use client'
import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function Todolist(){
    const [saved, setSaved] = useState([])
    const [loadingId, setLoadingId] = useState(null)
    // id -> { langkah: [{text,done}] }
    const [lists, setLists] = useState({})
    // id -> { index, text }
    const [editState, setEditState] = useState({})
    // id -> string (input tambah langkah)
    const [addState, setAddState] = useState({})

    // load on mount and when storage changes in other tabs
    useEffect(()=>{
        const load = ()=>{
            try{
                const s = JSON.parse(localStorage.getItem('savedRecipes')||'[]')
                setSaved(s)
                try{
                    const initLists = {}
                    for(const it of s){
                        const cl = it.checklist
                        if(Array.isArray(cl)) initLists[it.id] = { langkah: cl }
                        else if(cl && typeof cl==='object') initLists[it.id] = { langkah: cl.langkah||[] }
                    }
                    setLists(initLists)
                }catch{}
            }catch{}
        }
        load()
        const onStorage = (e)=>{ if(e.key==='savedRecipes') load() }
        const onLocalUpdate = ()=> load()
        window.addEventListener('storage', onStorage)
        window.addEventListener('savedRecipesUpdated', onLocalUpdate)
        return ()=> {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('savedRecipesUpdated', onLocalUpdate)
        }
    },[])

    const persistChecklist = (id, checklist)=>{
        try{
            const current = JSON.parse(localStorage.getItem('savedRecipes')||'[]')
            const upd = current.map(it=> it.id===id? { ...it, checklist } : it)
            localStorage.setItem('savedRecipes', JSON.stringify(upd))
            setSaved(upd)
        }catch{}
    }

    const summarize = async (id, content) => {
        if((lists[id]?.langkah?.length||0)){
            const ok = window.confirm('Checklist sudah ada. Ganti dengan versi ringkas baru?'); if(!ok) return
        }
        setLoadingId(id)
        try{
            const prompt = `Ringkas resep berikut menjadi checklist ringkas (5-8 langkah) dengan kalimat singkat. Format: satu item per baris memakai dash '-'.\n\n${content}`
            const res = await fetch('/api/recipes/stream', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ingredients:'', diet:'', allergies:'', time:'', servings:'', query: prompt }) })
            if(!res.ok){ setLoadingId(null); return }
            const reader = res.body.getReader(); const dec = new TextDecoder()
            let acc = ''
            while(true){ const { value, done } = await reader.read(); if(done) break; acc += dec.decode(value) }

            const clean = (s)=> s.replace(/^\s*[-*•\d]+[\.)]?\s*/,'').trim()
            const isHeader = (s)=>
                /^(langkah|bahan|ringkasan|checklist|judul|title|summary|steps?)\b/i.test(s) ||
                /[:：]\s*$/.test(s)

            const langkah = acc
                .split(/\r?\n/)
                .map(clean)
                .filter(Boolean)
                .filter(s=>!isHeader(s))
                .slice(0,12)
                .map(t=>({ text: t, done: false }))

            const checklist = { langkah }
            setLists(prev=>({ ...prev, [id]: checklist }))
            persistChecklist(id, checklist)
        }catch{} finally{ setLoadingId(null) }
    }

    const toggle = (id, idx) => {
        setLists(prev=>{
            const cur = prev[id] || { langkah:[] }
            const arr = (cur.langkah||[]).slice(); arr[idx] = { ...arr[idx], done: !arr[idx].done }
            const nextChecklist = { ...cur, langkah: arr }
            const next = { ...prev, [id]: nextChecklist }
            persistChecklist(id, nextChecklist)
            return next
        })
    }

    const removeSaved = (id) => {
        if(!window.confirm('Yakin menghapus resep tersimpan ini? Checklist juga akan dihapus.')) return
        const upd = saved.filter(x=>x.id!==id)
        setSaved(upd)
        localStorage.setItem('savedRecipes', JSON.stringify(upd))
        try{ window.dispatchEvent(new Event('savedRecipesUpdated')) }catch{}
        setLists(prev=>{ const cp = {...prev}; delete cp[id]; return cp })
    }

    const startEdit = (id, idx, current) => setEditState(prev=>({ ...prev, [id]: { index: idx, text: current } }))
    const cancelEdit = (id) => setEditState(prev=>({ ...prev, [id]: null }))
    const applyEdit = (id) => {
        const st = editState[id]; if(!st) return
        setLists(prev=>{
            const cur = prev[id] || { langkah:[] }
            const arr = (cur.langkah||[]).slice(); if(arr[st.index]) arr[st.index] = { ...arr[st.index], text: st.text }
            const nextChecklist = { ...cur, langkah: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
        cancelEdit(id)
    }

    const addItem = (id) => {
        const text = (addState[id]||'').trim(); if(!text) return
        setLists(prev=>{
            const cur = prev[id] || { langkah:[] }
            const arr = [ ...(cur.langkah||[]), { text, done:false } ]
            const nextChecklist = { ...cur, langkah: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
        setAddState(prev=>({ ...prev, [id]: '' }))
    }

    const removeItem = (id, idx) => {
        if(!window.confirm('Hapus item checklist ini?')) return
        setLists(prev=>{
            const cur = prev[id] || { langkah:[] }
            const arr = (cur.langkah||[]).slice(); arr.splice(idx,1)
            const nextChecklist = { ...cur, langkah: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Todolist Resep</h1>
            {saved.length===0 && <p className="text-slate-500">Belum ada resep tersimpan. Simpan dulu dari halaman Resep.</p>}
            <div className="grid md:grid-cols-2 gap-4">
                {saved.map(item=> (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-semibold truncate" title={item.title || `Resep #${item.id}`}>{item.title || `Resep #${item.id}`}</div>
                                <div className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={()=>summarize(item.id, item.content)} loading={loadingId===item.id}>{(lists[item.id]?.langkah?.length)? 'Ganti Checklist':'Buat Checklist'}</Button>
                                <Button size="sm" variant="ghost" onClick={()=>removeSaved(item.id)}>Hapus</Button>
                            </div>
                        </div>
                        <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Lihat ringkasan resep</summary>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-sm mt-2">
                                <div dangerouslySetInnerHTML={{ __html: (item.content||'').split('\n').slice(0,8).map(escape).join('<br/>') }} />
                            </div>
                        </details>
                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm mt-2">
                            {!(lists[item.id]?.langkah?.length) ? <p className="text-slate-500">Checklist belum dibuat.</p> : (
                                <div className="space-y-3 max-h-56 overflow-auto pr-1">
                                    <section>
                                        <h4 className="font-semibold text-xs uppercase tracking-wide text-slate-500">Langkah</h4>
                                        {(lists[item.id]?.langkah||[]).length===0 ? <p className="text-xs text-slate-500">Belum ada langkah.</p> : (
                                            <ul className="pl-0">
                                                {lists[item.id].langkah.map((li, idx)=> (
                                                    <li key={idx} className="list-none flex items-center justify-between gap-2 py-1">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <input type="checkbox" checked={li.done} onChange={()=>toggle(item.id, idx)} />
                                                            {editState[item.id]?.index===idx ? (
                                                                <Input value={editState[item.id]?.text||''} onChange={e=> setEditState(prev=>({ ...prev, [item.id]: { index: idx, text: e.target.value } }))} className="h-8" />
                                                            ) : (
                                                                <span className={li.done? 'line-through opacity-70 truncate':''}>{li.text}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {editState[item.id]?.index===idx ? (
                                                                <>
                                                                    <Button size="sm" onClick={()=>applyEdit(item.id)}>Simpan</Button>
                                                                    <Button size="sm" variant="ghost" onClick={()=>cancelEdit(item.id)}>Batal</Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button size="sm" variant="outline" onClick={()=>startEdit(item.id, idx, li.text)}>Edit</Button>
                                                                    <Button size="sm" variant="ghost" onClick={()=>removeItem(item.id, idx)}>Hapus</Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input placeholder="Tambah langkah" value={addState[item.id]||''} onChange={e=> setAddState(prev=>({ ...prev, [item.id]: e.target.value }))} className="h-8" />
                                            <Button size="sm" onClick={()=>addItem(item.id)}>Tambah</Button>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function escape(s=''){
    return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]))
}
