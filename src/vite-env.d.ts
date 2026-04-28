/// <reference types="vite/client" />

interface DesktopStorageApi {
  getMany(keys: string[]): Promise<Record<string, string | null>>;
  setMany(entries: Record<string, string>): Promise<void>;
  getDbPath(): Promise<string>;
}

interface DesktopBackupFile {
  fileName: string;
  fullPath: string;
  createdAt: string;
  size: number;
  kind: 'auto' | 'manual';
}

interface DesktopBackupApi {
  list(): Promise<DesktopBackupFile[]>;
  create(): Promise<DesktopBackupFile>;
  getPaths(): Promise<{ dbPath: string; backupDir: string }>;
  openFolder(): Promise<string>;
  restore(fileName: string): Promise<{ relaunching: boolean }>;
}

interface Window {
  desktopApp?: {
    platform: string;
    storage: DesktopStorageApi;
    backup: DesktopBackupApi;
  };
}
