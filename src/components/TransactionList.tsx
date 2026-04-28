import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountMonthlySnapshot, ExpenseCategory, Transaction } from '@/types/finance';
import { formatCurrency, formatMonth, getCategoryPercentage, groupTransactionsByMonth } from '@/utils/calculations';
import { getCategoryName } from '@/utils/categoryNames';
import { InstitutionAvatar } from '@/components/InstitutionAvatar';

type TransactionFilter = 'all' | 'income' | 'expense' | 'transfer' | 'investments';

interface TransactionListProps {
  transactions: Transaction[];
  accountSnapshots: AccountMonthlySnapshot[];
  selectedYear: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onUpdateSnapshot: (month: string, accountId: string, balance: number) => void;
}

const DEFAULT_VISIBLE_COUNTS: Record<'income' | 'expense' | 'transfer', number> = {
  income: 5,
  expense: 5,
  transfer: 3,
};

export const TransactionList = ({
  transactions,
  accountSnapshots,
  selectedYear,
  onDelete,
  onEdit,
  onUpdateSnapshot,
}: TransactionListProps) => {
  const [showTransactions, setShowTransactions] = useState(true);
  const [editingSnapshot, setEditingSnapshot] = useState<AccountMonthlySnapshot | null>(null);
  const [editedBalance, setEditedBalance] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  const transactionMatchesFilters = (transaction: Transaction) => {
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
      transaction.account ? accountLabelById.get(transaction.account) || '' : '',
      transaction.sourceAccount ? accountLabelById.get(transaction.sourceAccount) || '' : '',
      transaction.transferAccount ? accountLabelById.get(transaction.transferAccount) || '' : '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  };

  const visibleTransactions = useMemo(
    () => filteredTransactions.filter(transactionMatchesFilters),
    [filteredTransactions, transactionFilter, accountFilter, searchTerm, accountLabelById]
  );

  const monthlyData = groupTransactionsByMonth(visibleTransactions);

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

  const toggleSection = (month: string, section: 'income' | 'expense' | 'transfer') => {
    const key = `${month}-${section}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderRow = (transaction: Transaction, toneClass: string) => {
    const accountLabel =
      transaction.type === 'transfer'
        ? `${transaction.sourceAccount ? accountLabelById.get(transaction.sourceAccount) || 'Neznámý účet' : 'Neznámý účet'} → ${
            transaction.transferAccount ? accountLabelById.get(transaction.transferAccount) || 'Neznámý účet' : 'Neznámý účet'
          }`
        : transaction.account
          ? accountLabelById.get(transaction.account) || 'Neznámý účet'
          : transaction.investmentAccount
            ? accountLabelById.get(transaction.investmentAccount) || 'Investiční účet'
            : '';

    return (
      <div
        key={transaction.id}
        className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm"
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
            {transaction.amount >= 10000 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                Větší částka
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {accountLabel ? <span>{accountLabel}</span> : null}
            {transaction.category ? <span>{getCategoryName(transaction.category)}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className={`px-2 font-semibold ${toneClass}`}>{formatCurrency(transaction.amount)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onEdit(transaction)}
            title="Upravit transakci"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(transaction.id)}
            title="Smazat transakci"
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
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className={`font-semibold ${toneClass}`}>{title}</h3>
          <div className="text-right">
            <p className="text-sm font-medium">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground">{items.length} položek</p>
          </div>
        </div>

        <div className="space-y-2">
          {items.length > 0 ? visibleItems.map((transaction) => renderRow(transaction, toneClass)) : (
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

  if (filteredTransactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Žádné transakce pro rok {selectedYear}.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Klikněte na „Nová transakce“ pro přidání první transakce.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold sm:text-xl">Transakce {selectedYear}</h3>
            <p className="text-sm text-muted-foreground">
              Kompaktní přehled s filtry, hledáním, editací a rozbalením delších seznamů.
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

        <div className="grid gap-3 rounded-xl border border-border bg-card/70 p-3 md:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[auto_minmax(0,1fr)_220px]">
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

        {visibleTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Pro zadané filtry jsme nenašli žádné transakce.
          </div>
        ) : (
          <div className="space-y-8">
            {monthlyData.map((month) => {
              const monthSnapshots = monthlyAccountSnapshots[month.month] || [];

              return (
                <div key={month.month} className="space-y-4">
                  <div className="flex flex-col gap-3 border-b-2 border-primary pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold sm:text-2xl">{formatMonth(month.month)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {month.income.length + month.expenses.length + month.transfers.length} zobrazených transakcí
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-muted-foreground">Bilance</p>
                      <p className={`text-lg font-bold sm:text-xl ${month.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(month.balance)}
                      </p>
                    </div>
                  </div>

                  {monthSnapshots.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
                      <p className="text-sm font-semibold">Stavy účtů</p>
                      <div className="flex flex-wrap gap-3">
                        {monthSnapshots.map((snapshot) => (
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
                              className="h-8 w-8 shrink-0"
                              onClick={() => openSnapshotEditor(snapshot)}
                              title="Upravit měsíční stav"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showTransactions && (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                      {renderSection(month.month, 'Příjmy', month.totalIncome, 'income', month.income, 'text-success')}
                      {renderSection(month.month, 'Výdaje', month.totalExpenses, 'expense', month.expenses, 'text-destructive')}
                      {renderSection(month.month, 'Převody', month.totalTransfers, 'transfer', month.transfers, 'text-warning')}
                    </div>
                  )}

                  {month.totalIncome > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3 sm:p-4">
                      <h4 className="mb-3 text-sm font-semibold">Rozdělení výdajů podle kategorií</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {(Object.entries(month.categoryBreakdown) as [ExpenseCategory, number][]).map(([category, amount]) => (
                          <div key={category} className="text-sm">
                            <p className="text-muted-foreground">{getCategoryName(category)}</p>
                            <p className="font-semibold">{formatCurrency(amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {getCategoryPercentage(amount, month.totalIncome).toFixed(1)} % příjmů
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
