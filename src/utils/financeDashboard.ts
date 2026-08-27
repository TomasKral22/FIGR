import {
  AccountMonthlySnapshot,
  BudgetAllocation,
  BudgetLimit,
  ExpenseCategory,
  MonthClosure,
  RecurringTransaction,
  Subcategory,
  Transaction,
} from '@/types/finance';
import { getBudgetAlerts } from '@/utils/categoryAutomation';
import { getCategoryName } from '@/utils/categoryNames';
import { groupTransactionsByMonth } from '@/utils/calculations';

export interface MonthChangeItem {
  key: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
}

export interface RecurringMonthStatus {
  recurringId: string;
  name: string;
  amount: number;
  type: RecurringTransaction['type'];
  status: 'accounted' | 'missing';
}

export interface WorkflowChecklistItem {
  id: string;
  label: string;
  status: 'done' | 'warning' | 'pending';
  detail: string;
}

const CORE_CATEGORIES: ExpenseCategory[] = ['necessities', 'investments', 'savings', 'whims'];

const matchesRecurringTransaction = (
  recurring: RecurringTransaction,
  transaction: Transaction,
  month: string
) =>
  transaction.month === month &&
  transaction.type === recurring.type &&
  transaction.name.trim().toLowerCase() === recurring.name.trim().toLowerCase() &&
  Math.abs(transaction.amount - recurring.amount) < 0.01 &&
  transaction.account === recurring.account &&
  transaction.category === recurring.category &&
  transaction.transferCategory === recurring.transferCategory &&
  transaction.sourceAccount === recurring.sourceAccount &&
  transaction.transferAccount === recurring.transferAccount &&
  transaction.investmentAccount === recurring.investmentAccount;

export const getMonthSeries = (transactions: Transaction[], selectedYear: string) =>
  groupTransactionsByMonth(transactions.filter((transaction) => transaction.month.startsWith(selectedYear)));

export const getLatestAndPreviousMonth = (transactions: Transaction[], selectedYear: string) => {
  const months = getMonthSeries(transactions, selectedYear);
  return {
    latestMonth: months[0] || null,
    previousMonth: months[1] || null,
  };
};

export const buildTopMonthChanges = (
  transactions: Transaction[],
  selectedYear: string,
  limit = 5
): MonthChangeItem[] => {
  const { latestMonth, previousMonth } = getLatestAndPreviousMonth(transactions, selectedYear);
  if (!latestMonth) return [];

  const items: MonthChangeItem[] = [
    {
      key: 'income',
      label: 'Příjmy',
      current: latestMonth.totalIncome,
      previous: previousMonth?.totalIncome || 0,
      delta: latestMonth.totalIncome - (previousMonth?.totalIncome || 0),
    },
    {
      key: 'expenses',
      label: 'Výdaje',
      current: latestMonth.totalExpenses,
      previous: previousMonth?.totalExpenses || 0,
      delta: latestMonth.totalExpenses - (previousMonth?.totalExpenses || 0),
    },
    {
      key: 'balance',
      label: 'Bilance',
      current: latestMonth.balance,
      previous: previousMonth?.balance || 0,
      delta: latestMonth.balance - (previousMonth?.balance || 0),
    },
    ...CORE_CATEGORIES.map((category) => ({
      key: category,
      label: getCategoryName(category),
      current: latestMonth.categoryBreakdown[category] || 0,
      previous: previousMonth?.categoryBreakdown[category] || 0,
      delta: (latestMonth.categoryBreakdown[category] || 0) - (previousMonth?.categoryBreakdown[category] || 0),
    })),
  ];

  return items
    .filter((item) => item.current !== 0 || item.previous !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, limit);
};

export const buildRecurringMonthStatuses = (
  recurringTransactions: RecurringTransaction[],
  transactions: Transaction[],
  month: string
): RecurringMonthStatus[] =>
  recurringTransactions
    .filter((transaction) => transaction.isActive)
    .map<RecurringMonthStatus>((recurring) => ({
      recurringId: recurring.id,
      name: recurring.name,
      amount: recurring.amount,
      type: recurring.type,
      status: transactions.some((transaction) => matchesRecurringTransaction(recurring, transaction, month))
        ? 'accounted'
        : 'missing',
    }))
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === 'missing' ? -1 : 1;
      return left.name.localeCompare(right.name, 'cs');
    });

export const buildWorkflowChecklist = ({
  month,
  monthLocked,
  recurringStatuses,
  accountSnapshots,
  budgetLimits,
  transactions,
  subcategories,
}: {
  month: string;
  monthLocked: boolean;
  recurringStatuses: RecurringMonthStatus[];
  accountSnapshots: AccountMonthlySnapshot[];
  budgetLimits: BudgetLimit[];
  transactions: Transaction[];
  subcategories: Subcategory[];
}): WorkflowChecklistItem[] => {
  const monthTransactions = transactions.filter((transaction) => transaction.month === month);
  const monthBudgetAlerts = getBudgetAlerts(budgetLimits, transactions, subcategories, month);
  const missingRecurring = recurringStatuses.filter((item) => item.status === 'missing');
  const importedSnapshots = accountSnapshots.filter((snapshot) => snapshot.source === 'import');

  return [
    {
      id: 'recurring',
      label: 'Trvalé platby',
      status: missingRecurring.length === 0 ? 'done' : 'warning',
      detail:
        missingRecurring.length === 0
          ? 'Všechny aktivní trvalé platby jsou zaúčtované.'
          : `Chybí ${missingRecurring.length} aktivních trvalých plateb.`,
    },
    {
      id: 'snapshots',
      label: 'Stavy účtů',
      status: accountSnapshots.length > 0 ? 'done' : 'pending',
      detail:
        accountSnapshots.length > 0
          ? importedSnapshots.length > 0
            ? `${importedSnapshots.length} stavů bylo ručně upraveno nebo importováno.`
            : 'Měsíční stavy účtů jsou k dispozici.'
          : 'Zkontroluj nebo doplň stavy účtů pro tento měsíc.',
    },
    {
      id: 'budget',
      label: 'Rozpočty a limity',
      status:
        monthBudgetAlerts.some((alert) => alert.level === 'critical' || alert.level === 'exceeded')
          ? 'warning'
          : monthBudgetAlerts.length > 0
            ? 'pending'
            : 'done',
      detail:
        monthBudgetAlerts.length === 0
          ? 'Žádný rozpočtový limit teď nevyžaduje zásah.'
          : `${monthBudgetAlerts.length} limitů potřebuje kontrolu.`,
    },
    {
      id: 'closure',
      label: 'Uzávěrka měsíce',
      status: monthLocked ? 'done' : monthTransactions.length > 0 ? 'pending' : 'warning',
      detail: monthLocked
        ? 'Měsíc je uzavřený a označený jako zkontrolovaný.'
        : monthTransactions.length > 0
          ? 'Po kontrole transakcí a stavů účtů měsíc uzavři.'
          : 'V měsíci zatím nejsou transakce nebo chybí evidence.',
    },
  ];
};

export const buildPlanVsRealityRows = ({
  totalIncome,
  categoryBreakdown,
  budgetAllocation,
}: {
  totalIncome: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  budgetAllocation: BudgetAllocation;
}) =>
  CORE_CATEGORIES.map((category) => {
    const plannedRatio = budgetAllocation[category] || 0;
    const plannedAmount = totalIncome * (plannedRatio / 100);
    const actualAmount = categoryBreakdown[category] || 0;
    return {
      category,
      label: getCategoryName(category),
      plannedRatio,
      plannedAmount,
      actualAmount,
      variance: actualAmount - plannedAmount,
    };
  });

export const buildPendingItems = ({
  month,
  recurringStatuses,
  monthLocked,
  budgetLimits,
  transactions,
  subcategories,
}: {
  month: string;
  recurringStatuses: RecurringMonthStatus[];
  monthLocked: boolean;
  budgetLimits: BudgetLimit[];
  transactions: Transaction[];
  subcategories: Subcategory[];
}) => {
  const monthBudgetAlerts = getBudgetAlerts(budgetLimits, transactions, subcategories, month);
  const missingRecurring = recurringStatuses.filter((item) => item.status === 'missing');
  const items: string[] = [];

  if (missingRecurring.length > 0) {
    items.push(`Doplnit trvalé platby: ${missingRecurring.slice(0, 3).map((item) => item.name).join(', ')}`);
  }

  if (monthBudgetAlerts.length > 0) {
    items.push(`Prověřit rozpočtové limity: ${monthBudgetAlerts.slice(0, 2).map((item) => item.categoryLabel).join(', ')}`);
  }

  if (!monthLocked) {
    items.push(`Uzavřít měsíc ${month} po kontrole transakcí a stavů účtů.`);
  }

  return items;
};

export const buildOpenMonthSummary = (
  transactions: Transaction[],
  monthClosures: MonthClosure[],
  selectedYear: string
) => {
  const months = Array.from(
    new Set(transactions.filter((transaction) => transaction.month.startsWith(selectedYear)).map((transaction) => transaction.month))
  ).sort();
  const closed = new Set(monthClosures.map((entry) => entry.month));
  const openMonths = months.filter((month) => !closed.has(month));
  return {
    months,
    openMonths,
    latestOpenMonth: openMonths[openMonths.length - 1] || null,
  };
};
