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
import { readFile, readFile as readFile_2 } from "fs/promises";
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

/**
 * 默认溢出 uid（65534），以及沙箱中不应视为个人目录的系统共享目录集合。
 */
//@ chunk-nt75hmzb.js:872-1037 placement
var OVERFLOW_UID = 65534,
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
//@ chunk-nt75hmzb.js:1037-1061 placement
function _li() {
  return SHARED_SYSTEM_DIRS;
}
//@ chunk-nt75hmzb.js:1061-1145 placement
async function E() {
  try {
    return parseUidMap(await readFile_2("/proc/self/uid_map", "utf8"));
  } catch {
    return;
  }
}
/**
 * 解析 /proc/self/uid_map 内容为映射区间列表（内部起点、宿主起点、数量），任一行格式不合法时返回 undefined。
 */
//@ chunk-nt75hmzb.js:1145-1463 placement
function parseUidMap(e) {
  let n = [];
  for (let t of e.split(`
`)) {
    if (t.trim() === "") continue;
    let parts = t.trim().split(/\s+/),
      s = Number(parts[0]),
      u = Number(parts[1]),
      a = Number(parts[2]);
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
    n.push({ innerStart: s, hostStart: u, count: a });
  }
  return n;
}
//@ chunk-nt75hmzb.js:1463-1542 placement
function l(e) {
  return e.length === 1 && e[0].innerStart === 0 && e[0].count >= 4294967295;
}
//@ chunk-nt75hmzb.js:1542-1636 placement
async function g() {
  try {
    return parseOverflowUid(await readFile_2("/proc/sys/kernel/overflowuid", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-nt75hmzb.js:1636-1748 placement
function parseOverflowUid(e) {
  let trimmed = e.trim();
  if (!/^\d+$/.test(trimmed)) return;
  let t = Number(trimmed);
  return Number.isSafeInteger(t) ? t : void 0;
}
//@ chunk-nt75hmzb.js:1748-1868 placement
function getUnmappedOwnerUid(e, n) {
  if (e.length === 0 || n === void 0) return;
  return e.some((r) => n >= r.innerStart && n < r.innerStart + r.count) ? void 0 : n;
}
/**
 * 检查当前进程的用户命名空间 uid 映射：返回所有者 uid 是否未映射、uid 是否折叠为溢出 uid、root 是否有歧义；不在命名空间中时返回 undefined。
 */
//@ chunk-nt75hmzb.js:1868-2074 placement
async function inspectUserNamespace() {
  let e = process.getuid?.(),
    n = await E();
  if (n === void 0) {
    let t = (await g()) ?? OVERFLOW_UID;
    return e === t ? { unmappedOwnerUid: void 0, uidCollapses: !0, rootUidAmbiguous: t === 0 } : void 0;
  }
  if (l(n)) return;
  return describeUidMapping(n, e);
}
//@ chunk-nt75hmzb.js:2074-2219 placement
async function describeUidMapping(e, n) {
  let t = await g(),
    r = t ?? OVERFLOW_UID;
  return {
    unmappedOwnerUid: getUnmappedOwnerUid(e, t),
    uidCollapses: e.length === 0 || (n !== void 0 && n === r),
    rootUidAmbiguous: t === 0,
  };
}
/**
 * 把当前进程 uid 换算为宿主机 uid：不在用户命名空间时原样返回；映射为空或折叠为溢出 uid 时返回 undefined；否则按映射区间换算。
 */
//@ chunk-nt75hmzb.js:2219-2577 placement
async function getHostUid() {
  let e = process.getuid?.();
  if (e === void 0) return;
  let n = await E();
  if (n === void 0) return;
  if (l(n)) return e;
  let t = (await g()) ?? OVERFLOW_UID;
  if (n.length === 0 || e === t) return;
  if (((u) => n.some((a) => u >= a.innerStart && u < a.innerStart + a.count))(t)) return e;
  let found = n.find((u) => e >= u.innerStart && e < u.innerStart + u.count);
  return found === void 0 ? void 0 : found.hostStart + (e - found.innerStart);
}
//@ chunk-nt75hmzb.js:2577-2643 placement
function q3r() {
  return (
    (processIdentity.uidsCollapse ??= isUidCollapsedSync(getFsImplementation())),
    processIdentity.uidsCollapse
  );
}
/**
 * 同步判断当前 uid 是否折叠为溢出 uid（用户命名空间中没有映射或映射为空）。
 */
//@ chunk-nt75hmzb.js:2643-2968 placement
function isUidCollapsedSync(e) {
  let n = process.getuid?.(),
    t;
  try {
    let content = e.readFileSync("/proc/self/uid_map", { encoding: "utf8" });
    t = parseUidMap(content);
  } catch {
    t = void 0;
  }
  let r;
  try {
    let content = e.readFileSync("/proc/sys/kernel/overflowuid", { encoding: "utf8" });
    r = parseOverflowUid(content);
  } catch {
    r = void 0;
  }
  let s = r ?? OVERFLOW_UID;
  if (t === void 0) return n === s;
  if (l(t)) return !1;
  return t.length === 0 || (n !== void 0 && n === s);
}
//@ chunk-nt75hmzb.js:2968-3031 placement
function c(e) {
  return e === void 0 ? join(getClaudeConfigDir(), "daemon") : join(e, "daemon");
}
//@ chunk-nt75hmzb.js:3031-3104 placement
function q() {
  return createHash("sha256").update(resolve(getClaudeConfigDir())).digest("hex").slice(0, 8);
}
//@ chunk-nt75hmzb.js:3234-3257 placement
var G = /^[a-f0-9]{16}$/;
//@ chunk-nt75hmzb.js:3257-3299 placement
function K8o(e) {
  return join(c(e), "pipe.key");
}
//@ chunk-nt75hmzb.js:3808-3865 placement
function y(e) {
  return `\\\\.\\pipe\\cc-daemon-${getDaemonPipeKey()}-${e}`;
}
//@ chunk-nt75hmzb.js:3865-3938 placement
function $A(e) {
  return e.replace(/cc-daemon-[0-9a-f]{16}/g, "cc-daemon-*");
}
/**
 * 对错误消息与堆栈中的路径做脱敏后返回原错误对象。
 */
//@ chunk-nt75hmzb.js:3938-4059 placement
function redactErrorPaths(e) {
  if (e instanceof Error) {
    if (((e.message = $A(e.message)), typeof e.stack === "string")) e.stack = $A(e.stack);
  }
  return e;
}
//@ chunk-nt75hmzb.js:4059-4104 placement
function hsr(e) {
  return join(c(e), "control.key");
}
//@ chunk-nt75hmzb.js:5027-5047 placement
var ENOTOWNED = "ENOTOWNED";
//@ chunk-nt75hmzb.js:5482-5547 placement
function S() {
  if (q3r()) throw Object.assign(Error(UNMAPPED_NAMESPACE_REFUSAL), { code: ENOTOWNED });
}
//@ chunk-nt75hmzb.js:6334-6406 placement
function q8o(e) {
  return e === "ENOENT" || e === "ECONNREFUSED" || e === "ENOTSOCK";
}
//@ chunk-nt75hmzb.js:6599-6641 placement
function nwe(e) {
  return join(c(e), "dispatch");
}
//@ chunk-nt75hmzb.js:6641-6692 placement
function Y8o() {
  return join(c(), "dispatch", "rejected");
}
//@ chunk-nt75hmzb.js:6692-6736 placement
function Q6(e) {
  return join(c(e), "roster.json");
}
//@ chunk-nt75hmzb.js:6736-6761 placement
var ATTACH_JOURNAL = "attach-journal";
//@ chunk-nt75hmzb.js:6761-6794 placement
function rwe() {
  return join(c(), ATTACH_JOURNAL);
}
//@ chunk-nt75hmzb.js:6794-6830 placement
function X3r() {
  return join(getDaemonRuntimeDir(), "rv");
}
//@ chunk-nt75hmzb.js:6830-6868 placement
function NTt(e) {
  return join(c(e), "auth");
}
//@ chunk-nt75hmzb.js:6868-6912 placement
function $Tt(e) {
  return join(NTt(), `${e}.json`);
}
//@ chunk-nt75hmzb.js:6912-6956 placement
function jwn() {
  return join(c(), "host-managed");
}
//@ chunk-nt75hmzb.js:6956-6990 placement
function ePe(e) {
  return join(jwn(), e);
}
//@ chunk-nt75hmzb.js:6990-7041 placement
function FTt(e) {
  return join(NTt(), `${e}.tokens.json`);
}
//@ chunk-nt75hmzb.js:7041-7124 placement
function Wwn(e) {
  if (getPlatform() === "windows") return y(`rv-${e}`);
  return join(X3r(), `${e}.sock`);
}
//@ chunk-nt75hmzb.js:7124-7161 placement
function UTt() {
  return join(getDaemonRuntimeDir(), "pty");
}
//@ chunk-nt75hmzb.js:7161-7244 placement
function FA(e) {
  if (getPlatform() === "windows") return y(`pty-${e}`);
  return join(UTt(), `${e}.sock`);
}
//@ chunk-nt75hmzb.js:7244-7283 placement
function Fpe() {
  return join(getDaemonRuntimeDir(), "spare");
}
//@ chunk-nt75hmzb.js:7283-7331 placement
function kli(e) {
  return join(Fpe(), `${e}.pty.sock`);
}
//@ chunk-nt75hmzb.js:7331-7381 placement
function Tli(e) {
  return join(Fpe(), `${e}.claim.sock`);
}
//@ chunk-nt75hmzb.js:7381-7421 placement
function Xot() {
  return join(c(), "pty-pids");
}
//@ chunk-nt75hmzb.js:7421-7464 placement
function owe(e) {
  return join(Xot(), `${e}.pid`);
}
//@ chunk-nt75hmzb.js:7464-7497 placement
function JC(e) {
  return P(e, "err");
}
//@ chunk-nt75hmzb.js:7497-7531 placement
function xN(e) {
  return P(e, "late");
}
//@ chunk-nt75hmzb.js:7531-7630 placement
function P(e, n) {
  if (getPlatform() === "windows") return join(Xot(), `${e.split("\\").pop()}.${n}`);
  return `${e}.${n}`;
}
//@ chunk-nt75hmzb.js:7739-7827 placement
function Z6() {
  if (getPlatform() === "windows") return y("control");
  return (S(), join(getDaemonRuntimeDir(), "control.sock"));
}

export {
  FTt,
  NTt,
  inspectUserNamespace,
  _li,
  getHostUid,
  q8o,
  Z6,
  $A,
  JC,
  xN,
  $Tt,
  Wwn,
  FA,
  ENOTOWNED,
  owe,
  kli,
  Tli,
  Fpe,
  hsr,
  K8o,
  Q6,
  nwe,
  jwn,
  ePe,
  Xot,
  UTt,
  q3r,
  q,
  G,
  c,
  S,
  X3r,
  Y8o,
  redactErrorPaths,
  rwe,
  ATTACH_JOURNAL,
};
