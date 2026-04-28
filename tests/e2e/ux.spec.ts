import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, {
    theme: 'dark',
    visualTheme: 'classic',
    bankAccounts: [
      {
        id: 'bank-kb',
        name: 'Komerční banka',
        institutionId: 'kb',
        initialBalance: 40000,
        currentBalance: 40200,
        isSavings: false,
        interestRate: 0,
      },
      {
        id: 'bank-sporak',
        name: 'KB Spořicí účet',
        institutionId: 'kb',
        initialBalance: 120000,
        currentBalance: 121500,
        isSavings: true,
        interestRate: 4.5,
      },
    ],
    brokerAccounts: [
      {
        id: 'broker-t212',
        name: 'Trading 212',
        institutionId: 't212',
        initialBalance: 15000,
        currentBalance: 15250,
      },
    ],
  });
});

test('hlavička drží kompaktní výšku a přepínání vzhledu se ukládá', async ({ page }) => {
  await openHome(page);

  const header = page.getByTestId('app-header');
  const headerBox = await header.boundingBox();

  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeLessThan(180);

  await expect(page.getByText('Účty banky')).toBeVisible();
  await expect(page.getByText('Účty brokerů')).toBeVisible();
  await expect(page.getByText('KB Spořicí účet · s.ú.')).toBeVisible();

  await page.getByRole('button', { name: 'Přepnout na světlý režim' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('finance_theme')))
    .toBe('light');

  await page.getByRole('button', { name: 'Vizuální styly' }).click();
  await page.getByRole('button', { name: /Neon/i }).click();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.surface))
    .toBe('neon');

  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.surface))
    .toBe('neon');
});
