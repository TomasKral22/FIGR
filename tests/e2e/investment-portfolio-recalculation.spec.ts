import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';
import { openHome, seedFinanceStorage } from './helpers';

test('vlastní XLSX šablona přijme české hlavičky a excelová data', async ({ page }) => {
  await seedFinanceStorage(page);
  await openHome(page);
  await page.keyboard.press('Shift+I');
  await expect(page.getByRole('dialog', { name: 'Investice' })).toBeVisible();
  await page.getByRole('button', { name: 'Import brokera / sablony' }).first().click();

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [
      'Ticker',
      'Název',
      'Typ aktiva',
      'Poskytovatel',
      'Typ transakce',
      'Množství',
      'Cena za jednotku',
      'Měna',
      'Datum transakce',
      'Sektor',
      'Ex-dividend datum',
      'Datum výplaty',
      'Očekávaná dividenda',
    ],
    ['AAPL', 'Apple', 'stock', 'broker', 'buy', 2, 150, 'USD', 44991, 'Technologie', '', '', ''],
    ['CSPX', 'iShares Core S&P 500', 'etf', 'broker', 'sell', 0.5, 500, 'USD', 45009, 'Široký trh', '', '', ''],
    ['AAPL', 'Apple', 'stock', 'broker', 'dividend', 2, 0.24, 'USD', 45065, 'Technologie', 45060, 45065, 0.48],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Import');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  await page
    .getByRole('dialog', { name: 'Import investicnich transakci' })
    .locator('input[type="file"]')
    .setInputFiles({
    name: 'figr-investice-sablona.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  await expect(page.getByText('3 platných')).toBeVisible();
  await expect(page.getByText('0 neplatných')).toBeVisible();
  await expect(page.getByRole('cell', { name: '2023-03-06' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'sell' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'ETF' })).toBeVisible();
});

test('celé portfolio zůstane v součtu bez živé ceny a bez snapshotu', async ({ page }) => {
  const now = new Date().toISOString();
  await seedFinanceStorage(page, {
    investmentSourceAccounts: [
      {
        id: 'source-managed',
        name: 'Spravované portfolio',
        provider: 'other',
        account_type: 'managed_portfolio',
        currency: 'CZK',
        sync_mode: 'file_import',
        valuation_mode: 'snapshot',
        covers_unassigned_positions: false,
        excluded_amount: 0,
        is_active: true,
        last_synced_at: now,
        note: null,
        created_at: now,
        updated_at: now,
      },
    ],
    investmentAssets: [
      {
        id: 'asset-fund',
        ticker: 'FOND-TEST',
        name: 'Testovací fond',
        asset_type: 'fund',
        provider: 'other',
        sector: 'Smíšené',
        currency: 'CZK',
        source_account_id: 'source-managed',
        created_at: now,
        updated_at: now,
      },
    ],
    investmentTransactions: [
      {
        id: 'buy-fund',
        asset_id: 'asset-fund',
        transaction_type: 'buy',
        quantity: 10,
        price_per_unit: 2500,
        total_value: 25000,
        currency: 'CZK',
        transaction_date: '2026-08-01',
        notes: null,
        import_batch_id: null,
        source_account_id: 'source-managed',
        created_at: now,
      },
    ],
  });

  await openHome(page);
  await page.keyboard.press('Shift+I');
  await expect(page.getByRole('dialog', { name: 'Investice' })).toBeVisible();

  await expect(page.getByText(/25[\s\u00a0]?000.*Kč/).first()).toBeVisible();
  await expect(page.getByText(/1 aktiv nemá aktuální cenu; v celku je použita poslední transakční cena/)).toBeVisible();
  await expect(page.getByText(/1 snapshotových zdrojů nemá snapshot; dočasně se počítá součet pozic/)).toBeVisible();
  await expect(page.getByText('Náhradní ceny: 1')).toBeVisible();
});
