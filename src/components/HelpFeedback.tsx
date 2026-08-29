'use client';

import React, { useState } from 'react';
import { HelpCircle, Mail, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpFeedback() {
  const [isOpen, setIsOpen] = useState(false);
  const supportEmail = 'support@75challenge.app';

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="help-feedback-fab"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 40,
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          padding: '0.6rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: 'rgba(23, 27, 38, 0.9)',
          borderColor: 'var(--border-medium)',
        }}
        aria-label="Help & Feedback"
      >
        <HelpCircle size={18} color="var(--accent-orange)" />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Help & Feedback</span>
      </button>

      {/* Modal Dialog */}
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
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Help & Feedback</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Have questions, found an issue, or want to suggest a new feature? Reach out directly to the team.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <a
                  href={`mailto:${supportEmail}?subject=Support Request - 75 Challenge`}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.9rem 1.2rem' }}
                >
                  <Mail size={20} color="var(--accent-cyan)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Contact Support</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Get help with account or app issues</div>
                  </div>
                </a>

                <a
                  href={`mailto:${supportEmail}?subject=Feature Proposal - 75 Challenge`}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.9rem 1.2rem' }}
                >
                  <Sparkles size={20} color="var(--accent-orange)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Propose a Feature</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Share ideas to improve the challenge</div>
                  </div>
                </a>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Email: <span style={{ color: 'var(--text-secondary)' }}>{supportEmail}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
