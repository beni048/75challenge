'use client';

import React, { useState } from 'react';
import { HelpCircle, Mail, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import ModalPortal from './ModalPortal';

/** Support and feature requests both go to this inbox. */
export const SUPPORT_EMAIL = 'beni.rossi@gmail.com';

export default function HelpFeedback() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        id="help-feedback-fab"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm help-fab"
        aria-label={t('help.trigger')}
      >
        <HelpCircle size={18} color="var(--accent-orange)" />
        <span className="help-fab-label">{t('help.trigger')}</span>
      </button>

      <ModalPortal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <AnimatePresence>
          {isOpen && (
            <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '440px' }}
              role="dialog"
              aria-modal="true"
              aria-label={t('help.trigger')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>{t('help.trigger')}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  aria-label={t('shield.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                {t('help.intro')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('help.supportSubject'))}`}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.9rem 1.2rem' }}
                >
                  <Mail size={20} color="var(--accent-cyan)" />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem' }}>
                      {t('help.supportTitle')}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {t('help.supportDesc')}
                    </span>
                  </span>
                </a>

                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('help.featureSubject'))}`}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.9rem 1.2rem' }}
                >
                  <Sparkles size={20} color="var(--accent-orange)" />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem' }}>
                      {t('help.featureTitle')}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {t('help.featureDesc')}
                    </span>
                  </span>
                </a>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('help.emailLabel')} <span style={{ color: 'var(--text-secondary)' }}>{SUPPORT_EMAIL}</span>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </>
  );
}
