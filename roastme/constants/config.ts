import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig?.extra ?? {};

export const config = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  admob: {
    bannerId: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? '',
    interstitialId: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? '',
  },
  revenueCat: {
    iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  },
  posthog: {
    key: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',
  },
  app: {
    url: process.env.EXPO_PUBLIC_APP_URL ?? 'https://roast.me',
    scheme: 'roastme',
  },
  limits: {
    freeQuestionsVisible: 5,
    freeMatchesPerDay: 3,
    minRoastsForResults: 3,
    minRoastsForMatching: 3,
    minCommonQuestionsForMatch: 5,
    matchScoreThreshold: 0.70,
    matchCoupDeFoudreThreshold: 0.85,
    rateLimitSessionsPerHour: 5,
  },
  usernameRegex: /^[a-z0-9_]{3,20}$/,
  reservedUsernames: [
    'admin', 'support', 'help', 'roastme', 'roast', 'api', 'www',
    'app', 'login', 'signup', 'auth', 'settings', 'profile', 'match',
    'chat', 'share', 'premium', 'mod', 'moderator', 'system', 'null',
    'undefined', 'test', 'debug', 'root', 'official',
  ],
};
