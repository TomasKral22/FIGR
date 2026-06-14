import { ArrowRight, PiggyBank, Target } from 'lucide-react';
import { AccountGoal, BankAccount, Transaction } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/calculations';
import { buildGoalSummaries } from '@/utils/goalSummaries';

interface GoalSavingsPanelProps {
  goals: AccountGoal[];
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  selectedYear: string;
  onOpenGoals: () => void;
}

export const GoalSavingsPanel = ({
  goals,
  transactions,
  bankAccounts,
  selectedYear,
  onOpenGoals,
}: GoalSavingsPanelProps) => {
  const goalSummaries = buildGoalSummaries(goals, transactions, bankAccounts, selectedYear);
  const activeSummaries = goalSummaries.filter((item) => item.goal.status !== 'completed');
  const totalRemaining = activeSummaries.reduce((sum, item) => sum + item.remainingAmount, 0);

  return (
    <section className="panel-card">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <PiggyBank className="h-3.5 w-3.5" />
            Zbývá našetřit
          </div>
          <h2 className="mt-3 text-section">Přehled finančních cílů</h2>
          <p className="section-description">
            Rychlý souhrn toho, kolik ještě chybí do jednotlivých cílů a jakým tempem se plní.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Celkem zbývá</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalRemaining)}</p>
          <p className="text-xs text-muted-foreground">{activeSummaries.length} aktivních cílů</p>
        </div>
      </div>

      {goalSummaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Zatím nemáte založené žádné cíle.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={onOpenGoals}>
            <Target className="mr-2 h-4 w-4" />
            Založit první cíl
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goalSummaries.slice(0, 4).map((item) => (
            <div key={item.goal.id} className="rounded-2xl border border-border/70 bg-background/50 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.goal.name}</p>
                    {item.goal.status === 'completed' ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">Splněno</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(item.goal.currentAmount)} z {formatCurrency(item.goal.targetAmount)}
                    {item.linkedAccount ? ` · účet ${item.linkedAccount.name}` : ''}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Zbývá</p>
                  <p className="text-lg font-semibold">{formatCurrency(item.remainingAmount)}</p>
                </div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tempo letos</p>
                  <p className={`mt-1 font-semibold ${item.contributedThisYear >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(item.contributedThisYear)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Průměr / měsíc</p>
                  <p className="mt-1 font-semibold">{formatCurrency(item.monthlyPace)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Odhad doplnění</p>
                  <p className="mt-1 font-semibold">
                    {item.goal.status === 'completed'
                      ? 'Hotovo'
                      : item.estimatedMonthsRemaining !== null
                        ? `${item.estimatedMonthsRemaining} měs.`
                        : 'Bez tempa'}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onOpenGoals}>
              Otevřít všechny cíle
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
