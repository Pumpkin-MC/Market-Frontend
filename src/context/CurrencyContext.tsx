/**
 * CurrencyContext
 *
 * Provides `currency`, `setCurrency`, and `formatPrice(cents)` throughout the app.
 * The preferred currency is read from the JWT claims (via AuthContext) so it's available
 * immediately without an extra API call.  When the user saves a new currency in settings,
 * we call `login()` with the refreshed token — the context automatically picks up the change.
 */

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../../App';

// ISO 4217 currency metadata used for the settings select and price formatting.
export interface CurrencyMeta {
  code: string;
  label: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'EUR', label: 'Euro',                symbol: '€',  locale: 'de-DE' },
  { code: 'USD', label: 'US Dollar',           symbol: '$',  locale: 'en-US' },
  { code: 'GBP', label: 'British Pound',       symbol: '£',  locale: 'en-GB' },
  { code: 'JPY', label: 'Japanese Yen',        symbol: '¥',  locale: 'ja-JP' },
  { code: 'CAD', label: 'Canadian Dollar',     symbol: 'CA$',locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar',   symbol: 'A$', locale: 'en-AU' },
  { code: 'CHF', label: 'Swiss Franc',         symbol: 'Fr', locale: 'de-CH' },
  { code: 'CNY', label: 'Chinese Yuan',        symbol: '¥',  locale: 'zh-CN' },
  { code: 'SEK', label: 'Swedish Krona',       symbol: 'kr', locale: 'sv-SE' },
  { code: 'NOK', label: 'Norwegian Krone',     symbol: 'kr', locale: 'nb-NO' },
  { code: 'DKK', label: 'Danish Krone',        symbol: 'kr', locale: 'da-DK' },
  { code: 'NZD', label: 'New Zealand Dollar',  symbol: 'NZ$',locale: 'en-NZ' },
  { code: 'SGD', label: 'Singapore Dollar',    symbol: 'S$', locale: 'en-SG' },
  { code: 'HKD', label: 'Hong Kong Dollar',    symbol: 'HK$',locale: 'zh-HK' },
  { code: 'KRW', label: 'South Korean Won',    symbol: '₩',  locale: 'ko-KR' },
  { code: 'BRL', label: 'Brazilian Real',      symbol: 'R$', locale: 'pt-BR' },
  { code: 'INR', label: 'Indian Rupee',        symbol: '₹',  locale: 'en-IN' },
  { code: 'MXN', label: 'Mexican Peso',        symbol: 'MX$',locale: 'es-MX' },
  { code: 'PLN', label: 'Polish Złoty',        symbol: 'zł', locale: 'pl-PL' },
  { code: 'CZK', label: 'Czech Koruna',        symbol: 'Kč', locale: 'cs-CZ' },
  { code: 'HUF', label: 'Hungarian Forint',    symbol: 'Ft', locale: 'hu-HU' },
  { code: 'RON', label: 'Romanian Leu',        symbol: 'lei',locale: 'ro-RO' },
  { code: 'BGN', label: 'Bulgarian Lev',       symbol: 'лв', locale: 'bg-BG' },
  { code: 'TRY', label: 'Turkish Lira',        symbol: '₺',  locale: 'tr-TR' },
  { code: 'ZAR', label: 'South African Rand',  symbol: 'R',  locale: 'en-ZA' },
  { code: 'ILS', label: 'Israeli Shekel',      symbol: '₪',  locale: 'he-IL' },
  { code: 'AED', label: 'UAE Dirham',          symbol: 'د.إ',locale: 'ar-AE' },
  { code: 'SAR', label: 'Saudi Riyal',         symbol: '﷼',  locale: 'ar-SA' },
  { code: 'THB', label: 'Thai Baht',           symbol: '฿',  locale: 'th-TH' },
  { code: 'MYR', label: 'Malaysian Ringgit',   symbol: 'RM', locale: 'ms-MY' },
  { code: 'IDR', label: 'Indonesian Rupiah',   symbol: 'Rp', locale: 'id-ID' },
  { code: 'PHP', label: 'Philippine Peso',     symbol: '₱',  locale: 'fil-PH'},
  { code: 'VND', label: 'Vietnamese Dong',     symbol: '₫',  locale: 'vi-VN' },
  { code: 'NGN', label: 'Nigerian Naira',      symbol: '₦',  locale: 'en-NG' },
  { code: 'EGP', label: 'Egyptian Pound',      symbol: '£',  locale: 'ar-EG' },
  { code: 'UAH', label: 'Ukrainian Hryvnia',   symbol: '₴',  locale: 'uk-UA' },
];

/**
 * Approximate EUR → other currency exchange rates.
 * These are static approximations for display purposes only — actual charges are
 * always processed in EUR. A production app would fetch live rates from an API.
 */
const EUR_RATES: Record<string, number> = {
  EUR: 1,      USD: 1.08,   GBP: 0.86,   JPY: 163,    CAD: 1.47,
  AUD: 1.65,   CHF: 0.96,   CNY: 7.82,   SEK: 11.5,   NOK: 11.4,
  DKK: 7.46,   NZD: 1.79,   SGD: 1.45,   HKD: 8.44,   KRW: 1455,
  BRL: 5.4,    INR: 89.8,   MXN: 18.5,   PLN: 4.3,    CZK: 25.3,
  HUF: 390,    RON: 4.97,   BGN: 1.96,   TRY: 34.6,   ZAR: 20.2,
  ILS: 4.01,   AED: 3.97,   SAR: 4.05,   THB: 37.7,   MYR: 5.05,
  IDR: 17200,  PHP: 62.1,   VND: 26900,  NGN: 1780,   EGP: 52.7,
  UAH: 44.7,
};

export interface CurrencyContextValue {
  currency: string;
  currencyMeta: CurrencyMeta;
  /** Format EUR cents into the user's preferred display currency */
  formatPrice: (eurCents: number) => string;
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Hook to access the currency context. Falls back to EUR if used outside the provider. */
export const useCurrency = (): CurrencyContextValue => {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  // Fallback so hooks in non-provider-wrapped code don't crash during init.
  return {
    currency: 'EUR',
    currencyMeta: SUPPORTED_CURRENCIES[0],
    formatPrice: (cents) =>
      new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100),
  };
};

/** Drop this provider at the root of your app (inside AuthContext) */
export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const value = useMemo<CurrencyContextValue>(() => {
    const code = (user as any)?.preferred_currency || 'EUR';
    const meta = SUPPORTED_CURRENCIES.find(c => c.code === code) ?? SUPPORTED_CURRENCIES[0];
    const rate = EUR_RATES[code] ?? 1;

    const formatPrice = (eurCents: number): string => {
      if (eurCents === 0) return 'Free';
      const amount = (eurCents / 100) * rate;
      try {
        return new Intl.NumberFormat(meta.locale, {
          style: 'currency',
          currency: meta.code,
          maximumFractionDigits: meta.code === 'JPY' || meta.code === 'KRW' || meta.code === 'IDR' || meta.code === 'VND' ? 0 : 2,
        }).format(amount);
      } catch {
        return `${meta.symbol}${amount.toFixed(2)}`;
      }
    };

    return { currency: code, currencyMeta: meta, formatPrice };
  }, [user]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};
