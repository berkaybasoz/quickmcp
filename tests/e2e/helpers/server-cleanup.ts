import { APIRequestContext } from '@playwright/test';

type ServerListResponse = {
  success?: boolean;
  data?: Array<{
    id?: string;
    name?: string;
  }>;
};

export async function deleteServerByName(request: APIRequestContext, serverName: string): Promise<void> {
  if (!serverName) return;

  const listResponse = await request.get('/api/servers');
  if (!listResponse.ok()) return;

  const payload = (await listResponse.json().catch(() => null)) as ServerListResponse | null;
  const matchingServer = payload?.data?.find((server) => server?.name === serverName);
  const serverId = matchingServer?.id;
  if (!serverId) return;

  await request.delete(`/api/servers/${encodeURIComponent(serverId)}`);
}
