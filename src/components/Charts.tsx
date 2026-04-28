import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Transaction } from '@/types/finance';
import { groupTransactionsByMonth, formatMonth } from '@/utils/calculations';

interface ChartsProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const CATEGORY_COLORS: Record<string, string> = {
  necessities: 'hsl(217, 91%, 60%)',
  whims: 'hsl(0, 84%, 60%)',
  investments: 'hsl(142, 71%, 45%)',
  savings: 'hsl(38, 92%, 50%)',
};

const CATEGORY_LABELS: Record<string, string> = {
  necessities: 'Nutnosti',
  whims: 'Rozmary',
  investments: 'Investice',
  savings: 'Spoření',
};

export const Charts = ({ isOpen, onClose, transactions }: ChartsProps) => {
  if (!isOpen) return null;

  const monthlyData = groupTransactionsByMonth(transactions);
  
  // Data for bar chart (income vs expenses by month)
  const barChartData = monthlyData
    .slice()
    .reverse()
    .map((month) => ({
      name: formatMonth(month.month),
      Příjmy: month.totalIncome,
      Výdaje: month.totalExpenses,
      Převody: month.totalTransfers,
    }));

  // Data for pie chart (expense categories)
  const totalCategories = transactions
    .filter((t) => t.type === 'expense')
    .reduce(
      (acc, t) => {
        if (t.category) {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
        }
        return acc;
      },
      {} as Record<string, number>
    );

  const pieChartData = Object.entries(totalCategories).map(([category, value]) => ({
    name: CATEGORY_LABELS[category] || category,
    value,
    color: CATEGORY_COLORS[category] || COLORS[0],
  }));

  // Data for line chart (balance trend)
  const lineChartData = monthlyData
    .slice()
    .reverse()
    .map((month) => ({
      name: formatMonth(month.month),
      Bilance: month.balance,
    }));

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-6xl rounded-lg shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold">Grafy a vizualizace</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Zatím nemáte žádné transakce pro zobrazení grafů.
            </p>
          ) : (
            <>
              {/* Bar Chart - Income vs Expenses */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Příjmy vs Výdaje po měsících</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Bar dataKey="Příjmy" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Výdaje" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Převody" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart - Expense Categories */}
              {pieChartData.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Rozdělení výdajů podle kategorií</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={120}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)} Kč`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Line Chart - Balance Trend */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Trend bilance</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Bilance"
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
