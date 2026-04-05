// PostHog analytics wrapper.
// Tracks only after the user has granted analytics consent via the consent screen.
//
// PostHog integration path (when account is ready):
//   1. `npm install posthog-react-native`
//   2. Replace the __DEV__ console stubs below with posthog.* calls.
//   3. The public API surface (enable/disable/track/screen/identify/reset) stays identical.

import { config } from '@/constants/config';

// Module-level flag — survives re-renders, resets on app restart (cold start).
// Consent is re-hydrated from Supabase on auth init, so this is fine.
let isEnabled = false;

export const analytics = {
  /**
   * Enable analytics tracking. Call this once the user has granted consent.
   * When PostHog is integrated, initialise the SDK here.
   */
  enable: (): void => {
    isEnabled = true;
    // PostHog integration point:
    // posthog.init(config.posthog.key, { host: config.posthog.host });
    if (__DEV__) {
      console.log('[Analytics] enabled (PostHog host:', config.posthog.host, ')');
    }
  },

  /**
   * Disable analytics tracking and flush/shut down the SDK.
   * Call this when the user revokes consent.
   */
  disable: (): void => {
    isEnabled = false;
    // PostHog integration point:
    // posthog.shutdown();
    if (__DEV__) {
      console.log('[Analytics] disabled');
    }
  },

  /**
   * Track a named event with optional properties.
   *
   * @param event - Event name (e.g. 'match_liked', 'roast_completed')
   * @param properties - Arbitrary key/value metadata for the event
   */
  track: (event: string, properties?: Record<string, unknown>): void => {
    if (!isEnabled) return;
    // PostHog integration point:
    // posthog.capture(event, properties);
    if (__DEV__) {
      console.log('[Analytics:track]', event, properties ?? {});
    }
  },

  /**
   * Record a screen view.
   *
   * @param screenName - The screen/route name (e.g. 'home', 'profile')
   * @param properties - Optional additional properties
   */
  screen: (screenName: string, properties?: Record<string, unknown>): void => {
    if (!isEnabled) return;
    // PostHog integration point:
    // posthog.screen(screenName, properties);
    if (__DEV__) {
      console.log('[Analytics:screen]', screenName, properties ?? {});
    }
  },

  /**
   * Identify an authenticated user so subsequent events are attributed to them.
   *
   * @param userId - Supabase auth user UUID
   * @param traits - Optional user traits (e.g. is_premium, locale)
   */
  identify: (userId: string, traits?: Record<string, unknown>): void => {
    if (!isEnabled) return;
    // PostHog integration point:
    // posthog.identify(userId, traits);
    if (__DEV__) {
      console.log('[Analytics:identify]', userId, traits ?? {});
    }
  },

  /**
   * Reset the analytics identity. Call on sign-out so the next session
   * is not attributed to the previous user.
   */
  reset: (): void => {
    if (!isEnabled) return;
    // PostHog integration point:
    // posthog.reset();
    if (__DEV__) {
      console.log('[Analytics:reset]');
    }
  },
};
