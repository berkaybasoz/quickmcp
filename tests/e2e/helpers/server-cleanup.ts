import { APIRequestContext } from '@playwright/test';

type ServerListItem = {
  id?: string;
  name?: string;
};

type ServerListResponse = {
  data?: ServerListItem[];
};

export async function deleteServerByName(request: APIRequestContext, serverName: string): Promise<void> {
  if (!serverName) return;

  const listResponse = await request.get('/api/servers');
  if (!listResponse.ok()) return;

  const payload = (await listResponse.json().catch(() => null)) as ServerListResponse | null;
  const matchingServerIds = (payload?.data || [])
    .filter((server) => server?.name === serverName && typeof server?.id === 'string' && server.id.length > 0)
    .map((server) => server.id as string);
  if (matchingServerIds.length === 0) return;

  await Promise.all(
    matchingServerIds.map((serverId) =>
      request.delete(`/api/servers/${encodeURIComponent(serverId)}`)
    )
  );
}
