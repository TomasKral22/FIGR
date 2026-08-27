// No browser or React dependencies: the same protocol is tested against an in-memory cloud.
export interface RemoteEntry { value: string | null; updatedAt: string | null }
export interface JournalEntry {
  value: string | null;
  base: RemoteEntry | null;
  pending: boolean;
  conflict?: RemoteEntry;
  localConflict?: boolean;
}
export interface SyncJournal {
  version: 2;
  entries: Record<string, JournalEntry>;
  recoveries: Array<{ at: string; key: string; local: string | null; cloud: RemoteEntry; choice: string }>;
}
export interface SyncReport {
  phase: 'loading' | 'saving' | 'synced' | 'offline' | 'conflict' | 'error';
  pendingWrites: number;
  conflicts: string[];
  lastError: string | null;
  lastSyncedAt?: string;
}
export interface SyncDependencies {
  readLocal(): Promise<string | null>;
  writeLocal(value: string): Promise<void>;
  // A cross-tab lock surrounds every read-modify-write of the durable journal.
  lock<T>(operation: () => Promise<T>): Promise<T>;
  readRemote(keys: string[]): Promise<Record<string, RemoteEntry>>;
  writeRemote(key: string, value: string, expected: RemoteEntry): Promise<RemoteEntry | null>;
  active(): boolean;
  report(state: SyncReport): void;
  readLegacy?(keys: string[]): Promise<Record<string, string>>;
}
const absent = (): RemoteEntry => ({ value: null, updatedAt: null });
const same = (a: RemoteEntry | null, b: RemoteEntry) =>
  a !== null && a.updatedAt === b.updatedAt && a.value === b.value;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isRemote = (value: unknown): value is RemoteEntry => isRecord(value) &&
  (value.value === null || typeof value.value === 'string') &&
  (value.updatedAt === null || typeof value.updatedAt === 'string');

export function parseJournal(raw: string | null): SyncJournal {
  if (raw === null) return { version: 2, entries: {}, recoveries: [] };
  const parsed = JSON.parse(raw) as SyncJournal;
  if (parsed?.version !== 2 || !isRecord(parsed.entries) || !Array.isArray(parsed.recoveries) ||
      !Object.values(parsed.entries).every(e => isRecord(e) &&
        (e.value === null || typeof e.value === 'string') && typeof e.pending === 'boolean' &&
        (e.base === null || isRemote(e.base)) && (e.conflict === undefined || isRemote(e.conflict)))) {
    throw new Error('Lokální kopie dat je nečitelná. Nebyla přepsána; obnovte ji ze zálohy.');
  }
  return parsed;
}

export function createStorageSyncEngine(deps: SyncDependencies) {
  let localQueue: Promise<unknown> = Promise.resolve();
  let flushing: Promise<boolean> | null = null;
  let flushAgain = false;
  let localSaveError: string | null = null;
  const unpersisted = new Map<string, string>();
  const observed = new Map<string, string | null>();
  let lastJournal: SyncJournal = { version: 2, entries: {}, recoveries: [] };
  const assertActive = () => {
    if (!deps.active()) throw new Error('Účet se změnil. Tato operace byla zastavena.');
  };
  const report = (phase: SyncReport['phase'], error: string | null = null) => {
    if (!deps.active()) return;
    const entries = Object.entries(lastJournal.entries);
    const conflicts = entries.filter(([, e]) => e.conflict).map(([key]) => key);
    const pendingWrites = new Set([...entries.filter(([, e]) => e.pending).map(([key]) => key), ...unpersisted.keys()]).size;
    if (localSaveError && unpersisted.size) { phase = 'error'; error = localSaveError; }
    deps.report({ phase: phase === 'synced' && conflicts.length ? 'conflict' : phase,
      pendingWrites, conflicts, lastError: error,
      ...(phase === 'synced' && !pendingWrites ? { lastSyncedAt: new Date().toISOString() } : {}) });
  };
  const transact = <T,>(operation: (journal: SyncJournal) => T | Promise<T>, write = true): Promise<T> => {
    const task = localQueue.catch(() => undefined).then(() => deps.lock(async () => {
      assertActive();
      const journal = parseJournal(await deps.readLocal());
      assertActive();
      const result = await operation(journal);
      assertActive();
      if (write) await deps.writeLocal(JSON.stringify(journal));
      lastJournal = journal;
      return result;
    }));
    localQueue = task;
    return task.catch(error => { report('error', message(error)); throw error; });
  };
  const reconcile = (entry: JournalEntry, remote: RemoteEntry) => {
    // This app clears datasets by saving [], never by deleting a storage row.
    // A disappearing previously-known row may be a permission/project problem: fail closed.
    if (!entry.pending && entry.value !== null && entry.base?.updatedAt && remote.updatedAt === null) {
      entry.pending = true;
      entry.localConflict = true;
      entry.conflict = remote;
      return;
    }
    if (!entry.pending || entry.value === remote.value) {
      entry.value = remote.value;
      entry.base = remote;
      entry.pending = false;
      delete entry.conflict;
      delete entry.localConflict;
    } else if (!entry.localConflict && (same(entry.base, remote) || (entry.base === null && remote.updatedAt === null))) {
      entry.base = remote;
      delete entry.conflict;
    } else {
      entry.conflict = remote;
    }
  };

  const persist = async (entries: Record<string, string>) => {
    assertActive();
    for (const [key, value] of Object.entries(entries)) unpersisted.set(key, value);
    try {
      await transact(j => {
        for (const [key, value] of Object.entries(entries)) {
          const current = j.entries[key];
          if (!current) throw new Error(`Data ${key} nebyla nejprve načtena. Zápis je z bezpečnostních důvodů zastaven.`);
          if (current.value === value) continue;
          if (observed.has(key) && current.value !== observed.get(key)) {
            // Another tab updated the durable copy while this tab was editing it.
            j.recoveries.push({ at: new Date().toISOString(), key, local: current.value,
              cloud: current.base ?? absent(), choice: 'concurrent-local-copy' });
            current.localConflict = true;
            current.conflict = current.base ?? absent();
          }
          current.value = value;
          current.pending = true;
        }
      });

      for (const [key, value] of Object.entries(entries)) {
        observed.set(key, value);
        if (unpersisted.get(key) === value) unpersisted.delete(key);
      }
      if (!unpersisted.size) localSaveError = null;
    } catch (error) {
      localSaveError = message(error);
      report('error', localSaveError);
      throw error;
    }
  };

  const flush = (): Promise<boolean> => {
    if (flushing) { flushAgain = true; return flushing; }
    flushing = (async () => {
      try {
        if (localSaveError && unpersisted.size) await persist(Object.fromEntries(unpersisted));
        do {
          flushAgain = false;
          const keys = await transact(j => Object.keys(j.entries).filter(k => j.entries[k].pending), false);
          report('saving');
          // The probe also verifies connectivity when the queue is empty.
          const remote = await deps.readRemote(keys.length ? keys : ['finance_transactions']);
          assertActive();
          await transact(j => {
            for (const key of keys) if (j.entries[key]?.pending) reconcile(j.entries[key], remote[key] ?? absent());
          });
          for (const key of keys) {
            const snapshot = await transact(j => structuredClone(j.entries[key]), false);
            if (!snapshot?.pending || snapshot.conflict || snapshot.value === null || !snapshot.base) continue;
            assertActive();
            const written = await deps.writeRemote(key, snapshot.value, snapshot.base);
            assertActive();
            if (!written) {
              const latest = (await deps.readRemote([key]))[key] ?? absent();
              await transact(j => reconcile(j.entries[key], latest));
              continue;
            }
            await transact(j => {
              const current = j.entries[key];
              // A response for an older edit must never clear a newer local edit.
              if (!same(current.base, snapshot.base)) return;
              current.base = written;
              current.pending = current.value !== written.value;
              delete current.conflict;
              if (current.pending) flushAgain = true;
            });
          }
        } while (flushAgain && deps.active());
        const pending = Object.values(lastJournal.entries).some(e => e.pending);
        report(pending && !Object.values(lastJournal.entries).some(e => e.conflict) ? 'offline' : 'synced');
        return !pending;
      } catch (error) {
        report('offline', message(error));
        return false;
      } finally { flushing = null; }
    })();
    return flushing;
  };

  return {
    async getMany(keys: string[]): Promise<Record<string, string | null>> {
      await transact(async j => {
        const missing = keys.filter(k => !Object.prototype.hasOwnProperty.call(j.entries, k));
        if (!missing.length || !deps.readLegacy) return;
        const legacy = await deps.readLegacy(missing);
        for (const [key, value] of Object.entries(legacy)) {
          if (!Object.prototype.hasOwnProperty.call(j.entries, key)) j.entries[key] = { value, base: null, pending: true };
        }
      });
      report('loading');
      try {
        const remote = await deps.readRemote(keys);
        assertActive();
        await transact(j => {
          for (const key of keys) {
            const entry = j.entries[key] ?? { value: null, base: null, pending: false };
            const incoming = remote[key] ?? absent();
            if (!entry.pending && entry.value !== null && entry.value !== incoming.value) {
              j.recoveries.push({ at: new Date().toISOString(), key, local: entry.value,
                cloud: incoming, choice: 'incoming-cloud-update' });
            }
            reconcile(entry, incoming);
            j.entries[key] = entry;
          }
        });
        report('synced');
      } catch (error) {
        assertActive();
        const hasCache = await transact(j => keys.every(k => Object.prototype.hasOwnProperty.call(j.entries, k)), false);
        report('offline', message(error));
        if (!hasCache) throw new Error('Cloud nelze načíst a úplná kopie tohoto účtu není v zařízení. Prázdná data se neuložila. Zkuste načtení znovu.');
      }
      const result = await transact(j => Object.fromEntries(keys.map(k => [k, j.entries[k].value])), false);
      for (const [key, value] of Object.entries(result)) observed.set(key, value);
      void flush();
      return result;
    },
    async setMany(entries: Record<string, string>) {
      await persist(entries);
      report('saving');
      // Resolve after the atomic local commit, not after the network request.
      void flush();
    },
    flush,
    async exportRecovery() {
      const journal = await transact(j => structuredClone(j), false);
      return { ...journal, unpersistedEntries: Object.fromEntries(unpersisted) };
    },
    async resolveConflict(key: string, choice: 'local' | 'cloud', expected: RemoteEntry) {
      const remote = (await deps.readRemote([key]))[key] ?? absent();
      assertActive();
      if (!same(remote, expected)) {
        await transact(j => { if (j.entries[key]) reconcile(j.entries[key], remote); });
        report('conflict');
        throw new Error('Cloud se mezitím změnil. Prohlédněte novou verzi a potvrďte výběr znovu.');
      }
      await transact(j => {
        const entry = j.entries[key];
        if (!entry?.conflict) throw new Error('Konflikt už byl vyřešen. Obnovte přehled.');
        j.recoveries.push({ at: new Date().toISOString(), key, local: entry.value, cloud: remote, choice });
        entry.base = remote;
        if (choice === 'cloud') entry.value = remote.value;
        entry.pending = entry.value !== remote.value;
        delete entry.conflict;
        delete entry.localConflict;
        observed.set(key, entry.value);
      });
      await flush();
    },
  };
}
