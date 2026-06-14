import { AccountGoal, BankAccount, Transaction } from '@/types/finance';

export interface GoalSummary {
  goal: AccountGoal;
  linkedAccount?: BankAccount;
  progress: number;
  remainingAmount: number;
  requiredMonthlyContribution: number | null;
  monthsToTarget: number | null;
  latestMovementAt: string | null;
}

const toMonthStart = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getInclusiveMonthSpan = (from: string | Date, to: string | Date) => {
  const fromMonth = toMonthStart(from);
  const toMonth = toMonthStart(to);

  return Math.max(
    1,
    (toMonth.getFullYear() - fromMonth.getFullYear()) * 12 +
      (toMonth.getMonth() - fromMonth.getMonth()) +
      1
  );
};

export const buildGoalSummaries = (
  goals: AccountGoal[],
  transactions: Transaction[],
  bankAccounts: BankAccount[]
): GoalSummary[] => {
  const now = new Date();

  return goals
    .map((goal) => {
      const linkedAccount = bankAccounts.find((account) => account.id === goal.accountId);
      const relatedTransactions = transactions
        .filter(
          (transaction) =>
            transaction.goalId === goal.id && (!goal.createdAt || transaction.createdAt >= goal.createdAt)
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      const progress =
        goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
      const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);

      let monthsToTarget: number | null = null;
      let requiredMonthlyContribution: number | null = null;

      if (goal.targetDate) {
        const targetDate = new Date(goal.targetDate);
        if (!Number.isNaN(targetDate.getTime())) {
          monthsToTarget = getInclusiveMonthSpan(now, targetDate);
          requiredMonthlyContribution =
            remainingAmount > 0 ? Number((remainingAmount / monthsToTarget).toFixed(2)) : 0;
        }
      }

      return {
        goal,
        linkedAccount,
        progress,
        remainingAmount,
        requiredMonthlyContribution,
        monthsToTarget,
        latestMovementAt: relatedTransactions[0]?.createdAt || null,
      };
    })
    .sort((left, right) => {
      if (left.goal.status === 'completed' && right.goal.status !== 'completed') return 1;
      if (left.goal.status !== 'completed' && right.goal.status === 'completed') return -1;
      return left.remainingAmount - right.remainingAmount;
    });
};
