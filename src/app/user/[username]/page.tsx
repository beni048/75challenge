'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConsistencyHeatmap from '@/components/ConsistencyHeatmap';
import DailyChecklist from '@/components/DailyChecklist';
import MilestoneCard from '@/components/MilestoneCard';
import ShieldModal from '@/components/ShieldModal';
import { DailyLog } from '@/lib/streak-engine';
import { calculateCurrentDay, getEffectiveLogDate } from '@/lib/date-utils';
import { Share2, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/components/useSession';
import { applyShield, resetToDayOne, upsertLog } from '@/lib/session';

export default function UserProfilePage() {
  const params = useParams();
  const routeUsername = (params?.username as string) || '';
  const { t } = useI18n();
  const { session, ready, saveSession } = useSession();

  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  const [missedDate, setMissedDate] = useState<string>(getEffectiveLogDate());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'story'>('dashboard');

  if (!ready) return <div style={{ minHeight: '60vh' }} />;

  // Only the signed-in participant's own challenge is stored on this device.
  if (!session || (routeUsername && session.username !== routeUsername)) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '520px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>{t('account.notLoggedIn')}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <Link href="/login" className="btn btn-secondary">
              {t('nav.login')}
            </Link>
            <Link href="/join" className="btn btn-primary">
              {t('nav.join')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // The day counter is always derived from the start date, never stored, so a
  // fresh account is on Day 1 with an empty grid.
  const currentDay = calculateCurrentDay(session.start_date);
  const today = getEffectiveLogDate();
  const todaysLog = session.logs.find((log) => log.log_date === today);

  const handleSaveLog = (newLog: DailyLog) => {
    saveSession(upsertLog(session, newLog));
    alert(t('profile.loggedAlert', { date: newLog.log_date, status: newLog.status }));
  };

  const handleReportFailure = (dateToReport: string) => {
    setMissedDate(dateToReport);
    setIsShieldModalOpen(true);
  };

  const handleUseShield = () => {
    saveSession(applyShield(session, missedDate));
    setIsShieldModalOpen(false);
    alert(t('profile.shieldAlert'));
  };

  const handleHardReset = () => {
    saveSession(resetToDayOne(session));
    setIsShieldModalOpen(false);
    alert(t('profile.resetAlert'));
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '980px' }}>
      {/* Profile banner */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: 'var(--gradient-dark)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              flexShrink: 0,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-fire)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 900,
              color: 'var(--text-on-accent)',
              boxShadow: 'var(--glow-orange)',
            }}
          >
            {session.display_name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.75rem' }}>{session.display_name}</h2>
              <span className="badge badge-fire">{t('profile.activeAttempt')}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('profile.meta', {
                username: session.username,
                start: session.start_date,
                end: session.target_end_date,
              })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-orange)' }}>{currentDay}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.dayOf75')}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
              {session.shields_remaining}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.shieldsLeft')}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-green)' }}>
              {session.rules.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.activeRules')}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
        >
          {t('profile.tabDashboard')}
        </button>

        <button
          onClick={() => setActiveTab('story')}
          className={`btn ${activeTab === 'story' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Share2 size={16} /> {t('profile.tabStory')}
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ConsistencyHeatmap startDate={session.start_date} logs={session.logs} currentDay={currentDay} />

          <DailyChecklist
            key={today}
            rules={session.rules}
            logDate={today}
            existingLog={todaysLog}
            onSaveLog={handleSaveLog}
            onReportFailure={handleReportFailure}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <MilestoneCard
            displayName={session.display_name}
            username={session.username}
            dayNumber={currentDay}
            completedRules={session.rules.map((r) => r.title)}
            shieldsRemaining={session.shields_remaining}
            streakDays={session.logs.filter((l) => l.status !== 'failed').length}
          />
        </div>
      )}

      <ShieldModal
        isOpen={isShieldModalOpen}
        missedDate={missedDate}
        shieldsRemaining={session.shields_remaining}
        onUseShield={handleUseShield}
        onHardReset={handleHardReset}
        onClose={() => setIsShieldModalOpen(false)}
      />
    </div>
  );
}
