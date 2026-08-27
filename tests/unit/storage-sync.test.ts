import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageSyncEngine, parseJournal, type RemoteEntry, type SyncDependencies, type SyncReport } from '../../src/lib/storageSyncEngine.ts';

function fixture() {
  let disk: string | null = null;
  let online = true;
  let active = true;
  let version = 1;
  let state: SyncReport;
  let writes = 0;
  const cloud: Record<string, RemoteEntry> = { data: { value: '[1]', updatedAt: 'v1' } };
  const dependencies: SyncDependencies = {
    active: () => active,
    readLocal: async () => disk,
    writeLocal: async value => { disk = value; },
    lock: async operation => operation(),
    report: value => { state = value; },
    readRemote: async keys => {
      if (!online) throw Error('Offline');
      return structuredClone(Object.fromEntries(keys.map(k => [k, cloud[k] ?? { value: null, updatedAt: null }])));
    },
    writeRemote: async (key, value, expected) => {
      if (!online) throw Error('Offline');
      if ((cloud[key]?.updatedAt ?? null) !== expected.updatedAt) return null;
      writes++;
      cloud[key] = { value, updatedAt: `v${++version}` };
      return structuredClone(cloud[key]);
    },
  };
  return { dependencies, cloud, create: () => createStorageSyncEngine(dependencies),
    journal: () => parseJournal(disk), state: () => state, writes: () => writes,
    offline: () => { online = false; }, online: () => { online = true; },
    deactivate: () => { active = false; }, corrupt: () => { disk = '{broken'; } };
}

test('local journal is durable before network; restart flushes every pending key', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data', 'other']); await engine.flush(); f.offline();
  await engine.setMany({ data: '[1,2]', other: '[3]' });
  assert.equal(f.journal().entries.data.value, '[1,2]');
  assert.equal(f.journal().entries.other.pending, true);
  await engine.flush(); f.online();
  const restarted = f.create(); await restarted.getMany(['data']); await restarted.flush();
  assert.equal(f.cloud.other.value, '[3]');
  assert.equal(f.cloud.data.value, '[1,2]');
  assert.equal(f.state().pendingWrites, 0);
});

test('a failed first read never returns empty defaults and cannot be saved', async () => {
  const f = fixture(); f.offline(); const engine = f.create();
  await assert.rejects(engine.getMany(['data']), /úplná kopie/);
  await assert.rejects(engine.setMany({ data: '[]' }), /nejprve načtena/);
  assert.equal(f.cloud.data.value, '[1]');
});

test('offline with complete account cache remains readable', async () => {
  const f = fixture(); const first = f.create();
  await first.getMany(['data', 'absent']); await first.flush(); f.offline();
  const restarted = f.create();
  assert.deepEqual(await restarted.getMany(['data', 'absent']), { data: '[1]', absent: null });
  await restarted.flush();
});

test('two devices create a conflict without overwriting either copy', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush(); f.offline();
  await engine.setMany({ data: '[1,2]' }); await engine.flush();
  f.cloud.data = { value: '[1,3]', updatedAt: 'other-device' }; f.online();
  assert.equal(await engine.flush(), false);
  assert.equal(f.journal().entries.data.value, '[1,2]');
  assert.equal(f.journal().entries.data.conflict?.value, '[1,3]');
  assert.equal(f.cloud.data.value, '[1,3]');
  assert.equal(f.state().phase, 'conflict');
});

test('choosing cloud archives both copies before accepting it', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush(); f.offline();
  await engine.setMany({ data: '[2]' }); await engine.flush();
  f.cloud.data = { value: '[3]', updatedAt: 'v3' }; f.online(); await engine.flush();
  await engine.resolveConflict('data', 'cloud', f.cloud.data);
  assert.equal(f.journal().entries.data.value, '[3]');
  assert.equal(f.journal().recoveries[0].local, '[2]');
  assert.equal(f.journal().recoveries[0].cloud.value, '[3]');
});

test('changed cloud invalidates a previously displayed conflict choice', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush(); f.offline();
  await engine.setMany({ data: '[2]' }); await engine.flush();
  const displayed = { value: '[3]', updatedAt: 'v3' };
  f.cloud.data = displayed; f.online(); await engine.flush();
  f.cloud.data = { value: '[4]', updatedAt: 'v4' };
  await assert.rejects(engine.resolveConflict('data', 'local', displayed), /mezitím změnil/);
  assert.equal(f.cloud.data.value, '[4]');
});

test('compare-and-swap catches a change between reading and writing', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  f.dependencies.writeRemote = async () => { f.cloud.data = { value: '[99]', updatedAt: 'raced' }; return null; };
  await engine.setMany({ data: '[2]' }); await engine.flush();
  assert.equal(f.cloud.data.value, '[99]');
  assert.equal(f.journal().entries.data.conflict?.value, '[99]');
});

test('delayed acknowledgement does not discard the next local change', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  const original = f.dependencies.writeRemote;
  let release: () => void = () => {};
  let started: () => void = () => {};
  const began = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  let once = true;
  f.dependencies.writeRemote = async (...args) => {
    if (once) { once = false; started(); await gate; }
    return original(...args);
  };
  await engine.setMany({ data: '[2]' }); await began;
  await engine.setMany({ data: '[3]' });
  assert.equal(f.journal().entries.data.value, '[3]');
  release(); await engine.flush();
  assert.equal(f.cloud.data.value, '[3]');
  assert.equal(f.journal().entries.data.pending, false);
});

test('clearing an array is a real edit, not missing data', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  await engine.setMany({ data: '[]' }); await engine.flush();
  assert.equal(f.cloud.data.value, '[]');
});

test('auth switch prevents writes from the previous account', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush(); f.deactivate();
  await assert.rejects(engine.setMany({ data: '[2]' }), /Účet se změnil/);
  assert.equal(await engine.flush(), false); assert.equal(f.writes(), 0);
});

test('a corrupt journal fails closed and is never replaced with defaults', async () => {
  const f = fixture(); f.corrupt(); const engine = f.create();
  await assert.rejects(engine.getMany(['data']));
  await assert.rejects(engine.setMany({ data: '[]' }));
  assert.throws(f.journal); assert.equal(f.writes(), 0);
});

test('legacy owned cache and restored snapshot preserve differing cloud data', async () => {
  const f = fixture();
  f.dependencies.readLegacy = async () => ({ data: '[restored]' });
  const engine = f.create();
  assert.equal((await engine.getMany(['data'])).data, '[restored]'); await engine.flush();
  assert.equal(f.journal().entries.data.conflict?.value, '[1]');
  assert.equal(f.writes(), 0);
});

test('quota failure does not send an edit that is not saved locally', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  f.dependencies.writeLocal = async () => { throw Error('Quota exceeded'); };
  await assert.rejects(engine.setMany({ data: '[2]' }), /Quota/);
  assert.equal(f.cloud.data.value, '[1]'); assert.equal(f.writes(), 0);
});

test('a stale second tab cannot silently overwrite a more recent local copy', async () => {
  const f = fixture(); const first = f.create(); const second = f.create();
  await first.getMany(['data']); await first.flush();
  await second.getMany(['data']); await second.flush();
  await first.setMany({ data: '[2]' }); await first.flush();
  await second.setMany({ data: '[3]' }); await second.flush();
  assert.equal(f.cloud.data.value, '[2]');
  assert.equal(f.journal().entries.data.value, '[3]');
  assert.equal(f.journal().entries.data.conflict?.value, '[2]');
  assert.equal(f.journal().recoveries[0].local, '[2]');
});

test('choosing local uses a conditional write and retains the other cloud copy', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush(); f.offline();
  await engine.setMany({ data: '[2]' }); await engine.flush();
  f.cloud.data = { value: '[3]', updatedAt: 'v3' }; f.online(); await engine.flush();
  await engine.resolveConflict('data', 'local', f.cloud.data);
  assert.equal(f.cloud.data.value, '[2]');
  assert.equal(f.journal().recoveries[0].cloud.value, '[3]');
});

test('failed disk writes stay exportable in memory and retry when storage is available', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  const write = f.dependencies.writeLocal;
  f.dependencies.writeLocal = async () => { throw Error('Disk full'); };
  await assert.rejects(engine.setMany({ data: '[2]' }));
  assert.equal((await engine.exportRecovery()).unpersistedEntries.data, '[2]');
  await engine.flush(); assert.equal(f.state().phase, 'error');
  f.dependencies.writeLocal = write;
  await engine.flush();
  assert.equal(f.cloud.data.value, '[2]');
  assert.deepEqual((await engine.exportRecovery()).unpersistedEntries, {});
});

test('a vanished cloud row never silently erases a previously known local dataset', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  delete f.cloud.data;
  assert.equal((await engine.getMany(['data'])).data, '[1]'); await engine.flush();
  assert.equal(f.journal().entries.data.conflict?.value, null);
  assert.equal(f.cloud.data, undefined);
  assert.equal(f.journal().recoveries[0].local, '[1]');
});

test('a legitimate incoming cloud update keeps the previous cache in recovery history', async () => {
  const f = fixture(); const engine = f.create();
  await engine.getMany(['data']); await engine.flush();
  f.cloud.data = { value: '[2]', updatedAt: 'other-device' };
  assert.equal((await engine.getMany(['data'])).data, '[2]'); await engine.flush();
  assert.equal(f.journal().recoveries[0].local, '[1]');
});
