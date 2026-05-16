import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
import { GettingStartedPanel } from '@/components/GettingStartedPanel';
import { QuickActionsPanel } from '@/components/QuickActionsPanel';
import { SmartInsightsPanel } from '@/components/SmartInsightsPanel';
import { Transaction, TransactionDraft } from '@/types/finance';
import { draftToTransactionInput, duplicateTransaction } from '@/utils/transactionWorkflow';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    transactions,
    bankAccounts,
    brokerAccounts,
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
    monthClosures,
    addGoal,
    deleteGoal,
    updateAccountMonthBalance,
    isMonthClosed,
    toggleMonthClosure,
  } = useFinanceData();

  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isAccountSetupOpen, setIsAccountSetupOpen] = useState(false);
  const [isAnnualReportsOpen, setIsAnnualReportsOpen] = useState(false);
  const [isChartsOpen, setIsChartsOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isInvestmentsOpen, setIsInvestmentsOpen] = useState(false);
  const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isVisualThemeOpen, setIsVisualThemeOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [draftTransaction, setDraftTransaction] = useState<TransactionDraft | null>(null);
  const [transactionFormMode, setTransactionFormMode] = useState<'single' | 'bulk' | 'quick'>('single');
  const [isSupportPanelsOpen, setIsSupportPanelsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('finance_support_panels_open') === 'true';
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

  useEffect(() => {
    const isEditableElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        setEditingTransaction(null);
        setDraftTransaction(null);
        setTransactionFormMode('single');
        setIsTransactionFormOpen(true);
      }

      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        setEditingTransaction(null);
        setDraftTransaction(null);
        setTransactionFormMode('bulk');
        setIsTransactionFormOpen(true);
      }

      if (event.key === 'q' || event.key === 'Q') {
        event.preventDefault();
        document.getElementById('quick-add-input')?.focus();
      }

      if (event.key === 'Escape' && isTransactionFormOpen) {
        setIsTransactionFormOpen(false);
        setEditingTransaction(null);
        setDraftTransaction(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTransactionFormOpen]);

  useEffect(() => {
    window.localStorage.setItem('finance_support_panels_open', String(isSupportPanelsOpen));
  }, [isSupportPanelsOpen]);

  const sidebarProps = {
    onOpenOverview: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    },
    onOpenMonthWorkflow: () => {
      document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    },
    onOpenReports: () => { setIsAnnualReportsOpen(true); setIsMobileMenuOpen(false); },
    onOpenCharts: () => { setIsChartsOpen(true); setIsMobileMenuOpen(false); },
    onOpenRecurring: () => { setIsRecurringOpen(true); setIsMobileMenuOpen(false); },
    onOpenInvestments: () => { setIsInvestmentsOpen(true); setIsMobileMenuOpen(false); },
    onOpenGoals: () => { setIsGoalsOpen(true); setIsMobileMenuOpen(false); },
    onOpenAudit: () => { setIsAuditOpen(true); setIsMobileMenuOpen(false); },
  };

  return (
    <div className="app-shell">
      <Header
        transactions={transactions}
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        visualTheme={visualTheme}
        onImportTransactions={importTransactions}
        onOpenTransactionForm={() => {
          setEditingTransaction(null);
          setDraftTransaction(null);
          setTransactionFormMode('single');
          setIsTransactionFormOpen(true);
        }}
        onOpenAccountSetup={() => setIsAccountSetupOpen(true)}
        onOpenVisualThemes={() => setIsVisualThemeOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        userEmail={user?.email ?? null}
        onSignOut={() => void signOut()}
      />

      <div className="flex">
        {!isMobile && <Sidebar {...sidebarProps} />}

        {isMobile && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>
        )}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="section-stack">
          <GettingStartedPanel
            hasAccounts={bankAccounts.length + brokerAccounts.length > 0}
            hasTransactions={transactions.length > 0}
            onOpenAccountSetup={() => setIsAccountSetupOpen(true)}
            onOpenTransactionForm={() => {
              setEditingTransaction(null);
              setDraftTransaction(null);
              setTransactionFormMode('single');
              setIsTransactionFormOpen(true);
            }}
            onOpenInvestments={() => setIsInvestmentsOpen(true)}
            onOpenGoals={() => setIsGoalsOpen(true)}
          />
          <BackupReminder onOpenBackups={() => setIsBackupManagerOpen(true)} />
          <section className="rounded-2xl border border-border bg-card/60">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setIsSupportPanelsOpen((current) => !current)}
            >
              <div>
                <p className="text-sm font-semibold">Rychlé akce a chytré souvislosti</p>
                <p className="text-xs text-muted-foreground">
                  {isSupportPanelsOpen ? 'Skrýt pomocné panely a nechat víc místa pro grid měsíců.' : 'Zobrazit pomocné panely nad ročním přehledem.'}
                </p>
              </div>
              {isSupportPanelsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isSupportPanelsOpen && (
              <div className="grid gap-4 border-t border-border px-4 py-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <QuickActionsPanel
                  onAddTransaction={() => {
                    setEditingTransaction(null);
                    setDraftTransaction(null);
                    setTransactionFormMode('single');
                    setIsTransactionFormOpen(true);
                  }}
                  onOpenRecurring={() => setIsRecurringOpen(true)}
                  onOpenInvestments={() => setIsInvestmentsOpen(true)}
                  onOpenGoals={() => setIsGoalsOpen(true)}
                  onOpenReports={() => setIsAnnualReportsOpen(true)}
                  onOpenMonthWorkflow={() => {
                    document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
                <SmartInsightsPanel
                  transactions={transactions}
                  accountSnapshots={accountSnapshots}
                  monthClosures={monthClosures}
                  selectedYear={effectiveSelectedYear}
                />
              </div>
            )}
          </section>
          <WealthOverview
            snapshots={wealthSnapshots}
            bankAccounts={bankAccounts}
            brokerAccounts={brokerAccounts}
          />
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
              setDraftTransaction(null);
              setTransactionFormMode('single');
              setIsTransactionFormOpen(true);
            }}
            onDuplicate={(transaction) => {
              setEditingTransaction(null);
              setDraftTransaction(duplicateTransaction(transaction));
              setTransactionFormMode('single');
              setIsTransactionFormOpen(true);
            }}
            onCreateTransactionDraft={(draft) => {
              setEditingTransaction(null);
              setDraftTransaction(draft);
              setTransactionFormMode('single');
              setIsTransactionFormOpen(true);
            }}
            onSaveTransactionDraft={(draft) => {
              addTransaction(draftToTransactionInput(draft));
            }}
            onUpdateSnapshot={updateAccountMonthBalance}
            monthClosures={monthClosures}
            onToggleMonthClosure={toggleMonthClosure}
          />
          </div>
        </main>
      </div>

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false);
          setEditingTransaction(null);
          setDraftTransaction(null);
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
        initialDraft={draftTransaction}
        initialMode={transactionFormMode}
        transactions={transactions}
        isMonthClosed={isMonthClosed}
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
