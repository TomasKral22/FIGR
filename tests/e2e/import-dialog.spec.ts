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
        initialBalance: 10000,
        currentBalance: 10000,
      },
    ],
  });
});

test('dialog importu drží obsah uvnitř a nabízí obě akce', async ({ page }) => {
  await openHome(page);

  await page.getByTestId('app-header').getByRole('button', { name: 'Import' }).click();

  const dialog = page.getByTestId('import-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Import dat' })).toBeVisible();

  const actionButtons = dialog.locator('button.h-auto');
  const exportButton = actionButtons.nth(0);
  const importButton = actionButtons.nth(1);

  await expect(exportButton).toBeVisible();
  await expect(importButton).toBeVisible();

  const dialogBox = await dialog.boundingBox();
  const exportBox = await exportButton.boundingBox();
  const importBox = await importButton.boundingBox();

  expect(dialogBox).not.toBeNull();
  expect(exportBox).not.toBeNull();
  expect(importBox).not.toBeNull();

  expect(exportBox!.x + exportBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
  expect(importBox!.x + importBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
  expect(exportBox!.y + exportBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 1);
  expect(importBox!.y + importBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 1);
});
