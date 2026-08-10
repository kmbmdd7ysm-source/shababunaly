import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookies } from '../context/CookieContext';
import { initAnalytics, initHeatmap, trackPage } from '../utils/analytics.ts';

let lastTrackedPath = '';

export function usePageTracking(): void {
  const { pathname, search } = useLocation();
  const { analyticsAllowed } = useCookies();
  useEffect(() => {
    initAnalytics(analyticsAllowed);
    initHeatmap(analyticsAllowed);
    const fullPath = pathname + search;
    if (analyticsAllowed && lastTrackedPath !== fullPath) {
      trackPage(fullPath);
      lastTrackedPath = fullPath;
    }
  }, [pathname, search, analyticsAllowed]);
}
