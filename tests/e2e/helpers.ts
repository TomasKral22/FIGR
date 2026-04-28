import { Page } from '@playwright/test';

type StorageSeed = {
  transactions?: unknown[];
  bankAccounts?: unknown[];
  brokerAccounts?: unknown[];
  recurringTransactions?: unknown[];
  goals?: unknown[];
  auditLog?: unknown[];
  wealthSnapshots?: unknown[];
  accountSnapshots?: unknown[];
  importedAccountBalances?: unknown[];
  theme?: 'light' | 'dark';
  visualTheme?: string;
  lastTransaction?: unknown | null;
};

const DEFAULT_BUDGET = {
  necessities: 50,
  investments: 20,
  savings: 20,
  whims: 10,
};

const DEFAULT_PORTFOLIO = {
  annualReturn: 7,
  currentAge: 30,
};

export async function seedFinanceStorage(page: Page, seed: StorageSeed = {}) {
  await page.addInitScript((data) => {
    const write = (key: string, value: unknown) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    };

    write('finance_transactions', data.transactions ?? []);
    write('finance_bank_accounts', data.bankAccounts ?? []);
    write('finance_broker_accounts', data.brokerAccounts ?? []);
    write('finance_budget', DEFAULT_BUDGET);
    write('finance_portfolio', DEFAULT_PORTFOLIO);
    write('finance_recurring_transactions', data.recurringTransactions ?? []);
    write('finance_folders', []);
    write('finance_goals', data.goals ?? []);
    write('finance_audit_log', data.auditLog ?? []);
    write('finance_snapshots', data.wealthSnapshots ?? []);
    write('finance_account_snapshots', data.accountSnapshots ?? []);
    write('finance_imported_account_balances', data.importedAccountBalances ?? []);
    window.localStorage.setItem('finance_theme', data.theme ?? 'dark');
    window.localStorage.setItem('finance_visual_theme', data.visualTheme ?? 'classic');
    write('finance_last_transaction', data.lastTransaction ?? null);
  }, seed);
}

export async function openHome(page: Page) {
  await page.goto('/#/');
  await page.getByTestId('app-header').waitFor();
}
