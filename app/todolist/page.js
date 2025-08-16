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
} from '../../components/ui/alert-dialog'

export default function Todolist(){
    const [saved, setSaved] = useState([])
    const [loadingId, setLoadingId] = useState(null)
    const [lists, setLists] = useState({})
    const [editState, setEditState] = useState({})
    const [addState, setAddState] = useState({})
    const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null, idx: null })
    const [replaceDialog, setReplaceDialog] = useState({ open: false, id: null, content: '' })
    const [selectedRecipes, setSelectedRecipes] = useState(new Set())
    const [isSelectMode, setIsSelectMode] = useState(false)

    // Load saved recipes and checklists
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
                                langkah: cl.langkah||[], 
                                bahan: cl.bahan||[] 
                            }
                        }
                    }
                    setLists(initLists)
                }catch{}
            }catch{}
        }
        load()
        const h = ()=>load()
        window.addEventListener('savedRecipesUpdated', h)
        return ()=> window.removeEventListener('savedRecipesUpdated', h)
    }, [])

    const persistChecklist = (id, checklist) => {
        try {
            const s = JSON.parse(localStorage.getItem('savedRecipes')||'[]')
            const idx = s.findIndex(x => x.id === id)
            if (idx >= 0) {
                s[idx].checklist = checklist
                localStorage.setItem('savedRecipes', JSON.stringify(s))
            }
        } catch {}
    }

    const summarize = async (id, content) => {
        if (lists[id]?.langkah?.length > 0) {
            setReplaceDialog({ open: true, id, content })
            return
        }
        await doSummarize(id, content)
    }

    const doSummarize = async (id, content) => {
        try {
            setLoadingId(id)
            
            const clean = (s)=> s.replace(/^\s*[-*•\d]+[\.)]?\s*/,'').trim()
            const isHeader = (s)=>
                /^(langkah|bahan|ringkasan|checklist|judul|title|summary|steps?)\b/i.test(s) ||
                /[:：]\s*$/.test(s)

            const lines = content.split(/\r?\n/).map(clean).filter(Boolean).filter(s=>!isHeader(s))
            
            // Separate bahan and langkah based on content analysis
            const bahan = []
            const langkah = []
            
            for (const line of lines) {
                // Check if it's an ingredient (usually shorter, contains food items)
                if (line.length < 50 && (/\b(gram|kg|ml|liter|sendok|siung|butir|potong|iris|cincang)\b/i.test(line) || 
                    /\b(bawang|tomat|garam|gula|minyak|air|telur|daging|ayam|ikan|sayur|bumbu)\b/i.test(line))) {
                    if (bahan.length < 10) {
                        bahan.push({ text: line, done: false })
                    }
                } else if (langkah.length < 12) {
                    // It's likely a cooking step
                    langkah.push({ text: line, done: false })
                }
            }
            
            // If we couldn't categorize well, put everything in langkah
            if (bahan.length === 0 && langkah.length === 0) {
                lines.slice(0, 12).forEach(line => {
                    langkah.push({ text: line, done: false })
                })
            }

            const checklist = { langkah, bahan }
            setLists(prev=>({ ...prev, [id]: checklist }))
            persistChecklist(id, checklist)
        } catch {} finally { 
            setLoadingId(null) 
        }
    }

    const removeSaved = (id) => {
        setDeleteDialog({ open: true, type: 'recipe', id, idx: null })
    }

    const doRemoveSaved = () => {
        const id = deleteDialog.id
        const upd = saved.filter(x => x.id !== id)
        setSaved(upd)
        localStorage.setItem('savedRecipes', JSON.stringify(upd))
        setLists(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        try { window.dispatchEvent(new Event('savedRecipesUpdated')) } catch {}
        setDeleteDialog({ open: false, type: '', id: null, idx: null })
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

    const startEdit = (id, idx, text, section) => {
        setEditState({ [id]: { index: idx, text, section } })
    }

    const applyEdit = (id) => {
        const edit = editState[id]
        if (!edit) return
        
        setLists(prev => {
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = (cur[edit.section]||[]).slice()
            arr[edit.index] = { ...arr[edit.index], text: edit.text }
            const nextChecklist = { ...cur, [edit.section]: arr }
            const next = { ...prev, [id]: nextChecklist }
            persistChecklist(id, nextChecklist)
            return next
        })
        setEditState({})
    }

    const cancelEdit = (id) => {
        setEditState({})
    }

    const removeItem = (id, idx, section) => {
        setDeleteDialog({ open: true, type: 'item', id, idx, section })
    }

    const doRemoveItem = () => {
        const { id, idx, section } = deleteDialog
        setLists(prev => {
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = (cur[section]||[]).slice(); 
            arr.splice(idx,1)
            const nextChecklist = { ...cur, [section]: arr }
            persistChecklist(id, nextChecklist)
            return { ...prev, [id]: nextChecklist }
        })
        setDeleteDialog({ open: false, type: '', id: null, idx: null, section: null })
    }

    const addItem = (id, section) => {
        const key = `${id}-${section}`
        const text = addState[key]?.trim()
        if (!text) return
        
        setLists(prev => {
            const cur = prev[id] || { langkah:[], bahan:[] }
            const arr = (cur[section]||[]).slice()
            arr.push({ text, done: false })
            const nextChecklist = { ...cur, [section]: arr }
            const next = { ...prev, [id]: nextChecklist }
            persistChecklist(id, nextChecklist)
            return next
        })
        setAddState(prev => ({ ...prev, [key]: '' }))
    }

    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode)
        setSelectedRecipes(new Set())
    }

    const toggleSelectRecipe = (id) => {
        setSelectedRecipes(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
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
        try { 
            window.dispatchEvent(new Event('savedRecipesUpdated')) 
        } catch {}
        setSelectedRecipes(new Set())
        setIsSelectMode(false)
        setDeleteDialog({ open: false, type: '', id: null, idx: null })
    }

    return (
        <div className="flex flex-col min-h-0 max-h-[80vh] space-y-4 p-4 overflow-y-auto">
            <div className="flex-none">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-2xl font-bold text-center sm:text-left">Todolist Resep</h1>
                    
                    {saved.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                            {isSelectMode ? (
                                <>
                                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md whitespace-nowrap">
                                        {selectedRecipes.size} dari {saved.length} dipilih
                                    </span>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={selectAllRecipes}
                                        className="h-8 text-xs whitespace-nowrap"
                                    >
                                        {selectedRecipes.size === saved.length ? '✕ Batal Semua' : '✓ Pilih Semua'}
                                    </Button>
                                    {selectedRecipes.size > 0 && (
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={deleteSelectedRecipes}
                                            className="h-8 text-xs whitespace-nowrap"
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
                                        className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20 whitespace-nowrap"
                                    >
                                        📋 Pilih Resep
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={deleteAllRecipes}
                                        className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/20 whitespace-nowrap"
                                    >
                                        🗑️ Hapus Semua
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-auto">
                {saved.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm sm:text-base">
                            Belum ada resep tersimpan. Simpan dulu dari halaman Resep.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {saved.map(item => (
                            <Card key={item.id} className={`hover:shadow-md transition-all duration-200 relative flex flex-col ${
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
                                <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${isSelectMode ? 'pr-8' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate text-base" title={item.title || `Resep #${item.id}`}>
                                            {item.title || `Resep #${item.id}`}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={()=>summarize(item.id, item.content)}
                                            loading={loadingId===item.id}
                                            className="text-xs whitespace-nowrap"
                                        >
                                            {(lists[item.id]?.langkah?.length)? 'Ganti Checklist':'Buat Checklist'}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={()=>removeSaved(item.id)}
                                            className="text-xs"
                                        >
                                            Hapus
                                        </Button>
                                    </div>
                                </div>
                                
                                <details className="mt-3">
                                    <summary className="text-xs cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                        Lihat ringkasan resep
                                    </summary>
                                    <div className="prose prose-slate dark:prose-invert max-w-none text-sm mt-2 overflow-auto max-h-32">
                                        <div dangerouslySetInnerHTML={{ __html: (item.content||'').split('\n').slice(0,8).map(escape).join('<br/>') }} />
                                    </div>
                                </details>
                                
                                <div className="mt-3">
                                    {!(lists[item.id]?.langkah?.length || lists[item.id]?.bahan?.length) ? (
                                        <p className="text-slate-500 text-sm">Checklist belum dibuat.</p>
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
                                                    onToggle={toggle}
                                                    onStartEdit={startEdit}
                                                    onApplyEdit={applyEdit}
                                                    onCancelEdit={cancelEdit}
                                                    onRemoveItem={removeItem}
                                                    onAddItem={addItem}
                                                    onSetEditState={setEditState}
                                                    onSetAddState={setAddState}
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
                                                    onToggle={toggle}
                                                    onStartEdit={startEdit}
                                                    onApplyEdit={applyEdit}
                                                    onCancelEdit={cancelEdit}
                                                    onRemoveItem={removeItem}
                                                    onAddItem={addItem}
                                                    onSetEditState={setEditState}
                                                    onSetAddState={setAddState}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: '', id: null, idx: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteDialog.type === 'recipe' ? 'Hapus Resep' :
                             deleteDialog.type === 'item' ? 'Hapus Item' :
                             deleteDialog.type === 'multiple' ? 'Hapus Resep Terpilih' :
                             deleteDialog.type === 'all' ? 'Hapus Semua Resep' : 'Konfirmasi'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDialog.type === 'recipe' ? 'Yakin hapus resep ini?' :
                             deleteDialog.type === 'item' ? 'Yakin hapus item checklist ini?' :
                             deleteDialog.type === 'multiple' ? `Yakin hapus ${deleteDialog.selectedIds?.length || 0} resep terpilih?` :
                             deleteDialog.type === 'all' ? 'Yakin hapus semua resep?' : 'Aksi ini tidak dapat dibatalkan.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteDialog.type === 'recipe' ? doRemoveSaved :
                                                   deleteDialog.type === 'item' ? doRemoveItem :
                                                   deleteDialog.type === 'multiple' ? doDeleteSelectedRecipes :
                                                   deleteDialog.type === 'all' ? doDeleteAllRecipes : null}>
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Replace Dialog */}
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
    );
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
    onToggle,
    onStartEdit,
    onApplyEdit,
    onCancelEdit,
    onRemoveItem,
    onAddItem,
    onSetEditState,
    onSetAddState
}) {
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
                        <li key={idx} className="list-none flex items-center justify-between gap-2 py-2 px-2 rounded transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 group">
                            <div className="flex items-center gap-2 min-w-0 w-full">
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
                                    <span className={`text-sm flex-1 ${item.done ? 'line-through opacity-70' : ''}`}>
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
