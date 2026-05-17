import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AccountMonthlySnapshot, Transaction, WealthSnapshot } from '@/types/finance';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/utils/calculations';

interface AnnualReportsProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  snapshots: WealthSnapshot[];
  accountSnapshots: AccountMonthlySnapshot[];
}

type WealthScope = 'all' | 'year' | 'range';

const formatMonthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-');
  return new Date(Number(year), Number(monthNumber) - 1).toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: 'short',
  });
};

export const AnnualReports = ({
  isOpen,
  onClose,
  transactions,
  snapshots,
  accountSnapshots,
}: AnnualReportsProps) => {
  const [wealthScope, setWealthScope] = useState<WealthScope>('all');
  const chartColors = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

  const yearlyData = useMemo(() => {
    const byYear: Record<string, {
      year: string;
      income: number;
      expenses: number;
      transfers: number;
      investments: number;
      balance: number;
    }> = {};

    transactions.forEach((transaction) => {
      const year = transaction.month.slice(0, 4);
      if (!byYear[year]) {
        byYear[year] = {
          year,
          income: 0,
          expenses: 0,
          transfers: 0,
          investments: 0,
          balance: 0,
        };
      }

      if (transaction.type === 'income') byYear[year].income += transaction.amount;
      if (transaction.type === 'expense') {
        byYear[year].expenses += transaction.amount;
        if (transaction.category === 'investments' && transaction.includeInInvestmentTotals !== false) {
          byYear[year].investments += transaction.amount;
        }
      }
      if (transaction.type === 'transfer') byYear[year].transfers += transaction.amount;
    });

    return Object.values(byYear)
      .map((item) => ({ ...item, balance: item.income - item.expenses }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [transactions]);

  const wealthHistory = useMemo(() => {
    const monthlyTotals = accountSnapshots.reduce<Record<string, number>>((acc, snapshot) => {
      acc[snapshot.month] = (acc[snapshot.month] || 0) + snapshot.balance;
      return acc;
    }, {});

    return Object.entries(monthlyTotals)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, total]) => ({
        month,
        label: formatMonthLabel(month),
        totalNetWorth: total,
      }));
  }, [accountSnapshots]);

  const monthlyChartData = useMemo(() => {
    const byMonth: Record<string, { name: string; income: number; expenses: number; transfers: number; balance: number }> = {};

    transactions.forEach((transaction) => {
      if (!byMonth[transaction.month]) {
        byMonth[transaction.month] = {
          name: formatMonthLabel(transaction.month),
          income: 0,
          expenses: 0,
          transfers: 0,
          balance: 0,
        };
      }

      if (transaction.type === 'income') byMonth[transaction.month].income += transaction.amount;
      if (transaction.type === 'expense') byMonth[transaction.month].expenses += transaction.amount;
      if (transaction.type === 'transfer') byMonth[transaction.month].transfers += transaction.amount;
    });

    return Object.entries(byMonth)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, item]) => ({ ...item, balance: item.income - item.expenses }));
  }, [transactions]);

  const expenseCategoryData = useMemo(() => {
    const labels: Record<string, string> = {
      necessities: 'Nutnosti',
      whims: 'Rozmary',
      investments: 'Investice',
      savings: 'Spoření',
      selfInvestment: 'Investice do sebe',
    };

    const totals = transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce<Record<string, number>>((acc, transaction) => {
        const key = transaction.category || 'other';
        acc[key] = (acc[key] || 0) + transaction.amount;
        return acc;
      }, {});

    return Object.entries(totals).map(([key, value], index) => ({
      name: labels[key] || key,
      value,
      color: chartColors[index % chartColors.length],
    }));
  }, [transactions]);

  const availableYears = useMemo(
    () => Array.from(new Set(wealthHistory.map((item) => item.month.slice(0, 4)))).sort(),
    [wealthHistory]
  );
  const availableMonths = wealthHistory.map((item) => item.month);
  const defaultYear = availableYears[availableYears.length - 1] || '';
  const defaultStartMonth = availableMonths[0] || '';
  const defaultEndMonth = availableMonths[availableMonths.length - 1] || '';

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [startMonth, setStartMonth] = useState(defaultStartMonth);
  const [endMonth, setEndMonth] = useState(defaultEndMonth);

  useEffect(() => {
    if (!selectedYear && defaultYear) setSelectedYear(defaultYear);
    if (!startMonth && defaultStartMonth) setStartMonth(defaultStartMonth);
    if (!endMonth && defaultEndMonth) setEndMonth(defaultEndMonth);
  }, [defaultEndMonth, defaultStartMonth, defaultYear, endMonth, selectedYear, startMonth]);

  const filteredWealthHistory = useMemo(() => {
    if (wealthScope === 'year' && selectedYear) {
      return wealthHistory.filter((item) => item.month.startsWith(selectedYear));
    }

    if (wealthScope === 'range' && startMonth && endMonth) {
      return wealthHistory.filter((item) => item.month >= startMonth && item.month <= endMonth);
    }

    return wealthHistory;
  }, [wealthHistory, wealthScope, selectedYear, startMonth, endMonth]);

  const netWorthHistory = useMemo(
    () =>
      [...snapshots]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((snapshot) => ({
          date: snapshot.createdAt.slice(0, 10),
          totalNetWorth: snapshot.totalNetWorth,
          bankAssets: snapshot.bankAssets,
          brokerAssets: snapshot.brokerAssets,
        })),
    [snapshots]
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-[95vw] md:p-6">
        <SheetHeader className="pb-4">
          <SheetTitle>Reporty a grafy</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {yearlyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Calendar className="mb-4 h-12 w-12" />
              <p className="text-lg">Zatím nejsou k dispozici data pro report.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {yearlyData.slice(-4).reverse().map((item) => (
                  <Card key={item.year}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">{item.year}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <p className="text-sm">Příjmy: <span className="font-semibold">{formatCurrency(item.income)}</span></p>
                      <p className="text-sm">Výdaje: <span className="font-semibold">{formatCurrency(item.expenses)}</span></p>
                      <p className="text-sm">Investováno: <span className="font-semibold">{formatCurrency(item.investments)}</span></p>
                      <p className="text-sm">Bilance: <span className={`font-semibold ${item.balance >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(item.balance)}</span></p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Roční souhrn</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="income" fill="hsl(var(--primary))" name="Příjmy" />
                        <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Výdaje" />
                        <Bar dataKey="investments" fill="hsl(var(--success))" name="Investováno" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vývoj majetku podle měsíců</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant={wealthScope === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setWealthScope('all')}>
                      Celá historie
                    </Button>
                    <Button variant={wealthScope === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setWealthScope('year')}>
                      Vybraný rok
                    </Button>
                    <Button variant={wealthScope === 'range' ? 'default' : 'outline'} size="sm" onClick={() => setWealthScope('range')}>
                      Vybrané měsíce
                    </Button>
                  </div>

                  {wealthScope === 'year' && (
                    <div className="max-w-xs">
                      <Input value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} placeholder="2026" />
                    </div>
                  )}

                  {wealthScope === 'range' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} />
                      <Input type="month" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} />
                    </div>
                  )}

                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredWealthHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Line type="monotone" dataKey="totalNetWorth" stroke="hsl(var(--primary))" strokeWidth={2} name="Majetek" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vývoj majetku ze snapshotů</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={netWorthHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Line type="monotone" dataKey="totalNetWorth" stroke="hsl(var(--primary))" strokeWidth={2} name="Čistý majetek" />
                        <Line type="monotone" dataKey="bankAssets" stroke="hsl(var(--warning))" strokeWidth={2} name="Banky" />
                        <Line type="monotone" dataKey="brokerAssets" stroke="hsl(var(--success))" strokeWidth={2} name="Brokerské účty" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grafy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Příjmy, výdaje a převody po měsících</p>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="income" fill="hsl(var(--success))" name="Příjmy" />
                          <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Výdaje" />
                          <Bar dataKey="transfers" fill="hsl(var(--warning))" name="Převody" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {expenseCategoryData.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Rozdělení výdajů podle kategorií</p>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={expenseCategoryData} dataKey="value" nameKey="name" outerRadius={110} labelLine={false}>
                              {expenseCategoryData.map((entry, index) => (
                                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <p className="text-sm font-medium">Trend měsíční bilance</p>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} name="Bilance" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
