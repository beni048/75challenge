'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConsistencyHeatmap from '@/components/ConsistencyHeatmap';
import DailyChecklist from '@/components/DailyChecklist';
import DayLockedCard from '@/components/DayLockedCard';
import MilestoneCard from '@/components/MilestoneCard';
import ShieldModal from '@/components/ShieldModal';
import Avatar from '@/components/Avatar';
import StartCountdown from '@/components/StartCountdown';
import CatchUpList from '@/components/CatchUpList';
import { getRequiredRulesForDate } from '@/lib/streak-engine';
import { calculateCurrentDay, getEffectiveLogDate, hasStarted } from '@/lib/date-utils';
import { getPendingDates } from '@/lib/pending-days';
import { Share2, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from '@/components/ChallengeProvider';
import { useToast } from '@/components/Toast';
import { fetchChallengeByUsername } from '@/lib/db/profile';
import { spendShield, restartChallenge } from '@/lib/db/profile';
import { saveDailyLog, catchUpDays } from '@/lib/db/logs';
import { uploadProofPhoto } from '@/lib/db/photos';
import type { Challenge } from '@/lib/db/types';

export default function UserProfilePage() {
  const params = useParams();
  const routeUsername = (params?.username as string) || '';
  const { t } = useI18n();
  const toast = useToast();
  const { session, challenge: ownChallenge, loading, refresh } = useChallenge();

  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  // Real value only matters once handleReportFailure sets it; the modal is
  // never open with this placeholder still in place.
  const [missedDate, setMissedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'story'>('dashboard');
  const [saving, setSaving] = useState(false);
  const [catchingUp, setCatchingUp] = useState(false);

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

  // Always the profile OWNER's stored timezone, never the viewer's — "today"
  // is a property of whose challenge this is. `challenge` can still be null
  // here (before the loading/not-found guards below); nothing that reads
  // `today` renders until after those guards, so an empty placeholder is safe.
  const today = challenge ? getEffectiveLogDate(challenge.timezone) : '';
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

  const handleHardReset = async (announceToFeed: boolean) => {
    if (!challenge) return;
    setIsShieldModalOpen(false);
    const result = await restartChallenge(challenge.id, challenge.timezone, announceToFeed);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    await refresh();
    toast.info(t('profile.resetAlert'));
  };

  const handleCatchUp = async (dates: string[]) => {
    if (!challenge || dates.length === 0) return;
    setCatchingUp(true);
    const result = await catchUpDays(challenge.id, dates, challenge.rules);
    setCatchingUp(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    await refresh();
    toast.success(t('day.doneTitle'));
  };

  if (loading) {
    return <div style={{ minHeight: '60vh' }} />;
  }

  // Profiles are for participants only (start.md §6).
  if (!session) {
    return (
      <div className="container page" style={{ maxWidth: '520px' }}>
        <div className="glass-card state-card">
          <h2 className="h-page">{t('account.notLoggedIn')}</h2>
          <div className="state-actions">
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
      <div className="container page" style={{ maxWidth: '520px' }}>
        <div className="glass-card state-card">
          <h2 className="h-page" style={{ marginBottom: '1rem' }}>
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

  const currentDay = calculateCurrentDay(challenge.startDate, today);
  const started = hasStarted(challenge.startDate, today);
  const rules = challenge.rules.map((rule) => ({
    id: rule.id,
    title: rule.title,
    schedule_type: rule.schedule_type,
    custom_days: rule.custom_days,
  }));
  const rulesDueToday = getRequiredRulesForDate(rules, today);
  const pendingDates = isOwnProfile ? getPendingDates(challenge.startDate, rules, challenge.logs, today) : [];

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
    <div className="container page" style={{ maxWidth: '980px' }}>
      {/* Profile banner */}
      <div className="glass-card profile-banner">
        <div className="profile-identity">
          <div className="profile-avatar">
            <Avatar url={challenge.avatarUrl} displayName={challenge.displayName} username={challenge.username} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div className="profile-name-row">
              <h2 className="profile-name">{challenge.displayName}</h2>
              <span className="badge badge-fire">{t('profile.activeAttempt')}</span>
            </div>
            <p className="profile-meta">
              {t('profile.meta', {
                username: challenge.username,
                start: challenge.startDate,
                end: challenge.targetEndDate,
              })}
            </p>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value" style={{ color: 'var(--accent-orange)' }}>
              {currentDay}
            </div>
            <div className="profile-stat-label">{t('profile.dayOf75')}</div>
          </div>

          <div className="profile-stat">
            <div className="profile-stat-value" style={{ color: 'var(--accent-cyan)' }}>
              {challenge.shieldsRemaining}
            </div>
            <div className="profile-stat-label">{t('profile.shieldsLeft')}</div>
          </div>

          <div className="profile-stat">
            <div className="profile-stat-value" style={{ color: 'var(--accent-green)' }}>
              {challenge.rules.length}
            </div>
            <div className="profile-stat-label">{t('profile.activeRules')}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
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
        <div className="stack stack-loose">
          <ConsistencyHeatmap
            startDate={challenge.startDate}
            logs={challenge.logs.map((log) => ({ log_date: log.log_date, status: log.status }))}
            currentDay={currentDay}
            today={today}
          />

          {/* Only the owner can check in. A future start date shows a
              countdown instead of tasks that cannot have happened yet. */}
          {isOwnProfile &&
            (!started ? (
              <StartCountdown startDate={challenge.startDate} today={today} />
            ) : (
              <>
                {pendingDates.length > 0 && (
                  <CatchUpList
                    key={pendingDates.join(',')}
                    pendingDates={pendingDates}
                    busy={catchingUp}
                    onCatchUp={handleCatchUp}
                    onReportMissed={handleReportFailure}
                  />
                )}
                {lockedReason ? (
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
                )}
              </>
            ))}
        </div>
      ) : (
        <div className="story-wrap">
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
