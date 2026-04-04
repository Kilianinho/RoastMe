/**
 * Fallback questions used when the app is offline or the DB hasn't loaded yet.
 * These are a subset of the full 30 questions seeded in Supabase.
 * Each question exists in both FR and EN.
 */
import type { Question } from '@/types/database';

const fallbackQuestionsFr: Omit<Question, 'id' | 'created_at'>[] = [
  {
    text: "Si [Prénom] était lâché dans la jungle, il/elle survivrait combien de temps ?",
    category: 'survival',
    type: 'multiple_choice',
    options: [
      { label: '2 heures', value: '2h' },
      { label: '1 jour', value: '1day' },
      { label: '1 semaine', value: '1week' },
      { label: 'Il/Elle devient le boss de la jungle', value: 'boss' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.0,
  },
  {
    text: "En cas d'apocalypse zombie, [Prénom] serait...",
    category: 'survival',
    type: 'multiple_choice',
    options: [
      { label: 'Le premier infecté', value: 'first_infected' },
      { label: 'Le héros', value: 'hero' },
      { label: 'Le traître du groupe', value: 'traitor' },
      { label: 'Déjà mort depuis longtemps', value: 'already_dead' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.0,
  },
  {
    text: "Si [Prénom] devait survivre 24h sans téléphone, il/elle...",
    category: 'survival',
    type: 'multiple_choice',
    options: [
      { label: 'Gère tranquille', value: 'handles_it' },
      { label: 'Pète un câble après 2h', value: 'loses_it' },
      { label: 'Vole le téléphone de quelqu\'un', value: 'steals_phone' },
      { label: 'Fait semblant d\'aller bien mais pleure intérieurement', value: 'fakes_it' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.0,
  },
  {
    text: "Si [Prénom] était un animal, ce serait...",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Un golden retriever (trop gentil)', value: 'golden' },
      { label: 'Un chat (fait ce qu\'il veut)', value: 'cat' },
      { label: 'Un dauphin (trop intelligent)', value: 'dolphin' },
      { label: 'Un panda (mange et dort)', value: 'panda' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "Son pire défaut que tout le monde voit mais lui/elle pas...",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Trop dramatique', value: 'dramatic' },
      { label: 'Toujours en retard', value: 'always_late' },
      { label: 'Parle trop de lui/elle', value: 'self_centered' },
      { label: 'Commence 1000 projets, finit zéro', value: 'never_finishes' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "[Prénom] en soirée, c'est...",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Le centre de l\'attention', value: 'center_attention' },
      { label: 'Celui qui cherche la sortie après 30min', value: 'wants_to_leave' },
      { label: 'Celui qui mange tout', value: 'eats_everything' },
      { label: 'Celui qui refait le monde dans un coin', value: 'deep_talks' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "Sa réaction face à un problème ?",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Panique immédiate', value: 'panic' },
      { label: 'Ignore jusqu\'à ce que ça parte', value: 'ignore' },
      { label: 'Demande l\'aide de tout le monde', value: 'asks_help' },
      { label: 'Trouve une solution créative (mais bizarre)', value: 'creative_fix' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "[Prénom] en date, il/elle...",
    category: 'dating',
    type: 'multiple_choice',
    options: [
      { label: 'Parle de ses ex', value: 'talks_exes' },
      { label: 'Est parfait(e)', value: 'perfect' },
      { label: 'Arrive en retard', value: 'late' },
      { label: 'Commande pour deux', value: 'orders_for_both' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "Niveau sens de l'orientation, [Prénom] c'est...",
    category: 'intelligence',
    type: 'multiple_choice',
    options: [
      { label: 'GPS humain', value: 'human_gps' },
      { label: 'Se perd dans sa propre rue', value: 'always_lost' },
      { label: 'Demande à Google même pour 200m', value: 'google_maps' },
      { label: 'Se retrouve toujours (par chance)', value: 'lucky' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.2,
  },
  {
    text: "Sa prise de décision ressemble à...",
    category: 'intelligence',
    type: 'multiple_choice',
    options: [
      { label: 'Analyse pendant des heures', value: 'overthinks' },
      { label: 'Choisit au hasard', value: 'random' },
      { label: 'Demande l\'avis de 10 personnes puis fait à sa tête', value: 'asks_then_ignores' },
      { label: 'Suit son instinct (souvent faux)', value: 'bad_instinct' },
    ],
    locale: 'fr',
    is_active: true,
    weight_for_matching: 1.2,
  },
];

const fallbackQuestionsEn: Omit<Question, 'id' | 'created_at'>[] = [
  {
    text: "If [Name] was dropped in the jungle, how long would they survive?",
    category: 'survival',
    type: 'multiple_choice',
    options: [
      { label: '2 hours', value: '2h' },
      { label: '1 day', value: '1day' },
      { label: '1 week', value: '1week' },
      { label: 'They become the jungle boss', value: 'boss' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.0,
  },
  {
    text: "In a zombie apocalypse, [Name] would be...",
    category: 'survival',
    type: 'multiple_choice',
    options: [
      { label: 'First one infected', value: 'first_infected' },
      { label: 'The hero', value: 'hero' },
      { label: 'The group traitor', value: 'traitor' },
      { label: 'Already dead', value: 'already_dead' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.0,
  },
  {
    text: "If [Name] had to survive 24h without a phone, they would...",
    category: 'survival',
    type: 'multiple_choice',
    options: [
      { label: 'Handle it fine', value: 'handles_it' },
      { label: 'Lose it after 2 hours', value: 'loses_it' },
      { label: "Steal someone else's phone", value: 'steals_phone' },
      { label: 'Pretend to be fine but cry inside', value: 'fakes_it' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.0,
  },
  {
    text: "If [Name] was an animal, it would be...",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'A golden retriever (too kind)', value: 'golden' },
      { label: 'A cat (does whatever it wants)', value: 'cat' },
      { label: 'A dolphin (too smart)', value: 'dolphin' },
      { label: 'A panda (eats and sleeps)', value: 'panda' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "Their worst flaw that everyone sees but them...",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Too dramatic', value: 'dramatic' },
      { label: 'Always late', value: 'always_late' },
      { label: 'Talks about themselves too much', value: 'self_centered' },
      { label: 'Starts 1000 projects, finishes zero', value: 'never_finishes' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "[Name] at a party is...",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Center of attention', value: 'center_attention' },
      { label: 'Looking for the exit after 30min', value: 'wants_to_leave' },
      { label: 'The one eating everything', value: 'eats_everything' },
      { label: 'Having deep convos in a corner', value: 'deep_talks' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "Their reaction when facing a problem?",
    category: 'personality',
    type: 'multiple_choice',
    options: [
      { label: 'Immediate panic', value: 'panic' },
      { label: 'Ignore it until it goes away', value: 'ignore' },
      { label: 'Ask everyone for help', value: 'asks_help' },
      { label: 'Find a creative (but weird) solution', value: 'creative_fix' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "[Name] on a date...",
    category: 'dating',
    type: 'multiple_choice',
    options: [
      { label: 'Talks about their exes', value: 'talks_exes' },
      { label: 'Is perfect', value: 'perfect' },
      { label: 'Shows up late', value: 'late' },
      { label: 'Orders for both', value: 'orders_for_both' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.5,
  },
  {
    text: "When it comes to directions, [Name] is...",
    category: 'intelligence',
    type: 'multiple_choice',
    options: [
      { label: 'A human GPS', value: 'human_gps' },
      { label: 'Gets lost on their own street', value: 'always_lost' },
      { label: 'Uses Google Maps even for 200m', value: 'google_maps' },
      { label: 'Always finds the way (by luck)', value: 'lucky' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.2,
  },
  {
    text: "Their decision-making looks like...",
    category: 'intelligence',
    type: 'multiple_choice',
    options: [
      { label: 'Analyzes for hours', value: 'overthinks' },
      { label: 'Picks randomly', value: 'random' },
      { label: "Asks 10 people then does their own thing", value: 'asks_then_ignores' },
      { label: 'Follows their gut (usually wrong)', value: 'bad_instinct' },
    ],
    locale: 'en',
    is_active: true,
    weight_for_matching: 1.2,
  },
];

/**
 * Returns 10 fallback questions for the given locale.
 * Used when the device is offline or Supabase is unreachable.
 * Generates temporary UUIDs so the roast flow can proceed locally.
 */
export function getFallbackQuestions(locale: string = 'fr'): Question[] {
  const source = locale === 'en' ? fallbackQuestionsEn : fallbackQuestionsFr;

  return source.map((q, i) => ({
    ...q,
    id: `fallback-${locale}-${i}`,
    created_at: new Date().toISOString(),
  }));
}
