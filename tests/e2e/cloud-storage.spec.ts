import { expect, test, type Page } from '@playwright/test';

const USER = '11111111-1111-4111-8111-111111111111';
const account = (excludedAmount = 0) => [{ id: 'cloud-bank', name: 'Testovací účet', institutionId: 'kb', currency: 'CZK', initialBalance: 100000, currentBalance: 100000, excludedAmount, isSavings: false, interestRate: 0 }];

async function mockCloud(page: Page) {
  const rows = new Map<string, { user_id: string; storage_key: string; storage_value: string; updated_at: string }>();
  let version = 0;
  const server = { offline: false, writes: 0, rows,
    set(key: string, value: unknown) {
      rows.set(key, { user_id: USER, storage_key: key, storage_value: typeof value === 'string' ? value : JSON.stringify(value), updated_at: new Date(Date.UTC(2026, 7, 27, 10, 0, 0, ++version)).toISOString() });
    } };
  server.set('finance_bank_accounts', account());
  await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/rest/v1/user_app_state*', async route => {
    if (server.offline) { await route.abort('internetdisconnected'); return; }
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'GET') {
      const keys = (url.searchParams.get('storage_key') ?? '').replace(/^in\.\(|\)$/g, '').split(',');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(keys.map(k => rows.get(k.replaceAll('"', ''))).filter(Boolean)) });
      return;
    }
    const body = request.postDataJSON();
    const key = method === 'POST' ? body.storage_key : url.searchParams.get('storage_key')!.slice(3);
    const existing = rows.get(key);
    if (method === 'POST' && existing) {
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: '23505', message: 'duplicate' }) });
      return;
    }
    if (method === 'PATCH' && existing?.updated_at !== url.searchParams.get('updated_at')?.slice(3)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    expect(method === 'POST' ? body.user_id : url.searchParams.get('user_id')?.slice(3)).toBe(USER);
    server.writes++;
    server.set(key, body.storage_value);
    await route.fulfill({ status: method === 'POST' ? 201 : 200, contentType: 'application/json', body: JSON.stringify([rows.get(key)]) });
  });
  // Synthetic, unsigned test session. All auth/database requests stay inside the route mocks.
  await page.addInitScript(({ userId }) => {
    const encode = (value: unknown) => btoa(JSON.stringify(value)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', exp: expiresAt })}.test-signature`;
    localStorage.setItem('sb-cbedhmgethohrtxinsod-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt,
      user: { id: userId, aud: 'authenticated', email: 'fixture@example.invalid', app_metadata: { provider: 'email' }, user_metadata: { username: 'Test' }, created_at: '2026-01-01T00:00:00Z' } }));
  }, { userId: USER });
  return server;
}

test('failed cloud hydration blocks empty autosave, then recovers on retry', async ({ page }) => {
  const cloud = await mockCloud(page); cloud.offline = true;
  await page.goto('/');
  await expect(page.getByText(/úplná kopie tohoto účtu/)).toBeVisible();
  expect(cloud.writes).toBe(0);
  expect(JSON.parse(cloud.rows.get('finance_bank_accounts')!.storage_value)).toHaveLength(1);
  cloud.offline = false;
  await page.getByRole('button', { name: 'Zkusit načtení znovu' }).click();
  await expect(page.getByTestId('app-header')).toBeVisible();
  await expect(page.getByText('Testovací účet', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cloud uložen', exact: true })).toBeVisible();
});

test('offline edits survive reload and an external edit opens a recoverable conflict', async ({ page }) => {
  const cloud = await mockCloud(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Cloud uložen', exact: true })).toBeVisible();
  cloud.offline = true;
  await page.getByRole('navigation').getByRole('button', { name: 'Účty', exact: true }).click();
  await page.getByRole('button', { name: 'Upravit Testovací účet' }).click();
  await page.getByLabel('Cizí prostředky').fill('50000');
  await page.getByRole('button', { name: 'Uložit Testovací účet' }).click();
  await page.getByRole('button', { name: 'Hotovo' }).click();
  await expect(page.getByText(/V zařízení čeká/)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('app-header')).toBeVisible();
  await expect(page.getByText(/Mimo vlastní majetek:.*50[\s\u00a0]?000.*Kč/)).toBeVisible();
  cloud.set('finance_bank_accounts', account(20000)); cloud.offline = false;
  await page.getByRole('button', { name: 'Podrobnosti uložení', exact: true }).click();
  await page.getByRole('button', { name: 'Zkusit synchronizaci', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bankovní účty', exact: true })).toBeVisible();
  expect(JSON.parse(cloud.rows.get('finance_bank_accounts')!.storage_value)[0].excludedAmount).toBe(20000);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Použít tuto lokální kopii', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cloud uložen', exact: true })).toBeVisible();
  expect(JSON.parse(cloud.rows.get('finance_bank_accounts')!.storage_value)[0].excludedAmount).toBe(50000);
  const recovery = await page.evaluate(userId => JSON.parse(localStorage.getItem(`cloud-user:${userId}:__figr_sync_journal_v2`)!).recoveries, USER);
  expect(recovery.some((copy: { key: string }) => copy.key === 'finance_bank_accounts')).toBe(true);
});
