import Link from 'next/link';
import {
    Bot,
    Calendar,
    ShoppingCart,
    ShieldCheck,
    Moon,
    Wallet,
    ListChecks,
    Bookmark,
} from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Home() {
    return (
        <div className="space-y-8">
            <section className="rounded-2xl hero-grad p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                    <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                        Reseptor – Asisten Masak Keluarga
                    </h1>
                    <p className="mt-4 text-slate-600 dark:text-slate-300">
                        Kelola pantry, temukan resep sehat, simpan resep
                        favorit, dan kelola todolist memasak. Semua lokal via
                        Ollama + Granite — cepat, privat, tanpa login.
                    </p>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <Badge
                            icon={<ShieldCheck className="w-3.5 h-3.5" />}
                            text="Lokal & Privat"
                        />
                        <Badge
                            icon={<Wallet className="w-3.5 h-3.5" />}
                            text="Hemat Budget"
                        />
                        <Badge
                            icon={<Moon className="w-3.5 h-3.5" />}
                            text="Dark Mode"
                        />
                        <Badge
                            icon={<ListChecks className="w-3.5 h-3.5" />}
                            text="Todolist Masak"
                        />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/recipes">
                            <Button>
                                <Bot className="w-4 h-4 mr-2" />
                                Mulai dari Resep
                            </Button>
                        </Link>
                        <Link href="/todolist">
                            <Button variant="primary">
                                <Calendar className="w-4 h-4 mr-2" />
                                Buka Todolist
                            </Button>
                        </Link>
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                    <FeatureCard
                        icon={<Bot className="w-5 h-5" />}
                        title="Granite AI"
                        desc="Resep & tanya-jawab lokal via Ollama"
                    />
                    <FeatureCard
                        icon={<ListChecks className="w-5 h-5" />}
                        title="Todolist"
                        desc="Checklist langkah masak ringkas dari AI"
                    />
                    <FeatureCard
                        icon={<Bookmark className="w-5 h-5" />}
                        title="Simpan Resep"
                        desc="Koleksi pribadi untuk dimasak kapan saja"
                    />
                </div>
            </section>

            <section className="grid md:grid-cols-3 gap-6">
                <QuickLink
                    href="/todolist"
                    title="Todolist Resep"
                    icon={<ListChecks className="w-5 h-5" />}
                />
                <QuickLink
                    href="/chat"
                    title="Chat Granite"
                    icon={<Bot className="w-5 h-5" />}
                />
            </section>

            <section className="grid md:grid-cols-3 gap-4">
                <ValueCard
                    title="Pantry-First"
                    points={[
                        'Kelola bahan, qty, satuan, dan kategori',
                        'Cari resep berdasarkan bahan yang ada',
                        'Tambahkan cepat ke planner & belanja',
                    ]}
                />
                <ValueCard
                    title="Sehat & Hemat"
                    points={[
                        'Saran menu seimbang untuk keluarga',
                        'Perkiraan kalori & biaya per hari',
                        'Belanja terstruktur, anti overbuy',
                    ]}
                />
                <ValueCard
                    title="Cepat & Privat"
                    points={[
                        'Semua proses via Ollama lokal',
                        'Tanpa akun, tanpa cloud',
                        'Dark mode nyaman di mata',
                    ]}
                />
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="rounded-xl glass p-4">
            <div className="text-slate-700 dark:text-slate-200 flex items-center gap-2 font-semibold">
                {icon}
                {title}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {desc}
            </p>
        </div>
    );
}

function QuickLink({ href, title, icon }) {
    return (
        <Link
            href={href}
            className="group rounded-xl glass p-5 hover:shadow-card transition"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                    {icon}
                </div>
                <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs text-slate-500">Buka</div>
                </div>
            </div>
        </Link>
    );
}

function Badge({ icon, text }) {
    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200">
            {icon}
            <span>{text}</span>
        </div>
    );
}

function ValueCard({ title, points }) {
    return (
        <div className="rounded-xl glass p-5">
            <div className="font-semibold mb-2">{title}</div>
            <ul className="text-sm list-disc pl-4 text-slate-600 dark:text-slate-300">
                {points.map((p, i) => (
                    <li key={i}>{p}</li>
                ))}
            </ul>
        </div>
    );
}
