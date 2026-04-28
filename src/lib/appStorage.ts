type StorageMap = Record<string, string | null>;

const desktopStorage = typeof window !== 'undefined' ? window.desktopApp?.storage : undefined;

export const appStorage = {
  async getMany(keys: string[]): Promise<StorageMap> {
    if (desktopStorage) {
      return desktopStorage.getMany(keys);
    }

    return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  },

  async setMany(entries: Record<string, string>): Promise<void> {
    if (desktopStorage) {
      await desktopStorage.setMany(entries);
      return;
    }

    Object.entries(entries).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  },

  async getDbPath(): Promise<string | null> {
    if (!desktopStorage) return null;
    return desktopStorage.getDbPath();
  },
};
