import { useMemo, useState } from 'react';
import { Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  BankAccount,
  ExpenseCategory,
  RecurringTransaction,
  TransactionType,
  TransferCategory,
} from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/calculations';
import { getCategoryName } from '@/utils/categoryNames';

interface RecurringTransactionsProps {
  isOpen: boolean;
  onClose: () => void;
  recurringTransactions: RecurringTransaction[];
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  onAdd: (transaction: Omit<RecurringTransaction, 'id'>) => void;
  onUpdate: (id: string, transaction: Omit<RecurringTransaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onFillTransactions: (month: string) => number;
}

interface RecurringFormState {
  name: string;
  amount: string;
  type: TransactionType;
  category: ExpenseCategory;
  incomeAccount: string;
  expenseAccount: string;
  investmentAccount: string;
  includeInInvestmentTotals: boolean;
  transferCategory: TransferCategory;
  sourceAccount: string;
  transferAccount: string;
  dayOfMonth: string;
}

const createInitialState = (): RecurringFormState => ({
  name: '',
  amount: '',
  type: 'expense',
  category: 'necessities',
  incomeAccount: '',
  expenseAccount: '',
  investmentAccount: '',
  includeInInvestmentTotals: true,
  transferCategory: 'transfer',
  sourceAccount: '',
  transferAccount: '',
  dayOfMonth: '1',
});

const toFormState = (transaction: RecurringTransaction): RecurringFormState => ({
  name: transaction.name,
  amount: transaction.amount.toString(),
  type: transaction.type,
  category: transaction.category ?? 'necessities',
  incomeAccount: transaction.type === 'income' ? transaction.account ?? '' : '',
  expenseAccount: transaction.type === 'expense' ? transaction.account ?? '' : '',
  investmentAccount: transaction.investmentAccount ?? '',
  includeInInvestmentTotals: transaction.includeInInvestmentTotals ?? true,
  transferCategory: transaction.transferCategory ?? 'transfer',
  sourceAccount: transaction.sourceAccount ?? '',
  transferAccount: transaction.transferAccount ?? '',
  dayOfMonth: transaction.dayOfMonth.toString(),
});

export const RecurringTransactions = ({
  isOpen,
  onClose,
  recurringTransactions,
  bankAccounts,
  brokerAccounts,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
  onFillTransactions,
}: RecurringTransactionsProps) => {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fillMonth, setFillMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [form, setForm] = useState<RecurringFormState>(createInitialState);

  const accountLabels = useMemo(
    () => Object.fromEntries([...bankAccounts, ...brokerAccounts].map((account) => [account.id, account.name])),
    [bankAccounts, brokerAccounts]
  );
  const allAccounts = [...bankAccounts, ...brokerAccounts];

  const resetForm = () => {
    setForm(createInitialState());
    setIsAdding(false);
    setEditingId(null);
  };

  const updateForm = <K extends keyof RecurringFormState>(key: K, value: RecurringFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.name || !form.amount) {
      toast({
        title: 'Chyba',
        description: 'Vyplnte nazev a castku.',
        variant: 'destructive',
      });
      return false;
    }

    const numericAmount = parseFloat(form.amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: 'Chyba',
        description: 'Zadejte platnou castku.',
        variant: 'destructive',
      });
      return false;
    }

    if (form.type === 'income' && !form.incomeAccount) {
      toast({
        title: 'Chyba',
        description: 'U prijmu vyberte cilovy ucet.',
        variant: 'destructive',
      });
      return false;
    }

    if (form.type === 'expense' && !form.expenseAccount) {
      toast({
        title: 'Chyba',
        description: 'U vydaje vyberte ucet, ze ktereho penize odchazeji.',
        variant: 'destructive',
      });
      return false;
    }

    if (form.type === 'transfer') {
      if (!form.sourceAccount || !form.transferAccount) {
        toast({
          title: 'Chyba',
          description: 'U prevodu vyberte zdrojovy i cilovy ucet.',
          variant: 'destructive',
        });
        return false;
      }

      if (form.sourceAccount === form.transferAccount) {
        toast({
          title: 'Chyba',
          description: 'Zdrojovy a cilovy ucet musi byt rozdilny.',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const buildRecurringTransaction = (): Omit<RecurringTransaction, 'id'> | null => {
    if (!validateForm()) return null;

    const nextTransaction: Omit<RecurringTransaction, 'id'> = {
      name: form.name,
      amount: parseFloat(form.amount),
      type: form.type,
      dayOfMonth: parseInt(form.dayOfMonth, 10),
      isActive: true,
    };

    if (form.type === 'income') {
      nextTransaction.account = form.incomeAccount;
    } else if (form.type === 'expense') {
      nextTransaction.account = form.expenseAccount;
      nextTransaction.category = form.category;
      if (form.category === 'investments') {
        nextTransaction.investmentAccount = form.investmentAccount || undefined;
        nextTransaction.includeInInvestmentTotals = form.includeInInvestmentTotals;
      }
    } else {
      nextTransaction.transferCategory = form.transferCategory;
      nextTransaction.sourceAccount = form.sourceAccount;
      nextTransaction.transferAccount = form.transferAccount;
    }

    return nextTransaction;
  };

  const handleAdd = () => {
    const nextTransaction = buildRecurringTransaction();
    if (!nextTransaction) return;

    onAdd(nextTransaction);
    resetForm();
    toast({
      title: 'Uspesne ulozeno',
      description: 'Trvaly prikaz byl pridan.',
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    const nextTransaction = buildRecurringTransaction();
    if (!nextTransaction) return;

    const original = recurringTransactions.find((transaction) => transaction.id === editingId);
    onUpdate(editingId, {
      ...nextTransaction,
      isActive: original?.isActive ?? true,
    });
    resetForm();
    toast({
      title: 'Uspesne ulozeno',
      description: 'Trvaly prikaz byl upraven.',
    });
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setEditingId(transaction.id);
    setIsAdding(true);
    setForm(toFormState(transaction));
  };

  const handleFill = () => {
    const added = onFillTransactions(fillMonth);
    toast({
      title: added > 0 ? 'Uspech' : 'Bez zmen',
      description:
        added > 0
          ? `Transakce byly vyplneny pro mesic ${fillMonth}.`
          : `Pro mesic ${fillMonth} uz nic nechybi.`,
    });
  };

  const renderAccountSummary = (transaction: RecurringTransaction) => {
    if (transaction.type === 'income') {
      return transaction.account ? `Na ucet: ${accountLabels[transaction.account] ?? 'Neznamy ucet'}` : 'Bez uctu';
    }
    if (transaction.type === 'expense') {
      const source = transaction.account ? accountLabels[transaction.account] ?? 'Neznamy ucet' : 'Bez uctu';
      const target =
        transaction.category === 'investments' && transaction.investmentAccount
          ? accountLabels[transaction.investmentAccount] ?? 'Neznamy ucet'
          : '';
      return target ? `Z uctu: ${source} -> ${target}` : `Z uctu: ${source}`;
    }

    const source = transaction.sourceAccount
      ? accountLabels[transaction.sourceAccount] ?? 'Neznamy ucet'
      : 'Neurceno';
    const target = transaction.transferAccount
      ? accountLabels[transaction.transferAccount] ?? 'Neznamy ucet'
      : 'Neurceno';
    return `${source} -> ${target}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-background/80 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl animate-in slide-in-from-right overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-xl font-semibold">Trvale prikazy</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <h3 className="font-semibold">Vyplnit transakce</h3>
            <p className="text-sm text-muted-foreground">
              Automaticky doplni vsechny aktivni trvale prikazy pro vybrany mesic a prepocita zustatky u vybranych uctu.
            </p>
            <div className="flex gap-2">
              <Input type="month" value={fillMonth} onChange={(event) => setFillMonth(event.target.value)} className="flex-1" />
              <Button onClick={handleFill} className="gap-2">
                <Play className="h-4 w-4" />
                Vyplnit
              </Button>
            </div>
          </div>

          {isAdding ? (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-semibold">{editingId ? 'Upravit trvaly prikaz' : 'Novy trvaly prikaz'}</h3>
              <div className="space-y-2">
                <Label>Nazev</Label>
                <Input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Najem, Vyplata..." />
              </div>
              <div className="space-y-2">
                <Label>Castka</Label>
                <Input type="number" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={form.type} onValueChange={(value) => updateForm('type', value as TransactionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Prijem</SelectItem>
                    <SelectItem value="expense">Vydaj</SelectItem>
                    <SelectItem value="transfer">Prevod</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.type === 'income' && (
                <div className="space-y-2">
                  <Label>Cilovy ucet</Label>
                  <Select value={form.incomeAccount} onValueChange={(value) => updateForm('incomeAccount', value)}>
                    <SelectTrigger><SelectValue placeholder="Vyberte ucet" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((bankAccount) => (
                        <SelectItem key={bankAccount.id} value={bankAccount.id}>
                          {bankAccount.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.type === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label>Kategorie</Label>
                    <Select value={form.category} onValueChange={(value) => updateForm('category', value as ExpenseCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="necessities">Nutnosti</SelectItem>
                        <SelectItem value="whims">Rozmary</SelectItem>
                        <SelectItem value="investments">Investice</SelectItem>
                        <SelectItem value="savings">Sporeni</SelectItem>
                        <SelectItem value="selfInvestment">Investice do sebe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zdrojovy ucet</Label>
                    <Select value={form.expenseAccount} onValueChange={(value) => updateForm('expenseAccount', value)}>
                      <SelectTrigger><SelectValue placeholder="Vyberte ucet" /></SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((targetAccount) => (
                          <SelectItem key={targetAccount.id} value={targetAccount.id}>
                            {targetAccount.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.category === 'investments' && (
                    <>
                      <div className="space-y-2">
                        <Label>Cilovy ucet pro investici</Label>
                        <Select value={form.investmentAccount || 'none'} onValueChange={(value) => updateForm('investmentAccount', value === 'none' ? '' : value)}>
                          <SelectTrigger><SelectValue placeholder="Vyberte cilovy ucet" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Bez ciloveho uctu</SelectItem>
                            {allAccounts.map((targetAccount) => (
                              <SelectItem key={targetAccount.id} value={targetAccount.id}>
                                {targetAccount.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.includeInInvestmentTotals}
                          onChange={(event) => updateForm('includeInInvestmentTotals', event.target.checked)}
                          className="rounded"
                        />
                        Zahrnout do rocniho souctu investovane castky
                      </label>
                    </>
                  )}
                </>
              )}

              {form.type === 'transfer' && (
                <>
                  <div className="space-y-2">
                    <Label>Typ prevodu</Label>
                    <Select value={form.transferCategory} onValueChange={(value) => updateForm('transferCategory', value as TransferCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Sporeni</SelectItem>
                        <SelectItem value="transfer">Prevod mezi ucty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zdrojovy ucet</Label>
                    <Select value={form.sourceAccount} onValueChange={(value) => updateForm('sourceAccount', value)}>
                      <SelectTrigger><SelectValue placeholder="Vyberte zdrojovy ucet" /></SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((targetAccount) => (
                          <SelectItem key={targetAccount.id} value={targetAccount.id}>
                            {targetAccount.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cilovy ucet</Label>
                    <Select value={form.transferAccount} onValueChange={(value) => updateForm('transferAccount', value)}>
                      <SelectTrigger><SelectValue placeholder="Vyberte cilovy ucet" /></SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((targetAccount) => (
                          <SelectItem key={targetAccount.id} value={targetAccount.id}>
                            {targetAccount.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Den v mesici</Label>
                <Input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(event) => updateForm('dayOfMonth', event.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button onClick={editingId ? handleSave : handleAdd} className="flex-1 gap-2">
                  {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? 'Ulozit zmeny' : 'Pridat'}
                </Button>
                <Button variant="outline" onClick={resetForm}>Zrusit</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Pridat trvaly prikaz
            </Button>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Nastavene trvale prikazy</h3>
            {recurringTransactions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Zatim nemate zadne trvale prikazy.
              </p>
            ) : (
              <div className="space-y-2">
                {recurringTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`rounded-lg border p-3 ${
                      transaction.isActive ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.name}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span>{formatCurrency(transaction.amount)}</span>
                          {transaction.category && ` • ${getCategoryName(transaction.category)}`}
                          {` • ${transaction.dayOfMonth}. den`}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {renderAccountSummary(transaction)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch checked={transaction.isActive} onCheckedChange={() => onToggle(transaction.id)} />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(transaction.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
