import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

const currentYear = new Date().getFullYear();

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, {
    theme: 'dark',
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

  await expect(page.getByRole('button', { name: 'Nová transakce' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Přehled' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trvalé příkazy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finanční cíle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zálohy databáze' })).toBeVisible();
  await expect(page.getByText('Účty banky')).toBeVisible();
});

test('smazání transakce vrátí stav účtu i měsíční snapshot', async ({ page }) => {
  await openHome(page);

  await expect(page.getByTestId('app-header').getByText(/11.*500,00.*Kč/)).toBeVisible();
  await expect(page.getByText('Výplata')).toBeVisible();
  await expect(
    page.getByText('Stavy účtů').locator('xpath=..').getByText(/11.*500,00.*Kč/)
  ).toBeVisible();

  const transactionRow = page.locator('[data-testid="transaction-tx-income-1"]');
  await transactionRow.hover();
  await transactionRow.getByRole('button').click({ force: true });

  await expect(page.getByText('Výplata')).toHaveCount(0);
  await expect(page.getByTestId('app-header').getByText(/10.*000,00.*Kč/)).toBeVisible();
  await expect(page.getByText(/11.*500,00.*Kč/)).toHaveCount(0);
});
