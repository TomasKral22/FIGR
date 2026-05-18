import { CalendarCheck2, FolderTree, Goal, PlusCircle, RefreshCw, ScrollText, TrendingUp } from 'lucide-react';

interface QuickActionsPanelProps {
  onAddTransaction: () => void;
  onOpenRecurring: () => void;
  onOpenInvestments: () => void;
  onOpenGoals: () => void;
  onOpenReports: () => void;
  onOpenMonthWorkflow: () => void;
  onOpenCategories: () => void;
}

export const QuickActionsPanel = ({
  onAddTransaction,
  onOpenRecurring,
  onOpenInvestments,
  onOpenGoals,
  onOpenReports,
  onOpenMonthWorkflow,
  onOpenCategories,
}: QuickActionsPanelProps) => {
  const actions = [
    {
      label: 'Nová transakce',
      description: 'Přidat příjem, výdaj nebo převod.',
      icon: PlusCircle,
      onClick: onAddTransaction,
    },
    {
      label: 'Trvalé příkazy',
      description: 'Vyplnit opakované platby pro daný měsíc.',
      icon: RefreshCw,
      onClick: onOpenRecurring,
    },
    {
      label: 'Kontrola měsíce',
      description: 'Projít zůstatky a uzavřít měsíc.',
      icon: CalendarCheck2,
      onClick: onOpenMonthWorkflow,
    },
    {
      label: 'Investice',
      description: 'Portfolio, dividendy a importy brokerů.',
      icon: TrendingUp,
      onClick: onOpenInvestments,
    },
    {
      label: 'Finanční cíle',
      description: 'Sledování rezerv a finančních cílů.',
      icon: Goal,
      onClick: onOpenGoals,
    },
    {
      label: 'Podkategorie',
      description: 'Správa podkategorií a automatických pravidel.',
      icon: FolderTree,
      onClick: onOpenCategories,
    },
    {
      label: 'Reporty',
      description: 'Roční i historická analýza.',
      icon: ScrollText,
      onClick: onOpenReports,
    },
  ];

  return (
    <section className="panel-card">
      <div className="section-header mb-5">
        <h2 className="text-section">Rychlé akce</h2>
        <p className="section-description">
          Hlavní kroky jsou soustředěné na jednom místě. Každá karta je přímo akce bez zbytečných sekundárních tlačítek.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button key={action.label} type="button" onClick={action.onClick} className="action-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-[12px] bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-medium">{action.label}</p>
              </div>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
