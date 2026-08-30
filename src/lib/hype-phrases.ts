/**
 * Curated hype phrases — the entire "hype" mechanic in one array.
 *
 * Deliberately NOT in src/lib/i18n.tsx: that dictionary already ships both
 * locales to every client and this is meant to scale toward ~1000 entries,
 * which would roughly triple it. Keeping phrases here means the dictionary
 * stays proportional to actual UI copy, and this file can grow independently.
 *
 * This is still curated content, not user-authored text: a hype is always one
 * of these ids, never free text (start.md §7 — no comments, no downvotes, and
 * nothing here is negative). `reactions.phrase_id` stores the id; the actual
 * wording is resolved client-side per viewer locale, so a German reader always
 * sees German regardless of which locale the sender was using when they
 * tapped, and the copy can be reworded later without touching history.
 *
 * IDs are permanent once shipped — they are foreign data, sitting in the
 * database. Never renumber or delete one; retire a phrase by simply no longer
 * showing it as a choice (not built yet — the whole list is offered today).
 */

import { interpolate } from './i18n';

export interface HypePhrase {
  id: string;
  en: string;
  de: string;
}

// prettier-ignore
export const HYPE_PHRASES: HypePhrase[] = [
  // Legacy — map the four retired emoji reactions (migration 0006) so nothing
  // written before this shipped is lost. Never reuse these ids for anything else.
  { id: 'legacy-fire',   en: 'On fire today',        de: 'Heute richtig on fire' },
  { id: 'legacy-beast',  en: 'Absolute beast',       de: 'Absolute Maschine' },
  { id: 'legacy-launch', en: 'Lift-off!',            de: 'Abflug!' },
  { id: 'legacy-hype',   en: 'Hype!',                de: 'Hype!' },

  // The main list.
  { id: 'you-are-a-god',        en: 'You are a god',                                   de: 'Du bist ein Gott' },
  { id: 'days-impressive',      en: '{days} days in? Genuinely impressive.',           de: '{days} Tage durch? Ehrlich stark.' },
  { id: 'machine',               en: 'Certified machine',                              de: 'Zertifizierte Maschine' },
  { id: 'built-different',      en: 'Built different',                                 de: 'Anders gebaut' },
  { id: 'main-character',       en: 'Main character energy',                          de: 'Main-Character-Energy' },
  { id: 'no-days-off',          en: 'No days off, apparently',                        de: 'Anscheinend keine freien Tage' },
  { id: 'unreal',                en: 'This is unreal',                                 de: 'Das ist unreal' },
  { id: 'sheesh',                en: 'Sheesh.',                                        de: 'Sheesh.' },
  { id: 'lock-in',               en: 'Locked in and it shows',                         de: 'Voll im Lock-in' },
  { id: 'ate-that',              en: 'You ate that',                                   de: 'Du hast das gerockt' },
  { id: 'no-notes',              en: 'No notes',                                       de: 'Nichts zu meckern' },
  { id: 'discipline-flex',       en: 'Discipline is showing off today',                de: 'Disziplin zeigt sich heute mal richtig' },
  { id: 'future-self-thanks',    en: 'Future you just sent a thank-you note',          de: 'Dein zukünftiges Ich sagt schon mal Danke' },
  { id: 'nasa-hiring',           en: 'NASA is hiring, just saying',                    de: 'Die NASA stellt gerade ein, nur so' },
  { id: 'legend-status',         en: 'Certified legend',                               de: 'Zertifizierte Legende' },
  { id: 'who-is-this-person',    en: 'Who even is this person',                        de: 'Wer bist du eigentlich' },
  { id: 'goals-loading',         en: 'Goals: loading… nope, achieved',                 de: 'Ziele: lädt… nein, erreicht' },
  { id: 'streak-nation',         en: 'Streak nation, rise up',                         de: 'Streak-Nation, steht auf' },
  { id: 'this-guy-again',        en: 'This person again?? Incredible',                 de: 'Schon wieder du?? Krass' },
  { id: 'clocked-in',            en: 'Clocked in, no excuses',                         de: 'Eingestempelt, keine Ausreden' },
  { id: 'take-a-bow',            en: 'Take a bow',                                     de: 'Verbeug dich ruhig' },
  { id: 'unstoppable',           en: 'Genuinely unstoppable right now',                de: 'Gerade echt nicht zu stoppen' },
  { id: 'protagonist-arc',       en: 'This is the protagonist arc',                    de: 'Das ist der Protagonisten-Arc' },
  { id: 'day-count-flex',        en: 'Day {days}?! Screenshot this',                   de: 'Tag {days}?! Screenshot das' },
  { id: 'clean-work',            en: 'Clean work today',                               de: 'Sauber gemacht heute' },
  { id: 'chef-kiss',             en: 'Chef’s kiss',                               de: 'Einfach perfekt' },
  { id: 'inspo',                 en: 'Certified daily inspiration',                    de: 'Tägliche Inspo, offiziell' },
  { id: 'iron-will',             en: 'That willpower is unreal',                       de: 'Diese Willenskraft ist unreal' },
  { id: 'stat-line',             en: 'The stats don’t lie: absolute unit',        de: 'Die Zahlen lügen nicht: absolute Einheit' },
  { id: 'grinding-quietly',      en: 'Grinding in silence, results are loud',          de: 'Leise geschuftet, laute Ergebnisse' },
  { id: 'menace',                en: 'A menace to mediocrity',                         de: 'Der Mittelmässigkeit ein Graus' },
  { id: 'plot-twist',            en: 'Plot twist: they never miss',                    de: 'Plottwist: verpasst nie einen Tag' },
  { id: 'inner-peace',           en: 'The inner peace of someone with a streak',       de: 'Der innere Frieden eines Streak-Halters' },
  { id: 'certified-cracked',     en: 'Certified cracked, no cap',                      de: 'Certified cracked, kein Cap' },
  { id: 'built-a-habit',         en: 'That’s not a habit anymore, that’s a personality trait', de: 'Das ist keine Gewohnheit mehr, das ist Persönlichkeit' },
  { id: 'gold-star',             en: 'Gold star, obviously',                          de: 'Goldstern, logisch' },
  { id: 'flex-alert',            en: 'Flex alert',                                     de: 'Flex-Alarm' },
  { id: 'quiet-storm',           en: 'Quiet storm behavior',                           de: 'Leiser Sturm im Anmarsch' },
  { id: 'level-up',              en: 'You just leveled up in real life',               de: 'Gerade im echten Leben ein Level aufgestiegen' },
  { id: 'certified-consistent',  en: 'Consistency looking this good should be illegal', de: 'So viel Konsequenz müsste eigentlich verboten sein' },
  { id: 'respect',               en: 'Respect. Genuinely.',                            de: 'Respekt. Ehrlich.' },
  { id: 'built-for-this',        en: 'You were built for this',                        de: 'Dafür bist du gemacht' },
  { id: 'main-quest',            en: 'Main quest: complete',                           de: 'Hauptquest: abgeschlossen' },
  { id: 'lowkey-icon',           en: 'Lowkey an icon at this point',                   de: 'Mittlerweile ziemlich eine Ikone' },
  { id: 'audacity',              en: 'The audacity to be this consistent',             de: 'Die Frechheit, so konsequent zu sein' },
  { id: 'streak-goals',          en: 'Streak goals, actual goals',                     de: 'Streak-Ziel, echtes Ziel' },
  { id: 'brb-inspired',          en: 'brb, going to go be inspired',                   de: 'brb, muss kurz inspiriert sein' },
  { id: 'genuinely-in-awe',      en: 'Genuinely in awe right now',                     de: 'Gerade echt beeindruckt' },
  { id: 'texting-everyone',      en: 'Telling everyone I know about this',             de: 'Erzähl das jetzt jedem, den ich kenne' },
  { id: 'ok-but-how',            en: 'Ok but how are you doing this',                  de: 'Ok aber wie machst du das' },
  { id: 'future-documentary',    en: 'This is going in the documentary',               de: 'Das kommt in die Dokumentation' },
];

/** All ids in the array, for schema-level parity checks (see the test file). */
export const HYPE_PHRASE_IDS: readonly string[] = HYPE_PHRASES.map((p) => p.id);

const HYPE_PHRASES_BY_ID = new Map(HYPE_PHRASES.map((p) => [p.id, p]));

export function getHypePhrase(id: string): HypePhrase | undefined {
  return HYPE_PHRASES_BY_ID.get(id);
}

/**
 * Picks one phrase at random, optionally excluding the current one — so
 * tapping an already-hyped post re-rolls to something different rather than
 * risking the same line twice in a row.
 */
export function pickRandomHypePhrase(excludeId?: string | null): HypePhrase {
  const pool = excludeId ? HYPE_PHRASES.filter((p) => p.id !== excludeId) : HYPE_PHRASES;
  const candidates = pool.length > 0 ? pool : HYPE_PHRASES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Resolves a phrase to display text in the given locale, with placeholders filled in. */
export function localizedHypePhrase(
  phrase: HypePhrase,
  locale: 'en' | 'de',
  vars?: Record<string, string | number>
): string {
  return interpolate(locale === 'de' ? phrase.de : phrase.en, vars);
}
