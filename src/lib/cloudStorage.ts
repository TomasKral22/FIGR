import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { TransactionAttachment } from '@/types/finance';

export type StorageMap = Record<string, string | null>;
export interface StorageEntryWithMeta {
  value: string | null;
  updatedAt: string | null;
}
export type StorageMapWithMeta = Record<string, StorageEntryWithMeta>;

export interface CloudReadResult {
  entries: StorageMapWithMeta;
  error: string | null;
}

const USER_STATE_TABLE = 'user_app_state';
const ATTACHMENT_BUCKET = 'transaction-attachments';

export const getAuthenticatedUserId = async () => {
  if (!isSupabaseConfigured) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
};

const sanitizeFileName = (fileName: string) =>
  String(fileName || 'priloha')
    .split('')
    .map((char) => (char.charCodeAt(0) < 32 ? '-' : char))
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const buildAttachmentStoragePath = (bucket: string, objectPath: string) => `supabase:${bucket}:${objectPath}`;

const parseAttachmentStoragePath = (storagePath?: string) => {
  if (!storagePath?.startsWith('supabase:')) return null;
  const [, bucket, ...pathParts] = storagePath.split(':');
  return bucket && pathParts.length > 0 ? { bucket, objectPath: pathParts.join(':') } : null;
};

export const isCloudStorageEnabled = async () => Boolean(await getAuthenticatedUserId());

const assertCloudUser = async (userId: string) => {
  if ((await getAuthenticatedUserId()) !== userId) throw new Error('Přihlášený účet se změnil. Synchronizace byla zastavena.');
};

export const getCloudStateManyWithMeta = async (keys: string[], userId: string): Promise<StorageMapWithMeta> => {
  await assertCloudUser(userId);

  const { data, error } = await supabase
    .from(USER_STATE_TABLE)
    .select('storage_key, storage_value, updated_at')
    .eq('user_id', userId)
    .in('storage_key', keys)
    .abortSignal(AbortSignal.timeout(15000));

  if (error) {
    throw new Error(error.message);
  }

  await assertCloudUser(userId);

  const map = new Map((data || []).map((row) => [row.storage_key, row]));
  return Object.fromEntries(
      keys.map((key) => {
        const row = map.get(key);
        return [key, { value: row?.storage_value ?? null, updatedAt: row?.updated_at ?? null }];
      })
    );
};

// A conditional write is atomic in Postgres. Never use an unconditional upsert here.
export const compareAndSetCloudState = async (
  userId: string, key: string, value: string, expected: StorageEntryWithMeta
): Promise<StorageEntryWithMeta | null> => {
  await assertCloudUser(userId);
  const request = expected.updatedAt === null
    ? supabase.from(USER_STATE_TABLE).insert({ user_id: userId, storage_key: key, storage_value: value })
    : supabase.from(USER_STATE_TABLE).update({ storage_value: value })
      .eq('user_id', userId).eq('storage_key', key).eq('updated_at', expected.updatedAt);
  const { data, error } = await request.select('storage_value, updated_at')
    .abortSignal(AbortSignal.timeout(15000));
  await assertCloudUser(userId);
  if (error?.code === '23505') return null;
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row ? { value: row.storage_value, updatedAt: row.updated_at } : null;
};

export const saveAttachmentsToCloud = async (
  files: Array<{ fileName: string; mimeType: string; size: number; dataUrl: string }>
): Promise<TransactionAttachment[] | null> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const uploaded: TransactionAttachment[] = [];

  for (const file of files) {
    const safeFileName = sanitizeFileName(file.fileName);
    const objectPath = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    const blob = await fetch(file.dataUrl).then((response) => response.blob());

    const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(objectPath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimeType,
    });

    if (error) {
      console.error('Nepodařilo se nahrát přílohu do cloudu.', error);
      return null;
    }

    uploaded.push({
      id: crypto.randomUUID(),
      fileName: safeFileName,
      mimeType: file.mimeType,
      size: file.size,
      storagePath: buildAttachmentStoragePath(ATTACHMENT_BUCKET, objectPath),
      previewUrl: file.dataUrl,
      createdAt: new Date().toISOString(),
      ocrStatus: 'idle',
    });
  }

  return uploaded;
};

export const openCloudAttachment = async (attachment: TransactionAttachment): Promise<boolean> => {
  const parsed = parseAttachmentStoragePath(attachment.storagePath);
  if (!parsed) return false;

  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60);
  if (error || !data?.signedUrl) {
    console.error('Nepodařilo se otevřít cloudovou přílohu.', error);
    return false;
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  return true;
};

export const removeCloudAttachment = async (attachment: TransactionAttachment): Promise<boolean> => {
  const parsed = parseAttachmentStoragePath(attachment.storagePath);
  if (!parsed) return false;

  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.objectPath]);
  if (error) {
    console.error('Nepodařilo se odstranit cloudovou přílohu.', error);
    return false;
  }

  return true;
};
