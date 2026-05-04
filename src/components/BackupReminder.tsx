import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackupReminderProps {
  onOpenBackups: () => void;
}

export const BackupReminder = ({ onOpenBackups }: BackupReminderProps) => {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const load = async () => {
      const api = window.desktopApp?.backup;
      if (!api) return;

      const backups = await api.list();
      const latest = backups[0];
      if (!latest) {
        setShowReminder(true);
        return;
      }

      const ageInDays = (Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      setShowReminder(ageInDays >= 7);
    };

    void load();
  }, []);

  if (!showReminder) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Připomínka zálohy</p>
            <p className="text-sm text-muted-foreground">
              Poslední záloha je starší nebo zatím žádná nevznikla. Doporučuji udělat nový snapshot databáze.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenBackups}>
          Otevřít zálohy
        </Button>
      </div>
    </div>
  );
};
