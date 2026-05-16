import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, {
    theme: 'dark',
    visualTheme: 'dark-blue',
    bankAccounts: [
      {
        id: 'bank-kb',
        name: 'Komerční banka',
        institutionId: 'kb',
        initialBalance: 50000,
        currentBalance: 50000,
        isSavings: false,
        interestRate: 0,
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        month: '2026-01',
        type: 'expense',
        name: 'Lidl',
        amount: 820,
        account: 'bank-kb',
        category: 'necessities',
        createdAt: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'tx-2',
        month: '2026-02',
        type: 'income',
        name: 'Výplata',
        amount: 39316,
        account: 'bank-kb',
        createdAt: '2026-02-02T10:00:00.000Z',
      },
    ],
  });
});

test('kliknutí na kartu měsíce přepne detail pod gridem', async ({ page }) => {
  await openHome(page);

  await expect(page.getByText('Roční přehled měsíců')).toBeVisible();
  await expect(page.getByRole('button', { name: /únor/i })).toBeVisible();

  await page.getByRole('button', { name: /únor/i }).click();

  await expect(page.getByRole('heading', { name: /Detail měsíce/i })).toContainText(/únor 2026/i);
  await expect(page.getByTestId('transaction-tx-2').getByText('Výplata')).toBeVisible();
});

test('uložit a přidat další nechá modal otevřený a zachová účet', async ({ page }) => {
  await openHome(page);

  await page.getByTestId('app-header').getByRole('button', { name: /Nová transakce/i }).click();

  await page.getByLabel('Název transakce').fill('Benzín');
  await page.getByLabel('Částka').fill('1500');
  await page.locator('#transaction-account').selectOption('bank-kb');

  await page.getByRole('button', { name: 'Uložit a přidat další' }).click();

  await expect(page.getByLabel('Název transakce')).toHaveValue('');
  await expect(page.getByLabel('Částka')).toHaveValue('');
  await expect(page.locator('#transaction-account')).toHaveValue('bank-kb');
  await expect(page.getByRole('heading', { name: /Přidat transakci/i })).toBeVisible();
});
