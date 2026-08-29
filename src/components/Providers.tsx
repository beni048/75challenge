'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n';
import ToastProvider from './Toast';
import ChallengeProvider from './ChallengeProvider';

/**
 * App-wide providers, outermost first.
 *
 * Order matters: ChallengeProvider is innermost because it may surface errors
 * through toasts, and its copy comes from I18nProvider.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <ChallengeProvider>{children}</ChallengeProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
