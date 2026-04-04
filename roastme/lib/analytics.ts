import { config } from '@/constants/config';

// PostHog analytics wrapper
// Only tracks if user has given analytics consent

let isEnabled = false;

export const analytics = {
  enable: () => {
    isEnabled = true;
    // TODO: Initialize PostHog SDK when analytics consent is given
    // posthog.init(config.posthog.key, { host: config.posthog.host });
  },

  disable: () => {
    isEnabled = false;
    // TODO: posthog.shutdown();
  },

  track: (event: string, properties?: Record<string, unknown>) => {
    if (!isEnabled) return;
    // TODO: posthog.capture(event, properties);
    if (__DEV__) {
      console.log('[Analytics]', event, properties);
    }
  },

  screen: (screenName: string) => {
    if (!isEnabled) return;
    // TODO: posthog.screen(screenName);
    if (__DEV__) {
      console.log('[Analytics:Screen]', screenName);
    }
  },

  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (!isEnabled) return;
    // TODO: posthog.identify(userId, traits);
    if (__DEV__) {
      console.log('[Analytics:Identify]', userId, traits);
    }
  },

  reset: () => {
    if (!isEnabled) return;
    // TODO: posthog.reset();
  },
};
