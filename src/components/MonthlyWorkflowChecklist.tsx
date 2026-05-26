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
  budgetAllocation: _budgetAllocation,
  budgetLimits,
  subcategories,
  onFillRecurringForMonth,
  onToggleMonthClosure,
}: MonthlyWorkflowChecklistProps) => {
  const [showTip, setShowTip] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('finance_month_workflow_tip_hidden') !== 'true';
  });

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
              Workflow mesicni uzaverky
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Checklist, potvrzeni trvalych plateb a seznam toho, co jeste chybi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onFillRecurringForMonth(month)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Doplnit trvale platby
            </Button>
            <Button
              type="button"
              size="sm"
              variant={monthLocked ? 'outline' : 'default'}
              onClick={() => onToggleMonthClosure(month)}
            >
              {monthLocked ? 'Znovu otevrit mesic' : 'Uzavrit po kontrole'}
            </Button>
          </div>
        </div>

        {showTip ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-muted-foreground">
                Doporuceny postup: dopln trvale platby, zkontroluj stavy uctu a teprve pak mesic uzavri.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={dismissTip}>
                Skryt tip
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
            <p className="text-sm font-medium">Pravidelne platby: zauctovano / chybi</p>
            <div className="space-y-2">
              {recurringStatuses.length > 0 ? (
                recurringStatuses.map((item) => (
                  <div
                    key={item.recurringId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
                    </div>
                    <span className={item.status === 'accounted' ? 'text-success' : 'text-warning'}>
                      {item.status === 'accounted' ? 'zauctovano' : 'chybi'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                  V tomto mesici zatim nejsou aktivni trvale platby.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Co jeste zapsat nebo zkontrolovat</p>
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
                Tento mesic uz nevykazuje zjevne chybejici kroky.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
