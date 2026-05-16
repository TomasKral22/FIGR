import { useCallback, useRef, useState } from 'react';
import { FileText, ImagePlus, LoaderCircle, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TransactionAttachment } from '@/types/finance';
import { openCloudAttachment, removeCloudAttachment, saveAttachmentsToCloud } from '@/lib/cloudStorage';

interface TransactionAttachmentInputProps {
  attachments: TransactionAttachment[];
  onChange: (attachments: TransactionAttachment[]) => void;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const TransactionAttachmentInput = ({ attachments, onChange }: TransactionAttachmentInputProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveFiles = useCallback(
    async (files: File[]) => {
      const allowed = files.filter((file) => ACCEPTED_TYPES.includes(file.type));
      if (allowed.length === 0) return;

      setIsSaving(true);
      try {
        const preparedFiles = await Promise.all(
          allowed.map(async (file) => ({
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            dataUrl: await readFileAsDataUrl(file),
          }))
        );

        const cloudSaved = await saveAttachmentsToCloud(preparedFiles);
        if (cloudSaved) {
          onChange([...attachments, ...cloudSaved]);
          return;
        }

        if (window.desktopApp?.attachments) {
          const saved = await window.desktopApp.attachments.saveMany(
            preparedFiles.map(({ fileName, mimeType, dataUrl }) => ({
              fileName,
              mimeType,
              dataUrl,
            }))
          );

          onChange([
            ...attachments,
            ...saved.map((attachment) => ({
              ...attachment,
            })),
          ]);
          return;
        }

        onChange([
          ...attachments,
          ...preparedFiles.map((file) => ({
            id: crypto.randomUUID(),
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
            previewUrl: file.dataUrl,
            createdAt: new Date().toISOString(),
            ocrStatus: 'idle' as const,
          })),
        ]);
      } finally {
        setIsSaving(false);
      }
    },
    [attachments, onChange]
  );

  const openAttachment = useCallback(async (attachment: TransactionAttachment) => {
    if (attachment.storagePath?.startsWith('supabase:')) {
      const opened = await openCloudAttachment(attachment);
      if (opened) return;
    }

    if (attachment.storagePath && window.desktopApp?.attachments) {
      await window.desktopApp.attachments.open(attachment.storagePath);
      return;
    }

    if (attachment.previewUrl) {
      window.open(attachment.previewUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const removeAttachment = useCallback(
    async (attachment: TransactionAttachment) => {
      if (attachment.storagePath?.startsWith('supabase:')) {
        await removeCloudAttachment(attachment);
      }

      if (attachment.storagePath && window.desktopApp?.attachments) {
        await window.desktopApp.attachments.remove(attachment.storagePath);
      }

      onChange(attachments.filter((item) => item.id !== attachment.id));
    },
    [attachments, onChange]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      await saveFiles(Array.from(fileList));
    },
    [saveFiles]
  );

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-xl border border-dashed border-border bg-card/50 p-4 transition-colors',
          isDragging && 'border-primary bg-primary/5'
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onPaste={(event) => {
          const clipboardFiles = Array.from(event.clipboardData.files || []);
          if (clipboardFiles.length > 0) {
            void saveFiles(clipboardFiles);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Přiložit účtenku nebo screenshot</p>
            <p className="text-xs text-muted-foreground">
              Podporujeme PNG, JPG, WEBP a PDF. Obrázek můžeš přetáhnout sem nebo vložit přes schránku.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Vybrat soubory
          </Button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {attachments.map((attachment) => {
            const isImage = attachment.mimeType.startsWith('image/');
            return (
              <div
                key={attachment.id}
                className="rounded-xl border border-border bg-card/70 p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} kB
                      {attachment.ocrStatus === 'processing' ? ' · OCR běží' : ''}
                      {attachment.ocrStatus === 'failed' ? ' · OCR se nepodařilo' : ''}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void removeAttachment(attachment)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-2 text-left transition-colors hover:bg-accent/40"
                  onClick={() => void openAttachment(attachment)}
                >
                  {isImage ? (
                    attachment.previewUrl ? (
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.fileName}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Otevřít přílohu</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.ocrResult?.amount
                        ? `OCR: nalezená částka ${attachment.ocrResult.amount.toLocaleString('cs-CZ')} Kč`
                        : 'OCR je volitelné a zatím přílohu nijak neblokuje.'}
                    </p>
                  </div>
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
