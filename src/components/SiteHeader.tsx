'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Moon, Sun, User as UserIcon, ListChecks, KeyRound, LogOut } from 'lucide-react';
import { useI18n, LOCALES, LOCALE_LABELS } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useChallenge } from './ChallengeProvider';
import { signOut } from '@/lib/auth';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === 'dark' ? t('nav.toggleThemeToLight') : t('nav.toggleThemeToDark');

  return (
    <button type="button" className="icon-btn" onClick={toggleTheme} title={label} aria-label={label}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="segmented" role="group" aria-label={t('nav.language')}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          title={code === 'en' ? t('nav.languageEn') : t('nav.languageDe')}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}

function AccountMenu({ username, displayName }: { username: string; displayName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape, the way a native menu behaves.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    router.push('/');
  };

  const initial = (displayName || username).charAt(0).toUpperCase();

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        id="account-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.openAccount')}
        title={t('nav.account')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--gradient-fire)',
          border: 'none',
          color: 'var(--text-on-accent)',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '0.95rem',
          cursor: 'pointer',
        }}
      >
        {initial}
      </button>

      {open && (
        <div className="menu-popover" role="menu">
          <button type="button" role="menuitem" className="menu-item" onClick={() => go(`/user/${username}`)}>
            <ListChecks size={16} color="var(--accent-orange)" />
            {t('nav.myChallenge')}
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => go('/account?tab=rules')}>
            <UserIcon size={16} color="var(--accent-cyan)" />
            {t('nav.editRules')}
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => go('/account?tab=security')}>
            <KeyRound size={16} color="var(--accent-green)" />
            {t('nav.security')}
          </button>
          <button type="button" role="menuitem" className="menu-item is-danger" onClick={handleLogout}>
            <LogOut size={16} />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const { t } = useI18n();
  const { session, challenge, loading } = useChallenge();

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link href="/" className="logo" id="nav-logo">
          <Flame size={26} color="var(--accent-orange)" />
          <span>75 CHALLENGE</span>
        </Link>

        <nav className="nav-actions">
          <LanguageSwitch />
          <ThemeToggle />

          {/* Held back until auth resolves, so the nav does not flash the
              logged-out buttons at a signed-in participant. */}
          {!loading &&
            (session && challenge ? (
              <AccountMenu username={challenge.username} displayName={challenge.displayName} />
            ) : session ? (
              // Signed in but no challenge yet (e.g. confirmed the email but
              // never finished onboarding).
              <Link href="/join" className="btn btn-primary btn-sm" id="nav-finish-setup">
                {t('nav.join')}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary btn-sm" id="nav-login">
                  {t('nav.login')}
                </Link>
                <Link href="/join" className="btn btn-primary btn-sm" id="nav-join">
                  {t('nav.join')}
                </Link>
              </>
            ))}
        </nav>
      </div>
    </header>
  );
}
