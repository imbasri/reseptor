'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card } from '../../components/ui/card';
import { useToast, ToastContainer } from '../../components/ui/toast';
import ModelSettings from '../../components/model-settings';

export default function Recipes() {
    const { register, handleSubmit, reset, setValue } = useForm();
    const [loading, setLoading] = useState(false);
    const [resp, setResp] = useState('');
    const abortRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [pantry, setPantry] = useState([]); // [{name}]
    const [newItem, setNewItem] = useState('');
    const respRef = useRef(null); // ref for scrollable result container
    const segments = useMemo(() => segmentRecipesFromText(resp), [resp]);
    const { toast, toasts } = useToast();
    const [selectedModel, setSelectedModel] = useState('');

    // Load pantry from localStorage and normalize
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('pantry') || '[]');
            let normalized = [];
            if (Array.isArray(saved)) {
                if (saved.length && typeof saved[0] === 'string') {
                    normalized = saved.map((name) => ({ name }));
                } else {
                    // strip to simple shape
                    normalized = saved
                        .map((x) => ({
                            name: typeof x === 'string' ? x : x?.name || '',
                        }))
                        .filter((x) => x.name);
                }
            }
            setPantry(normalized);
            if (normalized.length) {
                setValue('ingredients', joinPantry(normalized));
            }
        } catch {}
    }, [setValue]);

    // auto-scroll to bottom when response updates (throttled for performance)
    useEffect(() => {
        if (!isStreaming) {
            // Immediate scroll when streaming stops
            try {
                if (respRef.current) {
                    respRef.current.scrollTop = respRef.current.scrollHeight;
                }
            } catch {}
            return;
        }
        
        // Throttled scroll during streaming
        const timeoutId = setTimeout(() => {
            try {
                if (respRef.current) {
                    respRef.current.scrollTop = respRef.current.scrollHeight;
                }
            } catch {}
        }, 100); // Scroll every 100ms during streaming
        
        return () => clearTimeout(timeoutId);
    }, [resp, isStreaming]);

    const onSubmit = useCallback(async (values) => {
        setLoading(true);
        setResp('');
        const controller = new AbortController();
        abortRef.current = controller;
        setIsStreaming(true);
        try {
            const res = await fetch('/api/recipes/stream', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-preferred-model': selectedModel || ''
                },
                body: JSON.stringify(values),
                signal: controller.signal,
            });
            if (!res.ok) {
                setResp('Error: ' + (await res.text()));
                return;
            }
            const reader = res.body.getReader();
            const dec = new TextDecoder('utf-8', { stream: true });
            let acc = '';
            let updateCount = 0;
            let lastUpdateTime = 0;
            
            while (true) {
                let read;
                try {
                    read = await reader.read();
                } catch {
                    break;
                }
                const { value, done } = read || {};
                if (done) break;
                
                acc += dec.decode(value, { stream: true });
                updateCount++;
                const now = Date.now();
                
                // Batch UI updates: update every 3 chunks OR every 16ms (60fps) OR if significant content added
                const shouldUpdate = updateCount % 3 === 0 || 
                                   now - lastUpdateTime > 16 || 
                                   value.length > 100;
                
                if (shouldUpdate) {
                    setResp(acc);
                    lastUpdateTime = now;
                }
            }
            
            // Final update to ensure all content is shown
            setResp(acc);
            
        } catch (e) {
            if (e?.name !== 'AbortError') setResp('Gagal membuat resep');
        } finally {
            setLoading(false);
            setIsStreaming(false);
            abortRef.current = null;
        }
    }, [selectedModel]);

    const stop = useCallback(() => {
        try {
            abortRef.current?.abort();
        } catch {}
    }, []);
    
    const onReset = useCallback(() => {
        setResp('');
        reset({ ingredients: '', query: '' });
    }, [reset]);

    const addPantry = () => {
        const name = newItem.trim();
        if (!name) return;
        const item = { name };
        const existsIdx = pantry.findIndex(
            (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        let upd;
        if (existsIdx >= 0) {
            upd = pantry.map((p, i) => (i === existsIdx ? item : p));
        } else {
            upd = [...pantry, item];
        }
        setPantry(upd);
        localStorage.setItem('pantry', JSON.stringify(upd));
        setValue('ingredients', joinPantry(upd));
        setNewItem('');
    };
    const removePantry = (i) => {
        const upd = pantry.filter((_, idx) => idx !== i);
        setPantry(upd);
        localStorage.setItem('pantry', JSON.stringify(upd));
        setValue('ingredients', joinPantry(upd));
    };

    // removed planner integration

    return (
        <div className="flex flex-col min-h-0 space-y-4 p-4 overflow-hidden max-h-[80vh] md:h-[80vh]">
            <div className="flex-none">
                <h1 className="text-2xl font-bold text-center sm:text-left">
                    Resep Dinamis dengan Granite AI
                </h1>
                <div className="mt-4">
                    <ModelSettings onModelChange={setSelectedModel} />
                </div>
            </div>
            
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 max-h-[80vh]"
            >
                <Card className="lg:col-span-1 col-span-1 flex flex-col">
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="text-sm font-medium">Bahan yang tersedia</label>
                            <Textarea
                                id="ingredients"
                                placeholder="tomat, tahu, bayam"
                                className="mt-1 min-h-[80px] resize-none"
                                {...register('ingredients')}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Tambah bahan (mis. telur)"
                                    value={newItem}
                                    onChange={(e) => setNewItem(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addPantry();
                                        }
                                    }}
                                    className="flex-1"
                                />
                                <Button type="button" onClick={addPantry} size="sm">
                                    Tambah
                                </Button>
                            </div>
                            
                            {pantry?.length > 0 && (
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {pantry.map((p, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-sm whitespace-nowrap"
                                        >
                                            <span className="truncate max-w-[120px]">{p.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    removePantry(i);
                                                }}
                                                className="opacity-70 hover:opacity-100 flex-shrink-0"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium">Cari resep (opsional)</label>
                            <Input
                                id="query_inp"
                                placeholder="rendang, sayur bening, tumis kangkung"
                                className="mt-1"
                                {...register('query')}
                            />
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                loading={loading || isStreaming}
                                disabled={isStreaming || loading}
                                className="flex-1 sm:flex-none"
                            >
                                Kirim
                            </Button>
                            {isStreaming && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={stop}
                                >
                                    Stop
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={onReset}
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                </Card>
                <Card className="lg:col-span-3 col-span-1 flex flex-col min-h-0">
                    <div className="flex-none">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-lg">Hasil</h2>
                            <div className="flex items-center gap-2">
                                {/* Tombol Simpan Semua di kanan atas */}
                                {!isStreaming && !loading && segments.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        className="whitespace-nowrap"
                                        onClick={() => {
                                            try {
                                                const saved = JSON.parse(
                                                    localStorage.getItem(
                                                        'savedRecipes'
                                                    ) || '[]'
                                                );
                                                const now = Date.now();
                                                let totalChecklistItems = 0;
                                                
                                                // Filter out meaningless segments before saving
                                                const validEntries = segments
                                                    .filter((seg, i) => {
                                                        // Skip meaningless responses
                                                        if (isResponseMeaningless(seg.text)) {
                                                            console.log(`Skipping segment ${i}: meaningless response`);
                                                            return false;
                                                        }
                                                        
                                                        // Skip segments with too many separators
                                                        const separatorChars = (seg.text.match(/[-=_\s]/g) || []).length;
                                                        const separatorRatio = separatorChars / seg.text.length;
                                                        if (separatorRatio > 0.6) {
                                                            console.log(`Skipping segment ${i}: too many separators`);
                                                            return false;
                                                        }
                                                        
                                                        // Skip segments with invalid titles
                                                        if (!seg.title || seg.title.trim().length < 3 || 
                                                            /^[-=_*#+\s]+$/.test(seg.title)) {
                                                            console.log(`Skipping segment ${i}: invalid title`);
                                                            return false;
                                                        }
                                                        
                                                        return true;
                                                    })
                                                    .map((seg, i) => {
                                                        const checklist = buildChecklistFromText(seg.text);
                                                        totalChecklistItems += checklist.totalItems;
                                                        
                                                        const uniqueId = `recipe_${now}_${Math.random().toString(36).substr(2, 9)}_${i}`;
                                                        
                                                        return {
                                                            id: uniqueId,
                                                            title: seg.title.trim(),
                                                            content: seg.text,
                                                            rawHtml: seg.html,
                                                            pantry: [...pantry], // Copy array
                                                            checklist,
                                                            meta: {
                                                                query:
                                                                    document.getElementById(
                                                                        'query_inp'
                                                                    )?.value?.trim() || '',
                                                                model: selectedModel || 'default',
                                                                segmentIndex: i,
                                                                totalSegments: segments.length,
                                                                batchSave: true
                                                            },
                                                            createdAt:
                                                                new Date().toISOString(),
                                                            updatedAt:
                                                                new Date().toISOString(),
                                                        };
                                                    }
                                                );
                                                
                                                // Only proceed if we have valid entries
                                                if (validEntries.length === 0) {
                                                    toast({
                                                        title: 'Tidak Ada Resep Valid',
                                                        description: 'Tidak ada resep yang dapat disimpan. Resep berisi separator atau tidak valid.'
                                                    });
                                                    return;
                                                }
                                                
                                                localStorage.setItem(
                                                    'savedRecipes',
                                                    JSON.stringify(
                                                        [...validEntries, ...saved].slice(
                                                            0,
                                                            50
                                                        )
                                                    )
                                                );
                                                window.dispatchEvent(
                                                    new Event('savedRecipesUpdated')
                                                );
                                                toast({
                                                    title: 'Resep Valid Disimpan',
                                                    description: `${validEntries.length} resep valid dengan total ${totalChecklistItems} item checklist berhasil disimpan. Buka tab Todolist untuk checklist.`
                                                });
                                            } catch (error) {
                                                console.error('Error saving all recipes:', error);
                                                toast({
                                                    title: 'Error',
                                                    description: 'Gagal menyimpan beberapa resep. Silakan coba lagi.'
                                                });
                                            }
                                        }}
                                    >
                                        Simpan Semua ({segments.length})
                                    </Button>
                                )}
                                {/* Loading indicator */}
                                {(isStreaming || loading) && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                                        <span className="hidden sm:inline">
                                            {isStreaming ? 'Generating resep...' : 'Loading...'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div
                        ref={respRef}
                        className="flex-1 min-h-0 overflow-auto pr-2"
                    >
                        {segments.length > 1 ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {segments.map((seg, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg border border-slate-200/60 dark:border-white/10 p-4 hover:shadow-md transition-all duration-200 flex flex-col"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <h3
                                                className="font-semibold text-base line-clamp-2 flex-1"
                                                title={seg.title}
                                            >
                                                {seg.title}
                                            </h3>
                                            {!isStreaming && !loading && !isResponseMeaningless(seg.text) && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="flex-shrink-0"
                                                    onClick={() => {
                                                    try {
                                                        // Enhanced validation - don't save meaningless responses
                                                        if (isResponseMeaningless(seg.text)) {
                                                            console.log('Skipping save: meaningless response detected');
                                                            return;
                                                        }
                                                        
                                                        // Additional check for separator-heavy content
                                                        const separatorChars = (seg.text.match(/[-=_\s]/g) || []).length;
                                                        const separatorRatio = separatorChars / seg.text.length;
                                                        if (separatorRatio > 0.6) {
                                                            console.log('Skipping save: too many separator characters');
                                                            return;
                                                        }
                                                        
                                                        // Check if title is meaningful
                                                        if (!seg.title || seg.title.trim().length < 3 || 
                                                            /^[-=_*#+\s]+$/.test(seg.title)) {
                                                            console.log('Skipping save: invalid title');
                                                            return;
                                                        }
                                                        
                                                        const saved =
                                                            JSON.parse(
                                                                localStorage.getItem(
                                                                    'savedRecipes'
                                                                ) || '[]'
                                                            );
                                                        const checklist =
                                                            buildChecklistFromText(
                                                                seg.text
                                                            );
                                                        
                                                        // Generate unique ID with timestamp and random component
                                                        const uniqueId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${idx}`;
                                                        
                                                        const entry = {
                                                            id: uniqueId,
                                                            title: seg.title.trim(),
                                                            content: seg.text,
                                                            rawHtml: seg.html,
                                                            pantry: [...pantry], // Copy array
                                                            checklist,
                                                            meta: {
                                                                query:
                                                                    document.getElementById(
                                                                        'query_inp'
                                                                    )?.value?.trim() ||
                                                                    '',
                                                                model: selectedModel || 'default',
                                                                segmentIndex: idx,
                                                                totalSegments: segments.length
                                                            },
                                                            createdAt:
                                                                new Date().toISOString(),
                                                            updatedAt:
                                                                new Date().toISOString(),
                                                        };
                                                        
                                                        localStorage.setItem(
                                                            'savedRecipes',
                                                            JSON.stringify(
                                                                [
                                                                    entry,
                                                                    ...saved,
                                                                ].slice(0, 50)
                                                            )
                                                        );
                                                        window.dispatchEvent(
                                                            new Event(
                                                                'savedRecipesUpdated'
                                                            )
                                                        );
                                                        toast({
                                                            title: 'Resep Disimpan',
                                                            description: `"${seg.title}" berhasil disimpan dengan ${checklist.totalItems} item checklist.`
                                                        });
                                                    } catch (error) {
                                                        console.error('Error saving recipe:', error);
                                                        toast({
                                                            title: 'Error',
                                                            description: 'Gagal menyimpan resep. Silakan coba lagi.'
                                                        });
                                                    }
                                                }}
                                            >
                                                Simpan
                                            </Button>
                                            )}
                                        </div>
                                        <div
                                            className="prose prose-slate dark:prose-invert max-w-none text-sm flex-1 min-h-0 overflow-auto"
                                            dangerouslySetInnerHTML={{
                                                __html: seg.html,
                                            }}
                                        />
                                        {/* Preview checklist info */}
                                        {!isStreaming && !loading && (() => {
                                            const previewChecklist = buildChecklistFromText(seg.text);
                                            return previewChecklist.totalItems > 0 ? (
                                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <span>📝</span>
                                                            <span>{previewChecklist.bahan.length} bahan</span>
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <span>👩‍🍳</span>
                                                            <span>{previewChecklist.langkah.length} langkah</span>
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <span>✅</span>
                                                            <span>{previewChecklist.totalItems} total item</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="prose prose-slate dark:prose-invert max-w-none text-sm p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg min-h-[200px] overflow-auto"
                                dangerouslySetInnerHTML={{
                                    __html: formatListHtml(resp),
                                }}
                            />
                        )}
                    </div>
                    
                    <div className="flex-shrink-0 mb-9 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap gap-2">
                            {(isStreaming || loading) && resp ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md">
                                    ⏳ Tunggu AI selesai untuk menyimpan resep
                                </div>
                            ) : (
                                <>
                                    {/* Only show single save button if we have exactly one segment OR meaningful content without segments */}
                                    {(!isStreaming && !loading && 
                                    (
                                        (segments.length === 1) || 
                                        (segments.length === 0 && resp?.trim() && !isResponseMeaningless(resp))
                                    )) && (
                                        <Button
                                            type="button"
                                            variant="primary"
                                            size="sm"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => {
                                                try {
                                                    if (!resp?.trim()) return;
                                                    
                                                    // Don't save if response is meaningless
                                                    if (isResponseMeaningless(resp)) return;
                                                    
                                                    const saved = JSON.parse(
                                                        localStorage.getItem(
                                                            'savedRecipes'
                                                        ) || '[]'
                                                    );
                                                    const title =
                                                        extractTitleFromText(resp);
                                                    const checklist =
                                                        buildChecklistFromText(resp);
                                                        
                                                    const uniqueId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_single`;
                                                    
                                                    const entry = {
                                                        id: uniqueId,
                                                        title: title.trim(),
                                                        content: resp,
                                                        rawHtml: formatListHtml(resp),
                                                        pantry: [...pantry], // Copy array
                                                        checklist,
                                                        meta: {
                                                            query:
                                                                document.getElementById(
                                                                    'query_inp'
                                                                )?.value?.trim() || '',
                                                            model: selectedModel || 'default',
                                                            segmentIndex: 0,
                                                            totalSegments: 1,
                                                            singleSave: true
                                                        },
                                                        createdAt:
                                                            new Date().toISOString(),
                                                        updatedAt:
                                                            new Date().toISOString(),
                                                    };
                                                    localStorage.setItem(
                                                        'savedRecipes',
                                                        JSON.stringify(
                                                            [entry, ...saved].slice(
                                                                0,
                                                                50
                                                            )
                                                        )
                                                    );
                                                    window.dispatchEvent(
                                                        new Event('savedRecipesUpdated')
                                                    );
                                                    toast({
                                                        title: 'Resep Disimpan',
                                                        description: `"${title}" berhasil disimpan dengan ${checklist.totalItems} item checklist. Buka tab Todolist untuk checklist.`
                                                    });
                                                } catch (error) {
                                                    console.error('Error saving single recipe:', error);
                                                    toast({
                                                        title: 'Error',
                                                        description: 'Gagal menyimpan resep. Silakan coba lagi.'
                                                    });
                                                }
                                            }}
                                        >
                                            Simpan Resep
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            </form>
            <ToastContainer toasts={toasts} />
        </div>
    );
}

function joinPantry(items) {
    return items.map((p) => p.name).join(', ');
}

function isResponseMeaningless(text = '') {
    if (!text || !text.trim()) return true;
    
    const raw = text.trim();
    
    // Check for common meaningless patterns - ENHANCED for dashes
    const meaninglessPatterns = [
        /^-+$/,  // Just dashes
        /^=+$/,  // Just equals
        /^_+$/,  // Just underscores
        /^\.+$/, // Just dots
        /^\*+$/, // Just asterisks
        /^#+$/,  // Just hashes
        /^[\s\-=_.*#]+$/,  // Only whitespace and separator characters
        /^-{3,}/,  // Starts with three or more dashes
        /^={3,}/,  // Starts with three or more equals
        /^-{2,}\s*-{2,}/,  // Multiple dash groups
        /^-+\s*-+\s*-+/,  // Three or more dash groups
        /^\s*-{5,}\s*$/,  // Five or more dashes (with optional whitespace)
        /^[\-\s]{10,}$/,  // Long sequences of dashes and spaces
        /^-+\n-+/,  // Multiple lines of dashes
        /^\s*-{3,}.*-{3,}\s*$/,  // Dashes at start and end
    ];
    
    const isMeaningless = meaninglessPatterns.some(pattern => pattern.test(raw));
    if (isMeaningless) return true;
    
    // Check if content is too short
    if (raw.length < 10) return true;
    
    // Check if it's mostly separators (more than 70% dashes, equals, underscores)
    const separatorChars = (raw.match(/[-=_\s]/g) || []).length;
    const separatorRatio = separatorChars / raw.length;
    if (separatorRatio > 0.7) return true;
    
    // Check if it looks like an error message
    const errorPatterns = [
        /^(error|gagal|failed|tidak|cannot|unable)/i,
        /^(maaf|sorry|apologize)/i,
        /^(loading|waiting|please wait)/i,
    ];
    
    const isError = errorPatterns.some(pattern => pattern.test(raw));
    return isError;
}

function formatListHtml(text = '') {
    try {
        // Pre-process text to handle markdown-style formatting like ChatGPT
        let processedText = text
            // Convert **bold** to HTML bold tags
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert *italic* to HTML italic tags  
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Remove excessive dashes and separators
            .replace(/^[-=_*#+\s]{3,}$/gm, '')
            // Remove leading numbers from recipe titles and steps
            .replace(/^(\s*)\d+\.?\s*([A-Z][^.]*(?:\.|$))/gm, '$1$2')
            // Clean up extra whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
            
        const lines = processedText.split(/\r?\n/);
        const chunks = [];
        let ol = [];
        let ul = [];
        let inStepsSection = false;
        
        const flush = () => {
            if (ol.length) {
                chunks.push(
                    '<ol class="pl-5 list-decimal space-y-1">' +
                        ol.map((li) => `<li>${formatInlineContent(li)}</li>`).join('') +
                        '</ol>'
                );
                ol = [];
            }
            if (ul.length) {
                chunks.push(
                    '<ul class="pl-5 list-disc space-y-1">' +
                        ul.map((li) => `<li>${formatInlineContent(li)}</li>`).join('') +
                        '</ul>'
                );
                ul = [];
            }
        };

        // Helper function to format inline content (preserving HTML tags)
        function formatInlineContent(content) {
            // Don't escape content that already contains HTML tags
            if (/<\/?[a-z][\s\S]*>/i.test(content)) {
                return content;
            }
            return escapeHtml(content);
        }
        
        for (const raw of lines) {
            const line = raw.trim();
            if (!line) {
                flush();
                inStepsSection = false;
                continue;
            }
            
            // Skip lines that are just numbers or separators
            if (/^\d+\s*$/.test(line) || /^[-=_*#+\s]{2,}$/.test(line)) {
                continue;
            }
            
            // Headings like Bahan/Langkah/Estimasi/Tips (optional colon)
            if (
                /^(Bahan|Langkah(?:\s+Masak)?|Estimasi(?:\s+Kalori(?:\s+per\s+Porsi)?)?|Tips(?:\s+Singkat)?|Cara(?:\s+Membuat)?)\s*:?$/i.test(
                    line
                )
            ) {
                flush();
                // Check if we're entering a steps section
                if (/^(Langkah|Steps|Cara)/i.test(line)) {
                    inStepsSection = true;
                } else {
                    inStepsSection = false;
                }
                chunks.push(
                    `<h4 class="mt-4 mb-2 font-semibold text-slate-800 dark:text-slate-200">${formatInlineContent(
                        line.replace(/\s*:$/, '')
                    )}</h4>`
                );
                continue;
            }
            
            // Check if this is a step using improved detection
            const isStepLine = 
                /^\s*\d+\.?\s/.test(line) || // Has number prefix
                inStepsSection || // We're in a steps section
                /^(kemudian|lalu|selanjutnya|setelah|pertama|kedua|ketiga|keempat|kelima|keenam|ketujuh|kedelapan|kesembilan|kesepuluh|terakhir|akhirnya)/i.test(line); // Step keywords
            
            // Numbered list detection with better step recognition
            if (isStepLine && !/^[-*]\s+/.test(line)) {
                if (ul.length) {
                    chunks.push(
                        '<ul class="pl-5 list-disc space-y-1">' +
                            ul.map((li) => `<li>${formatInlineContent(li)}</li>`).join('') +
                            '</ul>'
                    );
                    ul = [];
                }
                
                // Clean the content by removing any existing numbers
                let content = line.replace(/^\s*\d+\.?\s*/, '').trim();
                if (!content) {
                    content = line.trim();
                }
                
                ol.push(content);
                continue;
            }
            
            // Bullet lists
            if (/^[-*]\s+/.test(line)) {
                if (ol.length) {
                    chunks.push(
                        '<ol class="pl-5 list-decimal space-y-1">' +
                            ol.map((li) => `<li>${formatInlineContent(li)}</li>`).join('') +
                            '</ol>'
                    );
                    ol = [];
                }
                inStepsSection = false;
                ul.push(line.replace(/^[-*]\s+/, '').trim());
                continue;
            }
            
            // If we're in steps section and this looks like a step, add it as ordered list item
            if (inStepsSection && line.length > 5 && !line.includes(':')) {
                if (ul.length) {
                    chunks.push(
                        '<ul class="pl-5 list-disc space-y-1">' +
                            ul.map((li) => `<li>${formatInlineContent(li)}</li>`).join('') +
                            '</ul>'
                    );
                    ul = [];
                }
                ol.push(line);
                continue;
            }
            
            // default paragraph
            flush();
            inStepsSection = false;
            chunks.push(`<p class="mb-2 text-slate-700 dark:text-slate-300">${formatInlineContent(line)}</p>`);
        }
        flush();
        return chunks.join('') || formatInlineContent(text);
    } catch {
        return escapeHtml(text);
    }
}

function escapeHtml(s = '') {
    return s.replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            }[c])
    );
}

function extractTitleFromText(text = '') {
    try {
        const lines = text
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
            
        // Look for a line that looks like a recipe title/name
        for (const line of lines) {
            // Skip obvious non-title patterns - ENHANCED
            if (/^(\d+\.|[-*•]\s|Bahan|Langkah|Estimasi|Tips|Cara\s+Membuat|Kalori|Porsi|Waktu|Kalori\/porsi)/i.test(line)) {
                continue;
            }
            
            // Skip lines that start with numbers (like "1. Rendang" or "2 porsi")
            if (/^\d+[\.\s]/.test(line)) {
                continue;
            }
            
            // Skip lines that are mostly separators
            if (/^[-=_*#+\s]{3,}$/.test(line)) {
                continue;
            }
            
            // Skip lines that contain calorie information
            if (/kalori|kcal|cal/i.test(line)) {
                continue;
            }
            
            // Clean up potential title - preserve dish names better
            let cleaned = line
                .replace(/^#+\s*/, '') // Remove markdown headers
                .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '') // Remove "Resep" prefix
                .replace(/^Judul\s*[:\-]\s*/i, '') // Remove "Judul" prefix
                .replace(/^\*\*(.+)\*\*$/, '$1') // Remove bold markdown
                .replace(/^["'](.+)["']$/, '$1') // Remove quotes
                .replace(/^:\s*/, '') // Remove leading colon
                .replace(/\s*:$/, '') // Remove trailing colon
                .replace(/^\d+[\.\s]+/, '') // Remove leading numbers with dots or spaces
                .replace(/^\d+\s*-\s*/, '') // Remove "1 - " pattern
                .replace(/\s*\d+\s*$/, '') // Remove trailing numbers
                .replace(/\d+/g, '') // Remove ALL numbers from title
                .replace(/\*\*/g, '') // Remove all ** bold markers
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
                
                // Enhanced title cleaning - preserve Indonesian dish names
                if (cleaned) {
                    // Remove more patterns that aren't dish names
                    cleaned = cleaned
                        .replace(/^(Menu|Masakan|Hidangan|Makanan)\s*[:\-]?\s*/i, '')
                        .replace(/^(Untuk|Sajian)\s*\d*\s*(porsi|orang)?\s*[:\-]?\s*/i, '')
                        .replace(/^(Waktu|Durasi)\s*[:\-]?\s*\d*.*[:\-]?\s*/i, '')
                        .replace(/^(Kalori|Protein|Lemak|Karbohidrat).*[:\-]?\s*/i, '') // Remove nutrition info
                        .replace(/^\d*\s*(kalori|kcal|cal)\b.*$/i, '') // Remove calorie statements
                        .replace(/\d+/g, '') // Remove all remaining numbers
                        .replace(/\*\*/g, '') // Remove all ** bold markers
                        .replace(/\s+/g, ' ') // Normalize spaces again
                        .trim();                // Skip if it's nutrition/calorie related
                if (/^(kalori|kcal|cal|protein|lemak|karbohidrat|gula|natrium)\b/i.test(cleaned)) {
                    continue;
                }
                
                // Check if it's a good title candidate - more strict filtering
                if (cleaned && 
                    cleaned.length >= 2 && // Allow shorter dish names like "Gado-gado"
                    cleaned.length <= 150 && // Allow longer descriptive names
                    !/^(dan|atau|juga|serta|dengan|untuk|dari|ke|di|pada|dalam|yang|adalah|akan|sudah|telah|ini|itu|tersebut)$/i.test(cleaned) &&
                    !/^\d+\s*(menit|jam|porsi|orang|gram|kg|ml|liter|kalori|kcal)$/i.test(cleaned) &&
                    !/^(per|sekitar|kurang|lebih|total)\s/i.test(cleaned) && // Skip quantity indicators
                    /[a-zA-Z]/.test(cleaned)) { // Must contain at least one letter
                    
                    // Preserve original case for proper nouns (Indonesian dish names)
                    // Only capitalize if the whole line is lowercase
                    if (cleaned === cleaned.toLowerCase()) {
                        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                    }
                    
                    return cleaned.slice(0, 150);
                }
            }
        }
        
        // Fallback: take first substantial line that could be a dish name
        for (const line of lines) {
            if (line.length > 2 && 
                !/^[-=_*#+\s]{3,}$/.test(line) && 
                !/^(\d+[\.\s]|[-*•]\s)/.test(line) && // Enhanced number detection
                !/^(Bahan|Langkah|Estimasi|Tips|Cara\s+Membuat|Kalori|Porsi|Waktu)/i.test(line) &&
                !/kalori|kcal|cal|protein|lemak|karbohidrat/i.test(line)) { // Skip nutrition info
                
                let cleaned = line
                    .replace(/^#+\s*/, '')
                    .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '')
                    .replace(/^["'](.+)["']$/, '$1')
                    .replace(/^\d+[\.\s]+/, '') // Enhanced number removal
                    .replace(/^\d+\s*-\s*/, '') // Remove "1 - " pattern
                    .trim();
                    
                // Skip if still starts with number after cleaning
                if (/^\d/.test(cleaned)) {
                    continue;
                }
                    
                if (cleaned && /[a-zA-Z]/.test(cleaned) && 
                    !/^(kalori|kcal|cal|protein|lemak|karbohidrat)\b/i.test(cleaned)) {
                    // Preserve case for Indonesian dish names
                    if (cleaned === cleaned.toLowerCase()) {
                        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                    }
                    return cleaned.slice(0, 150);
                }
            }
        }
        
        // Last resort: extract from first meaningful sentence
        const meaningful = text
            .replace(/^[-=_*#+\s\n]+/, '') // Remove leading separators
            .replace(/[-=_*#+\s\n]+$/, '') // Remove trailing separators
            .trim();
            
        if (meaningful) {
            // Look for the first line that might be a recipe name
            const firstLines = meaningful.split(/\n/).slice(0, 3); // Check first 3 lines
            for (const sentence of firstLines) {
                const trimmed = sentence.trim();
                if (trimmed && trimmed.length > 2 && 
                    !/^(Bahan|Langkah|Estimasi|Tips|Cara\s+Membuat|Kalori)/i.test(trimmed) &&
                    !/^\d+[\.\s]/.test(trimmed) && // Skip lines starting with numbers
                    !/kalori|kcal|cal|protein|lemak|karbohidrat/i.test(trimmed)) { // Skip nutrition
                    
                    let cleaned = trimmed
                        .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '')
                        .replace(/^["'](.+)["']$/, '$1')
                        .replace(/^\d+[\.\s]+/, '') // Enhanced number removal
                        .replace(/^\d+\s*-\s*/, '') // Remove "1 - " pattern
                        .split(/[\.!\?]/)[0] // Take only the first sentence part
                        .trim();
                        
                    // Skip if still starts with number after cleaning
                    if (/^\d/.test(cleaned)) {
                        continue;
                    }
                        
                    if (cleaned && /[a-zA-Z]/.test(cleaned) &&
                        !/^(kalori|kcal|cal|protein|lemak|karbohidrat)\b/i.test(cleaned)) {
                        if (cleaned === cleaned.toLowerCase()) {
                            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                        }
                        return cleaned.slice(0, 150);
                    }
                }
            }
        }
        
        return 'Resep Tanpa Judul';
    } catch {
        return 'Resep Tanpa Judul';
    }
}

function segmentRecipesFromText(text = '') {
    try {
        const raw = text.trim();
        if (!raw) return [];
        
        // Check if the text is just separators or meaningless content
        const meaninglessPatterns = [
            /^-+$/,  // Just dashes
            /^=+$/,  // Just equals
            /^_+$/,  // Just underscores
            /^\.+$/, // Just dots
            /^\*+$/, // Just asterisks
            /^#+$/,  // Just hashes
            /^[\s\-=_.*#]+$/  // Only whitespace and separator characters
        ];
        
        const isMeaningless = meaninglessPatterns.some(pattern => pattern.test(raw));
        if (isMeaningless) {
            return [];
        }
        
        // Check if content is too short or doesn't contain meaningful recipe information
        if (raw.length < 10) {
            return [];
        }
        
        // Check if it looks like an error message or separator
        const errorPatterns = [
            /^(error|gagal|failed|tidak|cannot|unable)/i,
            /^-{3,}/, // Three or more dashes at start
            /^={3,}/, // Three or more equals at start
        ];
        
        const isError = errorPatterns.some(pattern => pattern.test(raw));
        if (isError) {
            return [];
        }
        
        const lines = raw.split(/\r?\n/);
        const isListStart = (s) => /^\s*(?:\d+\.|[-*•])\s+/.test(s);
        const isSectionLine = (s) =>
            /^(?:\d+\.|)\s*(Bahan|Langkah|Estimasi|Tips|Cara\s+Membuat)/i.test(s.trim());
            
        const looksLikeTitle = (s) => {
            const t = s.trim();
            if (!t || t.length < 3) return false;
            if (isListStart(t)) return false;
            if (isSectionLine(t)) return false;
            
            // Skip lines that start with numbers (like "1. Rendang" or "2 porsi")
            if (/^\d+[\.\s]/.test(t)) return false;
            
            // Skip lines that contain calorie/nutrition information
            if (/kalori|kcal|cal|protein|lemak|karbohidrat/i.test(t)) return false;
            
            // Check if it looks like a title (not too long, has meaningful content)
            if (t.length > 100) return false;
            
            // Allow headings like "# Rendang" or standalone dish names, but not numbered lists
            return true;
        };
        
        const titleIdx = [];
        for (let i = 0; i < lines.length; i++) {
            if (looksLikeTitle(lines[i])) {
                // Ensure within next 8 lines there is a section hint or it's the first potential title
                let hasSection = false;
                for (let j = i + 1; j <= Math.min(i + 8, lines.length - 1); j++) {
                    if (isSectionLine(lines[j]) || /Bahan|Langkah|Cara\s+Membuat/i.test(lines[j])) {
                        hasSection = true;
                        break;
                    }
                }
                if (hasSection || titleIdx.length === 0) {
                    titleIdx.push(i);
                }
            }
        }
        
        if (titleIdx.length === 0) {
            // Try alternative splitting by blank lines
            const parts = raw
                .split(/\n\s*\n+/)
                .map((p) => p.trim())
                .filter(Boolean);
                
            if (parts.length <= 1) {
                return [
                    {
                        title: extractTitleFromText(raw),
                        text: raw,
                        html: formatListHtml(raw),
                    },
                ];
            }
            
            return parts.map((p) => {
                const title = extractTitleFromText(p);
                return {
                    title: title || 'Resep tanpa judul',
                    text: p,
                    html: formatListHtml(p),
                };
            });
        }
        
        // Build segments from title indices
        const segments = [];
        for (let k = 0; k < titleIdx.length; k++) {
            const start = titleIdx[k];
            const end = k < titleIdx.length - 1 ? titleIdx[k + 1] : lines.length;
            const block = lines.slice(start, end).join('\n').trim();
            
            if (!block) continue;
            
            const firstLine = lines[start].trim();
            let title = firstLine
                .replace(/^#+\s*/, '') // Remove markdown headers
                .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '') // Remove "Resep" prefix
                .replace(/^Judul\s*[:\-]\s*/i, '') // Remove "Judul" prefix
                .replace(/^\d+[\.\s]+/, '') // Remove leading numbers with dots or spaces
                .replace(/^\d+\s*-\s*/, '') // Remove "1 - " pattern
                .trim();
                
            // Skip if title still starts with number after cleaning
            if (/^\d/.test(title)) {
                title = '';
            }
            
            // Skip if title contains calorie/nutrition information
            if (/kalori|kcal|cal|protein|lemak|karbohidrat/i.test(title)) {
                title = '';
            }
                
            // Fallback to extracting title from the whole block if first line is not good
            if (!title || title.length < 3) {
                title = extractTitleFromText(block);
            }
            
            title = (title || 'Resep tanpa judul').slice(0, 120);
            
            // For HTML content, preserve the title in the content but use better formatting
            const content = block;
            
            segments.push({
                title,
                text: block,
                html: formatListHtml(content),
            });
        }
        
        return segments.length ? segments : [
            {
                title: extractTitleFromText(raw),
                text: raw,
                html: formatListHtml(raw),
            },
        ];
    } catch (error) {
        console.error('Error in segmentRecipesFromText:', error);
        return [
            {
                title: extractTitleFromText(text) || 'Resep Tanpa Judul',
                text: text || '',
                html: formatListHtml(text || ''),
            },
        ];
    }
}

function buildChecklistFromText(text = '') {
    const { bahan, langkah } = parseRecipeSections(text);
    
    const toItems = (arr, type) => arr.map((t, index) => ({ 
        id: `${type}_${Date.now()}_${index}`,
        text: t, 
        done: false,
        type: type,
        createdAt: new Date().toISOString()
    }));
    
    return { 
        bahan: toItems(bahan, 'bahan'), 
        langkah: toItems(langkah, 'langkah'),
        totalItems: bahan.length + langkah.length,
        completedItems: 0
    };
}

function parseRecipeSections(text = '') {
    try {
        const lines = (text || '').split(/\r?\n/);
        let section = '';
        const out = { bahan: [], langkah: [] };
        
        const push = (s) => {
            if (!s) return;
            // Better cleaning - handle various list formats
            const clean = s
                .replace(/^[-*•]\s*/, '') // bullet points
                .replace(/^\d+\.\s*/, '') // numbered lists
                .replace(/^\(\d+\)\s*/, '') // numbered with parentheses
                .replace(/^[a-zA-Z]\.\s*/, '') // lettered lists
                .trim();
            
            if (!clean) return;
            
            if (section === 'bahan') {
                out.bahan.push(clean);
            } else if (section === 'langkah') {
                out.langkah.push(clean);
            }
        };
        
        for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;
            
            // Detect section headers - more flexible patterns
            if (/^(Bahan[-\s]?[-\s]?bahan|Ingredients?|Bahan)\s*:?$/i.test(line)) {
                section = 'bahan';
                continue;
            }
            if (/^(Langkah[-\s]?[-\s]?langkah|Cara\s+Membuat|Langkah(\s+Masak)?|Instructions?|Petunjuk)\s*:?$/i.test(line)) {
                section = 'langkah';
                continue;
            }
            
            // Stop at other headings
            if (/^(Estimasi|Tips|Catatan|Notes?|Nutrition|Kalori)\b/i.test(line)) {
                section = '';
                continue;
            }
            
            if (section) {
                push(line);
            }
        }
        
        return out;
    } catch {
        return { bahan: [], langkah: [] };
    }
}
