import { getCloudStateMany, setCloudStateMany, StorageMap } from '@/lib/cloudStorage';

const getDesktopStorage = () =>
  typeof window !== 'undefined' ? window.desktopApp?.storage : undefined;

const getLocalMany = async (keys: string[]): Promise<StorageMap> => {
  const desktopStorage = getDesktopStorage();
  if (desktopStorage) {
    return desktopStorage.getMany(keys);
  }

  return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
};

const setLocalMany = async (entries: Record<string, string>) => {
  const desktopStorage = getDesktopStorage();
  if (desktopStorage) {
    await desktopStorage.setMany(entries);
    return;
  }

  Object.entries(entries).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};

export const appStorage = {
  async getMany(keys: string[]): Promise<StorageMap> {
    const localEntries = await getLocalMany(keys);
    const cloudEntries = await getCloudStateMany(keys);

    if (cloudEntries) {
      return Object.fromEntries(
        keys.map((key) => [key, cloudEntries[key] ?? localEntries[key] ?? null])
      );
    }

    return localEntries;
  },

  async setMany(entries: Record<string, string>): Promise<void> {
    await setLocalMany(entries);
    await setCloudStateMany(entries);
  },

  async getDbPath(): Promise<string | null> {
    const desktopStorage = getDesktopStorage();
    if (!desktopStorage) return null;
    return desktopStorage.getDbPath();
  },
};
