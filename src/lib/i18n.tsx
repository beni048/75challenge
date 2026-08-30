'use client';

/**
 * Lightweight client-side i18n for the 75 Challenge app.
 *
 * The locale lives in localStorage under `75_locale` and is mirrored onto
 * <html lang="..."> so the document language stays correct for screen readers
 * and browser translation prompts. A blocking script in the root layout applies
 * the stored value before first paint, so this provider never causes a flash.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';

export type Locale = 'en' | 'de';

export const LOCALE_STORAGE_KEY = '75_locale';
const LOCALE_EVENT = '75:locale';
export const LOCALES: Locale[] = ['en', 'de'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  de: 'DE',
};

const en = {
  // Navigation & chrome
  'nav.feed': 'Community Feed',
  'nav.join': 'Join 75 Challenge',
  'nav.login': 'Log In',
  'nav.account': 'Account',
  'nav.openAccount': 'Open account menu',
  'nav.myChallenge': 'My Challenge',
  'nav.challengers': 'Challengers',
  'nav.editRules': 'Edit Rules',
  'nav.security': 'Password & Security',
  'nav.logout': 'Log Out',
  'nav.toggleTheme': 'Switch colour theme',
  'nav.toggleThemeToDark': 'Switch to dark mode',
  'nav.toggleThemeToLight': 'Switch to light mode',
  'nav.language': 'Language',
  'nav.languageEn': 'Switch to English',
  'nav.languageDe': 'Auf Deutsch umschalten',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.menu': 'Menu',
  'nav.scrollTop': 'Back to top',

  // Timezone confirm banner
  'timezone.confirmPrompt':
    "We set your timezone to UTC by default — your device suggests {timezone}. Is that right?",
  'timezone.confirmUpdate': 'Update',

  'meta.title': '75 Challenge — Challenge Yourself',
  'meta.description':
    'Build habits that stick in 75 days. Choose your own, go at your own pace, and finish together with the community by 31 December 2026.',

  'footer.copyright': '© {year}',
  'footer.brand': '75 Challenge. For everyone getting back on track, together.',
  'footer.tagline': 'Your habits, your pace.',

  // Landing hero
  'hero.badge': "Let's get on Track",
  'hero.titleLead': 'Challenge Yourself —',
  'hero.titleAccent': 'Together',
  'hero.subtitle':
    "Summer is over and you want to start some healthy routines, or get back into them? The 75 Challenge is your perfect opportunity to build habits that last. Let's do this together.",
  'hero.cta': 'Join 75 Challenge',
  'hero.goal': 'Our shared goal: finish the 75 days by {deadline}.',

  'pillars.rules.title': 'Habits you choose',
  'pillars.rules.desc':
    'Nobody hands you a list. Pick the habits that matter to you and the rhythm that fits your week — every day, workdays only, or specific days.',
  'pillars.shield.title': 'Room for a bad day',
  'pillars.shield.desc':
    'Life happens. You choose up front how much slack you want — from none at all to a shield that comes back.',
  'pillars.hype.title': 'Support, not judgement',
  'pillars.hype.desc':
    'No comments to police, no downvotes, no leaderboards. Just people cheering each other on, one day at a time.',

  'howItWorks.eyebrow': 'The basics',
  'howItWorks.title': 'How it works',
  'howItWorks.lede':
    'Four things worth knowing before you start. None of them involve anyone else grading you.',

  'trust.title': 'You are your own judge',
  'trust.body':
    'You tick off your own days, and you decide whether you are happy with how one went. Nobody is checking up on you. If you decide you missed a day, you tell us — what happens next is the commitment level you chose. No shame in that.',

  // Join page
  'join.badgeReferral': 'Invited by @{username}',
  'join.badgeDefault': 'LET’S GET STARTED',
  'join.titleReferral': 'Join @{username} for the 75 Challenge',
  'join.titleDefault': 'Ready when you are',
  'join.subtitle':
    'Choose your own habits, go at your own pace, and finish alongside everyone else who decided today was the day.',
  'join.perkRules': 'Habits you choose',
  'join.perkShield': 'Room for a bad day',
  'join.perkHype': 'Support, not judgement',
  'join.ctaReferral': 'Join with @{username}',
  'join.ctaDefault': 'Join 75 Challenge',

  // Onboarding modal — four steps: learn, date, habits, account
  'onboarding.title': 'Join the 75 Challenge',
  'onboarding.close': 'Close',
  'onboarding.referral': 'Joining with @{username}',
  'onboarding.back': 'Back',
  'onboarding.stepOf': 'Step {current} of {total}',

  'onboarding.stepLearn': 'How it works',
  'onboarding.stepDate': 'Start date',
  'onboarding.stepRules': 'Your habits',
  'onboarding.stepAuth': 'Account',

  // Step 1 — education
  'onboarding.learnTitle': 'Here is how it works',
  'onboarding.learnIntro':
    'Five things to know before you start. It takes a minute to read, and it is the whole game.',
  'onboarding.learnHabits': 'Choose at least {min} habits',
  'onboarding.learnHabitsDesc':
    'You decide what you are working on — up to {max}. Make them specific enough that you know at the end of the day whether you did them.',
  'onboarding.learnChange': 'You can change them once, after 7 days',
  'onboarding.learnChangeDesc':
    'The first week tells you a lot. After day 7 you get one chance to adjust your habits if you aimed too high or too low.',
  'onboarding.learnShield': 'You choose how strict it is',
  'onboarding.learnShieldDesc':
    'Before you start you pick a commitment level, which decides how a missed day is handled.',
  'onboarding.learnJudge': 'You are the judge',
  'onboarding.learnJudgeDesc':
    'Nobody checks up on you. At the end of each day you decide whether you are happy with how it went.',
  'onboarding.learnReset': 'Miss a day with no shield left, and you restart',
  'onboarding.learnResetDesc':
    'Back to Day 1. It is not a punishment — it is what makes finishing mean something.',
  'onboarding.learnCta': "Let's go",

  // Step 2 — start date
  'onboarding.dateTitle': 'When do you want to start?',
  'onboarding.dateIntro':
    'Today is fine. So is next Monday. Pick the day you can genuinely begin.',
  'onboarding.startDateLabel': 'Your start date',
  'onboarding.finish': 'You would finish on {date}',
  'onboarding.timezoneLabel': 'Your timezone',
  'onboarding.timezoneHint': 'This decides when your day resets — always your own local time, never anyone else\'s.',
  'onboarding.locationLabel': 'Location (optional)',
  'onboarding.locationPlaceholder': 'City, country',
  'onboarding.dateCta': 'Continue to habits',

  // Step 3 — habits
  'onboarding.rulesTitle': 'What are you working on?',
  'onboarding.rulesCta': 'Continue to account',

  // Step 4 — account
  'onboarding.summary': '{start} → {end}',
  'onboarding.submit': 'Start my 75 days',
  'onboarding.minRulesAlert': 'Please choose at least {min} habits.',
  'onboarding.maxRulesAlert': 'You can have at most {max} habits.',
  'onboarding.signupFailed': 'Sign-up did not go through. Please try again.',
  'onboarding.resumeTitle': "You're already signed in",
  'onboarding.resumeBody':
    'That account exists, but this challenge was never finished. One more thing and you are on Day 1.',
  'onboarding.resumeFailed': 'Could not finish setting up your challenge. Please try again.',

  // Date notices
  'dates.invalid': 'Please choose a valid start date.',
  'dates.crossesYearEnd':
    'Heads up: starting here you would finish on {date}, past our shared goal of {deadline}. You are very welcome to join anyway — this is your challenge.',

  // Rule customizer
  'rules.heading': 'Your habits',
  'rules.subheading':
    'Between {min} and {max}. Edit any of these, delete what does not fit, and add your own.',
  'rules.recommendation':
    'A good set stretches you in more than one direction — something physical, something about how you eat, and something you learn. Pick habits you will have to work for.',
  'rules.countOne': '{count} habit',
  'rules.countMany': '{count} habits',
  'rules.minWarning': 'Choose at least {min} habits to start your challenge.',
  'rules.maxWarning': 'That is the maximum of {max} habits.',
  'rules.titleLabel': 'Habit {index}',
  'rules.titlePlaceholder': 'Describe the habit...',
  'rules.remove': 'Remove habit',
  'rules.removeNamed': 'Remove habit {title}',
  'rules.secretOn': 'Secret habit — tap to make visible',
  'rules.secretOff': 'Visible habit — tap to make secret',
  'rules.secretExplain': 'Tap the lock on any habit to keep it private.',
  'rules.secretInfoLabel': 'About secret habits',
  'rules.secretInfoText':
    "Secret habits still count toward your streak. Depending on your privacy setting (Account → Profile), others either see \"Secret Rule\" as a placeholder or won't see it listed at all.",
  'rules.scheduleDaily': 'Every day',
  'rules.scheduleWorkdays': 'Mon-Fri',
  'rules.scheduleCustom': 'Chosen days',
  'rules.addPlaceholder': 'Add another habit...',
  'rules.add': 'Add habit',
  'rules.default.workouts': '2x 45-min workouts (1 outdoors)',
  'rules.default.water': 'Drink 4 Liters of Water',
  'rules.default.read': 'Read 10 Pages (Non-fiction / Growth)',
  'rules.default.diet': 'Follow Clean Diet (No Cheat Meals)',
  'rules.default.alcohol': 'Zero Alcohol',

  // Auth form
  'auth.nameLabel': 'Display Name (Real Name or Pseudonym)',
  'auth.namePlaceholder': 'e.g. IronSpartan or Sarah Connor',
  'auth.nameRequired': 'Display name is required.',
  'auth.usernameLabel': 'Username',
  'auth.usernamePlaceholder': 'ironspartan',
  'auth.usernamePreview': 'Your profile: /user/{username}',
  'auth.avatarLabel': 'Profile Picture (optional)',
  'auth.avatarUpload': 'Add a photo',
  'auth.avatarChange': 'Change photo',
  'auth.emailLabel': 'Email Address',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.emailInvalid': 'A valid email address is required.',
  'auth.passwordLabel': 'Password (min. {min} characters)',
  'auth.passwordHint': 'Simple & Lenient',
  'auth.passwordShort': 'Password must be at least {min} characters long.',
  'auth.failed': 'Authentication failed. Please try again.',
  'auth.submitting': 'Committing Challenge...',
  'auth.submitDefault': 'Join the 75 Challenge',

  // Auth failures. Supabase returns English-only strings, so its error codes are
  // mapped to these keys instead of being shown raw (see src/lib/auth.ts).
  'auth.err.weakPassword': 'That password is too short — use at least {min} characters.',
  'auth.err.emailExists': 'An account with this email already exists. Try logging in instead.',
  'auth.err.emailNotConfirmed':
    'Please confirm your email address first — check your inbox for the link we sent.',
  'auth.err.invalidCredentials': 'That email and password do not match an account.',
  'auth.err.invalidEmail': 'That email address does not look right.',
  'auth.err.rateLimited': 'Too many attempts. Please wait a minute and try again.',
  'auth.err.signupDisabled': 'New sign-ups are currently closed.',
  'auth.err.notConfigured':
    'The account service is not configured for this environment. Please contact support.',
  'auth.err.network': 'Could not reach the account service. Check your connection and try again.',

  // Daily checklist
  'checklist.title': 'Today',
  'checklist.loggingFor': '{date}',
  'checklist.progress': '{done} of {total} done',
  'checklist.photoLabel': 'Add a photo, if you want to',
  'checklist.photoChange': 'Change photo',
  'checklist.photoUpload': 'Add a photo',
  'checklist.compressing': 'Preparing your photo...',
  'checklist.compressionStats': 'Optimized: {before} KB → {after} KB (WebP)',
  'checklist.compressionFailed': 'Could not compress photo.',
  'checklist.captionLabel': 'Anything you want to remember about today?',
  'checklist.captionPlaceholder': 'How did it go? Optional, and only you decide what to share...',
  'checklist.submitComplete': 'I did it today',
  'checklist.submitPartial': 'Save today',
  'checklist.reportMissed': 'I missed this one',
  'checklist.confirmIncomplete':
    'You still have unchecked rules. Do you want to report this day as missed?',
  'checklist.photoAlt': 'Your photo for today',

  // Day window (3-day picker on your own profile)
  'dayWindow.legend': 'Choose a day',
  'dayWindow.previous': 'Previous day',
  'dayWindow.next': 'Next day',
  'dayWindow.dayOf': 'Day {day} of 75',
  'dayWindow.outsideChallenge': 'Outside your challenge',
  'dayWindow.viewGrid': 'All 75 days',
  'dayWindow.viewWindow': 'Focus',
  'weekday.sun': 'Sun',
  'weekday.mon': 'Mon',
  'weekday.tue': 'Tue',
  'weekday.wed': 'Wed',
  'weekday.thu': 'Thu',
  'weekday.fri': 'Fri',
  'weekday.sat': 'Sat',
  'progress.ringLabel': 'Challenge complete',

  // Commitment tiers (shield difficulty, chosen at signup)
  'commitment.legend': 'Commitment level',
  'commitment.stepTitle': 'How strict do you want this to be?',
  'commitment.stepIntro':
    'This decides what happens on a day that does not go to plan. You are the only person this answers to — pick the one you will actually keep.',
  'commitment.stepCta': 'Continue to account',
  'commitment.locked': 'Your commitment level is set for this attempt. It resets if you start over.',
  'commitment.announce':
    'New: you can now choose how strict your challenge is. You are on Classic — the same single shield you have always had.',
  'commitment.announceCta': 'Take a look',
  'commitment.purist.name': 'Purist',
  'commitment.purist.rule': 'No shields',
  'commitment.purist.desc':
    'The original 75 Hard. Miss a day and you go back to Day 1, no exceptions.',
  'commitment.classic.name': 'Classic',
  'commitment.classic.rule': 'One shield',
  'commitment.classic.desc':
    'One missed day is covered across the whole 75. After that, a miss starts you over.',
  'commitment.flex.name': 'Flex',
  'commitment.flex.rule': 'Shield recharges',
  'commitment.flex.desc':
    'Start with one shield. Once you use it, another arrives {days} days later — so life can happen more than once.',
  'commitment.shieldReturns': 'Your shield comes back in {days} days.',

  // Shield modal
  'shield.title': 'You reported a missed day',
  'shield.subtitle': 'You told us {date} did not go to plan. Your call — here is what happens next.',
  'shield.optionShieldTitle': 'Use your Streak Shield (1 available)',
  'shield.optionShieldDesc':
    'Protects your streak and marks {date} as shielded. You will have 0 shields left — the next missed day resets you to Day 1.',
  'shield.optionShieldCta': 'Use Streak Shield & Continue',
  'shield.noShields':
    'No Streak Shields left: you already used your one shield on this 75-day attempt.',
  'shield.optionResetTitle': 'Start over from Day 1',
  'shield.optionResetDesc':
    'Warning: this wipes your current streak and starts a brand new attempt from Day 1, with 1 fresh Streak Shield.',
  'shield.optionResetCta': 'Reset me to Day 1',
  'shield.announceToFeed': 'Share this on the community feed',
  'shield.keepGoing': 'Never mind, keep my streak',
  'shield.close': 'Close',

  // Countdown to a future start date
  'countdown.dayOne': '1 day until your challenge starts',
  'countdown.days': '{count} days until your challenge starts',
  'countdown.startsOn': 'You start on {date}.',
  'countdown.browseFeed': 'Browse the community feed',

  // Catch-up on unlogged past days
  'catchup.explainOne': 'You have one day without a check-in. No shame in that — catch up now, or tell us it did not happen.',
  'catchup.explainMany':
    'You have {count} days without a check-in. No shame in that — catch up now, or tell us it did not happen.',
  'catchup.reportMissed': 'Report as missed',
  'catchup.submitOne': 'Catch up on 1 day',
  'catchup.submitMany': 'Catch up on {count} days',

  // Heatmap
  'heatmap.title': 'Your 75 days',
  'heatmap.subtitle': 'One square per day. Watch it fill up.',
  'heatmap.legendDone': 'Done',
  'heatmap.legendShielded': 'Shielded',
  'heatmap.legendMissed': 'Missed',
  'heatmap.legendUpcoming': 'Upcoming',
  'heatmap.tooltip': 'Day {day} ({date}): {status}',
  'heatmap.statusUpcoming': 'Upcoming',
  'heatmap.statusPending': 'Pending',
  'heatmap.statusCompleted': 'Completed',
  'heatmap.statusShielded': 'Shielded',
  'heatmap.statusFailed': 'Missed',

  // User profile
  'profile.activeAttempt': 'In progress',
  'profile.meta': '@{username} • Started: {start} • Target Finish: {end}',
  'profile.dayOf75': 'Day of 75',
  'profile.shieldsLeft': 'Shields Left',
  'profile.activeRules': 'Active Rules',
  'profile.tabDashboard': 'My days',
  'profile.tabStory': 'Share a card',
  'profile.loggedAlert': 'Day {date} locked in as {status}!',
  'profile.shieldAlert': 'Streak Shield deployed! Day recorded as shielded.',
  'profile.resetAlert': 'Reset to Day 1 confirmed. You have 1 fresh Streak Shield.',

  // Feed
  'feed.statsTitle': 'Challenge Community',
  'feed.activeToday': 'Active Today',
  'feed.totalUsers': 'Total Challengers',
  'feed.liveTitle': 'Live Community Feed',
  'feed.dayOf75': 'Day {day} of 75',
  'feed.statusCompleted': 'Day Completed',
  'feed.statusShielded': 'Shield Used',
  'feed.hidden': 'Posts from @{username} are hidden.',
  'feed.undoUnfollow': 'Undo Unfollow',
  'feed.unfollow': 'Unfollow user from feed',
  'feed.unfollowNamed': 'Unfollow {username}',
  'feed.previewPost': 'Preview Post',
  'feed.photoAlt': 'Daily check-in photo',

  'milestone.exportFailed': 'Could not download the image — try taking a screenshot instead.',

  'hype.beFirst': 'Be the first to hype this',
  'hype.agree': 'Agree',
  'hype.alreadyHyped': 'You hyped this',
  'hype.reroll': 'Another one',
  'hype.send': 'Send it',
  'hype.says': '{name} says:',
  'hype.you': 'You',
  'hype.agreedOne': '{name} agrees',
  'hype.agreedMany': '{name} and {count} others agree',

  // Help & feedback
  'help.trigger': 'Help & Feedback',
  'help.intro':
    'Have questions, found an issue, or want to suggest a new feature? Reach out directly to the team.',
  'help.supportTitle': 'Contact Support',
  'help.supportDesc': 'Get help with account or app issues',
  'help.featureTitle': 'Propose a Feature',
  'help.featureDesc': 'Share ideas to improve the challenge',
  'help.emailLabel': 'Email:',
  'help.supportSubject': 'Support Request - 75 Challenge',
  'help.featureSubject': 'Feature Proposal - 75 Challenge',

  // Landing feed preview
  'preview.eyebrow': 'The community',
  'preview.title': 'This is what the community feed looks like',
  'preview.subtitle':
    'People check off their own days, share a bit if they feel like it, and cheer each other on. No downvotes, no comment section to police.',
  'preview.sampleBadge': 'Sample',

  // Hype (src/lib/hype-phrases.ts owns the actual phrase text)

  // 9:16 story card
  'story.shieldReady': 'Shield Ready',
  'story.shieldUsed': 'Shield Used',
  'story.milestone': 'Today',
  'story.day': 'DAY {day}',
  'story.ofDays': 'of 75 days',
  'story.start': 'Start',
  'story.finish': 'Finish',
  'story.percentComplete': '{percent}% Complete',
  'story.rulesToday': 'Done today',
  'story.daysLogged': '{count} days logged',
  'story.defaultQuote': 'One day at a time.',
  'story.export': 'Save card to share',
  'story.exporting': 'Making your card...',

  // Day locking — a completed day is final and cannot be re-edited
  'day.doneTitle': "Today's day is locked in",
  'day.doneBody':
    'You completed every rule for {date}. Nothing more to do — come back tomorrow to keep the streak going.',
  'day.shieldedTitle': 'This day is protected',
  'day.shieldedBody': 'You used your Streak Shield for {date}. Come back tomorrow.',
  'day.outsideTitle': 'Outside your 75 days',
  'day.outsideBody': '{date} falls before your start date or after your finish, so there is nothing to log.',
  'day.futureTitle': 'This day has not arrived yet',
  'day.futureBody': 'You can log {date} once it gets here. Until then, today is the one that counts.',
  'day.restDayTitle': 'No rules scheduled today',
  'day.restDayBody': 'Enjoy the rest day — your streak is safe.',

  // Async / status messaging
  'common.loading': 'Loading...',
  'common.cancel': 'Cancel',
  'common.retry': 'Try again',
  'common.saving': 'Saving...',
  'status.saveFailed': 'Could not save. Please try again.',
  'status.loadFailed': 'Could not load your challenge. Please refresh.',
  'status.offline': 'You appear to be offline. Changes were not saved.',

  // Sign-up completion
  'signup.confirmEmail':
    'Almost there — confirm your email address, then log in to start Day 1.',
  'signup.accountExists': 'An account with this email already exists. Try logging in instead.',

  // Feed previews
  'feed.previewNotice':
    'Nobody has checked in yet today, so these sample posts show what the feed looks like.',
  'feed.empty': 'No check-ins yet. Be the first today.',
  'feed.loginRequired': 'Log in to see the community feed.',
  'feed.caughtUpMany': 'Caught up on {count} past days',
  'feed.loadMore': 'Load more',
  'feed.rulesShowAll': '+{count} more',
  'feed.rulesShowLess': 'Show less',
  'feed.resetAnnouncement': '{name} started over — back to Day 1.',

  // Challenger directory
  'challengers.title': 'Challengers',
  'challengers.empty': 'Nobody has joined yet.',
  'challengers.loadMore': 'Load more',
  'challengers.dayShort': '{day}|75',

  // Other people's profiles
  'profile.viewing': "{name}'s challenge",
  'profile.notFound': 'No participant found with that username.',
  'profile.ownChallenge': 'Go to my challenge',
  'profile.rulesTitle': 'Habits',
  // network.* — everyone follows everyone by default; the only choice is
  // hiding someone from your own feed, and undoing that.
  'network.follow': 'Follow',
  'network.following': 'Following',
  'network.title': 'Network',
  'network.peopleYouFollow': 'People you follow',
  'network.peopleYouFollowDesc': 'Everyone, minus the people below.',
  'network.hiddenByYou': 'Hidden by you',
  'network.unhide': 'Unhide',
  'network.noHidden': "You haven't hidden anyone.",
  'profile.postsTitle': 'Posts',
  'profile.noPosts': 'No check-ins yet.',

  // Login
  'login.title': 'Welcome back',
  'login.subtitle': 'Log in to pick up your challenge where you left off.',
  'login.emailLabel': 'Email Address',
  'login.passwordLabel': 'Password',
  'login.submit': 'Log In',
  'login.submitting': 'Logging in...',
  'login.forgot': 'Forgot your password?',
  'login.noAccount': "Don't have an account yet?",
  'login.joinLink': 'Join the 75 Challenge',
  'login.failed': 'Email or password is not correct.',
  'login.needBoth': 'Please enter your email and password.',

  // Forgot password
  'forgot.title': 'Reset your password',
  'forgot.desc':
    'Enter the email address you signed up with. We will send you a link to verify it and choose a new password.',
  'forgot.submit': 'Send reset link',
  'forgot.submitting': 'Sending...',
  'forgot.sent': 'Check your inbox — we sent a reset link to {email}.',
  'forgot.back': 'Back to log in',
  'forgot.needEmail': 'Please enter your email address.',

  // Reset password page
  'reset.title': 'Choose a new password',
  'reset.desc': 'Your email is verified. Pick a new password to finish.',
  'reset.newPassword': 'New password (min. {min} characters)',
  'reset.confirmPassword': 'Repeat New Password',
  'reset.submit': 'Save new password',
  'reset.submitting': 'Saving...',
  'reset.success': 'Password updated. You can log in with it now.',
  'reset.mismatch': 'The two passwords do not match.',
  'reset.invalidLink':
    'This reset link is invalid or has expired. Request a new one from the log-in page.',
  'reset.backToLogin': 'Go to log in',

  // Account
  'account.title': 'Your Account',
  'account.subtitle': 'Manage your rules, your profile, and your password.',
  'account.tabRules': 'Rules',
  'account.tabProfile': 'Profile',
  'account.tabSecurity': 'Password',
  'account.saveRules': 'Save habits',
  'account.rulesLockedTitle': 'Your habits are locked in for now',
  'account.rulesLockedBody':
    'You are on day {current}. From day {unlocksOn} you get one chance to adjust them — the first week tells you a lot about whether you aimed right.',
  'account.rulesUsedTitle': 'You have used your habit change',
  'account.rulesUsedBody':
    'These are your habits for the rest of the challenge. One change per attempt keeps the commitment meaningful.',
  'account.rulesAvailableTitle': 'You can change your habits once',
  'account.rulesAvailableBody':
    'This is your single adjustment for this attempt. Take a moment — once you save, these are locked for the remaining days.',
  'account.rulesChangeConfirm':
    'This uses your one habit change for this attempt. Are you sure you want to save?',
  'account.rulesSaved': 'Your rules were updated.',
  'account.displayName': 'Display Name',
  'account.username': 'Username',
  'account.email': 'Email Address',
  'account.saveProfile': 'Save profile',
  'account.profileSaved': 'Profile updated.',
  'account.secretRulesLabel': 'Secret habits, to others',
  'account.secretRulesPlaceholder': 'Show as "Secret Rule" placeholder',
  'account.secretRulesHidden': 'Hide entirely from my profile and feed',
  'account.changePassword': 'Change your password',
  'account.newPassword': 'New password (min. {min} characters)',
  'account.confirmPassword': 'Repeat New Password',
  'account.updateSubmit': 'Update password',
  'account.updated': 'Password updated.',
  'account.needSession':
    'You are not signed in to the account service on this device. Use the email reset link instead.',
  'account.sendReset': 'Email me a reset link',
  'account.resetSent': 'Reset link sent to {email}.',
  'account.goToChallenge': 'Go to my challenge',
  'account.notLoggedIn': 'You are not logged in.',
  'account.logout': 'Log out',
  'account.dangerTitle': 'Start over',
  'account.dangerDesc':
    'Resets your challenge to Day 1 with a fresh Streak Shield. Your logged days are cleared.',
  'account.dangerCta': 'Reset to Day 1',
  'account.dangerConfirm':
    'This resets your challenge to Day 1 and clears every logged day. Continue?',
} as const;

export type TranslationKey = keyof typeof en;

const de: Record<TranslationKey, string> = {
  'nav.feed': 'Feed',
  'nav.join': 'Bei der 75 Challenge mitmachen',
  'nav.login': 'Anmelden',
  'nav.account': 'Konto',
  'nav.openAccount': 'Kontomenü öffnen',
  'nav.myChallenge': 'Meine Challenge',
  'nav.challengers': 'Challenger',
  'nav.editRules': 'Routinen bearbeiten',
  'nav.security': 'Passwort & Sicherheit',
  'nav.logout': 'Abmelden',
  'nav.toggleTheme': 'Farbschema wechseln',
  'nav.toggleThemeToDark': 'Auf Dark Mode umschalten',
  'nav.toggleThemeToLight': 'Auf Light Mode umschalten',
  'nav.language': 'Sprache',
  'nav.languageEn': 'Switch to English',
  'nav.languageDe': 'Auf Deutsch umschalten',
  'nav.openMenu': 'Menü öffnen',
  'nav.closeMenu': 'Menü schliessen',
  'nav.scrollTop': 'Nach oben',
  'nav.menu': 'Menü',

  'timezone.confirmPrompt':
    'Deine Zeitzone steht auf UTC – dein Gerät sagt {timezone}. Passt das so?',
  'timezone.confirmUpdate': 'Ändern',
  'meta.title': '75 Challenge — Challenge dich selbst',
  'meta.description':
    'Bau dir in 75 Tagen Routinen auf, die bleiben. Du bestimmst, was zählt, machst es in deinem Tempo – und kommst zusammen mit der Community bis zum 31. Dezember 2026 ans Ziel.',
  'footer.copyright': '© {year}',
  'footer.brand': '75 Challenge. Für alle, die zusammen wieder reinkommen.',
  'footer.tagline': 'Deine Routinen, dein Tempo.',
  'hero.badge': 'Let\'s go',
  'hero.titleLead': 'Challenge dich selbst —',
  'hero.titleAccent': 'zusammen',
  'hero.subtitle':
    'Der Sommer ist vorbei und du willst endlich wieder was für dich tun? 75 Tage, deine Routinen, dein Tempo. Und du machst es nicht allein.',
  'hero.cta': '75 Challenge beitreten',
  'hero.goal': 'Unser gemeinsames Ziel: die 75 Tage bis zum {deadline} durchziehen.',
  'pillars.rules.title': 'Du wählst deine Routinen',
  'pillars.rules.desc':
    'Niemand drückt dir eine Liste in die Hand. Nimm dir vor, was dir wirklich wichtig ist – täglich, nur werktags oder an den Tagen, die zu deiner Woche passen.',
  'pillars.shield.title': 'Platz für einen miesen Tag',
  'pillars.shield.desc':
    'Das Leben kommt dazwischen. Du legst vorher fest, wie viel Spielraum du willst – von gar keinem bis zu einem Schild, das wieder nachlädt.',
  'pillars.hype.title': 'Zuspruch, keine Bewertung',
  'pillars.hype.desc':
    'Keine Kommentarspalte, keine Downvotes, keine Rangliste. Nur Leute, die sich gegenseitig pushen. Tag für Tag.',
  'howItWorks.eyebrow': 'Kurz erklärt',
  'howItWorks.title': 'So läuft das hier',
  'howItWorks.lede':
    'Vier Dinge, die du vorher wissen solltest. Bei keinem davon bewertet dich irgendwer.',
  'trust.title': 'Du entscheidest selbst',
  'trust.body':
    'Du hakst deine Tage selbst ab und entscheidest selbst, ob du mit einem Tag zufrieden bist. Niemand kontrolliert dich. Wenn du sagst, du hast einen Tag verpasst, sagst du uns das – was dann passiert, hängt an dem Level, das du dir ausgesucht hast. Kein Grund für ein schlechtes Gewissen.',
  'join.badgeReferral': 'Eingeladen von @{username}',
  'join.badgeDefault': 'LOS GEHT’S',
  'join.titleReferral': 'Mach mit @{username} bei der 75 Challenge mit',
  'join.titleDefault': 'Bereit? Dann los.',
  'join.subtitle':
    'Such dir deine eigenen Routinen aus, mach es in deinem Tempo – und komm gemeinsam mit allen an, die sich heute auch dafür entschieden haben.',
  'join.perkRules': 'Du wählst deine Routinen',
  'join.perkShield': 'Platz für einen miesen Tag',
  'join.perkHype': 'Zuspruch, keine Bewertung',
  'join.ctaReferral': 'Mit @{username} beitreten',
  'join.ctaDefault': '75 Challenge beitreten',

  'onboarding.title': 'Bei der 75 Challenge mitmachen',
  'onboarding.close': 'Schliessen',
  'onboarding.referral': 'Du kommst über @{username}',
  'onboarding.back': 'Zurück',
  'onboarding.stepOf': 'Schritt {current} von {total}',

  'onboarding.stepLearn': 'So läuft das',
  'onboarding.stepDate': 'Startdatum',
  'onboarding.stepRules': 'Deine Routinen',
  'onboarding.stepAuth': 'Konto',

  'onboarding.learnTitle': 'So läuft das hier',
  'onboarding.learnIntro':
    'Fünf Dinge, die du vorher wissen solltest. Eine Minute lesen – und du kennst das ganze Spiel.',
  'onboarding.learnHabits': 'Such dir mindestens {min} Routinen aus',
  'onboarding.learnHabitsDesc':
    'Du entscheidest, woran du arbeitest – bis zu {max}. Formulier sie so konkret, dass du abends genau weisst, ob du sie gemacht hast.',
  'onboarding.learnChange': 'Nach 7 Tagen kannst du einmal nachjustieren',
  'onboarding.learnChangeDesc':
    'Die erste Woche zeigt dir viel. Ab Tag 8 kannst du einmal anpassen, falls du zu hoch oder zu tief gegriffen hast.',
  'onboarding.learnShield': 'Du legst fest, wie streng es wird',
  'onboarding.learnShieldDesc':
    'Bevor du startest, wählst du dein Commitment-Level. Das entscheidet, was bei einem verpassten Tag passiert.',
  'onboarding.learnJudge': 'Du bist der Massstab',
  'onboarding.learnJudgeDesc':
    'Niemand kontrolliert dich. Am Ende jedes Tages entscheidest du selbst, ob der Tag für dich gezählt hat.',
  'onboarding.learnReset': 'Ohne Schild einen Tag verpasst? Dann fängst du neu an',
  'onboarding.learnResetDesc':
    'Zurück auf Tag 1. Das ist keine Strafe – das ist der Grund, warum Ankommen überhaupt etwas bedeutet.',
  'onboarding.learnCta': 'Let\'s go',
  'onboarding.dateTitle': 'Wann willst du starten?',
  'onboarding.dateIntro':
    'Heute ist gut. Nächsten Montag auch. Nimm den Tag, an dem du wirklich loslegen kannst.',
  'onboarding.startDateLabel': 'Dein Startdatum',
  'onboarding.finish': 'Du wärst am {date} fertig',
  'onboarding.timezoneLabel': 'Deine Zeitzone',
  'onboarding.timezoneHint': 'Das legt fest, wann dein Tag umspringt – immer deine eigene Ortszeit, nie die von jemand anderem.',
  'onboarding.locationLabel': 'Standort (optional)',
  'onboarding.locationPlaceholder': 'Stadt, Land',
  'onboarding.dateCta': 'Weiter zu den Routinen',
  'onboarding.rulesTitle': 'Woran willst du arbeiten?',
  'onboarding.rulesCta': 'Weiter zum Konto',

  'onboarding.summary': '{start} → {end}',
  'onboarding.submit': 'Meine 75 Tage starten',
  'onboarding.minRulesAlert': 'Such dir bitte mindestens {min} Routinen aus.',
  'onboarding.maxRulesAlert': 'Mehr als {max} Routinen gehen nicht.',
  'onboarding.signupFailed': 'Die Registrierung hat nicht geklappt. Versuch es nochmal.',
  'onboarding.resumeTitle': 'Du bist schon angemeldet',
  'onboarding.resumeBody':
    'Das Konto gibt es schon, aber die Challenge wurde nie fertig eingerichtet. Noch ein Schritt, dann bist du auf Tag 1.',
  'onboarding.resumeFailed': 'Deine Challenge liess sich nicht einrichten. Versuch es nochmal.',
  'dates.invalid': 'Wähl bitte ein gültiges Startdatum.',
  'dates.crossesYearEnd':
    'Kleiner Hinweis: So wärst du erst am {date} fertig – nach unserem gemeinsamen Ziel am {deadline}. Mitmachen kannst du trotzdem, es ist deine Challenge.',
  'rules.heading': 'Deine Routinen',
  'rules.subheading':
    'Zwischen {min} und {max}. Bearbeite sie, wirf raus was nicht passt, häng eigene dran.',
  'rules.recommendation':
    'Ein gutes Set fordert dich an mehreren Stellen – was Körperliches, was zur Ernährung, was zum Lernen. Nimm Sachen, für die du dich anstrengen musst.',
  'rules.countOne': '{count} Routine',
  'rules.countMany': '{count} Routinen',
  'rules.minWarning': 'Nimm mindestens {min} Routinen, um zu starten.',
  'rules.maxWarning': 'Mehr als {max} gehen nicht.',
  'rules.titleLabel': 'Routine {index}',
  'rules.titlePlaceholder': 'Was nimmst du dir vor?',
  'rules.remove': 'Routine entfernen',
  'rules.removeNamed': '{title} entfernen',
  'rules.secretOn': 'Geheime Routine — tippen, um sie sichtbar zu machen',
  'rules.secretOff': 'Sichtbare Routine — tippen, um sie geheim zu machen',
  'rules.secretExplain': 'Tipp aufs Schloss, um eine Routine für dich zu behalten.',
  'rules.secretInfoLabel': 'Was sind geheime Routinen?',
  'rules.secretInfoText':
    'Geheime Routinen zählen ganz normal für deine Streak. Je nach Einstellung (Konto → Profil) sehen andere entweder nur „Geheime Routine" als Platzhalter – oder gar nichts.',
  'rules.scheduleDaily': 'Jeden Tag',
  'rules.scheduleWorkdays': 'Mo-Fr',
  'rules.scheduleCustom': 'Bestimmte Tage',
  'rules.addPlaceholder': 'Noch eine Routine ...',
  'rules.add': 'Hinzufügen',
  'rules.default.workouts': '2x 45 Min Training (1x draussen)',
  'rules.default.water': '4 Liter Wasser trinken',
  'rules.default.read': '10 Seiten lesen (Sachbuch)',
  'rules.default.diet': 'Saubere Ernährung (keine Cheat Meals)',
  'rules.default.alcohol': 'Kein Alkohol',

  'auth.nameLabel': 'Anzeigename (echter Name oder Nickname)',
  'auth.namePlaceholder': 'z. B. IronSpartan oder Sarah Connor',
  'auth.nameRequired': 'Wir brauchen einen Anzeigenamen.',
  'auth.usernameLabel': 'Benutzername',
  'auth.usernamePlaceholder': 'ironspartan',
  'auth.usernamePreview': 'Dein Profil: /user/{username}',
  'auth.avatarLabel': 'Profilbild (optional)',
  'auth.avatarUpload': 'Foto hinzufügen',
  'auth.avatarChange': 'Foto ändern',
  'auth.emailLabel': 'E-Mail-Adresse',
  'auth.emailPlaceholder': 'du@beispiel.com',
  'auth.emailInvalid': 'Diese E-Mail-Adresse sieht nicht richtig aus.',
  'auth.passwordLabel': 'Passwort (mind. {min} Zeichen)',
  'auth.passwordHint': 'Kurz und schmerzlos',
  'auth.passwordShort': 'Mindestens {min} Zeichen, bitte.',
  'auth.failed': 'Hat nicht geklappt. Versuch es nochmal.',
  'auth.submitting': 'Deine Challenge startet ...',
  'auth.submitDefault': 'Bei der 75 Challenge mitmachen',
  'auth.err.weakPassword': 'Zu kurz – nimm mindestens {min} Zeichen.',
  'auth.err.emailExists':
    'Mit dieser Adresse gibt es schon ein Konto. Melde dich einfach an.',
  'auth.err.emailNotConfirmed':
    'Bestätige zuerst deine E-Mail – schau mal ins Postfach.',
  'auth.err.invalidCredentials': 'E-Mail und Passwort passen nicht zusammen.',
  'auth.err.invalidEmail': 'Diese E-Mail-Adresse sieht nicht richtig aus.',
  'auth.err.rateLimited': 'Zu viele Versuche. Warte kurz und probier es nochmal.',
  'auth.err.signupDisabled': 'Neue Anmeldungen sind gerade zu.',
  'auth.err.notConfigured':
    'Der Konto-Dienst ist hier nicht eingerichtet. Melde dich beim Support.',
  'auth.err.network':
    'Wir erreichen den Konto-Dienst nicht. Prüf deine Verbindung.',
  'checklist.title': 'Heute',
  'checklist.loggingFor': '{date}',
  'checklist.progress': '{done} von {total} erledigt',
  'checklist.photoLabel': 'Foto dazu, wenn du magst',
  'checklist.photoChange': 'Foto ändern',
  'checklist.photoUpload': 'Foto hinzufügen',
  'checklist.compressing': 'Dein Foto wird vorbereitet ...',
  'checklist.compressionStats': 'Optimiert: {before} KB → {after} KB (WebP)',
  'checklist.compressionFailed': 'Das Foto liess sich nicht komprimieren.',
  'checklist.captionLabel': 'Willst du dir was zum Tag notieren?',
  'checklist.captionPlaceholder': 'Wie lief es? Freiwillig – du entscheidest, was du teilst ...',
  'checklist.submitComplete': 'Hab ich geschafft',
  'checklist.submitPartial': 'Tag speichern',
  'checklist.reportMissed': 'Den hab ich verpasst',
  'checklist.confirmIncomplete':
    'Da sind noch Punkte offen. Willst du den Tag als verpasst melden?',
  'checklist.photoAlt': 'Dein Foto für heute',

  'dayWindow.legend': 'Tag auswählen',
  'dayWindow.previous': 'Vorheriger Tag',
  'dayWindow.next': 'Nächster Tag',
  'dayWindow.dayOf': 'Tag {day} von 75',
  'dayWindow.outsideChallenge': 'Ausserhalb deiner Challenge',
  'dayWindow.viewGrid': 'Alle 75 Tage',
  'dayWindow.viewWindow': 'Fokus',
  'weekday.sun': 'So',
  'weekday.mon': 'Mo',
  'weekday.tue': 'Di',
  'weekday.wed': 'Mi',
  'weekday.thu': 'Do',
  'weekday.fri': 'Fr',
  'weekday.sat': 'Sa',
  'progress.ringLabel': 'geschafft',
  'commitment.legend': 'Commitment-Level',
  'commitment.stepTitle': 'Wie streng soll es werden?',
  'commitment.stepIntro':
    'Das entscheidet, was an einem Tag passiert, der nicht läuft wie geplant. Du musst dich nur vor dir selbst verantworten – nimm das Level, das du wirklich durchziehst.',
  'commitment.stepCta': 'Weiter zum Konto',
  'commitment.locked': 'Dein Level steht für diesen Versuch fest. Beim Neustart kannst du es neu wählen.',
  'commitment.announce':
    'Neu: Du kannst jetzt selbst festlegen, wie streng deine Challenge ist. Du bist auf Classic – also genau das eine Schild, das du eh schon hattest.',
  'commitment.announceCta': 'Anschauen',
  'commitment.purist.name': 'Purist',
  'commitment.purist.rule': 'Keine Schilde',
  'commitment.purist.desc':
    'Das originale 75 Hard. Ein verpasster Tag und du bist zurück auf Tag 1. Ohne Ausnahme.',
  'commitment.classic.name': 'Classic',
  'commitment.classic.rule': 'Ein Schild',
  'commitment.classic.desc':
    'Ein verpasster Tag ist über die ganzen 75 Tage abgedeckt. Danach fängst du wieder von vorn an.',
  'commitment.flex.name': 'Flex',
  'commitment.flex.rule': 'Schild lädt nach',
  'commitment.flex.desc':
    'Du startest mit einem Schild. Wenn du es einsetzt, kommt {days} Tage später das nächste – das Leben darf also öfter dazwischenkommen.',
  'commitment.shieldReturns': 'Dein Schild ist in {days} Tagen zurück.',

  'shield.title': 'Du hast einen verpassten Tag gemeldet',
  'shield.subtitle':
    'Du sagst, der {date} lief nicht nach Plan. Du entscheidest, wie es weitergeht.',
  'shield.optionShieldTitle': 'Streak-Schild einsetzen',
  'shield.optionShieldDesc':
    'Rettet deine Serie und markiert den {date} als geschützt.',
  'shield.optionShieldCta': 'Schild einsetzen und weitermachen',
  'shield.noShields':
    'Du hast gerade kein Schild verfügbar.',
  'shield.optionResetTitle': 'Neu anfangen ab Tag 1',
  'shield.optionResetDesc':
    'Achtung: Das löscht deine aktuelle Serie und startet einen komplett neuen Versuch ab Tag 1.',
  'shield.optionResetCta': 'Auf Tag 1 zurücksetzen',
  'shield.announceToFeed': 'Im Feed teilen',
  'shield.keepGoing': 'Doch nicht – Serie behalten',
  'shield.close': 'Schliessen',

  'countdown.dayOne': 'Noch 1 Tag bis zum Start',
  'countdown.days': 'Noch {count} Tage bis zum Start',
  'countdown.startsOn': 'Du startest am {date}.',
  'countdown.browseFeed': 'Im Feed umschauen',
  'catchup.explainOne': 'Ein Tag ohne Check-in. Kein Drama – hol ihn jetzt nach oder sag uns, dass er nicht gelaufen ist.',
  'catchup.explainMany':
    '{count} Tage ohne Check-in. Kein Drama – hol sie jetzt nach oder sag uns, dass sie nicht gelaufen sind.',
  'catchup.reportMissed': 'Als verpasst melden',
  'catchup.submitOne': '1 Tag nachholen',
  'catchup.submitMany': '{count} Tage nachholen',

  'heatmap.title': 'Deine 75 Tage',
  'heatmap.subtitle': 'Ein Feld pro Tag. Schau zu, wie es voller wird.',
  'heatmap.legendDone': 'Erledigt',
  'heatmap.legendShielded': 'Geschützt',
  'heatmap.legendMissed': 'Verpasst',
  'heatmap.legendUpcoming': 'Kommt noch',
  'heatmap.tooltip': 'Tag {day} ({date}): {status}',
  'heatmap.statusUpcoming': 'Kommt noch',
  'heatmap.statusPending': 'Offen',
  'heatmap.statusCompleted': 'Erledigt',
  'heatmap.statusShielded': 'Geschützt',
  'heatmap.statusFailed': 'Verpasst',

  'profile.activeAttempt': 'Läuft',
  'profile.meta': '@{username} • Start: {start} • Zielende: {end}',
  'profile.dayOf75': 'Tag von 75',
  'profile.shieldsLeft': 'Schilde übrig',
  'profile.activeRules': 'Routinen',
  'profile.tabDashboard': 'Meine Tage',
  'profile.tabStory': 'Karte teilen',
  'profile.loggedAlert': 'Der {date} ist als {status} eingetragen.',
  'profile.shieldAlert': 'Schild eingesetzt – der Tag ist geschützt.',
  'profile.resetAlert': 'Du startest wieder bei Tag 1.',
  'feed.statsTitle': 'Challenge-Community',
  'feed.activeToday': 'Heute aktiv',
  'feed.totalUsers': 'Challenger gesamt',
  'feed.liveTitle': 'Was gerade läuft',
  'feed.dayOf75': 'Tag {day} von 75',
  'feed.statusCompleted': 'Tag geschafft',
  'feed.statusShielded': 'Schild eingesetzt',
  'feed.hidden': 'Beiträge von @{username} sind ausgeblendet.',
  'feed.undoUnfollow': 'Wieder einblenden',
  'feed.unfollow': 'Person im Feed ausblenden',
  'feed.unfollowNamed': '{username} ausblenden',
  'feed.previewPost': 'Beispiel',
  'feed.photoAlt': 'Foto vom Tages-Check-in',
  'milestone.exportFailed': 'Das Bild liess sich nicht laden – mach einfach einen Screenshot.',
  'hype.beFirst': 'Sei der Erste',
  'hype.agree': 'Sehe ich auch so',
  'hype.alreadyHyped': 'Du hast gehypt',
  'hype.reroll': 'Noch einer',
  'hype.send': 'Abschicken',
  'hype.you': 'Du',
  'hype.says': '{name} sagt:',
  'hype.agreedOne': '{name} sieht das genauso',
  'hype.agreedMany': '{name} und {count} andere sehen das genauso',

  'help.trigger': 'Hilfe & Feedback',
  'help.intro':
    'Fragen, Bug gefunden oder eine Idee? Schreib direkt dem Team.',
  'help.supportTitle': 'Support kontaktieren',
  'help.supportDesc': 'Hilfe bei Konto- oder App-Problemen',
  'help.featureTitle': 'Feature vorschlagen',
  'help.featureDesc': 'Ideen, die die Challenge besser machen',
  'help.emailLabel': 'E-Mail:',
  'help.supportSubject': 'Support-Anfrage - 75 Challenge',
  'help.featureSubject': 'Feature-Vorschlag - 75 Challenge',

  'preview.eyebrow': 'Die Community',
  'preview.title': 'So sieht der Feed aus',
  'preview.subtitle':
    'Leute haken ihre Tage ab, teilen was, wenn ihnen danach ist, und pushen sich gegenseitig. Keine Downvotes, keine Kommentarspalte zum Moderieren.',
  'preview.sampleBadge': 'Beispiel',
  'story.shieldReady': 'Schild bereit',
  'story.shieldUsed': 'Schild genutzt',
  'story.milestone': 'Heute',
  'story.day': 'TAG {day}',
  'story.ofDays': 'von 75 Tagen',
  'story.start': 'Start',
  'story.finish': 'Ziel',
  'story.percentComplete': '{percent}% geschafft',
  'story.rulesToday': 'Heute erledigt',
  'story.daysLogged': '{count} Tage eingetragen',
  'story.defaultQuote': 'Ein Tag nach dem anderen.',
  'story.export': 'Karte sichern',
  'story.exporting': 'Deine Karte entsteht ...',
  'day.doneTitle': 'Tag ist eingetragen',
  'day.doneBody':
    'Am {date} hast du alles abgehakt. Mehr gibt es heute nicht zu tun – bis morgen.',
  'day.shieldedTitle': 'Dieser Tag ist geschützt',
  'day.shieldedBody': 'Für den {date} hast du dein Schild eingesetzt. Bis morgen.',
  'day.outsideTitle': 'Ausserhalb deiner 75 Tage',
  'day.outsideBody': 'Der {date} liegt vor deinem Start oder nach deinem Ziel – da gibt es nichts einzutragen.',
  'day.futureTitle': 'Dieser Tag ist noch nicht dran',
  'day.futureBody': 'Den {date} kannst du eintragen, sobald er da ist. Bis dahin zählt heute.',
  'day.restDayTitle': 'Heute steht nichts an',
  'day.restDayBody': 'Geniess den Ruhetag – deine Serie läuft weiter.',
  'common.loading': 'Lädt ...',
  'common.cancel': 'Abbrechen',
  'common.retry': 'Nochmal',
  'common.saving': 'Speichert ...',
  'status.saveFailed': 'Konnte nicht gespeichert werden. Versuch es nochmal.',
  'status.loadFailed': 'Deine Challenge liess sich nicht laden. Lad die Seite neu.',
  'status.offline': 'Du scheinst offline zu sein – nichts wurde gespeichert.',
  'signup.confirmEmail':
    'Fast geschafft – bestätige deine E-Mail und melde dich an, dann startet Tag 1.',
  'signup.accountExists':
    'Mit dieser Adresse gibt es schon ein Konto. Melde dich einfach an.',
  'feed.previewNotice':
    'Heute hat noch niemand eingecheckt – diese Beispiele zeigen, wie der Feed aussieht.',
  'feed.empty': 'Noch keine Check-ins. Mach du den Anfang.',
  'feed.loginRequired': 'Melde dich an, um den Feed zu sehen.',
  'feed.caughtUpMany': '{count} Tage nachgeholt',
  'feed.rulesShowAll': '+{count} weitere',
  'feed.rulesShowLess': 'Weniger',
  'feed.loadMore': 'Mehr laden',
  'feed.resetAnnouncement': '{name} fängt neu an – zurück auf Tag 1.',
  'challengers.title': 'Challenger',
  'challengers.empty': 'Hier ist noch niemand.',
  'challengers.dayShort': '{day}|75',
  'challengers.loadMore': 'Mehr laden',

  'profile.viewing': 'Challenge von {name}',
  'profile.notFound': 'Unter diesem Benutzernamen ist niemand unterwegs.',
  'profile.ownChallenge': 'Zu meiner Challenge',
  'profile.rulesTitle': 'Routinen',
  'network.follow': 'Folgen',
  'network.following': 'Folgst du',
  'network.title': 'Netzwerk',
  'network.peopleYouFollow': 'Leute, denen du folgst',
  'network.peopleYouFollowDesc': 'Alle – ausser die hier drunter.',
  'network.hiddenByYou': 'Von dir ausgeblendet',
  'network.unhide': 'Wieder einblenden',
  'network.noHidden': 'Du hast niemanden ausgeblendet.',
  'profile.postsTitle': 'Beiträge',
  'profile.noPosts': 'Noch keine Check-ins.',
  'login.title': 'Willkommen zurück',
  'login.subtitle': 'Melde dich an und mach da weiter, wo du aufgehört hast.',
  'login.emailLabel': 'E-Mail-Adresse',
  'login.passwordLabel': 'Passwort',
  'login.submit': 'Anmelden',
  'login.submitting': 'Anmeldung läuft ...',
  'login.forgot': 'Passwort vergessen?',
  'login.noAccount': 'Noch kein Konto?',
  'login.joinLink': 'Jetzt mitmachen',
  'login.failed': 'E-Mail oder Passwort stimmt nicht.',
  'login.needBoth': 'Gib bitte E-Mail und Passwort ein.',
  'forgot.title': 'Passwort zurücksetzen',
  'forgot.desc':
    'Gib die Adresse ein, mit der du dich registriert hast. Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.',
  'forgot.submit': 'Link senden',
  'forgot.submitting': 'Wird gesendet ...',
  'forgot.sent': 'Schau ins Postfach – der Link ist an {email} unterwegs.',
  'forgot.back': 'Zurück zum Anmelden',
  'forgot.needEmail': 'Gib bitte deine E-Mail-Adresse ein.',
  'reset.title': 'Neues Passwort wählen',
  'reset.desc': 'Deine E-Mail ist bestätigt. Jetzt ein neues Passwort setzen.',
  'reset.newPassword': 'Neues Passwort (mind. {min} Zeichen)',
  'reset.confirmPassword': 'Neues Passwort wiederholen',
  'reset.submit': 'Passwort speichern',
  'reset.submitting': 'Speichert ...',
  'reset.success': 'Passwort geändert. Du kannst dich jetzt damit anmelden.',
  'reset.mismatch': 'Die beiden Passwörter stimmen nicht überein.',
  'reset.invalidLink':
    'Der Link ist ungültig oder abgelaufen. Fordere auf der Anmeldeseite einen neuen an.',
  'reset.backToLogin': 'Zum Anmelden',
  'account.title': 'Dein Konto',
  'account.subtitle': 'Routinen, Profil und Passwort.',
  'account.tabRules': 'Regeln',
  'account.tabProfile': 'Profil',
  'account.tabSecurity': 'Passwort',
  'account.saveRules': 'Routinen speichern',
  'account.rulesLockedTitle': 'Deine Routinen stehen erstmal fest',
  'account.rulesLockedBody':
    'Du bist auf Tag {current}. Ab Tag {unlocksOn} kannst du einmal nachjustieren – die erste Woche zeigt dir, ob du richtig gegriffen hast.',
  'account.rulesUsedTitle': 'Deine Anpassung ist verbraucht',
  'account.rulesUsedBody':
    'Das sind deine Routinen für den Rest der Challenge. Eine Änderung pro Versuch, damit es verbindlich bleibt.',
  'account.rulesAvailableTitle': 'Du kannst einmal anpassen',
  'account.rulesAvailableBody':
    'Das ist deine einzige Anpassung für diesen Versuch. Lass dir Zeit – nach dem Speichern steht es fest.',
  'account.rulesChangeConfirm':
    'Damit ist deine einzige Anpassung verbraucht. Wirklich speichern?',
  'account.rulesSaved': 'Routinen aktualisiert.',
  'account.displayName': 'Anzeigename',
  'account.username': 'Benutzername',
  'account.email': 'E-Mail-Adresse',
  'account.saveProfile': 'Profil speichern',
  'account.profileSaved': 'Profil aktualisiert.',
  'account.secretRulesLabel': 'Geheime Routinen – was andere sehen',
  'account.secretRulesPlaceholder': 'Als „Geheime Routine" anzeigen',
  'account.secretRulesHidden': 'Ganz aus Profil und Feed rausnehmen',
  'account.changePassword': 'Passwort ändern',
  'account.newPassword': 'Neues Passwort (mind. {min} Zeichen)',
  'account.confirmPassword': 'Neues Passwort wiederholen',
  'account.updateSubmit': 'Passwort aktualisieren',
  'account.updated': 'Passwort aktualisiert.',
  'account.needSession':
    'Auf diesem Gerät bist du nicht angemeldet. Nimm den Link per E-Mail.',
  'account.sendReset': 'Link per E-Mail schicken',
  'account.resetSent': 'Link an {email} gesendet.',
  'account.goToChallenge': 'Zu meiner Challenge',
  'account.notLoggedIn': 'Du bist nicht angemeldet.',
  'account.logout': 'Abmelden',
  'account.dangerTitle': 'Neu anfangen',
  'account.dangerDesc':
    'Setzt deine Challenge auf Tag 1 zurück. Alle eingetragenen Tage werden gelöscht.',
  'account.dangerCta': 'Auf Tag 1 zurücksetzen',
  'account.dangerConfirm':
    'Das setzt dich auf Tag 1 zurück und löscht alle eingetragenen Tage. Sicher?',
};

export const translations: Record<Locale, Record<TranslationKey, string>> = { en, de };

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'de';
}

/**
 * Replaces `{name}` placeholders in a template with the supplied values.
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

/**
 * Translates a key outside of React (tests, non-component helpers).
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const table = translations[locale] ?? translations.en;
  return interpolate(table[key] ?? translations.en[key] ?? key, vars);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
    // Fall back to the browser preference on a first visit.
    if (window.navigator?.language?.toLowerCase().startsWith('de')) return 'de';
  } catch {
    // Storage can throw in private mode — English is a safe default.
  }
  return 'en';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(LOCALE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(LOCALE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// Snapshots must be referentially stable; a plain string satisfies that.
const getServerSnapshot = (): Locale => 'en';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // localStorage is the source of truth, read without a mount effect so React
  // and storage never drift apart.
  const locale = useSyncExternalStore(subscribe, readStoredLocale, getServerSnapshot);

  // Keep the document language in step for screen readers and translation prompts.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures — the dispatch below still applies the choice.
    }
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Components rendered outside the provider (e.g. isolated unit tests) still
    // get working English copy rather than crashing.
    return {
      locale: 'en',
      setLocale: () => { },
      t: (key, vars) => translate('en', key, vars),
    };
  }
  return ctx;
}
