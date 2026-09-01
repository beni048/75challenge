'use client';

/**
 * Cloudflare Turnstile — a non-interactive "prove you're not a bot" check on
 * sign-up.
 *
 * The token this produces is meaningless on its own: it is verified
 * server-side by Supabase (GoTrue) when it receives `captchaToken` in
 * `signUp()`'s options, using the secret configured in the Supabase dashboard.
 * A widget that was only checked in the browser would stop nothing — this app
 * has no backend of its own in front of the auth endpoint (start.md §9, RLS is
 * the entire authorization model), so the only enforcement point that exists
 * at all is Supabase's own.
 *
 * Renders nothing, and `onVerify` never fires, when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset — so local dev and any environment
 * that hasn't configured Turnstile yet keeps working exactly as before.
 */

import React, { useEffect, useId, useRef } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string | null) => void;
}

export default function Turnstile({ onVerify }: TurnstileProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerId = useId();
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = React.useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady) return;
    const container = document.getElementById(containerId);
    if (!container || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: siteKey,
      callback: (token) => onVerify(token),
      'expired-callback': () => onVerify(null),
      'error-callback': () => onVerify(null),
      theme: 'auto',
    });

    return () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
    };
    // onVerify is expected to be stable (a state setter) — re-rendering the
    // widget on every parent render would reset an in-progress challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, scriptReady, containerId]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />
      <div id={containerId} />
    </>
  );
}
