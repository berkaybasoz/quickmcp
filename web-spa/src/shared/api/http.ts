export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    ...init
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (body as any)?.error || (body as any)?.message || `HTTP ${response.status}`;
    throw new Error(String(message));
  }

  return body as T;
}

export function extractApiData<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
