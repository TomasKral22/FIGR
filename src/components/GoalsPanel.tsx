import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Target, Trash2 } from 'lucide-react';
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
import { buildGoalSummaries } from '@/utils/goalSummaries';

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  goals: AccountGoal[];
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  onAddGoal: (goal: Omit<AccountGoal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (id: string, goal: Omit<AccountGoal, 'id' | 'createdAt'>) => void;
  onDeleteGoal: (id: string) => void;
}

const todayDateValue = () => new Date().toISOString().slice(0, 10);

export const GoalsPanel = ({
  isOpen,
  onClose,
  goals,
  transactions,
  bankAccounts,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}: GoalsPanelProps) => {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [accountId, setAccountId] = useState('none');
  const [formError, setFormError] = useState<string | null>(null);

  const goalSummaries = useMemo(
    () => buildGoalSummaries(goals, transactions, bankAccounts),
    [bankAccounts, goals, transactions]
  );

  const sortedGoals = useMemo(
    () => ({
      active: goalSummaries.filter((item) => item.goal.status !== 'completed'),
      completed: goalSummaries.filter((item) => item.goal.status === 'completed'),
    }),
    [goalSummaries]
  );

  const goalTransactions = useMemo(
    () =>
      goals.reduce<Record<string, Transaction[]>>((acc, goal) => {
        acc[goal.id] = transactions
          .filter(
            (transaction) =>
              transaction.goalId === goal.id && (!goal.createdAt || transaction.createdAt >= goal.createdAt)
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5);
        return acc;
      }, {}),
    [goals, transactions]
  );

  const resetForm = () => {
    setEditingGoalId(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    setAccountId('none');
    setFormError(null);
  };

  const handleSaveGoal = () => {
    if (!name.trim() || !targetAmount || !targetDate) {
      setFormError('Vyplň název cíle, cílovou částku a termín.');
      return;
    }

    if (targetDate < todayDateValue()) {
      setFormError('Termín cíle nemůže být v minulosti.');
      return;
    }

    const payload = {
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || '0'),
      targetDate,
      accountId: accountId === 'none' ? undefined : accountId,
      status: 'active' as const,
    };

    if (editingGoalId) {
      onUpdateGoal(editingGoalId, payload);
    } else {
      onAddGoal(payload);
    }

    resetForm();
  };

  const handleEditGoal = (goal: AccountGoal) => {
    setEditingGoalId(goal.id);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setTargetDate(goal.targetDate || '');
    setAccountId(goal.accountId || 'none');
    setFormError(null);
  };

  const renderGoalCard = (summary: (typeof goalSummaries)[number]) => {
    const { goal, linkedAccount, progress, remainingAmount, requiredMonthlyContribution } = summary;

    return (
      <div key={goal.id} className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 shrink-0 text-primary" />
              <p className="break-words font-medium">{goal.name}</p>
              {goal.status === 'completed' ? (
                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                  Splněno
                </span>
              ) : null}
            </div>

            {linkedAccount ? (
              <p className="mt-1 break-words text-xs text-muted-foreground">
                Navázaný účet: {linkedAccount.name}
              </p>
            ) : null}
            {goal.targetDate ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Termín: {new Date(goal.targetDate).toLocaleDateString('cs-CZ')}
              </p>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Cíl</p>
                <p className="mt-1 break-words font-semibold leading-tight">{formatCurrency(goal.targetAmount)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Aktuálně</p>
                <p className="mt-1 break-words font-semibold leading-tight">{formatCurrency(goal.currentAmount)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Zbývá</p>
                <p className="mt-1 break-words font-semibold leading-tight">{formatCurrency(remainingAmount)}</p>
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>

            {requiredMonthlyContribution !== null ? (
              <p className="mt-2 break-words text-xs text-muted-foreground">
                Pro splnění do termínu je potřeba ukládat přibližně{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(requiredMonthlyContribution)}
                </span>{' '}
                měsíčně.
              </p>
            ) : null}

            {goalTransactions[goal.id]?.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Poslední pohyby</p>
                {goalTransactions[goal.id].map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{transaction.name}</p>
                      <p className="text-xs text-muted-foreground">{transaction.month}</p>
                    </div>
                    <div
                      className={`flex shrink-0 items-center gap-1 ${
                        transaction.goalImpact === 'withdrawal' ? 'text-destructive' : 'text-success'
                      }`}
                    >
                      {transaction.goalImpact === 'withdrawal' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                      <span>{formatCurrency(transaction.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEditGoal(goal)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteGoal(goal.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const totalRemaining = sortedGoals.active.reduce((sum, item) => sum + item.remainingAmount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Finanční cíle</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto pr-2">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Aktivní cíle</p>
              <p className="mt-1 text-2xl font-semibold">{sortedGoals.active.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Celkem zbývá</p>
              <p className="mt-1 break-words text-2xl font-semibold leading-tight">{formatCurrency(totalRemaining)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Splněné cíle</p>
              <p className="mt-1 text-2xl font-semibold">{sortedGoals.completed.length}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Název cíle</Label>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Nouzová rezerva, dovolená..."
              />
            </div>
            <div className="space-y-2">
              <Label>Cílová částka</Label>
              <Input
                type="number"
                value={targetAmount}
                onChange={(event) => {
                  setTargetAmount(event.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label>Počáteční stav bez navázaného účtu</Label>
              <Input
                type="number"
                value={currentAmount}
                onChange={(event) => setCurrentAmount(event.target.value)}
                placeholder="25000"
              />
              <p className="text-xs text-muted-foreground">
                To je výchozí naspořená částka při založení nebo úpravě cíle.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Termín cíle</Label>
              <Input
                type="date"
                min={todayDateValue()}
                value={targetDate}
                onChange={(event) => {
                  setTargetDate(event.target.value);
                  if (formError) setFormError(null);
                }}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Navázaný účet</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="min-w-0">
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
              <p className="break-words text-xs text-muted-foreground">
                Účet je informační vazba. Samotný postup cíle se počítá z počáteční částky a z transakcí
                označených tímto cílem.
              </p>
            </div>
            <div className="md:col-span-2">
              <Button onClick={handleSaveGoal} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {editingGoalId ? 'Uložit úpravy cíle' : 'Přidat cíl'}
              </Button>
              {editingGoalId ? (
                <Button type="button" variant="outline" className="mt-2 w-full" onClick={resetForm}>
                  Zrušit úpravy
                </Button>
              ) : null}
              {formError ? <p className="mt-2 text-sm text-destructive">{formError}</p> : null}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aktivní cíle</h3>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {sortedGoals.active.length === 0 ? (
                  <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                    Zatím nemáte žádné aktivní cíle.
                  </div>
                ) : (
                  sortedGoals.active.map(renderGoalCard)
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Splněné cíle</h3>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
