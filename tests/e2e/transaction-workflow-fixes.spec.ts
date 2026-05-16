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
        initialBalance: 40000,
        currentBalance: 40000,
        isSavings: false,
      },
      {
        id: 'bank-rb',
        name: 'Raiffeisenbank',
        institutionId: 'rb',
        initialBalance: 12000,
        currentBalance: 12000,
        isSavings: false,
      },
    ],
    transactions: [
      {
        id: 'tx-lidl',
        month: '2026-02',
        type: 'expense',
        name: 'Lidl',
        amount: 820,
        account: 'bank-kb',
        category: 'necessities',
        createdAt: '2026-02-01T10:00:00.000Z',
      },
    ],
  });
});

test('našeptávač se zavře po kliknutí mimo pole názvu', async ({ page }) => {
  await openHome(page);

  await page.getByTestId('app-header').getByRole('button', { name: 'Nová transakce' }).click();
  await page.getByLabel('Název transakce').fill('Lid');

  const autocomplete = page.getByTestId('transaction-autocomplete');
  await expect(autocomplete).toBeVisible();
  await expect(autocomplete.getByRole('button', { name: /Lidl/i })).toBeVisible();

  await page.getByLabel('Částka').click();
  await expect(autocomplete).toBeHidden();
});

test('rychlé akce a chytré souvislosti jsou defaultně sbalené a jdou rozbalit', async ({ page }) => {
  await openHome(page);

  await expect(page.getByText('Rychlé akce', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Rychlé akce a chytré souvislosti/i }).click();
  await expect(page.getByText('Rychlé akce', { exact: true })).toBeVisible();
  await expect(page.getByText('Chytré souvislosti', { exact: true })).toBeVisible();
});

test('bulk tabulka má správné pořadí účtů a modal jde rozšířit', async ({ page }) => {
  await openHome(page);

  await page.getByTestId('app-header').getByRole('button', { name: 'Nová transakce' }).click();
  await page.getByRole('tab', { name: 'Hromadné zadání' }).click();

  const panel = page.getByTestId('transaction-form-panel');
  const before = await panel.boundingBox();
  await page.getByRole('button', { name: 'Na celou šířku' }).click();
  const after = await panel.boundingBox();

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThan(before!.width);

  const headers = await page.getByTestId('bulk-table-header').locator('> div').allTextContents();
  expect(headers.slice(0, 6)).toEqual([
    'Název transakce',
    'Částka',
    'Typ',
    'Zdrojový účet',
    'Cílový účet',
    'Druh / Kategorie',
  ]);
});
