import { Download, FileSpreadsheet, LogOut, Menu, PaintBucket, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { CSVImport } from '@/components/CSVImport';
import { BankAccount, Transaction } from '@/types/finance';
import { exportToCSV, exportToXLSX } from '@/utils/export';
import logoLight from '@/assets/logo_figr_light.svg';
import logoBlue from '@/assets/logo_figr_blue.svg';
import logoOrange from '@/assets/logo_figr_orange.svg';

interface HeaderProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  visualTheme: string;
  onImportTransactions: (payload: {
    transactions: Omit<Transaction, 'id' | 'createdAt'>[];
    accountBalances?: { month: string; accountId: string; balance: number }[];
  }) => void;
  onOpenTransactionForm: () => void;
  onOpenAccountSetup: () => void;
  onOpenVisualThemes: () => void;
  onOpenMobileMenu?: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

const resolveLogo = (visualTheme: string) => {
  if (visualTheme === 'warm-orange') return logoOrange;
  if (visualTheme === 'dark-blue') return logoBlue;
  return logoLight;
};

export const Header = ({
  transactions,
  bankAccounts,
  brokerAccounts,
  visualTheme,
  onImportTransactions,
  onOpenTransactionForm,
  onOpenAccountSetup,
  onOpenVisualThemes,
  onOpenMobileMenu,
  userEmail,
  onSignOut,
}: HeaderProps) => {
  const isMobile = useIsMobile();
  const logoSrc = resolveLogo(visualTheme);

  return (
    <header className="app-header" data-testid="app-header">
      <div className="flex items-center justify-between gap-4 px-3 py-3 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {isMobile && onOpenMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              className="h-9 w-9 shrink-0"
              aria-label="Otevřít navigaci"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <div className="w-[136px] shrink-0 sm:w-[160px]">
            <img src={logoSrc} alt="FIGR Finanční plánování" className="block h-auto w-full object-contain" />
          </div>

          {!isMobile && (
            <div className="hidden min-w-0 md:block">
              <p className="text-caption uppercase tracking-[0.14em] text-muted-foreground">Finanční dashboard</p>
              <p className="truncate text-sm text-muted-foreground">Transakce, majetek, investice, reporty</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isMobile && userEmail && (
            <div className="mr-1 hidden max-w-[220px] truncate text-xs text-muted-foreground xl:block">{userEmail}</div>
          )}

          {!isMobile && (
            <>
              <CSVImport
                bankAccounts={bankAccounts}
                brokerAccounts={brokerAccounts}
                onImport={onImportTransactions}
                triggerVariant="secondary"
                triggerSize="sm"
                triggerLabel="Import"
                triggerClassName="w-auto"
              />
              <Button variant="secondary" size="sm" onClick={() => exportToCSV(transactions)}>
                <Download className="h-4 w-4" />
                <span>CSV</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => exportToXLSX(transactions)}>
                <FileSpreadsheet className="h-4 w-4" />
                <span>XLSX</span>
              </Button>
            </>
          )}

          <Button variant="secondary" size={isMobile ? 'icon' : 'sm'} onClick={onOpenAccountSetup} aria-label="Nastavení účtů">
            <Settings2 className="h-4 w-4" />
            {!isMobile && <span>Účty</span>}
          </Button>
          <Button variant="secondary" size={isMobile ? 'icon' : 'sm'} onClick={onOpenVisualThemes} aria-label="Otevřít styly">
            <PaintBucket className="h-4 w-4" />
            {!isMobile && <span>Styly</span>}
          </Button>
          <Button variant="default" size={isMobile ? 'icon' : 'sm'} onClick={onOpenTransactionForm} aria-label="Nová transakce">
            <Plus className="h-4 w-4" />
            {!isMobile && <span>Nová transakce</span>}
          </Button>
          {onSignOut && (
            <Button variant="secondary" size={isMobile ? 'icon' : 'sm'} onClick={onSignOut} aria-label="Odhlásit se">
              <LogOut className="h-4 w-4" />
              {!isMobile && <span>Odhlásit</span>}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
