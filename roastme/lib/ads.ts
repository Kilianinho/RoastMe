import { config } from '@/constants/config';

// react-native-google-mobile-ads wrapper
// Only shows ads if user is not premium and has marketing consent

let isEnabled = false;

export const ads = {
  enable: () => {
    isEnabled = true;
    // TODO: Initialize MobileAds when marketing consent is given
    // import { MobileAds } from 'react-native-google-mobile-ads';
    // MobileAds().initialize();
  },

  disable: () => {
    isEnabled = false;
  },

  shouldShowAds: (isPremium: boolean): boolean => {
    return isEnabled && !isPremium;
  },

  getBannerId: (): string => {
    return config.admob.bannerId;
  },

  getInterstitialId: (): string => {
    return config.admob.interstitialId;
  },
};
