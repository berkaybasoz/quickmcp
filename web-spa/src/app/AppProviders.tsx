import { PropsWithChildren, useEffect } from 'react';
import { useBootstrapStore } from '../shared/store/bootstrapStore';

export function AppProviders({ children }: PropsWithChildren) {
  const fetchOnce = useBootstrapStore((state) => state.fetchOnce);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce]);

  return <>{children}</>;
}
