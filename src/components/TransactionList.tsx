import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  Lock,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountMonthlySnapshot, BudgetAllocation, BudgetLimit, ExpenseCategory, MonthClosure, RecurringTransaction, Subcategory, Transaction, TransactionDraft } from '@/types/finance';
import {
  formatCurrency,
  formatMonth,
  getCategoryPercentage,
  groupTransactionsByMonth,
} from '@/utils/calculations';
import { getCategoryName } from '@/utils/categoryNames';
import { InstitutionAvatar } from '@/components/InstitutionAvatar';
import { YearOverview } from '@/components/transactions/YearOverview';
import { MonthlyWorkflowChecklist } from '@/components/MonthlyWorkflowChecklist';
import { transactionToDraft, validateTransactionDraft } from '@/utils/transactionWorkflow';
import { appStorage } from '@/lib/appStorage';

type TransactionFilter = 'all' | 'income' | 'expense' | 'transfer' | 'investments';

interface TransactionListProps {
  transactions: Transaction[];
  accountSnapshots: AccountMonthlySnapshot[];
  selectedYear: string;
  subcategories: Subcategory[];
  recurringTransactions: RecurringTransaction[];
  budgetAllocation: BudgetAllocation;
  budgetLimits: BudgetLimit[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
  onCreateTransactionDraft: (draft: TransactionDraft) => void;
  onSaveTransactionDraft: (draft: TransactionDraft) => void;
  onUpdateSnapshot: (month: string, accountId: string, balance: number) => void;
  monthClosures: MonthClosure[];
  onToggleMonthClosure: (month: string) => void;
  onFillRecurringForMonth: (month: string) => number;
}

interface SavedTransactionView {
  id: string;
  label: string;
  transactionFilter: TransactionFilter;
  accountFilter: string;
  searchTerm: string;
}

const DEFAULT_VISIBLE_COUNTS: Record<'income' | 'expense' | 'transfer', number> = {
  income: 5,
  expense: 5,
  transfer: 3,
};

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('cs-CZ', { month: 'long' });
};

const buildYearMonths = (year: string) => Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
const TRANSACTION_UI_PREFS_KEY = 'finance_transaction_ui_prefs';

export const TransactionList = ({
  transactions,
  accountSnapshots,
  selectedYear,
  subcategories,
  recurringTransactions,
  budgetAllocation,
  budgetLimits,
  onDelete,
  onEdit,
  onDuplicate,
  onCreateTransactionDraft,
  onSaveTransactionDraft,
  onUpdateSnapshot,
  monthClosures,
  onToggleMonthClosure,
  onFillRecurringForMonth,
}: TransactionListProps) => {
  const [showTransactions, setShowTransactions] = useState(true);
  const [editingSnapshot, setEditingSnapshot] = useState<AccountMonthlySnapshot | null>(null);
  const [editedBalance, setEditedBalance] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [savedViews, setSavedViews] = useState<SavedTransactionView[]>(() => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(window.localStorage.getItem('finance_transaction_saved_views') || '[]') as SavedTransactionView[];
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showYearOverview, setShowYearOverview] = useState(true);
  const [showMonthlyChecklist, setShowMonthlyChecklist] = useState(false);
  const [showWorkflowTip, setShowWorkflowTip] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('finance_transaction_workflow_tip_hidden') !== 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      'finance_transaction_filters',
      JSON.stringify({ transactionFilter, accountFilter, searchTerm })
    );
  }, [transactionFilter, accountFilter, searchTerm]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('finance_transaction_saved_views', JSON.stringify(savedViews));
  }, [savedViews]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = JSON.parse(window.localStorage.getItem('finance_transaction_filters') || '{}') as {
      transactionFilter?: TransactionFilter;
      accountFilter?: string;
      searchTerm?: string;
    };
    if (stored.transactionFilter) setTransactionFilter(stored.transactionFilter);
    if (stored.accountFilter) setAccountFilter(stored.accountFilter);
    if (typeof stored.searchTerm === 'string') setSearchTerm(stored.searchTerm);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const loaded = await appStorage.getMany([TRANSACTION_UI_PREFS_KEY]);
      if (cancelled) return;

      try {
        const parsed = JSON.parse(loaded[TRANSACTION_UI_PREFS_KEY] || '{}') as {
          showYearOverview?: boolean;
          showMonthlyChecklist?: boolean;
        };

        if (typeof parsed.showYearOverview === 'boolean') setShowYearOverview(parsed.showYearOverview);
        if (typeof parsed.showMonthlyChecklist === 'boolean') setShowMonthlyChecklist(parsed.showMonthlyChecklist);
      } catch {
        // ignore malformed UI prefs
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void appStorage.setMany({
      [TRANSACTION_UI_PREFS_KEY]: JSON.stringify({
        showYearOverview,
        showMonthlyChecklist,
      }),
    });
  }, [showMonthlyChecklist, showYearOverview]);

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.month.startsWith(selectedYear)),
    [transactions, selectedYear]
  );

  const accountLabelById = useMemo(() => {
    const map = new Map<string, string>();
    accountSnapshots.forEach((snapshot) => {
      if (!map.has(snapshot.accountId)) {
        map.set(snapshot.accountId, `${snapshot.accountName}${snapshot.isSavings ? ' · s.ú.' : ''}`);
      }
    });
    return map;
  }, [accountSnapshots]);

  const accountOptions = useMemo(
    () =>
      Array.from(accountLabelById.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'cs'))
        .map(([id, label]) => ({ id, label })),
    [accountLabelById]
  );

  const monthlyAccountSnapshots = useMemo(
    () =>
      accountSnapshots
        .filter((snapshot) => snapshot.month.startsWith(selectedYear))
        .reduce<Record<string, AccountMonthlySnapshot[]>>((acc, snapshot) => {
          if (!acc[snapshot.month]) acc[snapshot.month] = [];
          acc[snapshot.month].push(snapshot);
          return acc;
        }, {}),
    [accountSnapshots, selectedYear]
  );

  const closedMonths = useMemo(() => new Set(monthClosures.map((entry) => entry.month)), [monthClosures]);

  const transactionMatchesFilters = useCallback((transaction: Transaction) => {
    if (transactionFilter === 'income' && transaction.type !== 'income') return false;
    if (transactionFilter === 'expense' && transaction.type !== 'expense') return false;
    if (transactionFilter === 'transfer' && transaction.type !== 'transfer') return false;
    if (
      transactionFilter === 'investments' &&
      !(transaction.type === 'expense' && transaction.category === 'investments')
    ) {
      return false;
    }

    if (accountFilter !== 'all') {
      const linkedAccounts = [
        transaction.account,
        transaction.sourceAccount,
        transaction.transferAccount,
        transaction.investmentAccount,
      ].filter(Boolean);
      if (!linkedAccounts.includes(accountFilter)) return false;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return true;

    const haystack = [
      transaction.name,
      transaction.category ? getCategoryName(transaction.category) : '',
      transaction.subcategoryId ? subcategories.find((subcategory) => subcategory.id === transaction.subcategoryId)?.name || '' : '',
      transaction.account ? accountLabelById.get(transaction.account) || '' : '',
      transaction.sourceAccount ? accountLabelById.get(transaction.sourceAccount) || '' : '',
      transaction.transferAccount ? accountLabelById.get(transaction.transferAccount) || '' : '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  }, [accountFilter, accountLabelById, searchTerm, subcategories, transactionFilter]);

  const visibleTransactions = useMemo(
    () => filteredTransactions.filter(transactionMatchesFilters),
    [filteredTransactions, transactionMatchesFilters]
  );

  const monthlyData = useMemo(() => groupTransactionsByMonth(visibleTransactions), [visibleTransactions]);
  const monthlyDataMap = useMemo(() => new Map(monthlyData.map((item) => [item.month, item])), [monthlyData]);

  const yearOverviewMonths = useMemo(() => {
    return buildYearMonths(selectedYear).map((month) => {
      const monthData = monthlyDataMap.get(month);
      const monthSnapshots = monthlyAccountSnapshots[month] || [];
      const invalidCount = filteredTransactions.filter((transaction) => {
        if (transaction.month !== month) return false;
        return Object.keys(validateTransactionDraft(transactionToDraft(transaction))).length > 0;
      }).length;

      let status: 'open' | 'closed' | 'adjusted' | 'warning' = 'open';
      if (closedMonths.has(month)) status = 'closed';
      else if (invalidCount > 0) status = 'warning';
      else if (monthSnapshots.some((snapshot) => snapshot.source === 'import')) status = 'adjusted';

      return {
        month,
        monthLabel: monthLabel(month),
        totalIncome: monthData?.totalIncome || 0,
        totalExpenses: monthData?.totalExpenses || 0,
        balance: monthData?.balance || 0,
        transactionCount:
          (monthData?.income.length || 0) + (monthData?.expenses.length || 0) + (monthData?.transfers.length || 0),
        status,
      };
    });
  }, [closedMonths, filteredTransactions, monthlyAccountSnapshots, monthlyDataMap, selectedYear]);

  useEffect(() => {
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const yearMonths = buildYearMonths(selectedYear);

    if (selectedMonth && yearMonths.includes(selectedMonth)) return;

    if (currentMonth.startsWith(selectedYear)) {
      setSelectedMonth(currentMonth);
      return;
    }

    setSelectedMonth(yearMonths[0]);
  }, [selectedMonth, selectedYear]);

  const selectedMonthData = monthlyDataMap.get(selectedMonth);
  const selectedMonthSnapshots = monthlyAccountSnapshots[selectedMonth] || [];
  const monthLocked = closedMonths.has(selectedMonth);
  const largestExpense = selectedMonthData?.expenses
    .slice()
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  const importedSnapshotsCount = selectedMonthSnapshots.filter((snapshot) => snapshot.source === 'import').length;

  const openSnapshotEditor = (snapshot: AccountMonthlySnapshot) => {
    setEditingSnapshot(snapshot);
    setEditedBalance(String(snapshot.balance));
  };

  const handleSaveSnapshot = () => {
    if (!editingSnapshot) return;

    const nextBalance = parseFloat(editedBalance.replace(',', '.'));
    if (!Number.isFinite(nextBalance)) return;

    onUpdateSnapshot(editingSnapshot.month, editingSnapshot.accountId, nextBalance);
    setEditingSnapshot(null);
    setEditedBalance('');
  };

  const saveCurrentView = () => {
    const label = window.prompt('Název uloženého pohledu', `Pohled ${savedViews.length + 1}`);
    if (!label?.trim()) return;

    setSavedViews((current) => [
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        transactionFilter,
        accountFilter,
        searchTerm,
      },
      ...current,
    ].slice(0, 8));
  };

  const applySavedView = (view: SavedTransactionView) => {
    setTransactionFilter(view.transactionFilter);
    setAccountFilter(view.accountFilter);
    setSearchTerm(view.searchTerm);
  };

  const deleteSavedView = (id: string) => {
    setSavedViews((current) => current.filter((view) => view.id !== id));
  };

  const dismissWorkflowTip = () => {
    setShowWorkflowTip(false);
    window.localStorage.setItem('finance_transaction_workflow_tip_hidden', 'true');
  };

  const toggleSection = (month: string, section: 'income' | 'expense' | 'transfer') => {
    const key = `${month}-${section}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderRow = (transaction: Transaction, toneClass: string) => {
    const sourceLabel = transaction.sourceAccount
      ? accountLabelById.get(transaction.sourceAccount) || 'Neznámý účet'
      : 'Neznámý účet';
    const targetLabel = transaction.transferAccount
      ? accountLabelById.get(transaction.transferAccount) || 'Neznámý účet'
      : 'Neznámý účet';
    const investmentLabel = transaction.investmentAccount
      ? accountLabelById.get(transaction.investmentAccount) || 'Investiční účet'
      : '';

    const accountLabel =
      transaction.type === 'transfer'
        ? `${sourceLabel} → ${targetLabel}`
        : transaction.account
          ? accountLabelById.get(transaction.account) || 'Neznámý účet'
          : investmentLabel;

    return (
      <div
        key={transaction.id}
        className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm transition-colors hover:bg-background"
        data-testid={`transaction-${transaction.id}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{transaction.name}</span>
            {transaction.type === 'expense' && transaction.category === 'investments' && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Investice
              </span>
            )}
            {Math.abs(transaction.amount) >= 10000 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                Vyšší částka
              </span>
            )}
            {transaction.goalId && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                Finanční cíl
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {accountLabel ? <span>{accountLabel}</span> : null}
            {transaction.category ? <span>{getCategoryName(transaction.category)}</span> : null}
            {transaction.subcategoryId ? (
              <span>{subcategories.find((subcategory) => subcategory.id === transaction.subcategoryId)?.name || ''}</span>
            ) : null}
            {transaction.note ? <span>{transaction.note}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className={`px-2 font-semibold ${toneClass}`}>{formatCurrency(transaction.amount)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-30"
            onClick={() => onDuplicate(transaction)}
            title="Duplikovat transakci"
            disabled={monthLocked}
          >
            <CopyPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-30"
            onClick={() => onEdit(transaction)}
            title="Upravit transakci"
            disabled={monthLocked}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-30"
            onClick={() => onDelete(transaction.id)}
            title="Smazat transakci"
            disabled={monthLocked}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSection = (
    monthKey: string,
    title: string,
    total: number,
    section: 'income' | 'expense' | 'transfer',
    items: Transaction[],
    toneClass: string
  ) => {
    const key = `${monthKey}-${section}`;
    const isExpanded = !!expandedSections[key];
    const defaultVisibleCount = DEFAULT_VISIBLE_COUNTS[section];
    const visibleItems = isExpanded ? items : items.slice(0, defaultVisibleCount);
    const hiddenCount = Math.max(items.length - visibleItems.length, 0);

    return (
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className={`font-semibold ${toneClass}`}>{title}</h3>
          <div className="text-right">
            <p className="text-sm font-medium">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground">{items.length} položek</p>
          </div>
        </div>

        <div className="space-y-2">
          {items.length > 0 ? (
            visibleItems.map((transaction) => renderRow(transaction, toneClass))
          ) : (
            <p className="text-sm text-muted-foreground">Žádné položky.</p>
          )}
        </div>

        {items.length > defaultVisibleCount && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 px-0 text-sm"
            onClick={() => toggleSection(monthKey, section)}
          >
            {isExpanded ? 'Zobrazit méně' : `Zobrazit vše (${hiddenCount} dalších)`}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6" id="month-workflow">
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold sm:text-xl">Roční přehled měsíců</h3>
              <p className="text-sm text-muted-foreground">
                Vyber měsíc v kompaktním gridu. Detail se zobrazí hned pod přehledem.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowYearOverview((current) => !current)} className="gap-2">
              {showYearOverview ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Skrýt roční přehled
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Zobrazit roční přehled
                </>
              )}
            </Button>
          </div>

          {showYearOverview ? (
            <div className="mt-4">
              <YearOverview months={yearOverviewMonths} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-lg font-semibold sm:text-xl">Detail měsíce {formatMonth(selectedMonth)}</h3>
              <p className="text-sm text-muted-foreground">
                Přehled účtů, rychlé přidání, uzávěrka měsíce a kompletní seznam transakcí na jednom místě.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransactions(!showTransactions)}
              className="w-full gap-2 xl:w-auto"
            >
              {showTransactions ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Skrýt detaily
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Zobrazit detaily
                </>
              )}
            </Button>
          </div>

          {showWorkflowTip ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-muted-foreground">
                  Tip: po kontrole trvalých plateb a rozpočtů si ulož oblíbený filtr. Příště se k němu vrátíš jedním klikem.
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={dismissWorkflowTip}>
                  Skrýt tip
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-card/70 p-3 md:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[auto_minmax(0,1fr)_220px]">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'Vše'],
                ['income', 'Příjmy'],
                ['expense', 'Výdaje'],
                ['transfer', 'Převody'],
                ['investments', 'Investice'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={transactionFilter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionFilter(value as TransactionFilter)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Hledat podle názvu, účtu nebo kategorie"
                className="pl-9"
              />
            </div>

            <select
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Všechny účty</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={saveCurrentView}>
              Uložit pohled
            </Button>
            {savedViews.map((view) => (
              <div key={view.id} className="flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-xs">
                <button type="button" className="font-medium" onClick={() => applySavedView(view)}>
                  {view.label}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => deleteSavedView(view.id)}
                  aria-label={`Smazat pohled ${view.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold sm:text-2xl">{formatMonth(selectedMonth)}</h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      monthLocked ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {monthLocked ? 'Uzavřený měsíc' : 'Otevřený měsíc'}
                  </span>
                  {importedSnapshotsCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {importedSnapshotsCount} ručně upravených stavů
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Bilance</p>
                    <p className={`mt-2 text-lg font-semibold ${(selectedMonthData?.balance || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(selectedMonthData?.balance || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Transakce</p>
                    <p className="mt-2 text-lg font-semibold">
                      {(selectedMonthData?.income.length || 0) +
                        (selectedMonthData?.expenses.length || 0) +
                        (selectedMonthData?.transfers.length || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Největší výdaj</p>
                    <p className="mt-2 text-sm font-semibold">{largestExpense ? largestExpense.name : 'Bez výdajů'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {largestExpense ? formatCurrency(largestExpense.amount) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
                <Button
                  variant={monthLocked ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => onToggleMonthClosure(selectedMonth)}
                  className="gap-2"
                >
                  {monthLocked ? (
                    <>
                      <Unlock className="h-4 w-4" />
                      Otevřít měsíc
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Uzavřít měsíc
                    </>
                  )}
                </Button>
                {monthLocked && (
                  <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-success">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Měsíc je označený jako zkontrolovaný.
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedMonthSnapshots.length > 0 && (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Stavy účtů</p>
                <p className="text-xs text-muted-foreground">
                  Klikni na tužku, pokud chceš upravit ruční měsíční stav.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedMonthSnapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex min-w-[240px] items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <InstitutionAvatar
                        institutionId={snapshot.institutionId}
                        fallback={snapshot.accountName}
                        className="h-8 w-8 shrink-0 rounded-lg text-[8px]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {snapshot.accountName}
                          {snapshot.isSavings ? ' · s.ú.' : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-muted-foreground">{formatCurrency(snapshot.balance)}</p>
                          {snapshot.source === 'import' && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Ruční úprava
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 disabled:opacity-30"
                      onClick={() => openSnapshotEditor(snapshot)}
                      title="Upravit měsíční stav"
                      disabled={monthLocked}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTransactions && (
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              {renderSection(selectedMonth, 'Příjmy', selectedMonthData?.totalIncome || 0, 'income', selectedMonthData?.income || [], 'text-success')}
              {renderSection(selectedMonth, 'Výdaje', selectedMonthData?.totalExpenses || 0, 'expense', selectedMonthData?.expenses || [], 'text-destructive')}
              {renderSection(selectedMonth, 'Převody', selectedMonthData?.totalTransfers || 0, 'transfer', selectedMonthData?.transfers || [], 'text-warning')}
            </div>
          )}

          {(selectedMonthData?.totalIncome || 0) > 0 && (
            <div className="mt-4 rounded-xl bg-muted/50 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Rozdělení výdajů podle kategorií</h4>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {(Object.entries(selectedMonthData?.categoryBreakdown || {}) as [ExpenseCategory, number][])
                  .filter(([, amount]) => amount !== 0)
                  .map(([category, amount]) => (
                    <div key={category} className="rounded-lg bg-card/70 p-3 text-sm">
                      <p className="text-muted-foreground">{getCategoryName(category)}</p>
                      <p className={`font-semibold ${amount >= 0 ? 'text-foreground' : 'text-warning'}`}>{formatCurrency(amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {getCategoryPercentage(amount, selectedMonthData?.totalIncome || 0).toFixed(1)} % příjmů
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">WF měsíční uzávěrky</h3>
              <p className="text-sm text-muted-foreground">
                Checklist uzávěrky, plán vs. realita, trvalé platby a přehled toho, co ještě chybí.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowMonthlyChecklist((current) => !current)} className="gap-2">
              {showMonthlyChecklist ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Skrýt uzávěrky
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Zobrazit uzávěrky
                </>
              )}
            </Button>
          </div>

          {showMonthlyChecklist ? (
            <div className="mt-4">
              <MonthlyWorkflowChecklist
                month={selectedMonth}
                monthLocked={monthLocked}
                transactions={transactions}
                recurringTransactions={recurringTransactions}
                accountSnapshots={selectedMonthSnapshots}
                budgetAllocation={budgetAllocation}
                budgetLimits={budgetLimits}
                subcategories={subcategories}
                onFillRecurringForMonth={onFillRecurringForMonth}
                onToggleMonthClosure={onToggleMonthClosure}
              />
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={!!editingSnapshot} onOpenChange={(open) => !open && setEditingSnapshot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upravit měsíční stav účtu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              <p className="font-medium">
                {editingSnapshot?.accountName}
                {editingSnapshot?.isSavings ? ' · s.ú.' : ''}
              </p>
              <p className="text-muted-foreground">{editingSnapshot ? formatMonth(editingSnapshot.month) : ''}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapshot-balance">Stav účtu</Label>
              <Input
                id="snapshot-balance"
                inputMode="decimal"
                value={editedBalance}
                onChange={(event) => setEditedBalance(event.target.value)}
                placeholder="Např. 125000"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditingSnapshot(null)}>
                Zrušit
              </Button>
              <Button onClick={handleSaveSnapshot}>Uložit stav</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
