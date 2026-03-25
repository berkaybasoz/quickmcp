import { PropsWithChildren, useEffect } from 'react';
import { useBootstrapStore } from '../shared/store/bootstrapStore';

export function AppProviders({ children }: PropsWithChildren) {
  const fetchOnce = useBootstrapStore((state) => state.fetchOnce);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = String(window.location.pathname || '').toLowerCase();
      if (path === '/landing' || path === '/') return;
    }
    void fetchOnce();
  }, [fetchOnce]);

  return <>{children}</>;
}
