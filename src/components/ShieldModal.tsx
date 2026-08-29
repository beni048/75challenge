'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ShieldModalProps {
  isOpen: boolean;
  missedDate: string;
  shieldsRemaining: number;
  onUseShield: () => void;
  onHardReset: () => void;
  onClose: () => void;
}

export default function ShieldModal({
  isOpen,
  missedDate,
  shieldsRemaining,
  onUseShield,
  onHardReset,
  onClose,
}: ShieldModalProps) {
  return (
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
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 90, 31, 0.15)',
                  border: '1px solid rgba(255, 90, 31, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <ShieldAlert size={30} color="var(--accent-orange)" />
              </div>

              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>
                Missed Day Reported
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                You reported an incomplete day on <strong>{missedDate}</strong>.
              </p>
            </div>

            {/* Decision Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {shieldsRemaining > 0 ? (
                <div
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    border: '1px solid var(--accent-cyan)',
                    background: 'rgba(0, 229, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <ShieldCheck size={20} color="var(--accent-cyan)" />
                    <h4 style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>
                      Option 1: Deploy Streak Shield (1 Available)
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Protects your streak and marks {missedDate} as shielded. You will have 0 shields remaining. A subsequent missed day will require a hard reset.
                  </p>
                  <button
                    onClick={onUseShield}
                    className="btn btn-cyan"
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    Use Streak Shield & Continue
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 23, 68, 0.15)',
                    border: '1px solid rgba(255, 23, 68, 0.3)',
                    color: '#ff5252',
                    fontSize: '0.85rem',
                  }}
                >
                  <strong>No Streak Shields Remaining:</strong> Your 1 shield was already deployed on this 75-day attempt.
                </div>
              )}

              <div
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <RotateCcw size={18} color="var(--text-muted)" />
                  <h4 style={{ fontSize: '0.95rem' }}>Option 2: Hard Reset to Day 1</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  ⚠️ <strong>Warning:</strong> This will wipe your current streak and start a brand new attempt from <strong>Day 1</strong> with 1 fresh Streak Shield.
                </p>
                <button
                  onClick={onHardReset}
                  className="btn btn-secondary"
                  style={{ width: '100%', color: '#ff5252', borderColor: 'rgba(255, 23, 68, 0.3)' }}
                >
                  Accept Hard Reset to Day 1
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
