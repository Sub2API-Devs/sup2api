/**
 * utils/plugins/pluginCachePaths.ts
 *
 * 2.1.316 新增：插件缓存与命令生成目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v80cqab4.js (20)
 * attribution: placement 20
 */
import { normalize, sep, resolve, join, isAbsolute } from "path";
import { statSync, readFileSync } from "fs";
import { getSessionPathsCache } from "../sessionPathsCache.js";
import { foldName } from "../permissions/protectedDirNames.js";
import {
  getOriginalCwd,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  isDiskless,
} from "../../bootstrap/state.js";
import { getPluginsDirectory, getPluginSeedDirs } from "./pluginDirectories.js";
import { uniq } from "../collections.js";
import { getClaudeConfigDir } from "../envUtils.js";
import {
  traversesOrResolvesUntrustedLink,
  isUntrustedLinkPath,
  toWslPathNoop,
  toWindowsPathFromWsl,
  neverAllowsLocalWsl,
  toWslPath,
} from "../pathResolution.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  toComparablePath,
  isPathWithin,
  isUncOrDeviceSpelling,
  stripWin32DevicePrefix,
} from "../fsJunctions.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { devModsDir } from "../../plugins/functionHooks/devModsName.js";
import { isNetworkOrSpecialPath, isWslUncPath, wslLocalhostParts } from "../networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../log.js";
import { createLazySignal } from "../signal.js";
import { wslProviderOfPath } from "./localMarketplacePaths.js";
import { hasDotSegment_2 } from "../pathClassification.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v80cqab4.js:778-851 placement
function isFreshTimestamp(mtimeMs, windowMs, now = Date.now()) {
  return Number.isFinite(mtimeMs) && Math.abs(now - mtimeMs) < windowMs;
}
//@ chunk-v80cqab4.js:893-904 placement
var MAX_PLUGIN_CACHE_READ = 1024;
//@ chunk-v80cqab4.js:904-1056 placement
function foldPathSegments(path) {
  let foldedSegmentsBySpelling = getSessionPathsCache().foldedSegmentsBySpelling;
  let folded = foldedSegmentsBySpelling.get(path);
  if (folded === undefined) {
    folded = normalize(path).split(sep).map(foldName).join(sep);
    if (foldedSegmentsBySpelling.size >= MAX_PLUGIN_CACHE_READ) foldedSegmentsBySpelling.clear();
    foldedSegmentsBySpelling.set(path, folded);
  }
  return folded;
}
//@ chunk-v80cqab4.js:1056-1072 placement
var PLUGIN_CACHE_DIRNAME = "cache";
//@ chunk-v80cqab4.js:1072-1106 placement
function projectPluginsDir() {
  return resolve(getOriginalCwd(), getPluginsDirectory());
}
//@ chunk-v80cqab4.js:1106-1140 placement
function projectPluginCacheDir() {
  return join(projectPluginsDir(), PLUGIN_CACHE_DIRNAME);
}
//@ chunk-v80cqab4.js:1140-1243 placement
function pluginRootDirs() {
  return uniq([
    resolve(getClaudeConfigDir(), "plugins"),
    resolve(getClaudeConfigDir(), "cowork_plugins"),
    projectPluginsDir(),
    ...getPluginSeedDirs().map((seedDir) => resolve(getOriginalCwd(), seedDir)),
  ]);
}
//@ chunk-v80cqab4.js:1243-1306 placement
function commandProducerDirs() {
  return uniq(
    [...getInlinePlugins(), ...getInlinePluginsNoMcp()].map((dir) => resolve(getOriginalCwd(), dir)),
  );
}
//@ chunk-v80cqab4.js:1306-1711 placement
function isInCommandProducerDir(absolutePath) {
  let roots = commandProducerDirs();
  if (roots.length === 0) return false;
  if (traversesOrResolvesUntrustedLink(absolutePath, PLUGIN_CACHE_RESOLVE_OPTIONS)) return true;
  let joined = roots.join("\x00");
  let pluginRegistry = getPluginRegistry();
  let inlinePluginRootsComparableMemo = pluginRegistry.inlinePluginRootsComparableMemo;
  if (
    inlinePluginRootsComparableMemo?.roots !== joined ||
    !isFreshTimestamp(inlinePluginRootsComparableMemo.at, PLUGIN_CACHE_TTL_MS)
  ) {
    inlinePluginRootsComparableMemo = {
      roots: joined,
      comparable: roots.map((root) =>
        toComparablePath(root, {
          foldCase: true,
          knownNotSuspect: !traversesOrResolvesUntrustedLink(root, PLUGIN_CACHE_RESOLVE_OPTIONS),
        }),
      ),
      at: Date.now(),
    };
    pluginRegistry.inlinePluginRootsComparableMemo = inlinePluginRootsComparableMemo;
  }
  let comparablePath = toComparablePath(absolutePath, {
    foldCase: true,
    knownNotSuspect: true,
  });
  return inlinePluginRootsComparableMemo.comparable.some((root) =>
    isPathWithin(root, comparablePath, {
      alreadyComparable: true,
    }),
  );
}
//@ chunk-v80cqab4.js:1711-1762 placement
var PLUGIN_CACHE_TTL_MS = 30000;
var PLUGIN_CACHE_RESOLVE_OPTIONS = {
  allowLocalWsl: true,
  eisdirIsFolder: true,
};
//@ chunk-v80cqab4.js:1762-2060 placement
function isPluginDirReadable(absolutePath) {
  if (isDiskless()) return true;
  let pathsForPermissionCheck = getPathsForPermissionCheck(resolve(devModsDir()));
  let foldedPath = foldPathSegments(resolve(absolutePath));
  if (
    pathsForPermissionCheck
      .map(foldPathSegments)
      .some((allowed) => foldedPath === allowed || foldedPath.startsWith(allowed + sep))
  )
    return true;
  let suspectSpelling = isUncOrDeviceSpelling(absolutePath) || isUntrustedLinkPath(absolutePath);
  let knownNotSuspect =
    !isNetworkOrSpecialPath(absolutePath) && (!suspectSpelling || isWslUncPath(absolutePath));
  if (knownNotSuspect && traversesOrResolvesUntrustedLink(absolutePath, PLUGIN_CACHE_RESOLVE_OPTIONS))
    return true;
  let comparablePath = toComparablePath(absolutePath, {
    foldCase: true,
    knownNotSuspect,
  });
  return pathsForPermissionCheck.some((allowed) =>
    isPathWithin(
      toComparablePath(allowed, {
        foldCase: true,
      }),
      comparablePath,
      {
        alreadyComparable: true,
      },
    ),
  );
}
//@ chunk-v80cqab4.js:2165-2404 placement
var MAX_SOURCE_RECORD_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CommandSourceRecordSchema;
deferInit("chunk-v80cqab4.js:2165", () => {
  MAX_SOURCE_RECORD_BYTES = 4194304;
  CommandSourceRecordSchema = DoctorLazy(() =>
    objectSchema({
      sourceCommand: stringSchema().optional().catch(undefined),
      sourceProducerPath: stringSchema().optional().catch(undefined),
      previousProducerPaths: array(unknown())
        .transform((list) => list.filter((item) => typeof item === "string"))
        .optional()
        .catch(undefined),
    }).passthrough(),
  );
});
//@ chunk-v80cqab4.js:2404-3218 placement
function updateDeniedProducerDirs(dirs) {
  let pluginRegistry = getPluginRegistry();
  let commandProducerDirsDenied = pluginRegistry.commandProducerDirsDenied;
  let wslProvider = wslProviderOfPluginsRoot();
  pluginRegistry.commandProducerDirsWslProviderUndeterminable = wslProvider === "undeterminable";
  let nativeProvider = wslProvider === "undeterminable" ? undefined : wslProvider;
  pluginRegistry.commandProducerDirsScannedAt = Date.now();
  pluginRegistry.commandProducerDirsComparable = null;
  for (let dir of new Set(dirs)) {
    let parsed;
    try {
      let filePath = join(dir, "installed_plugins.json");
      let stat = statSync(filePath);
      if (!stat.isFile() || stat.size > MAX_SOURCE_RECORD_BYTES) continue;
      let file = readFileSync(filePath, "utf8");
      parsed = JSON.parse(file);
    } catch {
      continue;
    }
    let plugins =
      typeof parsed === "object" && parsed !== null && "plugins" in parsed ? parsed.plugins : undefined;
    if (typeof plugins !== "object" || plugins === null) continue;
    for (let installations of Object.values(plugins)) {
      if (!Array.isArray(installations)) continue;
      for (let installation of installations) {
        let record = CommandSourceRecordSchema().safeParse(installation);
        if (!record.success) continue;
        for (let producerPath of [
          record.data.sourceProducerPath,
          ...(record.data.previousProducerPaths ?? []),
        ]) {
          let stripped = producerPath === undefined ? undefined : stripWin32DevicePrefix(producerPath);
          let nativePath = stripped === undefined ? undefined : toNativePluginPath(stripped, nativeProvider);
          if (nativePath !== undefined) commandProducerDirsDenied.add(nativePath);
        }
      }
    }
  }
  return [...commandProducerDirsDenied];
}
//@ chunk-v80cqab4.js:3218-3438 placement
function recordProducerDir(dirPath, { emit = true } = {}) {
  let wslProvider = wslProviderOfPluginsRoot();
  let nativePluginPath = toNativePluginPath(
    stripWin32DevicePrefix(dirPath),
    wslProvider === "undeterminable" ? undefined : wslProvider,
  );
  if (nativePluginPath === undefined) return;
  let commandProducerDirsDenied = getPluginRegistry().commandProducerDirsDenied;
  if (commandProducerDirsDenied.has(nativePluginPath)) return;
  commandProducerDirsDenied.add(nativePluginPath);
  getPluginRegistry().commandProducerDirsComparable = null;
  if (emit) emitProducerDirsChanged();
}
//@ chunk-v80cqab4.js:3438-3511 placement
function emitProducerDirsChanged() {
  try {
    getPluginRegistry().commandProducerDirsChanged.emit();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-v80cqab4.js:3511-3559 placement
var onProducerDirsChanged; // deferred: uses getPluginRegistry (./pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v80cqab4.js:3511", () => {
  onProducerDirsChanged = createLazySignal(() => getPluginRegistry().commandProducerDirsChanged);
});
//@ chunk-v80cqab4.js:3559-4458 placement
/**
 * 扫描会产生命令的插件目录，记录被拒绝或无法判断的目录（有最大缓存时间）。
 */
function scanCommandProducerDirs(absolutePath, dirs, claudeConfigDir, { maxAgeMs = 0 } = {}) {
  let pluginRegistry = getPluginRegistry();
  if (
    !(maxAgeMs > 0 && Date.now() - pluginRegistry.commandProducerDirsScannedAt < maxAgeMs) ||
    pluginRegistry.commandProducerDirsComparable === null
  ) {
    let options = {
      foldCase: true,
    };
    let comparablePath = toComparablePath(getOriginalCwd(), options);
    let comparablePath_2 = toComparablePath(claudeConfigDir, options);
    let filtered = dirs
      .map((dir) => toComparablePath(dir, options))
      .filter(
        (comparable) =>
          !isPathWithin(comparable, comparablePath, {
            alreadyComparable: true,
          }),
      );
    let mapped = updateDeniedProducerDirs(dirs).map((dir) => toComparablePath(dir, options));
    pluginRegistry.commandProducerDirsComparable = [...filtered, ...mapped];
    pluginRegistry.commandProducerDirsNeedCanonicalCandidate =
      mapped.length > 0 ||
      filtered.some(
        (dir) =>
          !isPathWithin(comparablePath_2, dir, {
            alreadyComparable: true,
          }),
      );
  }
  if (
    pluginRegistry.commandProducerDirsWslProviderUndeterminable &&
    (wslLocalhostParts(stripWin32DevicePrefix(absolutePath)) !== undefined ||
      wslLocalhostParts(
        toComparablePath(absolutePath, {
          foldCase: true,
        }),
      ) !== undefined)
  )
    return true;
  if (pluginRegistry.commandProducerDirsComparable.length === 0) return false;
  if (
    pluginRegistry.commandProducerDirsNeedCanonicalCandidate &&
    traversesOrResolvesUntrustedLink(isAbsolute(absolutePath) ? absolutePath : resolve(absolutePath), {
      allowLocalWsl: true,
    })
  )
    return true;
  let comparablePath = pluginRegistry.commandProducerDirsNeedCanonicalCandidate
    ? toComparablePath(absolutePath, {
        foldCase: true,
        knownNotSuspect: true,
      })
    : resolve(absolutePath).normalize("NFC").toLowerCase();
  return pluginRegistry.commandProducerDirsComparable.some((root) =>
    isPathWithin(root, comparablePath, {
      alreadyComparable: true,
    }),
  );
}
//@ chunk-v80cqab4.js:4458-4737 placement
function wslProviderOfPluginsRoot() {
  let pluginRegistry = getPluginRegistry();
  let root = projectPluginsDir();
  let wslProviderOfPluginsRootMemo = pluginRegistry.wslProviderOfPluginsRootMemo;
  if (
    wslProviderOfPluginsRootMemo?.root === root &&
    isFreshTimestamp(wslProviderOfPluginsRootMemo.at, COMMAND_SOURCE_DIR_TTL_MS)
  )
    return wslProviderOfPluginsRootMemo.value;
  let provider = wslProviderOfPath(root);
  if (provider === "undeterminable") return "undeterminable";
  let prefixInfo =
    provider === undefined
      ? undefined
      : {
          prefix: provider.prefix,
        };
  pluginRegistry.wslProviderOfPluginsRootMemo = {
    root,
    value: prefixInfo,
    at: Date.now(),
  };
  return prefixInfo;
}
//@ chunk-v80cqab4.js:4737-4749 placement
var COMMAND_SOURCE_DIR_TTL_MS = 30000;
//@ chunk-v80cqab4.js:4749-4931 placement
function toNativePluginPath(path, provider) {
  let converted =
    toWslPathNoop(path, {
      exactDots: true,
    }) ?? (provider === undefined ? undefined : toWindowsPathFromWsl(path, provider.prefix));
  if (converted !== undefined) return converted;
  if (isAbsolute(path))
    return !hasDotSegment_2(path) && (!isUntrustedLinkPath(path) || neverAllowsLocalWsl(path))
      ? path
      : undefined;
  return toWslPath(path, {
    exactDots: true,
  });
}
export {
  emitProducerDirsChanged,
  foldPathSegments,
  isPluginDirReadable,
  scanCommandProducerDirs,
  pluginRootDirs,
  isInCommandProducerDir,
  projectPluginsDir,
  isFreshTimestamp,
  recordProducerDir,
  PLUGIN_CACHE_DIRNAME,
  projectPluginCacheDir,
  updateDeniedProducerDirs,
  commandProducerDirs,
  onProducerDirsChanged,
};
