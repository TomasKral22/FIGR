import { expect, test } from '@playwright/test';
import { openHome, seedFinanceStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFinanceStorage(page, { bankAccounts: [{ id: 'calc-bank', name: 'Testovací účet', currency: 'CZK', initialBalance: 150000, currentBalance: 150000, excludedAmount: 50000, isSavings: false, interestRate: 0 }] });
  await openHome(page);
});

test('sidebar opens a searchable calculator hub and returns to overview', async ({ page }) => {
  await page.getByRole('button', { name: 'Kalkulačky', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kalkulačky', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kalkulačky', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Ocenění', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Otevřít DCF kalkulačka', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otevřít Investiční plánovač', exact: true })).toHaveCount(0);
  await page.getByLabel('Hledat kalkulačku').fill('neexistující');
  await expect(page.getByText('Žádná kalkulačka neodpovídá hledání.')).toBeVisible();
  await page.getByRole('button', { name: 'Přehled', exact: true }).click();
  await expect(page.getByTestId('calculators-workspace')).toHaveCount(0);
});

test('compound model responds to inputs, validates blanks and does not change account data', async ({ page }) => {
  await page.getByRole('button', { name: 'Kalkulačky', exact: true }).click();
  await page.getByRole('button', { name: 'Otevřít Složené úročení', exact: true }).click();
  await expect(page.getByTestId('metric-Konečná hodnota')).toContainText(/3\s*008\s*507/);
  await page.getByRole('textbox', { name: 'Roční výnos', exact: true }).fill('0');
  await expect(page.getByTestId('metric-Konečná hodnota')).toContainText(/1\s*300\s*000/);
  await page.getByRole('textbox', { name: 'Počáteční částka', exact: true }).fill('');
  await expect(page.getByRole('alert')).toContainText('Zkontroluj');
  await expect(page.getByTestId('metric-Konečná hodnota')).toHaveCount(0);
  await page.getByRole('button', { name: 'Použít majetek z přehledu účtů' }).click();
  await expect(page.getByRole('textbox', { name: 'Počáteční částka', exact: true })).toHaveValue('100000');
  await page.getByRole('textbox', { name: 'Počáteční částka', exact: true }).fill('999999');
  await page.getByRole('button', { name: 'Všechny kalkulačky', exact: true }).click();
  await page.getByRole('button', { name: 'Otevřít Složené úročení', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Počáteční částka', exact: true })).toHaveValue('999999');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('finance_bank_accounts') || '[]'));
  expect(stored[0].currentBalance).toBe(150000);
  expect(stored[0].excludedAmount).toBe(50000);
});

test('planner switches scenarios, parses Czech decimals and resets only its model', async ({ page }) => {
  await page.goto('/#/?testBypass=1&view=calculators&calculator=planner');
  const baseline = await page.getByTestId('metric-Konečná hodnota').innerText();
  await page.getByRole('button', { name: 'Optimistický', exact: true }).click();
  await expect(page.getByTestId('metric-Konečná hodnota')).not.toHaveText(baseline);
  await page.getByRole('textbox', { name: 'Inflace', exact: true }).fill('3,5');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Obnovit příklad', exact: true }).click();
  await expect(page.getByTestId('metric-Konečná hodnota')).toHaveText(baseline);
  await expect(page.getByRole('textbox', { name: 'Inflace', exact: true })).toHaveValue('2,5');
});

test('goal and FIRE handle zero return, already-met and unreachable targets', async ({ page }) => {
  await page.goto('/#/?testBypass=1&view=calculators&calculator=goal');
  await page.getByRole('textbox', { name: 'Roční výnos', exact: true }).fill('0');
  await page.getByRole('textbox', { name: 'Počáteční částka', exact: true }).fill('0');
  await page.getByRole('textbox', { name: 'Cílová částka', exact: true }).fill('120000');
  await expect(page.getByTestId('metric-Potřebný měsíční vklad')).toContainText(/1\s*000/);
  await page.goto('/#/?testBypass=1&view=calculators&calculator=fire');
  await expect(page.getByTestId('metric-FIRE cíl')).toContainText(/15\s*000\s*000/);
  await page.getByRole('textbox', { name: 'Počáteční částka', exact: true }).fill('0');
  await page.getByRole('textbox', { name: 'Měsíční vklad', exact: true }).fill('0');
  await expect(page.getByTestId('metric-Čas do cíle')).toHaveText('Nedosažen');
  await page.getByRole('textbox', { name: 'Počáteční částka', exact: true }).fill('15000000');
  await expect(page.getByTestId('metric-Čas do cíle')).toHaveText('Již dosažen');
});

test('DCF guards terminal growth, and P/E guards nonpositive EPS', async ({ page }) => {
  await page.goto('/#/?testBypass=1&view=calculators&calculator=dcf');
  await page.getByRole('textbox', { name: 'Terminální růst', exact: true }).fill('10');
  await expect(page.getByRole('alert')).toContainText('Diskontní sazba musí být vyšší');
  await page.getByRole('textbox', { name: 'Terminální růst', exact: true }).fill('2');
  await expect(page.getByRole('table', { name: 'Hodnota akcie podle diskontní sazby a terminálního růstu' })).toBeVisible();
  await page.goto('/#/?testBypass=1&view=calculators&calculator=pe');
  await expect(page.getByTestId('metric-Implikovaná cena')).toContainText('200');
  await page.getByRole('textbox', { name: 'Zisk na akcii (EPS)', exact: true }).fill('-1');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('mobile navigation keeps the calculator within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Otevřít navigaci' }).click();
  await page.getByRole('button', { name: 'Kalkulačky', exact: true }).click();
  await page.getByRole('button', { name: 'Otevřít DCF kalkulačka', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DCF kalkulačka', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('textbox', { name: 'FCFE na akcii', exact: true }).fill('12,5');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('light theme keeps calculator charts and inputs usable', async ({ page }) => {
  await page.getByRole('button', { name: 'Nastavení', exact: true }).click();
  await page.getByRole('button', { name: /^Světlá / }).click();
  await page.getByRole('button', { name: 'Zavřít', exact: true }).click();
  await page.getByRole('button', { name: 'Kalkulačky', exact: true }).click();
  await page.getByRole('button', { name: 'Otevřít Investiční plánovač', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.getByRole('region', { name: 'Růst majetku v čase' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Měsíční vklad', exact: true }).fill('20000');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('new menu item preserves older customized navigation order', async ({ page }) => {
  const oldOrder = ['goals', 'investments', 'overview', 'accounts', 'settings', 'monthWorkflow', 'analytics', 'recurring', 'transactionAreas'];
  await page.addInitScript(order => localStorage.setItem('finance_sidebar_order', JSON.stringify(order)), oldOrder);
  await page.reload();
  await expect(page.getByRole('navigation').getByRole('button')).toHaveText([
    'Cíle', 'Investice', 'Kalkulačky', 'Přehled', 'Účty', 'Nastavení', 'Měsíční workflow', 'Reporty a grafy', 'Trvalé příkazy', 'Oblasti transakcí',
  ]);
  await page.getByRole('button', { name: 'Kalkulačky', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kalkulačky', exact: true })).toBeVisible();
});
