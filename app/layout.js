import './globals.css';
import { ThemeProvider } from '../components/theme-provider';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import GlobalErrorHandler from '../components/error-handler';

export const metadata = {
    title: 'Reseptor',
    description:
        'Planner, resep, dan belanja cerdas dengan Granite AI secara lokal',
};

export default function RootLayout({ children }) {
    return (
        <html lang="id" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body 
                className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-darkbg dark:to-[#0e1428] text-slate-900 dark:text-slate-100 overflow-x-hidden"
                suppressHydrationWarning
            >
                <GlobalErrorHandler />
                <ThemeProvider>
                    <div className="flex flex-col min-h-screen">
                        <Navbar />
                        <main className="flex-1 container mx-auto  py-6 max-w-7xl w-full">
                            <div className="min-h-full overflow-hidden">
                                {children}
                            </div>
                        </main>
                        <Footer />
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
