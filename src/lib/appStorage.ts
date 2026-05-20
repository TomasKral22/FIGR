import { getAuthenticatedUserId, getCloudStateMany, setCloudStateMany, StorageMap } from '@/lib/cloudStorage';

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
    const authenticatedUserId = await getAuthenticatedUserId();
    const localEntries = authenticatedUserId ? null : await getLocalMany(keys);
    const cloudEntries = await getCloudStateMany(keys);

    if (cloudEntries) {
      return Object.fromEntries(keys.map((key) => [key, cloudEntries[key] ?? null]));
    }

    return localEntries ?? Object.fromEntries(keys.map((key) => [key, null]));
  },

  async setMany(entries: Record<string, string>): Promise<void> {
    const authenticatedUserId = await getAuthenticatedUserId();

    if (!authenticatedUserId) {
      await setLocalMany(entries);
      return;
    }

    await setCloudStateMany(entries);
  },

  async getDbPath(): Promise<string | null> {
    const desktopStorage = getDesktopStorage();
    if (!desktopStorage) return null;
    return desktopStorage.getDbPath();
  },
};
