import { Transaction, MonthlyData, ExpenseCategory } from '@/types/finance';
import { normalizeCurrencyCode } from '@/utils/currency';

export const getSignedAmount = (amount: number) => amount;

export const getExpenseCashAmount = (amount: number) => Math.abs(amount);

export const getTransferCashAmount = (amount: number) => Math.abs(amount);

export const groupTransactionsByMonth = (transactions: Transaction[]): MonthlyData[] => {
  const grouped = transactions.reduce((acc, transaction) => {
    const month = transaction.month;
    if (!acc[month]) {
      acc[month] = {
        month,
        income: [],
        expenses: [],
        transfers: [],
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
        balance: 0,
        categoryBreakdown: {
          necessities: 0,
          whims: 0,
          investments: 0,
          savings: 0,
          selfInvestment: 0,
        },
      };
    }

    if (transaction.type === 'income') {
      acc[month].income.push(transaction);
      acc[month].totalIncome += transaction.amount;
    } else if (transaction.type === 'expense') {
      acc[month].expenses.push(transaction);
      acc[month].totalExpenses += getExpenseCashAmount(transaction.amount);
      if (transaction.category) {
        acc[month].categoryBreakdown[transaction.category] += getSignedAmount(transaction.amount);
      }
    } else if (transaction.type === 'transfer') {
      acc[month].transfers.push(transaction);
      acc[month].totalTransfers += getTransferCashAmount(transaction.amount);
    }

    return acc;
  }, {} as Record<string, MonthlyData>);

  // Calculate balances
  Object.values(grouped).forEach((monthData) => {
    monthData.balance = monthData.totalIncome + monthData.totalTransfers - monthData.totalExpenses;
  });

  // Sort by month (newest first)
  return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
};

export const formatCurrency = (amount: number, currency = 'CZK'): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: normalizeCurrencyCode(currency, 'CZK'),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long' });
};

export const getCategoryPercentage = (categoryAmount: number, totalIncome: number): number => {
  if (totalIncome === 0) return 0;
  return (categoryAmount / totalIncome) * 100;
};

export const calculateProjectedPortfolio = (
  currentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): number => {
  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;

  // Future value of current investment
  const futureValueCurrent = currentValue * Math.pow(1 + monthlyRate, months);

  // Future value of monthly contributions (annuity)
  const futureValueContributions =
    monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return futureValueCurrent + futureValueContributions;
};
