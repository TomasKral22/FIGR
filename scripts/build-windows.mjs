import { mkdtempSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { verifyDesktopPackage } from './verify-desktop.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const prepackagedArg = process.argv.find(argument => argument.startsWith('--prepackaged='));
const prepackaged = prepackagedArg?.slice('--prepackaged='.length);
if (prepackaged && !path.isAbsolute(prepackaged)) throw new Error('Prepackaged directory must be absolute.');
if (prepackaged) verifyDesktopPackage(path.join(prepackaged, 'FIGR.exe'), project);
// OneDrive can lock directories during electron-builder's extraction rename.
// Build in a new isolated temp directory; never delete or rename an existing release.
const staging = mkdtempSync(path.join(tmpdir(), 'figr-windows-build-'));
console.log(`Staging Windows release: ${staging}`);
const child = spawn(process.execPath, [require.resolve('electron-builder/cli.js'), '--win', 'nsis', 'portable', '--x64', '--publish', 'never', `--config.directories.output=${staging}`, ...(prepackaged ? [`--prepackaged=${prepackaged}`] : [])], {
  cwd: project, stdio: 'inherit', windowsHide: true,
});
const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
if (code !== 0) process.exit(typeof code === 'number' ? code : 1);
const unpackedExecutable = path.join(prepackaged || path.join(staging, 'win-unpacked'), 'FIGR.exe');
verifyDesktopPackage(unpackedExecutable, project);

const artifactNames = readdirSync(staging).filter(name => /^FIGR-(Setup|Portable)-[^/\\]+\.exe$/.test(name));
if (artifactNames.length !== 2) throw new Error('Expected installer and portable executable.');
const release = path.join(project, 'release', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(release, { recursive: true });
const artifacts = artifactNames.map(name => {
  const source = path.join(staging, name);
  if (!lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) throw new Error('Unexpected artifact type.');
  const target = path.join(release, name);
  copyFileSync(source, target);
  return target;
});
writeFileSync(path.join(project, 'release', 'latest-build.json'), JSON.stringify({
  builtAt: new Date().toISOString(), artifacts, staging,
  unpackedExecutable,
}, null, 2));
console.log('Windows release ready:\n' + artifacts.join('\n'));
