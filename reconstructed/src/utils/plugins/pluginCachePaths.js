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
import { u, string, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../log.js";
import { createLazySignal } from "../signal.js";
import { wslProviderOfPath } from "./localMarketplacePaths.js";
import { hasDotSegment_2 } from "../pathClassification.js";

//@ chunk-v80cqab4.js:778-851 placement
function isFreshTimestamp(e, r, n = Date.now()) {
  return Number.isFinite(e) && Math.abs(n - e) < r;
}
//@ chunk-v80cqab4.js:893-904 placement
var MAX_PLUGIN_CACHE_READ = 1024;
//@ chunk-v80cqab4.js:904-1056 placement
function foldPathSegments(e) {
  let foldedSegmentsBySpelling = getSessionPathsCache().foldedSegmentsBySpelling;
  let n = foldedSegmentsBySpelling.get(e);
  if (n === undefined) {
    n = normalize(e).split(sep).map(foldName).join(sep);
    if (foldedSegmentsBySpelling.size >= MAX_PLUGIN_CACHE_READ) foldedSegmentsBySpelling.clear();
    foldedSegmentsBySpelling.set(e, n);
  }
  return n;
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
    ...getPluginSeedDirs().map((e) => resolve(getOriginalCwd(), e)),
  ]);
}
//@ chunk-v80cqab4.js:1243-1306 placement
function commandProducerDirs() {
  return uniq([...getInlinePlugins(), ...getInlinePluginsNoMcp()].map((e) => resolve(getOriginalCwd(), e)));
}
//@ chunk-v80cqab4.js:1306-1711 placement
function isInCommandProducerDir(absolutePath) {
  let r = commandProducerDirs();
  if (r.length === 0) return false;
  if (traversesOrResolvesUntrustedLink(absolutePath, PLUGIN_CACHE_RESOLVE_OPTIONS)) return true;
  let joined = r.join("\x00");
  let pluginRegistry = getPluginRegistry();
  let inlinePluginRootsComparableMemo = pluginRegistry.inlinePluginRootsComparableMemo;
  if (
    inlinePluginRootsComparableMemo?.roots !== joined ||
    !isFreshTimestamp(inlinePluginRootsComparableMemo.at, PLUGIN_CACHE_TTL_MS)
  ) {
    inlinePluginRootsComparableMemo = {
      roots: joined,
      comparable: r.map((s) =>
        toComparablePath(s, {
          foldCase: true,
          knownNotSuspect: !traversesOrResolvesUntrustedLink(s, PLUGIN_CACHE_RESOLVE_OPTIONS),
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
  return inlinePluginRootsComparableMemo.comparable.some((s) =>
    isPathWithin(s, comparablePath, {
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
  let n = foldPathSegments(resolve(absolutePath));
  if (pathsForPermissionCheck.map(foldPathSegments).some((s) => n === s || n.startsWith(s + sep)))
    return true;
  let i = isUncOrDeviceSpelling(absolutePath) || isUntrustedLinkPath(absolutePath);
  let t = !isNetworkOrSpecialPath(absolutePath) && (!i || isWslUncPath(absolutePath));
  if (t && traversesOrResolvesUntrustedLink(absolutePath, PLUGIN_CACHE_RESOLVE_OPTIONS)) return true;
  let comparablePath = toComparablePath(absolutePath, {
    foldCase: true,
    knownNotSuspect: t,
  });
  return pathsForPermissionCheck.some((s) =>
    isPathWithin(
      toComparablePath(s, {
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
var MAX_SOURCE_RECORD_BYTES = 4194304;
var CommandSourceRecordSchema = DoctorLazy(() =>
  u({
    sourceCommand: string().optional().catch(undefined),
    sourceProducerPath: string().optional().catch(undefined),
    previousProducerPaths: array(unknown())
      .transform((e) => e.filter((r) => typeof r === "string"))
      .optional()
      .catch(undefined),
  }).passthrough(),
);
//@ chunk-v80cqab4.js:2404-3218 placement
function updateDeniedProducerDirs(e) {
  let pluginRegistry = getPluginRegistry();
  let commandProducerDirsDenied = pluginRegistry.commandProducerDirsDenied;
  let i = wslProviderOfPluginsRoot();
  pluginRegistry.commandProducerDirsWslProviderUndeterminable = i === "undeterminable";
  let t = i === "undeterminable" ? undefined : i;
  pluginRegistry.commandProducerDirsScannedAt = Date.now();
  pluginRegistry.commandProducerDirsComparable = null;
  for (let g of new Set(e)) {
    let s;
    try {
      let m = join(g, "installed_plugins.json");
      let P = statSync(m);
      if (!P.isFile() || P.size > MAX_SOURCE_RECORD_BYTES) continue;
      let file = readFileSync(m, "utf8");
      s = JSON.parse(file);
    } catch {
      continue;
    }
    let plugins = typeof s === "object" && s !== null && "plugins" in s ? s.plugins : undefined;
    if (typeof plugins !== "object" || plugins === null) continue;
    for (let m of Object.values(plugins)) {
      if (!Array.isArray(m)) continue;
      for (let P of m) {
        let c = CommandSourceRecordSchema().safeParse(P);
        if (!c.success) continue;
        for (let C of [c.data.sourceProducerPath, ...(c.data.previousProducerPaths ?? [])]) {
          let d = C === undefined ? undefined : stripWin32DevicePrefix(C);
          let D = d === undefined ? undefined : toNativePluginPath(d, t);
          if (D !== undefined) commandProducerDirsDenied.add(D);
        }
      }
    }
  }
  return [...commandProducerDirsDenied];
}
//@ chunk-v80cqab4.js:3218-3438 placement
function recordProducerDir(e, { emit: r = true } = {}) {
  let n = wslProviderOfPluginsRoot();
  let nativePluginPath = toNativePluginPath(
    stripWin32DevicePrefix(e),
    n === "undeterminable" ? undefined : n,
  );
  if (nativePluginPath === undefined) return;
  let commandProducerDirsDenied = getPluginRegistry().commandProducerDirsDenied;
  if (commandProducerDirsDenied.has(nativePluginPath)) return;
  commandProducerDirsDenied.add(nativePluginPath);
  getPluginRegistry().commandProducerDirsComparable = null;
  if (r) emitProducerDirsChanged();
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
var onProducerDirsChanged = createLazySignal(() => getPluginRegistry().commandProducerDirsChanged);
//@ chunk-v80cqab4.js:3559-4458 placement
/**
 * 扫描会产生命令的插件目录，记录被拒绝或无法判断的目录（有最大缓存时间）。
 */
function scanCommandProducerDirs(absolutePath, r, claudeConfigDir, { maxAgeMs: i = 0 } = {}) {
  let pluginRegistry = getPluginRegistry();
  if (
    !(i > 0 && Date.now() - pluginRegistry.commandProducerDirsScannedAt < i) ||
    pluginRegistry.commandProducerDirsComparable === null
  ) {
    let a = {
      foldCase: true,
    };
    let comparablePath = toComparablePath(getOriginalCwd(), a);
    let comparablePath_2 = toComparablePath(claudeConfigDir, a);
    let filtered = r
      .map((d) => toComparablePath(d, a))
      .filter(
        (d) =>
          !isPathWithin(d, comparablePath, {
            alreadyComparable: true,
          }),
      );
    let mapped = updateDeniedProducerDirs(r).map((d) => toComparablePath(d, a));
    pluginRegistry.commandProducerDirsComparable = [...filtered, ...mapped];
    pluginRegistry.commandProducerDirsNeedCanonicalCandidate =
      mapped.length > 0 ||
      filtered.some(
        (d) =>
          !isPathWithin(comparablePath_2, d, {
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
  let s = pluginRegistry.commandProducerDirsNeedCanonicalCandidate
    ? toComparablePath(absolutePath, {
        foldCase: true,
        knownNotSuspect: true,
      })
    : resolve(absolutePath).normalize("NFC").toLowerCase();
  return pluginRegistry.commandProducerDirsComparable.some((a) =>
    isPathWithin(a, s, {
      alreadyComparable: true,
    }),
  );
}
//@ chunk-v80cqab4.js:4458-4737 placement
function wslProviderOfPluginsRoot() {
  let pluginRegistry = getPluginRegistry();
  let r = projectPluginsDir();
  let wslProviderOfPluginsRootMemo = pluginRegistry.wslProviderOfPluginsRootMemo;
  if (
    wslProviderOfPluginsRootMemo?.root === r &&
    isFreshTimestamp(wslProviderOfPluginsRootMemo.at, COMMAND_SOURCE_DIR_TTL_MS)
  )
    return wslProviderOfPluginsRootMemo.value;
  let i = wslProviderOfPath(r);
  if (i === "undeterminable") return "undeterminable";
  let t =
    i === undefined
      ? undefined
      : {
          prefix: i.prefix,
        };
  pluginRegistry.wslProviderOfPluginsRootMemo = {
    root: r,
    value: t,
    at: Date.now(),
  };
  return t;
}
//@ chunk-v80cqab4.js:4737-4749 placement
var COMMAND_SOURCE_DIR_TTL_MS = 30000;
//@ chunk-v80cqab4.js:4749-4931 placement
function toNativePluginPath(e, r) {
  let n =
    toWslPathNoop(e, {
      exactDots: true,
    }) ?? (r === undefined ? undefined : toWindowsPathFromWsl(e, r.prefix));
  if (n !== undefined) return n;
  if (isAbsolute(e))
    return !hasDotSegment_2(e) && (!isUntrustedLinkPath(e) || neverAllowsLocalWsl(e)) ? e : undefined;
  return toWslPath(e, {
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
