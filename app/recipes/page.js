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
        <>
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">
                    Resep Dinamis dengan Granite AI
                </h1>
                <ModelSettings onModelChange={setSelectedModel} />
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="grid md:grid-cols-2 gap-4"
            >
                <Card>
                    <label className="text-sm">Bahan yang tersedia</label>
                    <Textarea
                        id="ingredients"
                        placeholder="tomat, tahu, bayam"
                        {...register('ingredients')}
                    />
                    <div className="mt-2 flex gap-2">
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
                        />
                        <Button type="button" onClick={addPantry}>
                            Tambah
                        </Button>
                    </div>
                    {pantry?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {pantry.map((p, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-sm"
                                >
                                    {p.name}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            removePantry(i);
                                        }}
                                        className="opacity-70 hover:opacity-100"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="mt-3">
                        <label className="text-sm">Cari resep (opsional)</label>
                        <Input
                            id="query_inp"
                            placeholder="rendang, sayur bening, tumis kangkung"
                            {...register('query')}
                        />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                            type="submit"
                            loading={loading || isStreaming}
                            disabled={isStreaming || loading}
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
                </Card>
                <Card className="h-[60vh] max-h-[60vh] overflow-y-auto">
                    <h2 className="font-semibold mb-2">Hasil</h2>
                    <div
                        ref={respRef}
                        className="max-h-[60vh] overflow-auto pr-1"
                    >
                        {segments.length > 1 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {segments.map((seg, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg border border-slate-200/60 dark:border-white/10 p-3 hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <h3
                                                className="font-semibold text-base truncate"
                                                title={seg.title}
                                            >
                                                {seg.title}
                                            </h3>
                                            <Button
                                                type="button"
                                                size="sm"
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
                                                        const entry = {
                                                            id:
                                                                Date.now() +
                                                                idx,
                                                            title: seg.title,
                                                            content: seg.text,
                                                            pantry,
                                                            checklist,
                                                            meta: {
                                                                query:
                                                                    document.getElementById(
                                                                        'query_inp'
                                                                    )?.value ||
                                                                    '',
                                                            },
                                                            createdAt:
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
                                                    } catch {}
                                                }}
                                            >
                                                Simpan
                                            </Button>
                                        </div>
                                        <div
                                            className="prose prose-slate dark:prose-invert max-w-none text-sm max-h-40 overflow-auto"
                                            dangerouslySetInnerHTML={{
                                                __html: seg.html,
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="prose prose-slate dark:prose-invert max-w-none text-sm p-2"
                                dangerouslySetInnerHTML={{
                                    __html: formatListHtml(resp),
                                }}
                            />
                        )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 absolute bottom-3 left-3">
                        {segments.length > 1 ? (
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    try {
                                        const saved = JSON.parse(
                                            localStorage.getItem(
                                                'savedRecipes'
                                            ) || '[]'
                                        );
                                        const now = Date.now();
                                        const entries = segments.map(
                                            (seg, i) => ({
                                                id: now + i,
                                                title: seg.title,
                                                content: seg.text,
                                                pantry,
                                                checklist:
                                                    buildChecklistFromText(
                                                        seg.text
                                                    ),
                                                meta: {
                                                    query:
                                                        document.getElementById(
                                                            'query_inp'
                                                        )?.value || '',
                                                },
                                                createdAt:
                                                    new Date().toISOString(),
                                            })
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
                                            title: 'Resep Disimpan',
                                            description: 'Buka tab Todolist untuk checklist ringkasnya.'
                                        });
                                    } catch {}
                                }}
                            >
                                Simpan Semua
                            </Button>
                        ) : (
                            segments.length === 1 && (
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        try {
                                            if (!resp?.trim()) return;
                                            const saved = JSON.parse(
                                                localStorage.getItem(
                                                    'savedRecipes'
                                                ) || '[]'
                                            );
                                            const title =
                                                extractTitleFromText(resp);
                                            const checklist =
                                                buildChecklistFromText(resp);
                                            const entry = {
                                                id: Date.now(),
                                                title,
                                                content: resp,
                                                pantry,
                                                checklist,
                                                meta: {
                                                    query:
                                                        document.getElementById(
                                                            'query_inp'
                                                        )?.value || '',
                                                },
                                                createdAt:
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
                                                description: 'Buka tab Todolist untuk checklist ringkasnya.'
                                            });
                                        } catch {}
                                    }}
                                >
                                    Simpan Resep
                                </Button>
                            )
                        )}
                    </div>
                </Card>
            </form>
            </div>
            <ToastContainer toasts={toasts} />
        </>
    );
}

function joinPantry(items) {
    return items.map((p) => p.name).join(', ');
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
        const firstNonList = lines.find((l) => !/^(\d+\.|[-*]\s)/.test(l));
        if (firstNonList) {
            const cleaned = firstNonList
                .replace(/^#+\s*/, '')
                .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '')
                .replace(/^Judul\s*[:\-]\s*/i, '');
            return (cleaned || firstNonList).slice(0, 120);
        }
        // fallback: take first sentence
        const sentence = text.split(/\.|\n/)[0];
        return (sentence || 'Resep tanpa judul').slice(0, 120);
    } catch {
        return 'Resep tanpa judul';
    }
}

function segmentRecipesFromText(text = '') {
    try {
        const raw = text.trim();
        if (!raw) return [];
        const lines = raw.split(/\r?\n/);
        const isListStart = (s) => /^\s*(?:\d+\.|[-*])\s+/.test(s);
        const isSectionLine = (s) =>
            /^(?:\d+\.|)\s*(Bahan|Langkah|Estimasi|Tips)/i.test(s.trim());
        const looksLikeTitle = (s) => {
            const t = s.trim();
            if (!t) return false;
            if (isListStart(t)) return false;
            if (isSectionLine(t)) return false;
            // Allow headings like "Resep 1: Rendang" or "# Rendang"
            return true;
        };
        const titleIdx = [];
        for (let i = 0; i < lines.length; i++) {
            if (looksLikeTitle(lines[i])) {
                // sanity: ensure within next 6 lines there is a section hint, else might be paragraph
                let hasSection = false;
                for (
                    let j = i + 1;
                    j <= Math.min(i + 6, lines.length - 1);
                    j++
                ) {
                    if (
                        isSectionLine(lines[j]) ||
                        /Bahan|Langkah/i.test(lines[j])
                    ) {
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
            // fallback to blank-line split
            const parts = raw
                .split(/\n\s*\n+/)
                .map((p) => p.trim())
                .filter(Boolean);
            if (parts.length <= 1)
                return [
                    {
                        title: extractTitleFromText(raw),
                        text: raw,
                        html: formatListHtml(raw),
                    },
                ];
            return parts.map((p) => {
                const plines = p.split(/\r?\n/);
                const content = plines.slice(1).join('\n'); // drop first line as title
                return {
                    title: extractTitleFromText(p),
                    text: p,
                    html: formatListHtml(content),
                };
            });
        }
        // Build segments from title indices
        const segments = [];
        for (let k = 0; k < titleIdx.length; k++) {
            const start = titleIdx[k];
            const end =
                k < titleIdx.length - 1 ? titleIdx[k + 1] : lines.length;
            const block = lines.slice(start, end).join('\n').trim();
            if (!block) continue;
            const firstLine = lines[start].trim();
            const cleanedTitle = firstLine
                .replace(/^#+\s*/, '')
                .replace(/^Rese?p\s*\d*[:\-\.]?\s*/i, '')
                .replace(/^Judul\s*[:\-]\s*/i, '');
            const title = (cleanedTitle || extractTitleFromText(block)).slice(
                0,
                120
            );
            const content = block.split(/\r?\n/).slice(1).join('\n'); // drop first line (title) from html content
            segments.push({
                title,
                text: block,
                html: formatListHtml(content),
            });
        }
        return segments.length
            ? segments
            : [
                  {
                      title: extractTitleFromText(raw),
                      text: raw,
                      html: formatListHtml(raw),
                  },
              ];
    } catch {
        return [
            {
                title: extractTitleFromText(text),
                text,
                html: formatListHtml(text),
            },
        ];
    }
}

function buildChecklistFromText(text = '') {
    const { bahan, langkah } = parseRecipeSections(text);
    const toItems = (arr) => arr.map((t) => ({ text: t, done: false }));
    return { bahan: toItems(bahan), langkah: toItems(langkah) };
}

function parseRecipeSections(text = '') {
    try {
        const lines = (text || '').split(/\r?\n/);
        let section = '';
        const out = { bahan: [], langkah: [] };
        const push = (s) => {
            if (!s) return;
            const clean = s.replace(/^[-*\d\.\)]+\s*/, '').trim();
            if (!clean) return;
            if (section === 'bahan') out.bahan.push(clean);
            else if (section === 'langkah') out.langkah.push(clean);
        };
        for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;
            if (/^Bahan\b/i.test(line)) {
                section = 'bahan';
                continue;
            }
            if (/^Langkah(\s+Masak)?\b/i.test(line)) {
                section = 'langkah';
                continue;
            }
            // stop at other headings
            if (/^(Estimasi|Tips)\b/i.test(line)) {
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
