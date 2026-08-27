import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Catch changed input files / damaged offsets before an executable is handed off.
export function verifyDesktopPackage(executable, project) {
  const archive = path.join(path.dirname(executable), 'resources', 'app.asar');
  let checkedFiles = 0;
  for (const listed of asar.listPackage(archive)) {
    const name = listed.replace(/^[\\/]+/, '');
    const entry = asar.statFile(archive, name, false);
    if (entry.files || entry.link) continue;
    const bytes = asar.extractFile(archive, name);
    assert.equal(bytes.length, entry.size, `Invalid packaged size: ${name}`);
    if (entry.integrity) {
      assert.equal(entry.integrity.algorithm, 'SHA256');
      assert.equal(hash(bytes), entry.integrity.hash, `Damaged packaged file: ${name}`);
    }
    assert.ok(!/(^|[\\/])\.env(?:[.\\/]|$)/.test(name), 'Environment file must not be packaged');
    checkedFiles++;
  }
  const metadata = JSON.parse(asar.extractFile(archive, 'package.json').toString('utf8'));
  assert.equal(metadata.main, 'electron/main.cjs');
  assert.equal(metadata.version, JSON.parse(readFileSync(path.join(project, 'package.json'), 'utf8')).version);
  const verifyTree = relative => {
    for (const entry of readdirSync(path.join(project, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) verifyTree(name);
      else if (entry.isFile() && !name.endsWith('.map')) {
        assert.equal(hash(asar.extractFile(archive, name)), hash(readFileSync(path.join(project, name))), `Rebuild required: ${name} changed`);
      }
    }
  };
  verifyTree('electron');
  verifyTree('dist');
  return { checkedFiles, integrity: 'passed', sourceMatch: 'passed' };
}
