import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { TransactionAttachment } from '@/types/finance';

export type StorageMap = Record<string, string | null>;

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

export const getCloudStateMany = async (keys: string[]): Promise<StorageMap | null> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from(USER_STATE_TABLE)
    .select('storage_key, storage_value')
    .eq('user_id', userId)
    .in('storage_key', keys);

  if (error) {
    console.error('Nepodařilo se načíst cloudový stav aplikace.', error);
    return null;
  }

  const map = new Map((data || []).map((row) => [row.storage_key, row.storage_value]));
  return Object.fromEntries(keys.map((key) => [key, map.get(key) ?? null]));
};

export const setCloudStateMany = async (entries: Record<string, string>): Promise<boolean> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const rows = Object.entries(entries).map(([key, value]) => ({
    user_id: userId,
    storage_key: key,
    storage_value: value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from(USER_STATE_TABLE).upsert(rows, {
    onConflict: 'user_id,storage_key',
  });

  if (error) {
    console.error('Nepodařilo se uložit cloudový stav aplikace.', error);
    return false;
  }

  return true;
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
