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

  await page.getByRole('button', { name: 'Cizí prostředky' }).click();
  const excludedAmountDialog = page.getByRole('dialog', { name: /Cizí prostředky – Investown/ });
  await excludedAmountDialog.getByLabel('Nezapočítávat (CZK)').fill('50000');
  await excludedAmountDialog.getByRole('button', { name: 'Uložit částku' }).click();

  await expect(page.getByText(/100[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(page.getByText(/Mimo vlastní majetek:.*50[\s\u00a0]?000.*Kč/)).toBeVisible();
  await expect(page.getByText(/7[,.]14\s?%/).first()).toBeVisible();

  const persistedPage = await page.context().newPage();
  await openHome(persistedPage);
  await persistedPage.keyboard.press('Shift+I');
  await expect(persistedPage.getByRole('dialog', { name: 'Investice' })).toBeVisible();
  await expect(persistedPage.getByText('Investown – hlavní účet').first()).toBeVisible();
  await expect(persistedPage.getByText(/100[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(persistedPage.getByText(/Mimo vlastní majetek:.*50[\s\u00a0]?000.*Kč/)).toBeVisible();
});

test('ruční hodnota z Alocana nahradí nepřiřazené pozice a nezapočítá portfolio dvakrát', async ({ page }) => {
  const now = new Date().toISOString();
  await seedFinanceStorage(page, {
    investmentSourceAccounts: [],
    investmentValueSnapshots: [],
    investmentAssets: [
      {
        id: 'asset-imported',
        ticker: 'PORTFOLIO',
        name: 'Dříve importované portfolio',
        asset_type: 'fund',
        provider: 'broker',
        sector: null,
        currency: 'CZK',
        source_account_id: null,
        created_at: now,
        updated_at: now,
      },
    ],
    investmentTransactions: [
      {
        id: 'transaction-imported',
        asset_id: 'asset-imported',
        transaction_type: 'buy',
        quantity: 1,
        price_per_unit: 100000,
        total_value: 100000,
        currency: 'CZK',
        transaction_date: '2026-08-01',
        notes: null,
        import_batch_id: null,
        source_account_id: null,
        created_at: now,
      },
    ],
  });

  await openHome(page);
  await page.getByRole('button', { name: 'Investice', exact: true }).first().click();
  await expect(page.getByText(/100[\s\u00a0]?000.*Kč/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Přidat zdroj' }).click();
  const sourceDialog = page.getByRole('dialog', { name: 'Nový investiční zdroj' });
  await sourceDialog.getByLabel('Název účtu').fill('Alocano – celé portfolio');
  await sourceDialog.getByText('Poskytovatel', { exact: true }).locator('..').getByRole('combobox').click();
  await page.getByRole('option', { name: 'Alocano', exact: true }).click();
  await expect(sourceDialog.getByRole('switch', { name: 'Nahradit pozice bez přiřazeného účtu' })).toBeChecked();
  await expect(sourceDialog.getByText('Aktualizace', { exact: true }).locator('..').getByRole('combobox')).toContainText('Ruční snapshot');
  await sourceDialog.getByRole('button', { name: 'Přidat zdroj' }).click();

  await page.getByRole('button', { name: 'Nový snapshot' }).click();
  const snapshotDialog = page.getByRole('dialog', { name: /Aktualizovat Alocano/ });
  await expect(snapshotDialog.getByText(/Z Alocana opiš pouze Celkovou hodnotu/)).toBeVisible();
  await expect(snapshotDialog.getByLabel('Z toho hotovost')).toHaveCount(0);
  await snapshotDialog.getByLabel('Celková hodnota (CZK)').fill('250000');
  await snapshotDialog.getByRole('button', { name: 'Uložit snapshot' }).click();

  await expect(page.getByText(/250[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(page.getByText(/350[\s\u00a0]?000.*Kč/)).toHaveCount(0);
  await expect(page.getByText('Bez přiřazeného účtu')).toHaveCount(0);
});
