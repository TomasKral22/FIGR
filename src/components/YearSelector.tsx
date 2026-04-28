import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Transaction, ExpenseCategory } from '@/types/finance';
import { formatCurrency, groupTransactionsByMonth, getCategoryPercentage } from '@/utils/calculations';
import { getCategoryName } from '@/utils/categoryNames';
import { useMemo } from 'react';

interface YearSelectorProps {
  transactions: Transaction[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

interface YearData {
  year: string;
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  balance: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
}

export const YearSelector = ({ transactions, selectedYear, onSelectYear }: YearSelectorProps) => {
  const yearlyData = useMemo(() => {
    const monthlyData = groupTransactionsByMonth(transactions);
    const years: Record<string, YearData> = {};

    monthlyData.forEach((month) => {
      const year = month.month.split('-')[0];

      if (!years[year]) {
        years[year] = {
          year,
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

      years[year].totalIncome += month.totalIncome;
      years[year].totalExpenses += month.totalExpenses;
      years[year].totalTransfers += month.totalTransfers;

      Object.keys(month.categoryBreakdown).forEach((categoryKey) => {
        const category = categoryKey as ExpenseCategory;
        years[year].categoryBreakdown[category] += month.categoryBreakdown[category];
      });
    });

    Object.values(years).forEach((yearData) => {
      yearData.balance = yearData.totalIncome + yearData.totalTransfers - yearData.totalExpenses;
    });

    return Object.values(years).sort((a, b) => b.year.localeCompare(a.year));
  }, [transactions]);

  const selectedYearData = yearlyData.find((year) => year.year === selectedYear);

  if (yearlyData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Zatím nemáte žádná data pro roční přehled. Jakmile přidáte první transakce, objeví se tady vývoj po jednotlivých letech.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {yearlyData.map((yearData) => (
          <Button
            key={yearData.year}
            variant={selectedYear === yearData.year ? 'default' : 'outline'}
            onClick={() => onSelectYear(yearData.year)}
            className="gap-2"
          >
            {selectedYear === yearData.year ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {yearData.year}
            <span className={`hidden text-sm sm:inline ${yearData.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(yearData.balance)}
            </span>
          </Button>
        ))}
      </div>

      {selectedYearData && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5 md:p-6">
          <h3 className="text-lg font-bold sm:text-xl">Roční přehled {selectedYearData.year}</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-success/10 p-3">
              <p className="text-sm text-muted-foreground">Příjmy</p>
              <p className="break-words text-base font-bold text-success sm:text-lg">{formatCurrency(selectedYearData.totalIncome)}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-sm text-muted-foreground">Výdaje</p>
              <p className="break-words text-base font-bold text-destructive sm:text-lg">{formatCurrency(selectedYearData.totalExpenses)}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3">
              <p className="text-sm text-muted-foreground">Převody</p>
              <p className="break-words text-base font-bold text-warning sm:text-lg">{formatCurrency(selectedYearData.totalTransfers)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <p className="text-sm text-muted-foreground">Bilance</p>
              <p className={`break-words text-base font-bold sm:text-lg ${selectedYearData.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(selectedYearData.balance)}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-3 sm:p-4">
            <h4 className="mb-3 text-sm font-semibold">Rozdělení výdajů podle kategorií</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.entries(selectedYearData.categoryBreakdown) as [ExpenseCategory, number][]).map(([category, amount]) => (
                <div key={category} className="text-sm">
                  <p className="text-muted-foreground">{getCategoryName(category)}</p>
                  <p className="font-semibold">{formatCurrency(amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryPercentage(amount, selectedYearData.totalIncome).toFixed(1)} % příjmů
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
