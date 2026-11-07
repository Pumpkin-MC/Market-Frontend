import type { TFunction } from 'i18next';
import i18n from './i18n';

/**
 * The API may answer with a plain message, a message key, or an error envelope
 * (`{ error, message }`). Extracts a displayable string from any of those shapes.
 */
function extractMessage(message: unknown): string {
  if (!message) return '';
  if (typeof message === 'string') return message.trim();
  if (typeof message === 'object') {
    const envelope = message as { error?: unknown; message?: unknown };
    return extractMessage(envelope.error) || extractMessage(envelope.message);
  }
  return '';
}

const KEY_PATTERN = /^[a-z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/;

// Keys are validated at runtime, so the compile-time key union does not apply.
const translateKey = i18n.t as unknown as (key: string) => string;

/**
 * Translates an API error message when the backend answers with a translation
 * key, otherwise returns the message unchanged. Falls back to the provided
 * fallback text (usually an already translated string) when no message exists.
 */
export function translateApiMessage(t: TFunction, message?: unknown, fallback?: string): string {
  const text = extractMessage(message);
  if (!text) return fallback ?? t('common.error');
  if (KEY_PATTERN.test(text) && i18n.exists(text)) return translateKey(text);
  return text;
}
