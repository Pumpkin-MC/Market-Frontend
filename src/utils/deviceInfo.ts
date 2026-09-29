/**
 * Returns a human-friendly default name for a passkey based on the current platform and browser.
 * e.g. "Mac (Chrome)", "iPhone (Safari)", "Windows (Edge)", "Android (Chrome)"
 */
export function getDevicePasskeyName(): string {
  if (typeof window === 'undefined' || !navigator?.userAgent) {
    return 'Passkey';
  }

  const ua = navigator.userAgent;

  let os = 'Device';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Windows NT 10.0|Windows NT 11.0/i.test(ua)) os = 'Windows';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera';

  if (os && browser) {
    return `${os} (${browser})`;
  }
  return os || browser || 'Passkey';
}
