import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountGoal, BankAccount, ExpenseCategory, Transaction, TransactionType, TransferCategory } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: {
    month: string;
    type: TransactionType;
    name: string;
    amount: number;
    account?: string;
    category?: ExpenseCategory;
    transferCategory?: TransferCategory;
    sourceAccount?: string;
    transferAccount?: string;
    investmentAccount?: string;
    includeInInvestmentTotals?: boolean;
    goalId?: string;
    goalImpact?: 'deposit' | 'withdrawal';
  }) => void;
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  goals: AccountGoal[];
  getLastTransaction: () => {
    type: TransactionType;
    category?: ExpenseCategory;
    account?: string;
    investmentAccount?: string;
    includeInInvestmentTotals?: boolean;
    goalId?: string;
    goalImpact?: 'deposit' | 'withdrawal';
  } | null;
  onFillRecurringForMonth: (month: string) => number;
  initialTransaction?: Transaction | null;
}

export const TransactionForm = ({
  isOpen,
  onClose,
  onSubmit,
  bankAccounts,
  brokerAccounts,
  goals,
  getLastTransaction,
  onFillRecurringForMonth,
  initialTransaction = null,
}: TransactionFormProps) => {
  const { toast } = useToast();
  const isEditing = !!initialTransaction;

  const [month, setMonth] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [expenseAccount, setExpenseAccount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('necessities');
  const [transferCategory, setTransferCategory] = useState<TransferCategory>('transfer');
  const [transferAccount, setTransferAccount] = useState('');
  const [sourceAccount, setSourceAccount] = useState('');
  const [investmentAccount, setInvestmentAccount] = useState('');
  const [includeInInvestmentTotals, setIncludeInInvestmentTotals] = useState(true);
  const [goalId, setGoalId] = useState('none');
  const [goalImpact, setGoalImpact] = useState<'deposit' | 'withdrawal'>('deposit');

  const allAccounts = useMemo(() => [...bankAccounts, ...brokerAccounts], [bankAccounts, brokerAccounts]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialTransaction) {
      setMonth(initialTransaction.month);
      setType(initialTransaction.type);
      setName(initialTransaction.name);
      setAmount(String(initialTransaction.amount));
      setAccount(initialTransaction.account || '');
      setExpenseAccount(initialTransaction.account || '');
      setCategory(initialTransaction.category || 'necessities');
      setTransferCategory(initialTransaction.transferCategory || 'transfer');
      setTransferAccount(initialTransaction.transferAccount || '');
      setSourceAccount(initialTransaction.sourceAccount || '');
      setInvestmentAccount(initialTransaction.investmentAccount || '');
      setIncludeInInvestmentTotals(initialTransaction.includeInInvestmentTotals ?? true);
      setGoalId(initialTransaction.goalId || 'none');
      setGoalImpact(initialTransaction.goalImpact || 'deposit');
      return;
    }

    const lastTransaction = getLastTransaction();
    if (lastTransaction) {
      setType(lastTransaction.type);
      setCategory(lastTransaction.category || 'necessities');
      setAccount(lastTransaction.account || '');
      setExpenseAccount(lastTransaction.account || '');
      setInvestmentAccount(lastTransaction.investmentAccount || '');
      setIncludeInInvestmentTotals(lastTransaction.includeInInvestmentTotals ?? true);
      setGoalId(lastTransaction.goalId || 'none');
      setGoalImpact(lastTransaction.goalImpact || 'deposit');
    } else {
      setType('expense');
      setCategory('necessities');
      setAccount('');
      setExpenseAccount('');
      setInvestmentAccount('');
      setIncludeInInvestmentTotals(true);
      setGoalId('none');
      setGoalImpact('deposit');
    }

    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setName('');
    setAmount('');
    setTransferCategory('transfer');
    setTransferAccount('');
    setSourceAccount('');
  }, [getLastTransaction, initialTransaction, isOpen]);

  const handleFillRecurring = () => {
    if (!month) return;
    const added = onFillRecurringForMonth(month);
    toast({
      title: added > 0 ? 'Trvalé příkazy doplněny' : 'Bez změn',
      description:
        added > 0
          ? `Do měsíce ${month} bylo přidáno ${added} trvalých transakcí.`
          : `Pro měsíc ${month} už jsou všechny aktivní trvalé příkazy vyplněné.`,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!month || !name || !amount) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte prosím všechna povinná pole.',
        variant: 'destructive',
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: 'Chyba',
        description: 'Zadejte platnou částku.',
        variant: 'destructive',
      });
      return;
    }

    const transaction = {
      month,
      type,
      name,
      amount: numericAmount,
      goalId: goalId === 'none' ? undefined : goalId,
      goalImpact: goalId === 'none' ? undefined : goalImpact,
    } as {
      month: string;
      type: TransactionType;
      name: string;
      amount: number;
      account?: string;
      category?: ExpenseCategory;
      transferCategory?: TransferCategory;
      sourceAccount?: string;
      transferAccount?: string;
      investmentAccount?: string;
      includeInInvestmentTotals?: boolean;
      goalId?: string;
      goalImpact?: 'deposit' | 'withdrawal';
    };

    if (type === 'income' && account) {
      transaction.account = account;
    } else if (type === 'expense') {
      transaction.category = category;
      if (expenseAccount) transaction.account = expenseAccount;
      if (category === 'investments') {
        if (investmentAccount) transaction.investmentAccount = investmentAccount;
        transaction.includeInInvestmentTotals = includeInInvestmentTotals;
      }
    } else if (type === 'transfer') {
      transaction.transferCategory = transferCategory;
      if (sourceAccount) transaction.sourceAccount = sourceAccount;
      if (transferAccount) transaction.transferAccount = transferAccount;
    }

    onSubmit(transaction);
    toast({
      title: isEditing ? 'Transakce upravena' : 'Úspěšně uloženo',
      description: isEditing ? 'Změny byly uloženy.' : 'Transakce byla přidána.',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-background/80 backdrop-blur-sm">
      <div className="h-full w-full max-w-md animate-in slide-in-from-right overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">{isEditing ? 'Upravit transakci' : 'Nová transakce'}</h2>
            <p className="text-sm text-muted-foreground">
              {isEditing ? 'Uprav detail transakce a ulož změny.' : 'Přidej nový záznam do financí.'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {!isEditing && (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Předvyplnit trvalé příkazy</p>
                  <p className="text-xs text-muted-foreground">
                    Pro založení nového měsíce můžeš nejdřív doplnit aktivní trvalé platby.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={handleFillRecurring}>
                  Vyplnit
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="month">Měsíc</Label>
            <Input id="month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Příjem</SelectItem>
                <SelectItem value="expense">Výdaj</SelectItem>
                <SelectItem value="transfer">Převod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Název transakce</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Mzda, nájem, nákup..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Částka (Kč)</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>

          {type === 'income' && (
            <div className="space-y-2">
              <Label>Účet</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger><SelectValue placeholder="Vyberte účet" /></SelectTrigger>
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

          {type === 'expense' && (
            <>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="necessities">Nutnosti</SelectItem>
                    <SelectItem value="whims">Rozmary</SelectItem>
                    <SelectItem value="investments">Investice</SelectItem>
                    <SelectItem value="savings">Spoření</SelectItem>
                    <SelectItem value="selfInvestment">Investice do sebe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Účet</Label>
                <Select value={expenseAccount || 'none'} onValueChange={(value) => setExpenseAccount(value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Vyberte účet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Neurčeno</SelectItem>
                    {allAccounts.map((targetAccount) => (
                      <SelectItem key={targetAccount.id} value={targetAccount.id}>
                        {targetAccount.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {category === 'investments' && (
                <>
                  <div className="space-y-2">
                    <Label>Cílový účet pro investici</Label>
                    <Select value={investmentAccount || 'none'} onValueChange={(value) => setInvestmentAccount(value === 'none' ? '' : value)}>
                      <SelectTrigger><SelectValue placeholder="Vyberte cílový účet" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Bez cílového účtu</SelectItem>
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
                      checked={includeInInvestmentTotals}
                      onChange={(event) => setIncludeInInvestmentTotals(event.target.checked)}
                      className="rounded"
                    />
                    Zahrnout do ročního součtu investované částky
                  </label>
                </>
              )}
            </>
          )}

          {type === 'transfer' && (
            <>
              <div className="space-y-2">
                <Label>Typ převodu</Label>
                <Select value={transferCategory} onValueChange={(value) => setTransferCategory(value as TransferCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Spoření</SelectItem>
                    <SelectItem value="transfer">Převod mezi účty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zdrojový účet</Label>
                <Select value={sourceAccount || 'none'} onValueChange={(value) => setSourceAccount(value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Vyberte zdrojový účet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Neurčeno</SelectItem>
                    {allAccounts.map((targetAccount) => (
                      <SelectItem key={targetAccount.id} value={targetAccount.id}>
                        {targetAccount.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cílový účet</Label>
                <Select value={transferAccount || 'none'} onValueChange={(value) => setTransferAccount(value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Vyberte cílový účet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Neurčeno</SelectItem>
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

          {goals.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Finanční cíl</Label>
                <Select value={goalId} onValueChange={setGoalId}>
                  <SelectTrigger><SelectValue placeholder="Vyberte cíl" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bez cíle</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {goalId !== 'none' && (
                <div className="space-y-2">
                  <Label>Pohyb vůči cíli</Label>
                  <Select value={goalImpact} onValueChange={(value) => setGoalImpact(value as 'deposit' | 'withdrawal')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Vklad do cíle</SelectItem>
                      <SelectItem value="withdrawal">Výběr z cíle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? 'Uložit změny' : 'Přidat transakci'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
