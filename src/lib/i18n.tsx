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
  'nav.editRules': 'Edit Rules',
  'nav.security': 'Password & Security',
  'nav.logout': 'Log Out',
  'nav.toggleTheme': 'Switch colour theme',
  'nav.toggleThemeToDark': 'Switch to dark mode',
  'nav.toggleThemeToLight': 'Switch to light mode',
  'nav.language': 'Language',
  'nav.languageEn': 'Switch to English',
  'nav.languageDe': 'Auf Deutsch umschalten',

  'meta.title': '75 Challenge — Hard Discipline, Flexible Rules',
  'meta.description':
    'Transform your body and mind in 75 days with customizable rules, self-paced trust logging, and positive social accountability.',

  'footer.copyright':
    '© {year} 75 Challenge. Built for discipline, consistency, and positive accountability.',
  'footer.tagline': 'Self-paced daily tracking. 1 Streak Shield per 75-day journey.',

  // Landing hero
  'hero.badge': '75 DAYS OF DISCIPLINE & ACCOUNTABILITY',
  'hero.titleLead': 'Hard Discipline.',
  'hero.titleAccent': 'Flexible Rules.',
  'hero.subtitle':
    'Forge unbreakable daily habits with personalized rule sets, self-paced logging, and 1 Streak Shield to survive emergencies. Zero toxicity, 100% positive hype.',
  'hero.cta': 'Join 75 Challenge',
  'hero.ctaSub': 'Tailor your own rules • Free forever • 1 Streak Shield per attempt',

  'pillars.rules.title': 'Customizable Rules',
  'pillars.rules.desc':
    'Set daily, workday, or custom schedules that fit your fitness, reading, and mental growth goals.',
  'pillars.shield.title': '1 Streak Shield',
  'pillars.shield.desc':
    'One lifeline per attempt. If you miss a day, deploy your shield once to save your progress.',
  'pillars.hype.title': 'Positive-Only Hype',
  'pillars.hype.desc':
    'No negative comments or downvotes. Celebrate milestones with multi-tap emoji reactions and confetti.',

  'trust.title': 'Built on trust, not surveillance',
  'trust.body':
    'You check off your own progress, at your own pace. Nobody polices your day. If you decide you missed one, tell us — we will offer your Streak Shield once, and after that a fresh start from Day 1.',

  // Join page
  'join.badgeReferral': 'Squad Referral: @{username}',
  'join.badgeDefault': 'SQUAD ONBOARDING',
  'join.titleReferral': "Join @{username}'s 75 Challenge",
  'join.titleDefault': 'Join the 75 Challenge',
  'join.subtitle':
    'Build habits with personalized rules, self-paced progress logging, and 1 Streak Shield lifeline.',
  'join.perkRules': 'Custom Rules',
  'join.perkShield': '1 Streak Shield',
  'join.perkHype': 'Positive Hype Only',
  'join.ctaReferral': 'Join with @{username}',
  'join.ctaDefault': 'Join 75 Challenge',

  // Onboarding modal
  'onboarding.title': 'Join the 75 Challenge',
  'onboarding.close': 'Close modal',
  'onboarding.referral': 'Squad Referral: Joining with @{username}',
  'onboarding.stepRules': '1. Rules & Schedule',
  'onboarding.stepAuth': '2. Account & Launch',
  'onboarding.startDateLabel': 'Choose Your Start Date',
  'onboarding.finish': 'Finish: {date}',
  'onboarding.continue': 'Continue to Registration',
  'onboarding.summary': 'Start: {start} → Finish: {end}',
  'onboarding.shieldIncluded': '1 Shield included',
  'onboarding.submit': 'Join 75 Challenge',
  'onboarding.minRulesAlert': 'Please configure at least 2 active rules.',
  'onboarding.signupFailed': 'Signup failed. Please try again.',

  // Date notices
  'dates.invalid': 'Please select a valid start date.',
  'dates.crossesYearEnd':
    'Heads up: your 75 days run past 31 December and finish on {date} in the new year. You can still join.',

  // Rule customizer
  'rules.heading': 'Configure Your 75-Day Rule Set',
  'rules.subheading': 'Minimum 2 rules required. Tailor daily frequency or pick specific weekdays.',
  'rules.countOne': '{count} Rule Active',
  'rules.countMany': '{count} Rules Active',
  'rules.minWarning': 'You must configure at least 2 active rules to start your challenge.',
  'rules.remove': 'Remove rule',
  'rules.removeNamed': 'Remove rule {title}',
  'rules.scheduleDaily': '7 Days / Week',
  'rules.scheduleWorkdays': 'Mon-Fri',
  'rules.scheduleCustom': 'Custom Days',
  'rules.addPlaceholder': 'Add custom rule (e.g., Cold plunge 3 min, 100 pushups)...',
  'rules.add': 'Add Rule',
  'rules.default.workouts': '2x 45-min workouts (1 outdoors)',
  'rules.default.water': 'Drink 4 Liters of Water',
  'rules.default.read': 'Read 10 Pages (Non-fiction / Growth)',
  'rules.default.diet': 'Follow Clean Diet (No Cheat Meals)',
  'rules.default.alcohol': 'Zero Alcohol',

  // Auth form
  'auth.nameLabel': 'Display Name (Real Name or Pseudonym)',
  'auth.namePlaceholder': 'e.g. IronSpartan or Sarah Connor',
  'auth.nameRequired': 'Display name is required.',
  'auth.emailLabel': 'Email Address',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.emailInvalid': 'A valid email address is required.',
  'auth.passwordLabel': 'Password (Min. 5 Characters)',
  'auth.passwordHint': 'Simple & Lenient',
  'auth.passwordShort': 'Password must be at least 5 characters long.',
  'auth.failed': 'Authentication failed. Please try again.',
  'auth.submitting': 'Committing Challenge...',
  'auth.submitDefault': 'Join the 75 Challenge',

  // Daily checklist
  'checklist.title': 'Daily Check-In Matrix',
  'checklist.loggingFor': 'Logging for: {date}',
  'checklist.progress': '{done} / {total} Complete',
  'checklist.photoLabel': 'Daily Proof Photo (Auto-compressed to WebP < 200 KB)',
  'checklist.photoChange': 'Change Photo',
  'checklist.photoUpload': 'Upload Proof Photo',
  'checklist.compressing': 'Compressing image on canvas...',
  'checklist.compressionStats': 'Optimized: {before} KB → {after} KB (WebP)',
  'checklist.compressionFailed': 'Could not compress photo.',
  'checklist.captionLabel': 'Daily Reflection or Workout Notes',
  'checklist.captionPlaceholder': "How was today's discipline? Share thoughts with the squad...",
  'checklist.submitComplete': 'Lock In Completed Day',
  'checklist.submitPartial': 'Save Check-In',
  'checklist.reportMissed': 'I Missed This Day',
  'checklist.confirmIncomplete':
    'You still have unchecked rules. Do you want to report this day as missed?',
  'checklist.photoAlt': 'Proof photo',

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
  'shield.keepGoing': 'Never mind, keep my streak',
  'shield.close': 'Close',

  // Heatmap
  'heatmap.title': '75-Day Discipline Grid',
  'heatmap.subtitle': 'Every square represents 1 day. Miss none.',
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
  'profile.activeAttempt': 'Active Attempt',
  'profile.meta': '@{username} • Started: {start} • Target Finish: {end}',
  'profile.dayOf75': 'Day of 75',
  'profile.shieldsLeft': 'Shields Left',
  'profile.activeRules': 'Active Rules',
  'profile.tabDashboard': 'Daily Matrix & 75-Day Grid',
  'profile.tabStory': '9:16 Instagram Story Exporter',
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
  'preview.title': 'This is what the community feed looks like',
  'preview.subtitle':
    'Participants check off their own rules, post their proof, and hype each other up. No downvotes, no comments section to police.',
  'preview.sampleBadge': 'Sample',

  // Reactions ("Fire", "Beast", … stay untranslated — they are product names)
  'hype.give': 'Give {label} hype',

  // 9:16 story card
  'story.shieldReady': 'Shield Ready',
  'story.shieldUsed': 'Shield Used',
  'story.milestone': 'Daily Milestone',
  'story.day': 'DAY {day}',
  'story.ofDays': 'of 75 days unbroken',
  'story.start': 'Start',
  'story.finish': 'Finish',
  'story.percentComplete': '{percent}% Complete',
  'story.rulesToday': 'Rules Completed Today',
  'story.daysLogged': '{count} days logged',
  'story.defaultQuote': 'Discipline equals freedom.',
  'story.export': 'Save 9:16 Story to Share',
  'story.exporting': 'Generating Story...',

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
  'reset.newPassword': 'New Password (Min. 5 Characters)',
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
  'account.saveRules': 'Save rules',
  'account.rulesSaved': 'Your rules were updated.',
  'account.displayName': 'Display Name',
  'account.username': 'Username',
  'account.email': 'Email Address',
  'account.saveProfile': 'Save profile',
  'account.profileSaved': 'Profile updated.',
  'account.changePassword': 'Change your password',
  'account.newPassword': 'New Password (Min. 5 Characters)',
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
  'nav.feed': 'Community-Feed',
  'nav.join': '75 Challenge beitreten',
  'nav.login': 'Anmelden',
  'nav.account': 'Konto',
  'nav.openAccount': 'Kontomenü öffnen',
  'nav.myChallenge': 'Meine Challenge',
  'nav.editRules': 'Regeln bearbeiten',
  'nav.security': 'Passwort & Sicherheit',
  'nav.logout': 'Abmelden',
  'nav.toggleTheme': 'Farbschema wechseln',
  'nav.toggleThemeToDark': 'Zu Dunkelmodus wechseln',
  'nav.toggleThemeToLight': 'Zu Hellmodus wechseln',
  'nav.language': 'Sprache',
  'nav.languageEn': 'Switch to English',
  'nav.languageDe': 'Auf Deutsch umschalten',

  'meta.title': '75 Challenge — Harte Disziplin, flexible Regeln',
  'meta.description':
    'Verändere Körper und Kopf in 75 Tagen: mit eigenen Regeln, selbstbestimmtem Eintragen auf Vertrauensbasis und positiver Community.',

  'footer.copyright':
    '© {year} 75 Challenge. Gebaut für Disziplin, Beständigkeit und positive Verbindlichkeit.',
  'footer.tagline': 'Selbstbestimmtes Tages-Tracking. 1 Streak-Schild pro 75-Tage-Reise.',

  'hero.badge': '75 TAGE DISZIPLIN & VERBINDLICHKEIT',
  'hero.titleLead': 'Harte Disziplin.',
  'hero.titleAccent': 'Flexible Regeln.',
  'hero.subtitle':
    'Baue unerschütterliche Gewohnheiten auf – mit eigenen Regelsets, selbstbestimmtem Eintragen und 1 Streak-Schild für den Notfall. Null Toxizität, 100 % positiver Zuspruch.',
  'hero.cta': '75 Challenge beitreten',
  'hero.ctaSub': 'Eigene Regeln • Für immer kostenlos • 1 Streak-Schild pro Versuch',

  'pillars.rules.title': 'Anpassbare Regeln',
  'pillars.rules.desc':
    'Lege tägliche, werktägliche oder eigene Rhythmen fest – passend zu deinen Zielen für Fitness, Lesen und mentales Wachstum.',
  'pillars.shield.title': '1 Streak-Schild',
  'pillars.shield.desc':
    'Ein Rettungsanker pro Versuch. Wenn du einen Tag verpasst, setzt du dein Schild einmal ein und rettest deinen Fortschritt.',
  'pillars.hype.title': 'Nur positiver Zuspruch',
  'pillars.hype.desc':
    'Keine negativen Kommentare, keine Downvotes. Feiere Meilensteine mit Emoji-Reaktionen und Konfetti.',

  'trust.title': 'Auf Vertrauen gebaut, nicht auf Kontrolle',
  'trust.body':
    'Du hakst deinen Fortschritt selbst ab, in deinem Tempo. Niemand kontrolliert deinen Tag. Wenn du sagst, du hast einen Tag verpasst, bieten wir dir einmal dein Streak-Schild an – danach geht es frisch bei Tag 1 los.',

  'join.badgeReferral': 'Squad-Empfehlung: @{username}',
  'join.badgeDefault': 'SQUAD-ONBOARDING',
  'join.titleReferral': 'Tritt der 75 Challenge von @{username} bei',
  'join.titleDefault': 'Tritt der 75 Challenge bei',
  'join.subtitle':
    'Baue Gewohnheiten auf – mit eigenen Regeln, selbstbestimmtem Eintragen und 1 Streak-Schild als Rettungsanker.',
  'join.perkRules': 'Eigene Regeln',
  'join.perkShield': '1 Streak-Schild',
  'join.perkHype': 'Nur positiver Zuspruch',
  'join.ctaReferral': 'Mit @{username} beitreten',
  'join.ctaDefault': '75 Challenge beitreten',

  'onboarding.title': 'Tritt der 75 Challenge bei',
  'onboarding.close': 'Dialog schliessen',
  'onboarding.referral': 'Squad-Empfehlung: Beitritt mit @{username}',
  'onboarding.stepRules': '1. Regeln & Rhythmus',
  'onboarding.stepAuth': '2. Konto & Start',
  'onboarding.startDateLabel': 'Wähle dein Startdatum',
  'onboarding.finish': 'Ende: {date}',
  'onboarding.continue': 'Weiter zur Registrierung',
  'onboarding.summary': 'Start: {start} → Ende: {end}',
  'onboarding.shieldIncluded': '1 Schild inklusive',
  'onboarding.submit': '75 Challenge beitreten',
  'onboarding.minRulesAlert': 'Bitte richte mindestens 2 aktive Regeln ein.',
  'onboarding.signupFailed': 'Registrierung fehlgeschlagen. Bitte versuche es erneut.',

  'dates.invalid': 'Bitte wähle ein gültiges Startdatum.',
  'dates.crossesYearEnd':
    'Hinweis: Deine 75 Tage laufen über den 31. Dezember hinaus und enden am {date} im neuen Jahr. Du kannst trotzdem starten.',

  'rules.heading': 'Stelle dein 75-Tage-Regelset zusammen',
  'rules.subheading':
    'Mindestens 2 Regeln nötig. Bestimme die Häufigkeit oder wähle einzelne Wochentage.',
  'rules.countOne': '{count} Regel aktiv',
  'rules.countMany': '{count} Regeln aktiv',
  'rules.minWarning': 'Du brauchst mindestens 2 aktive Regeln, um deine Challenge zu starten.',
  'rules.remove': 'Regel entfernen',
  'rules.removeNamed': 'Regel {title} entfernen',
  'rules.scheduleDaily': '7 Tage / Woche',
  'rules.scheduleWorkdays': 'Mo-Fr',
  'rules.scheduleCustom': 'Eigene Tage',
  'rules.addPlaceholder': 'Eigene Regel hinzufügen (z. B. 3 Min Eisbad, 100 Liegestütze)...',
  'rules.add': 'Regel hinzufügen',
  'rules.default.workouts': '2x 45 Min Training (1x draussen)',
  'rules.default.water': '4 Liter Wasser trinken',
  'rules.default.read': '10 Seiten lesen (Sachbuch / Persönlichkeitsentwicklung)',
  'rules.default.diet': 'Saubere Ernährung (keine Cheat Meals)',
  'rules.default.alcohol': 'Kein Alkohol',

  'auth.nameLabel': 'Anzeigename (echter Name oder Pseudonym)',
  'auth.namePlaceholder': 'z. B. IronSpartan oder Sarah Connor',
  'auth.nameRequired': 'Ein Anzeigename ist erforderlich.',
  'auth.emailLabel': 'E-Mail-Adresse',
  'auth.emailPlaceholder': 'du@beispiel.com',
  'auth.emailInvalid': 'Eine gültige E-Mail-Adresse ist erforderlich.',
  'auth.passwordLabel': 'Passwort (mind. 5 Zeichen)',
  'auth.passwordHint': 'Einfach & unkompliziert',
  'auth.passwordShort': 'Das Passwort muss mindestens 5 Zeichen lang sein.',
  'auth.failed': 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
  'auth.submitting': 'Challenge wird gestartet...',
  'auth.submitDefault': 'Tritt der 75 Challenge bei',

  'checklist.title': 'Tägliche Check-in-Matrix',
  'checklist.loggingFor': 'Eintrag für: {date}',
  'checklist.progress': '{done} / {total} erledigt',
  'checklist.photoLabel': 'Tages-Beweisfoto (automatisch als WebP < 200 KB komprimiert)',
  'checklist.photoChange': 'Foto ändern',
  'checklist.photoUpload': 'Beweisfoto hochladen',
  'checklist.compressing': 'Bild wird komprimiert...',
  'checklist.compressionStats': 'Optimiert: {before} KB → {after} KB (WebP)',
  'checklist.compressionFailed': 'Foto konnte nicht komprimiert werden.',
  'checklist.captionLabel': 'Tagesreflexion oder Trainingsnotizen',
  'checklist.captionPlaceholder': 'Wie war deine Disziplin heute? Teile es mit dem Squad...',
  'checklist.submitComplete': 'Tag als erledigt eintragen',
  'checklist.submitPartial': 'Check-in speichern',
  'checklist.reportMissed': 'Ich habe diesen Tag verpasst',
  'checklist.confirmIncomplete':
    'Es sind noch Regeln offen. Möchtest du diesen Tag als verpasst melden?',
  'checklist.photoAlt': 'Beweisfoto',

  'shield.title': 'Du hast einen verpassten Tag gemeldet',
  'shield.subtitle':
    'Du sagst, der {date} lief nicht nach Plan. Deine Entscheidung – so geht es weiter.',
  'shield.optionShieldTitle': 'Streak-Schild einsetzen (1 verfügbar)',
  'shield.optionShieldDesc':
    'Schützt deine Serie und markiert den {date} als geschützt. Danach hast du 0 Schilde – der nächste verpasste Tag setzt dich auf Tag 1 zurück.',
  'shield.optionShieldCta': 'Streak-Schild einsetzen & weitermachen',
  'shield.noShields':
    'Kein Streak-Schild mehr übrig: Du hast dein einziges Schild in diesem 75-Tage-Versuch bereits eingesetzt.',
  'shield.optionResetTitle': 'Neu starten ab Tag 1',
  'shield.optionResetDesc':
    'Achtung: Das löscht deine aktuelle Serie und startet einen komplett neuen Versuch ab Tag 1 – mit 1 frischen Streak-Schild.',
  'shield.optionResetCta': 'Auf Tag 1 zurücksetzen',
  'shield.keepGoing': 'Doch nicht, Serie behalten',
  'shield.close': 'Schliessen',

  'heatmap.title': '75-Tage-Disziplin-Raster',
  'heatmap.subtitle': 'Jedes Feld steht für 1 Tag. Verpasse keinen.',
  'heatmap.legendDone': 'Erledigt',
  'heatmap.legendShielded': 'Geschützt',
  'heatmap.legendMissed': 'Verpasst',
  'heatmap.legendUpcoming': 'Kommend',
  'heatmap.tooltip': 'Tag {day} ({date}): {status}',
  'heatmap.statusUpcoming': 'Kommend',
  'heatmap.statusPending': 'Offen',
  'heatmap.statusCompleted': 'Erledigt',
  'heatmap.statusShielded': 'Geschützt',
  'heatmap.statusFailed': 'Verpasst',

  'profile.activeAttempt': 'Laufender Versuch',
  'profile.meta': '@{username} • Start: {start} • Zielende: {end}',
  'profile.dayOf75': 'Tag von 75',
  'profile.shieldsLeft': 'Schilde übrig',
  'profile.activeRules': 'Aktive Regeln',
  'profile.tabDashboard': 'Tagesmatrix & 75-Tage-Raster',
  'profile.tabStory': '9:16 Instagram-Story-Export',
  'profile.loggedAlert': 'Tag {date} als {status} eingetragen!',
  'profile.shieldAlert': 'Streak-Schild eingesetzt! Tag als geschützt vermerkt.',
  'profile.resetAlert': 'Zurücksetzung auf Tag 1 bestätigt. Du hast 1 frisches Streak-Schild.',

  'feed.statsTitle': 'Challenge-Community',
  'feed.activeToday': 'Heute aktiv',
  'feed.totalUsers': 'Teilnehmende gesamt',
  'feed.liveTitle': 'Live-Community-Feed',
  'feed.dayOf75': 'Tag {day} von 75',
  'feed.statusCompleted': 'Tag erledigt',
  'feed.statusShielded': 'Schild eingesetzt',
  'feed.hidden': 'Beiträge von @{username} sind ausgeblendet.',
  'feed.undoUnfollow': 'Wieder einblenden',
  'feed.unfollow': 'Person im Feed ausblenden',
  'feed.unfollowNamed': '{username} ausblenden',
  'feed.previewPost': 'Vorschau-Beitrag',
  'feed.photoAlt': 'Foto vom Tages-Check-in',

  'help.trigger': 'Hilfe & Feedback',
  'help.intro':
    'Fragen, ein Problem entdeckt oder eine Idee für ein neues Feature? Melde dich direkt beim Team.',
  'help.supportTitle': 'Support kontaktieren',
  'help.supportDesc': 'Hilfe bei Konto- oder App-Problemen',
  'help.featureTitle': 'Feature vorschlagen',
  'help.featureDesc': 'Teile Ideen, die die Challenge besser machen',
  'help.emailLabel': 'E-Mail:',
  'help.supportSubject': 'Support-Anfrage - 75 Challenge',
  'help.featureSubject': 'Feature-Vorschlag - 75 Challenge',

  'preview.title': 'So sieht der Community-Feed aus',
  'preview.subtitle':
    'Teilnehmende haken ihre eigenen Regeln ab, posten ihren Beweis und feuern sich gegenseitig an. Keine Downvotes, keine Kommentarspalte zum Moderieren.',
  'preview.sampleBadge': 'Beispiel',

  'hype.give': '{label} als Zuspruch geben',

  'story.shieldReady': 'Schild bereit',
  'story.shieldUsed': 'Schild genutzt',
  'story.milestone': 'Tages-Meilenstein',
  'story.day': 'TAG {day}',
  'story.ofDays': 'von 75 Tagen ohne Unterbruch',
  'story.start': 'Start',
  'story.finish': 'Ziel',
  'story.percentComplete': '{percent}% geschafft',
  'story.rulesToday': 'Heute erfüllte Regeln',
  'story.daysLogged': '{count} Tage eingetragen',
  'story.defaultQuote': 'Disziplin ist Freiheit.',
  'story.export': '9:16-Story zum Teilen sichern',
  'story.exporting': 'Story wird erstellt...',

  'login.title': 'Willkommen zurück',
  'login.subtitle': 'Melde dich an und mach dort weiter, wo du aufgehört hast.',
  'login.emailLabel': 'E-Mail-Adresse',
  'login.passwordLabel': 'Passwort',
  'login.submit': 'Anmelden',
  'login.submitting': 'Anmeldung läuft...',
  'login.forgot': 'Passwort vergessen?',
  'login.noAccount': 'Noch kein Konto?',
  'login.joinLink': 'Tritt der 75 Challenge bei',
  'login.failed': 'E-Mail oder Passwort ist nicht korrekt.',
  'login.needBoth': 'Bitte gib E-Mail und Passwort ein.',

  'forgot.title': 'Passwort zurücksetzen',
  'forgot.desc':
    'Gib die E-Mail-Adresse ein, mit der du dich registriert hast. Wir schicken dir einen Link zur Bestätigung, mit dem du ein neues Passwort wählst.',
  'forgot.submit': 'Link senden',
  'forgot.submitting': 'Wird gesendet...',
  'forgot.sent': 'Schau in dein Postfach – wir haben einen Link an {email} geschickt.',
  'forgot.back': 'Zurück zur Anmeldung',
  'forgot.needEmail': 'Bitte gib deine E-Mail-Adresse ein.',

  'reset.title': 'Neues Passwort wählen',
  'reset.desc': 'Deine E-Mail ist bestätigt. Wähle jetzt ein neues Passwort.',
  'reset.newPassword': 'Neues Passwort (mind. 5 Zeichen)',
  'reset.confirmPassword': 'Neues Passwort wiederholen',
  'reset.submit': 'Neues Passwort speichern',
  'reset.submitting': 'Wird gespeichert...',
  'reset.success': 'Passwort aktualisiert. Du kannst dich jetzt damit anmelden.',
  'reset.mismatch': 'Die beiden Passwörter stimmen nicht überein.',
  'reset.invalidLink':
    'Dieser Link ist ungültig oder abgelaufen. Fordere auf der Anmeldeseite einen neuen an.',
  'reset.backToLogin': 'Zur Anmeldung',

  'account.title': 'Dein Konto',
  'account.subtitle': 'Verwalte deine Regeln, dein Profil und dein Passwort.',
  'account.tabRules': 'Regeln',
  'account.tabProfile': 'Profil',
  'account.tabSecurity': 'Passwort',
  'account.saveRules': 'Regeln speichern',
  'account.rulesSaved': 'Deine Regeln wurden aktualisiert.',
  'account.displayName': 'Anzeigename',
  'account.username': 'Benutzername',
  'account.email': 'E-Mail-Adresse',
  'account.saveProfile': 'Profil speichern',
  'account.profileSaved': 'Profil aktualisiert.',
  'account.changePassword': 'Passwort ändern',
  'account.newPassword': 'Neues Passwort (mind. 5 Zeichen)',
  'account.confirmPassword': 'Neues Passwort wiederholen',
  'account.updateSubmit': 'Passwort aktualisieren',
  'account.updated': 'Passwort aktualisiert.',
  'account.needSession':
    'Du bist auf diesem Gerät nicht beim Konto-Dienst angemeldet. Nutze stattdessen den Link per E-Mail.',
  'account.sendReset': 'Link per E-Mail schicken',
  'account.resetSent': 'Link an {email} gesendet.',
  'account.goToChallenge': 'Zu meiner Challenge',
  'account.notLoggedIn': 'Du bist nicht angemeldet.',
  'account.logout': 'Abmelden',
  'account.dangerTitle': 'Neu starten',
  'account.dangerDesc':
    'Setzt deine Challenge auf Tag 1 zurück – mit einem frischen Streak-Schild. Deine eingetragenen Tage werden gelöscht.',
  'account.dangerCta': 'Auf Tag 1 zurücksetzen',
  'account.dangerConfirm':
    'Das setzt deine Challenge auf Tag 1 zurück und löscht alle eingetragenen Tage. Fortfahren?',
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
      setLocale: () => {},
      t: (key, vars) => translate('en', key, vars),
    };
  }
  return ctx;
}
