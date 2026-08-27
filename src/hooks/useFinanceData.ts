import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AccountGoal,
  AutoCategorizationRule,
  BudgetLimit,
  FinanceFeatureToggles,
  ImportedAccountMonthBalance,
  AccountMonthlySnapshot,
  AuditLogEntry,
  BankAccount,
  BudgetAllocation,
  MonthClosure,
  PortfolioSettings,
  RecurringTransaction,
  Subcategory,
  Transaction,
  WealthSnapshot,
} from '@/types/finance';
import { appStorage } from '@/lib/appStorage';
import { useAuth } from '@/contexts/AuthContext';
import { getExpenseCashAmount, getTransferCashAmount } from '@/utils/calculations';
import { convertCurrencyValue, ExchangeRateLike, normalizeCurrencyCode } from '@/utils/currency';
import {
  DEFAULT_FINANCE_FEATURE_TOGGLES,
  mergeAutoCategorizationRules,
  mergeSubcategories,
} from '@/utils/categoryAutomation';
import {
  DEFAULT_FINANCE_BUDGET,
  DEFAULT_FINANCE_PORTFOLIO_SETTINGS,
  loadFinanceExchangeRates,
  loadFinanceState,
  saveFinanceState,
} from '@/repositories/financeRepository';

const createTimestamp = () => new Date().toISOString();
const monthStamp = (isoDate: string) => isoDate.slice(0, 7);
const formatMonthKey = (year: number, monthIndex: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
const parseMonthKey = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return { year, monthIndex: monthNumber - 1 };
};
const shiftMonth = (month: string, delta: number) => {
  const { year, monthIndex } = parseMonthKey(month);
  const date = new Date(year, monthIndex + delta, 1);
  return formatMonthKey(date.getFullYear(), date.getMonth());
};
const listMonthsBetween = (startMonth: string, endMonth: string) => {
  const months: string[] = [];
  let current = startMonth;

  while (current <= endMonth) {
    months.push(current);
    current = shiftMonth(current, 1);
  }

  return months;
};

const isSameTransactionPayload = (
  left: Omit<Transaction, 'id' | 'createdAt'>,
  right: Omit<Transaction, 'id' | 'createdAt'>
) =>
  left.month === right.month &&
  left.type === right.type &&
  left.name === right.name &&
  left.amount === right.amount &&
  left.account === right.account &&
  left.category === right.category &&
  left.subcategoryId === right.subcategoryId &&
  left.transferCategory === right.transferCategory &&
  left.sourceAccount === right.sourceAccount &&
  left.transferAccount === right.transferAccount &&
  left.investmentAccount === right.investmentAccount &&
  left.includeInInvestmentTotals === right.includeInInvestmentTotals &&
  left.goalId === right.goalId &&
  left.goalImpact === right.goalImpact &&
  left.autoAssigned === right.autoAssigned &&
  left.ruleId === right.ruleId &&
  left.note === right.note &&
  left.folder === right.folder;

export const useFinanceData = () => {
  const { session } = useAuth();
  const storage = useMemo(() => appStorage.forUser(session?.user.id ?? null), [session?.user.id]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [brokerAccounts, setBrokerAccounts] = useState<BankAccount[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [goals, setGoals] = useState<AccountGoal[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [wealthSnapshots, setWealthSnapshots] = useState<WealthSnapshot[]>([]);
  const [accountSnapshots, setAccountSnapshots] = useState<AccountMonthlySnapshot[]>([]);
  const [importedAccountBalances, setImportedAccountBalances] = useState<ImportedAccountMonthBalance[]>([]);
  const [monthClosures, setMonthClosures] = useState<MonthClosure[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [autoCategorizationRules, setAutoCategorizationRules] = useState<AutoCategorizationRule[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [featureToggles, setFeatureToggles] = useState<FinanceFeatureToggles>({
    ...DEFAULT_FINANCE_FEATURE_TOGGLES,
  });
  const [budgetAllocation, setBudgetAllocation] = useState<BudgetAllocation>({
    ...DEFAULT_FINANCE_BUDGET,
  });
  const [portfolioSettings, setPortfolioSettings] = useState<PortfolioSettings>({
    ...DEFAULT_FINANCE_PORTFOLIO_SETTINGS,
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [visualTheme, setVisualTheme] = useState('dark-blue');
  const [lastTransaction, setLastTransaction] = useState<Omit<Transaction, 'id' | 'createdAt'> | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateLike[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const decorateGoals = useCallback(
    (
      rawGoals: AccountGoal[],
      sourceTransactions: Transaction[]
    ) =>
      rawGoals.map((goal) => {
        const linkedTransactions = sourceTransactions.filter(
          (transaction) =>
            transaction.goalId === goal.id &&
            (!goal.createdAt || transaction.createdAt >= goal.createdAt)
        );
        const delta = linkedTransactions.reduce((sum, transaction) => {
          if (!transaction.goalImpact || transaction.goalImpact === 'deposit') return sum + transaction.amount;
          if (transaction.goalImpact === 'withdrawal') return sum - transaction.amount;
          return sum;
        }, 0);
        const currentAmount = goal.currentAmount + delta;
        return {
          ...goal,
          currentAmount,
          status: currentAmount >= goal.targetAmount ? 'completed' : 'active',
        } as AccountGoal;
      }),
    []
  );

  const pushAudit = useCallback((entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) => {
    setAuditLog((prev) => [
      {
        id: crypto.randomUUID(),
        createdAt: createTimestamp(),
        ...entry,
      },
      ...prev,
    ].slice(0, 200));
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach((transaction) => {
      years.add(transaction.month.split('-')[0]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setIsHydrated(false);
      const state = await loadFinanceState(storage);
      if (cancelled) return;

      setTransactions(state.transactions);
      setBankAccounts(state.bankAccounts);
      setBrokerAccounts(state.brokerAccounts);
      setBudgetAllocation(state.budgetAllocation);
      setPortfolioSettings(state.portfolioSettings);
      setRecurringTransactions(state.recurringTransactions);
      setFolders(state.folders);
      setGoals(state.goals);
      setAuditLog(state.auditLog);
      setWealthSnapshots(state.wealthSnapshots);
      setAccountSnapshots(state.accountSnapshots);
      setImportedAccountBalances(state.importedAccountBalances);
      setMonthClosures(state.monthClosures);
      setSubcategories(state.subcategories);
      setAutoCategorizationRules(state.autoCategorizationRules);
      setBudgetLimits(state.budgetLimits);
      setFeatureToggles(state.featureToggles);
      setLastTransaction(state.lastTransaction);
      setExchangeRates(state.exchangeRates);
      setIsDarkMode(state.isDarkMode);
      setVisualTheme(state.visualTheme);
      document.documentElement.classList.toggle('dark', state.isDarkMode);
      document.documentElement.dataset.surface = state.visualTheme;
      setIsHydrated(true);
    };

    void hydrate().catch(error => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Načtení dat selhalo.'); });
    return () => { cancelled = true; };
  }, [storage]);

  useEffect(() => {
    if (!isHydrated) return;
    const stateToSave = {
      transactions,
      bankAccounts,
      brokerAccounts,
      budgetAllocation,
      portfolioSettings,
      recurringTransactions,
      folders,
      goals,
      auditLog,
      wealthSnapshots,
      accountSnapshots,
      importedAccountBalances,
      monthClosures,
      subcategories,
      autoCategorizationRules,
      budgetLimits,
      featureToggles,
      isDarkMode,
      visualTheme,
      lastTransaction,
    };
    saveQueueRef.current = saveQueueRef.current
      .catch((error) => {
        console.error('Previous finance state save failed:', error);
      })
      .then(() => saveFinanceState(stateToSave, storage))
      .catch(error => console.error('Finance state save failed:', error));
  }, [
    transactions,
    bankAccounts,
    brokerAccounts,
    budgetAllocation,
    portfolioSettings,
    recurringTransactions,
    folders,
    goals,
    auditLog,
    wealthSnapshots,
    accountSnapshots,
    importedAccountBalances,
    monthClosures,
    subcategories,
    autoCategorizationRules,
    budgetLimits,
    featureToggles,
    isDarkMode,
    visualTheme,
    lastTransaction,
    isHydrated,
    storage,
  ]);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;

    const loadExchangeRates = async () => {
      if (cancelled) return;
      const loadedRates = await loadFinanceExchangeRates(storage);
      if (cancelled) return;
      setExchangeRates(current => JSON.stringify(current) === JSON.stringify(loadedRates) ? current : loadedRates);
    };

    void loadExchangeRates().catch(error => console.error('Exchange rate load failed:', error));
    const intervalId = window.setInterval(() => {
      void loadExchangeRates().catch(error => console.error('Exchange rate load failed:', error));
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isHydrated, storage]);

  useEffect(() => {
    if (!isHydrated) return;

    const now = createTimestamp();
    const currentMonth = monthStamp(now);
    const transactionMonths = transactions.map((transaction) => transaction.month);
    const earliestMonth = [...transactionMonths, currentMonth].sort()[0];
    const allMonths = listMonthsBetween(earliestMonth, currentMonth);

    const mergedAccounts = [
      ...bankAccounts.map((account) => ({
        accountId: account.id,
        accountName: account.name,
        institutionId: account.institutionId,
        currency: account.currency,
        accountGroup: 'bank' as const,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        excludedAmount: account.excludedAmount,
      })),
      ...brokerAccounts.map((account) => ({
        accountId: account.id,
        accountName: account.name,
        institutionId: account.institutionId,
        currency: account.currency,
        accountGroup: 'broker' as const,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        excludedAmount: account.excludedAmount,
      })),
    ];

    const accountMetaById = Object.fromEntries(
      mergedAccounts.map((account) => [
        account.accountId,
        {
          accountName: account.accountName,
          institutionId: account.institutionId,
          currency: account.currency,
          accountGroup: account.accountGroup,
          initialBalance: account.initialBalance,
          currentBalance: account.currentBalance,
          excludedAmount: account.excludedAmount,
        },
      ])
    ) as Record<
      string,
      {
        accountName: string;
        institutionId?: string;
        currency: string;
        accountGroup: 'bank' | 'broker';
        initialBalance: number;
        currentBalance: number;
        excludedAmount: number;
      }
    >;

    const deltasByMonth = transactions.reduce<Record<string, Record<string, number>>>((acc, transaction) => {
      if (!acc[transaction.month]) acc[transaction.month] = {};

      const applyDelta = (accountId: string | undefined, delta: number) => {
        if (!accountId) return;
        acc[transaction.month][accountId] = (acc[transaction.month][accountId] || 0) + delta;
      };

      if (transaction.type === 'income') {
        applyDelta(transaction.account, transaction.amount);
      } else if (transaction.type === 'expense') {
        applyDelta(transaction.account, -getExpenseCashAmount(transaction.amount));
        if (transaction.category === 'investments' && transaction.investmentAccount) {
          applyDelta(transaction.investmentAccount, getExpenseCashAmount(transaction.amount));
        }
      } else {
        applyDelta(transaction.sourceAccount, -getTransferCashAmount(transaction.amount));
        applyDelta(transaction.transferAccount, getTransferCashAmount(transaction.amount));
      }

      return acc;
    }, {});

    const projectedCurrentBalances = Object.entries(accountMetaById).reduce<Record<string, number>>(
      (acc, [accountId, account]) => {
        const totalDelta = Object.values(deltasByMonth).reduce(
          (sum, monthDelta) => sum + (monthDelta[accountId] || 0),
          0
        );
        acc[accountId] = account.initialBalance + totalDelta;
        return acc;
      },
      {}
    );

    const adjustments = Object.entries(accountMetaById).reduce<Record<string, number>>((acc, [accountId, account]) => {
      acc[accountId] = account.currentBalance - (projectedCurrentBalances[accountId] || 0);
      return acc;
    }, {});

    const computedAccountSnapshots: AccountMonthlySnapshot[] = [];
    const balancesByAccount = Object.fromEntries(
      mergedAccounts.map((account) => [account.accountId, account.initialBalance])
    ) as Record<string, number>;

    allMonths.forEach((month) => {
      const monthDeltas = deltasByMonth[month] || {};

      Object.entries(monthDeltas).forEach(([accountId, delta]) => {
        balancesByAccount[accountId] = (balancesByAccount[accountId] || 0) + delta;
      });

      mergedAccounts.forEach((account) => {
        const adjustment = month === currentMonth ? adjustments[account.accountId] || 0 : 0;
        const balance = (balancesByAccount[account.accountId] ?? 0) + adjustment;
        const excludedAmount = Math.min(Math.max(0, account.excludedAmount), Math.max(0, balance));
        const ownedBalance = Math.max(0, balance - excludedAmount);
        computedAccountSnapshots.push({
          id: `${month}-${account.accountGroup}-${account.accountId}`,
          month,
          accountId: account.accountId,
          accountName: account.accountName,
          institutionId: account.institutionId,
          accountGroup: account.accountGroup,
          currency: account.currency,
          balance,
          balanceCzk: convertCurrencyValue(
            balance,
            account.currency,
            'CZK',
            exchangeRates,
            `${month}-31`
          ),
          excludedAmount,
          ownedBalance,
          ownedBalanceCzk: convertCurrencyValue(
            ownedBalance,
            account.currency,
            'CZK',
            exchangeRates,
            `${month}-31`
          ),
          isSavings: account.accountGroup === 'bank' ? bankAccounts.find((item) => item.id === account.accountId)?.isSavings : false,
          source: 'computed',
          createdAt: now,
        });
      });
    });

    const importedSnapshots: AccountMonthlySnapshot[] = importedAccountBalances
      .map((snapshot) => {
        const bankMatch = bankAccounts.find((account) => account.id === snapshot.accountId);
        const brokerMatch = brokerAccounts.find((account) => account.id === snapshot.accountId);
        const matchedAccount = bankMatch || brokerMatch;

        if (!matchedAccount) return null;

        const excludedAmount = Math.min(
          Math.max(0, matchedAccount.excludedAmount),
          Math.max(0, snapshot.balance)
        );
        const ownedBalance = Math.max(0, snapshot.balance - excludedAmount);

        return {
          id: `import-${snapshot.month}-${snapshot.accountId}`,
          month: snapshot.month,
          accountId: snapshot.accountId,
          accountName: matchedAccount.name,
          institutionId: matchedAccount.institutionId,
          accountGroup: bankMatch ? 'bank' : 'broker',
          currency: matchedAccount.currency,
          balance: snapshot.balance,
          balanceCzk: convertCurrencyValue(snapshot.balance, matchedAccount.currency, 'CZK', exchangeRates, `${snapshot.month}-31`),
          excludedAmount,
          ownedBalance,
          ownedBalanceCzk: convertCurrencyValue(ownedBalance, matchedAccount.currency, 'CZK', exchangeRates, `${snapshot.month}-31`),
          isSavings: bankMatch?.isSavings || false,
          source: 'import',
          createdAt: snapshot.createdAt,
        } satisfies AccountMonthlySnapshot;
      })
      .filter(Boolean) as AccountMonthlySnapshot[];

    const mergedSnapshotsMap = new Map<string, AccountMonthlySnapshot>();
    computedAccountSnapshots.forEach((snapshot) => {
      mergedSnapshotsMap.set(`${snapshot.month}-${snapshot.accountId}`, snapshot);
    });
    importedSnapshots.forEach((snapshot) => {
      mergedSnapshotsMap.set(`${snapshot.month}-${snapshot.accountId}`, snapshot);
    });
    const mergedSnapshots = Array.from(mergedSnapshotsMap.values());

    const computedWealthSnapshots: WealthSnapshot[] = allMonths.map((month) => {
      const monthSnapshots = mergedSnapshots.filter((snapshot) => snapshot.month === month);
      const bankAssets = monthSnapshots
        .filter((snapshot) => snapshot.accountGroup === 'bank')
        .reduce((sum, snapshot) => sum + (snapshot.ownedBalanceCzk ?? convertCurrencyValue(snapshot.ownedBalance ?? snapshot.balance, snapshot.currency, 'CZK', exchangeRates, `${month}-31`)), 0);
      const brokerAssets = monthSnapshots
        .filter((snapshot) => snapshot.accountGroup === 'broker')
        .reduce((sum, snapshot) => sum + (snapshot.ownedBalanceCzk ?? convertCurrencyValue(snapshot.ownedBalance ?? snapshot.balance, snapshot.currency, 'CZK', exchangeRates, `${month}-31`)), 0);

      return {
        id: `wealth-${month}`,
        createdAt: `${month}-01T00:00:00.000Z`,
        bankAssets,
        brokerAssets,
        investedAssets: brokerAssets,
        totalNetWorth: bankAssets + brokerAssets,
      };
    });

    setAccountSnapshots(
      mergedSnapshots.sort((a, b) => b.month.localeCompare(a.month) || a.accountName.localeCompare(b.accountName))
    );
    setWealthSnapshots(computedWealthSnapshots.reverse());
  }, [bankAccounts, brokerAccounts, transactions, importedAccountBalances, isHydrated, exchangeRates]);

  const toggleTheme = useCallback(() => {
    setVisualTheme((prev) => {
      const next = prev === 'light' ? 'dark-blue' : 'light';
      const darkMode = next !== 'light';
      setIsDarkMode(darkMode);
      document.documentElement.classList.toggle('dark', darkMode);
      document.documentElement.dataset.surface = next;
      return next;
    });
  }, []);

  const changeVisualTheme = useCallback((nextTheme: string) => {
    const normalizedTheme = ['light', 'dark-blue', 'warm-orange'].includes(nextTheme) ? nextTheme : 'dark-blue';
    const darkMode = normalizedTheme !== 'light';
    setIsDarkMode(darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.dataset.surface = normalizedTheme;
    setVisualTheme(normalizedTheme);
  }, []);

  const updateAccountBalance = useCallback((
    accountId: string,
    delta: number
  ) => {
    const isBankAccount = bankAccounts.some((account) => account.id === accountId);

    if (isBankAccount) {
      setBankAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? { ...account, currentBalance: account.currentBalance + delta }
            : account
        )
      );
      return;
    }

    setBrokerAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? { ...account, currentBalance: account.currentBalance + delta }
          : account
      )
    );
  }, [bankAccounts]);

  const applyBalanceDelta = useCallback((
    payload: Omit<Transaction, 'id' | 'createdAt'>,
    direction: 1 | -1
  ) => {
    if (payload.type === 'income' && payload.account) {
      updateAccountBalance(payload.account, payload.amount * direction);
    } else if (payload.type === 'expense' && payload.account) {
      updateAccountBalance(payload.account, -getExpenseCashAmount(payload.amount) * direction);
      if (payload.category === 'investments' && payload.investmentAccount) {
        updateAccountBalance(payload.investmentAccount, getExpenseCashAmount(payload.amount) * direction);
      }
    } else if (payload.type === 'transfer') {
      if (payload.sourceAccount) {
        updateAccountBalance(payload.sourceAccount, -getTransferCashAmount(payload.amount) * direction);
      }
      if (payload.transferAccount) {
        updateAccountBalance(payload.transferAccount, getTransferCashAmount(payload.amount) * direction);
      }
    }
  }, [updateAccountBalance]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: createTimestamp(),
    };

    setTransactions((prev) => [...prev, newTransaction]);
    if (transaction.folder && !folders.includes(transaction.folder)) {
      setFolders((prev) => [...prev, transaction.folder!]);
    }
    applyBalanceDelta(transaction, 1);
    setLastTransaction(transaction);
    pushAudit({
      type: 'transaction',
      action: 'create',
      detail: `Transakce ${transaction.name} (${transaction.month}) byla přidána.`,
    });
  }, [applyBalanceDelta, folders, pushAudit]);

  const updateTransaction = useCallback((id: string, updates: Omit<Transaction, 'id' | 'createdAt'>) => {
    setTransactions((prev) => {
      const target = prev.find((transaction) => transaction.id === id);
      if (!target) return prev;

      const { id: oldId, createdAt: oldCreatedAt, ...previousPayload } = target;
      void oldId;
      void oldCreatedAt;

      applyBalanceDelta(previousPayload, -1);
      applyBalanceDelta(updates, 1);

      if (updates.folder && !folders.includes(updates.folder)) {
        setFolders((current) => (current.includes(updates.folder!) ? current : [...current, updates.folder!]));
      }

      setLastTransaction(updates);
      pushAudit({
        type: 'transaction',
        action: 'update',
        detail: `Transakce ${updates.name} (${updates.month}) byla upravena.`,
      });

      return prev.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              ...updates,
            }
          : transaction
      );
    });
  }, [applyBalanceDelta, folders, pushAudit]);

  const importTransactions = useCallback((payload: {
    transactions: Omit<Transaction, 'id' | 'createdAt'>[];
    accountBalances?: { month: string; accountId: string; balance: number }[];
  }) => {
    setTransactions((prev) => {
      const existingPayloads = prev.map(({ id, createdAt, ...rest }) => rest);
      const uniqueTransactions = payload.transactions.filter(
        (candidate) => !existingPayloads.some((existing) => isSameTransactionPayload(existing, candidate))
      );

      uniqueTransactions.forEach((transaction) => {
        applyBalanceDelta(transaction, 1);
        if (transaction.folder && !folders.includes(transaction.folder)) {
          setFolders((current) =>
            current.includes(transaction.folder!) ? current : [...current, transaction.folder!]
          );
        }
      });

      if (uniqueTransactions.length > 0) {
        pushAudit({
          type: 'transaction',
          action: 'import',
          detail: `Importovano ${uniqueTransactions.length} novych transakci.`,
        });
      }

      if (payload.accountBalances && payload.accountBalances.length > 0) {
        setImportedAccountBalances((current) => {
          const map = new Map(current.map((item) => [`${item.month}-${item.accountId}`, item]));
          payload.accountBalances?.forEach((item) => {
            map.set(`${item.month}-${item.accountId}`, {
              id: `import-balance-${item.month}-${item.accountId}`,
              month: item.month,
              accountId: item.accountId,
              balance: item.balance,
              createdAt: createTimestamp(),
            });
          });
          return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
        });
      }

      const imported = uniqueTransactions.map((transaction) => ({
        ...transaction,
        id: crypto.randomUUID(),
        createdAt: createTimestamp(),
      }));
      return [...prev, ...imported];
    });
  }, [applyBalanceDelta, folders, pushAudit]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const target = prev.find((transaction) => transaction.id === id);
      if (target) {
        const { id: ignoredId, createdAt, ...payload } = target;
        applyBalanceDelta(payload, -1);
          pushAudit({
            type: 'transaction',
            action: 'delete',
            detail: `Transakce ${target.name} (${target.month}) byla smazána.`,
          });
        }
        return prev.filter((transaction) => transaction.id !== id);
      });
    }, [applyBalanceDelta, pushAudit]);

  const addBankAccount = useCallback((name: string, initialBalance: number, currency = 'CZK', isSavings?: boolean, interestRate?: number, institutionId?: string, excludedAmount = 0) => {
    const newAccount: BankAccount = {
      id: crypto.randomUUID(),
      name,
      institutionId,
      currency: normalizeCurrencyCode(currency, 'CZK'),
      initialBalance,
      currentBalance: initialBalance,
      excludedAmount: Math.max(0, excludedAmount),
      isSavings: isSavings || false,
      interestRate: interestRate || 0,
    };
    setBankAccounts((prev) => [...prev, newAccount]);
    pushAudit({
      type: 'account',
      action: 'create',
      detail: `Bankovni ucet ${name} byl pridan.`,
    });
  }, [pushAudit]);

  const updateBankAccount = useCallback((id: string, name: string, currentBalance: number, currency = 'CZK', isSavings?: boolean, interestRate?: number, institutionId?: string, excludedAmount = 0) => {
    setBankAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? { ...account, name, currentBalance, currency: normalizeCurrencyCode(currency, 'CZK'), isSavings: isSavings || false, interestRate: interestRate || 0, institutionId, excludedAmount: Math.max(0, excludedAmount) }
          : account
      )
    );
    pushAudit({
      type: 'account',
      action: 'update',
      detail: `Bankovni ucet ${name} byl upraven; nezapocitavana castka ${Math.max(0, excludedAmount)} ${normalizeCurrencyCode(currency, 'CZK')}.`,
    });
  }, [pushAudit]);

  const deleteBankAccount = useCallback((id: string) => {
    setBankAccounts((prev) => prev.filter((account) => account.id !== id));
    pushAudit({
      type: 'account',
      action: 'delete',
      detail: 'Bankovni ucet byl smazan.',
    });
  }, [pushAudit]);

  const addBrokerAccount = useCallback((name: string, initialBalance: number, currency = 'CZK', institutionId?: string, excludedAmount = 0) => {
    const newAccount: BankAccount = {
      id: crypto.randomUUID(),
      name,
      institutionId,
      currency: normalizeCurrencyCode(currency, 'CZK'),
      initialBalance,
      currentBalance: initialBalance,
      excludedAmount: Math.max(0, excludedAmount),
    };
    setBrokerAccounts((prev) => [...prev, newAccount]);
    pushAudit({
      type: 'account',
      action: 'create',
      detail: `Brokersky ucet ${name} byl pridan.`,
    });
  }, [pushAudit]);

  const updateBrokerAccount = useCallback((id: string, name: string, currentBalance: number, currency = 'CZK', institutionId?: string, excludedAmount = 0) => {
    setBrokerAccounts((prev) =>
      prev.map((account) =>
        account.id === id ? { ...account, name, currentBalance, currency: normalizeCurrencyCode(currency, 'CZK'), institutionId, excludedAmount: Math.max(0, excludedAmount) } : account
      )
    );
    pushAudit({
      type: 'account',
      action: 'update',
      detail: `Brokersky ucet ${name} byl upraven; nezapocitavana castka ${Math.max(0, excludedAmount)} ${normalizeCurrencyCode(currency, 'CZK')}.`,
    });
  }, [pushAudit]);

  const deleteBrokerAccount = useCallback((id: string) => {
    setBrokerAccounts((prev) => prev.filter((account) => account.id !== id));
    pushAudit({
      type: 'account',
      action: 'delete',
      detail: 'Brokersky ucet byl smazan.',
    });
  }, [pushAudit]);

  const getLastTransaction = useCallback(() => lastTransaction, [lastTransaction]);

  const addRecurringTransaction = useCallback((transaction: Omit<RecurringTransaction, 'id'>) => {
    setRecurringTransactions((prev) => [
      ...prev,
      { ...transaction, id: crypto.randomUUID() },
    ]);
    if (transaction.folder && !folders.includes(transaction.folder)) {
      setFolders((prev) => [...prev, transaction.folder!]);
    }
    pushAudit({
      type: 'recurring',
      action: 'create',
      detail: `Trvaly prikaz ${transaction.name} byl pridan.`,
    });
  }, [folders, pushAudit]);

  const updateRecurringTransaction = useCallback((id: string, updates: Omit<RecurringTransaction, 'id'>) => {
    setRecurringTransactions((prev) =>
      prev.map((transaction) => (transaction.id === id ? { ...updates, id } : transaction))
    );
    pushAudit({
      type: 'recurring',
      action: 'update',
      detail: `Trvaly prikaz ${updates.name} byl upraven.`,
    });
  }, [pushAudit]);

  const deleteRecurringTransaction = useCallback((id: string) => {
    setRecurringTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
    pushAudit({
      type: 'recurring',
      action: 'delete',
      detail: 'Trvaly prikaz byl smazan.',
    });
  }, [pushAudit]);

  const toggleRecurringTransaction = useCallback((id: string) => {
    setRecurringTransactions((prev) =>
      prev.map((transaction) =>
        transaction.id === id ? { ...transaction, isActive: !transaction.isActive } : transaction
      )
    );
  }, []);

  const applyMonthlyInterest = useCallback(() => {
    setBankAccounts((prev) =>
      prev.map((account) => {
        if (!account.isSavings || !account.interestRate || account.interestRate <= 0) return account;
        const monthlyRate = account.interestRate / 100 / 12;
        const grossInterest = account.currentBalance * monthlyRate;
        const tax = grossInterest * 0.15;
        const netInterest = Math.round((grossInterest - tax) * 100) / 100;
        return { ...account, currentBalance: account.currentBalance + netInterest };
      })
    );
  }, []);

  const fillRecurringTransactions = useCallback((month: string) => {
    const activeRecurring = recurringTransactions.filter((transaction) => transaction.isActive);
    const existingPayloads = transactions
      .filter((transaction) => transaction.month === month)
      .map(({ id, createdAt, ...payload }) => payload);

    const missingPayloads: Omit<Transaction, 'id' | 'createdAt'>[] = activeRecurring
      .map((transaction) => ({
        month,
        type: transaction.type,
        name: transaction.name,
        amount: transaction.amount,
        account: transaction.account,
        category: transaction.category,
        subcategoryId: transaction.subcategoryId,
        transferCategory: transaction.transferCategory,
        sourceAccount: transaction.sourceAccount,
        transferAccount: transaction.transferAccount,
        investmentAccount: transaction.investmentAccount,
        includeInInvestmentTotals: transaction.includeInInvestmentTotals,
        goalId: transaction.goalId,
        goalImpact: transaction.goalImpact,
        autoAssigned: transaction.autoAssigned,
        ruleId: transaction.ruleId,
        note: transaction.note,
        folder: transaction.folder,
      }))
      .filter((candidate) => !existingPayloads.some((existing) => isSameTransactionPayload(existing, candidate)));

    if (missingPayloads.length === 0) return 0;

    setTransactions((prev) => [
      ...prev,
      ...missingPayloads.map((payload) => ({
        ...payload,
        id: crypto.randomUUID(),
        createdAt: createTimestamp(),
      })),
    ]);

    missingPayloads.forEach((payload) => applyBalanceDelta(payload, 1));
    applyMonthlyInterest();
    pushAudit({
      type: 'recurring',
      action: 'fill',
      detail: `Do mesice ${month} bylo doplneno ${missingPayloads.length} trvalych transakci.`,
    });
    return missingPayloads.length;
  }, [applyBalanceDelta, applyMonthlyInterest, recurringTransactions, transactions, pushAudit]);

  const addFolder = useCallback((name: string) => {
    if (!folders.includes(name)) {
      setFolders((prev) => [...prev, name]);
    }
  }, [folders]);

  const deleteFolder = useCallback((name: string) => {
    setFolders((prev) => prev.filter((folder) => folder !== name));
  }, []);

  const addGoal = useCallback((goal: Omit<AccountGoal, 'id' | 'createdAt'>) => {
    setGoals((prev) => [
      {
        ...goal,
        status: goal.currentAmount >= goal.targetAmount ? 'completed' : 'active',
        id: crypto.randomUUID(),
        createdAt: createTimestamp(),
      },
      ...prev,
    ]);
    pushAudit({
      type: 'goal',
      action: 'create',
      detail: `Cil ${goal.name} byl pridan.`,
    });
  }, [pushAudit]);

  const updateGoal = useCallback((id: string, updates: Omit<AccountGoal, 'id' | 'createdAt'>) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              ...updates,
              status: updates.currentAmount >= updates.targetAmount ? 'completed' : 'active',
            }
          : goal
      )
    );
    pushAudit({
      type: 'goal',
      action: 'update',
      detail: `Cil ${updates.name} byl upraven.`,
    });
  }, [pushAudit]);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }, []);

  const addSubcategory = useCallback((subcategory: Omit<Subcategory, 'id' | 'isSystem' | 'isArchived'>) => {
    const nextSubcategory: Subcategory = {
      ...subcategory,
      id: crypto.randomUUID(),
      isSystem: false,
      isArchived: false,
    };

    setSubcategories((prev) => mergeSubcategories([...prev, nextSubcategory]));
    pushAudit({
      type: 'system',
      action: 'subcategory-create',
      detail: `Podkategorie ${subcategory.name} byla přidána.`,
    });
  }, [pushAudit]);

  const updateSubcategory = useCallback((id: string, updates: Partial<Pick<Subcategory, 'name' | 'parentCategory' | 'icon' | 'color'>>) => {
    setSubcategories((prev) =>
      mergeSubcategories(
        prev.map((subcategory) =>
          subcategory.id === id
            ? {
                ...subcategory,
                ...updates,
              }
            : subcategory
        )
      )
    );
    pushAudit({
      type: 'system',
      action: 'subcategory-update',
      detail: 'Podkategorie byla upravena.',
    });
  }, [pushAudit]);

  const archiveSubcategory = useCallback((id: string, isArchived: boolean) => {
    setSubcategories((prev) =>
      mergeSubcategories(
        prev.map((subcategory) =>
          subcategory.id === id
            ? {
                ...subcategory,
                isArchived,
              }
            : subcategory
        )
      )
    );
    pushAudit({
      type: 'system',
      action: isArchived ? 'subcategory-archive' : 'subcategory-restore',
      detail: isArchived ? 'Podkategorie byla archivována.' : 'Podkategorie byla znovu obnovena.',
    });
  }, [pushAudit]);

  const deleteSubcategory = useCallback((id: string) => {
    setSubcategories((prev) => mergeSubcategories(prev.filter((subcategory) => subcategory.id !== id)));
    setTransactions((prev) =>
      prev.map((transaction) =>
        transaction.subcategoryId === id
          ? {
              ...transaction,
              subcategoryId: undefined,
            }
          : transaction
      )
    );
    setRecurringTransactions((prev) =>
      prev.map((transaction) =>
        transaction.subcategoryId === id
          ? {
              ...transaction,
              subcategoryId: undefined,
            }
          : transaction
      )
    );
    pushAudit({
      type: 'system',
      action: 'subcategory-delete',
      detail: 'Podkategorie byla odstraněna.',
    });
  }, [pushAudit]);

  const addAutoCategorizationRule = useCallback((rule: Omit<AutoCategorizationRule, 'id' | 'isSystem'>) => {
    const nextRule: AutoCategorizationRule = {
      ...rule,
      id: crypto.randomUUID(),
      isSystem: false,
    };
    setAutoCategorizationRules((prev) => mergeAutoCategorizationRules([...prev, nextRule]));
    pushAudit({
      type: 'system',
      action: 'auto-rule-create',
      detail: `Pravidlo ${rule.name} bylo přidáno.`,
    });
    return nextRule;
  }, [pushAudit]);

  const updateAutoCategorizationRule = useCallback((id: string, updates: Partial<Omit<AutoCategorizationRule, 'id'>>) => {
    setAutoCategorizationRules((prev) =>
      mergeAutoCategorizationRules(
        prev.map((rule) =>
          rule.id === id
            ? {
                ...rule,
                ...updates,
              }
            : rule
        )
      )
    );
    pushAudit({
      type: 'system',
      action: 'auto-rule-update',
      detail: 'Pravidlo automatické kategorizace bylo upraveno.',
    });
  }, [pushAudit]);

  const deleteAutoCategorizationRule = useCallback((id: string) => {
    setAutoCategorizationRules((prev) => mergeAutoCategorizationRules(prev.filter((rule) => rule.id !== id)));
    pushAudit({
      type: 'system',
      action: 'auto-rule-delete',
      detail: 'Pravidlo automatické kategorizace bylo odstraněno.',
    });
  }, [pushAudit]);

  const updateFeatureToggles = useCallback((updates: Partial<FinanceFeatureToggles>) => {
    setFeatureToggles((prev) => ({
      ...prev,
      ...updates,
    }));
    pushAudit({
      type: 'system',
      action: 'feature-toggles-update',
      detail: 'Nastavení chytrých funkcí bylo upraveno.',
    });
  }, [pushAudit]);

  const addBudgetLimit = useCallback((limit: Omit<BudgetLimit, 'id'>) => {
    const nextLimit: BudgetLimit = {
      ...limit,
      id: crypto.randomUUID(),
    };
    setBudgetLimits((prev) => [nextLimit, ...prev]);
    pushAudit({
      type: 'system',
      action: 'budget-limit-create',
      detail: 'Rozpočtový limit byl přidán.',
    });
    return nextLimit;
  }, [pushAudit]);

  const updateBudgetLimit = useCallback((id: string, updates: Partial<Omit<BudgetLimit, 'id'>>) => {
    setBudgetLimits((prev) =>
      prev.map((limit) =>
        limit.id === id
          ? {
              ...limit,
              ...updates,
            }
          : limit
      )
    );
    pushAudit({
      type: 'system',
      action: 'budget-limit-update',
      detail: 'Rozpočtový limit byl upraven.',
    });
  }, [pushAudit]);

  const deleteBudgetLimit = useCallback((id: string) => {
    setBudgetLimits((prev) => prev.filter((limit) => limit.id !== id));
    pushAudit({
      type: 'system',
      action: 'budget-limit-delete',
      detail: 'Rozpočtový limit byl odstraněn.',
    });
  }, [pushAudit]);

  const updateAccountMonthBalance = useCallback((month: string, accountId: string, balance: number) => {
    setImportedAccountBalances((prev) => {
      const key = `${month}-${accountId}`;
      const existing = prev.find((item) => item.month === month && item.accountId === accountId);

      if (existing) {
        return prev
          .map((item) =>
            item.month === month && item.accountId === accountId
              ? { ...item, balance, createdAt: createTimestamp() }
              : item
          )
          .sort((a, b) => b.month.localeCompare(a.month));
      }

      return [
        {
          id: `import-balance-${key}`,
          month,
          accountId,
          balance,
          createdAt: createTimestamp(),
        },
        ...prev,
      ].sort((a, b) => b.month.localeCompare(a.month));
    });

    const matchedAccount = [...bankAccounts, ...brokerAccounts].find((account) => account.id === accountId);
    pushAudit({
      type: 'account',
      action: 'update',
      detail: `Měsíční stav účtu ${matchedAccount?.name || accountId} pro ${month} byl upraven na ${balance}.`,
    });
  }, [bankAccounts, brokerAccounts, pushAudit]);

  const isMonthClosed = useCallback(
    (month: string) => monthClosures.some((entry) => entry.month === month),
    [monthClosures]
  );

  const toggleMonthClosure = useCallback(
    (month: string) => {
      setMonthClosures((prev) => {
        const exists = prev.some((entry) => entry.month === month);
        if (exists) {
          pushAudit({
            type: 'system',
            action: 'month-reopen',
            detail: `Měsíc ${month} byl znovu otevřen pro úpravy.`,
          });
          return prev.filter((entry) => entry.month !== month);
        }

        pushAudit({
          type: 'system',
          action: 'month-close',
          detail: `Měsíc ${month} byl uzavřen jako zkontrolovaný.`,
        });

        return [
          {
            month,
            closedAt: createTimestamp(),
          },
          ...prev,
        ].sort((a, b) => b.month.localeCompare(a.month));
      });
    },
    [pushAudit]
  );

  const visibleGoals = useMemo(
    () => decorateGoals(goals, transactions),
    [decorateGoals, goals, transactions]
  );

  return {
    isHydrated,
    loadError,
    transactions,
    bankAccounts,
    brokerAccounts,
    budgetAllocation,
    portfolioSettings,
    isDarkMode,
    visualTheme,
    recurringTransactions,
    folders,
    goals: visibleGoals,
    auditLog,
    wealthSnapshots,
    accountSnapshots,
    exchangeRates,
    monthClosures,
    subcategories,
    autoCategorizationRules,
    budgetLimits,
    featureToggles,
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
    setBudgetAllocation,
    setPortfolioSettings,
    toggleTheme,
    changeVisualTheme,
    getLastTransaction,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringTransaction,
    fillRecurringTransactions,
    addFolder,
    deleteFolder,
    applyMonthlyInterest,
    addGoal,
    updateGoal,
    deleteGoal,
    addSubcategory,
    updateSubcategory,
    archiveSubcategory,
    deleteSubcategory,
    addAutoCategorizationRule,
    updateAutoCategorizationRule,
    deleteAutoCategorizationRule,
    updateFeatureToggles,
    addBudgetLimit,
    updateBudgetLimit,
    deleteBudgetLimit,
    updateAccountMonthBalance,
    isMonthClosed,
    toggleMonthClosure,
  };
};
