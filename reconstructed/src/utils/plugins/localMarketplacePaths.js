/**
 * utils/plugins/localMarketplacePaths.ts
 *
 * 2.1.316 新增：本地 marketplace 路径：探测与读取 marketplace 文件，校验插件源留在目录内（拒绝符号链接逃逸）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (45)
 * attribution: placement 45
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  normalize,
  parse,
  basename,
  basename as basename_2,
  dirname,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
} from "path";
import { stat, stat as stat_2, stat as stat_3, realpath, lstat } from "fs/promises";
import { PathSpace } from "../resultError.js";
import { getPlatform } from "../platform.js";
import { getFsImplementation } from "../fsOperations.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errnoShapedCode,
  getErrnoCode,
  errorMessage,
} from "../errors.js";
import { isDiskless, getOriginalCwd } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import {
  K7t,
  realpathAllowMissing,
  ck,
  nLt,
  toWslPath,
  ovr,
  toWindowsPathFromWsl,
} from "../pathResolution.js";
import { $j, cl, rc } from "../pathClassification.js";
import { getPluginsDirectory, getPluginSeedDirs } from "./pluginDirectories.js";
import { foldCase, z7t, Lu, THn } from "../networkPaths.js";
import { toComparablePath, isPathWithin } from "../fsJunctions.js";
import { toUncLongPath } from "../windowsUncPaths.js";
import { e9 } from "../permissions/protectedDirs.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { hm } from "../pathPrefix.js";
import { printableOrEmpty, printableName } from "../printableName.js";
import { capitalize } from "../stringUtils.js";
import { MARKETPLACE_SOURCE_FIX_HINTS } from "./marketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { jsonParse } from "../slowOperations.js";

//@ chunk-f3qhjfah.js:27379-27485 placement
function toWorkspacePathSpace(e) {
  if (isAbsolute_5(e)) return PathSpace.workspace(e);
  return PathSpace.workspace(
    getPlatform() === "windows" ? resolve_2(e) : getFsImplementation().cwd() + sep_3 + e,
  );
}
//@ chunk-f3qhjfah.js:27485-27652 placement
function makeStatEnoentError(e) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, stat '${e}'`,
      "ENOENT: no such file or directory",
    ),
    { code: "ENOENT", syscall: "stat", path: e },
  );
}
//@ chunk-f3qhjfah.js:27652-27820 placement
function enoentError(e) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, open '${e}'`,
      "ENOENT: no such file or directory",
    ),
    { code: "ENOENT", syscall: "open", path: e },
  );
}
//@ chunk-f3qhjfah.js:27820-27968 placement
function storageErrorCause(e) {
  return e.code === "Failed" &&
    (errnoShapedCode(e.telemetryCode) !== void 0 || /^ERR_/.test(e.telemetryCode ?? "")) &&
    e.cause instanceof Error
    ? e.cause
    : void 0;
}
//@ chunk-f3qhjfah.js:27968-28031 placement
function re(e, n) {
  return e === "workspace" ? toWorkspacePathSpace(n) : PathSpace.system(resolve_2(n));
}
//@ chunk-f3qhjfah.js:28031-28485 placement
async function probeLocalMarketplacePath(e, n, r = "workspace") {
  if (isDiskless()) throw makeStatEnoentError(n);
  if (!isStorageV5Enabled() || e === void 0) return stat_3(n);
  if (n === "") throw makeStatEnoentError(n);
  let stats = await e.hostFiles.stat(re(r, n), { follow: !0 });
  if (!stats.ok)
    throw (
      storageErrorCause(stats.error) ??
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to probe the local marketplace path ${n}: ${formatStorageError(stats.error)}`,
          "failed to probe a local marketplace path (v5 backend error)",
        ),
        { cause: stats.error },
      )
    );
  if (stats.value.kind === "absent") throw makeStatEnoentError(n);
  let a = stats.value.kind === "directory";
  return { isDirectory: () => a };
}
//@ chunk-f3qhjfah.js:28485-28838 placement
async function readLocalMarketplaceFile(e, n, r) {
  if (r === "" || isDiskless()) return { absent: "ENOENT" };
  let text = await e.hostFiles.readText(re(n, r));
  if (!text.ok)
    throw (
      storageErrorCause(text.error) ??
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to read the marketplace file ${r}: ${formatStorageError(text.error)}`,
          "failed to read a local marketplace file (v5 backend error)",
        ),
        { cause: text.error },
      )
    );
  return text.value.found ? { text: text.value.value } : { absent: "ENOENT" };
}
/**
 * 本地市场路径是否存在（v5 存储经 hostFiles.stat）。
 */
//@ chunk-f3qhjfah.js:28838-29031 placement
async function localMarketplacePathExists(e, n, r = "workspace") {
  if (isDiskless()) return !1;
  if (!isStorageV5Enabled() || e === void 0) return pathExists(n);
  if (n === "") return !1;
  let stats = await e.hostFiles.stat(re(r, n), { follow: !0 });
  return stats.ok && stats.value.kind !== "absent";
}
//@ chunk-f3qhjfah.js:29101-29186 placement
var UNSAFE_PATH_EXPLANATION = `is on a network drive, has "." or ".." in its path, or couldn't be checked`;
/**
 * 把市场路径解析为绝对路径并判断是否可疑：位于受信根下时只检查尾部；尾部含 . / .. 段直接可疑；否则看是否网络形状或 realpath 不可信。
 */
//@ chunk-f3qhjfah.js:29186-29454 placement
function classifyMarketplacePath(e, { trustedRoots: n = [] } = {}) {
  let r = splitMarketplacePath(e, n),
    { absolute: absolute, root: root, tail: tail } = r;
  if (r.dotSegmentInTail) return { absolute: absolute, suspect: !0 };
  if (root !== void 0) {
    let g = resolve_3(getOriginalCwd(), root);
    return { absolute: absolute, suspect: K7t(g, tail) };
  }
  let l = r.networkShapedUnvouched || realpathAllowMissing(absolute);
  return { absolute: absolute, suspect: l };
}
//@ chunk-f3qhjfah.js:29454-29719 placement
function splitMarketplacePath(e, n) {
  if (e.trim() === "")
    return { absolute: e, root: void 0, tail: e, dotSegmentInTail: !1, networkShapedUnvouched: !0 };
  let r = resolve_3(getOriginalCwd(), e),
    { root: root, tail: tail } = matchTrustedRoot(e, n);
  return {
    absolute: r,
    root: root,
    tail: tail,
    dotSegmentInTail: $j(tail),
    networkShapedUnvouched: root === void 0 && (ck(e) || ck(r)),
  };
}
//@ chunk-f3qhjfah.js:29719-29760 placement
function Vt(e) {
  return [getPluginsDirectory(), ...getPluginSeedDirs(), ...e];
}
/**
 * 找到包含路径且尾部最短的受信根。
 */
//@ chunk-f3qhjfah.js:29760-30106 placement
function matchTrustedRoot(e, n) {
  let r = nLt(e),
    s;
  for (let a of Vt(n))
    for (let c of [a, normalize(a)]) {
      let l = nLt(c.replace(/[\\/]+$/, ""));
      if (l === "" || l === ".") continue;
      let g;
      if (r === l) g = "";
      else if (r.startsWith(l + sep_4) || r.startsWith(l + "/"))
        g = e.slice(e.length - (r.length - l.length));
      if (g !== void 0 && (s === void 0 || g.length < s.tail.length)) s = { root: a, tail: g };
    }
  return s ?? { root: void 0, tail: e };
}
//@ chunk-f3qhjfah.js:30106-30208 placement = getReservedShortcuts (1)
function normalizePathForPlatform(e) {
  switch (getPlatform()) {
    case "windows":
      return foldCase(nLt(e));
    case "macos":
      return foldCase(e);
    default:
      return e;
  }
}
//@ chunk-f3qhjfah.js:30208-30288 placement
function f5t(e) {
  if (e.trim() === "") return;
  return normalizePathForPlatform(toComparablePath(resolve_3(getOriginalCwd(), e), { foldCase: !0 }));
}
/**
 * Windows 上判断路径所在盘是否是 WSL 提供。
 */
//@ chunk-f3qhjfah.js:30288-30484 placement
function wslProviderOfPath(e) {
  if (getPlatform() !== "windows") return;
  let root = parse(e).root,
    r = (a) => z7t(toUncLongPath(a)),
    s = r(root);
  if (s === void 0) {
    let a = e9(root);
    if (a === null) return "undeterminable";
    s = r(a);
  }
  return s === void 0 ? void 0 : { walkRoot: root, ...s };
}
/**
 * WSL 路径的遍历根与发行版目录。
 */
//@ chunk-f3qhjfah.js:30484-30648 placement
function wslWalkRootOf(e) {
  let n = wslProviderOfPath(e);
  if (n === void 0 || n === "undeterminable") return n;
  return { walkRoot: n.walkRoot, distroDir: n.rest.replace(/[\\/]+$/, "").replace(/[\\/]+/g, "/") };
}
/**
 * Windows/WSL 路径互转。
 */
//@ chunk-f3qhjfah.js:30648-30769 placement
function toAlternatePlatformPath(e, n) {
  return (
    toWslPath(e, { exactDots: !0 }) ??
    ovr(e, { exactDots: !0 }) ??
    (n === void 0 ? void 0 : toWindowsPathFromWsl(e, n.walkRoot, n.distroDir))
  );
}
//@ chunk-f3qhjfah.js:30769-30867 placement
function isWindowsAbsolutePath(e) {
  if (!isAbsolute_4(e)) return !1;
  return getPlatform() !== "windows" || /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(e);
}
/**
 * 本地市场源路径规范化。
 */
//@ chunk-f3qhjfah.js:30867-30996 placement
function normalizeLocalMarketplaceSource(e, n) {
  if (!isLocalMarketplaceSource(e)) return e;
  let r = n === void 0 ? Lu(e.path) : THn(e.path, n),
    s = isWindowsAbsolutePath(r) ? resolve(r) : r;
  return s === e.path ? e : { ...e, path: s };
}
//@ chunk-f3qhjfah.js:30996-31173 placement = getErrnoPath (1)
function getErrnoPath(e, n) {
  let r = getLocalSourcePath(e);
  if (r === void 0 || e === void 0 || !isLocalMarketplaceSource(e)) return [];
  if (
    !(n !== void 0 && n.source === e.source && "path" in n && n.path === e.path) ||
    !isWindowsAbsolutePath(r) ||
    cl(r)
  )
    return [];
  return [r];
}
/**
 * 返回本地市场来源的路径（directory → path，file → 其所在目录…），非本地返回 undefined。
 */
//@ chunk-f3qhjfah.js:31173-31324 placement = normalizeSource (0.757)
function getLocalSourcePath(e) {
  switch (e?.source) {
    case "directory":
      return e.path;
    case "file":
      return basename(dirname(e.path)) === ".claude-plugin" ? dirname(dirname(e.path)) : void 0;
    default:
      return;
  }
}
/**
 * Windows 绝对路径插件确实位于本地市场目录内（含 realpath）。
 */
//@ chunk-f3qhjfah.js:31324-31648 placement
async function isWindowsPluginInsideLocalMarketplace(
  e,
  { entrySource: entrySource, marketplaceLocation: marketplaceLocation, pluginPath: pluginPath },
) {
  let a = getLocalSourcePath(e);
  if (
    a === void 0 ||
    typeof entrySource !== "string" ||
    !isWindowsAbsolutePath(a) ||
    resolve(marketplaceLocation) !== resolve(a) ||
    !hm(resolve(a), resolve(pluginPath), !0) ||
    [a, pluginPath].some((g) => rc(g) || cl(g))
  )
    return !1;
  let [c, l] = await Promise.all([
    realpath(a).catch(() => {
      return;
    }),
    realpath(pluginPath).catch(() => {
      return;
    }),
  ]);
  return c !== void 0 && l !== void 0 && hm(c, l, !0);
}
/**
 * 插件所在市场的候选路径。
 */
//@ chunk-f3qhjfah.js:31648-31751 placement
function getMarketplaceCandidatePaths(e, n, r) {
  let s = getMarketplaceSources(e, n, r);
  return s === void 0 ? [] : getErrnoPath(s.marketplaceSource, s.corroboratingSource);
}
//@ chunk-f3qhjfah.js:31751-31844 placement
function aZo(e, n, r) {
  let { absolute: absolute, suspect: suspect } = classifyMarketplacePath(e, {
    trustedRoots: getErrnoPath(n, r),
  });
  return suspect ? void 0 : absolute;
}
//@ chunk-f3qhjfah.js:31844-31969 placement
function formatLocationRefusedMessage(e) {
  return `Marketplace directory refused: its recorded location ${printableOrEmpty(e)} ${UNSAFE_PATH_EXPLANATION}. ${capitalize(MARKETPLACE_SOURCE_FIX_HINTS["network-location"])}.`;
}
//@ chunk-f3qhjfah.js:31969-31995 placement
var Edr = /^\.(?:[\\/]+|$)/;
//@ chunk-f3qhjfah.js:31995-32079 placement
function vdr(e) {
  let replaced = e.replace(Edr, "");
  return replaced !== "" && (isAbsolute_4(replaced) || $j(replaced) || ck(replaced) || rc(replaced));
}
//@ chunk-f3qhjfah.js:32079-32181 placement
function resolveEntryPath(e, n) {
  let replaced = n.replace(Edr, "");
  if (replaced === "") return e;
  if (vdr(n) || K7t(e, replaced)) return;
  return join_4(e, replaced);
}
//@ chunk-f3qhjfah.js:32181-32353 placement
function formatEntryRefusedMessage(e) {
  return `Plugin source path refused: ${printableName(e, 300)} does not stay inside its marketplace directory. Check that the marketplace entry has a plain relative path.`;
}
/**
 * 定位市场目录并解析条目路径：位置不安全 location-refused；目录不存在/读失败 location-missing/location-error； 条目越界 entry-refused。可取身份的目录逐级 lstat 只许普通目录，否则 realpath 校验留在目录内。返回 {kind, marketplaceDir, entryPath}。
 */
//@ chunk-f3qhjfah.js:32353-33312 placement
async function resolveMarketplaceEntryPath(
  pluginId,
  entrySource,
  {
    marketplaceSource: marketplaceSource,
    corroboratingSource: corroboratingSource,
    storageV5: storageV5,
    localMarketplaceSpace: localMarketplaceSpace = "workspace",
  },
) {
  let location = aZo(pluginId, marketplaceSource, corroboratingSource);
  if (location === void 0) return { kind: "location-refused" };
  let isDirectory, statError;
  try {
    isDirectory = (
      marketplaceSource !== void 0 && isLocalMarketplaceSource(marketplaceSource)
        ? await probeLocalMarketplacePath(storageV5, location, localMarketplaceSpace)
        : await stat_2(location)
    ).isDirectory();
  } catch (error) {
    statError = error;
  }
  let marketplaceDir = getServerUrl(location, marketplaceSource, isDirectory);
  if (marketplaceDir === void 0) return { kind: "entry-refused", marketplaceDir: dirname(location) };
  let entryPath = resolveEntryPath(marketplaceDir, entrySource);
  if (isDirectory === void 0) {
    let P = getErrnoCode(statError);
    return P === "ENOENT" || P === "ENOTDIR"
      ? { kind: "location-missing", error: statError, marketplaceDir: marketplaceDir, entryPath: entryPath }
      : {
          kind: "location-error",
          error: statError,
          marketplaceDir: marketplaceDir,
          entryPath: entryPath,
          entryRefusedLexically: vdr(entrySource),
        };
  }
  if (entryPath === void 0) return { kind: "entry-refused", marketplaceDir: marketplaceDir };
  let identity = await getFileIdentity(marketplaceDir),
    fe = !1;
  if (!identity) {
    for (let P of getErrnoPath(marketplaceSource, corroboratingSource))
      if (isPathWithin(P, marketplaceDir) && !(await getFileIdentity(P))) {
        fe = !0;
        break;
      }
  }
  if (!fe) {
    if (identity) {
      if (!(await walkEntryPlainDirectories(marketplaceDir, entrySource)))
        return { kind: "entry-refused", marketplaceDir: marketplaceDir, cause: "plain-directory-walk" };
    } else if (
      !isPathWithin(marketplaceDir, entryPath) ||
      !(await verifyEntryRealpathInside(marketplaceDir, entryPath))
    )
      return { kind: "entry-refused", marketplaceDir: marketplaceDir };
  }
  return { kind: "ok", marketplaceDir: marketplaceDir, entryPath: entryPath };
}
//@ chunk-f3qhjfah.js:33312-33616 placement = getFileIdentity (1)
async function getFileIdentity(filePath) {
  if (getPlatform() === "windows") return !1;
  if (rc(filePath)) return !0;
  let n;
  try {
    n = await stat_2(filePath, { bigint: !0 });
  } catch {
    return !1;
  }
  if (!n.isDirectory()) return !1;
  if (n.ino === 0n) return !0;
  let r;
  try {
    r = await realpath(filePath);
  } catch {
    return !0;
  }
  try {
    let stats = await stat_2(r, { bigint: !0 });
    return stats.ino === 0n || stats.dev !== n.dev || stats.ino !== n.ino;
  } catch {
    return !0;
  }
}
/**
 * 逐级 lstat 条目路径，只允许普通目录（不存在视为通过）。
 */
//@ chunk-f3qhjfah.js:33616-34180 placement
async function walkEntryPlainDirectories(e, n) {
  if (vdr(n)) return !1;
  let replaced = n.replace(Edr, ""),
    s = e;
  for (let a of replaced.split("/").filter(Boolean)) {
    s = join_4(s, a);
    let c;
    try {
      c = await lstat(s);
    } catch (error) {
      let g = getErrnoCode(error);
      if (g === "ENOENT" || g === "ENOTDIR") return !0;
      return (
        logForDebugging(
          `Marketplace entry ${printableOrEmpty(s)} refused: lstat failed (${getErrnoCode(error) ?? printableName(errorMessage(error), 160)}) while walking a tree realpath cannot judge`,
        ),
        !1
      );
    }
    if (!c.isDirectory())
      return (
        logForDebugging(
          `Marketplace entry ${printableOrEmpty(s)} refused: ${c.isSymbolicLink() ? "a symlink" : "not a directory"} under a marketplace directory realpath cannot judge; only plain directories are allowed there`,
        ),
        !1
      );
  }
  return !0;
}
/**
 * 非 Windows：条目 realpath 后与原路径 stat 的 dev/ino 必须一致且在市场目录内；不存在视为通过，inode 为 0 或无法解析时拒绝并记日志。
 */
//@ chunk-f3qhjfah.js:34180-35057 placement
async function verifyEntryRealpathInside(e, n) {
  if (getPlatform() === "windows") return !0;
  let r = (f) => (
      logForDebugging(
        `Marketplace entry ${printableOrEmpty(n)} refused: ${f} (its declared spelling does not provably open inside ${printableOrEmpty(e)})`,
      ),
      !1
    ),
    s = (f) => getErrnoCode(f) ?? printableName(errorMessage(f), 160),
    a;
  try {
    a = await realpath(n);
  } catch (error) {
    let m = getErrnoCode(error);
    if (m !== "ENOENT" && m !== "ENOTDIR") return r(`realpath failed (${s(error)})`);
    try {
      await stat_2(n);
    } catch (error) {
      let w = getErrnoCode(error);
      return w === "ENOENT" || w === "ENOTDIR" ? !0 : r(`stat failed (${s(error)})`);
    }
    return r("it exists but realpath cannot resolve it as spelled");
  }
  let c;
  try {
    c = await Promise.all([stat_2(n, { bigint: !0 }), stat_2(a, { bigint: !0 })]);
  } catch (error) {
    return r(`stat failed (${s(error)})`);
  }
  let [l, g] = c;
  if (l.ino === 0n || g.ino === 0n) return r("the filesystem reports no inode number");
  if (l.dev !== g.dev || l.ino !== g.ino)
    return r(`its spelling opens a different file from the one realpath names (${printableOrEmpty(a)})`);
  if (!isPathWithin(e, a)) return r(`it opens ${printableOrEmpty(a)}, outside the marketplace directory`);
  return !0;
}
/**
 * location-refused / entry-refused 的原因文字。
 */
//@ chunk-f3qhjfah.js:35057-35470 placement
function describeEntryRefusal(e) {
  return e === "location-refused"
    ? `its marketplace's recorded location ${UNSAFE_PATH_EXPLANATION}`
    : "its marketplace entry path does not stay inside the marketplace directory (an absolute, climbing, network-shaped, backslash-containing or link-traversing entry, an entry of a fetched marketplace that resolves or opens outside its tree \u2014 or a relative entry in a url-catalog marketplace, which has no local directory)";
}
/**
 * 解析结果转 {entryPath, reason}（缺失目录仍给出路径）。
 */
//@ chunk-f3qhjfah.js:35470-35967 placement
function entryPathOrReasonLenient(e) {
  switch (e.kind) {
    case "ok":
    case "location-missing":
      return e.entryPath === void 0
        ? { entryPath: void 0, reason: describeEntryRefusal("entry-refused") }
        : { entryPath: e.entryPath };
    case "location-error":
      return e.entryPath !== void 0
        ? { entryPath: e.entryPath }
        : e.entryRefusedLexically
          ? { entryPath: void 0, reason: describeEntryRefusal("entry-refused") }
          : {
              entryPath: void 0,
              reason: `its marketplace directory could not be examined (${getErrnoCode(e.error) ?? "unknown error"})`,
            };
    case "location-refused":
    case "entry-refused":
      return { entryPath: void 0, reason: describeEntryRefusal(e.kind) };
  }
}
/**
 * 解析结果转 {entryPath, reason}。
 */
//@ chunk-f3qhjfah.js:35967-36357 placement
function entryPathOrReason(e) {
  switch (e.kind) {
    case "ok":
      return { entryPath: e.entryPath };
    case "location-missing":
      return { entryPath: void 0, reason: "its marketplace directory does not exist" };
    case "location-error":
      return {
        entryPath: void 0,
        reason: `its marketplace directory could not be examined (${getErrnoCode(e.error) ?? "unknown error"})`,
      };
    case "location-refused":
    case "entry-refused":
      return { entryPath: void 0, reason: describeEntryRefusal(e.kind) };
  }
}
/**
 * 按插件 id 取市场来源后解析条目路径。
 */
//@ chunk-f3qhjfah.js:36357-36512 placement
async function resolvePluginEntryPath(e, n, r, s, a, c, l) {
  return resolveMarketplaceEntryPath(n, r, {
    ...(getMarketplaceSources(e, s, a) ?? { marketplaceSource: void 0, corroboratingSource: void 0 }),
    storageV5: c,
    localMarketplaceSpace: l,
  });
}
//@ chunk-f3qhjfah.js:36512-36718 placement
function getMarketplaceSources(e, n, r) {
  let { marketplace: marketplace } = parsePluginIdentifier(e);
  if (!marketplace) return;
  let a = Object.hasOwn(r, marketplace) ? r[marketplace]?.source : void 0;
  return {
    marketplaceSource: (n !== void 0 && Object.hasOwn(n, marketplace) ? n[marketplace]?.source : void 0) ?? a,
    corroboratingSource: a,
  };
}
//@ chunk-f3qhjfah.js:36718-36752 placement
var on = /[\\/]marketplace\.json$/i;
//@ chunk-f3qhjfah.js:36752-36899 placement = getServerUrl (1)
function getServerUrl(e, n, r) {
  if (r === !0) return e;
  if (n?.source === "url" || (n === void 0 && /\.json$/i.test(e))) return r === !1 ? void 0 : e;
  return r === !1 || on.test(e) ? dirname(e) : e;
}
/**
 * 解析失败转 {code, message}。
 */
//@ chunk-f3qhjfah.js:36899-37423 placement
function entryResolutionError(e, n, r) {
  switch (e.kind) {
    case "location-refused":
      return { code: "marketplace_location_refused", message: formatLocationRefusedMessage(n) };
    case "location-missing":
      return {
        code: "marketplace_dir_missing",
        message: `Marketplace directory not found at path: ${printableOrEmpty(n)}`,
      };
    case "location-error":
      return {
        code: "marketplace_dir_unreadable",
        message: `Marketplace directory could not be read at path: ${printableOrEmpty(n)} (${getErrnoCode(e.error) ?? "unknown error"})`,
      };
    case "entry-refused":
      return {
        code: "marketplace_entry_path_refused",
        message:
          formatEntryRefusedMessage(r) +
          (e.cause === "plain-directory-walk" ? PLAIN_DIRECTORY_WALK_NOTE : ""),
      };
  }
}
//@ chunk-f3qhjfah.js:37423-37714 placement
var PLAIN_DIRECTORY_WALK_NOTE =
  " The marketplace directory's own path cannot be resolved reliably on this platform (for example, a backslash in one of its components), so only plain directories are accepted as entries there (no links); move the marketplace (or the plugins directory) to a plain path to lift that.";
//@ chunk-f3qhjfah.js:37831-37917 placement = setCwdState (1)
function normalizeRegistryKey(cwd) {
  let normalized = resolve_4(cwd).normalize("NFC");
  return getPlatform() === "windows" ? normalized.toLowerCase() : normalized;
}
/**
 * 读小 JSON 对象注册表，逐项校验，键规范化。
 */
//@ chunk-f3qhjfah.js:37917-38283 placement
function parseJsonRegistryFile(e, n, r, s) {
  let a = new Map();
  if (Buffer.byteLength(n) > r) return (logForDebugging(`Ignoring ${e}: larger than the size cap`), a);
  let c;
  try {
    c = jsonParse(n);
  } catch {
    return (logForDebugging(`Ignoring ${e}: not valid JSON`), a);
  }
  if (typeof c !== "object" || c === null || Array.isArray(c))
    return (logForDebugging(`Ignoring ${e}: not a JSON object`), a);
  for (let [l, g] of Object.entries(c)) {
    let f = s(g);
    if (f !== void 0) a.set(normalizeRegistryKey(l), f);
  }
  return a;
}

export {
  resolvePluginEntryPath,
  entryPathOrReason,
  f5t,
  classifyMarketplacePath,
  entryResolutionError,
  probeLocalMarketplacePath,
  getMarketplaceCandidatePaths,
  UNSAFE_PATH_EXPLANATION,
  isWindowsPluginInsideLocalMarketplace,
  resolveMarketplaceEntryPath,
  localMarketplacePathExists,
  normalizeRegistryKey,
  readLocalMarketplaceFile,
  enoentError,
  parseJsonRegistryFile,
  normalizeLocalMarketplaceSource,
  wslWalkRootOf,
  normalizePathForPlatform,
  toAlternatePlatformPath,
  aZo,
  Edr,
  vdr,
  isWindowsAbsolutePath,
  getLocalSourcePath,
  entryPathOrReasonLenient,
  wslProviderOfPath,
};
