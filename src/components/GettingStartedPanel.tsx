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
    <section className="panel-card">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-caption uppercase tracking-[0.14em] text-primary">Začínáme</p>
          <h2 className="text-section">Připravit prostředí pro reálná data</h2>
          <p className="text-sm text-muted-foreground">
            Aplikace je připravená na účty, transakce, cíle i investice. Tyto kroky představují minimum, než začne dashboard dávat smysluplný obrázek.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
          <Button onClick={onOpenAccountSetup} className="justify-start gap-2">
            <Landmark className="h-4 w-4" />
            Účty
          </Button>
          <Button onClick={onOpenTransactionForm} variant="secondary" className="justify-start gap-2">
            <PlusCircle className="h-4 w-4" />
            První transakce
          </Button>
          <Button onClick={onOpenInvestments} variant="secondary" className="justify-start gap-2">
            <TrendingUp className="h-4 w-4" />
            Investice
          </Button>
          <Button onClick={onOpenGoals} variant="secondary" className="justify-start gap-2">
            <Target className="h-4 w-4" />
            Cíle
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="panel-card-muted">
          <p className="font-medium">1. Účty</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasAccounts
              ? 'Účty už jsou nastavené. Zůstatky i instituce můžeš kdykoliv zpřesnit.'
              : 'Nejdřív založ bankovní a brokerské účty. Bez nich dashboard nedokáže správně počítat zůstatky ani převody.'}
          </p>
        </div>

        <div className="panel-card-muted">
          <p className="font-medium">2. První data</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasTransactions
              ? 'Transakce už existují. Další krok je kontrola snapshotů, reportů a finančních cílů.'
              : 'Přidej první příjem, výdaj nebo import souboru. Jakmile budou transakce uvnitř, začnou dávat smysl reporty i měsíční workflow.'}
          </p>
        </div>
      </div>
    </section>
  );
};
