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

async function fetchAuthMeOptional(): Promise<AuthMe | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.status === 401) {
    return null;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as any)?.error || (payload as any)?.message || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return extractApiData<AuthMe>(payload) || null;
}

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
        const [me, configPayload] = await Promise.all([
          fetchAuthMeOptional(),
          fetchJson<any>('/api/auth/config')
        ]);

        set({
          me,
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
