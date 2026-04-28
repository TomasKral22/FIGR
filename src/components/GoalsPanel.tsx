import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Target, Trash2 } from 'lucide-react';
import { AccountGoal, BankAccount, Transaction } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/calculations';

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  goals: AccountGoal[];
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  onAddGoal: (goal: Omit<AccountGoal, 'id' | 'createdAt'>) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalsPanel = ({
  isOpen,
  onClose,
  goals,
  transactions,
  bankAccounts,
  onAddGoal,
  onDeleteGoal,
}: GoalsPanelProps) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [accountId, setAccountId] = useState('none');

  const sortedGoals = useMemo(
    () => ({
      active: goals.filter((goal) => goal.status !== 'completed'),
      completed: goals.filter((goal) => goal.status === 'completed'),
    }),
    [goals]
  );

  const goalTransactions = useMemo(
    () =>
      goals.reduce<Record<string, Transaction[]>>((acc, goal) => {
        acc[goal.id] = transactions
          .filter((transaction) => transaction.goalId === goal.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5);
        return acc;
      }, {}),
    [goals, transactions]
  );

  const handleAddGoal = () => {
    if (!name || !targetAmount) return;

    onAddGoal({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || '0'),
      accountId: accountId === 'none' ? undefined : accountId,
      status: 'active',
    });

    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setAccountId('none');
  };

  const renderGoalCard = (goal: AccountGoal) => {
    const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
    const linkedAccount = bankAccounts.find((account) => account.id === goal.accountId);

    return (
      <div key={goal.id} className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="font-medium">{goal.name}</p>
              {goal.status === 'completed' && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">Splněno</span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(goal.currentAmount)} z {formatCurrency(goal.targetAmount)}
            </p>
            {linkedAccount && (
              <p className="mt-1 text-xs text-muted-foreground">Navázaný účet: {linkedAccount.name}</p>
            )}

            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{progress.toFixed(1)} % splněno</p>

            {goalTransactions[goal.id]?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Poslední pohyby</p>
                {goalTransactions[goal.id].map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{transaction.name}</p>
                      <p className="text-xs text-muted-foreground">{transaction.month}</p>
                    </div>
                    <div className={`flex items-center gap-1 ${transaction.goalImpact === 'withdrawal' ? 'text-destructive' : 'text-success'}`}>
                      {transaction.goalImpact === 'withdrawal' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                      <span>{formatCurrency(transaction.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={() => onDeleteGoal(goal.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Finanční cíle</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Název cíle</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nouzová rezerva, dovolená..." />
            </div>
            <div className="space-y-2">
              <Label>Cílová částka</Label>
              <Input type="number" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="100000" />
            </div>
            <div className="space-y-2">
              <Label>Počáteční stav</Label>
              <Input type="number" value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} placeholder="25000" />
            </div>
            <div className="space-y-2">
              <Label>Navázaný účet</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez účtu</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button onClick={handleAddGoal} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Přidat cíl
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aktivní cíle</h3>
              {sortedGoals.active.length === 0 ? (
                <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  Zatím nemáte žádné aktivní cíle.
                </div>
              ) : (
                sortedGoals.active.map(renderGoalCard)
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Splněné cíle</h3>
              {sortedGoals.completed.length === 0 ? (
                <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  Zatím nemáte žádné splněné cíle.
                </div>
              ) : (
                sortedGoals.completed.map(renderGoalCard)
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
