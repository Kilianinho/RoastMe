import i18n from '@/lib/i18n';

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMin < 1) return i18n.t('time.justNow');
  if (diffMin < 60) return i18n.t('time.minutesAgo', { count: diffMin });
  if (diffHours < 24) return i18n.t('time.hoursAgo', { count: diffHours });
  if (diffDays < 7) return i18n.t('time.daysAgo', { count: diffDays });
  return i18n.t('time.weeksAgo', { count: diffWeeks });
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
  return `${(num / 1000000).toFixed(1)}M`;
}

export function getFireScoreLabel(score: number): string {
  if (score >= 90) return 'Légende vivante';
  if (score >= 80) return 'Absolument iconique';
  if (score >= 70) return 'Totalement imprévisible';
  if (score >= 60) return 'Force tranquille';
  if (score >= 50) return 'Fiable comme un golden retriever';
  if (score >= 40) return 'Mystère ambulant';
  if (score >= 30) return 'Électron libre';
  if (score >= 20) return 'Sous-estimé(e)';
  return 'Inclassable';
}
