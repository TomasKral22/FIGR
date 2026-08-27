/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface DesktopStorageApi {
  getMany(keys: string[]): Promise<Record<string, string | null>>;
  getManyWithMeta(keys: string[]): Promise<Record<string, { value: string | null; updatedAt: string | null }>>;
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

interface DesktopInvestmentImportFile {
  fileName: string;
  fullPath: string;
  modifiedAt: string;
  size: number;
  fingerprint: string;
}

interface DesktopImportsApi {
  selectFolder(): Promise<string | null>;
  listFiles(folderPath: string): Promise<DesktopInvestmentImportFile[]>;
  readFile(filePath: string): Promise<{ fileName: string; dataBase64: string }>;
}

interface Window {
  desktopApp?: {
    platform: string;
    storage: DesktopStorageApi;
    backup: DesktopBackupApi;
    attachments?: DesktopAttachmentsApi;
    imports?: DesktopImportsApi;
  };
}
