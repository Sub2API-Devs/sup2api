/**
 * utils/networkPaths.ts
 *
 * 网络挂载路径识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (45)
 * attribution: placement 45
 */
import { resolve } from "path";
import { readFileSync, statSync } from "fs";
import { homedir } from "os";
import {
  isMacSpecialPath,
  isForeignNetworkPath,
  isUncOrDevicePath,
  uncHostOf,
  isDeviceNamespacePath,
  isDosDevicePath,
} from "./pathClassification.js";
import { identity as identity_2 } from "./identity.js";
import { isSystemVolumePath } from "./permissions/protectedDirs.js";
import { isENOENT } from "./errors.js";
import { hasWin32DevicePrefixSpelling } from "./fsJunctions.js";

//@ chunk-aat7wt0p.js:4683-4793 placement
/**
 * 路径段是否为 /net/<主机> 或 /Network/Servers/<主机>。
 */
function isNetworkMountSegments(t) {
  return (
    (t.length === 2 && foldCase_2(t[0]) === "net") ||
    (t.length === 3 && foldCase_2(t[0]) === "network" && foldCase_2(t[1]) === "servers")
  );
}
//@ chunk-aat7wt0p.js:4793-4978 placement
/**
 * 绝对路径所在网络挂载的主机名（规范化 .. 后），不是则返回 null。
 */
function networkMountHost(t) {
  if (!t.startsWith("/")) return null;
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    n.push(e);
    if (isNetworkMountSegments(n)) return foldCase(e);
  }
  return null;
}
//@ chunk-aat7wt0p.js:4978-5040 placement
function foldCase(t) {
  return t.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
//@ chunk-aat7wt0p.js:5040-5155 placement
/**
 * 去掉不可见格式字符后做大小写折叠。
 */
function foldCase_2(t) {
  return t
    .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
    .toUpperCase()
    .toLowerCase();
}
//@ chunk-aat7wt0p.js:5155-5505 placement
function isNetworkMountPath_2(t, n = "linux") {
  let parts = t.split("/");
  if (parts[0] !== "") return t;
  let r;
  let o;
  if (n === "darwin" ? isNetworkMountSegments(parts.slice(1, 3)) : parts[1] === "net" && parts.length >= 3) {
    r = "/net/";
    o = 2;
  } else if (n === "darwin" && isNetworkMountSegments(parts.slice(1, 4))) {
    r = "/Network/Servers/";
    o = 3;
  } else return t;
  let i = parts[o];
  if (i === undefined || i === "") return t;
  let sliced = parts.slice(o + 1);
  return r + foldCase(i).replace(/\.$/, "") + (sliced.length > 0 ? "/" + sliced.join("/") : "");
}
//@ chunk-aat7wt0p.js:5505-5722 placement
function isWslLocalhostPath(t) {
  let match = /^([\\/]{2,})([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)\.(?=[\\/]|$)/.exec(t);
  if (match === null || match[2].toLowerCase() === "wsl.localhost") return t;
  return match[1][0].repeat(2) + match[2] + t.slice(match[1].length + match[2].length + 1);
}
//@ chunk-aat7wt0p.js:5722-5827 placement
/**
 * 路径是否在与参考路径不同的网络挂载或家目录挂载上。
 */
function isForeignMountPath(t, n) {
  if (isMacSpecialPath(t)) return true;
  if (isNetworkMountPath(t)) {
    let e = networkMountHost(t);
    if (e === null || e !== networkMountHost(n)) return true;
  }
  return isOtherHomeMount(t, n);
}
//@ chunk-aat7wt0p.js:5827-6018 placement
/**
 * 路径（相对参考目录解析）是否落在网络目录、其他网络主机或其他家目录挂载上。
 */
function isOnForeignMount(t, n) {
  let e = resolve(n, t);
  if (isForeignNetworkPath(t, n) || isForeignNetworkPath(e, n)) return true;
  let r = networkMountHost(n);
  for (let o of [t, e]) {
    if (isNetworkMountPath(o)) {
      let i = networkMountHost(o);
      if (i === null || i !== r) return true;
    }
    if (isUnderNetworkDirCached(o) || isNetDir(o) || isMacSpecialPath(o) || isOtherHomeMount(o, n))
      return true;
  }
  return false;
}
//@ chunk-aat7wt0p.js:6018-6284 placement
/**
 * macOS 上路径是否属于与参考路径不同的家目录/网络挂载。
 */
function isOtherHomeMount(t, n, e = "linux", r = e === "darwin" && true) {
  if (e !== "darwin" || !classifyHomeMount(t, e, r)) return false;
  let o = collectMountPrefixes(n, e, r).complete[0] ?? null;
  let { complete, partial } = collectMountPrefixes(t, e, r);
  if (complete.length === 0 && partial.length === 0) return true;
  if (o === null) return true;
  return complete.some((u) => u !== o) || partial.some((u) => !o.startsWith(u));
}
//@ chunk-aat7wt0p.js:6284-6332 placement
var networkMountMemo = identity_2(
  {
    value: undefined,
  },
  (t) => {
    t.value = undefined;
  },
);
//@ chunk-aat7wt0p.js:6332-6341 placement
var MAX_MOUNT_PREFIXES = 6;
//@ chunk-aat7wt0p.js:6341-6909 placement
/**
 * 收集路径经过的 /network、/home 挂载前缀（完整与部分）。
 */
function collectMountPrefixes(t, n, e) {
  let r = [];
  let o = [];
  if (!t.startsWith("/"))
    return {
      complete: r,
      partial: o,
    };
  let i = [];
  for (let s of t.split("/")) {
    if (s === "" || s === ".") continue;
    if (s === "..") {
      i.pop();
      continue;
    }
    i.push(s);
    if (i.length > MAX_MOUNT_PREFIXES) continue;
    let u = "/" + i.join("/");
    let filtered = (n === "darwin" ? isSystemVolumePath(u) : u).split("/").filter((d) => d !== "");
    let lower = filtered[0]?.toLowerCase();
    if (lower === "network") {
      if (filtered.length === 1) o.push("/network/");
      else if (filtered.length === 2) o.push(`/network/${foldCase(filtered[1])}/`);
      else if (filtered.length === 3) r.push(`/network/${foldCase(filtered[1])}/${foldCase(filtered[2])}`);
    } else if (e && lower === "home" && filtered.length === 2) r.push(`/home/${filtered[1]}`);
  }
  return {
    complete: r,
    partial: o,
  };
}
//@ chunk-aat7wt0p.js:6909-6937 placement
/**
 * 判断路径是否为网络挂载路径。
 */
function isNetworkMountPath(t) {
  return isNetworkMountRoot(t);
}
//@ chunk-aat7wt0p.js:6937-7224 placement
function readAutofsMounts() {
  try {
    let last = readFileSync("/proc/self/mountinfo", "utf8")
      .split(
        `
`,
      )
      .findLast((line) => line.split(" ")[4] === "/net");
    let [n, e, r] = last?.split(" - ")[1]?.split(" ") ?? [];
    return (
      n === "autofs" &&
      (e === "-hosts" || /(?:^|\/)auto\.(?:net|smb)$/.test(e ?? "")) &&
      r?.split(",").includes("indirect") === true
    );
  } catch {
    return false;
  }
}
//@ chunk-aat7wt0p.js:7224-7497 placement
/**
 * 从 /proc/self/mountinfo 读出 autofs 挂载点。
 */
function readAutofsMountPoints() {
  try {
    return readFileSync("/proc/self/mountinfo", "utf8")
      .split(
        `
`,
      )
      .flatMap((line) => {
        let [n, e] = line.split(" - ");
        let r = n?.split(" ")[4];
        return r !== undefined && e?.startsWith("autofs ") === true
          ? [r.replace(/\\([0-7]{3})/g, (o, i) => String.fromCharCode(Number.parseInt(i, 8)))]
          : [];
      });
  } catch {
    return;
  }
}
//@ chunk-aat7wt0p.js:7497-7725 placement
function readAutoMaster() {
  try {
    return (
      readFileSync("/etc/auto_master", "utf8")
        .split(
          `
`,
        )
        .some((line) => {
          let parts = line.replace(/#.*$/, "").trim().split(/\s+/);
          return parts[0]?.toLowerCase() === "/net" && parts[1] === "-hosts";
        }) && statSync("/net").dev !== statSync("/Users").dev
    );
  } catch {
    return false;
  }
}
//@ chunk-aat7wt0p.js:7725-7968 placement
function readResolvSearchDomains() {
  try {
    return (
      readFileSync("/etc/resolv.conf", "utf8")
        .split(
          `
`,
        )
        .map((line) =>
          line
            .replace(/[#;].*$/, "")
            .trim()
            .split(/\s+/),
        )
        .findLast(([t]) => t === "search" || t === "domain")
        ?.slice(1)
        .map((t) => foldCase(t.replace(/\.$/, ""))) ?? []
    );
  } catch (error) {
    return isENOENT(error) ? [] : undefined;
  }
}
//@ chunk-aat7wt0p.js:7968-8213 placement
/**
 * 路径是否就是网络挂载根（/net/<主机> 等）。
 */
function isNetworkMountRoot_2(t) {
  if (!t.startsWith("/")) return false;
  let filtered = t.split("/").filter((r) => r !== "" && r !== ".");
  if (filtered.length < 1 || filtered.length > 3 || filtered.includes("..")) return false;
  if (isNetworkMountSegments(filtered) && (filtered.length === 2 || false)) return true;
  let lower = filtered[0].toLowerCase();
  return filtered.length <= 2 && (lower === "net" || false);
}
//@ chunk-aat7wt0p.js:8213-8262 placement
/**
 * 判断路径是否为不可触碰的拼写（UNC/网络/设备/特殊）。
 */
function isUntouchableSpelling(t) {
  return isUncOrDevicePath(t) || isNetworkMountPath(t) || neverOtherHostMount(t) || isMacSpecialPath(t);
}
//@ chunk-aat7wt0p.js:8262-8311 placement
/**
 * 判断路径是否为网络或特殊路径。
 */
function isNetworkOrSpecialPath(t) {
  return isNetworkMountPath(t) || neverOtherHostMount(t) || isNetDir(t) || isMacSpecialPath(t);
}
//@ chunk-aat7wt0p.js:8311-8347 placement
/**
 * 判断路径是否落在网络挂载根下。
 */
function isNetworkMountRoot(t) {
  return networkMountRootCached(t) !== null;
}
//@ chunk-aat7wt0p.js:8347-8387 placement
var MAX_MOUNT_CACHE = 1024;
var MAX_MOUNT_CACHE_PATH_CHARS = 4096;
var networkRootCache = new Map();
var underNetworkDirCache = new Map();
//@ chunk-aat7wt0p.js:8387-8547 placement
/**
 * 缓存的网络挂载根查找。
 */
function networkMountRootCached(t) {
  if (!t.startsWith("/")) return null;
  if (t.length > MAX_MOUNT_CACHE_PATH_CHARS) return networkMountRoot(t);
  let n = networkRootCache.get(t);
  if (n === undefined) {
    n = networkMountRoot(t);
    if (networkRootCache.size >= MAX_MOUNT_CACHE) networkRootCache.clear();
    networkRootCache.set(t, n);
  }
  return n;
}
//@ chunk-aat7wt0p.js:8547-8708 placement
/**
 * 路径经过的网络挂载根，没有则 null。
 */
function networkMountRoot(t) {
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    n.push(e);
    if (isNetworkMountSegments(n)) return "/" + n.join("/");
  }
  return null;
}
//@ chunk-aat7wt0p.js:8708-8788 placement
/**
 * 取路径所属网络挂载的名字（最后一段）。
 */
function networkMountName(t) {
  let n = networkMountRootCached(t);
  return n === null ? null : n.slice(n.lastIndexOf("/") + 1);
}
//@ chunk-aat7wt0p.js:8788-8862 placement
var WSL_LOCALHOST_PATH_RE = /^([\\/]{2}(?:wsl\.localhost|wsl\$)[\\/]+[^\\/]+)((?:[\\/].*)?)$/i;
//@ chunk-aat7wt0p.js:8862-8946 placement
/**
 * 拆出 WSL localhost 路径的前缀与其余部分。
 */
function wslLocalhostParts(t) {
  let match = WSL_LOCALHOST_PATH_RE.exec(t);
  return match === null
    ? undefined
    : {
        prefix: match[1],
        rest: match[2] ?? "",
      };
}
//@ chunk-aat7wt0p.js:8946-9144 placement
/**
 * 路径是否就是 /net。
 */
function isNetDir(t) {
  if (!t.startsWith("/")) return false;
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    n.push(e);
  }
  return n.length === 1 && n[0].toLowerCase() === "net";
}
//@ chunk-aat7wt0p.js:9144-9300 placement
/**
 * 缓存判断路径是否在 /Network 下。
 */
function isUnderNetworkDirCached(t) {
  if (!t.startsWith("/")) return false;
  if (t.length > MAX_MOUNT_CACHE_PATH_CHARS) return isUnderNetworkDir(t);
  let n = underNetworkDirCache.get(t);
  if (n === undefined) {
    n = isUnderNetworkDir(t);
    if (underNetworkDirCache.size >= MAX_MOUNT_CACHE) underNetworkDirCache.clear();
    underNetworkDirCache.set(t, n);
  }
  return n;
}
//@ chunk-aat7wt0p.js:9300-9485 placement
/**
 * 路径是否在 /Network 下。
 */
function isUnderNetworkDir(t) {
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    n.push(e);
    if (n.length === 1 && n[0].toLowerCase() === "network") return true;
  }
  return false;
}
//@ chunk-aat7wt0p.js:9485-9509 placement
/**
 * 恒返回 false（无其他主机挂载判定）。
 */
function neverOtherHostMount(t) {
  return false;
}
//@ chunk-aat7wt0p.js:9509-9558 placement
/**
 * 判断路径是否与网络相关（挂载/网络目录/子目录/特殊）。
 */
function isNetworkRelatedPath(t) {
  return isNetworkMountRoot(t) || isNetDir(t) || isUnderNetworkDirCached(t) || isMacSpecialPath(t);
}
//@ chunk-aat7wt0p.js:9558-9976 placement
/**
 * 两个路径是否位于不同的网络位置（网络/本地、主机或共享不同）。
 */
function isDifferentNetworkLocation(t, n, permissionScreenAnchor = null) {
  let r = isNetworkishPath(t);
  let o = isNetworkishPath(n);
  if (!r && !o) return false;
  if (r && !o) return true;
  if (!r && o) {
    let l =
      permissionScreenAnchor === null || isUncOrDevicePath(permissionScreenAnchor)
        ? null
        : networkMountHost(permissionScreenAnchor);
    let A = isUncOrDevicePath(n) ? null : hostOfPath(n);
    if (l !== null && A !== null && l === A) return false;
    if (
      permissionScreenAnchor !== null &&
      isUncOrDevicePath(permissionScreenAnchor) &&
      isUncOrDevicePath(n) &&
      !isForeignNetworkPath(n, permissionScreenAnchor)
    )
      return false;
    return true;
  }
  let i = isUncOrDevicePath(t) ? null : hostOfPath(t);
  let s = isUncOrDevicePath(n) ? null : hostOfPath(n);
  if (i !== null || s !== null) return i === null || s === null || i !== s;
  let u = uncHostOf(t);
  let a = uncHostOf(n);
  if (u !== null || a !== null) return u === null || a === null || u !== a;
  return t !== n;
}
//@ chunk-aat7wt0p.js:9976-10014 placement
function hostOfPath(t) {
  return isUnderNetworkDirCached(t) ? null : networkMountHost(t);
}
//@ chunk-aat7wt0p.js:10014-10358 placement
function classifyHomeMount(t, n = "linux", e = n === "darwin" && true) {
  if (n !== "darwin") return false;
  if (isUnderNetworkDirCached(t) || isMacSpecialPath(t)) return true;
  if (!t.startsWith("/")) return false;
  let { complete, partial } = collectMountPrefixes(t, n, e);
  if (partial.length > 0) return true;
  if (complete.some((s) => s.startsWith("/network/"))) return true;
  let filtered = complete.filter((s) => s.startsWith("/home/"));
  if (filtered.length > 0) {
    let s = homeMountRoot();
    if (filtered.some((u) => u !== s)) return true;
  }
  return false;
}
//@ chunk-aat7wt0p.js:10358-10473 placement
/**
 * 家目录所在的 /home/<用户> 根。
 */
function homeMountRoot() {
  let t;
  try {
    t = homedir();
  } catch {
    return null;
  }
  let match = /^\/home\/([^/]+)/.exec(isSystemVolumePath(t));
  return match ? `/home/${match[1]}` : null;
}
//@ chunk-aat7wt0p.js:10473-10509 placement
/**
 * 判断路径是否疑似网络路径（网络拼写或位于网络目录下）。
 */
function isNetworkishPath(t) {
  return isUncOrNetworkSpelling(t) || isUnderNetworkDirCached(t);
}
//@ chunk-aat7wt0p.js:10509-10581 placement
/**
 * 判断路径是否为 UNC 或网络/设备拼写。
 */
function isUncOrNetworkSpelling(t) {
  return (
    isNonWslUncPath(t) ||
    isNetworkMountRoot(t) ||
    isNetDir(t) ||
    isDeviceNamespacePath(t) ||
    hasWin32DevicePrefixSpelling(t) ||
    isDosDevicePath(t) ||
    isMacSpecialPath(t)
  );
}
//@ chunk-aat7wt0p.js:10581-10724 placement
/**
 * 规范化挂载路径（前面各段折叠大小写）。
 */
function normalizeMountPath(t) {
  let filtered = t.split("/").filter(Boolean);
  if (filtered.length === 0) return t;
  let last = filtered.at(-1);
  return "/" + [...filtered.slice(0, -1).map(foldCase_2), foldCase(last)].join("/");
}
//@ chunk-aat7wt0p.js:10724-10926 placement
/**
 * 路径经过的全部网络挂载根。
 */
function networkMountRoots(t) {
  if (!t.startsWith("/")) return [];
  let n = [];
  let e = [];
  for (let r of t.split("/")) {
    if (r === "" || r === ".") continue;
    if (r === "..") {
      e.pop();
      continue;
    }
    e.push(r);
    if (isNetworkMountSegments(e)) n.push(normalizeMountPath("/" + e.join("/")));
  }
  return n;
}
//@ chunk-aat7wt0p.js:10926-11053 placement
/**
 * 是否为 \\wsl$ 或 \\wsl.localhost 下的发行版路径。
 */
function isWslUncPath(t) {
  let match = /^[\\/]{2}wsl(?:\$|\.localhost)[\\/]([^\\/]*)/i.exec(t);
  return match !== null && !/^\.{0,2}[. ]*$/.test(match[1] ?? "");
}
//@ chunk-aat7wt0p.js:11053-11089 placement
/**
 * 判断路径是否为非 WSL 的 UNC 路径。
 */
function isNonWslUncPath(t) {
  return isUncOrDevicePath(t) && !isWslUncPath(t);
}
//@ chunk-aat7wt0p.js:11089-11144 placement
/**
 * 用当前家目录展开 ~ 前缀。
 */
function expandTildeWithHome(t) {
  if (isTildePath(t)) return homedir() + t.slice(1);
  return t;
}
//@ chunk-aat7wt0p.js:11144-11200 placement
/**
 * 用给定基目录展开 ~ 前缀。
 */
function expandTildeWith(t, homeDir) {
  if (isTildePath(t)) return homeDir + t.slice(1);
  return t;
}
//@ chunk-aat7wt0p.js:11200-11254 placement
function isTildePath(t) {
  return t === "~" || t.startsWith("~/") || false;
}
export {
  isNetworkRelatedPath,
  isNonWslUncPath,
  isNetworkMountRoot,
  isNetDir,
  isOnForeignMount,
  isForeignMountPath,
  isNetworkMountPath,
  isWslUncPath,
  isNetworkishPath,
  networkMountName,
  classifyHomeMount,
  isUntouchableSpelling,
  isNetworkOrSpecialPath,
  isDifferentNetworkLocation,
  neverOtherHostMount,
  networkMountRootCached,
  normalizeMountPath,
  foldCase_2,
  isUnderNetworkDirCached,
  isNetworkMountRoot_2,
  networkMountRoots,
  isUncOrNetworkSpelling,
  networkMountHost,
  expandTildeWithHome,
  isOtherHomeMount,
  wslLocalhostParts,
  expandTildeWith,
  readAutoMaster,
  readAutofsMounts,
  readAutofsMountPoints,
  readResolvSearchDomains,
  isNetworkMountPath_2,
  isWslLocalhostPath,
};
