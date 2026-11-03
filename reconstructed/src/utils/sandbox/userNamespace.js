/**
 * utils/sandbox/userNamespace.ts
 *
 * 2.1.316 新增：沙箱用户命名空间（Linux）探测与配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nt75hmzb.js (47)
 * attribution: placement 47
 */
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { createHash } from "crypto";
import { processIdentity } from "../pidSpace.js";
import { getFsImplementation } from "../fsOperations.js";
import { getClaudeConfigDir } from "../envUtils.js";
import {
  getDaemonPipeKey,
  UNMAPPED_NAMESPACE_REFUSAL,
  getDaemonRuntimeDir,
} from "../../services/daemon/paths.js";
import { getPlatform } from "../platform.js";

//@ chunk-nt75hmzb.js:872-1037 placement
/**
 * 默认溢出 uid（65534），以及沙箱中不应视为个人目录的系统共享目录集合。
 */
var OVERFLOW_UID = 65534;
var SHARED_SYSTEM_DIRS = new Set([
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
//@ chunk-nt75hmzb.js:1037-1061 placement
/**
 * sharedSystemDirs：共享的系统目录集合。
 */
function sharedSystemDirs() {
  return SHARED_SYSTEM_DIRS;
}
//@ chunk-nt75hmzb.js:1061-1145 placement
async function readUidMap() {
  try {
    return parseUidMap(await readFile("/proc/self/uid_map", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-nt75hmzb.js:1145-1463 placement
/**
 * 解析 /proc/self/uid_map 内容为映射区间列表（内部起点、宿主起点、数量），任一行格式不合法时返回 undefined。
 */
function parseUidMap(e) {
  let n = [];
  for (let line of e.split(`
`)) {
    if (line.trim() === "") continue;
    let parts = line.trim().split(/\s+/);
    let s = Number(parts[0]);
    let u = Number(parts[1]);
    let a = Number(parts[2]);
    if (
      parts.length !== 3 ||
      !Number.isSafeInteger(s) ||
      s < 0 ||
      !Number.isSafeInteger(u) ||
      u < 0 ||
      !Number.isSafeInteger(a) ||
      a <= 0
    )
      return;
    n.push({
      innerStart: s,
      hostStart: u,
      count: a,
    });
  }
  return n;
}
//@ chunk-nt75hmzb.js:1463-1542 placement
function isIdentityUidMap(uidMap) {
  return uidMap.length === 1 && uidMap[0].innerStart === 0 && uidMap[0].count >= 4294967295;
}
//@ chunk-nt75hmzb.js:1542-1636 placement
async function readOverflowUid() {
  try {
    return parseOverflowUid(await readFile("/proc/sys/kernel/overflowuid", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-nt75hmzb.js:1636-1748 placement
function parseOverflowUid(e) {
  let trimmed = e.trim();
  if (!/^\d+$/.test(trimmed)) return;
  let t = Number(trimmed);
  return Number.isSafeInteger(t) ? t : undefined;
}
//@ chunk-nt75hmzb.js:1748-1868 placement
function getUnmappedOwnerUid(e, overflowUid) {
  if (e.length === 0 || overflowUid === undefined) return;
  return e.some((r) => overflowUid >= r.innerStart && overflowUid < r.innerStart + r.count)
    ? undefined
    : overflowUid;
}
//@ chunk-nt75hmzb.js:1868-2074 placement
/**
 * 检查当前进程的用户命名空间 uid 映射：返回所有者 uid 是否未映射、uid 是否折叠为溢出 uid、root 是否有歧义；不在命名空间中时返回 undefined。
 */
async function inspectUserNamespace() {
  let e = process.getuid?.();
  let uidMap = await readUidMap();
  if (uidMap === undefined) {
    let t = (await readOverflowUid()) ?? OVERFLOW_UID;
    return e === t
      ? {
          unmappedOwnerUid: undefined,
          uidCollapses: true,
          rootUidAmbiguous: t === 0,
        }
      : undefined;
  }
  if (isIdentityUidMap(uidMap)) return;
  return describeUidMapping(uidMap, e);
}
//@ chunk-nt75hmzb.js:2074-2219 placement
async function describeUidMapping(uidMap, n) {
  let overflowUid = await readOverflowUid();
  let r = overflowUid ?? OVERFLOW_UID;
  return {
    unmappedOwnerUid: getUnmappedOwnerUid(uidMap, overflowUid),
    uidCollapses: uidMap.length === 0 || (n !== undefined && n === r),
    rootUidAmbiguous: overflowUid === 0,
  };
}
//@ chunk-nt75hmzb.js:2219-2577 placement
/**
 * 把当前进程 uid 换算为宿主机 uid：不在用户命名空间时原样返回；映射为空或折叠为溢出 uid 时返回 undefined；否则按映射区间换算。
 */
async function getHostUid() {
  let e = process.getuid?.();
  if (e === undefined) return;
  let uidMap = await readUidMap();
  if (uidMap === undefined) return;
  if (isIdentityUidMap(uidMap)) return e;
  let t = (await readOverflowUid()) ?? OVERFLOW_UID;
  if (uidMap.length === 0 || e === t) return;
  if (((u) => uidMap.some((a) => u >= a.innerStart && u < a.innerStart + a.count))(t)) return e;
  let found = uidMap.find((u) => e >= u.innerStart && e < u.innerStart + u.count);
  return found === undefined ? undefined : found.hostStart + (e - found.innerStart);
}
//@ chunk-nt75hmzb.js:2577-2643 placement
/**
 * uidsCollapse：当前 uid 是否折叠为溢出 uid。
 */
function uidsCollapse() {
  processIdentity.uidsCollapse ??= isUidCollapsedSync(getFsImplementation());
  return processIdentity.uidsCollapse;
}
//@ chunk-nt75hmzb.js:2643-2968 placement
/**
 * 同步判断当前 uid 是否折叠为溢出 uid（用户命名空间中没有映射或映射为空）。
 */
function isUidCollapsedSync(fsImplementation) {
  let n = process.getuid?.();
  let t;
  try {
    let content = fsImplementation.readFileSync("/proc/self/uid_map", {
      encoding: "utf8",
    });
    t = parseUidMap(content);
  } catch {
    t = undefined;
  }
  let r;
  try {
    let content = fsImplementation.readFileSync("/proc/sys/kernel/overflowuid", {
      encoding: "utf8",
    });
    r = parseOverflowUid(content);
  } catch {
    r = undefined;
  }
  let s = r ?? OVERFLOW_UID;
  if (t === undefined) return n === s;
  if (isIdentityUidMap(t)) return false;
  return t.length === 0 || (n !== undefined && n === s);
}
//@ chunk-nt75hmzb.js:2968-3031 placement
/**
 * daemonDirFor：取 daemon 目录。
 */
function daemonDirFor(e) {
  return e === undefined ? join(getClaudeConfigDir(), "daemon") : join(e, "daemon");
}
//@ chunk-nt75hmzb.js:3031-3104 placement
/**
 * daemonPipeKey：由配置目录派生的 daemon 管道键。
 */
function daemonPipeKey() {
  return createHash("sha256").update(resolve(getClaudeConfigDir())).digest("hex").slice(0, 8);
}
//@ chunk-nt75hmzb.js:3234-3257 placement
/**
 * DAEMON_PIPE_KEY_RE：daemon 管道键格式。
 */
var DAEMON_PIPE_KEY_RE = /^[a-f0-9]{16}$/;
//@ chunk-nt75hmzb.js:3257-3299 placement
/**
 * daemonPipeKeyFile：daemon 管道密钥文件路径。
 */
function daemonPipeKeyFile(e) {
  return join(daemonDirFor(e), "pipe.key");
}
//@ chunk-nt75hmzb.js:3808-3865 placement
function daemonPipePath(e) {
  return `\\\\.\\pipe\\cc-daemon-${getDaemonPipeKey()}-${e}`;
}
//@ chunk-nt75hmzb.js:3865-3938 placement
/**
 * redactDaemonPipeKey：错误信息里脱敏 daemon 管道键。
 */
function redactDaemonPipeKey(e) {
  return e.replace(/cc-daemon-[0-9a-f]{16}/g, "cc-daemon-*");
}
//@ chunk-nt75hmzb.js:3938-4059 placement
/**
 * 对错误消息与堆栈中的路径做脱敏后返回原错误对象。
 */
function redactErrorPaths(error) {
  if (error instanceof Error) {
    error.message = redactDaemonPipeKey(error.message);
    if (typeof error.stack === "string") error.stack = redactDaemonPipeKey(error.stack);
  }
  return error;
}
//@ chunk-nt75hmzb.js:4059-4104 placement
/**
 * daemonControlKeyFile：daemon 控制密钥文件路径。
 */
function daemonControlKeyFile(e) {
  return join(daemonDirFor(e), "control.key");
}
//@ chunk-nt75hmzb.js:5027-5047 placement
var ENOTOWNED = "ENOTOWNED";
//@ chunk-nt75hmzb.js:5482-5547 placement
/**
 * assertMappedNamespace：未映射命名空间时抛错。
 */
function assertMappedNamespace() {
  if (uidsCollapse())
    throw Object.assign(Error(UNMAPPED_NAMESPACE_REFUSAL), {
      code: ENOTOWNED,
    });
}
//@ chunk-nt75hmzb.js:6334-6406 placement
/**
 * isDaemonSocketGoneError：daemon 套接字已消失的错误。
 */
function isDaemonSocketGoneError(e) {
  return e === "ENOENT" || e === "ECONNREFUSED" || e === "ENOTSOCK";
}
//@ chunk-nt75hmzb.js:6599-6641 placement
/**
 * daemonDispatchDir：取 daemon dispatch 目录。
 */
function daemonDispatchDir(e) {
  return join(daemonDirFor(e), "dispatch");
}
//@ chunk-nt75hmzb.js:6641-6692 placement
/**
 * daemonRejectedDir：取 daemon 被拒任务目录。
 */
function daemonRejectedDir() {
  return join(daemonDirFor(), "dispatch", "rejected");
}
//@ chunk-nt75hmzb.js:6692-6736 placement
/**
 * daemonRosterFile：daemon roster 文件路径。
 */
function daemonRosterFile(e) {
  return join(daemonDirFor(e), "roster.json");
}
//@ chunk-nt75hmzb.js:6736-6761 placement
var ATTACH_JOURNAL = "attach-journal";
//@ chunk-nt75hmzb.js:6761-6794 placement
/**
 * daemonAttachJournal：daemon 附加日志路径。
 */
function daemonAttachJournal() {
  return join(daemonDirFor(), ATTACH_JOURNAL);
}
//@ chunk-nt75hmzb.js:6794-6830 placement
/**
 * daemonRvDir：daemon rv 目录。
 */
function daemonRvDir() {
  return join(getDaemonRuntimeDir(), "rv");
}
//@ chunk-nt75hmzb.js:6830-6868 placement
/**
 * daemonAuthDir：daemon 认证目录。
 */
function daemonAuthDir(e) {
  return join(daemonDirFor(e), "auth");
}
//@ chunk-nt75hmzb.js:6868-6912 placement
/**
 * daemonAuthFile：daemon 认证文件路径。
 */
function daemonAuthFile(e) {
  return join(daemonAuthDir(), `${e}.json`);
}
//@ chunk-nt75hmzb.js:6912-6956 placement
/**
 * hostManagedDir：宿主管辖目录。
 */
function hostManagedDir() {
  return join(daemonDirFor(), "host-managed");
}
//@ chunk-nt75hmzb.js:6956-6990 placement
/**
 * hostManagedEntry：宿主管辖目录下的条目。
 */
function hostManagedEntry(short) {
  return join(hostManagedDir(), short);
}
//@ chunk-nt75hmzb.js:6990-7041 placement
/**
 * daemonTokensFile：daemon 令牌文件路径。
 */
function daemonTokensFile(e) {
  return join(daemonAuthDir(), `${e}.tokens.json`);
}
//@ chunk-nt75hmzb.js:7041-7124 placement
/**
 * daemonRvSocket：rv 套接字路径。
 */
function daemonRvSocket(short) {
  if (getPlatform() === "windows") return daemonPipePath(`rv-${short}`);
  return join(daemonRvDir(), `${short}.sock`);
}
//@ chunk-nt75hmzb.js:7124-7161 placement
/**
 * daemonPtyDir：daemon pty 目录。
 */
function daemonPtyDir() {
  return join(getDaemonRuntimeDir(), "pty");
}
//@ chunk-nt75hmzb.js:7161-7244 placement
/**
 * daemonPtySocket：pty 套接字路径。
 */
function daemonPtySocket(e) {
  if (getPlatform() === "windows") return daemonPipePath(`pty-${e}`);
  return join(daemonPtyDir(), `${e}.sock`);
}
//@ chunk-nt75hmzb.js:7244-7283 placement
/**
 * daemonSpareDir：daemon spare 目录。
 */
function daemonSpareDir() {
  return join(getDaemonRuntimeDir(), "spare");
}
//@ chunk-nt75hmzb.js:7283-7331 placement
/**
 * daemonSparePtySocket：spare pty 套接字路径。
 */
function daemonSparePtySocket(e) {
  return join(daemonSpareDir(), `${e}.pty.sock`);
}
//@ chunk-nt75hmzb.js:7331-7381 placement
/**
 * daemonSpareClaimSocket：spare claim 套接字路径。
 */
function daemonSpareClaimSocket(e) {
  return join(daemonSpareDir(), `${e}.claim.sock`);
}
//@ chunk-nt75hmzb.js:7381-7421 placement
/**
 * daemonPtyPidsDir：pty pid 目录。
 */
function daemonPtyPidsDir() {
  return join(daemonDirFor(), "pty-pids");
}
//@ chunk-nt75hmzb.js:7421-7464 placement
/**
 * daemonPtyPidFile：pty pid 文件路径。
 */
function daemonPtyPidFile(e) {
  return join(daemonPtyPidsDir(), `${e}.pid`);
}
//@ chunk-nt75hmzb.js:7464-7497 placement
/**
 * ptyErrFile：pty 错误输出文件。
 */
function ptyErrFile(e) {
  return ptySidecarFile(e, "err");
}
//@ chunk-nt75hmzb.js:7497-7531 placement
/**
 * ptyLateFile：pty 延迟输出文件。
 */
function ptyLateFile(e) {
  return ptySidecarFile(e, "late");
}
//@ chunk-nt75hmzb.js:7531-7630 placement
function ptySidecarFile(e, n) {
  if (getPlatform() === "windows") return join(daemonPtyPidsDir(), `${e.split("\\").pop()}.${n}`);
  return `${e}.${n}`;
}
//@ chunk-nt75hmzb.js:7739-7827 placement
/**
 * daemonControlSocket：daemon 控制套接字。
 */
function daemonControlSocket() {
  if (getPlatform() === "windows") return daemonPipePath("control");
  assertMappedNamespace();
  return join(getDaemonRuntimeDir(), "control.sock");
}
export {
  daemonTokensFile,
  daemonAuthDir,
  inspectUserNamespace,
  sharedSystemDirs,
  getHostUid,
  isDaemonSocketGoneError,
  daemonControlSocket,
  redactDaemonPipeKey,
  ptyErrFile,
  ptyLateFile,
  daemonAuthFile,
  daemonRvSocket,
  daemonPtySocket,
  ENOTOWNED,
  daemonPtyPidFile,
  daemonSparePtySocket,
  daemonSpareClaimSocket,
  daemonSpareDir,
  daemonControlKeyFile,
  daemonPipeKeyFile,
  daemonRosterFile,
  daemonDispatchDir,
  hostManagedDir,
  hostManagedEntry,
  daemonPtyPidsDir,
  daemonPtyDir,
  uidsCollapse,
  daemonPipeKey,
  DAEMON_PIPE_KEY_RE,
  daemonDirFor,
  assertMappedNamespace,
  daemonRvDir,
  daemonRejectedDir,
  redactErrorPaths,
  daemonAttachJournal,
  ATTACH_JOURNAL,
};
