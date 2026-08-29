'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ConsistencyHeatmap from '@/components/ConsistencyHeatmap';
import DailyChecklist from '@/components/DailyChecklist';
import MilestoneCard from '@/components/MilestoneCard';
import ShieldModal from '@/components/ShieldModal';
import { Rule, DailyLog, UserChallengeProfile } from '@/lib/streak-engine';
import { DEFAULT_75_HARD_RULES } from '@/components/RuleCustomizer';
import { getEffectiveLogDate } from '@/lib/date-utils';
import { Flame, Shield, Calendar, Award, Share2 } from 'lucide-react';

export default function UserProfilePage() {
  const params = useParams();
  const username = (params?.username as string) || 'warrior';

  const currentYear = new Date().getFullYear();
  const [profile, setProfile] = useState<UserChallengeProfile>({
    id: 'user-1',
    username: username,
    display_name: username.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    start_date: `${currentYear}-09-01`,
    target_end_date: `${currentYear}-11-14`,
    current_day: 14,
    shields_remaining: 1,
    status: 'active',
  });

  const [rules, setRules] = useState<Rule[]>(DEFAULT_75_HARD_RULES);
  const [logs, setLogs] = useState<DailyLog[]>([
    { log_date: '2026-09-01', status: 'completed' },
    { log_date: '2026-09-02', status: 'completed' },
    { log_date: '2026-09-03', status: 'completed' },
    { log_date: '2026-09-04', status: 'completed' },
    { log_date: '2026-09-05', status: 'completed' },
  ]);

  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  const [missedDate, setMissedDate] = useState<string>(getEffectiveLogDate());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'story'>('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('75_user_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfile((prev) => ({
            ...prev,
            ...parsed,
          }));
          if (parsed.rules) setRules(parsed.rules);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleSaveLog = (newLog: DailyLog) => {
    setLogs((prev) => {
      const filtered = prev.filter((l) => l.log_date !== newLog.log_date);
      return [...filtered, newLog];
    });
    alert(`Day ${newLog.log_date} locked in as ${newLog.status.toUpperCase()}!`);
  };

  const handleReportFailure = (dateToReport: string) => {
    setMissedDate(dateToReport);
    setIsShieldModalOpen(true);
  };

  const handleUseShield = () => {
    setProfile((prev) => ({ ...prev, shields_remaining: 0 }));
    setLogs((prev) => {
      const filtered = prev.filter((l) => l.log_date !== missedDate);
      return [...filtered, { log_date: missedDate, status: 'shielded' }];
    });
    setIsShieldModalOpen(false);
    alert('Streak Shield deployed! Day recorded as shielded.');
  };

  const handleHardReset = () => {
    setProfile((prev) => ({
      ...prev,
      current_day: 1,
      shields_remaining: 1,
      start_date: getEffectiveLogDate(),
    }));
    setLogs([]);
    setIsShieldModalOpen(false);
    alert('Hard Reset to Day 1 confirmed. You have 1 fresh Streak Shield.');
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '980px' }}>
      {/* Profile Banner */}
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
          background: 'linear-gradient(135deg, rgba(23,27,38,0.9) 0%, rgba(17,20,28,0.95) 100%)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-fire)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#fff',
              boxShadow: 'var(--glow-orange)',
            }}
          >
            {profile.display_name.charAt(0)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.75rem' }}>{profile.display_name}</h2>
              <span className="badge badge-fire">Active Attempt</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              @{profile.username} • Started: {profile.start_date} • Target Finish: {profile.target_end_date}
            </p>
          </div>
        </div>

        {/* Challenge Stats */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-orange)' }}>
              {profile.current_day}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Day of 75</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
              {profile.shields_remaining}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shields Left</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-green)' }}>
              {rules.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Rules</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Daily Matrix & 75-Day Grid
        </button>

        <button
          onClick={() => setActiveTab('story')}
          className={`btn ${activeTab === 'story' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Share2 size={16} /> 9:16 Instagram Story Exporter
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Consistency Heatmap */}
          <ConsistencyHeatmap
            startDate={profile.start_date}
            logs={logs}
            currentDay={profile.current_day}
          />

          {/* Daily Logging Matrix */}
          <DailyChecklist
            rules={rules}
            onSaveLog={handleSaveLog}
            onReportFailure={handleReportFailure}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <MilestoneCard
            displayName={profile.display_name}
            username={profile.username}
            dayNumber={profile.current_day}
            completedRules={rules.map((r) => r.title)}
            shieldsRemaining={profile.shields_remaining}
            streakDays={profile.current_day}
          />
        </div>
      )}

      {/* Shield Decision Modal */}
      <ShieldModal
        isOpen={isShieldModalOpen}
        missedDate={missedDate}
        shieldsRemaining={profile.shields_remaining}
        onUseShield={handleUseShield}
        onHardReset={handleHardReset}
        onClose={() => setIsShieldModalOpen(false)}
      />
    </div>
  );
}
