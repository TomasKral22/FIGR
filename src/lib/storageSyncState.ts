import { useSyncExternalStore } from 'react';

export type StorageSyncPhase = 'local' | 'loading' | 'saving' | 'synced' | 'offline' | 'conflict' | 'error';

export interface StorageSyncState {
  mode: 'local' | 'cloud';
  phase: StorageSyncPhase;
  pendingWrites: number;
  conflicts: string[];
  lastSyncedAt: string | null;
  lastError: string | null;
}

const DEFAULT_STATE: StorageSyncState = {
  mode: 'local',
  phase: 'local',
  pendingWrites: 0,
  conflicts: [],
  lastSyncedAt: null,
  lastError: null,
};

let currentState = DEFAULT_STATE;
const listeners = new Set<() => void>();

export const storageSyncStore = {
  reset: (mode: StorageSyncState['mode']) => {
    currentState = { ...DEFAULT_STATE, mode, phase: mode === 'cloud' ? 'loading' : 'local' };
    listeners.forEach(listener => listener());
  },
  getSnapshot: () => currentState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  update: (update: Partial<StorageSyncState>) => {
    const nextState = { ...currentState, ...update };
    if (JSON.stringify(nextState) === JSON.stringify(currentState)) return;
    currentState = nextState;
    listeners.forEach((listener) => listener());
  },
};

export const useStorageSyncState = () =>
  useSyncExternalStore(storageSyncStore.subscribe, storageSyncStore.getSnapshot, storageSyncStore.getSnapshot);
