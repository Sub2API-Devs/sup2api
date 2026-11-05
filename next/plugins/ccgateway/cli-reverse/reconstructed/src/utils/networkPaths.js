/**
 * utils/networkPaths.ts
 *
 * 网络挂载路径识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-za46rn2f.js (45)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-za46rn2f.js:4683-4793 placement
/**
 * 路径段是否为 /net/<主机> 或 /Network/Servers/<主机>。
 */
function isNetworkMountSegments(segments) {
  return (
    (segments.length === 2 && foldCase_2(segments[0]) === "net") ||
    (segments.length === 3 && foldCase_2(segments[0]) === "network" && foldCase_2(segments[1]) === "servers")
  );
}
//@ chunk-za46rn2f.js:4793-4978 placement
/**
 * 绝对路径所在网络挂载的主机名（规范化 .. 后），不是则返回 null。
 */
function networkMountHost(inputPath) {
  if (!inputPath.startsWith("/")) return null;
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
    if (isNetworkMountSegments(segments)) return foldCase(segment);
  }
  return null;
}
//@ chunk-za46rn2f.js:4978-5040 placement
function foldCase(text) {
  return text.replace(/[A-Z]/g, (upper) => upper.toLowerCase());
}
//@ chunk-za46rn2f.js:5040-5155 placement
/**
 * 去掉不可见格式字符后做大小写折叠。
 */
function foldCase_2(text) {
  return text
    .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
    .toUpperCase()
    .toLowerCase();
}
//@ chunk-za46rn2f.js:5155-5505 placement
function isNetworkMountPath_2(inputPath, platform = "linux") {
  let parts = inputPath.split("/");
  if (parts[0] !== "") return inputPath;
  let prefix;
  let hostIndex;
  if (
    platform === "darwin"
      ? isNetworkMountSegments(parts.slice(1, 3))
      : parts[1] === "net" && parts.length >= 3
  ) {
    prefix = "/net/";
    hostIndex = 2;
  } else if (platform === "darwin" && isNetworkMountSegments(parts.slice(1, 4))) {
    prefix = "/Network/Servers/";
    hostIndex = 3;
  } else return inputPath;
  let host = parts[hostIndex];
  if (host === undefined || host === "") return inputPath;
  let sliced = parts.slice(hostIndex + 1);
  return prefix + foldCase(host).replace(/\.$/, "") + (sliced.length > 0 ? "/" + sliced.join("/") : "");
}
//@ chunk-za46rn2f.js:5505-5722 placement
function isWslLocalhostPath(inputPath) {
  let match = /^([\\/]{2,})([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)\.(?=[\\/]|$)/.exec(inputPath);
  if (match === null || match[2].toLowerCase() === "wsl.localhost") return inputPath;
  return match[1][0].repeat(2) + match[2] + inputPath.slice(match[1].length + match[2].length + 1);
}
//@ chunk-za46rn2f.js:5722-5827 placement
/**
 * 路径是否在与参考路径不同的网络挂载或家目录挂载上。
 */
function isForeignMountPath(inputPath, homePath) {
  if (isMacSpecialPath(inputPath)) return true;
  if (isNetworkMountPath(inputPath)) {
    let host = networkMountHost(inputPath);
    if (host === null || host !== networkMountHost(homePath)) return true;
  }
  return isOtherHomeMount(inputPath, homePath);
}
//@ chunk-za46rn2f.js:5827-6018 placement
/**
 * 路径（相对参考目录解析）是否落在网络目录、其他网络主机或其他家目录挂载上。
 */
function isOnForeignMount(inputPath, homePath) {
  let resolvedPath = resolve(homePath, inputPath);
  if (isForeignNetworkPath(inputPath, homePath) || isForeignNetworkPath(resolvedPath, homePath)) return true;
  let homeHost = networkMountHost(homePath);
  for (let candidatePath of [inputPath, resolvedPath]) {
    if (isNetworkMountPath(candidatePath)) {
      let candidateHost = networkMountHost(candidatePath);
      if (candidateHost === null || candidateHost !== homeHost) return true;
    }
    if (
      isUnderNetworkDirCached(candidatePath) ||
      isNetDir(candidatePath) ||
      isMacSpecialPath(candidatePath) ||
      isOtherHomeMount(candidatePath, homePath)
    )
      return true;
  }
  return false;
}
//@ chunk-za46rn2f.js:6018-6284 placement
/**
 * macOS 上路径是否属于与参考路径不同的家目录/网络挂载。
 */
function isOtherHomeMount(inputPath, homePath, platform = "linux", foldCase = platform === "darwin" && true) {
  if (platform !== "darwin" || !classifyHomeMount(inputPath, platform, foldCase)) return false;
  let homePrefix = collectMountPrefixes(homePath, platform, foldCase).complete[0] ?? null;
  let { complete, partial } = collectMountPrefixes(inputPath, platform, foldCase);
  if (complete.length === 0 && partial.length === 0) return true;
  if (homePrefix === null) return true;
  return (
    complete.some((completePrefix) => completePrefix !== homePrefix) ||
    partial.some((partialPrefix) => !homePrefix.startsWith(partialPrefix))
  );
}
//@ chunk-za46rn2f.js:6284-6332 placement
var networkMountMemo; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-za46rn2f.js:6284", () => {
  networkMountMemo = identity_2(
    {
      value: undefined,
    },
    (state) => {
      state.value = undefined;
    },
  );
});
//@ chunk-za46rn2f.js:6332-6341 placement
var MAX_MOUNT_PREFIXES = 6;
//@ chunk-za46rn2f.js:6341-6909 placement
/**
 * 收集路径经过的 /network、/home 挂载前缀（完整与部分）。
 */
function collectMountPrefixes(inputPath, platform, includeHome) {
  let complete = [];
  let partial = [];
  if (!inputPath.startsWith("/"))
    return {
      complete,
      partial,
    };
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
    if (segments.length > MAX_MOUNT_PREFIXES) continue;
    let candidatePath = "/" + segments.join("/");
    let filtered = (platform === "darwin" ? isSystemVolumePath(candidatePath) : candidatePath)
      .split("/")
      .filter((part) => part !== "");
    let lower = filtered[0]?.toLowerCase();
    if (lower === "network") {
      if (filtered.length === 1) partial.push("/network/");
      else if (filtered.length === 2) partial.push(`/network/${foldCase(filtered[1])}/`);
      else if (filtered.length === 3)
        complete.push(`/network/${foldCase(filtered[1])}/${foldCase(filtered[2])}`);
    } else if (includeHome && lower === "home" && filtered.length === 2)
      complete.push(`/home/${filtered[1]}`);
  }
  return {
    complete,
    partial,
  };
}
//@ chunk-za46rn2f.js:6909-6937 placement
/**
 * 判断路径是否为网络挂载路径。
 */
function isNetworkMountPath(inputPath) {
  return isNetworkMountRoot(inputPath);
}
//@ chunk-za46rn2f.js:6937-7224 placement
function readAutofsMounts() {
  try {
    let last = readFileSync("/proc/self/mountinfo", "utf8")
      .split(
        `
`,
      )
      .findLast((line) => line.split(" ")[4] === "/net");
    let [fsType, source, options] = last?.split(" - ")[1]?.split(" ") ?? [];
    return (
      fsType === "autofs" &&
      (source === "-hosts" || /(?:^|\/)auto\.(?:net|smb)$/.test(source ?? "")) &&
      options?.split(",").includes("indirect") === true
    );
  } catch {
    return false;
  }
}
//@ chunk-za46rn2f.js:7224-7497 placement
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
        let [mountRecord, fsRecord] = line.split(" - ");
        let mountPoint = mountRecord?.split(" ")[4];
        return mountPoint !== undefined && fsRecord?.startsWith("autofs ") === true
          ? [
              mountPoint.replace(/\\([0-7]{3})/g, (escaped, octal) =>
                String.fromCharCode(Number.parseInt(octal, 8)),
              ),
            ]
          : [];
      });
  } catch {
    return;
  }
}
//@ chunk-za46rn2f.js:7497-7725 placement
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
//@ chunk-za46rn2f.js:7725-7968 placement
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
        .findLast(([keyword]) => keyword === "search" || keyword === "domain")
        ?.slice(1)
        .map((domain) => foldCase(domain.replace(/\.$/, ""))) ?? []
    );
  } catch (error) {
    return isENOENT(error) ? [] : undefined;
  }
}
//@ chunk-za46rn2f.js:7968-8213 placement
/**
 * 路径是否就是网络挂载根（/net/<主机> 等）。
 */
function isNetworkMountRoot_2(inputPath) {
  if (!inputPath.startsWith("/")) return false;
  let filtered = inputPath.split("/").filter((segment) => segment !== "" && segment !== ".");
  if (filtered.length < 1 || filtered.length > 3 || filtered.includes("..")) return false;
  if (isNetworkMountSegments(filtered) && (filtered.length === 2 || false)) return true;
  let lower = filtered[0].toLowerCase();
  return filtered.length <= 2 && (lower === "net" || false);
}
//@ chunk-za46rn2f.js:8213-8262 placement
/**
 * 判断路径是否为不可触碰的拼写（UNC/网络/设备/特殊）。
 */
function isUntouchableSpelling(inputPath) {
  return (
    isUncOrDevicePath(inputPath) ||
    isNetworkMountPath(inputPath) ||
    neverOtherHostMount(inputPath) ||
    isMacSpecialPath(inputPath)
  );
}
//@ chunk-za46rn2f.js:8262-8311 placement
/**
 * 判断路径是否为网络或特殊路径。
 */
function isNetworkOrSpecialPath(inputPath) {
  return (
    isNetworkMountPath(inputPath) ||
    neverOtherHostMount(inputPath) ||
    isNetDir(inputPath) ||
    isMacSpecialPath(inputPath)
  );
}
//@ chunk-za46rn2f.js:8311-8347 placement
/**
 * 判断路径是否落在网络挂载根下。
 */
function isNetworkMountRoot(inputPath) {
  return networkMountRootCached(inputPath) !== null;
}
//@ chunk-za46rn2f.js:8347-8387 placement
var MAX_MOUNT_CACHE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_MOUNT_CACHE_PATH_CHARS;
var networkRootCache;
var underNetworkDirCache;
deferInit("chunk-za46rn2f.js:8347", () => {
  MAX_MOUNT_CACHE = 1024;
  MAX_MOUNT_CACHE_PATH_CHARS = 4096;
  networkRootCache = new Map();
  underNetworkDirCache = new Map();
});
//@ chunk-za46rn2f.js:8387-8547 placement
/**
 * 缓存的网络挂载根查找。
 */
function networkMountRootCached(inputPath) {
  if (!inputPath.startsWith("/")) return null;
  if (inputPath.length > MAX_MOUNT_CACHE_PATH_CHARS) return networkMountRoot(inputPath);
  let cachedRoot = networkRootCache.get(inputPath);
  if (cachedRoot === undefined) {
    cachedRoot = networkMountRoot(inputPath);
    if (networkRootCache.size >= MAX_MOUNT_CACHE) networkRootCache.clear();
    networkRootCache.set(inputPath, cachedRoot);
  }
  return cachedRoot;
}
//@ chunk-za46rn2f.js:8547-8708 placement
/**
 * 路径经过的网络挂载根，没有则 null。
 */
function networkMountRoot(inputPath) {
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
    if (isNetworkMountSegments(segments)) return "/" + segments.join("/");
  }
  return null;
}
//@ chunk-za46rn2f.js:8708-8788 placement
/**
 * 取路径所属网络挂载的名字（最后一段）。
 */
function networkMountName(inputPath) {
  let root = networkMountRootCached(inputPath);
  return root === null ? null : root.slice(root.lastIndexOf("/") + 1);
}
//@ chunk-za46rn2f.js:8788-8862 placement
var WSL_LOCALHOST_PATH_RE = /^([\\/]{2}(?:wsl\.localhost|wsl\$)[\\/]+[^\\/]+)((?:[\\/].*)?)$/i;
//@ chunk-za46rn2f.js:8862-8946 placement
/**
 * 拆出 WSL localhost 路径的前缀与其余部分。
 */
function wslLocalhostParts(inputPath) {
  let match = WSL_LOCALHOST_PATH_RE.exec(inputPath);
  return match === null
    ? undefined
    : {
        prefix: match[1],
        rest: match[2] ?? "",
      };
}
//@ chunk-za46rn2f.js:8946-9144 placement
/**
 * 路径是否就是 /net。
 */
function isNetDir(inputPath) {
  if (!inputPath.startsWith("/")) return false;
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.length === 1 && segments[0].toLowerCase() === "net";
}
//@ chunk-za46rn2f.js:9144-9300 placement
/**
 * 缓存判断路径是否在 /Network 下。
 */
function isUnderNetworkDirCached(inputPath) {
  if (!inputPath.startsWith("/")) return false;
  if (inputPath.length > MAX_MOUNT_CACHE_PATH_CHARS) return isUnderNetworkDir(inputPath);
  let cached = underNetworkDirCache.get(inputPath);
  if (cached === undefined) {
    cached = isUnderNetworkDir(inputPath);
    if (underNetworkDirCache.size >= MAX_MOUNT_CACHE) underNetworkDirCache.clear();
    underNetworkDirCache.set(inputPath, cached);
  }
  return cached;
}
//@ chunk-za46rn2f.js:9300-9485 placement
/**
 * 路径是否在 /Network 下。
 */
function isUnderNetworkDir(inputPath) {
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
    if (segments.length === 1 && segments[0].toLowerCase() === "network") return true;
  }
  return false;
}
//@ chunk-za46rn2f.js:9485-9509 placement
/**
 * 恒返回 false（无其他主机挂载判定）。
 */
function neverOtherHostMount(inputPath) {
  return false;
}
//@ chunk-za46rn2f.js:9509-9558 placement
/**
 * 判断路径是否与网络相关（挂载/网络目录/子目录/特殊）。
 */
function isNetworkRelatedPath(inputPath) {
  return (
    isNetworkMountRoot(inputPath) ||
    isNetDir(inputPath) ||
    isUnderNetworkDirCached(inputPath) ||
    isMacSpecialPath(inputPath)
  );
}
//@ chunk-za46rn2f.js:9558-9976 placement
/**
 * 两个路径是否位于不同的网络位置（网络/本地、主机或共享不同）。
 */
function isDifferentNetworkLocation(firstPath, secondPath, permissionScreenAnchor = null) {
  let isFirstNetworkish = isNetworkishPath(firstPath);
  let isSecondNetworkish = isNetworkishPath(secondPath);
  if (!isFirstNetworkish && !isSecondNetworkish) return false;
  if (isFirstNetworkish && !isSecondNetworkish) return true;
  if (!isFirstNetworkish && isSecondNetworkish) {
    let anchorHost =
      permissionScreenAnchor === null || isUncOrDevicePath(permissionScreenAnchor)
        ? null
        : networkMountHost(permissionScreenAnchor);
    let secondHost = isUncOrDevicePath(secondPath) ? null : hostOfPath(secondPath);
    if (anchorHost !== null && secondHost !== null && anchorHost === secondHost) return false;
    if (
      permissionScreenAnchor !== null &&
      isUncOrDevicePath(permissionScreenAnchor) &&
      isUncOrDevicePath(secondPath) &&
      !isForeignNetworkPath(secondPath, permissionScreenAnchor)
    )
      return false;
    return true;
  }
  let firstHost = isUncOrDevicePath(firstPath) ? null : hostOfPath(firstPath);
  let secondHost = isUncOrDevicePath(secondPath) ? null : hostOfPath(secondPath);
  if (firstHost !== null || secondHost !== null)
    return firstHost === null || secondHost === null || firstHost !== secondHost;
  let firstUncHost = uncHostOf(firstPath);
  let secondUncHost = uncHostOf(secondPath);
  if (firstUncHost !== null || secondUncHost !== null)
    return firstUncHost === null || secondUncHost === null || firstUncHost !== secondUncHost;
  return firstPath !== secondPath;
}
//@ chunk-za46rn2f.js:9976-10014 placement
function hostOfPath(inputPath) {
  return isUnderNetworkDirCached(inputPath) ? null : networkMountHost(inputPath);
}
//@ chunk-za46rn2f.js:10014-10358 placement
function classifyHomeMount(inputPath, platform = "linux", foldCase = platform === "darwin" && true) {
  if (platform !== "darwin") return false;
  if (isUnderNetworkDirCached(inputPath) || isMacSpecialPath(inputPath)) return true;
  if (!inputPath.startsWith("/")) return false;
  let { complete, partial } = collectMountPrefixes(inputPath, platform, foldCase);
  if (partial.length > 0) return true;
  if (complete.some((prefix) => prefix.startsWith("/network/"))) return true;
  let filtered = complete.filter((homePrefix) => homePrefix.startsWith("/home/"));
  if (filtered.length > 0) {
    let homeRoot = homeMountRoot();
    if (filtered.some((prefix) => prefix !== homeRoot)) return true;
  }
  return false;
}
//@ chunk-za46rn2f.js:10358-10473 placement
/**
 * 家目录所在的 /home/<用户> 根。
 */
function homeMountRoot() {
  let homeDir;
  try {
    homeDir = homedir();
  } catch {
    return null;
  }
  let match = /^\/home\/([^/]+)/.exec(isSystemVolumePath(homeDir));
  return match ? `/home/${match[1]}` : null;
}
//@ chunk-za46rn2f.js:10473-10509 placement
/**
 * 判断路径是否疑似网络路径（网络拼写或位于网络目录下）。
 */
function isNetworkishPath(inputPath) {
  return isUncOrNetworkSpelling(inputPath) || isUnderNetworkDirCached(inputPath);
}
//@ chunk-za46rn2f.js:10509-10581 placement
/**
 * 判断路径是否为 UNC 或网络/设备拼写。
 */
function isUncOrNetworkSpelling(inputPath) {
  return (
    isNonWslUncPath(inputPath) ||
    isNetworkMountRoot(inputPath) ||
    isNetDir(inputPath) ||
    isDeviceNamespacePath(inputPath) ||
    hasWin32DevicePrefixSpelling(inputPath) ||
    isDosDevicePath(inputPath) ||
    isMacSpecialPath(inputPath)
  );
}
//@ chunk-za46rn2f.js:10581-10724 placement
/**
 * 规范化挂载路径（前面各段折叠大小写）。
 */
function normalizeMountPath(inputPath) {
  let filtered = inputPath.split("/").filter(Boolean);
  if (filtered.length === 0) return inputPath;
  let last = filtered.at(-1);
  return "/" + [...filtered.slice(0, -1).map(foldCase_2), foldCase(last)].join("/");
}
//@ chunk-za46rn2f.js:10724-10926 placement
/**
 * 路径经过的全部网络挂载根。
 */
function networkMountRoots(inputPath) {
  if (!inputPath.startsWith("/")) return [];
  let roots = [];
  let segments = [];
  for (let segment of inputPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
    if (isNetworkMountSegments(segments)) roots.push(normalizeMountPath("/" + segments.join("/")));
  }
  return roots;
}
//@ chunk-za46rn2f.js:10926-11053 placement
/**
 * 是否为 \\wsl$ 或 \\wsl.localhost 下的发行版路径。
 */
function isWslUncPath(inputPath) {
  let match = /^[\\/]{2}wsl(?:\$|\.localhost)[\\/]([^\\/]*)/i.exec(inputPath);
  return match !== null && !/^\.{0,2}[. ]*$/.test(match[1] ?? "");
}
//@ chunk-za46rn2f.js:11053-11089 placement
/**
 * 判断路径是否为非 WSL 的 UNC 路径。
 */
function isNonWslUncPath(inputPath) {
  return isUncOrDevicePath(inputPath) && !isWslUncPath(inputPath);
}
//@ chunk-za46rn2f.js:11089-11144 placement
/**
 * 用当前家目录展开 ~ 前缀。
 */
function expandTildeWithHome(inputPath) {
  if (isTildePath(inputPath)) return homedir() + inputPath.slice(1);
  return inputPath;
}
//@ chunk-za46rn2f.js:11144-11200 placement
/**
 * 用给定基目录展开 ~ 前缀。
 */
function expandTildeWith(inputPath, baseDir) {
  if (isTildePath(inputPath)) return baseDir + inputPath.slice(1);
  return inputPath;
}
//@ chunk-za46rn2f.js:11200-11254 placement
function isTildePath(inputPath) {
  return inputPath === "~" || inputPath.startsWith("~/") || false;
}
export {
  isUntouchableSpelling,
  isNetworkishPath,
  isNetworkOrSpecialPath,
  isWslUncPath,
  wslLocalhostParts,
  isNetworkMountPath,
  networkMountName,
  isNonWslUncPath,
  classifyHomeMount,
  expandTildeWithHome,
  isDifferentNetworkLocation,
  isNetDir,
  neverOtherHostMount,
  networkMountRootCached,
  isUnderNetworkDirCached,
  isForeignMountPath,
  networkMountHost,
  isNetworkMountRoot,
  isNetworkRelatedPath,
  isOnForeignMount,
  isNetworkMountRoot_2,
  foldCase_2,
  expandTildeWith,
  normalizeMountPath,
  networkMountRoots,
  isNetworkMountPath_2,
  isWslLocalhostPath,
  readAutoMaster,
  readAutofsMounts,
  readAutofsMountPoints,
  readResolvSearchDomains,
  isUncOrNetworkSpelling,
  isOtherHomeMount,
};
