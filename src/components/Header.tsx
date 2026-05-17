import { useState } from 'react';
import { Download, FileSpreadsheet, Import, Menu, PaintBucket, Plus, Settings2, UserRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { CSVImport } from '@/components/CSVImport';
import { BankAccount, Transaction } from '@/types/finance';
import { exportToCSV, exportToXLSX } from '@/utils/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const userBadge = (userEmail || 'fi').slice(0, 2).toUpperCase();

  return (
    <header className="app-header" data-testid="app-header">
      <CSVImport
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        onImport={onImportTransactions}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        hideTrigger
      />

      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6">
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

          <div className="w-[120px] shrink-0 sm:w-[148px]">
            <img src={logoSrc} alt="FIGR Finanční plánování" className="block h-auto w-full object-contain" />
          </div>

          {!isMobile && (
            <div className="hidden min-w-0 lg:block">
              <p className="text-caption uppercase tracking-[0.14em] text-muted-foreground">Finanční dashboard</p>
              <p className="truncate text-sm text-muted-foreground">Transakce, majetek, investice, reporty</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size={isMobile ? 'icon' : 'sm'} aria-label="Import a export">
                <Import className="h-4 w-4" />
                {!isMobile && <span>Import / Export</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Import a export dat</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsImportOpen(true)}>
                <Import className="h-4 w-4" />
                Import
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportToCSV(transactions)}>
                <Download className="h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportToXLSX(transactions)}>
                <FileSpreadsheet className="h-4 w-4" />
                XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="default"
            size={isMobile ? 'icon' : 'sm'}
            onClick={onOpenTransactionForm}
            aria-label="Nová transakce"
            className="min-w-10"
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span>Nová transakce</span>}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size={isMobile ? 'icon' : 'sm'} aria-label="Uživatelské menu" className="min-w-10">
                {isMobile ? <UserRound className="h-4 w-4" /> : <span className="font-semibold">{userBadge}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {userEmail ? (
                <>
                  <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onSelect={onOpenAccountSetup}>
                <Settings2 className="h-4 w-4" />
                Účty
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenVisualThemes}>
                <PaintBucket className="h-4 w-4" />
                Styly
              </DropdownMenuItem>
              {onSignOut ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onSignOut}>
                    <LogOut className="h-4 w-4" />
                    Odhlásit
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
