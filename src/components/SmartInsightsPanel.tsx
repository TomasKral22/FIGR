import { AlertTriangle, BadgeCheck, Landmark, Sparkles, TrendingUp } from 'lucide-react';
import { AccountMonthlySnapshot, MonthClosure, Transaction } from '@/types/finance';
import { formatCurrency, formatMonth } from '@/utils/calculations';

interface SmartInsightsPanelProps {
  transactions: Transaction[];
  accountSnapshots: AccountMonthlySnapshot[];
  monthClosures: MonthClosure[];
  selectedYear: string;
}

export const SmartInsightsPanel = ({
  transactions,
  accountSnapshots,
  monthClosures,
  selectedYear,
}: SmartInsightsPanelProps) => {
  const yearTransactions = transactions.filter((transaction) => transaction.month.startsWith(selectedYear));
  const months = Array.from(new Set(yearTransactions.map((transaction) => transaction.month))).sort();
  const latestMonth = months[months.length - 1];
  const latestMonthTransactions = yearTransactions.filter((transaction) => transaction.month === latestMonth);
  const latestMonthExpense = latestMonthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .sort((a, b) => b.amount - a.amount)[0];
  const investmentMonths = new Set(
    yearTransactions
      .filter((transaction) => transaction.type === 'expense' && transaction.category === 'investments')
      .map((transaction) => transaction.month)
  );
  const openMonths = months.filter((month) => !monthClosures.some((entry) => entry.month === month));
  const duplicatedTransactions = yearTransactions.filter((candidate, index) => {
    const normalizedName = candidate.name.trim().toLowerCase();
    return yearTransactions.findIndex((transaction) =>
      transaction.month === candidate.month &&
      transaction.type === candidate.type &&
      transaction.amount === candidate.amount &&
      transaction.name.trim().toLowerCase() === normalizedName
    ) !== index;
  });
  const latestSnapshots = latestMonth ? accountSnapshots.filter((snapshot) => snapshot.month === latestMonth) : [];
  const richestAccount = latestSnapshots.slice().sort((a, b) => b.balance - a.balance)[0];

  const insights = [
    latestMonth && latestMonthExpense
      ? {
          icon: AlertTriangle,
          tone: 'text-warning',
          title: 'Největší poslední výdaj',
          description: `${latestMonthExpense.name} v ${formatMonth(latestMonth)} za ${formatCurrency(latestMonthExpense.amount)}.`,
        }
      : null,
    latestMonth && richestAccount
      ? {
          icon: Landmark,
          tone: 'text-primary',
          title: 'Nejsilnější účet',
          description: `${richestAccount.accountName} drží ${formatCurrency(richestAccount.balance)}.`,
        }
      : null,
    months.length > 0
      ? {
          icon: TrendingUp,
          tone: 'text-success',
          title: 'Investiční rytmus',
          description:
            investmentMonths.size === months.length
              ? 'Investiční aktivita je přítomná v každém sledovaném měsíci.'
              : `Investiční aktivita chybí v ${months.length - investmentMonths.size} měsících roku ${selectedYear}.`,
        }
      : null,
    months.length > 0
      ? {
          icon: BadgeCheck,
          tone: 'text-primary',
          title: 'Otevřené měsíce',
          description:
            openMonths.length === 0
              ? 'Všechny sledované měsíce jsou uzavřené.'
              : `${openMonths.length} měsíců ještě čeká na kontrolu.`,
        }
      : null,
    
  ].filter(Boolean) as Array<{
    icon: typeof AlertTriangle;
    tone: string;
    title: string;
    description: string;
  }>;

  return (
    <section className="panel-card">
      <div className="section-header mb-5">
        <h2 className="text-section">Chytré souvislosti</h2>
        <p className="section-description">Sekundární signály nad daty. Tento panel zůstává vizuálně lehčí než hlavní finanční přehled.</p>
      </div>

      {insights.length === 0 ? (
        <div className="panel-card-muted">
          <p className="text-sm text-muted-foreground">Další souvislosti se objeví, jakmile přibudou transakce, zůstatky a uzávěrky měsíců.</p>
        </div>
      ) : (
        <div className="insight-list">
          {insights.map((insight) => {
            const Icon = insight.icon;

            return (
              <div key={insight.title} className="insight-item">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${insight.tone}`} />
                  <p className="font-medium">{insight.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
