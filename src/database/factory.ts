import { IDataStore } from './datastore';
import { JdbcDataStore } from './jdbc-manager';
import { SQLiteManager } from './sqlite-manager';
import { SupabaseDataStore } from './supabase-manager';
import { resolveDataProvider } from '../config/auth-config';

let singleton: IDataStore | null = null;

export function getDataProvider(): string {
  return resolveDataProvider();
}

export function createDataStore(): IDataStore {
  if (singleton) {
    return singleton;
  }

  const provider = getDataProvider();
  switch (provider) {
    case 'SQLITE':
      singleton = new SQLiteManager();
      return singleton;
    case 'JDBC':
      singleton = new JdbcDataStore();
      return singleton;
    case 'SUPABASE':
      singleton = new SupabaseDataStore();
      return singleton;
    default:
      throw new Error(`Unsupported DATA_PROVIDER: ${provider}`);
  }
}
