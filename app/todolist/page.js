'use client'
import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog'

export default function Todolist(){
    const [saved, setSaved] = useState([])
    const [loadingId, setLoadingId] = useState(null)
    // id -> { langkah: [{text,done}], bahan: [{text,done}] }
    const [lists, setLists] = useState({})
    // id -> { index, text }
    const [editState, setEditState] = useState({})
    // id -> string (input tambah langkah)
    const [addState, setAddState] = useState({})
    const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null, idx: null })
    const [replaceDialog, setReplaceDialog] = useState({ open: false, id: null, content: '' })
    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState(null)
    const [draggedOver, setDraggedOver] = useState(null)
    // Multi-select state
    const [selectedRecipes, setSelectedRecipes] = useState(new Set())
    const [isSelectMode, setIsSelectMode] = useState(false)

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
                        if(Array.isArray(cl)) {
                            // Legacy format - convert to new format
                            initLists[it.id] = { langkah: cl, bahan: [] }
                        } else if(cl && typeof cl==='object') {
                            initLists[it.id] = { 
                                langkah: cl.langkah || [],
                                bahan: cl.bahan || []
                            }
                        } else {
                            // No checklist, create empty
                            initLists[it.id] = { langkah: [], bahan: [] }
                        }
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
            setReplaceDialog({ open: true, id, content })
            return
        }
        await doSummarize(id, content)
    }

    const doSummarize = async (id, content) => {
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

    const toggle = (id, idx, section = 'langkah') => {
        setLists(prev=>{
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = (cur[section]||[]).slice(); 
            arr[idx] = { ...arr[idx], done: !arr[idx].done }
            const nextChecklist = { ...cur, [section]: arr }
            const next = { ...prev, [id]: nextChecklist }
            persistChecklist(id, nextChecklist)
            return next
        })
    }

    // Drag and drop functions
    const handleDragStart = (e, id, idx, section) => {
        setDraggedItem({ id, idx, section })
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e, id, idx, section) => {
        e.preventDefault()
        setDraggedOver({ id, idx, section })
    }

    const handleDragEnd = () => {
        setDraggedItem(null)
        setDraggedOver(null)
    }

    const handleDrop = (e, targetId, targetIdx, targetSection) => {
        e.preventDefault()
        if (!draggedItem || draggedItem.id !== targetId || draggedItem.section !== targetSection) return
        
        const sourceIdx = draggedItem.idx
        if (sourceIdx === targetIdx) return

        setLists(prev => {
            const cur = prev[targetId] || { langkah:[], bahan:[] }
            const arr = [...(cur[targetSection] || [])]
            
            // Move item from source to target position
            const [movedItem] = arr.splice(sourceIdx, 1)
            arr.splice(targetIdx, 0, movedItem)
            
            const nextChecklist = { ...cur, [targetSection]: arr }
            persistChecklist(targetId, nextChecklist)
            return { ...prev, [targetId]: nextChecklist }
        })
        
        setDraggedItem(null)
        setDraggedOver(null)
    }

    const removeSaved = (id) => {
        setDeleteDialog({ open: true, type: 'recipe', id, idx: null })
    }

    const doRemoveSaved = (id) => {
        const upd = saved.filter(x=>x.id!==id)
        setSaved(upd)
        localStorage.setItem('savedRecipes', JSON.stringify(upd))
        try{ window.dispatchEvent(new Event('savedRecipesUpdated')) }catch{}
        setLists(prev=>{ const cp = {...prev}; delete cp[id]; return cp })
        setDeleteDialog({ open: false, type: '', id: null, idx: null })
    }

    // Multi-select functions
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode)
        setSelectedRecipes(new Set())
    }

    const toggleSelectRecipe = (recipeId) => {
        setSelectedRecipes(prev => {
            const newSet = new Set(prev)
            if (newSet.has(recipeId)) {
                newSet.delete(recipeId)
            } else {
                newSet.add(recipeId)
            }
            return newSet
        })
    }

    const selectAllRecipes = () => {
        if (selectedRecipes.size === saved.length) {
            setSelectedRecipes(new Set())
        } else {
            setSelectedRecipes(new Set(saved.map(recipe => recipe.id)))
        }
    }

    const deleteSelectedRecipes = () => {
        if (selectedRecipes.size === 0) return
        setDeleteDialog({ 
            open: true, 
            type: 'multiple', 
            id: null, 
            idx: null,
            selectedIds: Array.from(selectedRecipes)
        })
    }

    const doDeleteSelectedRecipes = () => {
        const selectedIds = deleteDialog.selectedIds || []
        const updatedSaved = saved.filter(recipe => !selectedIds.includes(recipe.id))
        setSaved(updatedSaved)
        localStorage.setItem('savedRecipes', JSON.stringify(updatedSaved))
        
        // Clean up lists state
        setLists(prev => {
            const newLists = { ...prev }
            selectedIds.forEach(id => delete newLists[id])
            return newLists
        })
        
        try { 
            window.dispatchEvent(new Event('savedRecipesUpdated')) 
        } catch {}
        
        setSelectedRecipes(new Set())
        setIsSelectMode(false)
        setDeleteDialog({ open: false, type: '', id: null, idx: null, selectedIds: null })
    }

    const deleteAllRecipes = () => {
        setDeleteDialog({ 
            open: true, 
            type: 'all', 
            id: null, 
            idx: null 
        })
    }

    const doDeleteAllRecipes = () => {
        setSaved([])
        localStorage.setItem('savedRecipes', JSON.stringify([]))
        setLists({})
        setSelectedRecipes(new Set())
        setIsSelectMode(false)
        try { 
            window.dispatchEvent(new Event('savedRecipesUpdated')) 
        } catch {}
        setDeleteDialog({ open: false, type: '', id: null, idx: null })
    }

    const startEdit = (id, idx, current, section = 'langkah') => setEditState(prev=>({ ...prev, [id]: { index: idx, text: current, section } }))
    const cancelEdit = (id) => setEditState(prev=>({ ...prev, [id]: null }))
    const applyEdit = (id) => {
        const st = editState[id]; if(!st) return
        setLists(prev=>{
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = (cur[st.section]||[]).slice(); 
            if(arr[st.index]) arr[st.index] = { ...arr[st.index], text: st.text }
            const nextChecklist = { ...cur, [st.section]: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
        cancelEdit(id)
    }

    const addItem = (id, section = 'langkah') => {
        const text = (addState[`${id}-${section}`]||'').trim(); if(!text) return
        setLists(prev=>{
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = [ ...(cur[section]||[]), { text, done:false } ]
            const nextChecklist = { ...cur, [section]: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
        setAddState(prev=>({ ...prev, [`${id}-${section}`]: '' }))
    }

    const removeItem = (id, idx, section = 'langkah') => {
        setDeleteDialog({ open: true, type: 'item', id, idx, section })
    }

    const doRemoveItem = (id, idx) => {
        const section = deleteDialog.section || 'langkah'
        setLists(prev=>{
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = (cur[section]||[]).slice(); arr.splice(idx,1)
            const nextChecklist = { ...cur, [section]: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
        setDeleteDialog({ open: false, type: '', id: null, idx: null, section: null })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Todolist Resep</h1>
                
                {saved.length > 0 && (
                    <div className="flex items-center gap-2">
                        {isSelectMode ? (
                            <>
                                <span className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                    {selectedRecipes.size} dari {saved.length} dipilih
                                </span>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={selectAllRecipes}
                                    className="h-8 text-xs"
                                >
                                    {selectedRecipes.size === saved.length ? '✕ Batal Semua' : '✓ Pilih Semua'}
                                </Button>
                                {selectedRecipes.size > 0 && (
                                    <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={deleteSelectedRecipes}
                                        className="h-8 text-xs"
                                    >
                                        🗑️ Hapus ({selectedRecipes.size})
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={toggleSelectMode}
                                    className="h-8 text-xs"
                                >
                                    Batal
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={toggleSelectMode}
                                    className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20"
                                >
                                    📋 Pilih Resep
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={deleteAllRecipes}
                                    className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/20"
                                >
                                    🗑️ Hapus Semua
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {saved.length===0 && <p className="text-slate-500">Belum ada resep tersimpan. Simpan dulu dari halaman Resep.</p>}
            <div className="grid md:grid-cols-2 gap-4">
                {saved.map(item=> (
                    <Card key={item.id} className={`hover:shadow-sm transition-shadow relative ${
                        isSelectMode && selectedRecipes.has(item.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}>
                        {isSelectMode && (
                            <div className="absolute top-3 right-3 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedRecipes.has(item.id)}
                                    onChange={() => toggleSelectRecipe(item.id)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        )}
                        <div className={`flex items-start justify-between gap-3 ${isSelectMode ? 'pr-8' : ''}`}>
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
                            {!(lists[item.id]?.langkah?.length || lists[item.id]?.bahan?.length) ? (
                                <p className="text-slate-500">Checklist belum dibuat.</p>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-auto pr-1">
                                    {/* Bahan Section */}
                                    {lists[item.id]?.bahan?.length > 0 && (
                                        <ChecklistSection
                                            title="Bahan"
                                            items={lists[item.id].bahan}
                                            recipeId={item.id}
                                            section="bahan"
                                            editState={editState}
                                            addState={addState}
                                            draggedItem={draggedItem}
                                            draggedOver={draggedOver}
                                            onToggle={toggle}
                                            onStartEdit={startEdit}
                                            onApplyEdit={applyEdit}
                                            onCancelEdit={cancelEdit}
                                            onRemoveItem={removeItem}
                                            onAddItem={addItem}
                                            onSetEditState={setEditState}
                                            onSetAddState={setAddState}
                                            onDragStart={handleDragStart}
                                            onDragOver={handleDragOver}
                                            onDragEnd={handleDragEnd}
                                            onDrop={handleDrop}
                                        />
                                    )}
                                    
                                    {/* Langkah Section */}
                                    {lists[item.id]?.langkah?.length > 0 && (
                                        <ChecklistSection
                                            title="Langkah"
                                            items={lists[item.id].langkah}
                                            recipeId={item.id}
                                            section="langkah"
                                            editState={editState}
                                            addState={addState}
                                            draggedItem={draggedItem}
                                            draggedOver={draggedOver}
                                            onToggle={toggle}
                                            onStartEdit={startEdit}
                                            onApplyEdit={applyEdit}
                                            onCancelEdit={cancelEdit}
                                            onRemoveItem={removeItem}
                                            onAddItem={addItem}
                                            onSetEditState={setEditState}
                                            onSetAddState={setAddState}
                                            onDragStart={handleDragStart}
                                            onDragOver={handleDragOver}
                                            onDragEnd={handleDragEnd}
                                            onDrop={handleDrop}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: '', id: null, idx: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteDialog.type === 'recipe' && 'Hapus Resep'}
                            {deleteDialog.type === 'item' && 'Hapus Item Checklist'}
                            {deleteDialog.type === 'multiple' && `Hapus ${deleteDialog.selectedIds?.length || 0} Resep`}
                            {deleteDialog.type === 'all' && 'Hapus Semua Resep'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDialog.type === 'recipe' && 'Yakin menghapus resep tersimpan ini? Checklist juga akan dihapus.'}
                            {deleteDialog.type === 'item' && 'Yakin menghapus item checklist ini?'}
                            {deleteDialog.type === 'multiple' && `Yakin menghapus ${deleteDialog.selectedIds?.length || 0} resep yang dipilih? Semua checklist juga akan dihapus.`}
                            {deleteDialog.type === 'all' && 'Yakin menghapus SEMUA resep tersimpan? Semua data tidak bisa dikembalikan.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                if (deleteDialog.type === 'recipe') {
                                    doRemoveSaved(deleteDialog.id)
                                } else if (deleteDialog.type === 'item') {
                                    doRemoveItem(deleteDialog.id, deleteDialog.idx)
                                } else if (deleteDialog.type === 'multiple') {
                                    doDeleteSelectedRecipes()
                                } else if (deleteDialog.type === 'all') {
                                    doDeleteAllRecipes()
                                }
                            }}
                            className={deleteDialog.type === 'all' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {deleteDialog.type === 'all' ? 'Ya, Hapus Semua' : 'Hapus'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Replace Checklist Dialog */}
            <AlertDialog open={replaceDialog.open} onOpenChange={(open) => !open && setReplaceDialog({ open: false, id: null, content: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ganti Checklist</AlertDialogTitle>
                        <AlertDialogDescription>
                            Checklist sudah ada. Ganti dengan versi ringkas baru?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            setReplaceDialog({ open: false, id: null, content: '' })
                            await doSummarize(replaceDialog.id, replaceDialog.content)
                        }}>
                            Ganti
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function escape(s=''){
    return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]))
}

function ChecklistSection({ 
    title, 
    items, 
    recipeId, 
    section,
    editState,
    addState,
    draggedItem,
    draggedOver,
    onToggle,
    onStartEdit,
    onApplyEdit,
    onCancelEdit,
    onRemoveItem,
    onAddItem,
    onSetEditState,
    onSetAddState,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop
}) {
    const isEditing = editState[recipeId]?.section === section;
    const addKey = `${recipeId}-${section}`;

    return (
        <section className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    {section === 'bahan' ? '🥬' : '👨‍🍳'} {title}
                </h4>
                <span className="text-xs text-slate-500">{items.length} item</span>
            </div>
            
            {items.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada {title.toLowerCase()}.</p>
            ) : (
                <ul className="pl-0 space-y-1">
                    {items.map((item, idx) => (
                        <li 
                            key={idx} 
                            className={`list-none flex items-center justify-between gap-2 py-2 px-2 rounded transition-colors cursor-move group
                                ${draggedOver?.id === recipeId && draggedOver?.idx === idx && draggedOver?.section === section ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600' : ''}
                                ${draggedItem?.id === recipeId && draggedItem?.idx === idx && draggedItem?.section === section ? 'opacity-50 bg-slate-200 dark:bg-slate-700' : ''}
                                hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent
                            `}
                            draggable={!isEditing}
                            onDragStart={(e) => onDragStart(e, recipeId, idx, section)}
                            onDragOver={(e) => onDragOver(e, recipeId, idx, section)}
                            onDragEnd={onDragEnd}
                            onDrop={(e) => onDrop(e, recipeId, idx, section)}
                        >
                            <div className="flex items-center gap-2 min-w-0 w-full">
                                <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-grab select-none" title="Drag to reorder">
                                    ⋮⋮
                                </span>
                                <input 
                                    type="checkbox" 
                                    checked={item.done} 
                                    onChange={() => onToggle(recipeId, idx, section)}
                                    className="rounded"
                                />
                                {editState[recipeId]?.index === idx && editState[recipeId]?.section === section ? (
                                    <Input 
                                        value={editState[recipeId]?.text || ''} 
                                        onChange={e => onSetEditState(prev => ({ 
                                            ...prev, 
                                            [recipeId]: { 
                                                index: idx, 
                                                text: e.target.value, 
                                                section 
                                            } 
                                        }))} 
                                        className="h-8 w-full text-sm" 
                                        autoFocus
                                    />
                                ) : (
                                    <span className={`text-sm ${item.done ? 'line-through opacity-70' : ''}`}>
                                        {item.text}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {editState[recipeId]?.index === idx && editState[recipeId]?.section === section ? (
                                    <>
                                        <Button size="sm" onClick={() => onApplyEdit(recipeId)} className="h-6 px-2 text-xs">
                                            ✓
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => onCancelEdit(recipeId)} className="h-6 px-2 text-xs">
                                            ✕
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={() => onStartEdit(recipeId, idx, item.text, section)}
                                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ✏️
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={() => onRemoveItem(recipeId, idx, section)}
                                            className="h-6 px-2 text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            🗑️
                                        </Button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            
            <div className="flex items-center gap-2 mt-2">
                <Input 
                    placeholder={`Tambah ${title.toLowerCase()}`}
                    value={addState[addKey] || ''} 
                    onChange={e => onSetAddState(prev => ({ ...prev, [addKey]: e.target.value }))} 
                    className="h-8 text-sm" 
                    onKeyPress={e => e.key === 'Enter' && onAddItem(recipeId, section)}
                />
                <Button size="sm" onClick={() => onAddItem(recipeId, section)} className="h-8 px-3 text-xs">
                    +
                </Button>
            </div>
        </section>
    );
}
