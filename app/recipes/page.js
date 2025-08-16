'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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

    // auto-scroll to bottom when response updates
    useEffect(() => {
        try {
            if (respRef.current) {
                respRef.current.scrollTop = respRef.current.scrollHeight;
            }
        } catch {}
    }, [resp]);

    const onSubmit = async (values) => {
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
            const dec = new TextDecoder();
            let acc = '';
            while (true) {
                let read;
                try {
                    read = await reader.read();
                } catch {
                    break;
                }
                const { value, done } = read || {};
                if (done) break;
                acc += dec.decode(value);
                setResp(acc);
            }
        } catch (e) {
            if (e?.name !== 'AbortError') setResp('Gagal membuat resep');
        } finally {
            setLoading(false);
            setIsStreaming(false);
            abortRef.current = null;
        }
    };

    const stop = () => {
        try {
            abortRef.current?.abort();
        } catch {}
    };
    const onReset = () => {
        setResp('');
        reset({ ingredients: '', query: '' });
    };

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
        <div className="flex flex-col min-h-0 space-y-4 p-4 overflow-hidden">
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
                className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4"
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
                    
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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
                    
                    <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap gap-2">
                            {(isStreaming || loading) && resp ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md">
                                    ⏳ Tunggu AI selesai untuk menyimpan resep
                                </div>
                            ) : (
                                <>
                                    {/* Only show save buttons if we have valid segments or meaningful content */}
                                    {!isStreaming && !loading && segments.length > 1 ? (
                                        <Button
                                            type="button"
                                            variant="primary"
                                            size="sm"
                                            className="flex-1 sm:flex-none"
                                onClick={() => {
                                    try {
                                        const saved = JSON.parse(
                                            localStorage.getItem(
                                                'savedRecipes'
                                            ) || '[]'
                                        );
                                        const now = Date.now();
                                        let totalChecklistItems = 0;
                                        
                                        const entries = segments.map(
                                            (seg, i) => {
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
                                        localStorage.setItem(
                                            'savedRecipes',
                                            JSON.stringify(
                                                [...entries, ...saved].slice(
                                                    0,
                                                    50
                                                )
                                            )
                                        );
                                        window.dispatchEvent(
                                            new Event('savedRecipesUpdated')
                                        );
                                        toast({
                                            title: 'Semua Resep Disimpan',
                                            description: `${segments.length} resep dengan total ${totalChecklistItems} item checklist berhasil disimpan. Buka tab Todolist untuk checklist.`
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
                        ) : (
                            // Only show single save button if we have exactly one segment OR meaningful content without segments
                            (!isStreaming && !loading && 
                            (
                                (segments.length === 1) || 
                                (segments.length === 0 && resp?.trim() && !isResponseMeaningless(resp))
                            )) ? (
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
                            ) : null
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
    
    // Check for common meaningless patterns
    const meaninglessPatterns = [
        /^-+$/,  // Just dashes
        /^=+$/,  // Just equals
        /^_+$/,  // Just underscores
        /^\.+$/, // Just dots
        /^\*+$/, // Just asterisks
        /^#+$/,  // Just hashes
        /^[\s\-=_.*#]+$/,  // Only whitespace and separator characters
        /^---+/,  // Starts with three or more dashes
        /^===+/,  // Starts with three or more equals
    ];
    
    const isMeaningless = meaninglessPatterns.some(pattern => pattern.test(raw));
    if (isMeaningless) return true;
    
    // Check if content is too short
    if (raw.length < 10) return true;
    
    // Check if it looks like an error message
    const errorPatterns = [
        /^(error|gagal|failed|tidak|cannot|unable)/i,
        /^(maaf|sorry|apologize)/i,
    ];
    
    const isError = errorPatterns.some(pattern => pattern.test(raw));
    return isError;
}

function formatListHtml(text = '') {
    try {
        const lines = text.split(/\r?\n/);
        const chunks = [];
        let ol = [];
        let ul = [];
        const flush = () => {
            if (ol.length) {
                chunks.push(
                    '<ol class="pl-5 list-decimal space-y-1">' +
                        ol.map((li) => `<li>${escapeHtml(li)}</li>`).join('') +
                        '</ol>'
                );
                ol = [];
            }
            if (ul.length) {
                chunks.push(
                    '<ul class="pl-5 list-disc space-y-1">' +
                        ul.map((li) => `<li>${escapeHtml(li)}</li>`).join('') +
                        '</ul>'
                );
                ul = [];
            }
        };
        for (const raw of lines) {
            const line = raw.trim();
            if (!line) {
                flush();
                continue;
            }
            // Headings like Bahan/Langkah/Estimasi/Tips (optional colon)
            if (
                /^(Bahan|Langkah(?:\s+Masak)?|Estimasi(?:\s+Kalori(?:\s+per\s+Porsi)?)?|Tips(?:\s+Singkat)?)\s*:?$/i.test(
                    line
                )
            ) {
                flush();
                chunks.push(
                    `<h4 class="mt-2 font-semibold">${escapeHtml(
                        line.replace(/\s*:$/, '')
                    )}</h4>`
                );
                continue;
            }
            // Ordered vs unordered
            if (/^\d+\./.test(line)) {
                if (ul.length) {
                    chunks.push(
                        '<ul class="pl-5 list-disc space-y-1">' +
                            ul
                                .map((li) => `<li>${escapeHtml(li)}</li>`)
                                .join('') +
                            '</ul>'
                    );
                    ul = [];
                }
                ol.push(line.replace(/^\d+\.\s*/, '').trim());
                continue;
            }
            if (/^[-*]\s+/.test(line)) {
                if (ol.length) {
                    chunks.push(
                        '<ol class="pl-5 list-decimal space-y-1">' +
                            ol
                                .map((li) => `<li>${escapeHtml(li)}</li>`)
                                .join('') +
                            '</ol>'
                    );
                    ol = [];
                }
                ul.push(line.replace(/^[-*]\s+/, '').trim());
                continue;
            }
            // default paragraph
            flush();
            chunks.push('<p>' + escapeHtml(line) + '</p>');
        }
        flush();
        return chunks.join('') || escapeHtml(text);
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
            
        // Look for a line that looks like a title/header
        for (const line of lines) {
            // Skip list items and section headers
            if (/^(\d+\.|[-*•]\s|Bahan|Langkah|Estimasi|Tips)/i.test(line)) {
                continue;
            }
            
            // Clean up potential title
            const cleaned = line
                .replace(/^#+\s*/, '') // Remove markdown headers
                .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '') // Remove "Resep" prefix
                .replace(/^Judul\s*[:\-]\s*/i, '') // Remove "Judul" prefix
                .replace(/^\*\*(.+)\*\*$/, '$1') // Remove bold markdown
                .trim();
                
            if (cleaned && cleaned.length > 3 && cleaned.length < 100) {
                return cleaned.slice(0, 120);
            }
        }
        
        // Fallback: take first non-empty line
        const firstLine = lines[0];
        if (firstLine) {
            const cleaned = firstLine
                .replace(/^#+\s*/, '')
                .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '')
                .trim();
            return (cleaned || firstLine).slice(0, 120);
        }
        
        // Last resort: take first sentence
        const sentence = text.split(/[\.!\?]|\n/)[0]?.trim();
        return (sentence || 'Resep tanpa judul').slice(0, 120);
    } catch {
        return 'Resep tanpa judul';
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
            
            // Check if it looks like a title (not too long, has meaningful content)
            if (t.length > 100) return false;
            
            // Allow headings like "Resep 1: Rendang", "# Rendang", or standalone titles
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
                .trim();
                
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
                title: extractTitleFromText(text) || 'Resep tanpa judul',
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
