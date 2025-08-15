import './globals.css';
import { ThemeProvider } from '../components/theme-provider';
import Navbar from '../components/navbar';
import Footer from '../components/footer';

export const metadata = {
    title: 'Reseptor',
    description:
        'Planner, resep, dan belanja cerdas dengan Granite AI secara lokal',
};

export default function RootLayout({ children }) {
    return (
        <html lang="id" suppressHydrationWarning>
            <body className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-darkbg dark:to-[#0e1428] text-slate-900 dark:text-slate-100">
                <ThemeProvider>
                    <Navbar />
                    <main className="container mx-auto px-4 py-6 overflow-y-auto h-[80vh]">
                        {children}
                    </main>
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
