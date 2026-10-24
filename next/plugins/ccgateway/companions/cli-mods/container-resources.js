// Report the current container's cgroup v2 allocation, never host totals.
import fs from 'node:fs';
import { posix as path } from 'node:path';

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').trim(); }
  catch { return undefined; }
}

function integer(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : undefined;
}

function cpuCount(value) {
  if (!value) return undefined;
  const ranges = [];
  for (const part of value.split(',')) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) return undefined;
    const first = integer(match[1]), last = integer(match[2] ?? match[1]);
    if (first === undefined || last === undefined || last < first) return undefined;
    ranges.push([first, last]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let count = 0, end = -1;
  for (const [first, last] of ranges) {
    count += Math.max(0, last - Math.max(first, end + 1) + 1);
    end = Math.max(end, last);
  }
  return Number.isSafeInteger(count) && count > 0 ? count : undefined;
}

// getContainerResources reports the current container's allocation, or null
// when reporting is off. The readers are the process's own: a test chooses them
// through getContainerResourcesForTest instead of this signature.
export function getContainerResources() {
  if (process.env.CCG_REPORT_CONTAINER_RESOURCES !== '1') return null;
  return collect(readText, defaultDisk());
}

// getContainerResourcesForTest is the same read with its environment given.
export function getContainerResourcesForTest({ enabled = true, read = readText, disk = defaultDisk() } = {}) {
  return enabled ? collect(read, disk) : null;
}

const defaultDisk = () => ({ limit: process.env.CCG_ACCOUNT_DISK_QUOTA_BYTES, statfs: fs.statfsSync });

function collect(read, disk) {
  const result = {};
  const diskLimit = integer(disk.limit);
  if (diskLimit > 0 && diskLimit <= 1024 * 2 ** 30) {
    try {
      const stat = disk.statfs('/work', { bigint: true });
      const total = stat.blocks * stat.bsize, free = stat.bavail * stat.bsize;
      // Only a controller-verified bounded account volume may be reported.
      // A host-sized statfs view after a storage change is never a fallback.
      if (total > 0n && total <= BigInt(diskLimit) && free >= 0n && free <= total) {
        result.disk_free_gb = Number(free / (2n ** 30n));
      }
    } catch { /* Unknown quota/usage is omitted. */ }
  }
  const root = '/sys/fs/cgroup';
  // The managed runtime uses the conventional private cgroup v2 mount. Unknown
  // layouts, v1 and unlimited values are omitted, never replaced by node:os.
  if (read(root + '/cgroup.controllers') === undefined) return result;
  const membership = read('/proc/self/cgroup')?.split('\n').find(line => line.startsWith('0::'))?.slice(3);
  if (!membership?.startsWith('/') || membership.split('/').includes('..')) return result;
  let current = path.resolve(root, '.' + membership);
  if (current !== root && !current.startsWith(root + '/')) return result;
  let quota, cpuset, effectiveSet, memory, available;
  let usageComplete = true;
  const minimum = (before, value) => value === undefined ? before : before === undefined ? value : Math.min(before, value);
  for (;;) {
    const cpu = read(current + '/cpu.max')?.match(/^(\d+)\s+(\d+)$/);
    if (cpu) {
      const limit = integer(cpu[1]), period = integer(cpu[2]);
      if (limit > 0 && period > 0) quota = minimum(quota, limit / period);
    }
    cpuset = minimum(cpuset, cpuCount(read(current + '/cpuset.cpus')));
    effectiveSet = minimum(effectiveSet, cpuCount(read(current + '/cpuset.cpus.effective')));
    const limit = integer(read(current + '/memory.max'));
    if (limit !== undefined && limit > 0) {
      memory = minimum(memory, limit);
      const used = integer(read(current + '/memory.current'));
      if (used !== undefined) available = minimum(available, Math.max(0, limit - used));
      else usageComplete = false;
    }
    if (current === root) break;
    current = path.dirname(current);
  }
  let cpus = minimum(quota, cpuset);
  if (cpus !== undefined) cpus = minimum(cpus, effectiveSet);
  // CC's native inventory schema only accepts integral cores and GiB. Do not
  // round a fractional allocation into a different advertised allocation.
  if (Number.isInteger(cpus) && cpus > 0 && cpus <= 1e6) result.cpus = cpus;
  const gib = memory === undefined ? undefined : memory / 2 ** 30;
  if (Number.isInteger(gib) && gib > 0 && gib <= 1e6) result.memory_gb = gib;
  if (usageComplete && available !== undefined && memory !== undefined) {
    result.free_mem_mb = Math.floor(Math.min(available, memory) / 2 ** 20);
  }
  // Host loadavg cannot describe this account and is never read here.
  return result;
}
