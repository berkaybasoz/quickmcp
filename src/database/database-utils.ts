import { IDataStore } from './datastore';
import { createDataStore, getDataProvider } from './factory';

export interface SafeCreateDataStoreOptions {
  logger?: (message: string, ...args: any[]) => void;
}

export function safeCreateDataStore(options?: SafeCreateDataStoreOptions): IDataStore {
  const log = options?.logger || console.error;
  const provider = typeof getDataProvider === 'function' ? getDataProvider() : 'UNKNOWN';
  try {
    return createDataStore();
  } catch (error: any) {
    log(
      `[QuickMCP] Failed to initialize DATA_PROVIDER=${provider}:`,
      error?.message || error
    );
    return {
      getAllTools: () => [],
      getAllResources: () => [],
      getServer: () => null,
      getMcpTokenByHash: () => null,
      getServerAuthConfig: () => null,
      getMcpTokenPolicy: () => null,
      listMcpTokenPolicies: () => [],
      setMcpTokenPolicy: () => {},
      close: () => {},
      getStats: () => ({ servers: 0, tools: 0, resources: 0 })
    } as unknown as IDataStore;
  }
}
