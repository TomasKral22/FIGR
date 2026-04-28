import { AuditLogEntry } from '@/types/finance';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuditLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AuditLogEntry[];
}

export const AuditLogPanel = ({ isOpen, onClose, entries }: AuditLogPanelProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Audit log</DialogTitle>
      </DialogHeader>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            Zatim tu nejsou zadne zaznamy.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{entry.detail}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {entry.type} · {entry.action}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString('cs-CZ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </DialogContent>
  </Dialog>
);
