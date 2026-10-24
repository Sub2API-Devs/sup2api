import test from 'node:test';
import assert from 'node:assert/strict';
import { getContainerResourcesForTest } from '../container-resources.js';

const root = '/sys/fs/cgroup';
const gib = 2 ** 30, mib = 2 ** 20;
function fixture() {
  const files = {
    '/proc/self/cgroup': '0::/',
    [root + '/cgroup.controllers']: 'cpu cpuset memory',
    [root + '/cpu.max']: '200000 100000',
    [root + '/cpuset.cpus']: '',
    [root + '/cpuset.cpus.effective']: '0-383',
    [root + '/memory.max']: String(2 * gib),
    [root + '/memory.current']: String(512 * mib),
  };
  const read = file => files[file];
  return { files, read, resources: () => getContainerResourcesForTest({ read }) };
}

test('reports allocated CPU and RAM instead of the shared host, without disk or load', () => {
  const f = fixture();
  assert.deepEqual(f.resources(), { cpus: 2, memory_gb: 2, free_mem_mb: 1536 });
});

test('allocation and usage changes are observed without a saved profile or restart', () => {
  const f = fixture();
  f.resources();
  f.files[root + '/cpu.max'] = '400000 100000';
  f.files[root + '/memory.max'] = String(4 * gib);
  f.files[root + '/memory.current'] = String(3 * gib);
  assert.deepEqual(f.resources(), { cpus: 4, memory_gb: 4, free_mem_mb: 1024 });
});

test('nested cgroups honor the tightest visible ancestor and memory headroom', () => {
  const f = fixture();
  f.files['/proc/self/cgroup'] = '0::/account/child/';
  f.files[root + '/account/child/cpu.max'] = '400000 100000';
  f.files[root + '/account/child/memory.max'] = String(4 * gib);
  f.files[root + '/account/child/memory.current'] = String(3 * gib);
  assert.deepEqual(f.resources(), { cpus: 2, memory_gb: 2, free_mem_mb: 1024 });
  delete f.files[root + '/account/child/memory.current'];
  assert.deepEqual(f.resources(), { cpus: 2, memory_gb: 2 });
});

test('cpuset restrictions bound CPU quota and unlimited host-sized sets are not advertised', () => {
  const f = fixture();
  f.files[root + '/cpu.max'] = '800000 100000';
  f.files[root + '/cpuset.cpus.effective'] = '2,5-6,6';
  assert.equal(f.resources().cpus, 3);
  f.files[root + '/cpu.max'] = 'max 100000';
  assert.equal(f.resources().cpus, undefined);
  f.files[root + '/cpuset.cpus'] = '2,5';
  assert.equal(f.resources().cpus, 2);
});

test('unknown, unlimited and malformed limits are omitted without a host fallback', () => {
  const f = fixture();
  f.files[root + '/cpu.max'] = 'max 100000';
  f.files[root + '/memory.max'] = 'max';
  assert.deepEqual(f.resources(), {});
  f.files[root + '/cpu.max'] = '200000 0';
  f.files[root + '/memory.max'] = '-1';
  assert.deepEqual(f.resources(), {});
  f.files[root + '/cpu.max'] = 'invalid';
  f.files[root + '/memory.max'] = '9007199254740993';
  assert.deepEqual(f.resources(), {});
  delete f.files[root + '/cgroup.controllers'];
  assert.deepEqual(f.resources(), {}, 'v1/unrecognized mounts must not expose host facts');
});

test('native integer-only inventory fields do not round fractional allocations', () => {
  const f = fixture();
  f.files[root + '/cpu.max'] = '150000 100000';
  f.files[root + '/memory.max'] = String(1.5 * gib);
  assert.deepEqual(f.resources(), { free_mem_mb: 1024 });
});

test('missing usage stays unknown and usage above a lowered limit clamps headroom to zero', () => {
  const f = fixture();
  delete f.files[root + '/memory.current'];
  assert.deepEqual(f.resources(), { cpus: 2, memory_gb: 2 });
  f.files[root + '/memory.current'] = String(3 * gib);
  assert.deepEqual(f.resources(), { cpus: 2, memory_gb: 2, free_mem_mb: 0 });
});

test('disabled reporting does not read and invalid membership cannot escape the cgroup mount', () => {
  assert.equal(getContainerResourcesForTest({ enabled: false, read: () => { throw Error('unexpected read'); } }), null);
  const f = fixture();
  for (const member of ['0::/../../other', '0::relative', '1:memory:/account', '']) {
    f.files['/proc/self/cgroup'] = member;
    assert.deepEqual(f.resources(), {});
  }
});

test('only a bounded account volume exposes actual disk headroom', () => {
  const f = fixture();
  let calls = 0;
  const disk = { limit: String(10 * gib), statfs: (mount, options) => {
    calls++;
    assert.equal(mount, '/work');
    assert.deepEqual(options, { bigint: true });
    return { blocks: 10n * 2n ** 18n, bsize: 4096n, bavail: 7n * 2n ** 18n };
  } };
  assert.equal(getContainerResourcesForTest({ read: f.read, disk }).disk_free_gb, 7);
  assert.equal(getContainerResourcesForTest({ read: f.read, disk: { ...disk, limit: undefined } }).disk_free_gb, undefined);
  assert.equal(calls, 1, 'unlimited legacy volumes must not read host filesystem sizes');
  assert.equal(getContainerResourcesForTest({ read: f.read, disk: {
    ...disk, statfs: () => ({ blocks: 1000n * 2n ** 18n, bsize: 4096n, bavail: 900n * 2n ** 18n }),
  } }).disk_free_gb, undefined);
  assert.equal(getContainerResourcesForTest({ read: f.read, disk: {
    ...disk, statfs: () => ({ blocks: 10n * 2n ** 18n, bsize: 4096n, bavail: 0n }),
  } }).disk_free_gb, 0);
  assert.equal(getContainerResourcesForTest({ read: f.read, disk: {
    ...disk, statfs: () => { throw Error('quota unavailable'); },
  } }).disk_free_gb, undefined);
});
