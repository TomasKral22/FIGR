import { BarChart3, FolderTree, Goal, Home, Landmark, RefreshCw, Settings2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SidebarItemId =
  | 'overview'
  | 'accounts'
  | 'monthWorkflow'
  | 'investments'
  | 'goals'
  | 'transactionAreas'
  | 'recurring'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  itemOrder: SidebarItemId[];
  onOpenOverview: () => void;
  onOpenAccounts: () => void;
  onOpenMonthWorkflow: () => void;
  onOpenAnalytics: () => void;
  onOpenRecurring: () => void;
  onOpenInvestments: () => void;
  onOpenGoals: () => void;
  onOpenTransactionAreas: () => void;
  onOpenSettings: () => void;
}

const navButtonClass = 'w-full justify-start gap-3 px-3 py-2.5 text-left';

export const Sidebar = ({
  itemOrder,
  onOpenOverview,
  onOpenAccounts,
  onOpenMonthWorkflow,
  onOpenAnalytics,
  onOpenRecurring,
  onOpenInvestments,
  onOpenGoals,
  onOpenTransactionAreas,
  onOpenSettings,
}: SidebarProps) => {
  const itemMap: Record<
    SidebarItemId,
    {
      label: string;
      icon: typeof Home;
      onClick: () => void;
    }
  > = {
    overview: { label: 'Přehled', icon: Home, onClick: onOpenOverview },
    accounts: { label: 'Účty', icon: Landmark, onClick: onOpenAccounts },
    monthWorkflow: { label: 'Měsíční workflow', icon: RefreshCw, onClick: onOpenMonthWorkflow },
    investments: { label: 'Investice', icon: TrendingUp, onClick: onOpenInvestments },
    goals: { label: 'Cíle', icon: Goal, onClick: onOpenGoals },
    transactionAreas: { label: 'Oblasti transakcí', icon: FolderTree, onClick: onOpenTransactionAreas },
    recurring: { label: 'Trvalé příkazy', icon: RefreshCw, onClick: onOpenRecurring },
    analytics: { label: 'Reporty a grafy', icon: BarChart3, onClick: onOpenAnalytics },
    settings: { label: 'Nastavení', icon: Settings2, onClick: onOpenSettings },
  };

  return (
    <aside className="app-sidebar w-64 shrink-0 p-4">
      <div className="space-y-5">
        <div className="px-2">
          <p className="text-caption uppercase tracking-[0.16em] text-muted-foreground">Navigace</p>
        </div>

        <nav className="space-y-1">
          {itemOrder.map((itemId) => {
            const item = itemMap[itemId];
            const Icon = item.icon;

            return (
              <Button key={itemId} variant="ghost" className={navButtonClass} onClick={item.onClick}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
