import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDesktopPackage } from './verify-desktop.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executableArg = process.argv.find(argument => argument.startsWith('--executable='));
const build = executableArg
  ? { unpackedExecutable: executableArg.slice('--executable='.length), artifacts: [] }
  : JSON.parse(readFileSync(path.join(root, 'release', 'latest-build.json'), 'utf8'));
const packageCheck = verifyDesktopPackage(build.unpackedExecutable, root);
const profile = mkdtempSync(path.join(tmpdir(), 'figr-desktop-smoke-'));
const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:1' };
delete env.ELECTRON_RUN_AS_NODE;
const application = await electron.launch({ executablePath: build.unpackedExecutable,
  args: [`--figr-profile-dir=${profile}`, '--figr-background'], env, timeout: 30000 });
try {
  const metadata = await application.evaluate(({ app }) => ({ packaged: app.isPackaged, version: app.getVersion(), profile: app.getPath('userData') }));
  assert.equal(metadata.packaged, true);
  assert.equal(metadata.profile, profile);
  const window = await application.firstWindow();
  const errors = [];
  window.on('pageerror', error => errors.push(error.message));
  await window.getByRole('button', { name: 'Přihlásit se', exact: true }).waitFor({ timeout: 20000 });
  assert.ok(window.url().startsWith('file:'));
  assert.equal(await window.evaluate(() => typeof process), 'undefined');
  await window.evaluate(() => window.desktopApp.storage.setMany({ smoke_test: 'persistent-sqlite-ok' }));
  const backup = await window.evaluate(() => window.desktopApp.backup.create());
  assert.ok(backup.fullPath.startsWith(profile + path.sep));
  assert.ok(existsSync(backup.fullPath));
  await window.goto(window.url().split('#')[0] + '#/?testBypass=1');
  await window.reload();
  await window.getByRole('button', { name: 'Přihlásit se', exact: true }).waitFor();
  assert.equal(await window.getByTestId('app-header').count(), 0);
  const stored = await window.evaluate(() => window.desktopApp.storage.getMany(['smoke_test']));
  assert.equal(stored.smoke_test, 'persistent-sqlite-ok');
  assert.deepEqual(errors, []);
  const result = { ...metadata, ...packageCheck, artifacts: build.artifacts, sqlite: 'passed', backup: 'passed', rendererIsolation: 'passed', productionAuth: 'passed', rendererErrors: errors, testedAt: new Date().toISOString() };
  writeFileSync(path.join(root, 'release', executableArg ? 'desktop-smoke-preview-result.json' : 'desktop-smoke-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await application.close(); }
