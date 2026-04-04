-- =============================================================================
-- Migration 004: Seed question bank — 30 questions × 2 locales (fr + en)
--
-- Categories:
--   survival  — 10 questions (Survie & Chaos)
--   personality — 10 questions (Personnalité)
--   dating    —  5 questions (Compatibilité / Dating)
--   intelligence —  5 questions (Intelligence & Sagesse)
--
-- All questions use type 'multiple_choice'.
-- Placeholder: [Prénom] in French, [Name] in English.
-- weight_for_matching: dating/personality questions weighted higher (1.5),
-- survival/chaos normal (1.0), intelligence slightly above (1.2).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FRENCH — 30 questions
-- ---------------------------------------------------------------------------

-- ===== Survie & Chaos (10) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  'Si [Prénom] était lâché(e) dans la jungle, il/elle survivrait combien de temps ?',
  'survival', 'multiple_choice',
  '[
    {"label": "2 heures maxi", "value": "2h"},
    {"label": "1 jour, pas plus", "value": "1day"},
    {"label": "1 semaine tranquille", "value": "1week"},
    {"label": "Il/Elle devient le boss de la jungle", "value": "boss"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'En cas d''apocalypse zombie, [Prénom] serait...',
  'survival', 'multiple_choice',
  '[
    {"label": "Le premier infecté", "value": "infected"},
    {"label": "Le héros qui sauve tout le monde", "value": "hero"},
    {"label": "Le traître du groupe", "value": "traitor"},
    {"label": "Déjà mort(e) avant que ça commence", "value": "already_dead"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Quelle serait la cause la plus probable de la mort de [Prénom] en pleine nature ?',
  'survival', 'multiple_choice',
  '[
    {"label": "Mange quelque chose de toxique", "value": "toxic_food"},
    {"label": "S''endort à découvert", "value": "sleeps_outside"},
    {"label": "Fait confiance à un inconnu", "value": "trusts_stranger"},
    {"label": "Marche dans la mauvaise direction pendant 3 jours", "value": "wrong_direction"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Si [Prénom] devait survivre 24h sans téléphone, il/elle...',
  'survival', 'multiple_choice',
  '[
    {"label": "Gère tranquille, aucun problème", "value": "chill"},
    {"label": "Pète un câble après 2h", "value": "meltdown"},
    {"label": "Vole le téléphone de quelqu''un", "value": "steals_phone"},
    {"label": "Fait semblant d''aller bien mais pleure intérieurement", "value": "fake_chill"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'En cas d''incendie, [Prénom] prendrait en premier...',
  'survival', 'multiple_choice',
  '[
    {"label": "Ses proches", "value": "loved_ones"},
    {"label": "Son téléphone", "value": "phone"},
    {"label": "Son chargeur", "value": "charger"},
    {"label": "Rien — il/elle est probablement le problème", "value": "the_problem"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Si [Prénom] devait construire un abri de survie, le résultat ressemblerait à...',
  'survival', 'multiple_choice',
  '[
    {"label": "Un bunker digne de Bear Grylls", "value": "bunker"},
    {"label": "Trois bâtons et une feuille", "value": "sticks"},
    {"label": "Un scroll Pinterest de cabanes qu''il/elle n''a jamais construites", "value": "pinterest"},
    {"label": "Il/Elle a demandé à quelqu''un d''autre de le faire", "value": "delegated"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Lors d''une panne d''électricité de 48h, [Prénom]...',
  'survival', 'multiple_choice',
  '[
    {"label": "Sort des bougies et fait une ambiance", "value": "candles"},
    {"label": "Dort pendant 47 heures", "value": "sleeps"},
    {"label": "Appelle ses parents toutes les heures", "value": "calls_parents"},
    {"label": "Profite pour lire tous les livres qu''il/elle n''a jamais lus", "value": "reads"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Si [Prénom] était perdu(e) en forêt sans GPS, il/elle...',
  'survival', 'multiple_choice',
  '[
    {"label": "Suit le soleil comme un pro", "value": "sun_navigation"},
    {"label": "Tourne en rond pendant des heures", "value": "circles"},
    {"label": "Trouve un inconnu à appeler à l''aide", "value": "asks_stranger"},
    {"label": "Construit un feu et attend les secours", "value": "waits_for_help"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Quelle arme [Prénom] choisirait en cas d''apocalypse ?',
  'survival', 'multiple_choice',
  '[
    {"label": "Un couteau suisse bien aiguisé", "value": "swiss_knife"},
    {"label": "Une batte de baseball", "value": "baseball_bat"},
    {"label": "Son charme naturel", "value": "charm"},
    {"label": "Une cuillère (mauvais choix mais il/elle l''assume)", "value": "spoon"}
  ]'::jsonb,
  'fr', 1.0
),
(
  'Si [Prénom] devait choisir un coéquipier pour survivre à une catastrophe, il/elle prendrait...',
  'survival', 'multiple_choice',
  '[
    {"label": "Le plus fort physiquement", "value": "strongest"},
    {"label": "Le plus intelligent", "value": "smartest"},
    {"label": "Quelqu''un avec de la nourriture", "value": "has_food"},
    {"label": "Son meilleur ami même s''il est inutile", "value": "best_friend"}
  ]'::jsonb,
  'fr', 1.0
);

-- ===== Personnalité (10) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  'Si [Prénom] était un animal, ce serait...',
  'personality', 'multiple_choice',
  '[
    {"label": "Un golden retriever (trop gentil pour ce monde)", "value": "golden"},
    {"label": "Un chat (fait exactement ce qu''il veut)", "value": "cat"},
    {"label": "Un dauphin (trop intelligent pour tout le monde)", "value": "dolphin"},
    {"label": "Un panda (mange et dort, c''est tout)", "value": "panda"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Le pire défaut de [Prénom] que tout le monde voit sauf lui/elle...',
  'personality', 'multiple_choice',
  '[
    {"label": "Trop dramatique pour rien", "value": "dramatic"},
    {"label": "Toujours en retard", "value": "always_late"},
    {"label": "Parle constamment de lui/elle-même", "value": "self_centered"},
    {"label": "Lance 1000 projets et en finit zéro", "value": "unfinished"}
  ]'::jsonb,
  'fr', 1.5
),
(
  '[Prénom] en soirée, c''est...',
  'personality', 'multiple_choice',
  '[
    {"label": "Le centre de l''attention absolue", "value": "center"},
    {"label": "Celui/Celle qui cherche la sortie après 30 min", "value": "exit_seeker"},
    {"label": "Celui/Celle qui mange tout ce qu''il y a sur la table", "value": "eats_everything"},
    {"label": "Celui/Celle qui refait le monde dans un coin", "value": "philosopher"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Si [Prénom] avait un superpouvoir, ce serait forcément...',
  'personality', 'multiple_choice',
  '[
    {"label": "Lire dans les pensées (savoir ce qu''on pense de lui/elle)", "value": "mind_reading"},
    {"label": "Téléportation (fuir les situations awkward)", "value": "teleportation"},
    {"label": "Invisibilité", "value": "invisibility"},
    {"label": "Changer ses propres décisions passées", "value": "change_past"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'La réaction de [Prénom] face à un problème inattendu ?',
  'personality', 'multiple_choice',
  '[
    {"label": "Panique immédiate et totale", "value": "panic"},
    {"label": "Ignore jusqu''à ce que ça disparaisse tout seul", "value": "ignore"},
    {"label": "Demande l''avis de tout le monde autour de lui/elle", "value": "asks_everyone"},
    {"label": "Trouve une solution créative (mais bizarre)", "value": "creative_weird"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Si [Prénom] était un personnage de film, il/elle serait...',
  'personality', 'multiple_choice',
  '[
    {"label": "Le héros principal attachant", "value": "hero"},
    {"label": "Le meilleur ami drôle mais inutile", "value": "funny_sidekick"},
    {"label": "Le villain incompris", "value": "misunderstood_villain"},
    {"label": "Celui qui meurt en premier", "value": "dies_first"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Comment [Prénom] gère-t-il/elle un conflit ?',
  'personality', 'multiple_choice',
  '[
    {"label": "Affronte directement, sans détour", "value": "direct"},
    {"label": "Évite à tout prix et espère que ça passe", "value": "avoidant"},
    {"label": "En parle à tout le monde sauf à la personne concernée", "value": "gossips"},
    {"label": "Écrit un long message puis ne l''envoie pas", "value": "unsent_message"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Quel est le mode de procrastination préféré de [Prénom] ?',
  'personality', 'multiple_choice',
  '[
    {"label": "Netflix et on verra demain", "value": "netflix"},
    {"label": "Range et nettoie tout (sauf la vraie tâche)", "value": "cleaning"},
    {"label": "Scroll infini sur les réseaux", "value": "social_scroll"},
    {"label": "Commence un nouveau projet encore plus ambitieux", "value": "new_project"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Si [Prénom] ratait un avion, il/elle...',
  'personality', 'multiple_choice',
  '[
    {"label": "Reste calme et rebooке immédiatement", "value": "calm_rebook"},
    {"label": "Pleure au comptoir d''embarquement", "value": "cries"},
    {"label": "Tient responsable quelqu''un d''autre", "value": "blames_others"},
    {"label": "Voit ça comme un signe et rentre à la maison", "value": "takes_it_as_sign"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'La phrase que [Prénom] dit le plus souvent et qui n''est jamais vraie...',
  'personality', 'multiple_choice',
  '[
    {"label": "\"J''arrive dans 5 minutes\"", "value": "5_minutes"},
    {"label": "\"Je vais juste regarder un épisode\"", "value": "one_episode"},
    {"label": "\"Cette fois je vais pas procrastiner\"", "value": "no_procrastination"},
    {"label": "\"Je réponds dès que j''ai le temps\"", "value": "reply_soon"}
  ]'::jsonb,
  'fr', 1.5
);

-- ===== Compatibilité / Dating (5) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  '[Prénom] en rendez-vous amoureux, il/elle...',
  'dating', 'multiple_choice',
  '[
    {"label": "Parle de ses ex pendant 20 minutes", "value": "talks_exes"},
    {"label": "Est parfait(e), attentionné(e), irrésistible", "value": "perfect"},
    {"label": "Arrive en retard sans s''excuser", "value": "arrives_late"},
    {"label": "Commande pour les deux sans demander", "value": "orders_for_both"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Le type de crush de [Prénom] ?',
  'dating', 'multiple_choice',
  '[
    {"label": "L''inaccessible (forcément)", "value": "unreachable"},
    {"label": "Le/La stable et rassurant(e)", "value": "stable"},
    {"label": "Le/La fun et totalement imprévisible", "value": "unpredictable"},
    {"label": "N''importe qui qui lui accorde de l''attention", "value": "any_attention"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Comment [Prénom] flirte-t-il/elle ?',
  'dating', 'multiple_choice',
  '[
    {"label": "Direct(e) et assumé(e)", "value": "direct"},
    {"label": "Fait semblant de ne pas flirter", "value": "pretends_not_to"},
    {"label": "Envoie des mèmes à 2h du matin", "value": "memes_2am"},
    {"label": "Demande à ses amis d''agir à sa place", "value": "uses_friends"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Après une rupture, [Prénom]...',
  'dating', 'multiple_choice',
  '[
    {"label": "Rebondit en une semaine chrono", "value": "rebounds_fast"},
    {"label": "Écoute de la musique triste pendant 3 semaines", "value": "sad_music"},
    {"label": "Fait semblant que ça va mais stocke de la rancœur", "value": "pretends_ok"},
    {"label": "Analyse tout jusqu''à la moelle pendant des mois", "value": "overanalyzes"}
  ]'::jsonb,
  'fr', 1.5
),
(
  'Ce que [Prénom] cherche vraiment dans une relation...',
  'dating', 'multiple_choice',
  '[
    {"label": "Quelqu''un qui le/la comprend sans qu''il/elle explique", "value": "understanding"},
    {"label": "De l''aventure et de l''imprévu", "value": "adventure"},
    {"label": "De la stabilité et de la sécurité", "value": "stability"},
    {"label": "Quelqu''un qui répond aux messages rapidement", "value": "fast_replies"}
  ]'::jsonb,
  'fr', 1.5
);

-- ===== Intelligence & Sagesse (5) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  'Niveau sens de l''orientation, [Prénom] c''est...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "GPS humain, jamais perdu(e)", "value": "human_gps"},
    {"label": "Se perd dans sa propre rue", "value": "lost_own_street"},
    {"label": "Demande Google Maps même pour 200 mètres", "value": "google_200m"},
    {"label": "S''en sort toujours... mais par pur hasard", "value": "lucky"}
  ]'::jsonb,
  'fr', 1.2
),
(
  'La prise de décision de [Prénom] ressemble à...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Analyse froide pendant des heures", "value": "cold_analysis"},
    {"label": "Choisit au hasard, comme un dé", "value": "random"},
    {"label": "Demande l''avis de 10 personnes puis fait à sa tête quand même", "value": "asks_then_ignores"},
    {"label": "Suit son instinct (qui est souvent faux)", "value": "wrong_instinct"}
  ]'::jsonb,
  'fr', 1.2
),
(
  'Si [Prénom] devait apprendre quelque chose de nouveau en urgence, il/elle...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Maîtrise le sujet en 24h chrono", "value": "masters_fast"},
    {"label": "Regarde 3 vidéos YouTube et se déclare expert(e)", "value": "youtube_expert"},
    {"label": "Demande à quelqu''un qui sait faire", "value": "asks_expert"},
    {"label": "Improvise et espère que personne ne remarque", "value": "improvises"}
  ]'::jsonb,
  'fr', 1.2
),
(
  'Comment [Prénom] réagit face à une information qu''il/elle ne connaît pas ?',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Cherche immédiatement à comprendre", "value": "seeks_to_understand"},
    {"label": "Fait semblant de savoir", "value": "pretends_to_know"},
    {"label": "Change de sujet subtilement", "value": "changes_subject"},
    {"label": "Dit \"ah oui bien sûr\" et Google secrètement après", "value": "secret_google"}
  ]'::jsonb,
  'fr', 1.2
),
(
  'Le conseil de [Prénom] en cas de problème compliqué serait...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Structuré, clair, et souvent juste", "value": "structured_advice"},
    {"label": "\"Fais confiance au processus\" (sans plus d''explication)", "value": "trust_the_process"},
    {"label": "Un proverbe sorti de nulle part", "value": "random_proverb"},
    {"label": "\"Je sais pas mais je suis là pour toi\"", "value": "emotional_support"}
  ]'::jsonb,
  'fr', 1.2
);

-- ---------------------------------------------------------------------------
-- ENGLISH — 30 questions (same order, same values, locale = 'en')
-- ---------------------------------------------------------------------------

-- ===== Survival & Chaos (10) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  'If [Name] were dropped in the jungle, how long would they last?',
  'survival', 'multiple_choice',
  '[
    {"label": "2 hours max", "value": "2h"},
    {"label": "1 day, no more", "value": "1day"},
    {"label": "1 week, easy", "value": "1week"},
    {"label": "They become the boss of the jungle", "value": "boss"}
  ]'::jsonb,
  'en', 1.0
),
(
  'During a zombie apocalypse, [Name] would be...',
  'survival', 'multiple_choice',
  '[
    {"label": "The first one infected", "value": "infected"},
    {"label": "The hero who saves everyone", "value": "hero"},
    {"label": "The group traitor", "value": "traitor"},
    {"label": "Already dead before it even starts", "value": "already_dead"}
  ]'::jsonb,
  'en', 1.0
),
(
  'What would most likely kill [Name] in the wilderness?',
  'survival', 'multiple_choice',
  '[
    {"label": "Eats something toxic", "value": "toxic_food"},
    {"label": "Falls asleep in the open", "value": "sleeps_outside"},
    {"label": "Trusts a random stranger", "value": "trusts_stranger"},
    {"label": "Walks in the wrong direction for 3 days", "value": "wrong_direction"}
  ]'::jsonb,
  'en', 1.0
),
(
  'If [Name] had to survive 24h without their phone, they would...',
  'survival', 'multiple_choice',
  '[
    {"label": "Handle it no problem, totally chill", "value": "chill"},
    {"label": "Have a full meltdown after 2 hours", "value": "meltdown"},
    {"label": "Steal someone else''s phone", "value": "steals_phone"},
    {"label": "Pretend to be fine but cry on the inside", "value": "fake_chill"}
  ]'::jsonb,
  'en', 1.0
),
(
  'In a house fire, the first thing [Name] would grab is...',
  'survival', 'multiple_choice',
  '[
    {"label": "Their loved ones", "value": "loved_ones"},
    {"label": "Their phone", "value": "phone"},
    {"label": "Their charger", "value": "charger"},
    {"label": "Nothing — they probably started the fire", "value": "the_problem"}
  ]'::jsonb,
  'en', 1.0
),
(
  'If [Name] had to build a survival shelter, the result would look like...',
  'survival', 'multiple_choice',
  '[
    {"label": "A solid bunker worthy of Bear Grylls", "value": "bunker"},
    {"label": "Three sticks and a leaf", "value": "sticks"},
    {"label": "A Pinterest board of cabins they never built", "value": "pinterest"},
    {"label": "They would delegate it to someone else", "value": "delegated"}
  ]'::jsonb,
  'en', 1.0
),
(
  'During a 48-hour power outage, [Name] would...',
  'survival', 'multiple_choice',
  '[
    {"label": "Light candles and set the mood", "value": "candles"},
    {"label": "Sleep for 47 hours straight", "value": "sleeps"},
    {"label": "Call their parents every hour", "value": "calls_parents"},
    {"label": "Finally read all the books they never got to", "value": "reads"}
  ]'::jsonb,
  'en', 1.0
),
(
  'If [Name] was lost in a forest with no GPS, they would...',
  'survival', 'multiple_choice',
  '[
    {"label": "Follow the sun like a pro", "value": "sun_navigation"},
    {"label": "Walk in circles for hours", "value": "circles"},
    {"label": "Find a random stranger and ask for help", "value": "asks_stranger"},
    {"label": "Build a fire and wait for rescue", "value": "waits_for_help"}
  ]'::jsonb,
  'en', 1.0
),
(
  'What weapon would [Name] choose during an apocalypse?',
  'survival', 'multiple_choice',
  '[
    {"label": "A sharp Swiss army knife", "value": "swiss_knife"},
    {"label": "A baseball bat", "value": "baseball_bat"},
    {"label": "Their natural charm", "value": "charm"},
    {"label": "A spoon (bad choice but they own it)", "value": "spoon"}
  ]'::jsonb,
  'en', 1.0
),
(
  'If [Name] had to pick a survival partner, they would choose...',
  'survival', 'multiple_choice',
  '[
    {"label": "The strongest person physically", "value": "strongest"},
    {"label": "The smartest person in the room", "value": "smartest"},
    {"label": "Whoever has the most food", "value": "has_food"},
    {"label": "Their best friend, even if useless", "value": "best_friend"}
  ]'::jsonb,
  'en', 1.0
);

-- ===== Personality (10) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  'If [Name] were an animal, they would be...',
  'personality', 'multiple_choice',
  '[
    {"label": "A golden retriever (too kind for this world)", "value": "golden"},
    {"label": "A cat (does exactly what they want)", "value": "cat"},
    {"label": "A dolphin (too smart for everyone)", "value": "dolphin"},
    {"label": "A panda (eats and sleeps, that''s it)", "value": "panda"}
  ]'::jsonb,
  'en', 1.5
),
(
  'The worst flaw of [Name] that everyone sees except them...',
  'personality', 'multiple_choice',
  '[
    {"label": "Way too dramatic over nothing", "value": "dramatic"},
    {"label": "Always late, no exceptions", "value": "always_late"},
    {"label": "Constantly talks about themselves", "value": "self_centered"},
    {"label": "Starts 1000 projects and finishes zero", "value": "unfinished"}
  ]'::jsonb,
  'en', 1.5
),
(
  '[Name] at a party is...',
  'personality', 'multiple_choice',
  '[
    {"label": "The absolute center of attention", "value": "center"},
    {"label": "Looking for the exit after 30 minutes", "value": "exit_seeker"},
    {"label": "The one who eats everything on the table", "value": "eats_everything"},
    {"label": "The one remaking the world in a corner", "value": "philosopher"}
  ]'::jsonb,
  'en', 1.5
),
(
  'If [Name] had a superpower, it would definitely be...',
  'personality', 'multiple_choice',
  '[
    {"label": "Mind reading (to know what people think of them)", "value": "mind_reading"},
    {"label": "Teleportation (to escape awkward situations)", "value": "teleportation"},
    {"label": "Invisibility", "value": "invisibility"},
    {"label": "Changing past decisions they regret", "value": "change_past"}
  ]'::jsonb,
  'en', 1.5
),
(
  'How does [Name] react when an unexpected problem hits?',
  'personality', 'multiple_choice',
  '[
    {"label": "Immediate and total panic", "value": "panic"},
    {"label": "Ignores it until it goes away on its own", "value": "ignore"},
    {"label": "Asks everyone around for their opinion", "value": "asks_everyone"},
    {"label": "Finds a creative solution (but a weird one)", "value": "creative_weird"}
  ]'::jsonb,
  'en', 1.5
),
(
  'If [Name] were a movie character, they would be...',
  'personality', 'multiple_choice',
  '[
    {"label": "The lovable main hero", "value": "hero"},
    {"label": "The funny but useless sidekick", "value": "funny_sidekick"},
    {"label": "The misunderstood villain", "value": "misunderstood_villain"},
    {"label": "The one who dies first", "value": "dies_first"}
  ]'::jsonb,
  'en', 1.5
),
(
  'How does [Name] handle a conflict?',
  'personality', 'multiple_choice',
  '[
    {"label": "Faces it head-on with no detours", "value": "direct"},
    {"label": "Avoids it entirely and hopes it disappears", "value": "avoidant"},
    {"label": "Talks about it with everyone except the person involved", "value": "gossips"},
    {"label": "Writes a long message and never sends it", "value": "unsent_message"}
  ]'::jsonb,
  'en', 1.5
),
(
  'What is [Name]''s favourite way to procrastinate?',
  'personality', 'multiple_choice',
  '[
    {"label": "Netflix and deal with it tomorrow", "value": "netflix"},
    {"label": "Cleans and organizes everything (except the actual task)", "value": "cleaning"},
    {"label": "Endless social media scroll", "value": "social_scroll"},
    {"label": "Starts an even more ambitious new project", "value": "new_project"}
  ]'::jsonb,
  'en', 1.5
),
(
  'If [Name] missed their flight, they would...',
  'personality', 'multiple_choice',
  '[
    {"label": "Stay calm and rebook immediately", "value": "calm_rebook"},
    {"label": "Cry at the check-in counter", "value": "cries"},
    {"label": "Blame it on someone else", "value": "blames_others"},
    {"label": "Take it as a sign and just go home", "value": "takes_it_as_sign"}
  ]'::jsonb,
  'en', 1.5
),
(
  'The phrase [Name] says most often that is never true...',
  'personality', 'multiple_choice',
  '[
    {"label": "\"I''ll be there in 5 minutes\"", "value": "5_minutes"},
    {"label": "\"I''ll just watch one episode\"", "value": "one_episode"},
    {"label": "\"This time I won''t procrastinate\"", "value": "no_procrastination"},
    {"label": "\"I''ll reply when I have a moment\"", "value": "reply_soon"}
  ]'::jsonb,
  'en', 1.5
);

-- ===== Dating / Compatibility (5) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  '[Name] on a date...',
  'dating', 'multiple_choice',
  '[
    {"label": "Talks about their exes for 20 minutes", "value": "talks_exes"},
    {"label": "Is perfect, attentive, absolutely irresistible", "value": "perfect"},
    {"label": "Arrives late without apologising", "value": "arrives_late"},
    {"label": "Orders for both without asking", "value": "orders_for_both"}
  ]'::jsonb,
  'en', 1.5
),
(
  'What is [Name]''s type of crush?',
  'dating', 'multiple_choice',
  '[
    {"label": "The unattainable one (naturally)", "value": "unreachable"},
    {"label": "The stable and reassuring one", "value": "stable"},
    {"label": "The fun and totally unpredictable one", "value": "unpredictable"},
    {"label": "Anyone who gives them attention", "value": "any_attention"}
  ]'::jsonb,
  'en', 1.5
),
(
  'How does [Name] flirt?',
  'dating', 'multiple_choice',
  '[
    {"label": "Direct and confident", "value": "direct"},
    {"label": "Pretends not to be flirting", "value": "pretends_not_to"},
    {"label": "Sends memes at 2 AM", "value": "memes_2am"},
    {"label": "Gets their friends to do it for them", "value": "uses_friends"}
  ]'::jsonb,
  'en', 1.5
),
(
  'After a breakup, [Name]...',
  'dating', 'multiple_choice',
  '[
    {"label": "Rebounds in one week flat", "value": "rebounds_fast"},
    {"label": "Listens to sad music for 3 weeks straight", "value": "sad_music"},
    {"label": "Pretends everything is fine while quietly fuming", "value": "pretends_ok"},
    {"label": "Overanalyzes everything for months", "value": "overanalyzes"}
  ]'::jsonb,
  'en', 1.5
),
(
  'What does [Name] really want in a relationship?',
  'dating', 'multiple_choice',
  '[
    {"label": "Someone who gets them without needing to explain", "value": "understanding"},
    {"label": "Adventure and the unexpected", "value": "adventure"},
    {"label": "Stability and security", "value": "stability"},
    {"label": "Someone who replies to messages quickly", "value": "fast_replies"}
  ]'::jsonb,
  'en', 1.5
);

-- ===== Intelligence & Wisdom (5) =====

INSERT INTO questions (text, category, type, options, locale, weight_for_matching) VALUES
(
  'When it comes to directions, [Name] is...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "A human GPS, never gets lost", "value": "human_gps"},
    {"label": "Gets lost on their own street", "value": "lost_own_street"},
    {"label": "Opens Google Maps for anything under 200 metres", "value": "google_200m"},
    {"label": "Always finds their way... purely by luck", "value": "lucky"}
  ]'::jsonb,
  'en', 1.2
),
(
  '[Name]''s decision-making process looks like...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Cold analysis for hours", "value": "cold_analysis"},
    {"label": "Picks at random, like rolling a die", "value": "random"},
    {"label": "Asks 10 people then does it their way anyway", "value": "asks_then_ignores"},
    {"label": "Follows their gut (which is usually wrong)", "value": "wrong_instinct"}
  ]'::jsonb,
  'en', 1.2
),
(
  'If [Name] urgently had to learn something new, they would...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Master it in 24 hours flat", "value": "masters_fast"},
    {"label": "Watch 3 YouTube videos and declare themselves an expert", "value": "youtube_expert"},
    {"label": "Ask someone who actually knows how", "value": "asks_expert"},
    {"label": "Wing it and hope nobody notices", "value": "improvises"}
  ]'::jsonb,
  'en', 1.2
),
(
  'How does [Name] react when they encounter information they don''t know?',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Immediately tries to understand it", "value": "seeks_to_understand"},
    {"label": "Pretends they already knew", "value": "pretends_to_know"},
    {"label": "Subtly changes the subject", "value": "changes_subject"},
    {"label": "Says \"oh yeah of course\" then secretly Googles it", "value": "secret_google"}
  ]'::jsonb,
  'en', 1.2
),
(
  'When someone comes to [Name] with a complicated problem, their advice is...',
  'intelligence', 'multiple_choice',
  '[
    {"label": "Structured, clear, and usually right", "value": "structured_advice"},
    {"label": "\"Trust the process\" (with no further explanation)", "value": "trust_the_process"},
    {"label": "A proverb from out of nowhere", "value": "random_proverb"},
    {"label": "\"I don''t know but I''m here for you\"", "value": "emotional_support"}
  ]'::jsonb,
  'en', 1.2
);
