import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'BioSpark — Bio-Inspired Algorithm Discovery',
    template: '%s | BioSpark',
  },
  description:
    'Research dashboard for exploring bio-inspired algorithm discovery. Discovering algorithms nature already invented.',
  keywords: ['bio-inspired', 'algorithms', 'machine learning', 'research', 'optimization'],
};

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⬡' },
  { href: '/analogies', label: 'Analogies', icon: '⟷' },
  { href: '/algorithms', label: 'Algorithms', icon: '⌬' },
  { href: '/benchmarks', label: 'Benchmarks', icon: '◈' },
  { href: '/discovery', label: 'Discovery', icon: '✦' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-gray-200 antialiased">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-60 shrink-0 bg-surface border-r border-white/8 flex flex-col">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-white/8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center group-hover:bg-primary-600/30 transition-colors duration-150">
                  <span className="text-primary-400 text-sm font-bold">B</span>
                </div>
                <div>
                  <span className="text-white font-semibold text-sm tracking-tight">BioSpark</span>
                  <p className="text-[10px] text-gray-500 leading-tight">Algorithm Discovery</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              <p className="px-3 pb-2 text-[10px] font-medium text-gray-600 uppercase tracking-widest">
                Navigation
              </p>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  <span className="text-primary-500/70 font-mono text-xs w-4">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
                <span className="text-xs text-gray-500">API Connected</span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1 font-mono">v0.1.0</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 bg-background bg-bio-mesh">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
