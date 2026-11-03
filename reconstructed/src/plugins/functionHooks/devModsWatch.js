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
import { relative, isAbsolute, sep, join, resolve as resolve_2, basename, dirname } from "path";
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
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HooksError } from "./hooksErrors.js";
import { pluginErrorText } from "../../types/plugin.js";
import { currentTurn, turnFinishedSignal, turnEndedSignal } from "./personHold.js";
import { skillWatchStateByHost } from "../../skills/skillChangeWatch.js";
import { devModsDir } from "./devModsName.js";
import { MAX_LISTED_MOD_CHANGES } from "./devModsNotices.js";

//@ chunk-e6aww6q8.js:4127280-4127384 placement
/**
 * n 是 e 的直接子项时返回子项名，否则 undefined。
 */
function childNameUnder(e, n) {
  let r = relative(e, n);
  return r !== "" && !isAbsolute(r) && !r.startsWith("..") && !r.includes(sep) ? r : undefined;
}
//@ chunk-e6aww6q8.js:4127445-4127486 placement
/**
 * 把变更路径映射到根下
 */
var watchPathMapper = (e, n) => (r) => join(e, relative(n, resolve_2(r)));
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
function isIgnoredWatchPath(e, n) {
  let r = basename(e);
  let s = r.startsWith(".") && r !== ".claude-plugin";
  let h = e === n || e === join(dirname(n), "latest");
  return WATCH_IGNORED_DIRS.includes(r) || s || r.endsWith(".log") || h;
}
//@ chunk-e6aww6q8.js:4127944-4128028 placement
/**
 * 路径是否在目录内
 */
function isWithinDir(e, n) {
  let r = relative(e, n);
  return !(isAbsolute(r) || r === ".." || r.startsWith(`..${sep}`));
}
//@ chunk-e6aww6q8.js:4128028-4128144 placement
function ancestorPathsWithin(e, n) {
  let r = relative(e, n);
  let s = r === "" ? [] : r.split(sep);
  return isWithinDir(e, n) ? s.map((h, y) => join(e, ...s.slice(0, y + 1))) : [n];
}
//@ chunk-e6aww6q8.js:4128402-4128433 placement
/**
 * 是否在 types 目录内
 */
var isInsideTypesDir = (e, n) => isWithinDir(join(e, TYPES_DIR), n);
//@ chunk-e6aww6q8.js:4128433-4128570 placement
/**
 * 生成 chokidar ignored 函数：路径链上有忽略目录、在插件缓存里或命中忽略规则（且非 manifest）时忽略。
 */
var createWatchIgnorer = (e, debugLogPath, r) => (s) => {
  let h = resolve_2(s);
  let y = ancestorPathsWithin(e, h);
  let any = y.some((L) => WATCH_IGNORED_DIRS.includes(basename(L)));
  let any_2 = y.some((L) => isIgnoredWatchPath(L, debugLogPath));
  return any || isInsideTypesDir(e, h) || (any_2 && !r(h));
};
//@ chunk-e6aww6q8.js:4128570-4128606 placement
/**
 * 任一目录内
 */
var anyWithinDirs = (e, n) => n.some((r) => isWithinDir(e, r));
//@ chunk-e6aww6q8.js:4128606-4128618 placement
/**
 * 100
 */
var WATCH_STABILITY_MS = 100;
//@ chunk-e6aww6q8.js:4128618-4128977 placement
/**
 * 按用户最近交互切换监视轮询频率（活动/空闲），切换时回调以补扫。
 */
function createIdlePacer(root, pace, r) {
  let s = false;
  let activeMs = pace.activeMs;
  let y = pace.now();
  let interval = setInterval(() => {
    let w = pace.now();
    let L = w - pace.lastInteractionTime() > pace.idleAfterMs;
    if (L === s) return;
    let G = Math.max(y, w - activeMs) - WATCH_STABILITY_MS;
    s = L;
    activeMs = s ? pace.idleMs : pace.activeMs;
    y = w;
    logForDebugging(`plugin-dir watch on ${root}: ${s ? "idle" : "active"}, polling every ${activeMs}ms`);
    r(G);
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
var watchOptionsFor = (e) => ({
  persistent: true,
  followSymlinks: false,
  ignorePermissionErrors: true,
  usePolling: true,
  interval: e,
  binaryInterval: e,
  awaitWriteFinish: {
    stabilityThreshold: WATCH_STABILITY_MS,
    pollInterval: WATCH_STABILITY_MS / 2,
  },
});
//@ chunk-e6aww6q8.js:4129196-4129229 placement
/**
 * 真实路径或原值
 */
var realpathOrSelf = (e) => realpath(e).catch(() => e);
//@ chunk-e6aww6q8.js:4129229-4130260 placement
/**
 * 在一个插件目录上建立文件监视（chokidar 风格的 add/change/unlink 事件），失败时降级为轮询。
 */
function openPluginDirWatcher({ root, ignored, onChange, pace }) {
  let idlePacer = createIdlePacer(root, pace, (q) => {
    L(q);
  });
  let y;
  let S = G(undefined).then((q) => q.watcher);
  let w = (q) =>
    logForDebugging(`plugin-dir watch on ${root}: close failed: ${errorMessage(q)}`, {
      level: "warn",
    });
  function L(q) {
    let Z = S.then(async (Se) => {
      await Se.close().then(undefined, w);
      y?.scanned.resolve();
      return G(q);
    });
    S = Z.then((Se) => Se.watcher);
    return Z.then((Se) => Se.scanned.promise);
  }
  async function G(q) {
    let Z = await realpathOrSelf(root);
    let Se = watchPathMapper(root, Z);
    let ke = typeof ignored === "function";
    let we = q !== undefined;
    let deferred = Promise.withResolvers();
    let Ae = chokidar_default.watch(Z, {
      ...watchOptionsFor(idlePacer.interval()),
      ignoreInitial: q === undefined,
      alwaysStat: q !== undefined,
      ignored: ke ? (Ie, Me) => ignored(Se(Ie), Me) : ignored,
    });
    Ae.on("add", (Ie, Me) => {
      if (!we || (Me !== undefined && Me.ctimeMs > (q ?? 0))) onChange(Se(Ie), Me?.ctimeMs);
    });
    Ae.on("ready", () => {
      we = false;
      deferred.resolve();
    });
    Ae.on("change", (Ie, Me) => onChange(Se(Ie), Me?.ctimeMs));
    Ae.on("unlink", (Ie) => {
      onChange(Se(Ie));
    });
    Ae.on("error", (Ie) =>
      logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(Ie)}`, {
        level: "warn",
      }),
    );
    y = {
      watcher: Ae,
      scanned: deferred,
    };
    return y;
  }
  return {
    close: async () => {
      idlePacer.stop();
      await (await S).close();
      y?.scanned.resolve();
    },
    retarget: () => {},
    interval: idlePacer.interval,
    rescan: L,
  };
}
//@ chunk-e6aww6q8.js:4130297-4130448 placement
var statFiles = async (e) =>
  (
    await Promise.all(
      e.map((n) =>
        stat(n).then(
          (r) =>
            r.isFile()
              ? {
                  path: n,
                  ctimeMs: r.ctimeMs,
                }
              : undefined,
          () => {
            return;
          },
        ),
      ),
    )
  ).filter((n) => n !== undefined);
//@ chunk-e6aww6q8.js:4130448-4131608 placement
/**
 * 处理插件目录的文件变化事件，安排对应 mod 的重新加载。
 */
function handlePluginDirWatchEvent({ root, files, onChange, pace }) {
  let idlePacer = createIdlePacer(root, pace, (Se) => {
    w = w.then((ke) => q(ke, Se));
  });
  let y = new Set();
  let S = new Set();
  let w = q(undefined, undefined);
  let L = G();
  function G() {
    let timer = setTimeout(() => {
      w = w.then(Z);
      L = G();
    }, idlePacer.interval());
    timer.unref();
    return timer;
  }
  async function q(Se, ke) {
    await Se?.close();
    let we = files();
    let Ee = await statFiles(we);
    y.clear();
    for (let Ie of Ee) {
      y.add(Ie.path);
      if (ke !== undefined && Ie.ctimeMs > ke) onChange(Ie.path, Ie.ctimeMs);
    }
    S = new Set(we.filter((Ie) => !y.has(Ie)));
    let Ae = chokidar_default.watch([...y], {
      ...watchOptionsFor(idlePacer.interval()),
      ignoreInitial: true,
    });
    Ae.on("change", (Ie, Me) => onChange(Ie, Me?.ctimeMs));
    Ae.on("unlink", (Ie) => {
      y.delete(Ie);
      S.add(Ie);
      onChange(Ie);
    });
    Ae.on("error", (Ie) =>
      logForDebugging(`plugin-dir watch on ${root}: ${errorMessage(Ie)}`, {
        level: "warn",
      }),
    );
    return Ae;
  }
  async function Z(Se) {
    let ke = files();
    let we = new Map((await statFiles(ke)).map((Ee) => [Ee.path, Ee.ctimeMs]));
    for (let [Ee, Ae] of we)
      if (!y.has(Ee)) {
        Se.add(Ee);
        y.add(Ee);
        if (S.has(Ee)) onChange(Ee, Ae);
      }
    for (let Ee of [...y])
      if (!ke.includes(Ee)) {
        Se.unwatch(Ee);
        y.delete(Ee);
      }
    S = new Set(ke.filter((Ee) => !we.has(Ee) && !y.has(Ee)));
    return Se;
  }
  return {
    close: async () => {
      idlePacer.stop();
      clearTimeout(L);
      await (await w).close();
    },
    retarget: () => {
      w = w.then(Z);
    },
    interval: idlePacer.interval,
    rescan(Se) {
      w = w.then((ke) => q(ke, Se));
      return w.then(() => {});
    },
  };
}
//@ chunk-e6aww6q8.js:4131608-4131620 placement
/**
 * 监视器活跃时的轮询间隔 400 毫秒；空闲后按 idleMs 放慢。
 */
var WATCH_ACTIVE_POLL_MS = 400;
//@ chunk-e6aww6q8.js:4131620-4131723 placement
var WATCH_PACE = {
  activeMs: WATCH_ACTIVE_POLL_MS,
  idleMs: WATCH_IDLE_MS,
  idleAfterMs: WATCH_IDLE_AFTER_MS,
  checkEveryMs: WATCH_CHECK_EVERY_MS,
  lastInteractionTime: getLastInteractionTime,
  now: Date.now,
};
//@ chunk-e6aww6q8.js:4131723-4131888 placement
/**
 * 按插件范围启动监视：folder 用目录监视，files 只监视指定文件。
 */
function startPluginWatch(e, onChange, r) {
  return e.scope === "folder"
    ? openPluginDirWatcher({
        root: e.root,
        ignored: createWatchIgnorer(e.root, getDebugLogPath(), r),
        onChange,
        pace: WATCH_PACE,
      })
    : handlePluginDirWatchEvent({
        root: e.root,
        files: e.files,
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
var isChangedWatchTarget = (e, manifests, r) =>
  manifests.includes(e) || (r === undefined ? isScriptFile(e) : r.includes(e));
//@ chunk-e6aww6q8.js:4131965-4132024 placement
/**
 * 插件读取快照
 */
var pluginReadSnapshot = (taken, n, r) => ({
  read: n ?? r,
  isServed: n !== undefined,
  taken,
});
//@ chunk-e6aww6q8.js:4132024-4132116 placement
/**
 * 优先把 manifest 变化当原因
 */
function preferManifestCause(e, n, r) {
  return n !== undefined && e.manifests.includes(n) && !e.manifests.includes(r) ? n : r;
}
//@ chunk-e6aww6q8.js:4132116-4132514 placement
/**
 * 某插件文件变化时：非 manifest 文件直接重载；manifest 变化则重读 manifest，按"需重启/不再有入口/重载"给出状态。
 */
async function reloadOnChange(e, n, r) {
  let { name: s, root, scope } = n;
  if (!n.manifests.includes(r)) {
    let G = await e.reload(s);
    return reloadedNotice(reloadedText(G), G);
  }
  let S = await e.rereadManifest({
    name: s,
    root,
    scope,
    manifests: n.manifests,
    entry: n.entry,
  });
  if (!S) return restartNeededNotice(r);
  n.manifests = S.manifests;
  n.entry = S.now;
  let w = {
    manifest: r,
    root,
  };
  if (S.now === undefined) return unnamedNotice(describeModuleUnnamed(w, S.before));
  let L = await e.reload(s);
  return reloadedNotice(describeManifestReload(w, S, L), L);
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
  let Me = new Map();
  let We = reportPluginDirWatchChanges(
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
    fo,
    (co) => [...Me.values()].some((So) => childNameUnder(co, So.root) !== undefined && Xn(So)),
  );
  let ze = turn.onBegin(hn);
  let lt = turn.onEnd(hn);
  function Je(co, So) {
    let ko = Me.get(co) ?? So;
    return uniq([...ko.manifests, ...(filesOf(co) ?? []), ...(ko.entry === undefined ? [] : [ko.entry])]);
  }
  function nt(co, So, ko) {
    let un = Me.get(co);
    let ao = un?.failed === undefined ? filesOf(co) : undefined;
    if (un === undefined || !isChangedWatchTarget(So, un.manifests, ao)) return;
    pt(un, So, ko);
  }
  function pt(co, So, ko) {
    co.telling = co.telling.then(() => gt(co, So, ko)).catch(logError);
  }
  let Et = (co, So) => (co.manifests.includes(So) ? co.manifestReadAt : co.readAt);
  function yt(co, So) {
    let taken = co.takenStamps.get(So);
    let un = co.reloading ? undefined : loadedStampOf(co.name, So);
    return pluginReadSnapshot(
      taken,
      co.isBehind ? undefined : un,
      (co.tried.has(So) ? taken?.stamp : undefined) ?? un,
    );
  }
  async function gt(co, So, ko) {
    if (ko === undefined) return At(co, So, undefined);
    let stamp = yt(co, So).read === undefined && ko <= Et(co, So) ? undefined : await stampOf(So, co.root);
    return At(co, So, {
      ctimeMs: ko,
      stamp,
    });
  }
  function At(co, So, ko) {
    if (Me.get(co.name) !== co) return;
    let un = ko && classifyChangeSource(ko, yt(co, So), Et(co, So));
    if (un === "served") It(co, So);
    if (un !== undefined) return;
    let ao = ko === undefined || ko.ctimeMs > co.newest;
    co.cause = preferManifestCause(co, co.cause, So);
    co.newest = Math.max(co.newest, ko?.ctimeMs ?? Number.POSITIVE_INFINITY);
    if (ko !== undefined)
      co.pendingStamps.set(So, {
        ctimeMs: Math.max(ko.ctimeMs, co.pendingStamps.get(So)?.ctimeMs ?? ko.ctimeMs),
        stamp: ko.stamp,
      });
    if (!ao) return;
    let $o = clock.now();
    co.breaker.sawChange($o);
    Zt(
      co,
      nextReloadDelay(
        {
          debounceMs,
          burst,
          storm,
        },
        co,
        {
          now: $o,
          intervalMs: co.watcher.interval(),
        },
      ),
    );
  }
  function It(co, So) {
    let ko = co.pendingStamps.delete(So);
    let un = co.newest === Number.POSITIVE_INFINITY;
    let ao = [...co.pendingStamps.keys()];
    if (ko && ao.length === 0 && !un) qt(co);
    if (co.cause === So && ao.length > 0)
      co.cause = ao.reduce((acc, yo) => preferManifestCause(co, acc, yo), undefined);
  }
  function Yt(co) {
    for (let [So, ko] of [...co.pendingStamps]) {
      let un = yt(co, So);
      if (un.isServed && compareStamp(ko.stamp, un.read) === "same") It(co, So);
    }
  }
  function qt(co) {
    co.cancelTimer?.();
    co.cancelTimer = undefined;
    co.cause = undefined;
    co.newest = Number.NEGATIVE_INFINITY;
    co.pendingStamps.clear();
    co.pendingSince = undefined;
    co.isHeld = false;
  }
  function Zt(co, So) {
    if (co.isRescanning) return;
    if (co.breaker.isDeferring()) {
      if (co.cancelTimer === undefined) rn(co.name, storm.quietMs, pn);
      return;
    }
    if (turn.isRunning()) {
      co.cancelTimer?.();
      co.cancelTimer = undefined;
      co.isHeld = true;
      return;
    }
    rn(co.name, So, bo);
  }
  function rn(name, quietMs, ko) {
    let un = Me.get(name);
    if (un === undefined) return;
    un.cancelTimer?.();
    un.cancelTimer = clock.setTimeout(() => ko(name), quietMs);
  }
  function pn(co) {
    Me.get(co)?.breaker.catchesUp();
    bo(co);
  }
  function no(co, So) {
    co.isBehind = co.isBehind && (So.isFaulted || So.readAt < co.readAt);
    co.readAt = Math.max(co.readAt, Math.min(So.readAt, clock.now()));
    co.failed = undefined;
    let ko = co.cause !== undefined && co.manifests.includes(co.cause);
    let filtered = [...co.pendingStamps].filter(
      ([$o, yo]) => classifyChangeSource(yo, yt(co, $o), So.readAt) === undefined,
    );
    if (filtered.length === 0 && co.newest !== Number.POSITIVE_INFINITY && !ko) qt(co);
    for (let [$o, yo] of filtered) pt(co, $o, yo.ctimeMs);
  }
  function hn() {
    for (let co of Me.values()) co.boundary = co.boundary.then(() => ho(co));
  }
  function ho(co) {
    if (Me.get(co.name) !== co || co.breaker.isDeferring()) return Promise.resolve();
    co.cancelTimer?.();
    co.cancelTimer = undefined;
    co.isRescanning = true;
    function ko() {
      co.isRescanning = false;
      co.isHeld = false;
      bo(co.name);
    }
    let un = Math.min(co.readAt, co.manifestReadAt) - WATCH_CLOCK_SLACK_MS;
    return co.watcher
      .rescan(un)
      .then(() => co.telling)
      .then(ko, ko);
  }
  let yn = (co) =>
    co.telling.then(() => {
      if (!co.breaker.isDeferring()) {
        co.isHeld = false;
        bo(co.name);
      }
    });
  let Kn = (co) =>
    co.settling.then(() => {
      if (co.cause !== undefined && !co.reloading && !co.breaker.isDeferring()) {
        co.isHeld = false;
        bo(co.name);
      }
      return co.settling;
    });
  let Xn = (co) => Je(co.name, co).some((So) => loadedStampOf(co.name, So) !== undefined);
  function fo(co) {
    let found = [...Me.values()].find((ko) => relative(ko.root, co) === "");
    return found !== undefined && !Xn(found);
  }
  let To = (co, So) =>
    tellWatchLine(
      {
        tell,
        plainLine,
      },
      {
        plugin: co.name,
        folder: dirname(co.root),
      },
      So,
    );
  function bo(name) {
    let So = Me.get(name);
    if (So?.cause === undefined) return;
    So.cancelTimer?.();
    So.cancelTimer = undefined;
    So.isHeld = false;
    if (So.reloading) {
      So.again = preferManifestCause(So, So.again, So.cause);
      So.cause = undefined;
      return;
    }
    if (!So.breaker.admits(clock.now())) {
      if (So.breaker.isDeferring()) rn(name, storm.quietMs, pn);
      return;
    }
    let ko = preferManifestCause(So, So.failed, So.cause);
    let un = clock.now();
    let intervalMs = So.watcher.interval();
    settleReloadPending(burst, So, {
      now: un,
      intervalMs,
    });
    let $o = un - WATCH_CLOCK_SLACK_MS;
    So.readAt = Math.max(So.readAt, $o);
    if (So.manifests.includes(ko)) So.manifestReadAt = Math.max(So.manifestReadAt, $o);
    for (let [yo, Ho] of So.pendingStamps) So.takenStamps.set(yo, Ho);
    So.tried = new Set(So.pendingStamps.keys());
    So.pendingStamps.clear();
    So.isBehind = true;
    So.cause = undefined;
    So.newest = Number.NEGATIVE_INFINITY;
    So.reloading = true;
    So.settling = admit(So.scope, ko)
      .then((yo) => {
        if (!yo) {
          To(So, vetoedNotice(ko, Xn(So)));
          return;
        }
        return reloadOnChange(
          {
            reload,
            rereadManifest,
          },
          So,
          ko,
        ).then(
          (Ho) => {
            So.failed = undefined;
            So.isBehind = false;
            To(So, Ho);
          },
          (error) => {
            So.failed = ko;
            To(So, reloadFailureNotice(name, error, error instanceof ReloadFailedError));
          },
        );
      })
      .finally(() => {
        So.reloading = false;
        So.settledAt = clock.now();
        So.watcher.retarget();
        let again = So.again;
        So.again = undefined;
        if (again !== undefined) So.cause = preferManifestCause(So, So.cause, again);
        Yt(So);
        if (again !== undefined && So.cause !== undefined) {
          So.pendingSince ??= So.settledAt;
          Zt(So, debounceMs);
        }
      });
  }
  function vn(co, So) {
    So.cancelTimer?.();
    Me.delete(co);
    return Promise.all([So.watcher.close(), So.telling]).then(() => {});
  }
  return {
    watchPlugins(co, So) {
      let ko = new Map(co.map((un) => [un.name, un]));
      for (let [un, ao] of Me) {
        let $o = ko.get(un);
        if ($o?.root !== ao.root) {
          vn(un, ao);
          continue;
        }
        ao.manifests = $o.manifests;
        ao.entry = $o.entry;
        if (So) no(ao, So);
        ao.watcher.retarget();
      }
      for (let [un, ao] of ko) {
        let { root, scope, manifests } = ao;
        if (!Me.has(un))
          Me.set(un, {
            name: un,
            root,
            scope,
            watcher: watchDir(
              {
                root,
                scope,
                files: () => Je(un, ao),
              },
              (rr, br) => nt(un, rr, br),
              (rr) => anyWithinDirs(rr, Je(un, ao)),
            ),
            breaker: createReloadThrottle(storm, () =>
              tellWatchLine(
                {
                  tell,
                  plainLine,
                },
                {
                  plugin: un,
                  folder: dirname(root),
                },
                reloadStormNotice(storm, "paused"),
              ),
            ),
            manifests,
            entry: ao.entry,
            cancelTimer: undefined,
            cause: undefined,
            reloading: false,
            failed: undefined,
            again: undefined,
            readAt: Math.min(So?.readAt ?? clock.now(), clock.now()),
            manifestReadAt: Math.min(So?.readAt ?? clock.now(), clock.now()),
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
    watchCollections: We.watchCollections,
    watched: () => [...Me.keys()],
    watchedCollections: We.watchedCollections,
    isUnloaded: fo,
    release(co) {
      let So = Me.get(co);
      if (So === undefined) return Promise.resolve();
      let ko = So.watcher.interval() <= RELOAD_MIN_NOTICE_MS;
      So.boundary = So.boundary.then(() => (ko ? yn(So) : ho(So)));
      return So.boundary.then(() => Kn(So));
    },
    async dispose() {
      ze();
      lt();
      await Promise.all([...[...Me].map(([co, So]) => vn(co, So)), We.dispose()]);
    },
  };
}
//@ chunk-e6aww6q8.js:4139257-4139467 placement
/**
 * 记录插件选项重载结果（重载、拒绝或失败）。
 */
function logOptionsReloads(e) {
  for (let n of e)
    switch (n.kind) {
      case "reloaded":
      case "refused":
        uiLog(n.name, OPTIONS_CHANGED_PREFIX + reloadedText(n.result), repeatWord(n.result));
        break;
      case "failed":
        uiLog(n.name, OPTIONS_CHANGED_PREFIX + describeReloadFailure(n.name, n.error));
        break;
      case "failing":
      case "held":
        break;
    }
}
//@ chunk-e6aww6q8.js:4139467-4139692 placement
function reportOptionsReloads(e) {
  let n = [];
  for (let r of e) {
    let pluginStorageId = loadedModuleArgs(r.name)?.pluginStorageId ?? "";
    let h = hostStateRef.get(pluginStorageId);
    if (
      r.kind === "reloaded" &&
      !r.recovers &&
      h !== undefined &&
      h.before === h.now &&
      (isOfficialMarketplacePlugin(pluginStorageId) || isVouchedPolicyPluginId(pluginStorageId))
    )
      logForDebugging(`${r.name}: ${OPTIONS_CHANGED_PREFIX}` + reloadedText(r.result));
    else n.push(r);
  }
  logOptionsReloads(n);
}
//@ chunk-e6aww6q8.js:4139692-4139912 placement
/**
 * 订阅受信设置来源的变化，变化时重载插件选项并报告结果（只订阅一次）。
 */
function watchPluginOptionChanges(refreshOptions) {
  if (devModHostState.get() !== undefined) return;
  let n = settingsChangeDetector.subscribe((r) => {
    if (!TRUSTED_SETTING_SOURCES_2.includes(r)) return;
    refreshOptions()
      .then(reportOptionsReloads)
      .catch((error) => {
        logForDebugging(`options watch: reload after a ${r} change failed: ` + errorMessage(error), {
          level: "error",
        });
      });
  });
  devModHostState.set(n);
  registerCleanup(n);
}
//@ chunk-e6aww6q8.js:4139912-4140125 placement
/**
 * hooks 模块整体被禁止时记录原因与被排除的插件，返回空列表。
 */
function logHooksModulesDisabled(e) {
  let joined = e
    .filter((s) => s.modulePath !== undefined)
    .map(hookPluginLabel)
    .join(", ");
  let r = joined !== "";
  logForDebugging(
    `hooks modules not loaded: ${hooksModulesRefusalReason()}; no switch lifts it and no built-in plugin loads; kept out: ${r ? joined : "(none)"}`,
  );
  return [];
}
//@ chunk-e6aww6q8.js:4140125-4140179 placement
/**
 * 大小 + 哈希
 */
var fileStamp = (e) => ({
  size: Buffer.byteLength(e),
  hash: bunHashOf(e),
});
//@ chunk-e6aww6q8.js:4140253-4140430 placement
/**
 * 读取插件清单文件的戳（受门控的 fd 读取），不可读时为 undefined。
 */
async function readManifestStamp(e, n) {
  let s = (await Promise.all([realpath(n), realpath(dirname(e))]).then(
    ([h, y]) => isWithinDir(h, y),
    () => false,
  ))
    ? await getFsImplementation().readFileFdGated(e, MAX_MODULE_BYTES)
    : null;
  return s === null ? undefined : fileStamp(s.content);
}
//@ chunk-e6aww6q8.js:4140463-4140593 placement
/**
 * 只保留被监视的插件目录。
 */
function filterWatchedPluginDirs(e) {
  let n = new Set(
    [...watchedPluginDirs(e), ...(pluginDirSlot.get() ?? []), ...(pluginDirWatchSlot.get() ?? [])].map((r) =>
      resolve_2(r),
    ),
  );
  return e.filter((r) => n.has(resolve_2(r)));
}
//@ chunk-e6aww6q8.js:4140638-4140809 placement
/**
 * 插件的 manifest 相关路径：plugin.json、.claude-plugin 清单、hooks/hooks.json 以及 manifest.hooks 指定的文件。
 */
function pluginManifestPaths(e, n) {
  let mapped = [e.manifest.hooks ?? []]
    .flat()
    .filter((s) => typeof s === "string")
    .map((s) => resolve_2(n, s));
  return uniq([
    join(n, PLUGIN_MANIFEST_PATH_2),
    join(n, PLUGIN_JSON),
    join(n, "hooks", "hooks.json"),
    ...mapped,
  ]);
}
//@ chunk-e6aww6q8.js:4140858-4141215 placement
/**
 * 为 --plugin-dir 集合目录建立监视项：目录下各子插件名映射，以及未被正确服务的子项。
 */
function collectPluginDirRoots(e, n) {
  return uniq(n.filter((r) => !isZipPathCaseInsensitive(r)).map((r) => resolve_2(r)))
    .filter((r) => !e.some((s) => relative(r, s.path) === ""))
    .map((r) => {
      let s = new Map();
      let h = new Set();
      for (let y of e) {
        let S = childNameUnder(r, y.path);
        if (S === undefined) continue;
        s.set(S, y.name);
        let pluginRoot = loadedModuleArgs(y.name)?.pluginRoot;
        if (y.modulePath !== undefined && (pluginRoot === undefined || relative(pluginRoot, y.path) !== ""))
          h.add(S);
      }
      return {
        root: r,
        loaded: s,
        unserved: h,
      };
    });
}
//@ chunk-e6aww6q8.js:4141264-4141616 placement
/**
 * 为 --plugin-dir 下有 hooks 模块的插件生成 folder 范围的监视目标（根目录、manifest 列表、入口）。
 */
function folderWatchTargets(e, n) {
  let mapped = n.map((s) => resolve_2(s));
  return e
    .filter((s) => s.modulePath !== undefined)
    .flatMap((s) => {
      let found = mapped.find((q) => relative(q, s.path) === "");
      let any = mapped.some((q) => childNameUnder(q, s.path) !== undefined);
      let S = found ?? (any ? resolve_2(s.path) : undefined);
      if (S === undefined) return [];
      let manifests = pluginManifestPaths(s, S);
      let { modulePath } = s;
      let entry = modulePath === undefined ? undefined : resolve_2(modulePath);
      return [
        {
          name: s.name,
          root: S,
          scope: "folder",
          manifests,
          entry,
        },
      ];
    });
}
//@ chunk-e6aww6q8.js:4141649-4141873 placement
var skillsWatchTargets = (e) =>
  e
    .filter((n) => n.modulePath !== undefined && n.source.endsWith(`@${SKILLS_DIR}`))
    .map((n) => {
      let r = resolve_2(n.path);
      let manifests = pluginManifestPaths(n, r);
      let { modulePath } = n;
      let entry = modulePath === undefined ? undefined : resolve_2(modulePath);
      return {
        name: n.name,
        root: r,
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
  setTimeout(e, n) {
    let timer = setTimeout(e, n);
    timer.unref();
    return () => clearTimeout(timer);
  },
};
//@ chunk-e6aww6q8.js:4141978-4142280 placement
/**
 * files 范围的重载先经 ConfigChange 钩子把关；钩子未接好或抛错时不重载。
 */
async function passesConfigChangeGate(e, n) {
  if (e !== "files") return true;
  let r = reloadReasonSlot.get();
  if (r === undefined) {
    logError(Error("plugin-dir watch: ConfigChange hook gate not wired"));
    return false;
  }
  try {
    return !(await r("skills", n));
  } catch (error) {
    logForDebugging(
      `plugin-dir watch: the ConfigChange hooks for ${n} threw, so no reload: ${errorMessage(error)}`,
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
async function listDirChildren(e) {
  let n = await describePluginDirShape(e);
  if (n.kind === "collection") return n.children;
  return n.kind === "unreadable" && (n.errno === "ENOENT" || n.errno === "ENOTDIR") ? [] : undefined;
}
//@ chunk-e6aww6q8.js:4142446-4142550 placement
/**
 * 取内置插件某文件源码的戳。
 */
function bundledFileStamp(e, n) {
  let r = loadedModuleArgs(e);
  let source = r && hooksModuleFiles(r).find((h) => h.file === n)?.source;
  return source === undefined ? undefined : fileStamp(source);
}
//@ chunk-e6aww6q8.js:4142550-4142628 placement
/**
 * 重载绑定的插件
 */
function reloadBoundPlugins() {
  let e = pendingReloadSlot.get();
  return e ? e.reload() : Promise.resolve("unbound");
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
var watchedPluginRecords = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:4142709-4142723 placement
/**
 * 插件目录串行队列
 */
var pluginDirQueue = createSerialQueue();
//@ chunk-e6aww6q8.js:4142723-4142821 placement
/**
 * 惰性创建设备树宿主
 */
var lazyDeviceTreeHost = io(async () => {
  let { createDeviceTreeHost } = await import("./chunk-78kn47sp.js");
  return createDeviceTreeHost();
});
//@ chunk-e6aww6q8.js:4142821-4142922 placement
function replacePluginRecord(e) {
  let n = watchedPluginRecords.get();
  if (n === undefined) return;
  watchedPluginRecords.set(n.map((r) => (r.path === e.path ? mergePluginRecord(r, e) : r)));
}
//@ chunk-e6aww6q8.js:4142922-4143126 placement
var findHookLoadError = (errors) =>
  errors.find(
    (n) =>
      n.type === "hook-load-failed" ||
      n.type === "manifest-parse-error" ||
      n.type === "manifest-validation-error" ||
      ((n.type === "path-not-found" || n.type === "path-traversal") && n.component === "hooks"),
  );
//@ chunk-e6aww6q8.js:4143126-4143460 placement
/**
 * 重新读取插件（manifest 与 hooks 模块），有加载错误则抛出，成功后更新 manifest 列表与插件记录。
 */
async function retargetPluginModule(e) {
  let manifests = e.manifests;
  let r;
  async function s(y) {
    let { plugin, errors } = await createPluginFromPath(
      y.path,
      y.source,
      y.enabled ?? true,
      basename(y.path),
      WATCH_AUTO_RELOAD_OFF,
    );
    let hookLoadError = findHookLoadError(errors);
    if (hookLoadError !== undefined) throw new HooksError(`${y.name}: ${pluginErrorText(hookLoadError)}`);
    manifests = pluginManifestPaths(plugin, e.root);
    r = plugin;
    return plugin;
  }
  let h = await retargetHooksModule(e.name, s);
  if (r) {
    pendingReloadSlot.get()?.retarget(r);
    replacePluginRecord(r);
  }
  return h === undefined
    ? undefined
    : {
        ...h,
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
  onBegin: (e) => turnFinishedSignal.subscribe(e),
  onEnd: (e) => turnEndedSignal.subscribe(e),
};
//@ chunk-e6aww6q8.js:4143650-4143756 placement
/**
 * 判断目录是否为当前 mods 文件夹或位于全局 mods 目录下。
 */
function isInModsFolder(e) {
  let folder = skillWatchStateByHost.get()?.folder;
  return (
    (folder !== undefined && resolve_2(folder) === resolve_2(e)) ||
    (!isDiskless() && dirname(resolve_2(e)) === resolve_2(devModsDir()))
  );
}
//@ chunk-e6aww6q8.js:4145928-4146092 placement
function isWatchedCollectionPath(e, n) {
  let [r, ...s] = relative(n, e).split(sep);
  if (r === undefined || r === "") return true;
  if (r === ".." || !isNotDotPrefixed(r)) return false;
  let joined = s.join(sep);
  return joined === "" || joined === dirname(PLUGIN_MANIFEST_PATH_2) || joined === PLUGIN_MANIFEST_PATH_2;
}
//@ chunk-e6aww6q8.js:4146092-4146542 placement
/**
 * 监视 --plugin-dir 集合目录（深度 2，只关心子插件目录与清单），任何增删改都触发回调。
 */
function watchPluginCollection(e, n) {
  let r = realpathOrSelf(e).then((s) => {
    let h = watchPathMapper(e, s);
    let y = chokidar_default.watch(s, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      ignorePermissionErrors: true,
      depth: MAX_LISTED_MOD_CHANGES,
      ignored: (w) => !isWatchedCollectionPath(h(w), e),
      usePolling: true,
      interval: WATCH_ACTIVE_POLL_MS,
      binaryInterval: WATCH_ACTIVE_POLL_MS,
    });
    let S = () => n();
    y.on("add", S);
    y.on("addDir", S);
    y.on("change", S);
    y.on("unlink", S);
    y.on("unlinkDir", S);
    y.on("error", (w) =>
      logForDebugging(`plugin-dir watch on ${e}: ${errorMessage(w)}`, {
        level: "warn",
      }),
    );
    return y;
  });
  return {
    close: async () => (await r).close(),
  };
}
//@ chunk-e6aww6q8.js:4157047-4157494 placement
/**
 * 根据 --plugin-dir、技能目录与已有监视器，启动对开发中插件的文件监视与集合目录监视。
 */
function startPluginDirWatches(e, n, r) {
  let s = isPluginDirWatchOn();
  let h = watchedPluginDirs(inlinePlugins());
  let y = reloadControllerSlot.get();
  if (!s && h.length === 0 && y === undefined) return;
  let S = reloadReasonSlot.get() !== undefined;
  reloadTimerSlot.set(S ? undefined : () => startPluginDirWatches(e, n, r));
  let w = s && S;
  let L = [...folderWatchTargets(e, h), ...(w ? skillsWatchTargets(e) : [])];
  let pluginDirRoots = collectPluginDirRoots(n, h);
  if (y === undefined && L.length === 0 && pluginDirRoots.length === 0) return;
  let Z = y ?? startPluginDirWatcher();
  Z.watchPlugins(L, r);
  Z.watchCollections(pluginDirRoots);
  logForDebugging(
    `plugin-dir watch: watching ${Z.watched().join(", ") || "nothing"}; folders of plugins ${Z.watchedCollections().join(", ") || "none"}`,
  );
}
//@ chunk-e6aww6q8.js:4157532-4157595 placement
/**
 * URI 解码失败返回 undefined
 */
function decodeUriOrUndefined(e) {
  try {
    return decodeURIComponent(e);
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
