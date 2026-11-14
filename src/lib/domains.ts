import api from './api';

export type AppSurface = 'accounts' | 'market';

const SSO_REDIRECT_STORAGE_KEY = 'pmk_sso_redirect_to';

const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

function resolveSurface(): AppSurface {
  const configured = import.meta.env.VITE_SURFACE as string | undefined;
  if (configured === 'accounts' || configured === 'market') {
    return configured;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'accounts.pumpkinmc.org' || host.startsWith('accounts.')) {
      return 'accounts';
    }
  }

  return 'market';
}

export const APP_SURFACE: AppSurface = resolveSurface();
export const IS_ACCOUNTS_SURFACE: boolean = APP_SURFACE === 'accounts';

export const ACCOUNTS_ORIGIN: string = trimTrailingSlash(
  (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) || 'https://accounts.pumpkinmc.org'
);

export const MARKET_ORIGIN: string = trimTrailingSlash(
  (import.meta.env.VITE_MARKET_URL as string | undefined) || 'https://market.pumpkinmc.org'
);

/**
 * Returns true on deployed sibling subdomains (e.g. `market.pumpkinmc.org`) or when
 * `VITE_ACCOUNTS_URL` is explicitly set, while keeping single-port `localhost` dev self-contained.
 */
export function useCrossSubdomainSso(): boolean {
  if (IS_ACCOUNTS_SURFACE) return false;
  if (import.meta.env.VITE_ACCOUNTS_URL) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host !== 'localhost' && host !== '127.0.0.1';
}

export function getAccountsUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${ACCOUNTS_ORIGIN}${normalized}`;
}

export function getMarketUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${MARKET_ORIGIN}${normalized}`;
}

export function getSsoAuthorizeUrl(returnPathOrUrl?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : MARKET_ORIGIN;
  let targetUrl = `${origin}/`;

  if (returnPathOrUrl) {
    if (returnPathOrUrl.startsWith('http://') || returnPathOrUrl.startsWith('https://')) {
      targetUrl = returnPathOrUrl;
    } else {
      const safePath =
        returnPathOrUrl.startsWith('/') && !returnPathOrUrl.startsWith('//')
          ? returnPathOrUrl
          : '/';
      targetUrl = `${origin}${safePath}`;
    }
  }

  return `${ACCOUNTS_ORIGIN}/api/auth/sso/authorize?redirect_to=${encodeURIComponent(targetUrl)}`;
}

export function rememberSsoRedirectTarget(redirectTo: string | null | undefined): void {
  if (!redirectTo) return;
  try {
    sessionStorage.setItem(SSO_REDIRECT_STORAGE_KEY, redirectTo);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function consumeRememberedSsoRedirectTarget(): string | null {
  try {
    const stored = sessionStorage.getItem(SSO_REDIRECT_STORAGE_KEY);
    if (stored) {
      sessionStorage.removeItem(SSO_REDIRECT_STORAGE_KEY);
    }
    return stored;
  } catch {
    return null;
  }
}

export function getServiceLabelFromRedirect(redirectTo: string | null | undefined): string | null {
  if (!redirectTo) return null;
  try {
    const host = new URL(redirectTo).hostname.toLowerCase();
    if (host.startsWith('market.')) return 'Pumpkin Market';
    if (host.startsWith('servers.')) return 'Pumpkin Servers';
    if (host.endsWith('pumpkinmc.org')) return 'PumpkinMC';
  } catch {
    // Ignore malformed URLs
  }
  return null;
}

/**
 * Completes sign-in on `accounts.pumpkinmc.org` by minting a single-use SSO handoff ticket
 * if a sibling service requested authentication, or navigating locally otherwise.
 */
export async function completePostAuthNavigation(
  explicitRedirectTo: string | null | undefined,
  navigate: (to: string, options?: { replace?: boolean }) => void,
  localFallbackPath?: string
): Promise<void> {
  const remembered = consumeRememberedSsoRedirectTarget();
  const target = explicitRedirectTo || remembered;

  if (target) {
    try {
      const res = await api.post('/auth/sso/ticket', { redirectTo: target });
      if (res.data?.redirectUrl) {
        window.location.replace(res.data.redirectUrl);
        return;
      }
    } catch (err) {
      console.warn('SSO redirect handoff rejected or failed, falling back locally:', err);
    }
  }

  const defaultPath = IS_ACCOUNTS_SURFACE ? '/settings' : '/dashboard';
  const safeLocal =
    localFallbackPath && localFallbackPath.startsWith('/') && !localFallbackPath.startsWith('//')
      ? localFallbackPath
      : defaultPath;
  navigate(safeLocal, { replace: true });
}
