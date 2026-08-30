'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, RotateCcw, AlertCircle, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import ModalPortal from './ModalPortal';

interface ShieldModalProps {
  isOpen: boolean;
  missedDate: string;
  shieldsRemaining: number;
  onUseShield: () => void;
  onHardReset: (announceToFeed: boolean) => void;
  onClose: () => void;
}

/**
 * Shown only when a user voluntarily reports a missed day.
 *
 * The shield is offered once — while one is left. With none remaining, the only
 * way forward is a reset to Day 1, and the warning says so plainly.
 */
export default function ShieldModal({
  isOpen,
  missedDate,
  shieldsRemaining,
  onUseShield,
  onHardReset,
  onClose,
}: ShieldModalProps) {
  const { t } = useI18n();
  const [announceToFeed, setAnnounceToFeed] = useState(false);

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <AnimatePresence>
        {isOpen && (
          <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
            role="dialog"
            aria-modal="true"
            aria-label={t('shield.title')}
          >
            <button
              onClick={onClose}
              aria-label={t('shield.close')}
              style={{
                position: 'relative',
                float: 'right',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-orange-soft)',
                  border: '1px solid var(--accent-orange-soft-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <ShieldAlert size={30} color="var(--accent-orange)" />
              </div>

              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{t('shield.title')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {t('shield.subtitle', { date: missedDate })}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              {shieldsRemaining > 0 ? (
                <div
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    border: '1px solid var(--accent-cyan)',
                    background: 'var(--accent-cyan-soft)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <ShieldCheck size={20} color="var(--accent-cyan)" />
                    <h4 style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>
                      {t('shield.optionShieldTitle')}
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {t('shield.optionShieldDesc', { date: missedDate })}
                  </p>
                  <button onClick={onUseShield} className="btn btn-cyan" style={{ width: '100%', fontWeight: 700 }}>
                    {t('shield.optionShieldCta')}
                  </button>
                </div>
              ) : (
                <div className="notice notice-error">
                  <AlertCircle size={18} />
                  <span>{t('shield.noShields')}</span>
                </div>
              )}

              <div
                className="glass-card"
                style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <RotateCcw size={18} color="var(--text-muted)" />
                  <h4 style={{ fontSize: '0.95rem' }}>{t('shield.optionResetTitle')}</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  ⚠️ {t('shield.optionResetDesc')}
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={announceToFeed}
                    onChange={(e) => setAnnounceToFeed(e.target.checked)}
                  />
                  {t('shield.announceToFeed')}
                </label>
                <button
                  onClick={() => {
                    onHardReset(announceToFeed);
                    setAnnounceToFeed(false);
                  }}
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                >
                  {t('shield.optionResetCta')}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setAnnounceToFeed(false);
                onClose();
              }}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {t('shield.keepGoing')}
            </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
