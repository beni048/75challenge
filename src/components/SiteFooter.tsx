'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="container">
        <p className="footer-line">
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <span className="footer-sep" aria-hidden="true">|</span>
          <span>{t('footer.brand')}</span>
        </p>
        <p style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
