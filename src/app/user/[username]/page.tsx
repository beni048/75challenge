'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConsistencyHeatmap from '@/components/ConsistencyHeatmap';
import DailyChecklist from '@/components/DailyChecklist';
import DayLockedCard from '@/components/DayLockedCard';
import MilestoneCard, { MAX_CARD_HABITS } from '@/components/MilestoneCard';
import HabitPicker from '@/components/HabitPicker';
import ShieldModal from '@/components/ShieldModal';
import Avatar from '@/components/Avatar';
import AvatarUpload from '@/components/AvatarUpload';
import StartCountdown from '@/components/StartCountdown';
import CatchUpList from '@/components/CatchUpList';
import FollowToggle from '@/components/FollowToggle';
import FeedCard from '@/components/FeedCard';
import { getRequiredRulesForDate } from '@/lib/streak-engine';
import { calculateCurrentDay, getEffectiveLogDate, hasStarted, formatLongDate } from '@/lib/date-utils';
import { getPendingDates } from '@/lib/pending-days';
import { hasShieldAvailable } from '@/lib/shield-policy';
import { useProfileView } from '@/lib/use-profile-view';
import { buildDayWindow, canStep, shiftDate } from '@/lib/day-window';
import { completionPercent } from '@/lib/day-progress';
import ProgressRing from '@/components/ProgressRing';
import DayWindow from '@/components/DayWindow';
import { Share2, ArrowRight, Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useChallenge } from '@/components/ChallengeProvider';
import { useToast } from '@/components/Toast';
import { fetchChallengeByUsername } from '@/lib/db/profile';
import { spendShield, restartChallenge } from '@/lib/db/profile';
import { saveDailyLog, catchUpDays } from '@/lib/db/logs';
import { uploadProofPhoto } from '@/lib/db/photos';
import { fetchUserFeedPosts, hypePost } from '@/lib/db/feed';
import { fetchHiddenUserIds, hideFromFeed, unhideFromFeed } from '@/lib/db/network';
import { applyOptimisticHype, type FeedPost } from '@/lib/feed';
import type { Challenge } from '@/lib/db/types';

export default function UserProfilePage() {
  const params = useParams();
  const routeUsername = (params?.username as string) || '';
  const { t, locale } = useI18n();
  const toast = useToast();
  const { session, challenge: ownChallenge, loading, refresh } = useChallenge();

  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  // Real value only matters once handleReportFailure sets it; the modal is
  // never open with this placeholder still in place.
  const [missedDate, setMissedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'story'>('dashboard');
  // null = not chosen yet. Reset whenever the rule set itself changes (an
  // edit could remove a habit that was selected), so a stale id never
  // silently disappears from the card.
  const [cardHabitIds, setCardHabitIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [catchingUp, setCatchingUp] = useState(false);
  // The day the check-in form is showing. Null until a challenge (and so a
  // timezone, and so a "today") exists; resolved below.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useProfileView();

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

  // Everyone follows everyone by default (start.md §5) — the only thing to
  // know about someone else's profile is whether the viewer has hidden them.
  const [isHidden, setIsHidden] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (isOwnProfile || !challenge || !session) return;
    let active = true;

    fetchHiddenUserIds(session.user.id).then((result) => {
      if (!active) return;
      if (result.data) setIsHidden(result.data.has(challenge.id));
    });

    return () => {
      active = false;
    };
  }, [isOwnProfile, challenge, session]);

  const handleToggleFollow = async () => {
    if (!challenge || !session) return;
    const wasHidden = isHidden;
    setIsHidden(!wasHidden); // optimistic
    setFollowBusy(true);

    const result = wasHidden
      ? await unhideFromFeed(session.user.id, challenge.id)
      : await hideFromFeed(session.user.id, challenge.id);

    setFollowBusy(false);
    if (result.error) {
      setIsHidden(wasHidden); // revert
      toast.error(result.error);
    }
  };

  // This participant's own check-in history — shown to every viewer, per the
  // profile restructure (start.md §6).
  const [userPosts, setUserPosts] = useState<FeedPost[]>([]);
  const [userPostsLoading, setUserPostsLoading] = useState(true);
  const [postsReloadToken, setPostsReloadToken] = useState(0);

  useEffect(() => {
    if (!challenge) return;
    let active = true;

    fetchUserFeedPosts(challenge.id, session?.user.id ?? null).then((result) => {
      if (!active) return;
      setUserPostsLoading(false);
      if (result.data) setUserPosts(result.data);
    });

    return () => {
      active = false;
    };
  }, [challenge, session?.user.id, postsReloadToken]);

  const handleReactToPost = async (postId: string, phraseId: string) => {
    if (!session || !ownChallenge) return;

    const viewer = { username: ownChallenge.username, displayName: ownChallenge.displayName };
    const before = userPosts;
    setUserPosts((prev) =>
      prev.map((p) => (p.id === postId ? applyOptimisticHype(p, phraseId, viewer) : p))
    );

    const result = await hypePost(postId, session.user.id, phraseId);
    if (result.error) {
      setUserPosts(before); // revert
      toast.error(result.error);
    }
  };

  const handleUnfollowFromPost = async (userId: string, undo: boolean) => {
    if (!session) return;
    const result = undo ? await unhideFromFeed(session.user.id, userId) : await hideFromFeed(session.user.id, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (undo) setPostsReloadToken((n) => n + 1);
  };

  // Always the profile OWNER's stored timezone, never the viewer's — "today"
  // is a property of whose challenge this is. `challenge` can still be null
  // here (before the loading/not-found guards below); nothing that reads
  // `today` renders until after those guards, so an empty placeholder is safe.
  const today = challenge ? getEffectiveLogDate(challenge.timezone) : '';
  const handleSaveLog = useCallback(
    async (log: {
      status: 'completed';
      logDate: string;
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
        logDate: log.logDate,
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
    [challenge, refresh, toast, t]
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
    return <div style={{ minHeight: '60dvh' }} />;
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

  // Card habit selection — derived, not reset via an effect: if an edit
  // removes a habit that was chosen, it just drops out of this list rather
  // than needing to be reconciled separately.
  const needsHabitPicker = challenge.rules.length > MAX_CARD_HABITS;
  const cardHabitTitles = needsHabitPicker
    ? challenge.rules.filter((r) => cardHabitIds?.includes(r.id)).map((r) => r.title)
    : challenge.rules.map((r) => r.title);
  // Derived from the chosen tier, never from the legacy shields_remaining
  // counter — see src/lib/shield-policy.ts. A Purist is never offered one.
  const shieldAvailable = hasShieldAvailable(
    challenge.commitmentLevel,
    challenge.lastShieldUsedAt,
    today
  );
  const rules = challenge.rules.map((rule) => ({
    id: rule.id,
    title: rule.title,
    schedule_type: rule.schedule_type,
    custom_days: rule.custom_days,
  }));
  // The whole check-in block below is a function of logDate, not of `today` —
  // that is what lets the 3-day picker move the form between days.
  const logDate = selectedDate ?? today;
  const rulesDueToday = getRequiredRulesForDate(rules, logDate);
  const selectedLog = challenge.logs.find((log) => log.log_date === logDate) ?? null;
  const isFutureDay = logDate > today;
  // The window can be scrolled to the day before day 1 or after day 75. Those
  // are not part of the challenge and must never render a check-in form.
  const challengeEndDate = challenge.targetEndDate;
  const isOutsideChallenge = logDate < challenge.startDate || logDate > challengeEndDate;
  const daySlots = buildDayWindow(logDate, challenge.startDate, today, challenge.logs);
  const percent = completionPercent(challenge.logs);
  const pendingDates = isOwnProfile ? getPendingDates(challenge.startDate, rules, challenge.logs, today) : [];

  // A finished day is closed for editing — see DayLockedCard.
  const lockedReason =
    selectedLog?.status === 'completed'
      ? ('completed' as const)
      : selectedLog?.status === 'shielded'
        ? ('shielded' as const)
        : rulesDueToday.length === 0
          ? ('rest-day' as const)
          : null;

  return (
    <div className="container page" style={{ maxWidth: '980px' }}>
      {/* Profile banner */}
      <div className="glass-card profile-banner">
        <div className="profile-identity">
          {/* Tapping your own picture replaces it — the most obvious place to
              look for that, and it beats hunting through Account settings. */}
          {isOwnProfile ? (
            <AvatarUpload className="profile-avatar">
              <Avatar url={challenge.avatarUrl} displayName={challenge.displayName} username={challenge.username} />
            </AvatarUpload>
          ) : (
            <div className="profile-avatar">
              <Avatar url={challenge.avatarUrl} displayName={challenge.displayName} username={challenge.username} />
            </div>
          )}

          <div className="profile-identity-text">
            <div className="profile-name-row">
              <h2 className="profile-name">{challenge.displayName}</h2>
              <span className="badge badge-fire">{t('profile.activeAttempt')}</span>
            </div>

            {/* Each fact is its own chip rather than one bullet-joined string,
                so a narrow screen wraps BETWEEN facts instead of splitting one
                mid-phrase — a "@name • Start: ... • Letzter Tag: ..." sentence
                has no good break point and was the actual cause of the
                cramped/overlapping mobile layout (start.md §12). Dates go
                through formatLongDate so German renders "30. August 2026"
                rather than the raw ISO string. */}
            <div className="profile-meta-row">
              <span className="profile-meta-item">@{challenge.username}</span>
              <span className="profile-meta-item">
                {t('profile.metaStart', { date: formatLongDate(challenge.startDate, locale) })}
              </span>
              <span className="profile-meta-item">
                {t('profile.metaEnd', { date: formatLongDate(challenge.targetEndDate, locale) })}
              </span>
              {challenge.location && <span className="profile-meta-item">{challenge.location}</span>}
              {challenge.timezone && <span className="profile-meta-item">{challenge.timezone}</span>}
            </div>
          </div>

          {!isOwnProfile && session && (
            <FollowToggle hidden={isHidden} onToggle={handleToggleFollow} busy={followBusy} />
          )}
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value" style={{ color: 'var(--accent-orange)' }}>
              {/* A future start date must never read as Day 1 — the full
                  countdown card below already gives the actual date; this
                  compact stat just needs to stop lying. */}
              {started ? currentDay : 0}
            </div>
            <div className="profile-stat-label">{t('profile.dayOf75')}</div>
          </div>

          <div className="profile-stat">
            <div className="profile-stat-value" style={{ color: 'var(--accent-cyan)' }}>
              {shieldAvailable ? 1 : 0}
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

      {/* Dashboard / Share-card — interactive, own profile only (start.md §6). */}
      {isOwnProfile && (
        <>
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
              {/* Two ways to look at the same 75 days: a focused ring plus
                  the day you are logging, or the whole grid. The choice is a
                  per-device display preference, so it lives in localStorage. */}
              <div className="segmented profile-view-toggle" role="group" aria-label={t('dayWindow.legend')}>
                <button type="button" onClick={() => setView('focus')} aria-pressed={view === 'focus'}>
                  {t('dayWindow.viewWindow')}
                </button>
                <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'}>
                  {t('dayWindow.viewGrid')}
                </button>
              </div>

              {view === 'focus' ? (
                <div className="profile-focus">
                  <ProgressRing percent={percent} label={t('progress.ringLabel')} />
                  {started && (
                    <DayWindow
                      slots={daySlots}
                      selectedDate={logDate}
                      onSelect={setSelectedDate}
                      onStep={(direction) => setSelectedDate(shiftDate(logDate, direction))}
                      canStepBack={canStep(logDate, challenge.startDate, -1)}
                      canStepForward={canStep(logDate, challenge.startDate, 1)}
                    />
                  )}
                </div>
              ) : (
                <ConsistencyHeatmap
                  startDate={challenge.startDate}
                  logs={challenge.logs.map((log) => ({ log_date: log.log_date, status: log.status }))}
                  currentDay={currentDay}
                  today={today}
                  selectedDate={logDate}
                  onSelectDate={setSelectedDate}
                />
              )}

              {/* A future start date shows a countdown instead of tasks that
                  cannot have happened yet. */}
              {!started ? (
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
                  {isOutsideChallenge ? (
                    <DayLockedCard reason="outside" logDate={logDate} />
                  ) : isFutureDay ? (
                    <DayLockedCard reason="future" logDate={logDate} scheduledRules={rulesDueToday.map((r) => r.title)} />
                  ) : lockedReason ? (
                    <DayLockedCard reason={lockedReason} logDate={logDate} />
                  ) : (
                    <DailyChecklist
                      key={logDate}
                      rules={rulesDueToday}
                      logDate={logDate}
                      saving={saving}
                      onSaveLog={handleSaveLog}
                      onReportFailure={handleReportFailure}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="story-wrap">
              {needsHabitPicker && !cardHabitIds ? (
                <HabitPicker
                  rules={challenge.rules.map((r) => ({ id: r.id, title: r.title }))}
                  max={MAX_CARD_HABITS}
                  onConfirm={setCardHabitIds}
                />
              ) : (
                <>
                  <MilestoneCard
                    displayName={challenge.displayName}
                    username={challenge.username}
                    dayNumber={currentDay}
                    habits={cardHabitTitles}
                    hasShield={shieldAvailable}
                    isPurist={challenge.commitmentLevel === 'purist'}
                    streakDays={challenge.logs.filter((l) => l.status !== 'failed').length}
                    hasStarted={started}
                    startDate={challenge.startDate}
                  />
                  {needsHabitPicker && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: '1rem' }}
                      onClick={() => setCardHabitIds(null)}
                    >
                      {t('storyPicker.change')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Habits — visitor-only: the owner already knows what they're training
          for, so this list is just noise on their own profile. Visible to
          everyone else via get_visible_rules (already what challenge.rules
          holds in that case, see fetchChallengeByUsername). */}
      {!isOwnProfile && (
        <div className="section">
          <h3 className="h-section" style={{ marginBottom: '0.75rem' }}>
            {t('profile.rulesTitle')}
          </h3>
          <div className="stack stack-tight">
            {challenge.rules.map((rule) => (
              <div key={rule.id} className="glass-card profile-rule-row">
                {rule.is_secret && <Lock size={14} color="var(--accent-orange)" />}
                <span>{rule.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* This participant's own check-in history. */}
      <div className="section">
        <h3 className="h-section" style={{ marginBottom: '0.75rem' }}>
          {t('profile.postsTitle')}
        </h3>
        {userPostsLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('common.loading')}</p>
        ) : userPosts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('profile.noPosts')}</p>
        ) : (
          <div className="stack">
            {userPosts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                isOwnPost={post.user_id === session?.user.id}
                onUnfollow={handleUnfollowFromPost}
                onReact={handleReactToPost}
              />
            ))}
          </div>
        )}
      </div>

      <ShieldModal
        isOpen={isShieldModalOpen}
        missedDate={missedDate}
        shieldsRemaining={shieldAvailable ? 1 : 0}
        onUseShield={handleUseShield}
        onHardReset={handleHardReset}
        onClose={() => setIsShieldModalOpen(false)}
      />
    </div>
  );
}
