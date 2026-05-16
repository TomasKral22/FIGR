import { formatCurrency } from '@/utils/calculations';
import { cn } from '@/lib/utils';
import { MonthStatusBadge } from './MonthStatusBadge';

interface MonthCardProps {
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  isSelected: boolean;
  status: 'open' | 'closed' | 'adjusted' | 'warning';
  onClick: () => void;
}

export const MonthCard = ({
  monthLabel,
  income,
  expenses,
  balance,
  transactionCount,
  isSelected,
  status,
  onClick,
}: MonthCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card',
        isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/40'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{monthLabel}</h3>
          <p className="text-xs text-muted-foreground">{transactionCount} transakcí</p>
        </div>
        <MonthStatusBadge status={status} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Příjmy</span>
          <span className="font-medium text-success">{formatCurrency(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Výdaje</span>
          <span className="font-medium text-destructive">{formatCurrency(expenses)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
          <span className="text-muted-foreground">Bilance</span>
          <span className={cn('font-semibold', balance >= 0 ? 'text-success' : 'text-destructive')}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>
    </button>
  );
};
