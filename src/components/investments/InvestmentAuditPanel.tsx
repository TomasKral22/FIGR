import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CloudOff,
  Database,
  Download,
  HardDrive,
  History,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { InvestmentAuditEntry, InvestmentSyncStatus, InvestmentValidationIssue } from '@/types/investment';
import { appStorage } from '@/lib/appStorage';
import { useStorageSyncState } from '@/lib/storageSyncState';

interface InvestmentAuditPanelProps {
  syncStatus: InvestmentSyncStatus;
  validationIssues: InvestmentValidationIssue[];
  auditLog: InvestmentAuditEntry[];
  onRefreshAudit: () => Promise<InvestmentValidationIssue[] | void>;
  onExportBackup: () => Promise<void>;
  dataSummary: {
    assets: number;
    transactions: number;
    prices: number;
    sourceAccounts: number;
    trackedInvestments: number;
    creditInvestments: number;
    valueSnapshots: number;
  };
  lastPriceRefreshReport: {
    ranAt: string;
    updated: number;
    failed: number;
    failures: string[];
  } | null;
}

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }) : 'Zatím neproběhlo';

const severityClass = (severity: InvestmentValidationIssue['severity']) => {
  if (severity === 'error') return 'border-destructive/30 bg-destructive/5';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/5';
  return 'border-primary/20 bg-primary/5';
};

export const InvestmentAuditPanel = ({
  syncStatus,
  validationIssues,
  auditLog,
  onRefreshAudit,
  onExportBackup,
  dataSummary,
  lastPriceRefreshReport,
}: InvestmentAuditPanelProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const storageSync = useStorageSyncState();

  const errors = validationIssues.filter((issue) => issue.severity === 'error').length;
  const warnings = validationIssues.filter((issue) => issue.severity === 'warning').length;
  const hasData = Object.values(dataSummary).some((count) => count > 0);
  const positionCount = dataSummary.assets + dataSummary.trackedInvestments + dataSummary.creditInvestments;
  const severityOrder: Record<InvestmentValidationIssue['severity'], number> = { error: 0, warning: 1, info: 2 };
  const orderedIssues = [...validationIssues].sort(
    (left, right) => severityOrder[left.severity] - severityOrder[right.severity]
  );
  const visibleIssues = showAllIssues ? orderedIssues : orderedIssues.slice(0, 5);
  const hasSyncProblem = storageSync.phase === 'offline' || storageSync.phase === 'error' || storageSync.conflicts.length > 0;
  const isSyncBusy = storageSync.phase === 'loading' || storageSync.phase === 'saving';

  const status = !hasData
    ? {
        title: 'Čekám na investiční data',
        detail: 'Přidejte účet nebo importujte transakce. Pak tady uvidíte skutečnou kontrolu kvality dat.',
        className: 'border-border bg-muted/30',
        icon: <Database className="h-5 w-5 text-muted-foreground" />,
      }
    : errors > 0
      ? {
          title: 'Data potřebují opravit',
          detail: errors === 1
            ? 'Jeden vážný problém ovlivňuje výpočet portfolia.'
            : `${errors} vážných problémů může ovlivnit výpočet portfolia.`,
          className: 'border-destructive/30 bg-destructive/5',
          icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
        }
      : warnings > 0
        ? {
            title: 'Data jsou použitelná s výhradami',
            detail: `${warnings} ${warnings === 1 ? 'položka potřebuje' : 'položek potřebuje'} pozornost, ale data lze dál používat.`,
            className: 'border-amber-500/30 bg-amber-500/5',
            icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          }
        : {
            title: 'Data jsou v pořádku',
            detail: 'Nenašel jsem nic, co by bránilo správnému výpočtu portfolia.',
            className: 'border-emerald-500/30 bg-emerald-500/5',
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshAudit();
      setLastCheckedAt(new Date().toISOString());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Stav investičních dat
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Jednoduchá kontrola, jestli se dá portfoliu věřit a co případně opravit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={isRefreshing}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Kontroluji…' : 'Zkontrolovat data'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onExportBackup()}>
            <Download className="mr-2 h-4 w-4" />
            Stáhnout zálohu
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className={cn('flex items-start gap-3 rounded-xl border p-4', status.className)}>
          <div className="mt-0.5">{status.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{status.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{status.detail}</p>
            {lastCheckedAt ? (
              <p className="mt-2 text-xs text-muted-foreground">Naposledy ručně zkontrolováno: {formatDateTime(lastCheckedAt)}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {syncStatus.mode === 'cloud' ? <Cloud className="h-4 w-4 text-primary" /> : <HardDrive className="h-4 w-4 text-primary" />}
              Uložení dat
            </div>
            <p className="mt-2 text-sm font-semibold">{syncStatus.mode === 'cloud' ? 'Supabase cloud' : 'Pouze toto zařízení'}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {syncStatus.userEmail || 'Bez přihlášeného účtu'}
            </p>
            {syncStatus.mode === 'cloud' ? (
              <div className={cn('mt-2 flex items-center gap-2 text-xs', hasSyncProblem ? 'text-amber-600' : 'text-muted-foreground')}>
                {isSyncBusy ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : hasSyncProblem ? (
                  <CloudOff className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
                <span>
                  {isSyncBusy
                    ? 'Synchronizuji změny…'
                    : storageSync.conflicts.length
                      ? `${storageSync.conflicts.length} konfliktů vyžaduje rozhodnutí`
                    : hasSyncProblem
                      ? `${storageSync.pendingWrites} změn čeká na odeslání`
                      : 'Lokální cache a cloud jsou synchronní'}
                </span>
                {hasSyncProblem ? (
                  <button type="button" className="font-medium underline underline-offset-2" onClick={() => storageSync.conflicts.length ? window.dispatchEvent(new Event('figr:sync-details')) : void appStorage.retryCloudSync()}>
                    {storageSync.conflicts.length ? 'Vyřešit konflikt' : 'Zkusit znovu'}
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Poslední změna: {formatDateTime(syncStatus.lastSavedAt)}</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-primary" />
              Co je načtené
            </div>
            <p className="mt-2 text-sm font-semibold">
              {positionCount} pozic · {dataSummary.transactions} transakcí
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dataSummary.sourceAccounts} zdrojů · {dataSummary.prices} cen · {dataSummary.valueSnapshots} snapshotů
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Načteno: {formatDateTime(syncStatus.hydratedAt)}</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-primary" />
              Aktuálnost cen
            </div>
            <p className="mt-2 text-sm font-semibold">{formatDateTime(syncStatus.lastPriceSyncAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastPriceRefreshReport
                ? `${lastPriceRefreshReport.updated} aktualizováno · ${lastPriceRefreshReport.failed} selhalo`
                : 'Automatická aktualizace zatím neproběhla'}
            </p>
          </div>
        </div>

        {validationIssues.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Co potřebuje pozornost</p>
              <p className="text-xs text-muted-foreground">{errors} vážných · {warnings} upozornění</p>
            </div>
            <div className="space-y-2">
              {visibleIssues.map((issue) => (
                <div key={issue.id} className={cn('rounded-xl border px-3 py-3 text-sm', severityClass(issue.severity))}>
                  <div className="flex items-start gap-2">
                    {issue.severity === 'info' ? (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', issue.severity === 'error' ? 'text-destructive' : 'text-amber-600')} />
                    )}
                    <div>
                      <p className="font-medium">{issue.title}</p>
                      <p className="mt-1 text-muted-foreground">{issue.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {validationIssues.length > 5 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllIssues((value) => !value)}>
                {showAllIssues ? 'Zobrazit méně' : `Zobrazit všech ${validationIssues.length} nálezů`}
              </Button>
            ) : null}
          </div>
        ) : null}

        {lastPriceRefreshReport && lastPriceRefreshReport.failures.length > 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium">U některých aktiv se nepodařilo načíst cenu</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {lastPriceRefreshReport.failures.slice(0, 5).map((failure) => (
                <li key={failure}>• {failure}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between px-2 text-muted-foreground">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Technická historie ({auditLog.length})
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isHistoryOpen && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/50 p-3">
              {auditLog.length > 0 ? (
                auditLog.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{entry.actor}</span>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{entry.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Zatím tu nejsou žádné technické záznamy.</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
