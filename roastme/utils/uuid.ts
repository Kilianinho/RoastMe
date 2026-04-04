/**
 * Generates a RFC 4122 v4 UUID.
 *
 * Uses `crypto.randomUUID()` when available (Hermes >= 0.73 / React Native >= 0.73).
 * Falls back to a Math.random-based implementation for older runtimes.
 *
 * @returns A lowercase UUID string.
 */
export function generateUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback: RFC 4122 v4 via Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
