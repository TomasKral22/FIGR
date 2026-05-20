import { AlertTriangle, CheckCircle2, Cloud, Download, HardDrive, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentAuditEntry, InvestmentSyncStatus, InvestmentValidationIssue } from '@/types/investment';

interface InvestmentAuditPanelProps {
  syncStatus: InvestmentSyncStatus;
  validationIssues: InvestmentValidationIssue[];
  auditLog: InvestmentAuditEntry[];
  onRefreshAudit: () => Promise<void>;
  onExportBackup: () => Promise<void>;
  lastPriceRefreshReport: {
    ranAt: string;
    updated: number;
    failed: number;
    failures: string[];
  } | null;
}

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const severityClass = (severity: InvestmentValidationIssue['severity']) => {
  if (severity === 'error') return 'border-destructive/30 bg-destructive/10 text-destructive';
  if (severity === 'warning') return 'border-warning/30 bg-warning/10 text-warning';
  return 'border-primary/30 bg-primary/10 text-primary';
};

export const InvestmentAuditPanel = ({
  syncStatus,
  validationIssues,
  auditLog,
  onRefreshAudit,
  onExportBackup,
  lastPriceRefreshReport,
}: InvestmentAuditPanelProps) => {
  const criticalIssues = validationIssues.filter((issue) => issue.severity === 'error').length;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Audit a duvera v data
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Stav synchronizace, validace dat, posledni akce a export kompletni zalohy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void onRefreshAudit()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Obnovit audit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onExportBackup()}>
            <Download className="mr-2 h-4 w-4" />
            Export zalohy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rezim dat</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              {syncStatus.mode === 'cloud' ? <Cloud className="h-4 w-4 text-primary" /> : <HardDrive className="h-4 w-4 text-primary" />}
              {syncStatus.mode === 'cloud' ? 'Cloud' : 'Lokalni'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{syncStatus.userEmail || 'Bez prihlaseneho uctu'}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Posledni ulozeni</p>
            <p className="mt-2 text-sm font-semibold">{formatDateTime(syncStatus.lastSavedAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Hydratace: {formatDateTime(syncStatus.hydratedAt)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Posledni refresh cen</p>
            <p className="mt-2 text-sm font-semibold">{formatDateTime(syncStatus.lastPriceSyncAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastPriceRefreshReport ? `${lastPriceRefreshReport.updated} uspesnych / ${lastPriceRefreshReport.failed} neuspesnych` : 'Zatim neprobehla davka'}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Zaloha a kriticke chyby</p>
            <p className="mt-2 text-sm font-semibold">{formatDateTime(syncStatus.lastBackupAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Kriticke nalezy: {criticalIssues}
            </p>
          </div>
        </div>

        {lastPriceRefreshReport && lastPriceRefreshReport.failures.length > 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
            <p className="font-medium">Posledni davka cen mela chyby</p>
            <p className="mt-1 text-muted-foreground">
              {formatDateTime(lastPriceRefreshReport.ranAt)} · selhalo {lastPriceRefreshReport.failed} polozek
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {lastPriceRefreshReport.failures.slice(0, 5).map((failure) => (
                <li key={failure}>• {failure}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-3">
            <p className="text-sm font-medium">Validace dat</p>
            {validationIssues.length > 0 ? (
              <div className="space-y-2">
                {validationIssues.map((issue) => (
                  <div key={issue.id} className={`rounded-xl border px-3 py-3 text-sm ${severityClass(issue.severity)}`}>
                    <div className="flex items-center gap-2 font-medium">
                      {issue.severity === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      {issue.title}
                    </div>
                    <p className="mt-1 text-foreground/80">{issue.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-background/50 px-4 py-6 text-sm text-muted-foreground">
                Audit zatim nenasel zadne nesrovnalosti.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Posledni zmeny</p>
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/50 p-3">
              {auditLog.length > 0 ? (
                auditLog.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{entry.actor}</span>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{entry.detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.scope} · {entry.action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Zatim tu nejsou zadne auditni zaznamy.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
