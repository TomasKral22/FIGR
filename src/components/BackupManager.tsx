import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, HardDriveDownload, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupFile {
  fileName: string;
  fullPath: string;
  createdAt: string;
  size: number;
  kind: 'auto' | 'manual';
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export const BackupManager = ({ isOpen, onClose }: BackupManagerProps) => {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [backupDir, setBackupDir] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

  const isDesktop = Boolean(window.desktopApp?.backup);

  const loadBackupData = useCallback(async () => {
    if (!isDesktop) return;

    setLoading(true);
    try {
      const [listedBackups, paths] = await Promise.all([
        window.desktopApp!.backup.list(),
        window.desktopApp!.backup.getPaths(),
      ]);
      setBackups(listedBackups);
      setDbPath(paths.dbPath);
      setBackupDir(paths.backupDir);
    } catch (error) {
      console.error('Failed to load backups:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst záložní soubory.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isDesktop, toast]);

  useEffect(() => {
    if (isOpen) {
      void loadBackupData();
    }
  }, [isOpen, loadBackupData]);

  const lastBackup = useMemo(() => backups[0] ?? null, [backups]);

  const handleCreateBackup = async () => {
    if (!isDesktop) return;

    setCreating(true);
    try {
      await window.desktopApp!.backup.create();
      await loadBackupData();
      toast({
        title: 'Záloha vytvořena',
        description: 'Nová lokální záloha databáze je připravena.',
      });
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se vytvořit zálohu.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (!isDesktop) return;

    const confirmed = window.confirm(
      'Obnova přepíše aktuální databázi a aplikace se restartuje. Chcete pokračovat?'
    );
    if (!confirmed) return;

    setRestoringFile(fileName);
    try {
      await window.desktopApp!.backup.restore(fileName);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setRestoringFile(null);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se obnovit zálohu.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Správa záloh</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {!isDesktop && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Zálohy databáze jsou dostupné jen v desktopové verzi aplikace.
            </div>
          )}

          {isDesktop && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Databáze
                  </div>
                  <p className="mt-2 break-all text-xs text-muted-foreground">{dbPath}</p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HardDriveDownload className="h-4 w-4" />
                    Složka záloh
                  </div>
                  <p className="mt-2 break-all text-xs text-muted-foreground">{backupDir}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Jak to funguje</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aplikace vytváří automatickou zálohu zhruba jednou za 24 hodin a můžeš kdykoli
                  vytvořit i ruční snapshot. Obnova přepíše aktuální databázi a aplikaci restartuje.
                </p>
                {lastBackup && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Poslední záloha: {new Date(lastBackup.createdAt).toLocaleString('cs-CZ')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreateBackup} disabled={creating}>
                  {creating ? 'Vytvářím…' : 'Vytvořit zálohu'}
                </Button>
                <Button variant="outline" onClick={() => void loadBackupData()} disabled={loading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Obnovit seznam
                </Button>
                <Button variant="outline" onClick={() => void window.desktopApp!.backup.openFolder()}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Otevřít složku záloh
                </Button>
              </div>

              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-4 py-3 text-sm font-medium">Dostupné zálohy</div>
                <div className="max-h-80 overflow-y-auto">
                  {backups.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Zatím tu nejsou žádné záložní soubory.
                    </div>
                  ) : (
                    backups.map((backup) => (
                      <div
                        key={backup.fileName}
                        className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{backup.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(backup.createdAt).toLocaleString('cs-CZ')} · {formatFileSize(backup.size)} ·{' '}
                            {backup.kind === 'auto' ? 'automatická' : 'ruční'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRestoreBackup(backup.fileName)}
                          disabled={restoringFile !== null}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {restoringFile === backup.fileName ? 'Obnovuji…' : 'Obnovit'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
