import React from 'react';
import { Flame } from 'lucide-react';

/**
 * A brief, honest loading state — used where a page's content depends on
 * knowing the auth session first, instead of guessing from localStorage and
 * risking a wrong guess (see start.md, the landing page's auth-flash fix).
 */
export default function PageSpinner() {
  return (
    <div
      className="page-spinner"
      role="status"
      aria-label="Loading"
      style={{
        minHeight: '60dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Flame size={40} color="var(--accent-orange)" className="pulse-active" style={{ borderRadius: '50%' }} />
    </div>
  );
}
