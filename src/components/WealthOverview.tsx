import { PiggyBank, TrendingUp, Wallet } from 'lucide-react';
import { WealthSnapshot } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/calculations';

interface WealthOverviewProps {
  snapshots: WealthSnapshot[];
}

export const WealthOverview = ({ snapshots }: WealthOverviewProps) => {
  const latest = snapshots[0];
  const previous = snapshots[1];
  const delta = latest && previous ? latest.totalNetWorth - previous.totalNetWorth : 0;

  if (!latest) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Jakmile přidáš účty a první transakce, začne se tady zobrazovat přehled čistého majetku, likvidní části a vývoj vůči minulému snapshotu.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Čistý majetek</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0">
            <p className="break-words text-xl font-bold leading-tight sm:text-2xl">
              {formatCurrency(latest.totalNetWorth)}
            </p>
            <p className="text-xs text-muted-foreground">Součet bankovních a brokerských účtů</p>
          </div>
          <Wallet className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Likvidní část</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0">
            <p className="break-words text-xl font-bold leading-tight sm:text-2xl">
              {formatCurrency(latest.bankAssets)}
            </p>
            <p className="text-xs text-muted-foreground">Bankovní zůstatky</p>
          </div>
          <PiggyBank className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Změna proti minulému snapshotu</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0">
            <p className={`break-words text-xl font-bold leading-tight sm:text-2xl ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(delta)}
            </p>
            <p className="text-xs text-muted-foreground">Měsíční posun</p>
          </div>
          <TrendingUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
};
