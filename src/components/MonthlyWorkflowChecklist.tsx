import { useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AccountMonthlySnapshot,
  BudgetAllocation,
  BudgetLimit,
  RecurringTransaction,
  Subcategory,
  Transaction,
} from '@/types/finance';
import {
  buildPendingItems,
  buildPlanVsRealityRows,
  buildRecurringMonthStatuses,
  buildWorkflowChecklist,
} from '@/utils/financeDashboard';
import { formatCurrency } from '@/utils/calculations';

interface MonthlyWorkflowChecklistProps {
  month: string;
  monthLocked: boolean;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  accountSnapshots: AccountMonthlySnapshot[];
  budgetAllocation: BudgetAllocation;
  budgetLimits: BudgetLimit[];
  subcategories: Subcategory[];
  onFillRecurringForMonth: (month: string) => number;
  onToggleMonthClosure: (month: string) => void;
}

export const MonthlyWorkflowChecklist = ({
  month,
  monthLocked,
  transactions,
  recurringTransactions,
  accountSnapshots,
  budgetAllocation,
  budgetLimits,
  subcategories,
  onFillRecurringForMonth,
  onToggleMonthClosure,
}: MonthlyWorkflowChecklistProps) => {
  const [showTip, setShowTip] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('finance_month_workflow_tip_hidden') !== 'true';
  });

  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.month === month),
    [month, transactions]
  );
  const recurringStatuses = useMemo(
    () => buildRecurringMonthStatuses(recurringTransactions, transactions, month),
    [month, recurringTransactions, transactions]
  );
  const checklist = useMemo(
    () =>
      buildWorkflowChecklist({
        month,
        monthLocked,
        recurringStatuses,
        accountSnapshots,
        budgetLimits,
        transactions,
        subcategories,
      }),
    [accountSnapshots, budgetLimits, month, monthLocked, recurringStatuses, subcategories, transactions]
  );
  const planVsReality = useMemo(() => {
    const totalIncome = monthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const categoryBreakdown = monthTransactions
      .filter((transaction) => transaction.type === 'expense' && transaction.category)
      .reduce(
        (acc, transaction) => {
          if (transaction.category) acc[transaction.category] += transaction.amount;
          return acc;
        },
        {
          necessities: 0,
          investments: 0,
          savings: 0,
          whims: 0,
          selfInvestment: 0,
        }
      );
    return buildPlanVsRealityRows({ totalIncome, categoryBreakdown, budgetAllocation });
  }, [budgetAllocation, monthTransactions]);
  const pendingItems = useMemo(
    () =>
      buildPendingItems({
        month,
        recurringStatuses,
        monthLocked,
        budgetLimits,
        transactions,
        subcategories,
      }),
    [budgetLimits, month, monthLocked, recurringStatuses, subcategories, transactions]
  );

  const dismissTip = () => {
    setShowTip(false);
    window.localStorage.setItem('finance_month_workflow_tip_hidden', 'true');
  };

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-primary" />
              Workflow měsíční uzávěrky
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Checklist, plán vs. realita, potvrzení trvalých plateb a seznam toho, co ještě chybí.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onFillRecurringForMonth(month)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Doplnit trvalé platby
            </Button>
            <Button type="button" size="sm" variant={monthLocked ? 'outline' : 'default'} onClick={() => onToggleMonthClosure(month)}>
              {monthLocked ? 'Znovu otevřít měsíc' : 'Uzavřít po kontrole'}
            </Button>
          </div>
        </div>

        {showTip ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-muted-foreground">
                Doporučený postup: doplň trvalé platby, zkontroluj stavy účtů, porovnej plán a realitu a teprve pak měsíc uzavři.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={dismissTip}>
                Skrýt tip
              </Button>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          {checklist.map((item) => {
            const Icon =
              item.status === 'done' ? CheckCircle2 : item.status === 'warning' ? AlertTriangle : BadgeCheck;

            return (
              <div key={item.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      item.status === 'done'
                        ? 'text-success'
                        : item.status === 'warning'
                          ? 'text-warning'
                          : 'text-primary'
                    }`}
                  />
                  <p className="font-medium">{item.label}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-3">
            <p className="text-sm font-medium">Pravidelné platby: zaúčtováno / chybí</p>
            <div className="space-y-2">
              {recurringStatuses.length > 0 ? (
                recurringStatuses.map((item) => (
                  <div key={item.recurringId} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
                    </div>
                    <span className={item.status === 'accounted' ? 'text-success' : 'text-warning'}>
                      {item.status === 'accounted' ? 'zaúčtováno' : 'chybí'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                  V tomto měsíci zatím nejsou aktivní trvalé platby.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Co ještě zapsat nebo zkontrolovat</p>
            {pendingItems.length > 0 ? (
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div key={item} className="rounded-xl border border-warning/20 bg-warning/10 px-3 py-3 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                Tento měsíc už nevykazuje zjevné chybějící kroky.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Plán vs. realita</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {planVsReality.map((row) => (
              <div key={row.category} className="rounded-xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{row.label}</p>
                  <span className={row.variance <= 0 ? 'text-success' : 'text-warning'}>
                    {row.variance <= 0 ? 'v plánu' : 'nad plán'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Plán {row.plannedRatio.toFixed(0)} % · {formatCurrency(row.plannedAmount)}
                </p>
                <p className="mt-1 text-sm font-medium">Realita {formatCurrency(row.actualAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
