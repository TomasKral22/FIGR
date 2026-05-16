/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

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

interface DesktopAttachmentDraft {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

interface DesktopSavedAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  previewUrl: string;
  createdAt: string;
  ocrStatus: 'idle' | 'processing' | 'done' | 'failed';
}

interface DesktopAttachmentsApi {
  saveMany(files: DesktopAttachmentDraft[]): Promise<DesktopSavedAttachment[]>;
  open(storagePath: string): Promise<string>;
  remove(storagePath: string): Promise<boolean>;
}

interface Window {
  desktopApp?: {
    platform: string;
    storage: DesktopStorageApi;
    backup: DesktopBackupApi;
    attachments?: DesktopAttachmentsApi;
  };
}
