import { AccountGoal, BankAccount, Transaction } from '@/types/finance';

export interface GoalSummary {
  goal: AccountGoal;
  linkedAccount?: BankAccount;
  progress: number;
  remainingAmount: number;
  contributedThisYear: number;
  monthlyPace: number;
  estimatedMonthsRemaining: number | null;
  latestMovementAt: string | null;
}

export const buildGoalSummaries = (
  goals: AccountGoal[],
  transactions: Transaction[],
  bankAccounts: BankAccount[],
  selectedYear: string
): GoalSummary[] => {
  const monthsElapsed = Math.max(new Date().getMonth() + 1, 1);

  return goals
    .map((goal) => {
      const linkedAccount = bankAccounts.find((account) => account.id === goal.accountId);
      const relatedTransactions = transactions
        .filter((transaction) => transaction.goalId === goal.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      const contributedThisYear = relatedTransactions
        .filter((transaction) => transaction.month.startsWith(selectedYear))
        .reduce((sum, transaction) => {
          if (transaction.goalImpact === 'withdrawal') return sum - transaction.amount;
          return sum + transaction.amount;
        }, 0);

      const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
      const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);
      const monthlyPace = contributedThisYear > 0 ? contributedThisYear / monthsElapsed : 0;
      const estimatedMonthsRemaining =
        remainingAmount > 0 && monthlyPace > 0 ? Number((remainingAmount / monthlyPace).toFixed(1)) : null;

      return {
        goal,
        linkedAccount,
        progress,
        remainingAmount,
        contributedThisYear,
        monthlyPace,
        estimatedMonthsRemaining,
        latestMovementAt: relatedTransactions[0]?.createdAt || null,
      };
    })
    .sort((left, right) => {
      if (left.goal.status === 'completed' && right.goal.status !== 'completed') return 1;
      if (left.goal.status !== 'completed' && right.goal.status === 'completed') return -1;
      return left.remainingAmount - right.remainingAmount;
    });
};
