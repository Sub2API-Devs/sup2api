/**
 * utils/plugins/localMarketplacePaths.ts
 *
 * 2.1.316 新增：本地 marketplace 路径：探测与读取 marketplace 文件，校验插件源留在目录内（拒绝符号链接逃逸）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5s0qaz1x.js (45)
 * attribution: placement 45
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, resolve, sep, normalize, parse, basename, dirname, join } from "path";
import { stat as stat_2, realpath, lstat } from "fs/promises";
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
import { isLocalMarketplaceSource } from "./schemas.js";
import { isSubpathOf } from "../pathPrefix.js";
import { printableOrEmpty, printableName } from "../printableName.js";
import { capitalize } from "../stringUtils.js";
import { MARKETPLACE_SOURCE_FIX_HINTS } from "./marketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { jsonParse } from "../slowOperations.js";

//@ chunk-5s0qaz1x.js:27641-27747 placement
function toWorkspacePathSpace(path) {
  if (isAbsolute(path)) return PathSpace.workspace(path);
  return PathSpace.workspace(
    getPlatform() === "windows" ? resolve(path) : getFsImplementation().cwd() + sep + path,
  );
}
//@ chunk-5s0qaz1x.js:27747-27914 placement
function makeStatEnoentError(path) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, stat '${path}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "stat",
      path,
    },
  );
}
//@ chunk-5s0qaz1x.js:27914-28082 placement
function enoentError(path) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, open '${path}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "open",
      path,
    },
  );
}
//@ chunk-5s0qaz1x.js:28082-28230 placement
function storageErrorCause(error) {
  return error.code === "Failed" &&
    (errnoShapedCode(error.telemetryCode) !== undefined || /^ERR_/.test(error.telemetryCode ?? "")) &&
    error.cause instanceof Error
    ? error.cause
    : undefined;
}
//@ chunk-5s0qaz1x.js:28230-28293 placement
function pathSpaceFor(space, path) {
  return space === "workspace" ? toWorkspacePathSpace(path) : PathSpace.system(resolve(path));
}
//@ chunk-5s0qaz1x.js:28293-28747 placement
async function probeLocalMarketplacePath(storageV5, path, space = "workspace") {
  if (isDiskless()) throw makeStatEnoentError(path);
  if (!isStorageV5Enabled() || storageV5 === undefined) return stat_2(path);
  if (path === "") throw makeStatEnoentError(path);
  let stats = await storageV5.hostFiles.stat(pathSpaceFor(space, path), {
    follow: true,
  });
  if (!stats.ok)
    throw (
      storageErrorCause(stats.error) ??
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to probe the local marketplace path ${path}: ${formatStorageError(stats.error)}`,
          "failed to probe a local marketplace path (v5 backend error)",
        ),
        {
          cause: stats.error,
        },
      )
    );
  if (stats.value.kind === "absent") throw makeStatEnoentError(path);
  let isDirectory = stats.value.kind === "directory";
  return {
    isDirectory: () => isDirectory,
  };
}
//@ chunk-5s0qaz1x.js:28747-29100 placement
async function readLocalMarketplaceFile(storage, space, path) {
  if (path === "" || isDiskless())
    return {
      absent: "ENOENT",
    };
  let text = await storage.hostFiles.readText(pathSpaceFor(space, path));
  if (!text.ok)
    throw (
      storageErrorCause(text.error) ??
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to read the marketplace file ${path}: ${formatStorageError(text.error)}`,
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
//@ chunk-5s0qaz1x.js:29100-29293 placement
/**
 * 本地市场路径是否存在（v5 存储经 hostFiles.stat）。
 */
async function localMarketplacePathExists(storageV5, path, space = "workspace") {
  if (isDiskless()) return false;
  if (!isStorageV5Enabled() || storageV5 === undefined) return pathExists(path);
  if (path === "") return false;
  let stats = await storageV5.hostFiles.stat(pathSpaceFor(space, path), {
    follow: true,
  });
  return stats.ok && stats.value.kind !== "absent";
}
//@ chunk-5s0qaz1x.js:29363-29448 placement
var UNSAFE_PATH_EXPLANATION = `is on a network drive, has "." or ".." in its path, or couldn't be checked`;
//@ chunk-5s0qaz1x.js:29448-29716 placement
/**
 * 把市场路径解析为绝对路径并判断是否可疑：位于受信根下时只检查尾部；尾部含 . / .. 段直接可疑；否则看是否网络形状或 realpath 不可信。
 */
function classifyMarketplacePath(installPath, { trustedRoots = [] } = {}) {
  let parts = splitMarketplacePath(installPath, trustedRoots);
  let { absolute, root, tail } = parts;
  if (parts.dotSegmentInTail)
    return {
      absolute,
      suspect: true,
    };
  if (root !== undefined) {
    let rootPath = resolve(getOriginalCwd(), root);
    return {
      absolute,
      suspect: pathTraversesFromTrustedRoot(rootPath, tail),
    };
  }
  let suspect = parts.networkShapedUnvouched || realpathAllowMissing(absolute);
  return {
    absolute,
    suspect,
  };
}
//@ chunk-5s0qaz1x.js:29716-29981 placement
function splitMarketplacePath(installPath, trustedRoots) {
  if (installPath.trim() === "")
    return {
      absolute: installPath,
      root: undefined,
      tail: installPath,
      dotSegmentInTail: false,
      networkShapedUnvouched: true,
    };
  let absolute = resolve(getOriginalCwd(), installPath);
  let { root, tail } = matchTrustedRoot(installPath, trustedRoots);
  return {
    absolute,
    root,
    tail,
    dotSegmentInTail: hasDotSegmentAlias(tail),
    networkShapedUnvouched:
      root === undefined && (isUntrustedLinkPath(installPath) || isUntrustedLinkPath(absolute)),
  };
}
//@ chunk-5s0qaz1x.js:29981-30022 placement
function trustedPluginRoots(extraRoots) {
  return [getPluginsDirectory(), ...getPluginSeedDirs(), ...extraRoots];
}
//@ chunk-5s0qaz1x.js:30022-30368 placement
/**
 * 找到包含路径且尾部最短的受信根。
 */
function matchTrustedRoot(path, extraRoots) {
  let normalized = passThroughPath(path);
  let best;
  for (let root of trustedPluginRoots(extraRoots))
    for (let rootVariant of [root, normalize(root)]) {
      let rootNormalized = passThroughPath(rootVariant.replace(/[\\/]+$/, ""));
      if (rootNormalized === "" || rootNormalized === ".") continue;
      let tail;
      if (normalized === rootNormalized) tail = "";
      else if (normalized.startsWith(rootNormalized + sep) || normalized.startsWith(rootNormalized + "/"))
        tail = path.slice(path.length - (normalized.length - rootNormalized.length));
      if (tail !== undefined && (best === undefined || tail.length < best.tail.length))
        best = {
          root,
          tail,
        };
    }
  return (
    best ?? {
      root: undefined,
      tail: path,
    }
  );
}
//@ chunk-5s0qaz1x.js:30368-30470 placement (2.1.88 match: getReservedShortcuts, 1)
function normalizePathForPlatform(path) {
  switch (getPlatform()) {
    case "windows":
      return foldCase_2(passThroughPath(path));
    case "macos":
      return foldCase_2(path);
    default:
      return path;
  }
}
//@ chunk-5s0qaz1x.js:30470-30550 placement
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
//@ chunk-5s0qaz1x.js:30550-30746 placement
/**
 * Windows 上判断路径所在盘是否是 WSL 提供。
 */
function wslProviderOfPath(path) {
  if (getPlatform() !== "windows") return;
  let root = parse(path).root;
  let parseUnc = (candidate) => wslLocalhostParts(toUncLongPath(candidate));
  let parts = parseUnc(root);
  if (parts === undefined) {
    let realRoot = realpathCacheEntry(root);
    if (realRoot === null) return "undeterminable";
    parts = parseUnc(realRoot);
  }
  return parts === undefined
    ? undefined
    : {
        walkRoot: root,
        ...parts,
      };
}
//@ chunk-5s0qaz1x.js:30746-30910 placement
/**
 * WSL 路径的遍历根与发行版目录。
 */
function wslWalkRootOf(path) {
  let info = wslProviderOfPath(path);
  if (info === undefined || info === "undeterminable") return info;
  return {
    walkRoot: info.walkRoot,
    distroDir: info.rest.replace(/[\\/]+$/, "").replace(/[\\/]+/g, "/"),
  };
}
//@ chunk-5s0qaz1x.js:30910-31031 placement
/**
 * Windows/WSL 路径互转。
 */
function toAlternatePlatformPath(inputPath, walkRoot) {
  return (
    toWslPath(inputPath, {
      exactDots: true,
    }) ??
    toWslPathNoop(inputPath, {
      exactDots: true,
    }) ??
    (walkRoot === undefined
      ? undefined
      : toWindowsPathFromWsl(inputPath, walkRoot.walkRoot, walkRoot.distroDir))
  );
}
//@ chunk-5s0qaz1x.js:31031-31129 placement
function isWindowsAbsolutePath(path) {
  if (!isAbsolute(path)) return false;
  return getPlatform() !== "windows" || /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(path);
}
//@ chunk-5s0qaz1x.js:31129-31258 placement
/**
 * 本地市场源路径规范化。
 */
function normalizeLocalMarketplaceSource(source, home) {
  if (!isLocalMarketplaceSource(source)) return source;
  let expanded = home === undefined ? expandTildeWithHome(source.path) : expandTildeWith(source.path, home);
  let normalized = isWindowsAbsolutePath(expanded) ? resolve(expanded) : expanded;
  return normalized === source.path
    ? source
    : {
        ...source,
        path: normalized,
      };
}
//@ chunk-5s0qaz1x.js:31258-31435 placement (2.1.88 match: getErrnoPath, 1)
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
//@ chunk-5s0qaz1x.js:31435-31586 placement (2.1.88 match: normalizeSource, 0.757)
/**
 * 返回本地市场来源的路径（directory → path，file → 其所在目录…），非本地返回 undefined。
 */
function getLocalSourcePath(source) {
  switch (source?.source) {
    case "directory":
      return source.path;
    case "file":
      return basename(dirname(source.path)) === ".claude-plugin" ? dirname(dirname(source.path)) : undefined;
    default:
      return;
  }
}
//@ chunk-5s0qaz1x.js:31586-31910 placement
/**
 * Windows 绝对路径插件确实位于本地市场目录内（含 realpath）。
 */
async function isWindowsPluginInsideLocalMarketplace(
  source,
  { entrySource, marketplaceLocation, pluginPath },
) {
  let localSourcePath = getLocalSourcePath(source);
  if (
    localSourcePath === undefined ||
    typeof entrySource !== "string" ||
    !isWindowsAbsolutePath(localSourcePath) ||
    resolve(marketplaceLocation) !== resolve(localSourcePath) ||
    !isSubpathOf(resolve(localSourcePath), resolve(pluginPath), true) ||
    [localSourcePath, pluginPath].some((path) => hasBackslash(path) || hasDotSegment(path))
  )
    return false;
  let [realSource, realPlugin] = await Promise.all([
    realpath(localSourcePath).catch(() => {
      return;
    }),
    realpath(pluginPath).catch(() => {
      return;
    }),
  ]);
  return realSource !== undefined && realPlugin !== undefined && isSubpathOf(realSource, realPlugin, true);
}
//@ chunk-5s0qaz1x.js:31910-32013 placement
/**
 * 插件所在市场的候选路径。
 */
function getMarketplaceCandidatePaths(pluginId, knownMarketplaces, corroboratingMarketplaces) {
  let marketplaceSources = getMarketplaceSources(pluginId, knownMarketplaces, corroboratingMarketplaces);
  return marketplaceSources === undefined
    ? []
    : getErrnoPath(marketplaceSources.marketplaceSource, marketplaceSources.corroboratingSource);
}
//@ chunk-5s0qaz1x.js:32013-32106 placement
/**
 * classifyMarketplacePathOrUndefined：市场路径不在可疑位置时返回绝对路径。
 */
function classifyMarketplacePathOrUndefined(pluginId, marketplaceSource, corroboratingSource) {
  let { absolute, suspect } = classifyMarketplacePath(pluginId, {
    trustedRoots: getErrnoPath(marketplaceSource, corroboratingSource),
  });
  return suspect ? undefined : absolute;
}
//@ chunk-5s0qaz1x.js:32106-32231 placement
function formatLocationRefusedMessage(location) {
  return `Marketplace directory refused: its recorded location ${printableOrEmpty(location)} ${UNSAFE_PATH_EXPLANATION}. ${capitalize(MARKETPLACE_SOURCE_FIX_HINTS["network-location"])}.`;
}
//@ chunk-5s0qaz1x.js:32231-32257 placement
/**
 * DOT_RELATIVE_RE：以点开头的相对路径片段。
 */
var DOT_RELATIVE_RE = /^\.(?:[\\/]+|$)/;
//@ chunk-5s0qaz1x.js:32257-32341 placement
/**
 * isSuspiciousRelativeMarketplacePath：去掉前导点后仍是可疑路径。
 */
function isSuspiciousRelativeMarketplacePath(entrySource) {
  let replaced = entrySource.replace(DOT_RELATIVE_RE, "");
  return (
    replaced !== "" &&
    (isAbsolute(replaced) ||
      hasDotSegmentAlias(replaced) ||
      isUntrustedLinkPath(replaced) ||
      hasBackslash(replaced))
  );
}
//@ chunk-5s0qaz1x.js:32341-32443 placement
function resolveEntryPath(rootPath, entrySource) {
  let restPath = entrySource.replace(DOT_RELATIVE_RE, "");
  if (restPath === "") return rootPath;
  if (isSuspiciousRelativeMarketplacePath(entrySource) || pathTraversesFromTrustedRoot(rootPath, restPath))
    return;
  return join(rootPath, restPath);
}
//@ chunk-5s0qaz1x.js:32443-32615 placement
function formatEntryRefusedMessage(entrySource) {
  return `Plugin source path refused: ${printableName(entrySource, 300)} does not stay inside its marketplace directory. Check that the marketplace entry has a plain relative path.`;
}
//@ chunk-5s0qaz1x.js:32615-33574 placement
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
        : await stat_2(location)
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
  let skipRealpath = false;
  if (!identity) {
    for (let path of getErrnoPath(marketplaceSource, corroboratingSource))
      if (isPathWithin(path, marketplaceDir) && !(await getFileIdentity(path))) {
        skipRealpath = true;
        break;
      }
  }
  if (!skipRealpath) {
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
//@ chunk-5s0qaz1x.js:33574-33878 placement (2.1.88 match: getFileIdentity, 1)
async function getFileIdentity(filePath) {
  if (getPlatform() === "windows") return false;
  if (hasBackslash(filePath)) return true;
  let stat;
  try {
    stat = await stat_2(filePath, {
      bigint: true,
    });
  } catch {
    return false;
  }
  if (!stat.isDirectory()) return false;
  if (stat.ino === 0n) return true;
  let real;
  try {
    real = await realpath(filePath);
  } catch {
    return true;
  }
  try {
    let stats = await stat_2(real, {
      bigint: true,
    });
    return stats.ino === 0n || stats.dev !== stat.dev || stats.ino !== stat.ino;
  } catch {
    return true;
  }
}
//@ chunk-5s0qaz1x.js:33878-34442 placement
/**
 * 逐级 lstat 条目路径，只允许普通目录（不存在视为通过）。
 */
async function walkEntryPlainDirectories(marketplaceDir, entrySource) {
  if (isSuspiciousRelativeMarketplacePath(entrySource)) return false;
  let replaced = entrySource.replace(DOT_RELATIVE_RE, "");
  let current = marketplaceDir;
  for (let segment of replaced.split("/").filter(Boolean)) {
    current = join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return true;
      logForDebugging(
        `Marketplace entry ${printableOrEmpty(current)} refused: lstat failed (${getErrnoCode(error) ?? printableName(errorMessage(error), 160)}) while walking a tree realpath cannot judge`,
      );
      return false;
    }
    if (!stat.isDirectory()) {
      logForDebugging(
        `Marketplace entry ${printableOrEmpty(current)} refused: ${stat.isSymbolicLink() ? "a symlink" : "not a directory"} under a marketplace directory realpath cannot judge; only plain directories are allowed there`,
      );
      return false;
    }
  }
  return true;
}
//@ chunk-5s0qaz1x.js:34442-35319 placement
/**
 * 非 Windows：条目 realpath 后与原路径 stat 的 dev/ino 必须一致且在市场目录内；不存在视为通过，inode 为 0 或无法解析时拒绝并记日志。
 */
async function verifyEntryRealpathInside(marketplaceDir, entryPath) {
  if (getPlatform() === "windows") return true;
  let refuse = (reason) => {
    logForDebugging(
      `Marketplace entry ${printableOrEmpty(entryPath)} refused: ${reason} (its declared spelling does not provably open inside ${printableOrEmpty(marketplaceDir)})`,
    );
    return false;
  };
  let errnoText = (error) => getErrnoCode(error) ?? printableName(errorMessage(error), 160);
  let real;
  try {
    real = await realpath(entryPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
      return refuse(`realpath failed (${errnoText(error)})`);
    try {
      await stat_2(entryPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
        ? true
        : refuse(`stat failed (${errnoText(error)})`);
    }
    return refuse("it exists but realpath cannot resolve it as spelled");
  }
  let stats;
  try {
    stats = await Promise.all([
      stat_2(entryPath, {
        bigint: true,
      }),
      stat_2(real, {
        bigint: true,
      }),
    ]);
  } catch (error) {
    return refuse(`stat failed (${errnoText(error)})`);
  }
  let [declaredStat, realStat] = stats;
  if (declaredStat.ino === 0n || realStat.ino === 0n) return refuse("the filesystem reports no inode number");
  if (declaredStat.dev !== realStat.dev || declaredStat.ino !== realStat.ino)
    return refuse(
      `its spelling opens a different file from the one realpath names (${printableOrEmpty(real)})`,
    );
  if (!isPathWithin(marketplaceDir, real))
    return refuse(`it opens ${printableOrEmpty(real)}, outside the marketplace directory`);
  return true;
}
//@ chunk-5s0qaz1x.js:35319-35732 placement
/**
 * location-refused / entry-refused 的原因文字。
 */
function describeEntryRefusal(kind) {
  return kind === "location-refused"
    ? `its marketplace's recorded location ${UNSAFE_PATH_EXPLANATION}`
    : "its marketplace entry path does not stay inside the marketplace directory (an absolute, climbing, network-shaped, backslash-containing or link-traversing entry, an entry of a fetched marketplace that resolves or opens outside its tree \u2014 or a relative entry in a url-catalog marketplace, which has no local directory)";
}
//@ chunk-5s0qaz1x.js:35732-36229 placement
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
//@ chunk-5s0qaz1x.js:36229-36619 placement
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
//@ chunk-5s0qaz1x.js:36619-36774 placement
/**
 * 按插件 id 取市场来源后解析条目路径。
 */
async function resolvePluginEntryPath(
  pluginId,
  marketplaceInstallLocation,
  source,
  knownMarketplaces,
  marketplaces,
  storageV5,
  localMarketplaceSpace,
) {
  return resolveMarketplaceEntryPath(marketplaceInstallLocation, source, {
    ...(getMarketplaceSources(pluginId, knownMarketplaces, marketplaces) ?? {
      marketplaceSource: undefined,
      corroboratingSource: undefined,
    }),
    storageV5,
    localMarketplaceSpace,
  });
}
//@ chunk-5s0qaz1x.js:36774-36980 placement
function getMarketplaceSources(pluginId, knownMarketplaces, marketplaces) {
  let { marketplace } = parsePluginIdentifier(pluginId);
  if (!marketplace) return;
  let source = Object.hasOwn(marketplaces, marketplace) ? marketplaces[marketplace]?.source : undefined;
  return {
    marketplaceSource:
      (knownMarketplaces !== undefined && Object.hasOwn(knownMarketplaces, marketplace)
        ? knownMarketplaces[marketplace]?.source
        : undefined) ?? source,
    corroboratingSource: source,
  };
}
//@ chunk-5s0qaz1x.js:36980-37014 placement
var MARKETPLACE_JSON_RE = /[\\/]marketplace\.json$/i;
//@ chunk-5s0qaz1x.js:37014-37161 placement (2.1.88 match: getServerUrl, 1)
function getServerUrl(location, marketplaceSource, isDirectory) {
  if (isDirectory === true) return location;
  if (marketplaceSource?.source === "url" || (marketplaceSource === undefined && /\.json$/i.test(location)))
    return isDirectory === false ? undefined : location;
  return isDirectory === false || MARKETPLACE_JSON_RE.test(location) ? dirname(location) : location;
}
//@ chunk-5s0qaz1x.js:37161-37685 placement
/**
 * 解析失败转 {code, message}。
 */
function entryResolutionError(resolution, marketplaceInstallLocation, source) {
  switch (resolution.kind) {
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
        message: `Marketplace directory could not be read at path: ${printableOrEmpty(marketplaceInstallLocation)} (${getErrnoCode(resolution.error) ?? "unknown error"})`,
      };
    case "entry-refused":
      return {
        code: "marketplace_entry_path_refused",
        message:
          formatEntryRefusedMessage(source) +
          (resolution.cause === "plain-directory-walk" ? PLAIN_DIRECTORY_WALK_NOTE : ""),
      };
  }
}
//@ chunk-5s0qaz1x.js:37685-37976 placement
var PLAIN_DIRECTORY_WALK_NOTE =
  " The marketplace directory's own path cannot be resolved reliably on this platform (for example, a backslash in one of its components), so only plain directories are accepted as entries there (no links); move the marketplace (or the plugins directory) to a plain path to lift that.";
//@ chunk-5s0qaz1x.js:38093-38179 placement (2.1.88 match: setCwdState, 1)
function normalizeRegistryKey(cwd) {
  let normalized = resolve(cwd).normalize("NFC");
  return getPlatform() === "windows" ? normalized.toLowerCase() : normalized;
}
//@ chunk-5s0qaz1x.js:38179-38545 placement
/**
 * 读小 JSON 对象注册表，逐项校验，键规范化。
 */
function parseJsonRegistryFile(fileName, text, maxBytes, parseEntry) {
  let entries = new Map();
  if (Buffer.byteLength(text) > maxBytes) {
    logForDebugging(`Ignoring ${fileName}: larger than the size cap`);
    return entries;
  }
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    logForDebugging(`Ignoring ${fileName}: not valid JSON`);
    return entries;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    logForDebugging(`Ignoring ${fileName}: not a JSON object`);
    return entries;
  }
  for (let [key, value] of Object.entries(parsed)) {
    let entry = parseEntry(value);
    if (entry !== undefined) entries.set(normalizeRegistryKey(key), entry);
  }
  return entries;
}
export {
  wslProviderOfPath,
  classifyMarketplacePath,
  getMarketplaceCandidatePaths,
  UNSAFE_PATH_EXPLANATION,
  isWindowsPluginInsideLocalMarketplace,
  resolveMarketplaceEntryPath,
  entryResolutionError,
  localMarketplacePathExists,
  normalizeRegistryKey,
  wslWalkRootOf,
  normalizePathForPlatform,
  toAlternatePlatformPath,
  normalizeLocalMarketplaceSource,
  normalizeMarketplaceInputPath,
  readLocalMarketplaceFile,
  enoentError,
  parseJsonRegistryFile,
  classifyMarketplacePathOrUndefined,
  DOT_RELATIVE_RE,
  isSuspiciousRelativeMarketplacePath,
  isWindowsAbsolutePath,
  getLocalSourcePath,
  resolvePluginEntryPath,
  entryPathOrReason,
  entryPathOrReasonLenient,
  probeLocalMarketplacePath,
};
