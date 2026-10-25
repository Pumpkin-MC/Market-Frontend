/**
 * GDPR & ePrivacy Compliant Cookie and Analytics Consent Manager
 */

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  timestamp: string;
  version: number;
}

const CONSENT_STORAGE_KEY = 'pumpkin_cookie_consent';
const CONSENT_VERSION = 1;
const GA_MEASUREMENT_ID = 'G-QK7NXQQ2ZP';

// Ensure dataLayer & gtag are initialized early
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: CookieConsent = JSON.parse(raw);
    if (parsed.version === CONSENT_VERSION && typeof parsed.analytics === 'boolean') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function hasConsentDecided(): boolean {
  return getStoredConsent() !== null;
}

export function saveConsent(analyticsAllowed: boolean): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    analytics: analyticsAllowed,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch (e) {
    console.error('Failed to store cookie consent', e);
  }

  applyConsent(consent);
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consent }));
  return consent;
}

export function deleteAnalyticsCookies() {
  const cookies = document.cookie.split(';');
  const domain = window.location.hostname;
  const domainParts = domain.split('.');
  const rootDomain = domainParts.length > 1 ? '.' + domainParts.slice(-2).join('.') : domain;

  for (const cookie of cookies) {
    const cookieName = cookie.split('=')[0].trim();
    if (cookieName === '_ga' || cookieName.startsWith('_ga_') || cookieName === '_gid' || cookieName === '_gat') {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${rootDomain};`;
    }
  }
}

export function applyConsent(consent: CookieConsent | null) {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  if (consent && consent.analytics) {
    // Grant analytics storage and configure IP anonymization
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    // Ensure GA script tag is loaded
    if (!document.getElementById('ga-script')) {
      const script = document.createElement('script');
      script.id = 'ga-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);

      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        send_page_view: true,
      });
    }
  } else {
    // Deny analytics storage and clean up any tracking cookies
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    deleteAnalyticsCookies();
  }
}

export function openCookiePreferencesModal() {
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
}
