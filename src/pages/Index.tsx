import { useState, useMemo } from 'react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TransactionForm } from '@/components/TransactionForm';
import { AccountSetup } from '@/components/AccountSetup';
import { TransactionList } from '@/components/TransactionList';
import { Charts } from '@/components/Charts';
import { YearSelector } from '@/components/YearSelector';
import { RecurringTransactions } from '@/components/RecurringTransactions';
import { InvestmentDashboard } from '@/components/investments';
import { AnnualReports } from '@/components/reports/AnnualReports';
import { BackupManager } from '@/components/BackupManager';
import { GoalsPanel } from '@/components/GoalsPanel';
import { AuditLogPanel } from '@/components/AuditLogPanel';
import { WealthOverview } from '@/components/WealthOverview';
import { BackupReminder } from '@/components/BackupReminder';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { VisualThemePanel } from '@/components/VisualThemePanel';
import { SidebarItemId } from '@/components/Sidebar';
import { GettingStartedPanel } from '@/components/GettingStartedPanel';
import { Transaction } from '@/types/finance';

const SIDEBAR_ITEMS_STORAGE_KEY = 'finance_sidebar_visible_items';
const DEFAULT_VISIBLE_SIDEBAR_ITEMS: SidebarItemId[] = [
  'overview',
  'recurring',
  'investments',
  'goals',
  'audit',
  'themes',
  'reports',
  'charts',
  'dataTools',
];

const Index = () => {
  const {
    transactions,
    bankAccounts,
    brokerAccounts,
    isDarkMode,
    visualTheme,
    recurringTransactions,
    availableYears,
    addTransaction,
    updateTransaction,
    importTransactions,
    deleteTransaction,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBrokerAccount,
    updateBrokerAccount,
    deleteBrokerAccount,
    toggleTheme,
    changeVisualTheme,
    getLastTransaction,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringTransaction,
    fillRecurringTransactions,
    goals,
    auditLog,
    wealthSnapshots,
    accountSnapshots,
    addGoal,
    deleteGoal,
    updateAccountMonthBalance,
  } = useFinanceData();

  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isAccountSetupOpen, setIsAccountSetupOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAnnualReportsOpen, setIsAnnualReportsOpen] = useState(false);
  const [isChartsOpen, setIsChartsOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isInvestmentsOpen, setIsInvestmentsOpen] = useState(false);
  const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isVisualThemeOpen, setIsVisualThemeOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [visibleSidebarItems, setVisibleSidebarItems] = useState<SidebarItemId[]>(() => {
    const stored = localStorage.getItem(SIDEBAR_ITEMS_STORAGE_KEY);
    if (!stored) return DEFAULT_VISIBLE_SIDEBAR_ITEMS;
    try {
      const parsed = JSON.parse(stored) as SidebarItemId[];
      return parsed.length > 0 ? parsed : DEFAULT_VISIBLE_SIDEBAR_ITEMS;
    } catch {
      return DEFAULT_VISIBLE_SIDEBAR_ITEMS;
    }
  });
  
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = new Date().getFullYear().toString();
    return currentYear;
  });

  const effectiveSelectedYear = useMemo(() => {
    if (availableYears.length === 0) return selectedYear;
    if (availableYears.includes(selectedYear)) return selectedYear;
    return availableYears[0];
  }, [availableYears, selectedYear]);

  const sidebarProps = {
    transactions,
    bankAccounts,
    brokerAccounts,
    visibleItems: visibleSidebarItems,
    onToggleItemVisibility: (itemId: SidebarItemId) => {
      setVisibleSidebarItems((prev) => {
        const next = prev.includes(itemId)
          ? prev.filter((item) => item !== itemId)
          : [...prev, itemId];
        const sanitized = next.length > 0 ? next : ['overview'];
        localStorage.setItem(SIDEBAR_ITEMS_STORAGE_KEY, JSON.stringify(sanitized));
        return sanitized;
      });
    },
    onOpenReports: () => { setIsAnnualReportsOpen(true); setIsMobileMenuOpen(false); },
    onOpenCharts: () => { setIsChartsOpen(true); setIsMobileMenuOpen(false); },
    onOpenRecurring: () => { setIsRecurringOpen(true); setIsMobileMenuOpen(false); },
    onOpenInvestments: () => { setIsInvestmentsOpen(true); setIsMobileMenuOpen(false); },
    onOpenBackups: () => { setIsBackupManagerOpen(true); setIsMobileMenuOpen(false); },
    onOpenGoals: () => { setIsGoalsOpen(true); setIsMobileMenuOpen(false); },
    onOpenAudit: () => { setIsAuditOpen(true); setIsMobileMenuOpen(false); },
    onOpenVisualThemes: () => { setIsVisualThemeOpen(true); setIsMobileMenuOpen(false); },
    onImportTransactions: importTransactions,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onOpenTransactionForm={() => {
          setEditingTransaction(null);
          setIsTransactionFormOpen(true);
        }}
        onOpenAccountSetup={() => setIsAccountSetupOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && <Sidebar {...sidebarProps} />}

        {/* Mobile sidebar as sheet */}
        {isMobile && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>
        )}

        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8">
          <GettingStartedPanel
            hasAccounts={bankAccounts.length + brokerAccounts.length > 0}
            hasTransactions={transactions.length > 0}
            onOpenAccountSetup={() => setIsAccountSetupOpen(true)}
            onOpenTransactionForm={() => {
              setEditingTransaction(null);
              setIsTransactionFormOpen(true);
            }}
            onOpenInvestments={() => setIsInvestmentsOpen(true)}
            onOpenGoals={() => setIsGoalsOpen(true)}
          />
          <BackupReminder onOpenBackups={() => setIsBackupManagerOpen(true)} />
          <WealthOverview snapshots={wealthSnapshots} />
          <YearSelector
            transactions={transactions}
            selectedYear={effectiveSelectedYear}
            onSelectYear={setSelectedYear}
          />
          <TransactionList 
            transactions={transactions} 
            accountSnapshots={accountSnapshots}
            selectedYear={effectiveSelectedYear}
            onDelete={deleteTransaction}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setIsTransactionFormOpen(true);
            }}
            onUpdateSnapshot={updateAccountMonthBalance}
          />
        </main>
      </div>

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={(transaction) => {
          if (editingTransaction) {
            updateTransaction(editingTransaction.id, transaction);
          } else {
            addTransaction(transaction);
          }
        }}
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        goals={goals}
        getLastTransaction={getLastTransaction}
        onFillRecurringForMonth={fillRecurringTransactions}
        initialTransaction={editingTransaction}
      />

      <AccountSetup
        isOpen={isAccountSetupOpen}
        onClose={() => setIsAccountSetupOpen(false)}
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        onAddBankAccount={addBankAccount}
        onUpdateBankAccount={updateBankAccount}
        onDeleteBankAccount={deleteBankAccount}
        onAddBrokerAccount={addBrokerAccount}
        onUpdateBrokerAccount={updateBrokerAccount}
        onDeleteBrokerAccount={deleteBrokerAccount}
      />

      <Charts
        isOpen={isChartsOpen}
        onClose={() => setIsChartsOpen(false)}
        transactions={transactions}
      />

      <RecurringTransactions
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        recurringTransactions={recurringTransactions}
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        onAdd={addRecurringTransaction}
        onUpdate={updateRecurringTransaction}
        onDelete={deleteRecurringTransaction}
        onToggle={toggleRecurringTransaction}
        onFillTransactions={fillRecurringTransactions}
      />

      <InvestmentDashboard
        isOpen={isInvestmentsOpen}
        onClose={() => setIsInvestmentsOpen(false)}
      />

      <AnnualReports
        isOpen={isAnnualReportsOpen}
        onClose={() => setIsAnnualReportsOpen(false)}
        transactions={transactions}
        snapshots={wealthSnapshots}
        accountSnapshots={accountSnapshots}
      />

      <BackupManager
        isOpen={isBackupManagerOpen}
        onClose={() => setIsBackupManagerOpen(false)}
      />

      <GoalsPanel
        isOpen={isGoalsOpen}
        onClose={() => setIsGoalsOpen(false)}
        goals={goals}
        transactions={transactions}
        bankAccounts={bankAccounts}
        onAddGoal={addGoal}
        onDeleteGoal={deleteGoal}
      />

      <AuditLogPanel
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        entries={auditLog}
      />

      <VisualThemePanel
        isOpen={isVisualThemeOpen}
        onClose={() => setIsVisualThemeOpen(false)}
        currentTheme={visualTheme}
        onSelectTheme={changeVisualTheme}
      />
    </div>
  );
};

export default Index;
