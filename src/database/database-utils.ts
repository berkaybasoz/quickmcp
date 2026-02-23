import { IDataStore } from './datastore';
import { createDataStore, getDataProvider } from './factory';
import { logger } from '../utils/logger';

export interface SafeCreateDataStoreOptions {
  logger?: (message: string, ...args: any[]) => void;
}

export function safeCreateDataStore(options?: SafeCreateDataStoreOptions): IDataStore {
  const log = options?.logger || ((msg: string, ...args: any[]) => logger.error(msg, args[0]));
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
      writeLog: () => Promise.resolve(),
      close: () => {},
      getStats: () => ({ servers: 0, tools: 0, resources: 0 })
    } as unknown as IDataStore;
  }
}
