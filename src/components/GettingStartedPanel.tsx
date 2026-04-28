import { Landmark, PlusCircle, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GettingStartedPanelProps {
  hasAccounts: boolean;
  hasTransactions: boolean;
  onOpenAccountSetup: () => void;
  onOpenTransactionForm: () => void;
  onOpenInvestments: () => void;
  onOpenGoals: () => void;
}

export const GettingStartedPanel = ({
  hasAccounts,
  hasTransactions,
  onOpenAccountSetup,
  onOpenTransactionForm,
  onOpenInvestments,
  onOpenGoals,
}: GettingStartedPanelProps) => {
  if (hasAccounts && hasTransactions) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Začínáme</p>
          <h2 className="mt-1 text-2xl font-bold">Připravme FIGR na první reálné použití</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aplikace už umí finance, investice, reporty i cíle. Stačí dokončit pár kroků a začne dávat
            smysluplné přehledy i měsíční snapshoty.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
          <Button onClick={onOpenAccountSetup} className="justify-start gap-2">
            <Landmark className="h-4 w-4" />
            Nastavit účty
          </Button>
          <Button onClick={onOpenTransactionForm} variant="outline" className="justify-start gap-2">
            <PlusCircle className="h-4 w-4" />
            Přidat transakci
          </Button>
          <Button onClick={onOpenInvestments} variant="outline" className="justify-start gap-2">
            <TrendingUp className="h-4 w-4" />
            Otevřít investice
          </Button>
          <Button onClick={onOpenGoals} variant="outline" className="justify-start gap-2">
            <Target className="h-4 w-4" />
            Nastavit cíle
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={`rounded-xl border p-4 ${hasAccounts ? 'border-success/30 bg-success/5' : 'border-border bg-muted/30'}`}>
          <p className="font-medium">1. Účty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasAccounts
              ? 'Účty už máš připravené. Můžeš je kdykoliv doplnit nebo upravit.'
              : 'Začni založením bankovních a brokerských účtů. Bez nich nepůjde správně počítat majetek ani převody.'}
          </p>
        </div>

        <div className={`rounded-xl border p-4 ${hasTransactions ? 'border-success/30 bg-success/5' : 'border-border bg-muted/30'}`}>
          <p className="font-medium">2. První data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasTransactions
              ? 'První transakce už v systému jsou. Teď dává smysl zkontrolovat snapshoty, reporty a cíle.'
              : 'Přidej první příjmy, výdaje nebo importuj data. Jakmile budou transakce uvnitř, začnou fungovat reporty i přehled majetku.'}
          </p>
        </div>
      </div>
    </div>
  );
};
