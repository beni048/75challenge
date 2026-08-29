'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConsistencyHeatmap from '@/components/ConsistencyHeatmap';
import DailyChecklist from '@/components/DailyChecklist';
import DayLockedCard from '@/components/DayLockedCard';
import MilestoneCard from '@/components/MilestoneCard';
import ShieldModal from '@/components/ShieldModal';
import { getRequiredRulesForDate } from '@/lib/streak-engine';
import { calculateCurrentDay, getEffectiveLogDate } from '@/lib/date-utils';
import { Share2, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from '@/components/ChallengeProvider';
import { useToast } from '@/components/Toast';
import { fetchChallengeByUsername } from '@/lib/db/profile';
import { spendShield, restartChallenge } from '@/lib/db/profile';
import { saveDailyLog } from '@/lib/db/logs';
import { uploadProofPhoto } from '@/lib/db/photos';
import type { Challenge } from '@/lib/db/types';

export default function UserProfilePage() {
  const params = useParams();
  const routeUsername = (params?.username as string) || '';
  const { t } = useI18n();
  const toast = useToast();
  const { session, challenge: ownChallenge, loading, refresh } = useChallenge();

  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  const [missedDate, setMissedDate] = useState<string>(getEffectiveLogDate());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'story'>('dashboard');
  const [saving, setSaving] = useState(false);

  // Someone else's profile is fetched on demand; your own comes from context.
  const isOwnProfile = ownChallenge?.username === routeUsername;
  const [otherChallenge, setOtherChallenge] = useState<Challenge | null>(null);
  const [lookupDone, setLookupDone] = useState(false);

  useEffect(() => {
    if (loading || isOwnProfile || !session) return;

    let active = true;
    fetchChallengeByUsername(routeUsername).then((result) => {
      if (!active) return;
      setOtherChallenge(result.data ?? null);
      setLookupDone(true);
    });
    return () => {
      active = false;
    };
  }, [loading, isOwnProfile, session, routeUsername]);

  const challenge = isOwnProfile ? ownChallenge : otherChallenge;

  const today = getEffectiveLogDate();
  const todaysLog = useMemo(
    () => challenge?.logs.find((log) => log.log_date === today) ?? null,
    [challenge, today]
  );

  const handleSaveLog = useCallback(
    async (log: {
      status: 'completed';
      caption: string | null;
      photoBlob: Blob | null;
      ruleChecks: { ruleId: string; isCompleted: boolean }[];
    }) => {
      if (!challenge) return;
      setSaving(true);

      // Upload the photo first: a durable Storage URL is what gets persisted,
      // never the ephemeral blob: preview URL.
      let photoUrl: string | null = null;
      if (log.photoBlob) {
        const upload = await uploadProofPhoto(challenge.id, log.photoBlob);
        if (upload.error) {
          setSaving(false);
          toast.error(upload.error);
          return;
        }
        photoUrl = upload.data;
      }

      const result = await saveDailyLog({
        userId: challenge.id,
        logDate: today,
        status: 'completed',
        photoUrl,
        caption: log.caption,
        ruleChecks: log.ruleChecks,
      });

      setSaving(false);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      await refresh();
      toast.success(t('day.doneTitle'));
    },
    [challenge, today, refresh, toast, t]
  );

  const handleReportFailure = (dateToReport: string) => {
    setMissedDate(dateToReport);
    setIsShieldModalOpen(true);
  };

  const handleUseShield = async () => {
    if (!challenge) return;
    setIsShieldModalOpen(false);
    const result = await spendShield(challenge.id, missedDate);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    await refresh();
    toast.success(t('profile.shieldAlert'));
  };

  const handleHardReset = async () => {
    if (!challenge) return;
    setIsShieldModalOpen(false);
    const result = await restartChallenge(challenge.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    await refresh();
    toast.info(t('profile.resetAlert'));
  };

  if (loading) {
    return <div style={{ minHeight: '60vh' }} />;
  }

  // Profiles are for participants only (start.md §6).
  if (!session) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '520px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>{t('account.notLoggedIn')}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

  if (!challenge) {
    const stillLooking = !isOwnProfile && !lookupDone;
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '520px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
            {stillLooking ? t('common.loading') : t('profile.notFound')}
          </h2>
          {!stillLooking && ownChallenge && (
            <Link href={`/user/${ownChallenge.username}`} className="btn btn-secondary">
              {t('profile.ownChallenge')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const currentDay = calculateCurrentDay(challenge.startDate);
  const rules = challenge.rules.map((rule) => ({
    id: rule.id,
    title: rule.title,
    schedule_type: rule.schedule_type,
    custom_days: rule.custom_days,
  }));
  const rulesDueToday = getRequiredRulesForDate(rules, today);

  // A finished day is closed for editing — see DayLockedCard.
  const lockedReason =
    todaysLog?.status === 'completed'
      ? ('completed' as const)
      : todaysLog?.status === 'shielded'
        ? ('shielded' as const)
        : rulesDueToday.length === 0
          ? ('rest-day' as const)
          : null;

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
            {challenge.displayName.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.75rem' }}>{challenge.displayName}</h2>
              <span className="badge badge-fire">{t('profile.activeAttempt')}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('profile.meta', {
                username: challenge.username,
                start: challenge.startDate,
                end: challenge.targetEndDate,
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
              {challenge.shieldsRemaining}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.shieldsLeft')}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-green)' }}>
              {challenge.rules.length}
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
          <ConsistencyHeatmap
            startDate={challenge.startDate}
            logs={challenge.logs.map((log) => ({ log_date: log.log_date, status: log.status }))}
            currentDay={currentDay}
          />

          {/* Only the owner can check in, and only while the day is still open. */}
          {isOwnProfile &&
            (lockedReason ? (
              <DayLockedCard reason={lockedReason} logDate={today} />
            ) : (
              <DailyChecklist
                key={today}
                rules={rulesDueToday}
                logDate={today}
                saving={saving}
                onSaveLog={handleSaveLog}
                onReportFailure={handleReportFailure}
              />
            ))}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <MilestoneCard
            displayName={challenge.displayName}
            username={challenge.username}
            dayNumber={currentDay}
            completedRules={challenge.rules.map((r) => r.title)}
            shieldsRemaining={challenge.shieldsRemaining}
            streakDays={challenge.logs.filter((l) => l.status !== 'failed').length}
          />
        </div>
      )}

      <ShieldModal
        isOpen={isShieldModalOpen}
        missedDate={missedDate}
        shieldsRemaining={challenge.shieldsRemaining}
        onUseShield={handleUseShield}
        onHardReset={handleHardReset}
        onClose={() => setIsShieldModalOpen(false)}
      />
    </div>
  );
}
