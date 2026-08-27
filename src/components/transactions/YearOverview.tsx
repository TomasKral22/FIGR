import { MonthCard } from './MonthCard';

interface YearMonthOverviewItem {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  status: 'open' | 'closed' | 'adjusted' | 'warning';
}

interface YearOverviewProps {
  months: YearMonthOverviewItem[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const YearOverview = ({ months, selectedMonth, onSelectMonth }: YearOverviewProps) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => (
          <MonthCard
            key={month.month}
            monthLabel={month.monthLabel}
            income={month.totalIncome}
            expenses={month.totalExpenses}
            balance={month.balance}
            transactionCount={month.transactionCount}
            status={month.status}
            isSelected={selectedMonth === month.month}
            onClick={() => onSelectMonth(month.month)}
          />
        ))}
      </div>
    </div>
  );
};
