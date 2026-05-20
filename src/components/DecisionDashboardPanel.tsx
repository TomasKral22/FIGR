import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, CopyCheck, LineChart, RefreshCw, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';
import { appStorage } from '@/lib/appStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AccountMonthlySnapshot,
  BudgetAllocation,
  BudgetLimit,
  MonthClosure,
  RecurringTransaction,
  Subcategory,
  Transaction,
} from '@/types/finance';
import {
  buildOpenMonthSummary,
  buildTopMonthChanges,
  getLatestAndPreviousMonth,
} from '@/utils/financeDashboard';
import { formatCurrency, formatMonth } from '@/utils/calculations';
import { getBudgetAlerts } from '@/utils/categoryAutomation';

interface DecisionDashboardPanelProps {
  transactions: Transaction[];
  wealthSnapshots: Array<{ totalNetWorth: number; createdAt: string }>;
  accountSnapshots: AccountMonthlySnapshot[];
  recurringTransactions: RecurringTransaction[];
  monthClosures: MonthClosure[];
  budgetLimits: BudgetLimit[];
  budgetAllocation: BudgetAllocation;
  subcategories: Subcategory[];
  selectedYear: string;
  onOpenMonthWorkflow: () => void;
  onOpenRecurring: () => void;
}

interface InvestmentFreshnessSummary {
  missingCount: number;
  staleCount: number;
  labels: string[];
}

const INVESTMENT_STORAGE_KEYS = ['investment_assets', 'investment_prices', 'investment_tracked_investments'];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });

export const DecisionDashboardPanel = ({
  transactions,
  wealthSnapshots,
  accountSnapshots,
  recurringTransactions,
  monthClosures,
  budgetLimits,
  budgetAllocation,
  subcategories,
  selectedYear,
  onOpenMonthWorkflow,
  onOpenRecurring,
}: DecisionDashboardPanelProps) => {
  const [freshnessSummary, setFreshnessSummary] = useState<InvestmentFreshnessSummary>({
    missingCount: 0,
    staleCount: 0,
    labels: [],
  });
  const [showTip, setShowTip] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('finance_dashboard_decision_tip_hidden') !== 'true';
  });

  const { latestMonth, previousMonth } = useMemo(
    () => getLatestAndPreviousMonth(transactions, selectedYear),
    [selectedYear, transactions]
  );

  const topChanges = useMemo(
    () => buildTopMonthChanges(transactions, selectedYear, 5),
    [selectedYear, transactions]
  );

  const budgetAlerts = useMemo(
    () =>
      latestMonth
        ? getBudgetAlerts(budgetLimits, transactions, subcategories, latestMonth.month).sort(
            (left, right) => right.ratio - left.ratio
          )
        : [],
    [budgetLimits, latestMonth, subcategories, transactions]
  );

  const openMonthSummary = useMemo(
    () => buildOpenMonthSummary(transactions, monthClosures, selectedYear),
    [monthClosures, selectedYear, transactions]
  );

  const recurringGapSummary = useMemo(() => {
    if (!latestMonth) return { missingCount: 0, matchedCount: 0 };

    const activeRecurring = recurringTransactions.filter((item) => item.isActive);
    const matchedCount = activeRecurring.filter((recurring) =>
      transactions.some(
        (transaction) =>
          transaction.month === latestMonth.month &&
          transaction.type === recurring.type &&
          transaction.name.trim().toLowerCase() === recurring.name.trim().toLowerCase() &&
          Math.abs(transaction.amount - recurring.amount) < 0.01
      )
    ).length;

    return {
      missingCount: Math.max(activeRecurring.length - matchedCount, 0),
      matchedCount,
    };
  }, [latestMonth, recurringTransactions, transactions]);

  const importedSnapshotCount = useMemo(
    () =>
      latestMonth
        ? accountSnapshots.filter(
            (snapshot) => snapshot.month === latestMonth.month && snapshot.source === 'import'
          ).length
        : 0,
    [accountSnapshots, latestMonth]
  );

  const wealthDelta = useMemo(() => {
    const latest = wealthSnapshots[0];
    const previous = wealthSnapshots[1];
    if (!latest || !previous) return null;
    return latest.totalNetWorth - previous.totalNetWorth;
  }, [wealthSnapshots]);

  useEffect(() => {
    let cancelled = false;

    const loadFreshness = async () => {
      const loaded = await appStorage.getMany(INVESTMENT_STORAGE_KEYS);
      if (cancelled) return;

      const assets = loaded.investment_assets ? (JSON.parse(loaded.investment_assets) as Array<{ id: string; ticker: string }>) : [];
      const prices = loaded.investment_prices
        ? (JSON.parse(loaded.investment_prices) as Array<{ asset_id: string; price_date: string }>)
        : [];
      const tracked = loaded.investment_tracked_investments
        ? (
            JSON.parse(loaded.investment_tracked_investments) as Array<{
              ticker: string;
              current_price: number | null;
              last_price_synced_at: string | null;
            }>
          )
        : [];

      const latestPrices = new Map<string, string>();
      prices.forEach((price) => {
        const current = latestPrices.get(price.asset_id);
        if (!current || price.price_date > current) {
          latestPrices.set(price.asset_id, price.price_date);
        }
      });

      const today = new Date();
      const diffDays = (iso: string | null) => {
        if (!iso) return Number.POSITIVE_INFINITY;
        const target = new Date(iso);
        return Math.floor((today.getTime() - target.getTime()) / 86_400_000);
      };

      const missingAssets = assets.filter((asset) => !latestPrices.get(asset.id)).map((asset) => asset.ticker);
      const staleAssets = assets
        .filter((asset) => {
          const latest = latestPrices.get(asset.id);
          return !!latest && diffDays(latest) > 7;
        })
        .map((asset) => asset.ticker);
      const trackedMissing = tracked
        .filter((item) => item.ticker && (!item.current_price || diffDays(item.last_price_synced_at) > 7))
        .map((item) => item.ticker);

      setFreshnessSummary({
        missingCount: missingAssets.length,
        staleCount: staleAssets.length + trackedMissing.length,
        labels: [...missingAssets, ...staleAssets, ...trackedMissing].slice(0, 5),
      });
    };

    void loadFreshness();
    return () => {
      cancelled = true;
    };
  }, [transactions.length]);

  const dismissTip = () => {
    setShowTip(false);
    window.localStorage.setItem('finance_dashboard_decision_tip_hidden', 'true');
  };

  return (
    <section className="space-y-4">
      {showTip ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-primary">Rozhodovací vrstva dashboardu</p>
              <p className="mt-1 text-muted-foreground">
                Tady sleduj, co právě hýbe majetkem, co čeká na kontrolu a kde chybí data.
                Zkratky: <span className="font-medium">Shift + M</span> otevře měsíční workflow,
                <span className="font-medium"> Shift + I</span> investice.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={dismissTip}>
              Rozumím
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-primary" />
              Top 5 změn za měsíc
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestMonth ? (
              <p className="text-sm text-muted-foreground">
                Srovnání {formatMonth(latestMonth.month)}
                {previousMonth ? ` proti ${formatMonth(previousMonth.month)}` : ' bez předchozího srovnání'}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Pro tento rok zatím nejsou transakce.</p>
            )}

            <div className="space-y-2">
              {topChanges.length > 0 ? (
                topChanges.map((change) => {
                  const isPositive = change.delta >= 0;
                  return (
                    <div
                      key={change.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-3"
                    >
                      <div>
                        <p className="font-medium">{change.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Teď {formatCurrency(change.current)} · předtím {formatCurrency(change.previous)}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {formatCurrency(change.delta)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                  Zatím není co srovnávat mezi měsíci.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="border-border/70 bg-card/80">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tahoun majetku</p>
              <p className="mt-2 text-lg font-semibold">
                {wealthDelta == null ? 'Chybí srovnání' : wealthDelta >= 0 ? 'Růst majetku' : 'Pokles majetku'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {topChanges[0]
                  ? `${topChanges[0].label} změnil(a) měsíc o ${formatCurrency(topChanges[0].delta)}.`
                  : 'Jakmile budou dva porovnatelné měsíce, ukážou se hlavní tahouni změny.'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Bez aktuální ceny</p>
              <p className="mt-2 text-lg font-semibold">
                {freshnessSummary.missingCount + freshnessSummary.staleCount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {freshnessSummary.labels.length > 0
                  ? freshnessSummary.labels.join(', ')
                  : 'Všechna sledovaná aktiva mají čerstvá data.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/80 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Co překračuje limit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {budgetAlerts.length > 0 && latestMonth ? (
              budgetAlerts.slice(0, 4).map((alert) => (
                <div key={`${alert.limit.id}-${alert.level}`} className="rounded-xl border border-border/60 bg-background/50 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{alert.subcategoryLabel ? `${alert.categoryLabel} · ${alert.subcategoryLabel}` : alert.categoryLabel}</p>
                    <span className={alert.level === 'critical' || alert.level === 'exceeded' ? 'text-destructive' : 'text-warning'}>
                      {Math.round(alert.ratio * 100)} %
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatCurrency(alert.spent)} z limitu {formatCurrency(alert.limit.monthlyLimit)} v {formatMonth(latestMonth.month)}.
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                Žádný limit aktuálně nevystřelil nad varovný práh.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-primary" />
              Co čeká na uzavření nebo kontrolu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-3">
              <p className="text-sm font-medium">Otevřené měsíce</p>
              <p className="mt-1 text-2xl font-semibold">{openMonthSummary.openMonths.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {openMonthSummary.latestOpenMonth
                  ? `Poslední otevřený měsíc: ${formatMonth(openMonthSummary.latestOpenMonth)}.`
                  : 'Všechny evidované měsíce jsou uzavřené.'}
              </p>
              {importedSnapshotCount > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {importedSnapshotCount} ručně upravených stavů účtů v posledním měsíci.
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-3">
              <p className="text-sm font-medium">Trvalé platby bez potvrzení</p>
              <p className="mt-1 text-2xl font-semibold">{recurringGapSummary.missingCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Zaúčtováno {recurringGapSummary.matchedCount} aktivních pravidelných plateb.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onOpenMonthWorkflow}>
                Otevřít workflow měsíce
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onOpenRecurring}>
                Zkontrolovat trvalé platby
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CopyCheck className="h-4 w-4 text-success" />
              Plán vs. realita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latestMonth ? (
              <>
                {(['necessities', 'investments', 'savings', 'whims'] as const).map((category) => {
                  const planned = latestMonth.totalIncome * ((budgetAllocation[category] || 0) / 100);
                  const actual = latestMonth.categoryBreakdown[category] || 0;
                  const variance = actual - planned;
                  return (
                    <div key={category} className="rounded-xl border border-border/60 bg-background/50 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{category === 'whims' ? 'Rozmary' : category === 'necessities' ? 'Nutnosti' : category === 'savings' ? 'Spoření' : 'Investice'}</p>
                        <span className={variance <= 0 ? 'text-success' : 'text-warning'}>
                          {variance <= 0 ? 'v plánu' : 'nad plán'}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Plán {formatCurrency(planned)} · realita {formatCurrency(actual)}
                      </p>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                Bez aktivního měsíce zatím nelze srovnat plán a realitu.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
