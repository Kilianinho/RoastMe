import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';
import { config } from '@/constants/config';

export function generateShareLink(username: string): string {
  return `${config.app.url}/${username}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

export async function shareLink(username: string, message?: string): Promise<void> {
  const link = generateShareLink(username);
  const text = message ?? `Roaste-moi anonymement ! ${link}`;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(link, {
      dialogTitle: 'Partager mon lien RoastMe',
    });
  }
}

export async function shareToWhatsApp(username: string, message?: string): Promise<void> {
  const link = generateShareLink(username);
  const text = encodeURIComponent(message ?? `Roaste-moi anonymement ! ${link}`);
  const url = `whatsapp://send?text=${text}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

export async function shareToInstagram(username: string): Promise<void> {
  // Instagram Stories sharing requires a specific integration
  // For now, open Instagram with a share intent
  const link = generateShareLink(username);
  const url = Platform.select({
    ios: `instagram-stories://share`,
    android: `intent://share#Intent;package=com.instagram.android;end`,
  });

  if (url) {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  }
}

export async function shareToTikTok(username: string): Promise<void> {
  const url = 'https://www.tiktok.com/';
  await Linking.openURL(url);
}
