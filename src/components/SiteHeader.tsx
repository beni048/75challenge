'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Moon,
  Sun,
  User as UserIcon,
  ListChecks,
  KeyRound,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useI18n, LOCALES, LOCALE_LABELS } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useChallenge } from './ChallengeProvider';
import { signOut } from '@/lib/auth';

/**
 * Closes a popover on an outside click or Escape, the way a native menu
 * behaves. Shared by the account dropdown and the mobile burger panel.
 */
function useDismissable<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return ref;
}

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

type AccountAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  run: () => void | Promise<void>;
  danger?: boolean;
};

/**
 * The signed-in actions, shared by the desktop avatar dropdown and the mobile
 * panel so the two never drift apart.
 */
function useAccountActions(username: string, onDone: () => void): AccountAction[] {
  const { t } = useI18n();
  const router = useRouter();

  const go = (href: string) => () => {
    onDone();
    router.push(href);
  };

  return [
    {
      key: 'challenge',
      label: t('nav.myChallenge'),
      icon: <ListChecks size={16} color="var(--accent-orange)" />,
      run: go(`/user/${username}`),
    },
    {
      key: 'rules',
      label: t('nav.editRules'),
      icon: <UserIcon size={16} color="var(--accent-cyan)" />,
      run: go('/account?tab=rules'),
    },
    {
      key: 'security',
      label: t('nav.security'),
      icon: <KeyRound size={16} color="var(--accent-green)" />,
      run: go('/account?tab=security'),
    },
    {
      key: 'logout',
      label: t('nav.logout'),
      icon: <LogOut size={16} />,
      danger: true,
      run: async () => {
        onDone();
        await signOut();
        router.push('/');
      },
    },
  ];
}

function AccountMenu({ username, displayName }: { username: string; displayName: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const wrapperRef = useDismissable<HTMLDivElement>(open, close);
  const actions = useAccountActions(username, close);

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
        className="nav-avatar"
      >
        {initial}
      </button>

      {open && (
        <div className="menu-popover" role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className={`menu-item${action.danger ? ' is-danger' : ''}`}
              onClick={action.run}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const { t } = useI18n();
  const { session, challenge, loading } = useChallenge();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const menuRef = useDismissable<HTMLElement>(menuOpen, closeMenu);
  const accountActions = useAccountActions(challenge?.username ?? '', closeMenu);

  // The panel only exists below the breakpoint; if the viewport grows while it
  // is open, drop it rather than leaving invisible state behind.
  useEffect(() => {
    if (!menuOpen || typeof window === 'undefined') return;
    const query = window.matchMedia('(min-width: 720px)');
    const sync = () => {
      if (query.matches) setMenuOpen(false);
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [menuOpen]);

  const router = useRouter();

  const handleOrphanedLogout = async () => {
    closeMenu();
    await signOut();
    router.push('/');
  };

  // Held back until auth resolves, so the nav does not flash the logged-out
  // buttons at a signed-in participant. The desktop nav stays mounted behind
  // the mobile panel, so only that copy carries the shared element ids.
  const authLinks = (withIds: boolean) =>
    loading || (session && challenge) ? null : session ? (
      // Signed in but no challenge exists yet — either mid-onboarding after an
      // email-confirmation redirect, or an account left over from a signup
      // whose challenge write failed. Either way, the person must be able to
      // finish setup *or* leave; a bare "Join" button with no way out is a
      // dead end (join re-attempts signUp with the same email and fails).
      <>
        <Link
          href="/join"
          className="btn btn-primary btn-sm"
          id={withIds ? 'nav-finish-setup' : undefined}
          onClick={closeMenu}
        >
          {t('nav.join')}
        </Link>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleOrphanedLogout}
        >
          {t('nav.logout')}
        </button>
      </>
    ) : (
      <>
        <Link
          href="/login"
          className="btn btn-secondary btn-sm"
          id={withIds ? 'nav-login' : undefined}
          onClick={closeMenu}
        >
          {t('nav.login')}
        </Link>
        <Link
          href="/join"
          className="btn btn-primary btn-sm"
          id={withIds ? 'nav-join' : undefined}
          onClick={closeMenu}
        >
          {t('nav.join')}
        </Link>
      </>
    );

  return (
    <header className="navbar" ref={menuRef}>
      <div className="container nav-container">
        <Link href="/" className="logo" id="nav-logo" onClick={closeMenu}>
          <Flame size={26} color="var(--accent-orange)" />
          <span className="logo-text">75 CHALLENGE</span>
        </Link>

        <nav className="nav-actions" aria-label={t('nav.menu')}>
          <LanguageSwitch />
          <ThemeToggle />
          {authLinks(true)}
          {!loading && session && challenge && (
            <AccountMenu username={challenge.username} displayName={challenge.displayName} />
          )}
        </nav>

        <button
          type="button"
          id="nav-burger"
          className="icon-btn nav-burger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="nav-mobile-panel"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          title={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <nav id="nav-mobile-panel" className="nav-mobile-panel" aria-label={t('nav.menu')}>
          <div className="container nav-mobile-inner">
            <div className="nav-mobile-row">
              <LanguageSwitch />
              <ThemeToggle />
            </div>

            {!loading && session && challenge ? (
              <div className="nav-mobile-links">
                {accountActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className={`menu-item${action.danger ? ' is-danger' : ''}`}
                    onClick={action.run}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="nav-mobile-cta">{authLinks(false)}</div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
