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
  investmentSourceAccounts?: unknown[];
  investmentValueSnapshots?: unknown[];
  investmentAssets?: unknown[];
  investmentTransactions?: unknown[];
  investmentPrices?: unknown[];
  investmentExchangeRates?: unknown[];
  investmentSettings?: unknown | null;
  theme?: 'light' | 'dark';
  visualTheme?: string;
  lastTransaction?: unknown | null;
};

export async function seedFinanceStorage(page: Page, seed: StorageSeed = {}) {
  await page.addInitScript((data) => {
    const write = (key: string, value: unknown) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    };

    write('finance_transactions', data.transactions ?? []);
    write('finance_bank_accounts', data.bankAccounts ?? []);
    write('finance_broker_accounts', data.brokerAccounts ?? []);
    write('finance_budget', {
      necessities: 50,
      investments: 20,
      savings: 20,
      whims: 10,
    });
    write('finance_portfolio', {
      annualReturn: 7,
      currentAge: 30,
    });
    write('finance_recurring_transactions', data.recurringTransactions ?? []);
    write('finance_folders', []);
    write('finance_goals', data.goals ?? []);
    write('finance_audit_log', data.auditLog ?? []);
    write('finance_snapshots', data.wealthSnapshots ?? []);
    write('finance_account_snapshots', data.accountSnapshots ?? []);
    write('finance_imported_account_balances', data.importedAccountBalances ?? []);
    write('investment_source_accounts', data.investmentSourceAccounts ?? []);
    write('investment_value_snapshots', data.investmentValueSnapshots ?? []);
    write('investment_assets', data.investmentAssets ?? []);
    write('investment_transactions', data.investmentTransactions ?? []);
    write('investment_prices', data.investmentPrices ?? []);
    write('investment_exchange_rates', data.investmentExchangeRates ?? []);
    if (data.investmentSettings !== undefined) write('investment_settings', data.investmentSettings);
    window.localStorage.setItem('finance_theme', data.theme ?? 'dark');
    window.localStorage.setItem('finance_visual_theme', data.visualTheme ?? 'dark-blue');
    window.localStorage.setItem('figr_auth_bypass', 'true');
    write('finance_last_transaction', data.lastTransaction ?? null);
  }, seed);
}

export async function openHome(page: Page) {
  await page.goto('/#/?testBypass=1');
  await page.getByTestId('app-header').waitFor();
}
