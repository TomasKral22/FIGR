import { compareAndSetCloudState, getCloudStateManyWithMeta, type StorageMap } from '@/lib/cloudStorage';
import { createStorageSyncEngine, type RemoteEntry } from '@/lib/storageSyncEngine';
import { storageSyncStore } from '@/lib/storageSyncState';

export interface AppStorageClient {
  getMany(keys: string[]): Promise<StorageMap>;
  setMany(entries: Record<string, string>): Promise<void>;
}
let owner: string | null = null;
let generation = 0;
const engines = new Map<string, ReturnType<typeof createStorageSyncEngine>>();
const desktop = () => typeof window !== 'undefined' ? window.desktopApp?.storage : undefined;
const read = async (keys: string[]): Promise<StorageMap> => desktop()
  ? desktop()!.getMany(keys)
  : Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
const write = async (entries: Record<string, string>) => {
  if (desktop()) { await desktop()!.setMany(entries); return; }
  for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
};
const engineFor = (userId: string, revision: number) => {
  const id = `${userId}:${revision}`;
  let engine = engines.get(id);
  if (!engine) {
    const journalKey = `cloud-user:${userId}:__figr_sync_journal_v2`;
    engine = createStorageSyncEngine({
      active: () => owner === userId && generation === revision,
      readLocal: async () => (await read([journalKey]))[journalKey],
      writeLocal: value => write({ [journalKey]: value }),
      lock: operation => navigator.locks ? navigator.locks.request(journalKey, operation) : operation(),
      readRemote: keys => getCloudStateManyWithMeta(keys, userId),
      writeRemote: (key, value, expected) => compareAndSetCloudState(userId, key, value, expected),
      report: state => storageSyncStore.update({ mode: 'cloud', ...state }),
      // Only migrate caches explicitly owned by this account. Unscoped data is never guessed.
      readLegacy: async keys => {
        const prefix = `cloud-user:${userId}:`;
        const pendingKey = `${prefix}__figr_cloud_pending_writes_v1`;
        const stored = await read([...keys.map(key => prefix + key), pendingKey]);
        const pending = stored[pendingKey] ? JSON.parse(stored[pendingKey]) : {};
        if (!pending || typeof pending !== 'object' || Array.isArray(pending) ||
            !Object.values(pending).every(value => typeof value === 'string')) {
          throw new Error('Původní fronta změn je poškozená. Nebyla přepsána.');
        }
        return { ...Object.fromEntries(keys.filter(key => stored[prefix + key] !== null)
          .map(key => [key, stored[prefix + key]!])), ...pending };
      },
    });
    engines.set(id, engine);
  }
  return engine;
};

export const appStorage = {
  bindUser(userId: string | null) {
    if (userId === owner) return;
    owner = userId;
    generation += 1;
    engines.clear();
    storageSyncStore.reset(userId ? 'cloud' : 'local');
  },
  forUser(userId: string | null): AppStorageClient {
    const revision = generation;
    const active = () => {
      if (owner !== userId || generation !== revision) throw new Error('Účet se změnil; stará operace byla zastavena.');
    };
    return {
      async getMany(keys) {
        active();
        if (userId) return engineFor(userId, revision).getMany(keys);
        const values = await read(keys);
        active();
        return values;
      },
      async setMany(entries) {
        active();
        try {
          if (userId) await engineFor(userId, revision).setMany(entries);
          else await write(entries);
        } catch (error) {
          if (owner === userId && revision === generation) storageSyncStore.update({ phase: 'error',
            lastError: error instanceof Error ? error.message : 'Zápis do zařízení selhal.' });
          throw error;
        }
      },
    };
  },
  getMany(keys: string[]) { return this.forUser(owner).getMany(keys); },
  setMany(entries: Record<string, string>) { return this.forUser(owner).setMany(entries); },
  async retryCloudSync() { return owner ? engineFor(owner, generation).flush() : false; },
  async exportRecovery() { return owner ? engineFor(owner, generation).exportRecovery() : null; },
  async resolveConflict(key: string, choice: 'local' | 'cloud', expected: RemoteEntry) {
    if (!owner) throw new Error('Přihlaste se ke svému účtu.');
    return engineFor(owner, generation).resolveConflict(key, choice, expected);
  },
  async getDbPath(): Promise<string | null> { return desktop()?.getDbPath() ?? null; },
};
