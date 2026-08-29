'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="container">
        <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        <p style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
