import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import HelpFeedback from '@/components/HelpFeedback';
import { Flame } from 'lucide-react';

export const metadata: Metadata = {
  title: '75 Challenge — Hard Discipline, Flexible Rules',
  description: 'Transform your body and mind in 75 days with customizable rules, self-paced trust logging, and positive social accountability.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Navigation Bar */}
        <header className="navbar">
          <div className="container nav-container">
            <Link href="/" className="logo" id="nav-logo">
              <Flame size={26} color="var(--accent-orange)" />
              <span>75 CHALLENGE</span>
            </Link>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <Link href="/feed" className="btn btn-secondary btn-sm" id="nav-feed">
                Community Feed
              </Link>
              <Link href="/join" className="btn btn-primary btn-sm" id="nav-join">
                Join 75 Challenge
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>

        {/* Global Floating Mailto Help Trigger */}
        <HelpFeedback />

        {/* Minimal Footer */}
        <footer
          style={{
            marginTop: '5rem',
            padding: '2.5rem 0',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          <div className="container">
            <p>© {new Date().getFullYear()} 75 Challenge. Built for discipline, consistency, and positive accountability.</p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>
              Self-paced daily tracking. 1 Streak Shield per 75-day journey.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
