import { create } from 'zustand';
import { AuthConfig, AuthMe } from '../types/auth';
import { extractApiData, fetchJson } from '../api/http';

type BootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';

type BootstrapStore = {
  status: BootstrapStatus;
  error: string | null;
  me: AuthMe | null;
  config: AuthConfig | null;
  fetchOnce: () => Promise<void>;
  invalidate: () => void;
};

let bootstrapPromise: Promise<void> | null = null;

export const useBootstrapStore = create<BootstrapStore>((set, get) => ({
  status: 'idle',
  error: null,
  me: null,
  config: null,
  fetchOnce: async () => {
    const current = get();
    if (current.status === 'ready') return;
    if (bootstrapPromise) return bootstrapPromise;

    set({ status: 'loading', error: null });

    bootstrapPromise = (async () => {
      try {
        const [mePayload, configPayload] = await Promise.all([
          fetchJson<any>('/api/auth/me'),
          fetchJson<any>('/api/auth/config')
        ]);

        set({
          me: extractApiData<AuthMe>(mePayload) || null,
          config: extractApiData<AuthConfig>(configPayload) || null,
          status: 'ready',
          error: null
        });
      } catch (error) {
        set({
          status: 'error',
          error: error instanceof Error ? error.message : 'Bootstrap failed'
        });
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },
  invalidate: () => {
    bootstrapPromise = null;
    set({ status: 'idle', error: null, me: null, config: null });
  }
}));
