import { BarChart3, ClipboardList, Goal, Home, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SidebarItemId =
  | 'overview'
  | 'recurring'
  | 'investments'
  | 'goals'
  | 'analytics';

interface SidebarProps {
  onOpenOverview: () => void;
  onOpenMonthWorkflow: () => void;
  onOpenAnalytics: () => void;
  onOpenRecurring: () => void;
  onOpenInvestments: () => void;
  onOpenGoals: () => void;
  onOpenAudit: () => void;
}

const navButtonClass = 'w-full justify-start gap-3 px-3 py-2.5 text-left';

export const Sidebar = ({
  onOpenOverview,
  onOpenMonthWorkflow,
  onOpenAnalytics,
  onOpenRecurring,
  onOpenInvestments,
  onOpenGoals,
  onOpenAudit,
}: SidebarProps) => {
  return (
    <aside className="app-sidebar w-64 shrink-0 p-4">
      <div className="space-y-5">
        <div className="px-2">
          <p className="text-caption uppercase tracking-[0.16em] text-muted-foreground">Navigace</p>
        </div>

        <nav className="space-y-1">
          <Button variant="ghost" className={navButtonClass} onClick={onOpenOverview}>
            <Home className="h-4 w-4" />
            <span>Přehled</span>
          </Button>
          <Button variant="ghost" className={navButtonClass} onClick={onOpenMonthWorkflow}>
            <RefreshCw className="h-4 w-4" />
            <span>Měsíční workflow</span>
          </Button>
          <Button variant="ghost" className={navButtonClass} onClick={onOpenInvestments}>
            <TrendingUp className="h-4 w-4" />
            <span>Investice</span>
          </Button>
          <Button variant="ghost" className={navButtonClass} onClick={onOpenGoals}>
            <Goal className="h-4 w-4" />
            <span>Cíle</span>
          </Button>
          <Button variant="ghost" className={navButtonClass} onClick={onOpenRecurring}>
            <RefreshCw className="h-4 w-4" />
            <span>Trvalé příkazy</span>
          </Button>
          <Button variant="ghost" className={navButtonClass} onClick={onOpenAnalytics}>
            <BarChart3 className="h-4 w-4" />
            <span>Reporty a grafy</span>
          </Button>
          <Button variant="ghost" className={navButtonClass} onClick={onOpenAudit}>
            <ClipboardList className="h-4 w-4" />
            <span>Historie</span>
          </Button>
        </nav>
      </div>
    </aside>
  );
};
