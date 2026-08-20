import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, {
    theme: 'dark',
    visualTheme: 'dark-blue',
    investmentSourceAccounts: [],
    investmentValueSnapshots: [],
    investmentAssets: [],
    investmentTransactions: [],
  });
});

test('Investown zdroj a snapshot se započítají do jednotného portfolia a přežijí reload', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Investice', exact: true }).first().click();

  await expect(page.getByText('Investiční účty a zdroje')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kvalita dat 0 %' })).toBeVisible();

  await page.getByRole('button', { name: 'Přidat zdroj' }).click();
  const sourceDialog = page.getByRole('dialog', { name: 'Nový investiční zdroj' });
  await sourceDialog.getByLabel('Název účtu').fill('Investown – hlavní účet');
  await sourceDialog.getByRole('button', { name: 'Přidat zdroj' }).click();

  await expect(page.getByText('Investown – hlavní účet').first()).toBeVisible();
  await page.getByRole('button', { name: 'Nový snapshot' }).click();
  const snapshotDialog = page.getByRole('dialog', { name: /Aktualizovat Investown/ });
  await snapshotDialog.getByLabel('Celková hodnota (CZK)').fill('150000');
  await snapshotDialog.getByLabel('Z toho hotovost').fill('5000');
  await snapshotDialog.getByLabel('Celkem vloženo').fill('140000');
  await snapshotDialog.getByRole('button', { name: 'Uložit snapshot' }).click();

  await expect(page.getByText(/150[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(page.getByText(/7[,.]14\s?%/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kvalita dat 100 %' })).toBeVisible();

  await page.reload();
  await page.getByTestId('app-header').waitFor();
  await page.getByRole('button', { name: 'Investice', exact: true }).first().click();
  await expect(page.getByText('Investown – hlavní účet').first()).toBeVisible();
  await expect(page.getByText(/150[\s\u00a0]?000.*Kč/).first()).toBeVisible();
});
