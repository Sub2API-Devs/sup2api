/**
 * plugins/functionHooks/devModsWatch.ts
 *
 * 2.1.316 新增：--plugin-dir 开发目录监视：文件变化触发 mod 重新加载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (59)
 * attribution: placement 59
 */
import { relative as relative_2, isAbsolute, sep, join, resolve as resolve_2, basename, dirname } from "path";
import { realpath, stat } from "fs/promises";
import { TYPES_DIR, startPluginDirWatcher } from "./typeRoots.js";
import { logForDebugging, getDebugLogPath } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { chokidar_default } from "../../../vendor/chokidar/index.js";
import { getLastInteractionTime, isDiskless } from "../../bootstrap/state.js";
import { isScriptFile, MAX_MODULE_BYTES } from "./moduleLoader.js";
import {
  reloadedNotice,
  reloadedText,
  restartNeededNotice,
  unnamedNotice,
  describeModuleUnnamed,
  describeManifestReload,
  reportPluginDirWatchChanges,
  classifyChangeSource,
  nextReloadDelay,
  compareStamp,
  tellWatchLine,
  settleReloadPending,
  vetoedNotice,
  reloadFailureNotice,
  createReloadThrottle,
  reloadStormNotice,
  RELOAD_MIN_NOTICE_MS,
  OPTIONS_CHANGED_PREFIX,
  repeatWord,
  describeReloadFailure,
  devModHostState,
} from "./devModsStatus.js";
import { uniq } from "../../utils/collections.js";
import { logError } from "../../utils/log.js";
import {
  ReloadFailedError,
  hostStateRef,
  mergePluginRecord,
  retargetHooksModule,
} from "./hooksModuleLoader.js";
import {
  uiLog,
  watchedPluginDirs,
  pluginDirSlot,
  pluginDirWatchSlot,
  isPluginDirWatchOn,
  inlinePlugins,
} from "./hooksWorkerClient.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { isOfficialMarketplacePlugin, createSerialQueue } from "./panes.js";
import { isVouchedPolicyPluginId } from "../../utils/plugins/managedPlugins.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { TRUSTED_SETTING_SOURCES as TRUSTED_SETTING_SOURCES_2 } from "../../utils/plugins/pluginConfigSources.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { hookPluginLabel } from "./hookDispatch.js";
import { hooksModulesRefusalReason } from "../../services/analytics/growthbookCredentials.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import {
  PLUGIN_MANIFEST_PATH as PLUGIN_MANIFEST_PATH_2,
  PLUGIN_JSON,
} from "../../utils/plugins/commandSource.js";
import { isZipPathCaseInsensitive, createPluginFromPath } from "../../utils/plugins/pluginLoader.js";
import { SKILLS_DIR } from "../../utils/telemetry/pluginTelemetry.js";
import {
  reloadReasonSlot,
  pendingReloadSlot,
  reloadControllerSlot,
  reloadTimerSlot,
} from "./pluginLifecycle.js";
import { describePluginDirShape, isNotDotPrefixed } from "../../utils/plugins/pluginManifestRead.js";
import { hooksModuleFiles } from "./eventPatterns.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HooksError } from "./hooksErrors.js";
import { pluginErrorText } from "../../types/plugin.js";
import { currentTurn, turnFinishedSignal, turnEndedSignal } from "./personHold.js";
import { skillWatchStateByHost } from "../../skills/skillChangeWatch.js";
import { devModsDir } from "./devModsName.js";
import { MAX_LISTED_MOD_CHANGES } from "./devModsNotices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4127280-4127384 placement
/**
 * n 是 e 的直接子项时返回子项名，否则 undefined。
 */
function childNameUnder(root, path) {
  let relative = relative_2(root, path);
  return relative !== "" && !isAbsolute(relative) && !relative.startsWith("..") && !relative.includes(sep)
    ? relative
    : undefined;
}
//@ chunk-e6aww6q8.js:4127445-4127486 placement
/**
 * 把变更路径映射到根下
 */
var watchPathMapper = (root, base) => (path) => join(root, relative_2(base, resolve_2(path)));
//@ chunk-e6aww6q8.js:4127486-4127500 placement
/**
 * 60000
 */
var WATCH_IDLE_AFTER_MS = 60000;
//@ chunk-e6aww6q8.js:4127500-4127512 placement
/**
 * 10000
 */
var WATCH_CHECK_EVERY_MS = 1e4;
//@ chunk-e6aww6q8.js:4127512-4127526 placement
/**
 * 30000
 */
var WATCH_IDLE_MS = 30000;
//@ chunk-e6aww6q8.js:4127526-4127558 placement
/**
 * 目录监视忽略的目录名：node_modules 与 .git。
 */
var WATCH_IGNORED_DIRS = ["node_modules", ".git"];
//@ chunk-e6aww6q8.js:4127668-4127824 placement
/**
 * 监视时忽略 node_modules、.git、点开头（.claude-plugin 除外）、.log 文件和调试日志路径。
 */
function isIgnoredWatchPath(path, root) {
  let name = basename(path);
  let isHiddenName = name.startsWith(".") && name !== ".claude-plugin";
  let isRootOrLatest = path === root || path === join(dirname(root), "latest");
  return WATCH_IGNORED_DIRS.includes(name) || isHiddenName || name.endsWith(".log") || isRootOrLatest;
}
//@ chunk-e6aww6q8.js:4127944-4128028 placement
/**
 * 路径是否在目录内
 */
function isWithinDir(dir, path) {
  let relative = relative_2(dir, path);
  return !(isAbsolute(relative) || relative === ".." || relative.startsWith(`..${sep}`));
}
//@ chunk-e6aww6q8.js:4128028-4128144 placement
function ancestorPathsWithin(root, path) {
  let relative = relative_2(root, path);
  let segments = relative === "" ? [] : relative.split(sep);
  return isWithinDir(root, path)
    ? segments.map((index, paths) => join(root, ...segments.slice(0, paths + 1)))
    : [path];
}
//@ chunk-e6aww6q8.js:4128402-4128433 placement
/**
 * 是否在 types 目录内
 */
var isInsideTypesDir = (root, path) => isWithinDir(join(root, TYPES_DIR), path);
//@ chunk-e6aww6q8.js:4128433-4128570 placement
/**
 * 生成 chokidar ignored 函数：路径链上有忽略目录、在插件缓存里或命中忽略规则（且非 manifest）时忽略。
 */
var createWatchIgnorer = (root, root_2, isIgnored) => (path) => {
  let resolved = resolve_2(path);
  let ancestors = ancestorPathsWithin(root, resolved);
  let any = ancestors.some((ancestor) => WATCH_IGNORED_DIRS.includes(basename(ancestor)));
  let any_2 = ancestors.some((ancestor) => isIgnoredWatchPath(ancestor, root_2));
  return any || isInsideTypesDir(root, resolved) || (any_2 && !isIgnored(resolved));
};
//@ chunk-e6aww6q8.js:4128570-4128606 placement
/**
 * 任一目录内
 */
var anyWithinDirs = (path, dirs) => dirs.some((dir) => isWithinDir(path, dir));
//@ chunk-e6aww6q8.js:4128606-4128618 placement
/**
 * 100
 */
var WATCH_STABILITY_MS = 100;
//@ chunk-e6aww6q8.js:4128618-4128977 placement
/**
 * 按用户最近交互切换监视轮询频率（活动/空闲），切换时回调以补扫。
 */
function createIdlePacer(root, pace, onIdle) {
  let wasActive = false;
  let activeMs = pace.activeMs;
  let secondNow = pace.now();
  let interval = setInterval(() => {
    let lastActiveAt = pace.now();
    let timer = lastActiveAt - pace.lastInteractionTime() > pace.idleAfterMs;
    if (timer === wasActive) return;
    let fire = Math.max(secondNow, lastActiveAt - activeMs) - WATCH_STABILITY_MS;
    wasActive = timer;
    activeMs = wasActive ? pace.idleMs : pace.activeMs;
    secondNow = lastActiveAt;
    logForDebugging(
      `plugin-dir watch on ${root}: ${wasActive ? "idle" : "active"}, polling every ${activeMs}ms`,
    );
    onIdle(fire);
  }, pace.checkEveryMs);
  interval.unref();
  return {
    interval: () => activeMs,
    stop: () => {
      clearInterval(interval);
    },
  };
}
//@ chunk-e6aww6q8.js:4128977-4129155 placement
var watchOptionsFor = (root) => ({
  persistent: true,
  followSymlinks: false,
  ignorePermissionErrors: true,
  usePolling: true,
  interval: root,
  binaryInterval: root,
  awaitWriteFinish: {
    stabilityThreshold: WATCH_STABILITY_MS,
    pollInterval: WATCH_STABILITY_MS / 2,
  },
});
//@ chunk-e6aww6q8.js:4129196-4129229 placement
/**
 * 真实路径或原值
 */
var realpathOrSelf = (path) => realpath(path).catch(() => path);
//@ chunk-e6aww6q8.js:4129229-4130260 placement
/**
 * 在一个插件目录上建立文件监视（chokidar 风格的 add/change/unlink 事件），失败时降级为轮询。
 */
function openPluginDirWatcher({ root, ignored, onChange, pace }) {
  let idlePacer = createIdlePacer(root, pace, (root) => {
    reopen(root);
  });
  let current;
  let watcherPromise = open(undefined).then((opened) => opened.watcher);
  let logCloseError = (error) =>
    logForDebugging(`plugin-dir watch on ${root}: close failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  function reopen(sinceCtime) {
    let secondOpened = watcherPromise.then(async (opened) => {
      await opened.close().then(undefined, logCloseError);
      current?.scanned.resolve();
      return open(sinceCtime);
    });
    watcherPromise = secondOpened.then((opened) => opened.watcher);
    return secondOpened.then((opened) => opened.scanned.promise);
  }
  async function open(sinceCtime) {
    let realPath = await realpathOrSelf(root);
    let mapPath = watchPathMapper(root, realPath);
    let isIgnoredFn = typeof ignored === "function";
    let isIncremental = sinceCtime !== undefined;
    let deferred = Promise.withResolvers();
    let watcher = chokidar_default.watch(realPath, {
      ...watchOptionsFor(idlePacer.interval()),
      ignoreInitial: sinceCtime === undefined,
      alwaysStat: sinceCtime !== undefined,
      ignored: isIgnoredFn ? (watchedPath, stat) => ignored(mapPath(watchedPath), stat) : ignored,
    });
    watcher.on("add", (path, stat) => {
      if (!isIncremental || (stat !== undefined && stat.ctimeMs > (sinceCtime ?? 0)))
        onChange(mapPath(path), stat?.ctimeMs);
    });
    watcher.on("ready", () => {
      isIncremental = false;
      deferred.resolve();
    });
    watcher.on("change", (path, stat) => onChange(mapPath(path), stat?.ctimeMs));
    watcher.on("unlink", (path) => {
      onChange(mapPath(path));
    });
    watcher.on("error", (error) =>
      logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(error)}`, {
        level: "warn",
      }),
    );
    current = {
      watcher,
      scanned: deferred,
    };
    return current;
  }
  return {
    close: async () => {
      idlePacer.stop();
      await (await watcherPromise).close();
      current?.scanned.resolve();
    },
    retarget: () => {},
    interval: idlePacer.interval,
    rescan: reopen,
  };
}
//@ chunk-e6aww6q8.js:4130297-4130448 placement
var statFiles = async (paths) =>
  (
    await Promise.all(
      paths.map((path) =>
        stat(path).then(
          (stat) =>
            stat.isFile()
              ? {
                  path,
                  ctimeMs: stat.ctimeMs,
                }
              : undefined,
          () => {
            return;
          },
        ),
      ),
    )
  ).filter((stat) => stat !== undefined);
//@ chunk-e6aww6q8.js:4130448-4131608 placement
/**
 * 处理插件目录的文件变化事件，安排对应 mod 的重新加载。
 */
function handlePluginDirWatchEvent({ root, files, onChange, pace }) {
  let idlePacer = createIdlePacer(root, pace, (sinceCtime) => {
    chain = chain.then((result) => handleEvent(result, sinceCtime));
  });
  let busy = new Set();
  let pending = new Set();
  let chain = handleEvent(undefined, undefined);
  let index = fourthIndex();
  function fourthIndex() {
    let timer = setTimeout(() => {
      chain = chain.then(since);
      index = fourthIndex();
    }, idlePacer.interval());
    timer.unref();
    return timer;
  }
  async function handleEvent(sinceCtime, secondEvent) {
    await sinceCtime?.close();
    let path = files();
    let kind = await statFiles(path);
    busy.clear();
    for (let index of kind) {
      busy.add(index.path);
      if (secondEvent !== undefined && index.ctimeMs > secondEvent) onChange(index.path, index.ctimeMs);
    }
    pending = new Set(path.filter((index) => !busy.has(index)));
    let index = chokidar_default.watch([...busy], {
      ...watchOptionsFor(idlePacer.interval()),
      ignoreInitial: true,
    });
    index.on("change", (index, fifthIndex) => onChange(index, fifthIndex?.ctimeMs));
    index.on("unlink", (index) => {
      busy.delete(index);
      pending.add(index);
      onChange(index);
    });
    index.on("error", (index) =>
      logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(index)}`, {
        level: "warn",
      }),
    );
    return index;
  }
  async function since(kind) {
    let index = files();
    let stat = new Map((await statFiles(index)).map((index) => [index.path, index.ctimeMs]));
    for (let [index, sixthIndex] of stat)
      if (!busy.has(index)) {
        kind.add(index);
        busy.add(index);
        if (pending.has(index)) onChange(index, sixthIndex);
      }
    for (let seventhIndex of [...busy])
      if (!index.includes(seventhIndex)) {
        kind.unwatch(seventhIndex);
        busy.delete(seventhIndex);
      }
    pending = new Set(index.filter((index) => !stat.has(index) && !busy.has(index)));
    return kind;
  }
  return {
    close: async () => {
      idlePacer.stop();
      clearTimeout(index);
      await (await chain).close();
    },
    retarget: () => {
      chain = chain.then(since);
    },
    interval: idlePacer.interval,
    rescan(index) {
      chain = chain.then((eighthIndex) => handleEvent(eighthIndex, index));
      return chain.then(() => {});
    },
  };
}
//@ chunk-e6aww6q8.js:4131608-4131620 placement
/**
 * 监视器活跃时的轮询间隔 400 毫秒；空闲后按 idleMs 放慢。
 */
var WATCH_ACTIVE_POLL_MS = 400;
//@ chunk-e6aww6q8.js:4131620-4131723 placement
var WATCH_PACE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4131620", () => {
  WATCH_PACE = {
    activeMs: WATCH_ACTIVE_POLL_MS,
    idleMs: WATCH_IDLE_MS,
    idleAfterMs: WATCH_IDLE_AFTER_MS,
    checkEveryMs: WATCH_CHECK_EVERY_MS,
    lastInteractionTime: getLastInteractionTime,
    now: Date.now,
  };
});
//@ chunk-e6aww6q8.js:4131723-4131888 placement
/**
 * 按插件范围启动监视：folder 用目录监视，files 只监视指定文件。
 */
function startPluginWatch(collection, onChange, secondOnChange) {
  return collection.scope === "folder"
    ? openPluginDirWatcher({
        root: collection.root,
        ignored: createWatchIgnorer(collection.root, getDebugLogPath(), secondOnChange),
        onChange,
        pace: WATCH_PACE,
      })
    : handlePluginDirWatchEvent({
        root: collection.root,
        files: collection.files,
        onChange,
        pace: WATCH_PACE,
      });
}
//@ chunk-e6aww6q8.js:4131888-4131899 placement
/**
 * 比较文件戳时预留的时钟误差 10 毫秒，避免同秒内的改动被漏掉。
 */
var WATCH_CLOCK_SLACK_MS = 10;
//@ chunk-e6aww6q8.js:4131899-4131965 placement
/**
 * 是否为关心的变更
 */
var isChangedWatchTarget = (path, manifests, loadedModules) =>
  manifests.includes(path) ||
  (loadedModules === undefined ? isScriptFile(path) : loadedModules.includes(path));
//@ chunk-e6aww6q8.js:4131965-4132024 placement
/**
 * 插件读取快照
 */
var pluginReadSnapshot = (taken, readStamp, defaultStamp) => ({
  read: readStamp ?? defaultStamp,
  isServed: readStamp !== undefined,
  taken,
});
//@ chunk-e6aww6q8.js:4132024-4132116 placement
/**
 * 优先把 manifest 变化当原因
 */
function preferManifestCause(collection, previousPath, nextPath) {
  return previousPath !== undefined &&
    collection.manifests.includes(previousPath) &&
    !collection.manifests.includes(nextPath)
    ? previousPath
    : nextPath;
}
//@ chunk-e6aww6q8.js:4132116-4132514 placement
/**
 * 某插件文件变化时：非 manifest 文件直接重载；manifest 变化则重读 manifest，按"需重启/不再有入口/重载"给出状态。
 */
async function reloadOnChange(host, collection, path) {
  let { name, root, scope } = collection;
  if (!collection.manifests.includes(path)) {
    let reload = await host.reload(name);
    return reloadedNotice(reloadedText(reload), reload);
  }
  let isManifest = await host.rereadManifest({
    name,
    root,
    scope,
    manifests: collection.manifests,
    entry: collection.entry,
  });
  if (!isManifest) return restartNeededNotice(path);
  collection.manifests = isManifest.manifests;
  collection.entry = isManifest.now;
  let loaded = {
    manifest: path,
    root,
  };
  if (isManifest.now === undefined) return unnamedNotice(describeModuleUnnamed(loaded, isManifest.before));
  let unserved = await host.reload(name);
  return reloadedNotice(describeManifestReload(loaded, isManifest, unserved), unserved);
}
//@ chunk-e6aww6q8.js:4132514-4139257 placement
/**
 * plugin-dir 监视主循环：合并变化、节流频繁重载、调用 ConfigChange 钩子把关，然后重载 mod。
 */
function runPluginDirWatch({
  watchDir,
  filesOf,
  stampOf,
  loadedStampOf,
  rereadManifest,
  admit,
  reload,
  tell,
  debounceMs,
  burst,
  storm,
  clock,
  turn,
  watchRoot,
  listChildren,
  reloadPlugins,
  plainLine,
  plainWording,
}) {
  let watched = new Map();
  let collections = reportPluginDirWatchChanges(
    {
      watchRoot,
      listChildren,
      reloadPlugins,
      tell,
      debounceMs,
      burst,
      storm,
      clock,
      turn,
      plainLine,
      plainWording,
    },
    isFolderUnloaded,
    (root) =>
      [...watched.values()].some(
        (entry) => childNameUnder(root, entry.root) !== undefined && hasLoadedStamp(entry),
      ),
  );
  let offBegin = turn.onBegin(onTurnChange);
  let offEnd = turn.onEnd(onTurnChange);
  function targetsOf(name, plugin) {
    let entry = watched.get(name) ?? plugin;
    return uniq([
      ...entry.manifests,
      ...(filesOf(name) ?? []),
      ...(entry.entry === undefined ? [] : [entry.entry]),
    ]);
  }
  function onChange(name, path, ctimeMs) {
    let entry = watched.get(name);
    let files = entry?.failed === undefined ? filesOf(name) : undefined;
    if (entry === undefined || !isChangedWatchTarget(path, entry.manifests, files)) return;
    tellChange(entry, path, ctimeMs);
  }
  function tellChange(entry, path, ctimeMs) {
    entry.telling = entry.telling.then(() => recordChange(entry, path, ctimeMs)).catch(logError);
  }
  let readAtOf = (entry, path) => (entry.manifests.includes(path) ? entry.manifestReadAt : entry.readAt);
  function snapshotOf(entry, path) {
    let taken = entry.takenStamps.get(path);
    let loadedStamp = entry.reloading ? undefined : loadedStampOf(entry.name, path);
    return pluginReadSnapshot(
      taken,
      entry.isBehind ? undefined : loadedStamp,
      (entry.tried.has(path) ? taken?.stamp : undefined) ?? loadedStamp,
    );
  }
  async function recordChange(entry, path, ctimeMs) {
    if (ctimeMs === undefined) return applyChange(entry, path, undefined);
    let stamp =
      snapshotOf(entry, path).read === undefined && ctimeMs <= readAtOf(entry, path)
        ? undefined
        : await stampOf(path, entry.root);
    return applyChange(entry, path, {
      ctimeMs,
      stamp,
    });
  }
  function applyChange(entry, path, change) {
    if (watched.get(entry.name) !== entry) return;
    let source = change && classifyChangeSource(change, snapshotOf(entry, path), readAtOf(entry, path));
    if (source === "served") dropPending(entry, path);
    if (source !== undefined) return;
    let isNewer = change === undefined || change.ctimeMs > entry.newest;
    entry.cause = preferManifestCause(entry, entry.cause, path);
    entry.newest = Math.max(entry.newest, change?.ctimeMs ?? Number.POSITIVE_INFINITY);
    if (change !== undefined)
      entry.pendingStamps.set(path, {
        ctimeMs: Math.max(change.ctimeMs, entry.pendingStamps.get(path)?.ctimeMs ?? change.ctimeMs),
        stamp: change.stamp,
      });
    if (!isNewer) return;
    let now = clock.now();
    entry.breaker.sawChange(now);
    scheduleReload(
      entry,
      nextReloadDelay(
        {
          debounceMs,
          burst,
          storm,
        },
        entry,
        {
          now,
          intervalMs: entry.watcher.interval(),
        },
      ),
    );
  }
  function dropPending(entry, path) {
    let dropped = entry.pendingStamps.delete(path);
    let isNewestUnknown = entry.newest === Number.POSITIVE_INFINITY;
    let remaining = [...entry.pendingStamps.keys()];
    if (dropped && remaining.length === 0 && !isNewestUnknown) resetEntry(entry);
    if (entry.cause === path && remaining.length > 0)
      entry.cause = remaining.reduce((acc, path) => preferManifestCause(entry, acc, path), undefined);
  }
  function clearServed(entry) {
    for (let [path, secondStamp] of [...entry.pendingStamps]) {
      let snapshot = snapshotOf(entry, path);
      if (snapshot.isServed && compareStamp(secondStamp.stamp, snapshot.read) === "same")
        dropPending(entry, path);
    }
  }
  function resetEntry(entry) {
    entry.cancelTimer?.();
    entry.cancelTimer = undefined;
    entry.cause = undefined;
    entry.newest = Number.NEGATIVE_INFINITY;
    entry.pendingStamps.clear();
    entry.pendingSince = undefined;
    entry.isHeld = false;
  }
  function scheduleReload(entry, delay) {
    if (entry.isRescanning) return;
    if (entry.breaker.isDeferring()) {
      if (entry.cancelTimer === undefined) armTimer(entry.name, storm.quietMs, onQuiet);
      return;
    }
    if (turn.isRunning()) {
      entry.cancelTimer?.();
      entry.cancelTimer = undefined;
      entry.isHeld = true;
      return;
    }
    armTimer(entry.name, delay, reloadNow);
  }
  function armTimer(name, delayMs, run) {
    let entry = watched.get(name);
    if (entry === undefined) return;
    entry.cancelTimer?.();
    entry.cancelTimer = clock.setTimeout(() => run(name), delayMs);
  }
  function onQuiet(name) {
    watched.get(name)?.breaker.catchesUp();
    reloadNow(name);
  }
  function syncRead(entry, snapshot) {
    entry.isBehind = entry.isBehind && (snapshot.isFaulted || snapshot.readAt < entry.readAt);
    entry.readAt = Math.max(entry.readAt, Math.min(snapshot.readAt, clock.now()));
    entry.failed = undefined;
    let causeIsManifest = entry.cause !== undefined && entry.manifests.includes(entry.cause);
    let filtered = [...entry.pendingStamps].filter(
      ([path, thirdStamp]) =>
        classifyChangeSource(thirdStamp, snapshotOf(entry, path), snapshot.readAt) === undefined,
    );
    if (filtered.length === 0 && entry.newest !== Number.POSITIVE_INFINITY && !causeIsManifest)
      resetEntry(entry);
    for (let [path, fourthStamp] of filtered) tellChange(entry, path, fourthStamp.ctimeMs);
  }
  function onTurnChange() {
    for (let entry of watched.values()) entry.boundary = entry.boundary.then(() => rescan(entry));
  }
  function rescan(entry) {
    if (watched.get(entry.name) !== entry || entry.breaker.isDeferring()) return Promise.resolve();
    entry.cancelTimer?.();
    entry.cancelTimer = undefined;
    entry.isRescanning = true;
    function done() {
      entry.isRescanning = false;
      entry.isHeld = false;
      reloadNow(entry.name);
    }
    let since = Math.min(entry.readAt, entry.manifestReadAt) - WATCH_CLOCK_SLACK_MS;
    return entry.watcher
      .rescan(since)
      .then(() => entry.telling)
      .then(done, done);
  }
  let resumeAfterTelling = (entry) =>
    entry.telling.then(() => {
      if (!entry.breaker.isDeferring()) {
        entry.isHeld = false;
        reloadNow(entry.name);
      }
    });
  let resumeAfterSettling = (entry) =>
    entry.settling.then(() => {
      if (entry.cause !== undefined && !entry.reloading && !entry.breaker.isDeferring()) {
        entry.isHeld = false;
        reloadNow(entry.name);
      }
      return entry.settling;
    });
  let hasLoadedStamp = (entry) =>
    targetsOf(entry.name, entry).some((path) => loadedStampOf(entry.name, path) !== undefined);
  function isFolderUnloaded(folder) {
    let entry = [...watched.values()].find((entry) => relative_2(entry.root, folder) === "");
    return entry !== undefined && !hasLoadedStamp(entry);
  }
  let tellForEntry = (entry, line) =>
    tellWatchLine(
      {
        tell,
        plainLine,
      },
      {
        plugin: entry.name,
        folder: dirname(entry.root),
      },
      line,
    );
  function reloadNow(name) {
    let entry = watched.get(name);
    if (entry?.cause === undefined) return;
    entry.cancelTimer?.();
    entry.cancelTimer = undefined;
    entry.isHeld = false;
    if (entry.reloading) {
      entry.again = preferManifestCause(entry, entry.again, entry.cause);
      entry.cause = undefined;
      return;
    }
    if (!entry.breaker.admits(clock.now())) {
      if (entry.breaker.isDeferring()) armTimer(name, storm.quietMs, onQuiet);
      return;
    }
    let cause = preferManifestCause(entry, entry.failed, entry.cause);
    let now = clock.now();
    let intervalMs = entry.watcher.interval();
    settleReloadPending(burst, entry, {
      now,
      intervalMs,
    });
    let since = now - WATCH_CLOCK_SLACK_MS;
    entry.readAt = Math.max(entry.readAt, since);
    if (entry.manifests.includes(cause)) entry.manifestReadAt = Math.max(entry.manifestReadAt, since);
    for (let [path, fifthStamp] of entry.pendingStamps) entry.takenStamps.set(path, fifthStamp);
    entry.tried = new Set(entry.pendingStamps.keys());
    entry.pendingStamps.clear();
    entry.isBehind = true;
    entry.cause = undefined;
    entry.newest = Number.NEGATIVE_INFINITY;
    entry.reloading = true;
    entry.settling = admit(entry.scope, cause)
      .then((admitted) => {
        if (!admitted) {
          tellForEntry(entry, vetoedNotice(cause, hasLoadedStamp(entry)));
          return;
        }
        return reloadOnChange(
          {
            reload,
            rereadManifest,
          },
          entry,
          cause,
        ).then(
          (line) => {
            entry.failed = undefined;
            entry.isBehind = false;
            tellForEntry(entry, line);
          },
          (error) => {
            entry.failed = cause;
            tellForEntry(entry, reloadFailureNotice(name, error, error instanceof ReloadFailedError));
          },
        );
      })
      .finally(() => {
        entry.reloading = false;
        entry.settledAt = clock.now();
        entry.watcher.retarget();
        let again = entry.again;
        entry.again = undefined;
        if (again !== undefined) entry.cause = preferManifestCause(entry, entry.cause, again);
        clearServed(entry);
        if (again !== undefined && entry.cause !== undefined) {
          entry.pendingSince ??= entry.settledAt;
          scheduleReload(entry, debounceMs);
        }
      });
  }
  function drop(name, entry) {
    entry.cancelTimer?.();
    watched.delete(name);
    return Promise.all([entry.watcher.close(), entry.telling]).then(() => {});
  }
  return {
    watchPlugins(plugins, snapshot) {
      let byName = new Map(plugins.map((plugin) => [plugin.name, plugin]));
      for (let [name, entry] of watched) {
        let plugin = byName.get(name);
        if (plugin?.root !== entry.root) {
          drop(name, entry);
          continue;
        }
        entry.manifests = plugin.manifests;
        entry.entry = plugin.entry;
        if (snapshot) syncRead(entry, snapshot);
        entry.watcher.retarget();
      }
      for (let [name, plugin] of byName) {
        let { root, scope, manifests } = plugin;
        if (!watched.has(name))
          watched.set(name, {
            name,
            root,
            scope,
            watcher: watchDir(
              {
                root,
                scope,
                files: () => targetsOf(name, plugin),
              },
              (path, ctimeMs) => onChange(name, path, ctimeMs),
              (path) => anyWithinDirs(path, targetsOf(name, plugin)),
            ),
            breaker: createReloadThrottle(storm, () =>
              tellWatchLine(
                {
                  tell,
                  plainLine,
                },
                {
                  plugin: name,
                  folder: dirname(root),
                },
                reloadStormNotice(storm, "paused"),
              ),
            ),
            manifests,
            entry: plugin.entry,
            cancelTimer: undefined,
            cause: undefined,
            reloading: false,
            failed: undefined,
            again: undefined,
            readAt: Math.min(snapshot?.readAt ?? clock.now(), clock.now()),
            manifestReadAt: Math.min(snapshot?.readAt ?? clock.now(), clock.now()),
            newest: Number.NEGATIVE_INFINITY,
            pendingStamps: new Map(),
            takenStamps: new Map(),
            tried: new Set(),
            pendingSince: undefined,
            changedAt: Number.NEGATIVE_INFINITY,
            settledAt: Number.NEGATIVE_INFINITY,
            isForced: false,
            isBehind: false,
            isHeld: false,
            isRescanning: false,
            boundary: Promise.resolve(),
            telling: Promise.resolve(),
            settling: Promise.resolve(),
          });
      }
    },
    watchCollections: collections.watchCollections,
    watched: () => [...watched.keys()],
    watchedCollections: collections.watchedCollections,
    isUnloaded: isFolderUnloaded,
    release(name) {
      let entry = watched.get(name);
      if (entry === undefined) return Promise.resolve();
      let isFast = entry.watcher.interval() <= RELOAD_MIN_NOTICE_MS;
      entry.boundary = entry.boundary.then(() => (isFast ? resumeAfterTelling(entry) : rescan(entry)));
      return entry.boundary.then(() => resumeAfterSettling(entry));
    },
    async dispose() {
      offBegin();
      offEnd();
      await Promise.all([...[...watched].map(([name, entry]) => drop(name, entry)), collections.dispose()]);
    },
  };
}
//@ chunk-e6aww6q8.js:4139257-4139467 placement
/**
 * 记录插件选项重载结果（重载、拒绝或失败）。
 */
function logOptionsReloads(results) {
  for (let result of results)
    switch (result.kind) {
      case "reloaded":
      case "refused":
        uiLog(result.name, OPTIONS_CHANGED_PREFIX + reloadedText(result.result), repeatWord(result.result));
        break;
      case "failed":
        uiLog(result.name, OPTIONS_CHANGED_PREFIX + describeReloadFailure(result.name, result.error));
        break;
      case "failing":
      case "held":
        break;
    }
}
//@ chunk-e6aww6q8.js:4139467-4139692 placement
function reportOptionsReloads(results) {
  let notices = [];
  for (let result of results) {
    let pluginStorageId = loadedModuleArgs(result.name)?.pluginStorageId ?? "";
    let storageId = hostStateRef.get(pluginStorageId);
    if (
      result.kind === "reloaded" &&
      !result.recovers &&
      storageId !== undefined &&
      storageId.before === storageId.now &&
      (isOfficialMarketplacePlugin(pluginStorageId) || isVouchedPolicyPluginId(pluginStorageId))
    )
      logForDebugging(`${result.name}: ${OPTIONS_CHANGED_PREFIX}` + reloadedText(result.result));
    else notices.push(result);
  }
  logOptionsReloads(notices);
}
//@ chunk-e6aww6q8.js:4139692-4139912 placement
/**
 * 订阅受信设置来源的变化，变化时重载插件选项并报告结果（只订阅一次）。
 */
function watchPluginOptionChanges(refreshOptions) {
  if (devModHostState.get() !== undefined) return;
  let unsubscribe = settingsChangeDetector.subscribe((source) => {
    if (!TRUSTED_SETTING_SOURCES_2.includes(source)) return;
    refreshOptions()
      .then(reportOptionsReloads)
      .catch((error) => {
        logForDebugging(`options watch: reload after a ${source} change failed: ` + errorMessage(error), {
          level: "error",
        });
      });
  });
  devModHostState.set(unsubscribe);
  registerCleanup(unsubscribe);
}
//@ chunk-e6aww6q8.js:4139912-4140125 placement
/**
 * hooks 模块整体被禁止时记录原因与被排除的插件，返回空列表。
 */
function logHooksModulesDisabled(loadedModules) {
  let joined = loadedModules
    .filter((plugin) => plugin.modulePath !== undefined)
    .map(hookPluginLabel)
    .join(", ");
  let lines = joined !== "";
  logForDebugging(
    `hooks modules not loaded: ${hooksModulesRefusalReason()}; no switch lifts it and no built-in plugin loads; kept out: ${lines ? joined : "(none)"}`,
  );
  return [];
}
//@ chunk-e6aww6q8.js:4140125-4140179 placement
/**
 * 大小 + 哈希
 */
var fileStamp = (text) => ({
  size: Buffer.byteLength(text),
  hash: bunHashOf(text),
});
//@ chunk-e6aww6q8.js:4140253-4140430 placement
/**
 * 读取插件清单文件的戳（受门控的 fd 读取），不可读时为 undefined。
 */
async function readManifestStamp(manifestPath, root) {
  let isInside = (await Promise.all([realpath(root), realpath(dirname(manifestPath))]).then(
    ([realManifest, realRoot]) => isWithinDir(realManifest, realRoot),
    () => false,
  ))
    ? await getFsImplementation().readFileFdGated(manifestPath, MAX_MODULE_BYTES)
    : null;
  return isInside === null ? undefined : fileStamp(isInside.content);
}
//@ chunk-e6aww6q8.js:4140463-4140593 placement
/**
 * 只保留被监视的插件目录。
 */
function filterWatchedPluginDirs(collections) {
  let roots = new Set(
    [
      ...watchedPluginDirs(collections),
      ...(pluginDirSlot.get() ?? []),
      ...(pluginDirWatchSlot.get() ?? []),
    ].map((root) => resolve_2(root)),
  );
  return collections.filter((root) => roots.has(resolve_2(root)));
}
//@ chunk-e6aww6q8.js:4140638-4140809 placement
/**
 * 插件的 manifest 相关路径：plugin.json、.claude-plugin 清单、hooks/hooks.json 以及 manifest.hooks 指定的文件。
 */
function pluginManifestPaths(collection, loadedModules) {
  let mapped = [collection.manifest.hooks ?? []]
    .flat()
    .filter((entry) => typeof entry === "string")
    .map((plugin) => resolve_2(loadedModules, plugin));
  return uniq([
    join(loadedModules, PLUGIN_MANIFEST_PATH_2),
    join(loadedModules, PLUGIN_JSON),
    join(loadedModules, "hooks", "hooks.json"),
    ...mapped,
  ]);
}
//@ chunk-e6aww6q8.js:4140858-4141215 placement
/**
 * 为 --plugin-dir 集合目录建立监视项：目录下各子插件名映射，以及未被正确服务的子项。
 */
function collectPluginDirRoots(collections, candidates) {
  return uniq(candidates.filter((path) => !isZipPathCaseInsensitive(path)).map((entry) => resolve_2(entry)))
    .filter((plugin) => !collections.some((modulePath) => relative_2(plugin, modulePath.path) === ""))
    .map((modulePath) => {
      let dir = new Map();
      let index = new Set();
      for (let ninthIndex of collections) {
        let tenthIndex = childNameUnder(modulePath, ninthIndex.path);
        if (tenthIndex === undefined) continue;
        dir.set(tenthIndex, ninthIndex.name);
        let pluginRoot = loadedModuleArgs(ninthIndex.name)?.pluginRoot;
        if (
          ninthIndex.modulePath !== undefined &&
          (pluginRoot === undefined || relative_2(pluginRoot, ninthIndex.path) !== "")
        )
          index.add(tenthIndex);
      }
      return {
        root: modulePath,
        loaded: dir,
        unserved: index,
      };
    });
}
//@ chunk-e6aww6q8.js:4141264-4141616 placement
/**
 * 为 --plugin-dir 下有 hooks 模块的插件生成 folder 范围的监视目标（根目录、manifest 列表、入口）。
 */
function folderWatchTargets(collections, roots) {
  let mapped = roots.map((root) => resolve_2(root));
  return collections
    .filter((plugin) => plugin.modulePath !== undefined)
    .flatMap((entry) => {
      let found = mapped.find((found) => relative_2(found, entry.path) === "");
      let any = mapped.some((found) => childNameUnder(found, entry.path) !== undefined);
      let index = found ?? (any ? resolve_2(entry.path) : undefined);
      if (index === undefined) return [];
      let manifests = pluginManifestPaths(entry, index);
      let { modulePath } = entry;
      let entry_2 = modulePath === undefined ? undefined : resolve_2(modulePath);
      return [
        {
          name: entry.name,
          root: index,
          scope: "folder",
          manifests,
          entry: entry_2,
        },
      ];
    });
}
//@ chunk-e6aww6q8.js:4141649-4141873 placement
var skillsWatchTargets = (loadedModules) =>
  loadedModules
    .filter((plugin) => plugin.modulePath !== undefined && plugin.source.endsWith(`@${SKILLS_DIR}`))
    .map((plugin) => {
      let prefix = resolve_2(plugin.path);
      let manifests = pluginManifestPaths(plugin, prefix);
      let { modulePath } = plugin;
      let entry = modulePath === undefined ? undefined : resolve_2(modulePath);
      return {
        name: plugin.name,
        root: prefix,
        scope: "files",
        manifests,
        entry,
      };
    });
//@ chunk-e6aww6q8.js:4141873-4141978 placement
/**
 * 监视用时钟：now 与可取消的 unref 定时器。
 */
var WATCH_CLOCK = {
  now: () => Date.now(),
  setTimeout(fn, ms) {
    let timer = setTimeout(fn, ms);
    timer.unref();
    return () => clearTimeout(timer);
  },
};
//@ chunk-e6aww6q8.js:4141978-4142280 placement
/**
 * files 范围的重载先经 ConfigChange 钩子把关；钩子未接好或抛错时不重载。
 */
async function passesConfigChangeGate(kind, snapshot) {
  if (kind !== "files") return true;
  let gate = reloadReasonSlot.get();
  if (gate === undefined) {
    logError(Error("plugin-dir watch: ConfigChange hook gate not wired"));
    return false;
  }
  try {
    return !(await gate("skills", snapshot));
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the ConfigChange hooks for ${snapshot} threw, so no reload: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:4142280-4142446 placement
/**
 * 列出目录子项；目录不存在时为空列表，其他错误返回 undefined。
 */
async function listDirChildren(root) {
  let shape = await describePluginDirShape(root);
  if (shape.kind === "collection") return shape.children;
  return shape.kind === "unreadable" && (shape.errno === "ENOENT" || shape.errno === "ENOTDIR")
    ? []
    : undefined;
}
//@ chunk-e6aww6q8.js:4142446-4142550 placement
/**
 * 取内置插件某文件源码的戳。
 */
function bundledFileStamp(name, file) {
  let args = loadedModuleArgs(name);
  let source = args && hooksModuleFiles(args).find((fileEntry) => fileEntry.file === file)?.source;
  return source === undefined ? undefined : fileStamp(source);
}
//@ chunk-e6aww6q8.js:4142550-4142628 placement
/**
 * 重载绑定的插件
 */
function reloadBoundPlugins() {
  let slot = pendingReloadSlot.get();
  return slot ? slot.reload() : Promise.resolve("unbound");
}
//@ chunk-e6aww6q8.js:4142628-4142639 placement
/**
 * false
 */
var WATCH_AUTO_RELOAD_OFF = false;
//@ chunk-e6aww6q8.js:4142673-4142709 placement
/**
 * 监视中的插件记录
 */
var watchedPluginRecords; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4142673", () => {
  watchedPluginRecords = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:4142709-4142723 placement
/**
 * 插件目录串行队列
 */
var pluginDirQueue; // deferred: uses createSerialQueue (./panes.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4142709", () => {
  pluginDirQueue = createSerialQueue();
});
//@ chunk-e6aww6q8.js:4142723-4142821 placement
/**
 * 惰性创建设备树宿主
 */
var lazyDeviceTreeHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4142723", () => {
  lazyDeviceTreeHost = memoizeAlias(async () => {
    let { createDeviceTreeHost } = await import("../../utils/fsAnchor/deviceTreeHost.js");
    return createDeviceTreeHost();
  });
});
//@ chunk-e6aww6q8.js:4142821-4142922 placement
function replacePluginRecord(plugin) {
  let records = watchedPluginRecords.get();
  if (records === undefined) return;
  watchedPluginRecords.set(
    records.map((record) => (record.path === plugin.path ? mergePluginRecord(record, plugin) : record)),
  );
}
//@ chunk-e6aww6q8.js:4142922-4143126 placement
var findHookLoadError = (errors) =>
  errors.find(
    (error) =>
      error.type === "hook-load-failed" ||
      error.type === "manifest-parse-error" ||
      error.type === "manifest-validation-error" ||
      ((error.type === "path-not-found" || error.type === "path-traversal") && error.component === "hooks"),
  );
//@ chunk-e6aww6q8.js:4143126-4143460 placement
/**
 * 重新读取插件（manifest 与 hooks 模块），有加载错误则抛出，成功后更新 manifest 列表与插件记录。
 */
async function retargetPluginModule(plugin) {
  let manifests = plugin.manifests;
  let reread;
  async function keepEntry(previous) {
    let { plugin: plugin_2, errors } = await createPluginFromPath(
      previous.path,
      previous.source,
      previous.enabled ?? true,
      basename(previous.path),
      WATCH_AUTO_RELOAD_OFF,
    );
    let hookLoadError = findHookLoadError(errors);
    if (hookLoadError !== undefined)
      throw new HooksError(`${previous.name}: ${pluginErrorText(hookLoadError)}`);
    manifests = pluginManifestPaths(plugin_2, plugin.root);
    reread = plugin_2;
    return plugin_2;
  }
  let next = await retargetHooksModule(plugin.name, keepEntry);
  if (reread) {
    pendingReloadSlot.get()?.retarget(reread);
    replacePluginRecord(reread);
  }
  return next === undefined
    ? undefined
    : {
        ...next,
        manifests,
      };
}
//@ chunk-e6aww6q8.js:4143460-4143602 placement
/**
 * 回合状态探针：是否有回合运行、是否为人工发起，订阅回合开始/结束。
 */
var TURN_STATE_PROBE = {
  isRunning: () => currentTurn() !== undefined,
  isPersonTurn: () => currentTurn()?.isPersonStarted === true,
  onBegin: (handler) => turnFinishedSignal.subscribe(handler),
  onEnd: (handler) => turnEndedSignal.subscribe(handler),
};
//@ chunk-e6aww6q8.js:4143650-4143756 placement
/**
 * 判断目录是否为当前 mods 文件夹或位于全局 mods 目录下。
 */
function isInModsFolder(path) {
  let folder = skillWatchStateByHost.get()?.folder;
  return (
    (folder !== undefined && resolve_2(folder) === resolve_2(path)) ||
    (!isDiskless() && dirname(resolve_2(path)) === resolve_2(devModsDir()))
  );
}
//@ chunk-e6aww6q8.js:4145928-4146092 placement
function isWatchedCollectionPath(path, root) {
  let [head, ...rest] = relative_2(root, path).split(sep);
  if (head === undefined || head === "") return true;
  if (head === ".." || !isNotDotPrefixed(head)) return false;
  let joined = rest.join(sep);
  return joined === "" || joined === dirname(PLUGIN_MANIFEST_PATH_2) || joined === PLUGIN_MANIFEST_PATH_2;
}
//@ chunk-e6aww6q8.js:4146092-4146542 placement
/**
 * 监视 --plugin-dir 集合目录（深度 2，只关心子插件目录与清单），任何增删改都触发回调。
 */
function watchPluginCollection(root, name) {
  let watcher = realpathOrSelf(root).then((realPath) => {
    let mapPath = watchPathMapper(root, realPath);
    let instance = chokidar_default.watch(realPath, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      ignorePermissionErrors: true,
      depth: MAX_LISTED_MOD_CHANGES,
      ignored: (watcher) => !isWatchedCollectionPath(mapPath(watcher), root),
      usePolling: true,
      interval: WATCH_ACTIVE_POLL_MS,
      binaryInterval: WATCH_ACTIVE_POLL_MS,
    });
    let path = () => name();
    instance.on("add", path);
    instance.on("addDir", path);
    instance.on("change", path);
    instance.on("unlink", path);
    instance.on("unlinkDir", path);
    instance.on("error", (stat) =>
      logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(stat)}`, {
        level: "warn",
      }),
    );
    return instance;
  });
  return {
    close: async () => (await watcher).close(),
  };
}
//@ chunk-e6aww6q8.js:4157047-4157494 placement
/**
 * 根据 --plugin-dir、技能目录与已有监视器，启动对开发中插件的文件监视与集合目录监视。
 */
function startPluginDirWatches(options, onChange, isServing) {
  let isOn = isPluginDirWatchOn();
  let dirs = watchedPluginDirs(inlinePlugins());
  let controller = reloadControllerSlot.get();
  if (!isOn && dirs.length === 0 && controller === undefined) return;
  let watcher = reloadReasonSlot.get() !== undefined;
  reloadTimerSlot.set(watcher ? undefined : () => startPluginDirWatches(options, onChange, isServing));
  let secondWatcher = isOn && watcher;
  let watchTargets = [
    ...folderWatchTargets(options, dirs),
    ...(secondWatcher ? skillsWatchTargets(options) : []),
  ];
  let pluginDirRoots = collectPluginDirRoots(onChange, dirs);
  if (controller === undefined && watchTargets.length === 0 && pluginDirRoots.length === 0) return;
  let dirEntry = controller ?? startPluginDirWatcher();
  dirEntry.watchPlugins(watchTargets, isServing);
  dirEntry.watchCollections(pluginDirRoots);
  logForDebugging(
    `plugin-dir watch: watching ${dirEntry.watched().join(", ") || "nothing"}; folders of plugins ${dirEntry.watchedCollections().join(", ") || "none"}`,
  );
}
//@ chunk-e6aww6q8.js:4157532-4157595 placement
/**
 * URI 解码失败返回 undefined
 */
function decodeUriOrUndefined(uri) {
  try {
    return decodeURIComponent(uri);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4157595-4157607 placement
/**
 * 405
 */
var HTTP_METHOD_NOT_ALLOWED = 405;
//@ chunk-e6aww6q8.js:4157607-4157619 placement
/**
 * 404
 */
var HTTP_NOT_FOUND = 404;
export {
  childNameUnder,
  WATCH_CLOCK_SLACK_MS,
  isIgnoredWatchPath,
  isInsideTypesDir,
  WATCH_IGNORED_DIRS,
  reloadBoundPlugins,
  logHooksModulesDisabled,
  WATCH_CLOCK,
  startPluginDirWatches,
  watchPluginOptionChanges,
  isWithinDir,
  lazyDeviceTreeHost,
  filterWatchedPluginDirs,
  folderWatchTargets,
  pluginDirQueue,
  watchedPluginRecords,
  runPluginDirWatch,
  startPluginWatch,
  readManifestStamp,
  bundledFileStamp,
  retargetPluginModule,
  passesConfigChangeGate,
  TURN_STATE_PROBE,
  watchPluginCollection,
  listDirChildren,
  isInModsFolder,
  decodeUriOrUndefined,
  HTTP_NOT_FOUND,
  HTTP_METHOD_NOT_ALLOWED,
  logOptionsReloads,
  collectPluginDirRoots,
  createWatchIgnorer,
  WATCH_ACTIVE_POLL_MS,
};
