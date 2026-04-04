/**
 * Thin structured logger wrapper.
 *
 * In production, replace the console.* calls with your observability
 * provider (e.g. Datadog, Sentry breadcrumbs, PostHog).
 *
 * Never call console.log directly in production code — always go through
 * this module so log levels and context are consistent.
 */

type LogContext = Record<string, unknown>;

function formatMessage(level: string, message: string, context?: LogContext): string {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `[${ts}] [${level.toUpperCase()}] ${message}${ctx}`;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.warn(formatMessage('warn', message, context));
  },

  error(message: string, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.error(formatMessage('error', message, context));
  },

  debug(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage('debug', message, context));
    }
  },
};
