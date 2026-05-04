import { Menu, Moon, Pencil, Plus, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstitutionAvatar } from '@/components/InstitutionAvatar';
import { useIsMobile } from '@/hooks/use-mobile';
import logoLight from '@/assets/logo_figr.svg';
import logoDark from '@/assets/logo_figr_white.svg';
import { BankAccount } from '@/types/finance';
import { formatCurrency } from '@/utils/calculations';

interface HeaderProps {
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenTransactionForm: () => void;
  onOpenAccountSetup: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header = ({
  bankAccounts,
  brokerAccounts,
  isDarkMode,
  onToggleTheme,
  onOpenTransactionForm,
  onOpenAccountSetup,
  onOpenMobileMenu,
}: HeaderProps) => {
  const isMobile = useIsMobile();
  const hasAccounts = bankAccounts.length > 0 || brokerAccounts.length > 0;

  const renderAccountChip = (account: BankAccount, tone: 'success' | 'primary') => (
    <button
      type="button"
      key={account.id}
      onClick={onOpenAccountSetup}
      className="flex h-10 min-w-[145px] shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/50"
      title={`Upravit účet ${account.name}`}
    >
      <InstitutionAvatar
        institutionId={account.institutionId}
        fallback={account.name}
        className="h-6 w-6 shrink-0 rounded-lg text-[8px]"
      />
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">
          {account.name}
          {account.isSavings ? ' · s.ú.' : ''}
        </p>
        <p className={`truncate text-sm font-semibold ${tone === 'success' ? 'text-success' : 'text-primary'}`}>
          {formatCurrency(account.currentBalance)}
        </p>
      </div>
    </button>
  );

  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm"
      data-testid="app-header"
    >
      <div className="w-full px-3 py-2 sm:px-4 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {isMobile ? (
              <div className="flex items-center gap-3">
                {onOpenMobileMenu && (
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
                <div className="w-[180px] shrink-0">
                  <img
                    src={isDarkMode ? logoDark : logoLight}
                    alt="FIGR Finanční plánování"
                    className="block h-auto w-full object-contain"
                    style={{ filter: isDarkMode ? 'none' : 'brightness(0) saturate(100%)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-4">
                <div className="w-64">
                  <img
                    src={isDarkMode ? logoDark : logoLight}
                    alt="FIGR Finanční plánování"
                    className="block h-auto w-full object-contain"
                    style={{ filter: isDarkMode ? 'none' : 'brightness(0) saturate(100%)' }}
                  />
                </div>

                {!hasAccounts ? (
                  <div className="col-span-2 flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenAccountSetup}
                      aria-label="Nastavit účty"
                    >
                      Nastavit účty
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Účty banky
                      </span>
                      <div className="thin-scrollbar flex min-h-10 items-center gap-2 overflow-x-auto pb-1 pr-1">
                        {bankAccounts.length > 0 ? (
                          bankAccounts.map((account) => renderAccountChip(account, 'success'))
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Žádné</span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Účty brokerů
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onOpenAccountSetup}
                          className="h-7 w-7 shrink-0"
                          title="Upravit účty"
                          aria-label="Upravit účty"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="thin-scrollbar flex min-h-10 items-center gap-2 overflow-x-auto pb-1 pr-1">
                        {brokerAccounts.length > 0 ? (
                          brokerAccounts.map((account) => renderAccountChip(account, 'primary'))
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Žádné</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onOpenTransactionForm}
              className="gap-1 px-3 sm:gap-2 sm:px-4"
              aria-label="Nová transakce"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nová transakce</span>
            </Button>
            {isMobile && hasAccounts && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenAccountSetup}
                className="h-9 w-9"
                aria-label="Upravit účty"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="h-9 w-9"
              aria-label={isDarkMode ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
