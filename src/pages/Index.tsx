import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TransactionForm } from '@/components/TransactionForm';
import { AccountSetup } from '@/components/AccountSetup';
import { TransactionList } from '@/components/TransactionList';
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
import { GettingStartedPanel } from '@/components/GettingStartedPanel';
import { QuickActionsPanel } from '@/components/QuickActionsPanel';
import { SmartInsightsPanel } from '@/components/SmartInsightsPanel';
import { CategoryAutomationPanel } from '@/components/CategoryAutomationPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DecisionDashboardPanel } from '@/components/DecisionDashboardPanel';
import { MainDashboardPanels } from '@/components/MainDashboardPanels';
import { Transaction, TransactionDraft } from '@/types/finance';
import { draftToTransactionInput, duplicateTransaction } from '@/utils/transactionWorkflow';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarItemId } from '@/components/Sidebar';

const DEFAULT_SIDEBAR_ORDER: SidebarItemId[] = [
  'overview',
  'accounts',
  'monthWorkflow',
  'investments',
  'goals',
  'transactionAreas',
  'recurring',
  'analytics',
  'settings',
];

type DashboardPanelId =
  | 'gettingStarted'
  | 'backupReminder'
  | 'supportPanels'
  | 'wealthOverview'
  | 'decisionDashboard'
  | 'yearSelector'
  | 'monthWorkflow';

const DASHBOARD_PANEL_LABELS: Record<DashboardPanelId, string> = {
  gettingStarted: 'Začínáme',
  backupReminder: 'Připomínka zálohy',
  supportPanels: 'Rychlé akce a chytré souvislosti',
  wealthOverview: 'Celkový majetek',
  decisionDashboard: 'Rozhodovací dashboard',
  yearSelector: 'Pohled po letech',
  monthWorkflow: 'Měsíční workflow',
};

const normalizeHiddenPanels = (value: unknown): DashboardPanelId[] => {
  const validIds = Object.keys(DASHBOARD_PANEL_LABELS) as DashboardPanelId[];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DashboardPanelId => validIds.includes(item as DashboardPanelId));
};

const normalizeSidebarOrder = (value: unknown): SidebarItemId[] => {
  const source = Array.isArray(value) ? (value.filter((item): item is SidebarItemId => DEFAULT_SIDEBAR_ORDER.includes(item as SidebarItemId))) : [];
  const seen = new Set<SidebarItemId>();
  const ordered = source.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });

  return [...ordered, ...DEFAULT_SIDEBAR_ORDER.filter((item) => !seen.has(item))];
};

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
    exchangeRates,
    monthClosures,
    subcategories,
    autoCategorizationRules,
    budgetLimits,
    featureToggles,
    addGoal,
    deleteGoal,
    addSubcategory,
    updateSubcategory,
    archiveSubcategory,
    deleteSubcategory,
    addAutoCategorizationRule,
    updateAutoCategorizationRule,
    deleteAutoCategorizationRule,
    addBudgetLimit,
    updateBudgetLimit,
    deleteBudgetLimit,
    updateFeatureToggles,
    budgetAllocation,
    updateAccountMonthBalance,
    isMonthClosed,
    toggleMonthClosure,
  } = useFinanceData();

  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isAccountSetupOpen, setIsAccountSetupOpen] = useState(false);
  const [isAnnualReportsOpen, setIsAnnualReportsOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isInvestmentsOpen, setIsInvestmentsOpen] = useState(false);
  const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isCategoryAutomationOpen, setIsCategoryAutomationOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
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
  const [sidebarOrder, setSidebarOrder] = useState<SidebarItemId[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_ORDER;
    return normalizeSidebarOrder(JSON.parse(window.localStorage.getItem('finance_sidebar_order') || '[]'));
  });
  const [hiddenPanels, setHiddenPanels] = useState<DashboardPanelId[]>(() => {
    if (typeof window === 'undefined') return [];
    return normalizeHiddenPanels(JSON.parse(window.localStorage.getItem('finance_hidden_dashboard_panels') || '[]'));
  });

  const effectiveSelectedYear = useMemo(() => {
    if (availableYears.length === 0) return selectedYear;
    if (availableYears.includes(selectedYear)) return selectedYear;
    return availableYears[0];
  }, [availableYears, selectedYear]);

  const activeBudgetMonth = useMemo(() => {
    const currentMonth = `${effectiveSelectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const matchingMonths = transactions
      .filter((transaction) => transaction.month.startsWith(effectiveSelectedYear))
      .map((transaction) => transaction.month)
      .sort();

    if (matchingMonths.includes(currentMonth)) return currentMonth;
    return matchingMonths[matchingMonths.length - 1] || `${effectiveSelectedYear}-01`;
  }, [effectiveSelectedYear, transactions]);

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

      if (event.shiftKey && (event.key === 'M' || event.key === 'm')) {
        event.preventDefault();
        document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (event.shiftKey && (event.key === 'I' || event.key === 'i')) {
        event.preventDefault();
        setIsInvestmentsOpen(true);
      }

      if (event.shiftKey && (event.key === 'R' || event.key === 'r')) {
        event.preventDefault();
        setIsAnnualReportsOpen(true);
      }

      if (event.shiftKey && (event.key === 'T' || event.key === 't')) {
        event.preventDefault();
        setIsRecurringOpen(true);
      }

      if (event.shiftKey && (event.key === 'S' || event.key === 's')) {
        event.preventDefault();
        setIsSettingsOpen(true);
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

  useEffect(() => {
    window.localStorage.setItem('finance_sidebar_order', JSON.stringify(sidebarOrder));
  }, [sidebarOrder]);

  useEffect(() => {
    window.localStorage.setItem('finance_hidden_dashboard_panels', JSON.stringify(hiddenPanels));
  }, [hiddenPanels]);

  const userDisplayName =
    typeof user?.user_metadata?.username === 'string' && user.user_metadata.username.trim().length > 0
      ? user.user_metadata.username.trim()
      : user?.email?.split('@')[0] || 'Uživatel';

  const moveSidebarItem = (itemId: SidebarItemId, direction: 'up' | 'down') => {
    setSidebarOrder((current) => {
      const index = current.indexOf(itemId);
      if (index === -1) return current;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const hidePanel = (panelId: DashboardPanelId) => {
    setHiddenPanels((current) => (current.includes(panelId) ? current : [...current, panelId]));
  };

  const showPanel = (panelId: DashboardPanelId) => {
    setHiddenPanels((current) => current.filter((item) => item !== panelId));
  };

  const isPanelVisible = (panelId: DashboardPanelId) => !hiddenPanels.includes(panelId);

  const sidebarProps = {
    itemOrder: sidebarOrder,
    onOpenOverview: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    },
    onOpenAccounts: () => { setIsAccountSetupOpen(true); setIsMobileMenuOpen(false); },
    onOpenMonthWorkflow: () => {
      document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    },
    onOpenAnalytics: () => { setIsAnnualReportsOpen(true); setIsMobileMenuOpen(false); },
    onOpenRecurring: () => { setIsRecurringOpen(true); setIsMobileMenuOpen(false); },
    onOpenInvestments: () => { setIsInvestmentsOpen(true); setIsMobileMenuOpen(false); },
    onOpenGoals: () => { setIsGoalsOpen(true); setIsMobileMenuOpen(false); },
    onOpenTransactionAreas: () => { setIsCategoryAutomationOpen(true); setIsMobileMenuOpen(false); },
    onOpenSettings: () => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); },
  };

  const mainDashboardPanels = {
    gettingStarted: (
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
    ),
    backupReminder: <BackupReminder onOpenBackups={() => setIsBackupManagerOpen(true)} />,
    supportPanels: (
      <section className="rounded-2xl border border-border bg-card/60">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setIsSupportPanelsOpen((current) => !current)}
        >
          <div>
            <p className="text-sm font-semibold">Rychlé akce a chytré souvislosti</p>
            <p className="text-xs text-muted-foreground">
              {isSupportPanelsOpen
                ? 'Skrýt pomocné panely a nechat víc místa pro grid měsíců.'
                : 'Zobrazit pomocné panely nad ročním přehledem.'}
            </p>
          </div>
          {isSupportPanelsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isSupportPanelsOpen ? (
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
              onOpenCategories={() => setIsCategoryAutomationOpen(true)}
              onOpenReports={() => setIsAnnualReportsOpen(true)}
              onOpenMonthWorkflow={() => {
                document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
            <SmartInsightsPanel
              transactions={transactions}
              accountSnapshots={accountSnapshots}
              monthClosures={monthClosures}
              budgetLimits={budgetLimits}
              subcategories={subcategories}
              selectedYear={effectiveSelectedYear}
            />
          </div>
        ) : null}
      </section>
    ),
    wealthOverview: (
      <WealthOverview
        snapshots={wealthSnapshots}
        bankAccounts={bankAccounts}
        brokerAccounts={brokerAccounts}
        exchangeRates={exchangeRates}
      />
    ),
    decisionDashboard: (
      <DecisionDashboardPanel
        transactions={transactions}
        wealthSnapshots={wealthSnapshots}
        accountSnapshots={accountSnapshots}
        recurringTransactions={recurringTransactions}
        monthClosures={monthClosures}
        budgetLimits={budgetLimits}
        budgetAllocation={budgetAllocation}
        subcategories={subcategories}
        selectedYear={effectiveSelectedYear}
        onOpenMonthWorkflow={() => {
          document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onOpenRecurring={() => setIsRecurringOpen(true)}
      />
    ),
    yearSelector: (
      <YearSelector
        transactions={transactions}
        selectedYear={effectiveSelectedYear}
        budgetAllocation={budgetAllocation}
        onSelectYear={setSelectedYear}
      />
    ),
    monthWorkflow: (
      <TransactionList
        transactions={transactions}
        accountSnapshots={accountSnapshots}
        selectedYear={effectiveSelectedYear}
        subcategories={subcategories}
        recurringTransactions={recurringTransactions}
        budgetAllocation={budgetAllocation}
        budgetLimits={budgetLimits}
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
        onFillRecurringForMonth={fillRecurringTransactions}
      />
    ),
  } satisfies Parameters<typeof MainDashboardPanels>[0]['panels'];

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
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        userEmail={user?.email ?? null}
        userDisplayName={userDisplayName}
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
          <MainDashboardPanels panels={mainDashboardPanels} editing={isLayoutEditing} />
          {false ? (
            <>
          {hiddenPanels.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">Skryté panely:</p>
                {hiddenPanels.map((panelId) => (
                  <button
                    key={panelId}
                    type="button"
                    className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-sm transition-colors hover:bg-background"
                    onClick={() => showPanel(panelId)}
                  >
                    Zobrazit {DASHBOARD_PANEL_LABELS[panelId]}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {isPanelVisible('gettingStarted') ? (
            <div className="relative">
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => hidePanel('gettingStarted')}
                aria-label="Skrýt panel Začínáme"
              >
                <X className="h-4 w-4" />
              </button>
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
            </div>
          ) : null}

          {isPanelVisible('backupReminder') ? (
            <div className="relative">
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => hidePanel('backupReminder')}
                aria-label="Skrýt panel Připomínka zálohy"
              >
                <X className="h-4 w-4" />
              </button>
              <BackupReminder onOpenBackups={() => setIsBackupManagerOpen(true)} />
            </div>
          ) : null}

          {isPanelVisible('supportPanels') ? (
          <section className="relative rounded-2xl border border-border bg-card/60">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => hidePanel('supportPanels')}
              aria-label="SkrĂ˝t panel RychlĂ© akce a chytrĂ© souvislosti"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 pr-14 text-left"
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
                  onOpenCategories={() => setIsCategoryAutomationOpen(true)}
                  onOpenReports={() => setIsAnnualReportsOpen(true)}
                  onOpenMonthWorkflow={() => {
                    document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
                <SmartInsightsPanel
                  transactions={transactions}
                  accountSnapshots={accountSnapshots}
                  monthClosures={monthClosures}
                  budgetLimits={budgetLimits}
                  subcategories={subcategories}
                  selectedYear={effectiveSelectedYear}
                />
              </div>
            )}
          </section>
          ) : null}
          {isPanelVisible('wealthOverview') ? (
          <div className="relative">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => hidePanel('wealthOverview')}
              aria-label="Skrýt panel Celkový majetek"
            >
              <X className="h-4 w-4" />
            </button>
              <WealthOverview
                snapshots={wealthSnapshots}
                bankAccounts={bankAccounts}
                brokerAccounts={brokerAccounts}
                exchangeRates={exchangeRates}
              />
          </div>
          ) : null}
          {isPanelVisible('decisionDashboard') ? (
          <div className="relative">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => hidePanel('decisionDashboard')}
              aria-label="Skrýt panel Rozhodovací dashboard"
            >
              <X className="h-4 w-4" />
            </button>
            <DecisionDashboardPanel
            transactions={transactions}
            wealthSnapshots={wealthSnapshots}
            accountSnapshots={accountSnapshots}
            recurringTransactions={recurringTransactions}
            monthClosures={monthClosures}
            budgetLimits={budgetLimits}
            budgetAllocation={budgetAllocation}
            subcategories={subcategories}
            selectedYear={effectiveSelectedYear}
            onOpenMonthWorkflow={() => {
              document.getElementById('month-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onOpenRecurring={() => setIsRecurringOpen(true)}
          />
          </div>
          ) : null}
          {isPanelVisible('yearSelector') ? (
          <div className="relative">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => hidePanel('yearSelector')}
              aria-label="Skrýt panel Pohled po letech"
            >
              <X className="h-4 w-4" />
            </button>
            <YearSelector
            transactions={transactions}
            selectedYear={effectiveSelectedYear}
            budgetAllocation={budgetAllocation}
            onSelectYear={setSelectedYear}
          />
          </div>
          ) : null}
          {isPanelVisible('monthWorkflow') ? (
          <div className="relative">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => hidePanel('monthWorkflow')}
              aria-label="Skrýt panel Měsíční workflow"
            >
              <X className="h-4 w-4" />
            </button>
            <TransactionList 
            transactions={transactions} 
            accountSnapshots={accountSnapshots}
            selectedYear={effectiveSelectedYear}
            subcategories={subcategories}
            recurringTransactions={recurringTransactions}
            budgetAllocation={budgetAllocation}
            budgetLimits={budgetLimits}
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
            onFillRecurringForMonth={fillRecurringTransactions}
          />
          </div>
          ) : null}
            </>
          ) : null}
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
        subcategories={subcategories}
        autoCategorizationRules={autoCategorizationRules}
        featureToggles={featureToggles}
        onCreateAutoCategorizationRule={addAutoCategorizationRule}
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

      <CategoryAutomationPanel
        isOpen={isCategoryAutomationOpen}
        onClose={() => setIsCategoryAutomationOpen(false)}
        subcategories={subcategories}
        rules={autoCategorizationRules}
        budgetLimits={budgetLimits}
        featureToggles={featureToggles}
        transactions={transactions}
        activeMonth={activeBudgetMonth}
        onAddSubcategory={addSubcategory}
        onUpdateSubcategory={updateSubcategory}
        onArchiveSubcategory={archiveSubcategory}
        onDeleteSubcategory={deleteSubcategory}
        onAddRule={addAutoCategorizationRule}
        onUpdateRule={updateAutoCategorizationRule}
        onDeleteRule={deleteAutoCategorizationRule}
        onAddBudgetLimit={addBudgetLimit}
        onUpdateBudgetLimit={updateBudgetLimit}
        onDeleteBudgetLimit={deleteBudgetLimit}
        onUpdateFeatureToggles={updateFeatureToggles}
      />

      <AuditLogPanel
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        entries={auditLog}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={visualTheme}
        onSelectTheme={changeVisualTheme}
        sidebarOrder={sidebarOrder}
        onMoveSidebarItem={moveSidebarItem}
        isDashboardLayoutEditing={isLayoutEditing}
        onToggleDashboardLayoutEditing={() => setIsLayoutEditing((current) => !current)}
      />
    </div>
  );
};

export default Index;
