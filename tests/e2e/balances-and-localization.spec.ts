import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

const currentYear = new Date().getFullYear();

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, {
    theme: 'dark',
    visualTheme: 'dark-blue',
    bankAccounts: [
      {
        id: 'bank-kb',
        name: 'Komerční banka',
        institutionId: 'kb',
        initialBalance: 10000,
        currentBalance: 11500,
        isSavings: false,
      },
    ],
    transactions: [
      {
        id: 'tx-income-1',
        month: `${currentYear}-02`,
        type: 'income',
        name: 'Výplata',
        amount: 1500,
        account: 'bank-kb',
        createdAt: `${currentYear}-02-01T08:00:00.000Z`,
      },
    ],
  });
});

test('čeština s diakritikou je vidět v hlavních částech aplikace', async ({ page }) => {
  await openHome(page);

  await expect(page.getByTestId('app-header').getByRole('button', { name: 'Nová transakce' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Přehled', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trvalé příkazy', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cíle', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reporty a grafy', exact: true })).toBeVisible();
  await expect(page.getByText('Bankovní účty')).toBeVisible();
});

test('smazání transakce vrátí stav účtu i měsíční snapshot', async ({ page }) => {
  await openHome(page);

  await expect(page.getByText(/11.*500,00.*Kč/).first()).toBeVisible();
  await page.getByRole('button', { name: /únor/i }).click();
  await expect(page.getByTestId('transaction-tx-income-1').getByText('Výplata')).toBeVisible();
  const transactionRow = page.locator('[data-testid="transaction-tx-income-1"]');
  await transactionRow.hover();
  await transactionRow.getByRole('button', { name: /Smazat transakci/i }).click({ force: true });

  await expect(page.getByTestId('transaction-tx-income-1')).toHaveCount(0);
  await expect(page.getByText(/10.*000,00.*Kč/).first()).toBeVisible();
  await expect(page.getByText(/11.*500,00.*Kč/)).toHaveCount(0);
});
