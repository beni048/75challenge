'use client';

import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

interface SimpleAuthFormProps {
  initialDisplayName?: string;
  initialEmail?: string;
  onSubmit: (data: { displayName: string; email: string; password: string }) => Promise<void>;
  submitButtonText?: string;
  loading?: boolean;
}

export default function SimpleAuthForm({
  initialDisplayName = '',
  initialEmail = '',
  onSubmit,
  submitButtonText = 'Join the 75 Challenge',
  loading = false,
}: SimpleAuthFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }

    // Lenient password policy: minimum 5 characters
    if (password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }

    try {
      await onSubmit({ displayName: displayName.trim(), email: email.trim(), password });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} id="auth-form">
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(255, 23, 68, 0.15)',
            border: '1px solid rgba(255, 23, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#ff5252',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="input-group">
        <label className="input-label" htmlFor="auth-display-name">
          Display Name (Real Name or Pseudonym)
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="auth-display-name"
            type="text"
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="e.g. IronSpartan or Sarah Connor"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <UserIcon
            size={18}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="auth-email">
          Email Address
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="auth-email"
            type="email"
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Mail
            size={18}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      <div className="input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="input-label" htmlFor="auth-password">
            Password (Min. 5 Characters)
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simple & Lenient</span>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            id="auth-password"
            type="password"
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={5}
          />
          <Lock
            size={18}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '0.5rem' }}
        disabled={loading}
        id="auth-submit-btn"
      >
        {loading ? 'Committing Challenge...' : submitButtonText}
        {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
