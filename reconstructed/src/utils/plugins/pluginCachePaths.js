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
import {
  normalize,
  sep,
  sep as sep_2,
  resolve,
  resolve as resolve_2,
  join,
  join as join_2,
  isAbsolute,
} from "path";
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
import { eDe, ck, ovr, toWindowsPathFromWsl, nvr, toWslPath } from "../pathResolution.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { toComparablePath, isPathWithin, CL, stripWin32DevicePrefix } from "../fsJunctions.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { gte } from "../../plugins/functionHooks/devModsName.js";
import { n_, isWslUncPath, z7t } from "../networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../log.js";
import { createLazySignal } from "../signal.js";
import { wslProviderOfPath } from "./localMarketplacePaths.js";
import { hasDotSegment } from "../pathClassification.js";

//@ chunk-v80cqab4.js:778-851 placement
function isFreshTimestamp(e, r, n = Date.now()) {
  return Number.isFinite(e) && Math.abs(n - e) < r;
}
//@ chunk-v80cqab4.js:893-904 placement
var x = 1024;
//@ chunk-v80cqab4.js:904-1056 placement
function foldPathSegments(e) {
  let foldedSegmentsBySpelling = getSessionPathsCache().foldedSegmentsBySpelling,
    n = foldedSegmentsBySpelling.get(e);
  if (n === void 0) {
    if (((n = normalize(e).split(sep_2).map(foldName).join(sep_2)), foldedSegmentsBySpelling.size >= x))
      foldedSegmentsBySpelling.clear();
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
function isInCommandProducerDir(e) {
  let r = commandProducerDirs();
  if (r.length === 0) return !1;
  if (eDe(e, h)) return !0;
  let joined = r.join("\x00"),
    i = getPluginRegistry(),
    inlinePluginRootsComparableMemo = i.inlinePluginRootsComparableMemo;
  if (
    inlinePluginRootsComparableMemo?.roots !== joined ||
    !isFreshTimestamp(inlinePluginRootsComparableMemo.at, L)
  )
    ((inlinePluginRootsComparableMemo = {
      roots: joined,
      comparable: r.map((s) => toComparablePath(s, { foldCase: !0, knownNotSuspect: !eDe(s, h) })),
      at: Date.now(),
    }),
      (i.inlinePluginRootsComparableMemo = inlinePluginRootsComparableMemo));
  let g = toComparablePath(e, { foldCase: !0, knownNotSuspect: !0 });
  return inlinePluginRootsComparableMemo.comparable.some((s) =>
    isPathWithin(s, g, { alreadyComparable: !0 }),
  );
}
//@ chunk-v80cqab4.js:1711-1762 placement
var L = 30000,
  h = { allowLocalWsl: !0, eisdirIsFolder: !0 };
//@ chunk-v80cqab4.js:1762-2060 placement
function isPluginDirReadable(e) {
  if (isDiskless()) return !0;
  let r = getPathsForPermissionCheck(resolve(gte())),
    n = foldPathSegments(resolve(e));
  if (r.map(foldPathSegments).some((s) => n === s || n.startsWith(s + sep))) return !0;
  let i = CL(e) || ck(e),
    t = !n_(e) && (!i || isWslUncPath(e));
  if (t && eDe(e, h)) return !0;
  let g = toComparablePath(e, { foldCase: !0, knownNotSuspect: t });
  return r.some((s) => isPathWithin(toComparablePath(s, { foldCase: !0 }), g, { alreadyComparable: !0 }));
}
//@ chunk-v80cqab4.js:2165-2404 placement
var MAX_SOURCE_RECORD_BYTES = 4194304,
  CommandSourceRecordSchema = DoctorLazy(() =>
    u({
      sourceCommand: o()
        .optional()
        .catch(void 0),
      sourceProducerPath: o()
        .optional()
        .catch(void 0),
      previousProducerPaths: A(oe())
        .transform((e) => e.filter((r) => typeof r === "string"))
        .optional()
        .catch(void 0),
    }).passthrough(),
  );
//@ chunk-v80cqab4.js:2404-3218 placement
function updateDeniedProducerDirs(e) {
  let r = getPluginRegistry(),
    commandProducerDirsDenied = r.commandProducerDirsDenied,
    i = wslProviderOfPluginsRoot();
  r.commandProducerDirsWslProviderUndeterminable = i === "undeterminable";
  let t = i === "undeterminable" ? void 0 : i;
  ((r.commandProducerDirsScannedAt = Date.now()), (r.commandProducerDirsComparable = null));
  for (let g of new Set(e)) {
    let s;
    try {
      let m = join_2(g, "installed_plugins.json"),
        P = statSync(m);
      if (!P.isFile() || P.size > MAX_SOURCE_RECORD_BYTES) continue;
      let c = readFileSync(m, "utf8");
      s = JSON.parse(c);
    } catch {
      continue;
    }
    let a = typeof s === "object" && s !== null && "plugins" in s ? s.plugins : void 0;
    if (typeof a !== "object" || a === null) continue;
    for (let m of Object.values(a)) {
      if (!Array.isArray(m)) continue;
      for (let P of m) {
        let safeParse = CommandSourceRecordSchema().safeParse(P);
        if (!safeParse.success) continue;
        for (let C of [safeParse.data.sourceProducerPath, ...(safeParse.data.previousProducerPaths ?? [])]) {
          let d = C === void 0 ? void 0 : stripWin32DevicePrefix(C),
            D = d === void 0 ? void 0 : toNativePluginPath(d, t);
          if (D !== void 0) commandProducerDirsDenied.add(D);
        }
      }
    }
  }
  return [...commandProducerDirsDenied];
}
//@ chunk-v80cqab4.js:3218-3438 placement
function recordProducerDir(e, { emit: r = !0 } = {}) {
  let n = wslProviderOfPluginsRoot(),
    i = toNativePluginPath(stripWin32DevicePrefix(e), n === "undeterminable" ? void 0 : n);
  if (i === void 0) return;
  let commandProducerDirsDenied = getPluginRegistry().commandProducerDirsDenied;
  if (commandProducerDirsDenied.has(i)) return;
  if ((commandProducerDirsDenied.add(i), (getPluginRegistry().commandProducerDirsComparable = null), r))
    emitProducerDirsChanged();
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
/**
 * 扫描会产生命令的插件目录，记录被拒绝或无法判断的目录（有最大缓存时间）。
 */
//@ chunk-v80cqab4.js:3559-4458 placement
function scanCommandProducerDirs(e, r, n, { maxAgeMs: i = 0 } = {}) {
  let t = getPluginRegistry();
  if (
    !(i > 0 && Date.now() - t.commandProducerDirsScannedAt < i) ||
    t.commandProducerDirsComparable === null
  ) {
    let a = { foldCase: !0 },
      m = toComparablePath(getOriginalCwd(), a),
      P = toComparablePath(n, a),
      filtered = r
        .map((d) => toComparablePath(d, a))
        .filter((d) => !isPathWithin(d, m, { alreadyComparable: !0 })),
      mapped = updateDeniedProducerDirs(r).map((d) => toComparablePath(d, a));
    ((t.commandProducerDirsComparable = [...filtered, ...mapped]),
      (t.commandProducerDirsNeedCanonicalCandidate =
        mapped.length > 0 || filtered.some((d) => !isPathWithin(P, d, { alreadyComparable: !0 }))));
  }
  if (
    t.commandProducerDirsWslProviderUndeterminable &&
    (z7t(stripWin32DevicePrefix(e)) !== void 0 || z7t(toComparablePath(e, { foldCase: !0 })) !== void 0)
  )
    return !0;
  if (t.commandProducerDirsComparable.length === 0) return !1;
  if (
    t.commandProducerDirsNeedCanonicalCandidate &&
    eDe(isAbsolute(e) ? e : resolve_2(e), { allowLocalWsl: !0 })
  )
    return !0;
  let s = t.commandProducerDirsNeedCanonicalCandidate
    ? toComparablePath(e, { foldCase: !0, knownNotSuspect: !0 })
    : resolve_2(e).normalize("NFC").toLowerCase();
  return t.commandProducerDirsComparable.some((a) => isPathWithin(a, s, { alreadyComparable: !0 }));
}
//@ chunk-v80cqab4.js:4458-4737 placement
function wslProviderOfPluginsRoot() {
  let e = getPluginRegistry(),
    r = projectPluginsDir(),
    wslProviderOfPluginsRootMemo = e.wslProviderOfPluginsRootMemo;
  if (wslProviderOfPluginsRootMemo?.root === r && isFreshTimestamp(wslProviderOfPluginsRootMemo.at, E))
    return wslProviderOfPluginsRootMemo.value;
  let i = wslProviderOfPath(r);
  if (i === "undeterminable") return "undeterminable";
  let t = i === void 0 ? void 0 : { prefix: i.prefix };
  return ((e.wslProviderOfPluginsRootMemo = { root: r, value: t, at: Date.now() }), t);
}
//@ chunk-v80cqab4.js:4737-4749 placement
var E = 30000;
//@ chunk-v80cqab4.js:4749-4931 placement
function toNativePluginPath(e, r) {
  let n = ovr(e, { exactDots: !0 }) ?? (r === void 0 ? void 0 : toWindowsPathFromWsl(e, r.prefix));
  if (n !== void 0) return n;
  if (isAbsolute(e)) return !hasDotSegment(e) && (!ck(e) || nvr(e)) ? e : void 0;
  return toWslPath(e, { exactDots: !0 });
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
