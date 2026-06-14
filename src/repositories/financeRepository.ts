import {
  AccountGoal,
  AutoCategorizationRule,
  BudgetAllocation,
  BudgetLimit,
  FinanceFeatureToggles,
  ImportedAccountMonthBalance,
  AccountMonthlySnapshot,
  AuditLogEntry,
  BankAccount,
  MonthClosure,
  PortfolioSettings,
  RecurringTransaction,
  Subcategory,
  Transaction,
  WealthSnapshot,
} from '@/types/finance';
import { appStorage } from '@/lib/appStorage';
import { convertCurrencyValue, ExchangeRateLike, normalizeCurrencyCode } from '@/utils/currency';
import {
  DEFAULT_FINANCE_FEATURE_TOGGLES,
  mergeAutoCategorizationRules,
  mergeSubcategories,
} from '@/utils/categoryAutomation';

export const FINANCE_STORAGE_KEYS = {
  TRANSACTIONS: 'finance_transactions',
  BANK_ACCOUNTS: 'finance_bank_accounts',
  BROKER_ACCOUNTS: 'finance_broker_accounts',
  BUDGET: 'finance_budget',
  PORTFOLIO: 'finance_portfolio',
  THEME: 'finance_theme',
  LAST_TRANSACTION: 'finance_last_transaction',
  RECURRING_TRANSACTIONS: 'finance_recurring_transactions',
  FOLDERS: 'finance_folders',
  GOALS: 'finance_goals',
  AUDIT_LOG: 'finance_audit_log',
  SNAPSHOTS: 'finance_snapshots',
  ACCOUNT_SNAPSHOTS: 'finance_account_snapshots',
  IMPORTED_ACCOUNT_BALANCES: 'finance_imported_account_balances',
  VISUAL_THEME: 'finance_visual_theme',
  MONTH_CLOSURES: 'finance_month_closures',
  SUBCATEGORIES: 'finance_subcategories',
  AUTO_CATEGORIZATION_RULES: 'finance_auto_categorization_rules',
  BUDGET_LIMITS: 'finance_budget_limits',
  FEATURE_TOGGLES: 'finance_feature_toggles',
  INVESTMENT_EXCHANGE_RATES: 'investment_exchange_rates',
} as const;

export const DEFAULT_FINANCE_BUDGET: BudgetAllocation = {
  necessities: 50,
  investments: 20,
  savings: 20,
  whims: 10,
};

export const DEFAULT_FINANCE_PORTFOLIO_SETTINGS: PortfolioSettings = {
  annualReturn: 7,
  currentAge: 30,
};

export interface FinanceStorageSnapshot {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  budgetAllocation: BudgetAllocation;
  portfolioSettings: PortfolioSettings;
  recurringTransactions: RecurringTransaction[];
  folders: string[];
  goals: AccountGoal[];
  auditLog: AuditLogEntry[];
  wealthSnapshots: WealthSnapshot[];
  accountSnapshots: AccountMonthlySnapshot[];
  importedAccountBalances: ImportedAccountMonthBalance[];
  monthClosures: MonthClosure[];
  subcategories: Subcategory[];
  autoCategorizationRules: AutoCategorizationRule[];
  budgetLimits: BudgetLimit[];
  featureToggles: FinanceFeatureToggles;
  lastTransaction: Omit<Transaction, 'id' | 'createdAt'> | null;
  isDarkMode: boolean;
  visualTheme: string;
}

export interface LoadedFinanceState extends FinanceStorageSnapshot {
  exchangeRates: ExchangeRateLike[];
}

const normalizeAccount = (account: BankAccount): BankAccount => ({
  ...account,
  currency: normalizeCurrencyCode(account.currency, 'CZK'),
});

const parseStoredValue = <T,>(loaded: Record<string, string | null>, key: string, fallback: T): T => {
  const value = loaded[key];
  return value ? (JSON.parse(value) as T) : fallback;
};

const normalizeVisualTheme = (value: string, legacyTheme: string | null) => {
  if (['light', 'dark-blue', 'warm-orange'].includes(value)) return value;
  if (['classic', 'studio', 'metal'].includes(value)) return 'light';
  if (value === 'sunset') return 'warm-orange';
  if (value === 'neon') return 'dark-blue';
  if (legacyTheme === 'light') return 'light';
  return 'dark-blue';
};

export const loadFinanceState = async (): Promise<LoadedFinanceState> => {
  const loaded = await appStorage.getMany(Object.values(FINANCE_STORAGE_KEYS));
  const legacyTheme = loaded[FINANCE_STORAGE_KEYS.THEME] ?? localStorage.getItem(FINANCE_STORAGE_KEYS.THEME);
  const rawVisualTheme =
    loaded[FINANCE_STORAGE_KEYS.VISUAL_THEME] ??
    localStorage.getItem(FINANCE_STORAGE_KEYS.VISUAL_THEME) ??
    'dark-blue';
  const visualTheme = normalizeVisualTheme(rawVisualTheme, legacyTheme);

  return {
    transactions: parseStoredValue<Transaction[]>(loaded, FINANCE_STORAGE_KEYS.TRANSACTIONS, []),
    bankAccounts: parseStoredValue<BankAccount[]>(loaded, FINANCE_STORAGE_KEYS.BANK_ACCOUNTS, []).map(normalizeAccount),
    brokerAccounts: parseStoredValue<BankAccount[]>(loaded, FINANCE_STORAGE_KEYS.BROKER_ACCOUNTS, []).map(normalizeAccount),
    budgetAllocation: parseStoredValue<BudgetAllocation>(loaded, FINANCE_STORAGE_KEYS.BUDGET, DEFAULT_FINANCE_BUDGET),
    portfolioSettings: parseStoredValue<PortfolioSettings>(
      loaded,
      FINANCE_STORAGE_KEYS.PORTFOLIO,
      DEFAULT_FINANCE_PORTFOLIO_SETTINGS
    ),
    recurringTransactions: parseStoredValue<RecurringTransaction[]>(
      loaded,
      FINANCE_STORAGE_KEYS.RECURRING_TRANSACTIONS,
      []
    ),
    folders: parseStoredValue<string[]>(loaded, FINANCE_STORAGE_KEYS.FOLDERS, []),
    goals: parseStoredValue<AccountGoal[]>(loaded, FINANCE_STORAGE_KEYS.GOALS, []),
    auditLog: parseStoredValue<AuditLogEntry[]>(loaded, FINANCE_STORAGE_KEYS.AUDIT_LOG, []),
    wealthSnapshots: parseStoredValue<WealthSnapshot[]>(loaded, FINANCE_STORAGE_KEYS.SNAPSHOTS, []),
    accountSnapshots: parseStoredValue<AccountMonthlySnapshot[]>(loaded, FINANCE_STORAGE_KEYS.ACCOUNT_SNAPSHOTS, []),
    importedAccountBalances: parseStoredValue<ImportedAccountMonthBalance[]>(
      loaded,
      FINANCE_STORAGE_KEYS.IMPORTED_ACCOUNT_BALANCES,
      []
    ),
    monthClosures: parseStoredValue<MonthClosure[]>(loaded, FINANCE_STORAGE_KEYS.MONTH_CLOSURES, []),
    subcategories: mergeSubcategories(parseStoredValue<Subcategory[]>(loaded, FINANCE_STORAGE_KEYS.SUBCATEGORIES, [])),
    autoCategorizationRules: mergeAutoCategorizationRules(
      parseStoredValue<AutoCategorizationRule[]>(loaded, FINANCE_STORAGE_KEYS.AUTO_CATEGORIZATION_RULES, [])
    ),
    budgetLimits: parseStoredValue<BudgetLimit[]>(loaded, FINANCE_STORAGE_KEYS.BUDGET_LIMITS, []),
    featureToggles: {
      ...DEFAULT_FINANCE_FEATURE_TOGGLES,
      ...parseStoredValue<FinanceFeatureToggles>(
        loaded,
        FINANCE_STORAGE_KEYS.FEATURE_TOGGLES,
        DEFAULT_FINANCE_FEATURE_TOGGLES
      ),
    },
    lastTransaction: parseStoredValue<Omit<Transaction, 'id' | 'createdAt'> | null>(
      loaded,
      FINANCE_STORAGE_KEYS.LAST_TRANSACTION,
      null
    ),
    exchangeRates: parseStoredValue<ExchangeRateLike[]>(
      loaded,
      FINANCE_STORAGE_KEYS.INVESTMENT_EXCHANGE_RATES,
      []
    ).sort((a, b) => b.rate_date.localeCompare(a.rate_date)),
    isDarkMode: visualTheme !== 'light',
    visualTheme,
  };
};

export const saveFinanceState = async (state: FinanceStorageSnapshot) => {
  await appStorage.setMany({
    [FINANCE_STORAGE_KEYS.TRANSACTIONS]: JSON.stringify(state.transactions),
    [FINANCE_STORAGE_KEYS.BANK_ACCOUNTS]: JSON.stringify(state.bankAccounts),
    [FINANCE_STORAGE_KEYS.BROKER_ACCOUNTS]: JSON.stringify(state.brokerAccounts),
    [FINANCE_STORAGE_KEYS.BUDGET]: JSON.stringify(state.budgetAllocation),
    [FINANCE_STORAGE_KEYS.PORTFOLIO]: JSON.stringify(state.portfolioSettings),
    [FINANCE_STORAGE_KEYS.RECURRING_TRANSACTIONS]: JSON.stringify(state.recurringTransactions),
    [FINANCE_STORAGE_KEYS.FOLDERS]: JSON.stringify(state.folders),
    [FINANCE_STORAGE_KEYS.GOALS]: JSON.stringify(state.goals),
    [FINANCE_STORAGE_KEYS.AUDIT_LOG]: JSON.stringify(state.auditLog),
    [FINANCE_STORAGE_KEYS.SNAPSHOTS]: JSON.stringify(state.wealthSnapshots),
    [FINANCE_STORAGE_KEYS.ACCOUNT_SNAPSHOTS]: JSON.stringify(state.accountSnapshots),
    [FINANCE_STORAGE_KEYS.IMPORTED_ACCOUNT_BALANCES]: JSON.stringify(state.importedAccountBalances),
    [FINANCE_STORAGE_KEYS.MONTH_CLOSURES]: JSON.stringify(state.monthClosures),
    [FINANCE_STORAGE_KEYS.SUBCATEGORIES]: JSON.stringify(state.subcategories),
    [FINANCE_STORAGE_KEYS.AUTO_CATEGORIZATION_RULES]: JSON.stringify(state.autoCategorizationRules),
    [FINANCE_STORAGE_KEYS.BUDGET_LIMITS]: JSON.stringify(state.budgetLimits),
    [FINANCE_STORAGE_KEYS.FEATURE_TOGGLES]: JSON.stringify(state.featureToggles),
    [FINANCE_STORAGE_KEYS.THEME]: state.isDarkMode ? 'dark' : 'light',
    [FINANCE_STORAGE_KEYS.VISUAL_THEME]: state.visualTheme,
    [FINANCE_STORAGE_KEYS.LAST_TRANSACTION]: JSON.stringify(state.lastTransaction),
  });
};

export const loadFinanceExchangeRates = async () => {
  const loaded = await appStorage.getMany([FINANCE_STORAGE_KEYS.INVESTMENT_EXCHANGE_RATES]);
  return parseStoredValue<ExchangeRateLike[]>(loaded, FINANCE_STORAGE_KEYS.INVESTMENT_EXCHANGE_RATES, []).sort((a, b) =>
    b.rate_date.localeCompare(a.rate_date)
  );
};

export const convertSnapshotsToReportingCurrency = (
  value: number,
  currency: string,
  exchangeRates: ExchangeRateLike[],
  reportingCurrency = 'CZK'
) => convertCurrencyValue(value, currency, reportingCurrency, exchangeRates, reportingCurrency);
