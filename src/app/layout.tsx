import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HelpFeedback from '@/components/HelpFeedback';
import TimezoneConfirmBanner from '@/components/TimezoneConfirmBanner';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  // Static metadata is emitted on the server, before a locale is known, so it
  // stays in English. The in-page copy is translated (see src/lib/i18n.tsx).
  title: '75 Challenge — Challenge Yourself',
  description:
    'Build habits that stick in 75 days. Choose your own, go at your own pace, and finish together with the community by 31 December 2026.',
  manifest: '/manifest.webmanifest',
  applicationName: '75 Challenge',
  appleWebApp: {
    capable: true,
    title: '75 Challenge',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0c10' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `lang` and `data-theme` are corrected by THEME_INIT_SCRIPT before paint;
    // suppressHydrationWarning keeps React from complaining about that rewrite.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <SiteHeader />
          <TimezoneConfirmBanner />

          <main>{children}</main>

          {/* Global floating mailto help trigger */}
          <HelpFeedback />

          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
