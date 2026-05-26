import { formatCurrency } from '@/utils/calculations';

interface PlanVsRealityRow {
  category: string;
  label: string;
  plannedRatio: number;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

interface PlanVsRealityPanelProps {
  title?: string;
  rows: PlanVsRealityRow[];
}

export const PlanVsRealityPanel = ({
  title = 'Plán vs. realita',
  rows,
}: PlanVsRealityPanelProps) => {
  if (rows.length === 0) return null;

  return (
    <div className="panel-card-muted">
      <p className="mb-3 font-medium">{title}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.category} className="rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{row.label}</p>
              <span className={row.variance <= 0 ? 'text-success' : 'text-warning'}>
                {row.variance <= 0 ? 'v plánu' : 'nad plán'}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Plán {row.plannedRatio.toFixed(0)} % · {formatCurrency(row.plannedAmount)}
            </p>
            <p className="mt-1 text-sm font-medium">Realita {formatCurrency(row.actualAmount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
