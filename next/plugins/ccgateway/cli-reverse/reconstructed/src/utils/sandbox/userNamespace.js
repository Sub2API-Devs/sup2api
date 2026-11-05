/**
 * utils/sandbox/userNamespace.ts
 *
 * 2.1.316 新增：沙箱用户命名空间（Linux）探测与配置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-715mxt6r.js (16)
 * attribution: placement 16
 */
import { readFile } from "fs/promises";
import { processIdentity } from "../pidSpace.js";
import { getFsImplementation } from "../fsOperations.js";
import { UNMAPPED_NAMESPACE_REFUSAL } from "../../services/daemon/paths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-715mxt6r.js:872-1037 placement
/**
 * 默认溢出 uid（65534），以及沙箱中不应视为个人目录的系统共享目录集合。
 */
var OVERFLOW_UID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SHARED_SYSTEM_DIRS;
deferInit("chunk-715mxt6r.js:872", () => {
  OVERFLOW_UID = 65534;
  SHARED_SYSTEM_DIRS = new Set([
    "/",
    "/dev",
    "/dev/shm",
    "/run",
    "/run/user",
    "/tmp",
    "/var",
    "/var/tmp",
    "/var/run",
    "/home",
    "/var/home",
    "/root",
    "/var/roothome",
    "/mnt",
    "/mnt/wslg",
  ]);
});
//@ chunk-715mxt6r.js:1037-1061 placement
/**
 * sharedSystemDirs：共享的系统目录集合。
 */
function sharedSystemDirs() {
  return SHARED_SYSTEM_DIRS;
}
//@ chunk-715mxt6r.js:1061-1145 placement
async function readUidMap() {
  try {
    return parseUidMap(await readFile("/proc/self/uid_map", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-715mxt6r.js:1145-1463 placement
/**
 * 解析 /proc/self/uid_map 内容为映射区间列表（内部起点、宿主起点、数量），任一行格式不合法时返回 undefined。
 */
function parseUidMap(text) {
  let ranges = [];
  for (let line of text.split(`
`)) {
    if (line.trim() === "") continue;
    let parts = line.trim().split(/\s+/);
    let innerStart = Number(parts[0]);
    let hostStart = Number(parts[1]);
    let count = Number(parts[2]);
    if (
      parts.length !== 3 ||
      !Number.isSafeInteger(innerStart) ||
      innerStart < 0 ||
      !Number.isSafeInteger(hostStart) ||
      hostStart < 0 ||
      !Number.isSafeInteger(count) ||
      count <= 0
    )
      return;
    ranges.push({
      innerStart,
      hostStart,
      count,
    });
  }
  return ranges;
}
//@ chunk-715mxt6r.js:1463-1542 placement
function isIdentityUidMap(uidMap) {
  return uidMap.length === 1 && uidMap[0].innerStart === 0 && uidMap[0].count >= 4294967295;
}
//@ chunk-715mxt6r.js:1542-1636 placement
async function readOverflowUid() {
  try {
    return parseOverflowUid(await readFile("/proc/sys/kernel/overflowuid", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-715mxt6r.js:1636-1748 placement
function parseOverflowUid(text) {
  let trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return;
  let uid = Number(trimmed);
  return Number.isSafeInteger(uid) ? uid : undefined;
}
//@ chunk-715mxt6r.js:1748-1868 placement
function getUnmappedOwnerUid(ranges, overflowUid) {
  if (ranges.length === 0 || overflowUid === undefined) return;
  return ranges.some(
    (range) => overflowUid >= range.innerStart && overflowUid < range.innerStart + range.count,
  )
    ? undefined
    : overflowUid;
}
//@ chunk-715mxt6r.js:1868-2074 placement
/**
 * 检查当前进程的用户命名空间 uid 映射：返回所有者 uid 是否未映射、uid 是否折叠为溢出 uid、root 是否有歧义；不在命名空间中时返回 undefined。
 */
async function inspectUserNamespace() {
  let uid = process.getuid?.();
  let uidMap = await readUidMap();
  if (uidMap === undefined) {
    let overflowUid = (await readOverflowUid()) ?? OVERFLOW_UID;
    return uid === overflowUid
      ? {
          unmappedOwnerUid: undefined,
          uidCollapses: true,
          rootUidAmbiguous: overflowUid === 0,
        }
      : undefined;
  }
  if (isIdentityUidMap(uidMap)) return;
  return describeUidMapping(uidMap, uid);
}
//@ chunk-715mxt6r.js:2074-2219 placement
async function describeUidMapping(ranges, uid) {
  let overflowUid = await readOverflowUid();
  let effectiveOverflowUid = overflowUid ?? OVERFLOW_UID;
  return {
    unmappedOwnerUid: getUnmappedOwnerUid(ranges, overflowUid),
    uidCollapses: ranges.length === 0 || (uid !== undefined && uid === effectiveOverflowUid),
    rootUidAmbiguous: overflowUid === 0,
  };
}
//@ chunk-715mxt6r.js:2219-2577 placement
/**
 * 把当前进程 uid 换算为宿主机 uid：不在用户命名空间时原样返回；映射为空或折叠为溢出 uid 时返回 undefined；否则按映射区间换算。
 */
async function getHostUid() {
  let uid = process.getuid?.();
  if (uid === undefined) return;
  let uidMap = await readUidMap();
  if (uidMap === undefined) return;
  if (isIdentityUidMap(uidMap)) return uid;
  let overflowUid = (await readOverflowUid()) ?? OVERFLOW_UID;
  if (uidMap.length === 0 || uid === overflowUid) return;
  if (
    ((candidate) =>
      uidMap.some((range) => candidate >= range.innerStart && candidate < range.innerStart + range.count))(
      overflowUid,
    )
  )
    return uid;
  let found = uidMap.find((range) => uid >= range.innerStart && uid < range.innerStart + range.count);
  return found === undefined ? undefined : found.hostStart + (uid - found.innerStart);
}
//@ chunk-715mxt6r.js:2577-2643 placement
/**
 * uidsCollapse：当前 uid 是否折叠为溢出 uid。
 */
function uidsCollapse() {
  processIdentity.uidsCollapse ??= isUidCollapsedSync(getFsImplementation());
  return processIdentity.uidsCollapse;
}
//@ chunk-715mxt6r.js:2643-2968 placement
/**
 * 同步判断当前 uid 是否折叠为溢出 uid（用户命名空间中没有映射或映射为空）。
 */
function isUidCollapsedSync(fsImplementation) {
  let uid = process.getuid?.();
  let ranges;
  try {
    let text = fsImplementation.readFileSync("/proc/self/uid_map", {
      encoding: "utf8",
    });
    ranges = parseUidMap(text);
  } catch {
    ranges = undefined;
  }
  let overflow;
  try {
    let text = fsImplementation.readFileSync("/proc/sys/kernel/overflowuid", {
      encoding: "utf8",
    });
    overflow = parseOverflowUid(text);
  } catch {
    overflow = undefined;
  }
  let overflowUid = overflow ?? OVERFLOW_UID;
  if (ranges === undefined) return uid === overflowUid;
  if (isIdentityUidMap(ranges)) return false;
  return ranges.length === 0 || (uid !== undefined && uid === overflowUid);
}
//@ chunk-715mxt6r.js:5027-5047 placement
var ENOTOWNED = "ENOTOWNED";
//@ chunk-715mxt6r.js:5482-5547 placement
/**
 * assertMappedNamespace：未映射命名空间时抛错。
 */
function assertMappedNamespace() {
  if (uidsCollapse())
    throw Object.assign(Error(UNMAPPED_NAMESPACE_REFUSAL), {
      code: ENOTOWNED,
    });
}
//@ chunk-715mxt6r.js:6334-6406 placement
/**
 * isDaemonSocketGoneError：daemon 套接字已消失的错误。
 */
function isDaemonSocketGoneError(code) {
  return code === "ENOENT" || code === "ECONNREFUSED" || code === "ENOTSOCK";
}
export {
  assertMappedNamespace,
  ENOTOWNED,
  isDaemonSocketGoneError,
  getHostUid,
  inspectUserNamespace,
  sharedSystemDirs,
  uidsCollapse,
};
