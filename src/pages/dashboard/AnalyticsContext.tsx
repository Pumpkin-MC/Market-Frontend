import { createContext, useContext } from 'react';

/**
 * AnalyticsContext — shared across all dashboard sub-pages so the analytics
 * data is fetched exactly once per timeframe change, not once per mounted tab.
 */

export type AnalyticsContextValue = ReturnType<typeof import('./useAnalytics').useAnalytics>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AnalyticsContext = createContext<any>(null);

export const useAnalyticsContext = () => {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error('useAnalyticsContext must be used inside <AnalyticsProvider>');
  }
  return ctx;
};
