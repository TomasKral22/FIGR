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
      <div className="panel-card">
        <p className="text-sm text-muted-foreground">
          Roční přehled zatím není k dispozici. Jakmile přibudou transakce, objeví se tady souhrn po jednotlivých letech.
        </p>
      </div>
    );
  }

  return (
    <section className="panel-card">
      <div className="section-header mb-5">
        <h2 className="text-section">Pohled po letech</h2>
        <p className="section-description">Přepínej roky bez opuštění hlavního workflow. Zvolený rok řídí měsíční přehled i návazné reporty.</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {yearlyData.map((yearData) => (
          <Button
            key={yearData.year}
            variant={selectedYear === yearData.year ? 'default' : 'secondary'}
            onClick={() => onSelectYear(yearData.year)}
            className="gap-2"
          >
            {selectedYear === yearData.year ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {yearData.year}
          </Button>
        ))}
      </div>

      {selectedYearData && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="metric-card">
              <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Příjmy</p>
              <p className="mt-2 text-xl font-semibold text-success">{formatCurrency(selectedYearData.totalIncome)}</p>
            </div>
            <div className="metric-card">
              <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Výdaje</p>
              <p className="mt-2 text-xl font-semibold text-destructive">{formatCurrency(selectedYearData.totalExpenses)}</p>
            </div>
            <div className="metric-card">
              <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Převody</p>
              <p className="mt-2 text-xl font-semibold text-warning">{formatCurrency(selectedYearData.totalTransfers)}</p>
            </div>
            <div className="metric-card">
              <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Bilance</p>
              <p className={`mt-2 text-xl font-semibold ${selectedYearData.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(selectedYearData.balance)}
              </p>
            </div>
          </div>

          <div className="panel-card-muted">
            <p className="mb-3 font-medium">Struktura výdajů</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.entries(selectedYearData.categoryBreakdown) as [ExpenseCategory, number][])
                .filter(([, amount]) => amount > 0)
                .map(([category, amount]) => (
                  <div key={category} className="rounded-[var(--radius-control)] bg-card/72 p-3">
                    <p className="text-sm text-muted-foreground">{getCategoryName(category)}</p>
                    <p className="mt-1 font-semibold">{formatCurrency(amount)}</p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {getCategoryPercentage(amount, selectedYearData.totalIncome).toFixed(1)} % příjmů
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
