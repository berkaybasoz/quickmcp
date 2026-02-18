import { IDataStore } from './datastore';

export type IAsyncDataStore = {
  [K in keyof IDataStore]:
    IDataStore[K] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<Awaited<R>>
      : never;
};

export function createAsyncDataStore(store: IDataStore): IAsyncDataStore {
  return new Proxy({} as IAsyncDataStore, {
    get(_target, prop) {
      const member = (store as any)[prop];
      if (typeof member !== 'function') {
        return member;
      }
      return (...args: any[]) => Promise.resolve(member.apply(store, args));
    }
  });
}

