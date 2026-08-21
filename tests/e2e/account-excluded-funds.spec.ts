import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, {
    theme: 'dark',
    visualTheme: 'dark-blue',
    bankAccounts: [
      {
        id: 'bank-family',
        name: 'Rodinný účet',
        institutionId: 'kb',
        currency: 'CZK',
        initialBalance: 150000,
        currentBalance: 150000,
        excludedAmount: 0,
        isSavings: false,
        interestRate: 0,
      },
    ],
  });
});

test('cizí prostředky na běžném účtu se nepočítají do vlastního majetku a přežijí reload', async ({ page }) => {
  await openHome(page);

  await page.getByRole('button', { name: 'Účty', exact: true }).first().click();
  await page.getByRole('button', { name: 'Upravit Rodinný účet' }).click();
  await page.getByLabel('Cizí prostředky').fill('50000');
  await page.getByRole('button', { name: 'Uložit Rodinný účet' }).click();
  await page.getByRole('button', { name: 'Hotovo' }).click();

  await expect(page.getByText(/100[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(page.getByText(/Mimo vlastní majetek:.*50[\s\u00a0]?000.*Kč/)).toBeVisible();
  await expect(page.getByText(/Celkem.*150[\s\u00a0]?000.*Kč.*cizí.*50[\s\u00a0]?000.*Kč/).first()).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const accounts = JSON.parse(window.localStorage.getItem('finance_bank_accounts') || '[]') as Array<{
          id: string;
          excludedAmount?: number;
        }>;
        return accounts.find((account) => account.id === 'bank-family')?.excludedAmount;
      })
    )
    .toBe(50000);

  const reopenedPage = await page.context().newPage();
  await reopenedPage.goto('/#/?testBypass=1');
  await reopenedPage.getByTestId('app-header').waitFor();

  await expect(reopenedPage.getByText(/100[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(reopenedPage.getByText(/Mimo vlastní majetek:.*50[\s\u00a0]?000.*Kč/)).toBeVisible();
});
