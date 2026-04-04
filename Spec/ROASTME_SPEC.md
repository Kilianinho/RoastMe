# 🔥 RoastMe — Product Specification v1.0
> Document destiné à Claude Code pour le développement complet de l'application.

---

## 1. Vision & Concept

**RoastMe** est une application mobile virale où tu partages un lien unique à tes amis, et ceux-ci répondent anonymement à des questions absurdes et humoristiques **sur toi**. Tu découvres ensuite comment les gens te perçoivent vraiment — sans filtre, sans gêne.

**Tagline :** *"Découvre ce que tes amis pensent vraiment de toi."*

### Boucle virale principale
```
Utilisateur crée son profil
        ↓
Génère un lien unique (roast.me/kilian)
        ↓
Partage sur Instagram, WhatsApp, TikTok...
        ↓
Ses contacts répondent anonymement à 10 questions absurdes
        ↓
L'utilisateur voit les résultats agrégés + score
        ↓
Il partage ses résultats pour humilier (ou se vanter) → viralité
```

### Différenciateur clé : Matching de compatibilité
Au-delà du roast, l'app intègre un système de **matching basé sur les réponses**. Les personnes dont les réponses s'alignent (qui auraient répondu pareil aux mêmes questions) peuvent être mises en relation. Avec **filtrage par genre** pour orienter vers du dating ou de l'amitié.

---

## 2. Stack Technique

| Couche | Technologie | Justification |
|---|---|---|
| Mobile | **React Native + Expo SDK 52** | Cross-platform, OTA updates, ecosystem riche |
| Navigation | **Expo Router v3** (file-based) | Standard moderne, deep linking natif |
| Backend | **Supabase** | Auth, PostgreSQL, Realtime, Storage, Edge Functions |
| State | **Zustand** | Léger, simple, suffisant |
| UI Components | **Tamagui** + custom | Performant, design system natif, léger |
| Animations | **React Native Reanimated 3** | Performant, 60fps |
| Monétisation | **react-native-google-mobile-ads** + **RevenueCat** | Ads gratuits + IAP premium |
| Internationalisation | **i18next** + **react-i18next** | Multi-langue, FR par défaut |
| Analytics | **PostHog** (SDK React Native) | Open source, self-hostable |
| Notifications push | **Expo Notifications** | Intégré, simple |
| Partage | **expo-sharing** + **expo-clipboard** | Deep links + copy link |
| Formulaires | **React Hook Form** + **Zod** | Validation robuste |

### Architecture Supabase
- **Auth** : magic link email + OAuth Google + OAuth Apple
- **Database** : PostgreSQL avec RLS (Row Level Security) sur toutes les tables
- **Storage** : avatars utilisateurs
- **Edge Functions** : calcul du score de compatibilité, génération de questions dynamiques
- **Realtime** : notifications temps réel quand quelqu'un roaste

---

## 3. Schéma de Base de Données

```sql
-- Utilisateurs (étend auth.users de Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,           -- slug pour le lien (ex: "kilian")
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not')),
  looking_for TEXT[] DEFAULT '{}',         -- ['male', 'female', 'other'] pour le matching
  is_premium BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,      -- modération : suspension temporaire
  roast_count INTEGER DEFAULT 0,           -- nb de roasts reçus
  share_link TEXT UNIQUE,                  -- URL complète générée
  allow_matching BOOLEAN DEFAULT TRUE,     -- opt-in matching
  last_match_computed_at TIMESTAMPTZ,     -- pour le batch matching (ne recalculer que si nouvelles données)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                  -- soft delete (RGPD droit à l'oubli)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions (bank de questions absurdes)
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,                      -- "Si [prénom] était un animal, ce serait..."
  category TEXT NOT NULL,                  -- 'personality', 'survival', 'chaos', 'dating', 'intelligence'
  type TEXT NOT NULL,                      -- 'multiple_choice', 'scale', 'binary'
  options JSONB,                           -- [{"label": "Un golden retriever", "value": "golden"}, ...]
  locale TEXT DEFAULT 'fr',                -- langue de la question (fr, en, etc.)
  is_active BOOLEAN DEFAULT TRUE,
  weight_for_matching FLOAT DEFAULT 1.0,  -- importance dans l'algo de compatibilité
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions de roast (une session = quelqu'un qui roaste un profil)
CREATE TABLE roast_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roasted_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roaster_session_id UUID NOT NULL,         -- ID anonyme côté client (AsyncStorage, UUID pour cohérence)
  roaster_user_id UUID REFERENCES profiles(id), -- NULL si non connecté
  roaster_gender TEXT,                     -- pour filtrage matching
  is_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Réponses individuelles
CREATE TABLE roast_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES roast_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  answer_value TEXT NOT NULL,              -- valeur de l'option choisie
  answer_label TEXT NOT NULL,             -- label lisible
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- Résultats agrégés (calculés par Edge Function après chaque roast)
CREATE TABLE roast_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  answer_distribution JSONB NOT NULL,     -- {"golden": 12, "cat": 5, "shark": 2}
  total_responses INTEGER NOT NULL,
  top_answer TEXT,
  top_answer_percentage FLOAT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, question_id)
);

-- Matching (paires de compatibilité)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  compatibility_score FLOAT NOT NULL,     -- 0.0 à 1.0
  common_answers INTEGER NOT NULL,        -- nb de questions avec réponses alignées
  status TEXT DEFAULT 'pending'           -- 'pending', 'liked', 'matched', 'passed'
  CHECK (user_a_id < user_b_id),          -- évite doublons
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

-- Actions de match (like/pass)
CREATE TABLE match_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(actor_id, target_id)
);

-- Messages entre matchés
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                      -- 'new_roast', 'new_match', 'new_message'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signalements (modération)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'fake_profile', 'other')),
  description TEXT,                         -- détails optionnels
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocages entre utilisateurs
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Consentements RGPD
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'marketing', 'analytics')),
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address INET,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, consent_type)
);

-- Index de performance
CREATE INDEX idx_roast_sessions_roasted_user ON roast_sessions(roasted_user_id);
CREATE INDEX idx_roast_sessions_completed ON roast_sessions(roasted_user_id, is_completed);
CREATE INDEX idx_roast_answers_session ON roast_answers(session_id);
CREATE INDEX idx_roast_results_profile ON roast_results(profile_id);
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_match_actions_actor ON match_actions(actor_id);
CREATE INDEX idx_messages_match ON messages(match_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_active ON profiles(id) WHERE deleted_at IS NULL;
```

### Row Level Security (RLS)
```sql
-- Profiles : lecture publique, écriture uniquement par le propriétaire
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Roast sessions : le roasté voit ses sessions, les roasters voient les leurs
ALTER TABLE roast_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner sees own roast sessions" ON roast_sessions
  FOR SELECT USING (auth.uid() = roasted_user_id);

-- Roast answers : jamais accessibles directement (uniquement via résultats agrégés)
ALTER TABLE roast_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to answers" ON roast_answers FOR SELECT USING (false);

-- Résultats : le propriétaire du profil voit ses résultats
ALTER TABLE roast_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner sees own results" ON roast_results
  FOR SELECT USING (auth.uid() = profile_id);

-- Roast sessions : INSERT autorisé pour tous (anon + authenticated) — page publique
CREATE POLICY "Anyone can create roast session" ON roast_sessions
  FOR INSERT WITH CHECK (true);

-- Roast answers : INSERT autorisé pour tous (anon + authenticated)
CREATE POLICY "Anyone can submit answers" ON roast_answers
  FOR INSERT WITH CHECK (true);

-- Matches : uniquement les deux parties concernées
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match parties can see match" ON matches
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Reports : l'utilisateur peut créer et voir ses propres signalements
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users see own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Blocks : l'utilisateur gère ses propres blocages
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON blocks
  FOR ALL USING (auth.uid() = blocker_id);

-- Consentements : l'utilisateur gère ses propres consentements
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consents" ON user_consents
  FOR ALL USING (auth.uid() = user_id);

-- Messages : les deux parties du match peuvent voir et envoyer
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match parties can see messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (auth.uid() = matches.user_a_id OR auth.uid() = matches.user_b_id)
    )
  );
CREATE POLICY "Match parties can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (auth.uid() = matches.user_a_id OR auth.uid() = matches.user_b_id)
    )
  );
```

---

## 4. Structure du Projet (Expo Router)

```
roastme/
├── app/
│   ├── _layout.tsx                    # Root layout (providers, theme)
│   ├── index.tsx                      # Landing / Onboarding
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx                  # Login avec magic link
│   │   └── signup.tsx                 # Création profil
│   ├── (tabs)/
│   │   ├── _layout.tsx                # Tab bar navigation
│   │   ├── home.tsx                   # Dashboard résultats
│   │   ├── matches.tsx                # Liste des matchs
│   │   ├── chat/
│   │   │   ├── index.tsx              # Liste conversations
│   │   │   └── [matchId].tsx          # Conversation individuelle
│   │   └── profile.tsx                # Mon profil + settings
│   ├── roast/
│   │   └── [username].tsx             # Page de roast publique (deep link)
│   └── share.tsx                      # Partage de son lien
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   └── Badge.tsx
│   ├── roast/
│   │   ├── QuestionCard.tsx           # Carte de question animée
│   │   ├── AnswerOption.tsx           # Bouton de réponse
│   │   ├── RoastProgress.tsx          # Barre de progression
│   │   ├── ResultCard.tsx             # Affichage d'un résultat
│   │   └── ShareCard.tsx              # Carte à partager (résultats visuels)
│   ├── matching/
│   │   ├── MatchCard.tsx              # Carte de match (swipeable)
│   │   ├── CompatibilityBar.tsx       # Barre de score
│   │   └── MatchBadge.tsx
│   ├── moderation/
│   │   ├── ReportModal.tsx            # Modal de signalement
│   │   └── BlockButton.tsx            # Bouton bloquer utilisateur
│   └── ads/
│       └── BannerAd.tsx               # Composant pub wrappé
├── hooks/
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useRoastResults.ts
│   ├── useMatches.ts
│   └── useNotifications.ts
├── stores/
│   ├── authStore.ts                   # Zustand auth state
│   ├── roastStore.ts                  # État session de roast en cours
│   └── notificationStore.ts
├── lib/
│   ├── supabase.ts                    # Client Supabase configuré
│   ├── analytics.ts                   # PostHog wrapper
│   ├── ads.ts                         # react-native-google-mobile-ads config
│   └── i18n.ts                        # Configuration i18next
├── locales/
│   ├── fr.json                        # Traductions françaises (langue par défaut)
│   └── en.json                        # Traductions anglaises
├── constants/
│   ├── questions.ts                   # Questions fallback (offline)
│   ├── theme.ts                       # Couleurs, fonts, spacing
│   └── config.ts                      # ENV variables
├── utils/
│   ├── shareLink.ts                   # Génération + partage de liens
│   ├── compatibility.ts               # Algo scoring local
│   └── formatters.ts
└── supabase/
    ├── migrations/                    # Fichiers SQL
    └── functions/
        ├── aggregate-roast/           # Edge Function agrégation
        └── compute-matches/           # Edge Function matching
```

---

## 5. Écrans & UX Flow

### 5.1 Onboarding (non connecté)
**Écran 1 — Landing**
- Animation feu/flamme en hero
- Tagline animée : *"Découvre ce que tes amis pensent vraiment de toi 🔥"*
- CTA principal : "Créer mon profil" → signup
- CTA secondaire : "Roaster quelqu'un" (si deep link reçu)

**Écran 2 — Signup**
- Champ : Prénom / pseudo affiché
- Champ : Username (slug, ex: `kilian`) — validation temps réel disponibilité
- Sélecteur : Genre (Male / Female / Other / Prefer not to say)
- Sélecteur : Je cherche (multi-select : Male / Female / Other / Tous) — pour matching
- Bouton : "Continuer avec Google" / "Continuer avec Apple" / Magic Link email

**Écran 3 — Partage immédiat**
- "Ton lien est prêt 🎉"
- Affichage du lien : `roast.me/kilian`
- Bouton "Copier le lien"
- Bouton "Partager sur Instagram"
- Bouton "Partager sur WhatsApp"
- Bouton "Voir mes résultats" (vide pour l'instant)

---

### 5.2 Page de Roast (Deep Link Public — pas besoin d'être connecté)

URL : `roast.me/[username]` ou `exp://roastme/roast/kilian`

**Header** : "Roaste [Prénom] 🔥"  
**Sous-titre** : "Réponds honnêtement. Il/Elle ne saura jamais que c'est toi."

**Flow questions (10 questions) :**
- 1 question par écran, animation slide/swipe entre chaque
- Barre de progression en haut (10 points)
- Question affichée en grand
- Options sous forme de cartes tap-able (2 à 4 options selon la question)
- Animation de sélection (haptic feedback + scale animation)
- Bouton "Suivant" qui apparaît après sélection
- Pas de retour arrière possible (évite la réflexion excessive)

**Écran final — Résumé Roasteur**
- "Roast envoyé ! 🔥"
- Récap de 3 de tes réponses les plus drôles
- CTA : "Crée ton propre profil pour voir ce que tes amis pensent de toi"
- Si connecté : "Voir si vous êtes compatibles" (matching)

---

### 5.3 Dashboard (Tab Home — connecté)

**Header**
- Avatar + "Salut [Prénom] 🔥"
- Badge nombre de nouveaux roasts

**Section "Ton score général"**
- Score affiché sous forme de jauge de feu (0-100)
- Sous-texte dynamique selon score : "Totalement imprévisible 🌪️" / "Fiable comme un golden retriever 🐶"

**Section "Résultats par question"**
- Liste scrollable de cartes, une par question
- Chaque carte affiche :
  - La question
  - Un graphique bar/donut de la distribution des réponses
  - Le pourcentage de la réponse dominante
  - "X personnes ont répondu"
- Verrouillée si < 3 réponses (évite la déduction d'identité)

**Section "Dernière activité"**
- Timeline : "Quelqu'un t'a roasté il y a 2h 🔥"
- Anonyme — jamais de nom affiché

**Bandeau publicitaire** (users gratuits) en bas

---

### 5.4 Partage (Tab Share)

- Lien cliquable + bouton copie
- Cartes visuelles pré-générées partageables :
  - Fond dégradé chaud (orange/rouge/jaune)
  - "X personnes pensent que je survive 3 jours dans la jungle 🌿"
  - Logo RoastMe + lien
- Boutons partage : Instagram Stories, WhatsApp, TikTok, Copier

---

### 5.5 Matching (Tab Matches)

**Header avec filtre genre**
- Toggle : Tous / Hommes / Femmes

**Liste de matchs potentiels**
- Cartes avec : photo, prénom, âge, score de compatibilité (%)
- Badge "XX% compatible"
- Explication : "Vous êtes tous les deux vus comme imprévisibles 🌪️"

**Actions**
- ❤️ Like / ✗ Pass (swipe ou boutons)
- Si match mutuel → notification + ouverture chat automatique

**État vide**
- "Pas encore de matchs... Partage ton lien pour accumuler des réponses !"

---

### 5.6 Chat (Tab Chat — après match mutuel)

- Liste des conversations actives
- Conversation individuelle avec : messages texte, timestamp, indicateur de lecture
- Input + bouton envoi
- Realtime via Supabase Realtime

---

### 5.7 Profil (Tab Profile)

- Photo profil (modifiable)
- Prénom, username
- Stats : Roasts reçus / Matches / Compatibilité moyenne
- Paramètres :
  - Notifications on/off
  - Matching on/off
  - Genre et préférences de matching
  - Compte Premium (RevenueCat)
  - Supprimer mon compte
  - CGU / Politique de confidentialité

---

## 6. Questions (Bank Initiale — 30 questions)

### Catégorie : Survie & Chaos (10)
1. "Si [Prénom] était lâché dans la jungle, il/elle survivrait combien de temps ?"
   - Options : 2h | 1 jour | 1 semaine | Il/Elle devient le boss de la jungle

2. "En cas d'apocalypse zombie, [Prénom] serait..."
   - Options : Le premier infecté | Le héros | Le traître du groupe | Déjà mort depuis longtemps

3. "Quelle serait la cause la plus probable de sa mort en pleine nature ?"
   - Options : Mange quelque chose de toxique | S'endort à découvert | Fait confiance à un inconnu | Marche dans la mauvaise direction

4. "Si [Prénom] devait survivre 24h sans téléphone, il/elle..."
   - Options : Gère tranquille | Pète un câble après 2h | Vole le téléphone de quelqu'un | Fait semblant d'aller bien mais pleure intérieurement

5. "En cas d'incendie, [Prénom] prendrait en premier..."
   - Options : Ses proches | Son téléphone | Son chargeur | Rien, il/elle est le problème

### Catégorie : Personnalité (10)
6. "Si [Prénom] était un animal, ce serait..."
   - Options : Un golden retriever (trop gentil) | Un chat (fait ce qu'il veut) | Un dauphin (trop intelligent) | Un panda (mange et dort)

7. "Son pire défaut que tout le monde voit mais lui/elle pas..."
   - Options : Trop dramatique | Toujours en retard | Parle trop de lui/elle | Commence 1000 projets, finit zéro

8. "[Prénom] en soirée, c'est..."
   - Options : Le centre de l'attention | Celui qui cherche la sortie après 30min | Celui qui mange tout | Celui qui refait le monde dans un coin

9. "Si [Prénom] avait un superpouvoir, ce serait forcément..."
   - Options : Lire dans les pensées (pour savoir ce qu'on pense de lui/elle) | Téléportation (fuir les situations awkward) | Invisibilité | Changer les décisions déjà prises

10. "Sa réaction face à un problème ?"
    - Options : Panique immédiate | Ignore jusqu'à ce que ça parte | Demande l'aide de tout le monde | Trouve une solution créative (mais bizarre)

### Catégorie : Compatibilité / Dating (5)
11. "[Prénom] en date, il/elle..."
    - Options : Parle de ses ex | Est parfait(e) | Arrive en retard | Commande pour deux

12. "Son type de crush ?"
    - Options : L'inaccessible | Le/La stable et rassurant(e) | Le/La fun et imprévisible | N'importe qui qui lui fait de l'attention

### Catégorie : Intelligence & Sagesse (5)
13. "Niveau sens de l'orientation, [Prénom] c'est..."
    - Options : GPS humain | Se perd dans sa propre rue | Demande à Google même pour 200m | Se retrouve toujours (par chance)

14. "Sa prise de décision ressemble à..."
    - Options : Analyse pendant des heures | Choisit au hasard | Demande l'avis de 10 personnes puis fait à sa tête | Suit son instinct (souvent faux)

---

## 7. Algorithme de Compatibilité

### Principe
Le matching est basé sur la **convergence des perceptions** : deux personnes qui ont été vues de façon similaire par leurs entourages respectifs sont considérées comme compatibles.

### Calcul du score (Edge Function `compute-matches`)

```typescript
// Pour chaque question ayant du poids (weight_for_matching > 0)
// On compare la réponse dominante (top_answer) de chaque profil

function computeCompatibility(profileA: RoastResults[], profileB: RoastResults[]): number {
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const resultA of profileA) {
    const resultB = profileB.find(r => r.question_id === resultA.question_id);
    if (!resultB) continue;

    const question = getQuestion(resultA.question_id);
    const weight = question.weight_for_matching;
    totalWeight += weight;

    // Match si la réponse dominante est identique
    if (resultA.top_answer === resultB.top_answer) {
      // Score pondéré par la certitude (% de la réponse dominante)
      const confidence = (resultA.top_answer_percentage + resultB.top_answer_percentage) / 2;
      matchedWeight += weight * (confidence / 100);
    }
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0;
}
```

### Seuils
- Score ≥ 0.70 → Match suggéré
- Score ≥ 0.85 → Match "Coup de foudre" (badge spécial)
- Minimum 5 questions en commun pour calculer (sinon pas assez de données)
- Minimum 3 roasts reçus par profil pour entrer dans le matching

### Exécution (Batch — toutes les 15 minutes)
- Un **cron job Supabase** (pg_cron ou cron externe) déclenche `compute-matches` toutes les 15 minutes
- La fonction ne traite que les profils ayant reçu de **nouvelles données** depuis le dernier calcul (flag `last_match_computed_at` sur `profiles`)
- Comparaison uniquement avec les profils éligibles (≥3 roasts, matching activé, non bloqués, préférences de genre compatibles)
- Résultats stockés/mis à jour dans la table `matches`
- Avantage : coût maîtrisé, regroupe les calculs, scalable

---

## 8. Monétisation

### Gratuit
- Roasts envoyés **illimités** (ne jamais freiner la viralité)
- Voir ses résultats pour **5 questions** (les 5 premières)
- **3 matchs visibles par jour**
- Publicités (bannière + interstitiel entre sessions de roast)

### Premium — 4,99€/mois ou 29,99€/an (RevenueCat)
- Voir **tous ses résultats** (toutes les questions débloquées)
- **Matchs illimités**
- Badge "Premium" sur le profil
- **Statistiques avancées** (évolution dans le temps, tendances)
- **Aucune publicité**
- Priorité dans l'algo de matching
- **Voir qui t'a roasté** (indice : genre + heure, jamais l'identité exacte)

### Paywall placement
- En tentant de voir le 6ème résultat → soft paywall avec preview flouté
- En tentant de voir le 4ème match de la journée
- Interstitiel après chaque 3ème roast envoyé (non bloquant, juste une pub)

---

## 9. Notifications Push

| Événement | Titre | Corps |
|---|---|---|
| Nouveau roast reçu | "🔥 Quelqu'un t'a roasté !" | "Tu as reçu un nouveau roast. Découvre ce qu'ils pensent de toi." |
| 5 roasts reçus | "🎯 5 personnes t'ont roasté !" | "Tes résultats se précisent, viens voir !" |
| Nouveau match | "❤️ Nouveau match !" | "[Prénom] et toi êtes compatibles à XX%" |
| Match mutuel | "🔥 C'est un match !" | "Vous vous êtes tous les deux likés. Lancez la conversation !" |
| Nouveau message | "💬 Nouveau message" | "[Prénom] t'a écrit quelque chose..." |
| Relance 48h inactif | "👀 Tu as [N] roasts qui t'attendent" | "Tes amis ont répondu, viens voir ce qu'ils pensent vraiment !" |

---

## 10. Considérations Techniques Importantes

### Deep Linking
```json
// app.json
{
  "expo": {
    "scheme": "roastme",
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      ["expo-router", {
        "origin": "https://roast.me"
      }]
    ]
  }
}
```
Les liens `https://roast.me/[username]` redirigent vers l'app (Universal Links iOS / App Links Android).  
Fallback web si l'app n'est pas installée → page web légère avec CTA download.

### Anonymat des répondants
- Aucun nom ou identifiant personnel des roasteurs n'est stocké dans les résultats
- `roaster_session_id` = UUID généré côté client, stocké en AsyncStorage (jamais lié à un compte sans consentement explicite)
- Les réponses individuelles ne sont **jamais** accessibles via API par le propriétaire du profil
- Seules les **agrégations** sont visibles (avec minimum 3 réponses pour éviter la déduction)

### Anti-abus
- Rate limiting sur la route de création de session : 5 sessions/heure par IP
- Validation que le `username` existe avant de démarrer une session
- **Validation username** : regex `^[a-z0-9_]{3,20}$`, mots réservés bloqués (admin, support, help, roastme, etc.)
- Impossible de se roaster soi-même (vérification si connecté)
- **Honeypot field** sur la page de roast publique (champ caché, si rempli = bot)
- Filtre de contenu si ajout de questions personnalisées (v2)
- **Blocage** : les utilisateurs bloqués ne peuvent pas roaster, matcher ou envoyer de messages

### Performance
- Questions pré-chargées au démarrage (cache local, refresh toutes les 24h)
- Images et avatars via Supabase Storage + CDN
- Pagination infinie sur la liste de matchs (20 par page)
- Optimistic updates pour les actions like/pass

---

## 11. Politique de Modération

### Principes
- **Tolérance zéro** pour le harcèlement, les menaces, le contenu haineux ou les images inappropriées
- Les questions sont pré-rédigées et validées (pas de contenu généré par les utilisateurs en v1)
- Le chat est le seul espace de contenu libre → c'est là que la modération est critique

### Signalement
- Bouton "Signaler" accessible depuis : profil utilisateur, conversation chat, carte de match
- Raisons proposées : spam, harcèlement, contenu inapproprié, faux profil, autre
- Champ description optionnel pour le contexte
- Confirmation visuelle : "Signalement envoyé, merci"

### Traitement des signalements
- **Automatique (v1)** : si un utilisateur reçoit ≥3 signalements de sources différentes → compte temporairement suspendu (flag `is_suspended` sur `profiles`) + notification
- **Manuel (v2)** : dashboard admin pour review des signalements en attente
- Actions possibles : avertissement, suspension temporaire (7j), ban permanent (soft delete)

### Blocage entre utilisateurs
- Un utilisateur bloqué :
  - Ne peut plus roaster le profil du bloqueur
  - Disparaît de la liste de matchs du bloqueur
  - Ne peut plus envoyer de messages
  - Ne reçoit aucune notification de blocage (silencieux)
- Le blocage est unidirectionnel (A bloque B ≠ B bloque A)

### Chat
- Pas de modération automatique du contenu des messages en v1 (trop complexe)
- En v2 : filtre de mots-clés toxiques via une Edge Function avant insertion
- Possibilité de signaler un message spécifique (stocké via `reported_message_id`)

---

## 12. RGPD / CNIL — Conformité Données Personnelles

### Données collectées
| Donnée | Base légale | Durée de conservation |
|---|---|---|
| Email, prénom, username | Exécution du contrat | Durée du compte + 30 jours après suppression |
| Genre, préférences matching | Consentement explicite | Durée du compte |
| Réponses de roast (agrégées) | Intérêt légitime | Durée du profil roasté |
| Réponses individuelles | Intérêt légitime | 90 jours puis anonymisation |
| Adresse IP (rate limiting) | Intérêt légitime | 7 jours |
| Analytics (PostHog) | Consentement | Durée du consentement |
| Messages chat | Exécution du contrat | Durée du match + 30 jours |

### Consentements requis (écran signup)
1. **CGU + Politique de confidentialité** — obligatoire (case à cocher, pas pré-cochée)
2. **Analytics / cookies** — optionnel (opt-in)
3. **Notifications marketing** — optionnel (opt-in)

Tous les consentements sont horodatés et stockés dans `user_consents` avec l'IP.

### Droits des utilisateurs (implémentés dans l'app)
- **Droit d'accès** : bouton "Télécharger mes données" dans Profil → Edge Function qui exporte en JSON (profil, résultats agrégés, matchs, messages)
- **Droit de rectification** : modification du profil à tout moment
- **Droit à l'effacement** : bouton "Supprimer mon compte" → soft delete (`deleted_at` renseigné), données anonymisées après 30 jours, suppression définitive après 90 jours
- **Droit à la portabilité** : export JSON (même endpoint que le droit d'accès)
- **Droit d'opposition** : désactivation du matching, désactivation des analytics

### Suppression de compte — Flow technique
1. L'utilisateur clique "Supprimer mon compte" → confirmation par re-saisie du mot de passe ou magic link
2. `profiles.deleted_at` = NOW()
3. Le profil disparaît de tous les matchs, recherches, et résultats publics
4. Les réponses de roast agrégées sont conservées (anonymisées, liées au profil supprimé)
5. Après 30 jours : anonymisation complète (username → `deleted_user_xxx`, avatar supprimé)
6. Après 90 jours : suppression physique de toutes les données liées

### Sous-traitants
- **Supabase** (hébergement DB, auth, storage) — DPA signé, données EU (région Frankfurt)
- **PostHog** (analytics) — instance EU (`eu.posthog.com`)
- **RevenueCat** (paiements) — conforme RGPD
- **Google AdMob** (publicité) — consentement requis avant affichage de pubs personnalisées

### DPO / Contact
- Email de contact données personnelles : `privacy@roast.me`
- Mention dans les CGU et la politique de confidentialité

---

## 13. Internationalisation (i18n)

### Stratégie
- **Langue par défaut** : Français (FR)
- **Langue secondaire (v1)** : Anglais (EN)
- **Détection automatique** : langue du téléphone → fallback FR
- **Changement manuel** : sélecteur dans Profil > Paramètres

### Architecture technique
- **i18next** + **react-i18next** pour la gestion des traductions
- Fichiers JSON par langue dans `locales/fr.json` et `locales/en.json`
- Clés de traduction organisées par écran : `home.title`, `roast.question`, `match.badge`, etc.
- Les questions de la banque sont stockées en DB avec un champ `locale` (FR par défaut)
- Les questions sont filtrées par la langue de l'utilisateur

### Ce qui est traduit
- Toute l'interface (labels, boutons, messages d'erreur, toasts)
- Les questions de roast (dupliquées par langue en DB)
- Les notifications push (templates par langue)
- Les emails transactionnels (magic link, etc.)

### Ce qui n'est PAS traduit (v1)
- Les messages de chat entre utilisateurs (contenu libre)
- Les usernames et display names

### Ajout d'une nouvelle langue (v2+)
1. Créer `locales/xx.json` avec toutes les clés
2. Traduire les questions en DB pour le nouveau locale
3. Ajouter le locale dans le sélecteur de langue

---

## 14. Variables d'Environnement (inchangé)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# AdMob
EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-xxx~xxx
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-xxx~xxx
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-xxx/xxx
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-xxx/xxx

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx

# PostHog
EXPO_PUBLIC_POSTHOG_KEY=phc_xxx
EXPO_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# App Config
EXPO_PUBLIC_APP_URL=https://roast.me
```

---

## 15. Roadmap de Développement

### Phase 1 — MVP (Semaines 1-4)
- [ ] Setup projet Expo + Tamagui + Supabase + Expo Router
- [ ] Configuration i18n (i18next, FR + EN)
- [ ] Auth (Google + Apple + Magic Link)
- [ ] Écran de consentements RGPD (CGU, analytics, marketing)
- [ ] Création profil + validation username (regex + mots réservés)
- [ ] Page de roast publique (deep link) + honeypot anti-bot
- [ ] 20 questions initiales en base (FR + EN)
- [ ] Système de réponses anonymes
- [ ] Agrégation résultats (Edge Function)
- [ ] Dashboard résultats basique (5 questions gratuites, reste flouté)
- [ ] Système de partage de lien + redirect store

### Phase 2 — Rétention & Monétisation (Semaines 5-7)
- [ ] Notifications push (nouveau roast)
- [ ] Cartes visuelles partageables (stories)
- [ ] react-native-google-mobile-ads intégration
- [ ] RevenueCat + Paywall (visibilité résultats + matchs)
- [ ] Onboarding amélioré
- [ ] Signalement (profil + messages) + blocage utilisateurs
- [ ] Suspension automatique (≥3 signalements)

### Phase 3 — Matching (Semaines 8-11)
- [ ] Algo de compatibilité batch (Edge Function cron 15min)
- [ ] Interface matching (liste + actions like/pass)
- [ ] Chat temps réel (Supabase Realtime)
- [ ] Filtrage par genre + exclusion des bloqués
- [ ] Notifications match + message
- [ ] Export données personnelles (droit d'accès RGPD)
- [ ] Suppression de compte (soft delete + anonymisation)

### Phase 4 — Croissance (Semaines 12+)
- [ ] Dashboard admin modération (review signalements)
- [ ] Filtre contenu automatique sur le chat
- [ ] Questions personnalisées (utilisateur crée ses propres questions)
- [ ] Classement / Leaderboard (les profils les plus roastés)
- [ ] Mode "Roast Battle" (deux personnes se roastent mutuellement)
- [ ] Analytics dashboard (PostHog)
- [ ] Nouvelles langues (ES, DE, etc.)
- [ ] Optimisations ASO + referral program

---

## 16. Design System

### Couleurs
```typescript
export const colors = {
  // Primaire — Feu
  primary: '#FF4500',        // OrangeRed vif
  primaryLight: '#FF6B35',
  primaryDark: '#CC3700',

  // Secondaire — Chaleur
  secondary: '#FFB800',      // Ambre
  secondaryLight: '#FFCC4D',

  // Fond
  background: '#0D0D0D',     // Noir profond
  surface: '#1A1A1A',        // Gris très foncé
  surfaceElevated: '#252525',

  // Texte
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',

  // Statuts
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Match
  matchGold: '#FFD700',
};
```

### Typography
```typescript
export const typography = {
  fontDisplay: 'Bebas Neue',     // Titres impactants
  fontBody: 'DM Sans',           // Corps de texte
  fontMono: 'JetBrains Mono',   // Codes, stats

  sizes: {
    xs: 12, sm: 14, md: 16,
    lg: 18, xl: 24, xxl: 32, xxxl: 48,
  },
};
```

### Composants clés
- **QuestionCard** : fond `surface`, border radius 20, shadow chaude, texte question en `fontDisplay` taille xl
- **AnswerOption** : bords arrondis 12, border 1px `#333`, selected → border `primary` + fond `primary` 15% opacity + scale 1.02
- **MatchCard** : gradient horizontal de `surface` vers `surfaceElevated`, badge compatibilité en `matchGold`
- **BannerAd** : séparé visuellement avec border top `#2A2A2A`, label "Publicité" en `textMuted`

---

## 17. Instructions spécifiques pour Claude Code

1. **Commencer par le setup** : `npx create-expo-app@latest roastme --template tabs` puis installer Tamagui et les dépendances.

2. **i18n dès le départ** : Configurer i18next avant d'écrire le premier écran. Toutes les chaînes de caractères passent par `t()`.

3. **Supabase d'abord** : Créer le projet Supabase (région EU Frankfurt), exécuter les migrations SQL dans l'ordre, activer RLS sur toutes les tables, configurer les providers OAuth.

4. **Questions en seed** : Insérer les 30 questions initiales (FR + EN) via un fichier `seed.sql` dans `supabase/migrations/`.

5. **Edge Functions** : Écrire `aggregate-roast` et `compute-matches` en TypeScript (Deno runtime de Supabase). `compute-matches` est appelée par cron (pas en temps réel).

6. **Tests de la page de roast en priorité** : C'est le cœur viral de l'app. Elle doit fonctionner sans compte, être rapide, et l'expérience doit être irréprochable.

7. **Variables d'env** : Utiliser `expo-constants` pour accéder aux variables dans le code, jamais hardcoder.

8. **Gestion des erreurs** : Toujours afficher un état d'erreur gracieux (pas de crash silencieux). Utiliser des toasts (react-native-toast-message).

9. **Accessibilité** : Labels `accessibilityLabel` sur tous les éléments interactifs, minimum touch target 44x44pts.

10. **TypeScript strict** : `"strict": true` dans tsconfig, pas de `any` sauf cas exceptionnel documenté.

11. **Format du code** : ESLint + Prettier configurés, imports organisés (externe → interne → relatif).

12. **RGPD** : Écran de consentement au signup (avant toute collecte). Ne jamais activer PostHog/AdMob sans consentement analytics/marketing accordé.

13. **Modération** : Implémenter le signalement et le blocage dès la Phase 2 — ne pas lancer le chat sans ces garde-fous.
