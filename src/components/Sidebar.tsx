import { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileDown,
  FileSpreadsheet,
  Goal,
  HardDriveDownload,
  Home,
  PaintBucket,
  RefreshCw,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV, exportToXLSX } from '@/utils/export';
import { BankAccount, Transaction } from '@/types/finance';
import { CSVImport } from '@/components/CSVImport';

export type SidebarItemId =
  | 'overview'
  | 'recurring'
  | 'investments'
  | 'goals'
  | 'audit'
  | 'themes'
  | 'reports'
  | 'charts'
  | 'dataTools';

interface SidebarProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  visibleItems: SidebarItemId[];
  onToggleItemVisibility: (itemId: SidebarItemId) => void;
  onOpenReports: () => void;
  onOpenCharts: () => void;
  onOpenRecurring: () => void;
  onOpenInvestments: () => void;
  onOpenBackups: () => void;
  onOpenGoals: () => void;
  onOpenAudit: () => void;
  onOpenVisualThemes: () => void;
  onImportTransactions: (payload: {
    transactions: Omit<Transaction, 'id' | 'createdAt'>[];
    accountBalances?: { month: string; accountId: string; balance: number }[];
  }) => void;
}

export const Sidebar = ({
  transactions,
  bankAccounts,
  brokerAccounts,
  visibleItems,
  onToggleItemVisibility,
  onOpenReports,
  onOpenCharts,
  onOpenRecurring,
  onOpenInvestments,
  onOpenBackups,
  onOpenGoals,
  onOpenAudit,
  onOpenVisualThemes,
  onImportTransactions,
}: SidebarProps) => {
  const [showDataTools, setShowDataTools] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const itemVisibility = useMemo(
    () => new Set(visibleItems),
    [visibleItems]
  );

  const toggleButtonClass = 'w-full justify-start gap-2';

  return (
    <aside className="sticky top-[73px] h-[calc(100vh-73px)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card/30 p-4 backdrop-blur-sm">
      <nav className="space-y-2 pt-2">
        <div className="rounded-xl border border-border/60 bg-card/60 p-2">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/40"
            onClick={() => setShowCustomize((prev) => !prev)}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Přizpůsobit panel
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showCustomize ? 'rotate-180' : ''}`} />
          </button>

          {showCustomize && (
            <div className="mt-2 space-y-2 px-1 pb-1">
              {[
                ['overview', 'Přehled'],
                ['recurring', 'Trvalé příkazy'],
                ['investments', 'Investice'],
                ['goals', 'Finanční cíle'],
                ['audit', 'Audit log'],
                ['themes', 'Vizuální styly'],
                ['reports', 'Reporty'],
                ['charts', 'Grafy'],
                ['dataTools', 'Import a export dat'],
              ].map(([id, label]) => {
                const checked = itemVisibility.has(id as SidebarItemId);
                return (
                  <label key={id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/30">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleItemVisibility(id as SidebarItemId)}
                      className="h-4 w-4 rounded border-border"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {itemVisibility.has('overview') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Home className="h-4 w-4" />
            Přehled
          </Button>
        )}

        {itemVisibility.has('recurring') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenRecurring}>
            <RefreshCw className="h-4 w-4" />
            Trvalé příkazy
          </Button>
        )}

        {itemVisibility.has('investments') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenInvestments}>
            <TrendingUp className="h-4 w-4" />
            Investice
          </Button>
        )}

        {itemVisibility.has('goals') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenGoals}>
            <Goal className="h-4 w-4" />
            Finanční cíle
          </Button>
        )}

        {itemVisibility.has('audit') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenAudit}>
            <ClipboardList className="h-4 w-4" />
            Audit log
          </Button>
        )}

        {itemVisibility.has('themes') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenVisualThemes}>
            <PaintBucket className="h-4 w-4" />
            Vizuální styly
          </Button>
        )}

        {itemVisibility.has('reports') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenReports}>
            <FileSpreadsheet className="h-4 w-4" />
            Reporty
          </Button>
        )}

        {itemVisibility.has('charts') && (
          <Button variant="ghost" className={toggleButtonClass} onClick={onOpenCharts}>
            <BarChart3 className="h-4 w-4" />
            Grafy
          </Button>
        )}

        {itemVisibility.has('dataTools') && (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40"
              onClick={() => setShowDataTools((prev) => !prev)}
            >
              <span>Import a export dat</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDataTools ? 'rotate-180' : ''}`} />
            </button>

            {showDataTools && (
              <div className="mt-2 space-y-1">
                <CSVImport
                  bankAccounts={bankAccounts}
                  brokerAccounts={brokerAccounts}
                  onImport={onImportTransactions}
                />
                <Button variant="ghost" size="sm" className={toggleButtonClass} onClick={() => exportToCSV(transactions)}>
                  <FileDown className="h-4 w-4" />
                  Export do CSV
                </Button>
                <Button variant="ghost" size="sm" className={toggleButtonClass} onClick={() => exportToXLSX(transactions)}>
                  <FileDown className="h-4 w-4" />
                  Export do XLSX
                </Button>
                <Button variant="ghost" size="sm" className={toggleButtonClass} onClick={onOpenBackups}>
                  <HardDriveDownload className="h-4 w-4" />
                  Zálohy databáze
                </Button>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
};
