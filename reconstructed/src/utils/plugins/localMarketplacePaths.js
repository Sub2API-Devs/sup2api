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
import { isAbsolute, resolve, sep, normalize, parse, basename, dirname, join } from "path";
import { stat, realpath, lstat } from "fs/promises";
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
  pathTraversesFromTrustedRoot,
  realpathAllowMissing,
  isUntrustedLinkPath,
  passThroughPath,
  toWslPath,
  toWslPathNoop,
  toWindowsPathFromWsl,
} from "../pathResolution.js";
import { hasDotSegmentAlias, hasDotSegment, hasBackslash } from "../pathClassification.js";
import { getPluginsDirectory, getPluginSeedDirs } from "./pluginDirectories.js";
import { foldCase_2, wslLocalhostParts, expandTildeWithHome, expandTildeWith } from "../networkPaths.js";
import { toComparablePath, isPathWithin } from "../fsJunctions.js";
import { toUncLongPath } from "../windowsUncPaths.js";
import { realpathCacheEntry } from "../permissions/protectedDirs.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { isSubpathOf } from "../pathPrefix.js";
import { printableOrEmpty, printableName } from "../printableName.js";
import { capitalize } from "../stringUtils.js";
import { MARKETPLACE_SOURCE_FIX_HINTS } from "./marketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { jsonParse } from "../slowOperations.js";

//@ chunk-f3qhjfah.js:27379-27485 placement
function toWorkspacePathSpace(e) {
  if (isAbsolute(e)) return PathSpace.workspace(e);
  return PathSpace.workspace(
    getPlatform() === "windows" ? resolve(e) : getFsImplementation().cwd() + sep + e,
  );
}
//@ chunk-f3qhjfah.js:27485-27652 placement
function makeStatEnoentError(e) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, stat '${e}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "stat",
      path: e,
    },
  );
}
//@ chunk-f3qhjfah.js:27652-27820 placement
function enoentError(e) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, open '${e}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "open",
      path: e,
    },
  );
}
//@ chunk-f3qhjfah.js:27820-27968 placement
function storageErrorCause(error) {
  return error.code === "Failed" &&
    (errnoShapedCode(error.telemetryCode) !== undefined || /^ERR_/.test(error.telemetryCode ?? "")) &&
    error.cause instanceof Error
    ? error.cause
    : undefined;
}
//@ chunk-f3qhjfah.js:27968-28031 placement
function pathSpaceFor(e, n) {
  return e === "workspace" ? toWorkspacePathSpace(n) : PathSpace.system(resolve(n));
}
//@ chunk-f3qhjfah.js:28031-28485 placement
async function probeLocalMarketplacePath(storageV5, n, r = "workspace") {
  if (isDiskless()) throw makeStatEnoentError(n);
  if (!isStorageV5Enabled() || storageV5 === undefined) return stat(n);
  if (n === "") throw makeStatEnoentError(n);
  let stats = await storageV5.hostFiles.stat(pathSpaceFor(r, n), {
    follow: true,
  });
  if (!stats.ok)
    throw (
      storageErrorCause(stats.error) ??
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to probe the local marketplace path ${n}: ${formatStorageError(stats.error)}`,
          "failed to probe a local marketplace path (v5 backend error)",
        ),
        {
          cause: stats.error,
        },
      )
    );
  if (stats.value.kind === "absent") throw makeStatEnoentError(n);
  let a = stats.value.kind === "directory";
  return {
    isDirectory: () => a,
  };
}
//@ chunk-f3qhjfah.js:28485-28838 placement
async function readLocalMarketplaceFile(storage, space, r) {
  if (r === "" || isDiskless())
    return {
      absent: "ENOENT",
    };
  let text = await storage.hostFiles.readText(pathSpaceFor(space, r));
  if (!text.ok)
    throw (
      storageErrorCause(text.error) ??
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to read the marketplace file ${r}: ${formatStorageError(text.error)}`,
          "failed to read a local marketplace file (v5 backend error)",
        ),
        {
          cause: text.error,
        },
      )
    );
  return text.value.found
    ? {
        text: text.value.value,
      }
    : {
        absent: "ENOENT",
      };
}
//@ chunk-f3qhjfah.js:28838-29031 placement
/**
 * 本地市场路径是否存在（v5 存储经 hostFiles.stat）。
 */
async function localMarketplacePathExists(e, n, r = "workspace") {
  if (isDiskless()) return false;
  if (!isStorageV5Enabled() || e === undefined) return pathExists(n);
  if (n === "") return false;
  let stats = await e.hostFiles.stat(pathSpaceFor(r, n), {
    follow: true,
  });
  return stats.ok && stats.value.kind !== "absent";
}
//@ chunk-f3qhjfah.js:29101-29186 placement
var UNSAFE_PATH_EXPLANATION = `is on a network drive, has "." or ".." in its path, or couldn't be checked`;
//@ chunk-f3qhjfah.js:29186-29454 placement
/**
 * 把市场路径解析为绝对路径并判断是否可疑：位于受信根下时只检查尾部；尾部含 . / .. 段直接可疑；否则看是否网络形状或 realpath 不可信。
 */
function classifyMarketplacePath(installPath, { trustedRoots: n = [] } = {}) {
  let r = splitMarketplacePath(installPath, n);
  let { absolute, root, tail } = r;
  if (r.dotSegmentInTail)
    return {
      absolute,
      suspect: true,
    };
  if (root !== undefined) {
    let g = resolve(getOriginalCwd(), root);
    return {
      absolute,
      suspect: pathTraversesFromTrustedRoot(g, tail),
    };
  }
  let suspect = r.networkShapedUnvouched || realpathAllowMissing(absolute);
  return {
    absolute,
    suspect,
  };
}
//@ chunk-f3qhjfah.js:29454-29719 placement
function splitMarketplacePath(e, n) {
  if (e.trim() === "")
    return {
      absolute: e,
      root: undefined,
      tail: e,
      dotSegmentInTail: false,
      networkShapedUnvouched: true,
    };
  let r = resolve(getOriginalCwd(), e);
  let { root, tail } = matchTrustedRoot(e, n);
  return {
    absolute: r,
    root,
    tail,
    dotSegmentInTail: hasDotSegmentAlias(tail),
    networkShapedUnvouched: root === undefined && (isUntrustedLinkPath(e) || isUntrustedLinkPath(r)),
  };
}
//@ chunk-f3qhjfah.js:29719-29760 placement
function trustedPluginRoots(e) {
  return [getPluginsDirectory(), ...getPluginSeedDirs(), ...e];
}
//@ chunk-f3qhjfah.js:29760-30106 placement
/**
 * 找到包含路径且尾部最短的受信根。
 */
function matchTrustedRoot(e, n) {
  let r = passThroughPath(e);
  let s;
  for (let a of trustedPluginRoots(n))
    for (let c of [a, normalize(a)]) {
      let l = passThroughPath(c.replace(/[\\/]+$/, ""));
      if (l === "" || l === ".") continue;
      let g;
      if (r === l) g = "";
      else if (r.startsWith(l + sep) || r.startsWith(l + "/")) g = e.slice(e.length - (r.length - l.length));
      if (g !== undefined && (s === undefined || g.length < s.tail.length))
        s = {
          root: a,
          tail: g,
        };
    }
  return (
    s ?? {
      root: undefined,
      tail: e,
    }
  );
}
//@ chunk-f3qhjfah.js:30106-30208 placement = getReservedShortcuts (1)
function normalizePathForPlatform(e) {
  switch (getPlatform()) {
    case "windows":
      return foldCase_2(passThroughPath(e));
    case "macos":
      return foldCase_2(e);
    default:
      return e;
  }
}
//@ chunk-f3qhjfah.js:30208-30288 placement
/**
 * normalizeMarketplaceInputPath：市场输入路径规范化为绝对可比较路径。
 */
function normalizeMarketplaceInputPath(installPath) {
  if (installPath.trim() === "") return;
  return normalizePathForPlatform(
    toComparablePath(resolve(getOriginalCwd(), installPath), {
      foldCase: true,
    }),
  );
}
//@ chunk-f3qhjfah.js:30288-30484 placement
/**
 * Windows 上判断路径所在盘是否是 WSL 提供。
 */
function wslProviderOfPath(e) {
  if (getPlatform() !== "windows") return;
  let root = parse(e).root;
  let r = (a) => wslLocalhostParts(toUncLongPath(a));
  let s = r(root);
  if (s === undefined) {
    let a = realpathCacheEntry(root);
    if (a === null) return "undeterminable";
    s = r(a);
  }
  return s === undefined
    ? undefined
    : {
        walkRoot: root,
        ...s,
      };
}
//@ chunk-f3qhjfah.js:30484-30648 placement
/**
 * WSL 路径的遍历根与发行版目录。
 */
function wslWalkRootOf(e) {
  let n = wslProviderOfPath(e);
  if (n === undefined || n === "undeterminable") return n;
  return {
    walkRoot: n.walkRoot,
    distroDir: n.rest.replace(/[\\/]+$/, "").replace(/[\\/]+/g, "/"),
  };
}
//@ chunk-f3qhjfah.js:30648-30769 placement
/**
 * Windows/WSL 路径互转。
 */
function toAlternatePlatformPath(installPath, n) {
  return (
    toWslPath(installPath, {
      exactDots: true,
    }) ??
    toWslPathNoop(installPath, {
      exactDots: true,
    }) ??
    (n === undefined ? undefined : toWindowsPathFromWsl(installPath, n.walkRoot, n.distroDir))
  );
}
//@ chunk-f3qhjfah.js:30769-30867 placement
function isWindowsAbsolutePath(e) {
  if (!isAbsolute(e)) return false;
  return getPlatform() !== "windows" || /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(e);
}
//@ chunk-f3qhjfah.js:30867-30996 placement
/**
 * 本地市场源路径规范化。
 */
function normalizeLocalMarketplaceSource(source, n) {
  if (!isLocalMarketplaceSource(source)) return source;
  let r = n === undefined ? expandTildeWithHome(source.path) : expandTildeWith(source.path, n);
  let s = isWindowsAbsolutePath(r) ? resolve(r) : r;
  return s === source.path
    ? source
    : {
        ...source,
        path: s,
      };
}
//@ chunk-f3qhjfah.js:30996-31173 placement = getErrnoPath (1)
function getErrnoPath(marketplaceSource, corroboratingSource) {
  let localSourcePath = getLocalSourcePath(marketplaceSource);
  if (
    localSourcePath === undefined ||
    marketplaceSource === undefined ||
    !isLocalMarketplaceSource(marketplaceSource)
  )
    return [];
  if (
    !(
      corroboratingSource !== undefined &&
      corroboratingSource.source === marketplaceSource.source &&
      "path" in corroboratingSource &&
      corroboratingSource.path === marketplaceSource.path
    ) ||
    !isWindowsAbsolutePath(localSourcePath) ||
    hasDotSegment(localSourcePath)
  )
    return [];
  return [localSourcePath];
}
//@ chunk-f3qhjfah.js:31173-31324 placement = normalizeSource (0.757)
/**
 * 返回本地市场来源的路径（directory → path，file → 其所在目录…），非本地返回 undefined。
 */
function getLocalSourcePath(e) {
  switch (e?.source) {
    case "directory":
      return e.path;
    case "file":
      return basename(dirname(e.path)) === ".claude-plugin" ? dirname(dirname(e.path)) : undefined;
    default:
      return;
  }
}
//@ chunk-f3qhjfah.js:31324-31648 placement
/**
 * Windows 绝对路径插件确实位于本地市场目录内（含 realpath）。
 */
async function isWindowsPluginInsideLocalMarketplace(err, { entrySource, marketplaceLocation, pluginPath }) {
  let localSourcePath = getLocalSourcePath(err);
  if (
    localSourcePath === undefined ||
    typeof entrySource !== "string" ||
    !isWindowsAbsolutePath(localSourcePath) ||
    resolve(marketplaceLocation) !== resolve(localSourcePath) ||
    !isSubpathOf(resolve(localSourcePath), resolve(pluginPath), true) ||
    [localSourcePath, pluginPath].some((g) => hasBackslash(g) || hasDotSegment(g))
  )
    return false;
  let [c, l] = await Promise.all([
    realpath(localSourcePath).catch(() => {
      return;
    }),
    realpath(pluginPath).catch(() => {
      return;
    }),
  ]);
  return c !== undefined && l !== undefined && isSubpathOf(c, l, true);
}
//@ chunk-f3qhjfah.js:31648-31751 placement
/**
 * 插件所在市场的候选路径。
 */
function getMarketplaceCandidatePaths(e, knownMarketplaces, r) {
  let marketplaceSources = getMarketplaceSources(e, knownMarketplaces, r);
  return marketplaceSources === undefined
    ? []
    : getErrnoPath(marketplaceSources.marketplaceSource, marketplaceSources.corroboratingSource);
}
//@ chunk-f3qhjfah.js:31751-31844 placement
/**
 * classifyMarketplacePathOrUndefined：市场路径不在可疑位置时返回绝对路径。
 */
function classifyMarketplacePathOrUndefined(e, n, r) {
  let { absolute, suspect } = classifyMarketplacePath(e, {
    trustedRoots: getErrnoPath(n, r),
  });
  return suspect ? undefined : absolute;
}
//@ chunk-f3qhjfah.js:31844-31969 placement
function formatLocationRefusedMessage(e) {
  return `Marketplace directory refused: its recorded location ${printableOrEmpty(e)} ${UNSAFE_PATH_EXPLANATION}. ${capitalize(MARKETPLACE_SOURCE_FIX_HINTS["network-location"])}.`;
}
//@ chunk-f3qhjfah.js:31969-31995 placement
/**
 * DOT_RELATIVE_RE：以点开头的相对路径片段。
 */
var DOT_RELATIVE_RE = /^\.(?:[\\/]+|$)/;
//@ chunk-f3qhjfah.js:31995-32079 placement
/**
 * isSuspiciousRelativeMarketplacePath：去掉前导点后仍是可疑路径。
 */
function isSuspiciousRelativeMarketplacePath(e) {
  let replaced = e.replace(DOT_RELATIVE_RE, "");
  return (
    replaced !== "" &&
    (isAbsolute(replaced) ||
      hasDotSegmentAlias(replaced) ||
      isUntrustedLinkPath(replaced) ||
      hasBackslash(replaced))
  );
}
//@ chunk-f3qhjfah.js:32079-32181 placement
function resolveEntryPath(marketplaceDir, entrySource) {
  let replaced = entrySource.replace(DOT_RELATIVE_RE, "");
  if (replaced === "") return marketplaceDir;
  if (
    isSuspiciousRelativeMarketplacePath(entrySource) ||
    pathTraversesFromTrustedRoot(marketplaceDir, replaced)
  )
    return;
  return join(marketplaceDir, replaced);
}
//@ chunk-f3qhjfah.js:32181-32353 placement
function formatEntryRefusedMessage(e) {
  return `Plugin source path refused: ${printableName(e, 300)} does not stay inside its marketplace directory. Check that the marketplace entry has a plain relative path.`;
}
//@ chunk-f3qhjfah.js:32353-33312 placement
/**
 * 定位市场目录并解析条目路径：位置不安全 location-refused；目录不存在/读失败 location-missing/location-error； 条目越界 entry-refused。可取身份的目录逐级 lstat 只许普通目录，否则 realpath 校验留在目录内。返回 {kind, marketplaceDir, entryPath}。
 */
async function resolveMarketplaceEntryPath(
  pluginId,
  entrySource,
  { marketplaceSource, corroboratingSource, storageV5, localMarketplaceSpace = "workspace" },
) {
  let location = classifyMarketplacePathOrUndefined(pluginId, marketplaceSource, corroboratingSource);
  if (location === undefined)
    return {
      kind: "location-refused",
    };
  let isDirectory;
  let statError;
  try {
    isDirectory = (
      marketplaceSource !== undefined && isLocalMarketplaceSource(marketplaceSource)
        ? await probeLocalMarketplacePath(storageV5, location, localMarketplaceSpace)
        : await stat(location)
    ).isDirectory();
  } catch (error) {
    statError = error;
  }
  let marketplaceDir = getServerUrl(location, marketplaceSource, isDirectory);
  if (marketplaceDir === undefined)
    return {
      kind: "entry-refused",
      marketplaceDir: dirname(location),
    };
  let entryPath = resolveEntryPath(marketplaceDir, entrySource);
  if (isDirectory === undefined) {
    let errnoCode = getErrnoCode(statError);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
      ? {
          kind: "location-missing",
          error: statError,
          marketplaceDir,
          entryPath,
        }
      : {
          kind: "location-error",
          error: statError,
          marketplaceDir,
          entryPath,
          entryRefusedLexically: isSuspiciousRelativeMarketplacePath(entrySource),
        };
  }
  if (entryPath === undefined)
    return {
      kind: "entry-refused",
      marketplaceDir,
    };
  let identity = await getFileIdentity(marketplaceDir);
  let fe = false;
  if (!identity) {
    for (let P of getErrnoPath(marketplaceSource, corroboratingSource))
      if (isPathWithin(P, marketplaceDir) && !(await getFileIdentity(P))) {
        fe = true;
        break;
      }
  }
  if (!fe) {
    if (identity) {
      if (!(await walkEntryPlainDirectories(marketplaceDir, entrySource)))
        return {
          kind: "entry-refused",
          marketplaceDir,
          cause: "plain-directory-walk",
        };
    } else if (
      !isPathWithin(marketplaceDir, entryPath) ||
      !(await verifyEntryRealpathInside(marketplaceDir, entryPath))
    )
      return {
        kind: "entry-refused",
        marketplaceDir,
      };
  }
  return {
    kind: "ok",
    marketplaceDir,
    entryPath,
  };
}
//@ chunk-f3qhjfah.js:33312-33616 placement = getFileIdentity (1)
async function getFileIdentity(filePath) {
  if (getPlatform() === "windows") return false;
  if (hasBackslash(filePath)) return true;
  let n;
  try {
    n = await stat(filePath, {
      bigint: true,
    });
  } catch {
    return false;
  }
  if (!n.isDirectory()) return false;
  if (n.ino === 0n) return true;
  let r;
  try {
    r = await realpath(filePath);
  } catch {
    return true;
  }
  try {
    let stats = await stat(r, {
      bigint: true,
    });
    return stats.ino === 0n || stats.dev !== n.dev || stats.ino !== n.ino;
  } catch {
    return true;
  }
}
//@ chunk-f3qhjfah.js:33616-34180 placement
/**
 * 逐级 lstat 条目路径，只允许普通目录（不存在视为通过）。
 */
async function walkEntryPlainDirectories(marketplaceDir, entrySource) {
  if (isSuspiciousRelativeMarketplacePath(entrySource)) return false;
  let replaced = entrySource.replace(DOT_RELATIVE_RE, "");
  let s = marketplaceDir;
  for (let a of replaced.split("/").filter(Boolean)) {
    s = join(s, a);
    let c;
    try {
      c = await lstat(s);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return true;
      logForDebugging(
        `Marketplace entry ${printableOrEmpty(s)} refused: lstat failed (${getErrnoCode(error) ?? printableName(errorMessage(error), 160)}) while walking a tree realpath cannot judge`,
      );
      return false;
    }
    if (!c.isDirectory()) {
      logForDebugging(
        `Marketplace entry ${printableOrEmpty(s)} refused: ${c.isSymbolicLink() ? "a symlink" : "not a directory"} under a marketplace directory realpath cannot judge; only plain directories are allowed there`,
      );
      return false;
    }
  }
  return true;
}
//@ chunk-f3qhjfah.js:34180-35057 placement
/**
 * 非 Windows：条目 realpath 后与原路径 stat 的 dev/ino 必须一致且在市场目录内；不存在视为通过，inode 为 0 或无法解析时拒绝并记日志。
 */
async function verifyEntryRealpathInside(marketplaceDir, entryPath) {
  if (getPlatform() === "windows") return true;
  let r = (f) => {
    logForDebugging(
      `Marketplace entry ${printableOrEmpty(entryPath)} refused: ${f} (its declared spelling does not provably open inside ${printableOrEmpty(marketplaceDir)})`,
    );
    return false;
  };
  let s = (error) => getErrnoCode(error) ?? printableName(errorMessage(error), 160);
  let a;
  try {
    a = await realpath(entryPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") return r(`realpath failed (${s(error)})`);
    try {
      await stat(entryPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? true : r(`stat failed (${s(error)})`);
    }
    return r("it exists but realpath cannot resolve it as spelled");
  }
  let c;
  try {
    c = await Promise.all([
      stat(entryPath, {
        bigint: true,
      }),
      stat(a, {
        bigint: true,
      }),
    ]);
  } catch (error) {
    return r(`stat failed (${s(error)})`);
  }
  let [l, g] = c;
  if (l.ino === 0n || g.ino === 0n) return r("the filesystem reports no inode number");
  if (l.dev !== g.dev || l.ino !== g.ino)
    return r(`its spelling opens a different file from the one realpath names (${printableOrEmpty(a)})`);
  if (!isPathWithin(marketplaceDir, a))
    return r(`it opens ${printableOrEmpty(a)}, outside the marketplace directory`);
  return true;
}
//@ chunk-f3qhjfah.js:35057-35470 placement
/**
 * location-refused / entry-refused 的原因文字。
 */
function describeEntryRefusal(kind) {
  return kind === "location-refused"
    ? `its marketplace's recorded location ${UNSAFE_PATH_EXPLANATION}`
    : "its marketplace entry path does not stay inside the marketplace directory (an absolute, climbing, network-shaped, backslash-containing or link-traversing entry, an entry of a fetched marketplace that resolves or opens outside its tree \u2014 or a relative entry in a url-catalog marketplace, which has no local directory)";
}
//@ chunk-f3qhjfah.js:35470-35967 placement
/**
 * 解析结果转 {entryPath, reason}（缺失目录仍给出路径）。
 */
function entryPathOrReasonLenient(pluginEntryPath) {
  switch (pluginEntryPath.kind) {
    case "ok":
    case "location-missing":
      return pluginEntryPath.entryPath === undefined
        ? {
            entryPath: undefined,
            reason: describeEntryRefusal("entry-refused"),
          }
        : {
            entryPath: pluginEntryPath.entryPath,
          };
    case "location-error":
      return pluginEntryPath.entryPath !== undefined
        ? {
            entryPath: pluginEntryPath.entryPath,
          }
        : pluginEntryPath.entryRefusedLexically
          ? {
              entryPath: undefined,
              reason: describeEntryRefusal("entry-refused"),
            }
          : {
              entryPath: undefined,
              reason: `its marketplace directory could not be examined (${getErrnoCode(pluginEntryPath.error) ?? "unknown error"})`,
            };
    case "location-refused":
    case "entry-refused":
      return {
        entryPath: undefined,
        reason: describeEntryRefusal(pluginEntryPath.kind),
      };
  }
}
//@ chunk-f3qhjfah.js:35967-36357 placement
/**
 * 解析结果转 {entryPath, reason}。
 */
function entryPathOrReason(pluginEntryPath) {
  switch (pluginEntryPath.kind) {
    case "ok":
      return {
        entryPath: pluginEntryPath.entryPath,
      };
    case "location-missing":
      return {
        entryPath: undefined,
        reason: "its marketplace directory does not exist",
      };
    case "location-error":
      return {
        entryPath: undefined,
        reason: `its marketplace directory could not be examined (${getErrnoCode(pluginEntryPath.error) ?? "unknown error"})`,
      };
    case "location-refused":
    case "entry-refused":
      return {
        entryPath: undefined,
        reason: describeEntryRefusal(pluginEntryPath.kind),
      };
  }
}
//@ chunk-f3qhjfah.js:36357-36512 placement
/**
 * 按插件 id 取市场来源后解析条目路径。
 */
async function resolvePluginEntryPath(
  e,
  marketplaceInstallLocation,
  source,
  s,
  a,
  storageV5,
  localMarketplaceSpace,
) {
  return resolveMarketplaceEntryPath(marketplaceInstallLocation, source, {
    ...(getMarketplaceSources(e, s, a) ?? {
      marketplaceSource: undefined,
      corroboratingSource: undefined,
    }),
    storageV5,
    localMarketplaceSpace,
  });
}
//@ chunk-f3qhjfah.js:36512-36718 placement
function getMarketplaceSources(e, n, r) {
  let { marketplace } = parsePluginIdentifier(e);
  if (!marketplace) return;
  let source = Object.hasOwn(r, marketplace) ? r[marketplace]?.source : undefined;
  return {
    marketplaceSource:
      (n !== undefined && Object.hasOwn(n, marketplace) ? n[marketplace]?.source : undefined) ?? source,
    corroboratingSource: source,
  };
}
//@ chunk-f3qhjfah.js:36718-36752 placement
var MARKETPLACE_JSON_RE = /[\\/]marketplace\.json$/i;
//@ chunk-f3qhjfah.js:36752-36899 placement = getServerUrl (1)
function getServerUrl(location, marketplaceSource, isDirectory) {
  if (isDirectory === true) return location;
  if (marketplaceSource?.source === "url" || (marketplaceSource === undefined && /\.json$/i.test(location)))
    return isDirectory === false ? undefined : location;
  return isDirectory === false || MARKETPLACE_JSON_RE.test(location) ? dirname(location) : location;
}
//@ chunk-f3qhjfah.js:36899-37423 placement
/**
 * 解析失败转 {code, message}。
 */
function entryResolutionError(e, marketplaceInstallLocation, source) {
  switch (e.kind) {
    case "location-refused":
      return {
        code: "marketplace_location_refused",
        message: formatLocationRefusedMessage(marketplaceInstallLocation),
      };
    case "location-missing":
      return {
        code: "marketplace_dir_missing",
        message: `Marketplace directory not found at path: ${printableOrEmpty(marketplaceInstallLocation)}`,
      };
    case "location-error":
      return {
        code: "marketplace_dir_unreadable",
        message: `Marketplace directory could not be read at path: ${printableOrEmpty(marketplaceInstallLocation)} (${getErrnoCode(e.error) ?? "unknown error"})`,
      };
    case "entry-refused":
      return {
        code: "marketplace_entry_path_refused",
        message:
          formatEntryRefusedMessage(source) +
          (e.cause === "plain-directory-walk" ? PLAIN_DIRECTORY_WALK_NOTE : ""),
      };
  }
}
//@ chunk-f3qhjfah.js:37423-37714 placement
var PLAIN_DIRECTORY_WALK_NOTE =
  " The marketplace directory's own path cannot be resolved reliably on this platform (for example, a backslash in one of its components), so only plain directories are accepted as entries there (no links); move the marketplace (or the plugins directory) to a plain path to lift that.";
//@ chunk-f3qhjfah.js:37831-37917 placement = setCwdState (1)
function normalizeRegistryKey(cwd) {
  let normalized = resolve(cwd).normalize("NFC");
  return getPlatform() === "windows" ? normalized.toLowerCase() : normalized;
}
//@ chunk-f3qhjfah.js:37917-38283 placement
/**
 * 读小 JSON 对象注册表，逐项校验，键规范化。
 */
function parseJsonRegistryFile(e, n, r, s) {
  let a = new Map();
  if (Buffer.byteLength(n) > r) {
    logForDebugging(`Ignoring ${e}: larger than the size cap`);
    return a;
  }
  let c;
  try {
    c = jsonParse(n);
  } catch {
    logForDebugging(`Ignoring ${e}: not valid JSON`);
    return a;
  }
  if (typeof c !== "object" || c === null || Array.isArray(c)) {
    logForDebugging(`Ignoring ${e}: not a JSON object`);
    return a;
  }
  for (let [key, value] of Object.entries(c)) {
    let f = s(value);
    if (f !== undefined) a.set(normalizeRegistryKey(key), f);
  }
  return a;
}
export {
  resolvePluginEntryPath,
  entryPathOrReason,
  normalizeMarketplaceInputPath,
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
  classifyMarketplacePathOrUndefined,
  DOT_RELATIVE_RE,
  isSuspiciousRelativeMarketplacePath,
  isWindowsAbsolutePath,
  getLocalSourcePath,
  entryPathOrReasonLenient,
  wslProviderOfPath,
};
