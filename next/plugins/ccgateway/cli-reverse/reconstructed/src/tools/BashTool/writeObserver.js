/**
 * tools/BashTool/writeObserver.ts
 *
 * 2.1.316 新增：监视 Bash 命令写入的文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (37)
 * attribution: placement 36
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { rmSync, watch } from "fs";
import { join, isAbsolute, sep, basename, dirname } from "path";
import { writeFile, unlink, mkdir, readdir, lstat, readFile } from "fs/promises";
import { randomBytes } from "crypto";
import { identity as identity_2 } from "../../utils/identity.js";
import { getPlatform } from "../../utils/platform.js";
import {
  listIgnoredFiles,
  resolveThroughRoot,
  bumpCounter,
  isDirectoryIgnored,
} from "./bashEditDiff/snapshot.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { sleep } from "../../utils/sleep.js";
import { getPrivateTempRoot } from "../../utils/sandbox/userTempRoot.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { getSessionId } from "../../bootstrap/state.js";
import { recordObservedWrites } from "./bashEditRecorder.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4925796-4925968 placement (moved: shares a binding it assigns)
/**
 * 写入观察器常量与模块状态：路径/仓库/忽略检查/外部写入/并发查找/保留文件/监视器数量上限，节流与等待时间，以及监视器表、仓库表、共享 inotify 监视器等。
 */
var MAX_OBSERVED_PATHS; // deferred: uses stopAllWriteObservers of its import cycle while loading; runs once the cycle is complete
var MAX_OBSERVED_REPOS;
var IGNORE_CHECKS_PER_REPO;
var MAX_OUTSIDE_WRITES;
var MAX_CONCURRENT_IGNORE_LOOKUPS;
var MAX_HELD_FILES;
var MAX_WATCHERS;
var YIELD_EVERY;
var SETTLE_WAIT_MS;
var QUIET_WINDOWS_MS;
var MAX_SETTLE_MS;
var observersByRoot;
var observedRepos;
var sharedWatcher;
var sharedWatcherReady;
var exitHookInstalled;
deferInit("chunk-5xgkngpb.js:4925796", () => {
  MAX_OBSERVED_PATHS = 5000;
  MAX_OBSERVED_REPOS = 64;
  IGNORE_CHECKS_PER_REPO = 256;
  MAX_OUTSIDE_WRITES = 1000;
  MAX_CONCURRENT_IGNORE_LOOKUPS = 8;
  MAX_HELD_FILES = 20000;
  MAX_WATCHERS = 30000;
  YIELD_EVERY = 200;
  SETTLE_WAIT_MS = 250;
  QUIET_WINDOWS_MS = {
    grace: 30,
    quiet: 60,
  };
  MAX_SETTLE_MS = 300;
  observersByRoot = identity_2(new Map(), () => {
    stopAllWriteObservers();
  });
  observedRepos = new Map();
  sharedWatcher = null;
  sharedWatcherReady = null;
  exitHookInstalled = false;
});
//@ chunk-5xgkngpb.js:4925968-4926004 placement (2.1.88 match: chordToDisplayString, 1)
function isLinux() {
  return getPlatform() === "linux";
}
//@ chunk-5xgkngpb.js:4926004-4926554 placement
/**
 * 启动写入观察器，监视命令写入的文件。
 */
function startWriteObserver(root) {
  let existing = observersByRoot.get(root);
  if (existing) return existing.failed ? "failed" : existing.ready ? "ready" : "starting";
  let observer = {
    root,
    failed: false,
    ready: false,
    watchers: new Map(),
    ignored: new Set(),
    ignoresChanged: false,
    outsideWrites: new Set(),
    outsideOverflow: false,
    ignoreChecksLeft: IGNORE_CHECKS_PER_REPO,
    ignoreLookupsRunning: 0,
    ignoreLookupsWaiting: [],
    pending: new Set(),
    asking: new Map(),
  };
  observersByRoot.set(root, observer);
  let watch = getPlatform() === "linux" ? watchTreeLinux : watchRecursively;
  listIgnoredFiles(root)
    .then((ignored) => {
      observer.ignored = ignored;
      return observer.failed ? false : watch(observer);
    })
    .then((ready) => {
      if (ready) observer.ready = true;
      else failObserver(observer, "watch_failed");
    })
    .catch((error) => {
      logForDebugging(`writeObserver: ${root}: ${String(error)}`);
      failObserver(observer, "watch_failed");
    });
  return "starting";
}
//@ chunk-5xgkngpb.js:4926554-4926707 placement
function failObserver(observer, reason) {
  if (!observer.failed && reason) logFeatureBad("bash_edit_diff", reason);
  observer.failed = true;
  observer.ready = false;
  let watchers = [...observer.watchers.values()];
  observer.watchers.clear();
  for (let watcher of watchers) watcher.close();
}
//@ chunk-5xgkngpb.js:4926707-4926766 placement
/**
 * 是否还有未失败的根目录写入观察器（用于决定是否跳过 edit diff）。
 */
function hasLiveRootObserver() {
  return [...observersByRoot.values()].some((observer) => !observer.failed);
}
//@ chunk-5xgkngpb.js:4926766-4926840 placement
/**
 * 停掉所有写入观察器并清空记录、关闭共享监视器。
 */
function stopAllWriteObservers() {
  for (let observer of observersByRoot.values()) failObserver(observer);
  observersByRoot.clear();
  observedRepos.clear();
  closeSentinelWatcher();
}
//@ chunk-5xgkngpb.js:4926840-4926957 placement
function closeSentinelWatcher() {
  if (!sharedWatcher) return;
  sharedWatcher.watcher.close();
  try {
    rmSync(sharedWatcher.directory, {
      recursive: true,
      force: true,
    });
  } catch {}
  sharedWatcher = null;
  sharedWatcherReady = null;
}
//@ chunk-5xgkngpb.js:4926957-4927133 placement
/**
 * 取出并清空某根目录的外部写入记录（未就绪返回 null）。
 */
function takeOutsideWrites(root) {
  let observer = observersByRoot.get(root);
  if (!observer || !observer.ready) return null;
  let writeSet = {
    paths: [...observer.outsideWrites],
    overflow: observer.outsideOverflow,
  };
  observer.outsideWrites.clear();
  observer.outsideOverflow = false;
  return writeSet;
}
//@ chunk-5xgkngpb.js:4927133-4927357 placement
/**
 * 开始观察某命令在根目录下的写入（有上限，满时逐出最旧的观察）。
 */
function beginCommandObservation(toolUseId, root) {
  if (observedRepos.has(toolUseId)) return;
  if (observedRepos.size >= MAX_OBSERVED_REPOS) {
    let oldestKey = observedRepos.keys().next().value;
    if (oldestKey !== undefined) observedRepos.delete(oldestKey);
  }
  let observer = observersByRoot.get(root);
  if (observer) observer.ignoreChecksLeft = IGNORE_CHECKS_PER_REPO;
  observedRepos.set(toolUseId, {
    root,
    paths: new Set(),
    overflow: false,
    shared: false,
    lastEventAt: 0,
  });
}
//@ chunk-5xgkngpb.js:4927357-4927386 placement
/**
 * 结束对某命令的写入观察：从 observedRepos 删除该命令的记录。
 */
function forgetObservedRepo(toolUseId) {
  observedRepos.delete(toolUseId);
}
//@ chunk-5xgkngpb.js:4927386-4928054 placement
/**
 * 结束对某命令的写入观察：等待事件落定（Linux 用哨兵文件同步，其他平台等安静期），合并忽略检查中暂存的路径，返回 {paths, overflow, shared, watchEnds}；.gitignore 变化时停止该仓库的观察器。
 */
async function endCommandObservation(toolUseId) {
  let entry = observedRepos.get(toolUseId);
  if (!entry) return null;
  let observer = observersByRoot.get(entry.root);
  if (!observer || observer.failed || !observer.ready) {
    observedRepos.delete(toolUseId);
    return null;
  }
  if (getPlatform() === "linux") {
    if (!(await syncWithSentinel()) || !(await waitForPendingWatches(observer))) entry.overflow = true;
  } else await waitForQuiet(entry);
  observedRepos.delete(toolUseId);
  if (observer.failed || !observer.ready) return null;
  for (let ask of observer.asking.values()) {
    for (let path of ask.held) {
      if (entry.paths.size >= MAX_OBSERVED_PATHS) {
        entry.overflow = true;
        break;
      }
      entry.paths.add(path);
    }
    if (ask.overflow) entry.overflow = true;
    let any = [...observedRepos.values()].some((other) => other.root === observer.root);
    if (ask.held.size > 0 && any) entry.shared = true;
    if (!any) {
      ask.held.clear();
      ask.overflow = false;
    }
  }
  if (observer.ignoresChanged) {
    if (observersByRoot.get(observer.root) === observer) observersByRoot.delete(observer.root);
    failObserver(observer);
  }
  return {
    paths: [...entry.paths],
    overflow: entry.overflow,
    shared: entry.shared,
    watchEnds: observer.ignoresChanged,
  };
}
//@ chunk-5xgkngpb.js:4928054-4928235 placement
async function waitForPendingWatches(observer) {
  let deadline = performance.now() + SETTLE_WAIT_MS;
  while (observer.pending.size > 0) {
    let remainingMs = deadline - performance.now();
    if (remainingMs <= 0) return false;
    await Promise.race([Promise.all([...observer.pending]), sleep(remainingMs)]);
  }
  return true;
}
//@ chunk-5xgkngpb.js:4928235-4928440 placement
async function waitForQuiet(entry) {
  let startTime = performance.now();
  for (;;) {
    let startTime_2 = performance.now();
    let max = Math.max(startTime + QUIET_WINDOWS_MS.grace, entry.lastEventAt + QUIET_WINDOWS_MS.quiet);
    if (max <= startTime_2) return;
    if (startTime_2 - startTime >= MAX_SETTLE_MS) {
      entry.overflow = true;
      return;
    }
    await sleep(Math.min(max, startTime + MAX_SETTLE_MS) - startTime_2);
  }
}
//@ chunk-5xgkngpb.js:4928440-4928805 placement
/**
 * 在哨兵目录写入一个临时文件并等待其 inotify 事件，确保此前的文件事件都已送达；超时则关闭哨兵监视器。
 */
async function syncWithSentinel() {
  if (!(await ensureSentinelWatcher())) return false;
  let watcherState = sharedWatcher;
  if (!watcherState) return false;
  let token = `s${watcherState.next++}`;
  let promise = new Promise((resolve) => {
    watcherState.waiting.set(token, () => resolve(true));
  });
  let timeout = sleep(SETTLE_WAIT_MS).then(() => false);
  let sentinelPath = join(watcherState.directory, token);
  try {
    await writeFile(sentinelPath, "", {
      flag: "wx",
      mode: 384,
    });
  } catch {
    watcherState.waiting.delete(token);
    closeSentinelWatcher();
    return false;
  }
  let winner = await Promise.race([promise, timeout]);
  watcherState.waiting.delete(token);
  unlink(sentinelPath).catch(() => {
    return;
  });
  if (!winner) closeSentinelWatcher();
  return winner;
}
//@ chunk-5xgkngpb.js:4928805-4929315 placement
/**
 * 确保哨兵目录监视器已创建：在私有临时目录下建会话专属哨兵目录并监视，事件到达时唤醒等待者；进程退出时关闭。
 */
function ensureSentinelWatcher() {
  if (sharedWatcher) return Promise.resolve(true);
  if (!sharedWatcherReady)
    sharedWatcherReady = (async () => {
      let privateTempRoot = await getPrivateTempRoot();
      if (privateTempRoot === null) {
        sharedWatcherReady = null;
        return false;
      }
      let directory = join(
        privateTempRoot,
        `${bunHashOf(getSessionId())}-${bunHashOf("sentinels")}-${randomBytes(8).toString("hex")}`,
      );
      await mkdir(directory, {
        recursive: true,
        mode: 448,
      });
      let waiting = new Map();
      let watcher = watch(
        directory,
        {
          persistent: false,
        },
        (eventType, filename) => {
          if (typeof filename === "string") waiting.get(filename)?.();
        },
      );
      watcher.on("error", () => {
        closeSentinelWatcher();
      });
      sharedWatcher = {
        directory,
        watcher,
        waiting,
        next: 0,
      };
      if (!exitHookInstalled) {
        exitHookInstalled = true;
        process.once("exit", closeSentinelWatcher);
      }
      return true;
    })().catch((error) => {
      logForDebugging(`writeObserver: sentinels: ${String(error)}`);
      sharedWatcherReady = null;
      return false;
    });
  return sharedWatcherReady;
}
//@ chunk-5xgkngpb.js:4929315-4929624 placement
/**
 * 用递归 fs.watch 监视根目录（macOS/Windows），把事件路径转为相对路径交给事件处理；出错时标记观察失败。
 */
async function watchRecursively(observer) {
  let throughRoot = resolveThroughRoot(observer.root, observer.root);
  let watcher = watch(
    throughRoot,
    {
      recursive: true,
      persistent: false,
    },
    (eventType, filename) =>
      handleWatchEvent(
        observer,
        observer.root,
        eventType,
        typeof filename === "string" && isAbsolute(filename)
          ? filename === throughRoot
            ? ""
            : filename.startsWith(throughRoot + sep)
              ? filename.slice(throughRoot.length + 1)
              : filename
          : filename,
      ),
  );
  watcher.on("error", (error) => {
    logForDebugging(`writeObserver: ${observer.root}: ${String(error)}`);
    failObserver(observer, "watch_failed");
  });
  observer.watchers.set(observer.root, watcher);
  return true;
}
//@ chunk-5xgkngpb.js:4929624-4929967 placement (2.1.88 match: executeCloudPersistence, 0.582)
/**
 * 在 Linux 上逐目录添加监视（数量不超过 inotify 上限）：先监视已有目录，再扫描一次补上期间新出现的目录，最后等待挂起的监视完成。
 */
async function watchTreeLinux(observer) {
  let maxUserWatches = await readMaxUserWatches();
  let min = Math.min(maxUserWatches, MAX_WATCHERS);
  let initialDirs = await listWatchableDirs(observer, min);
  if (initialDirs === null) return false;
  let watchCount = 0;
  for (let dir of initialDirs) {
    if (observer.failed || observer.watchers.has(dir)) continue;
    if (!watchDirectory(observer, dir)) return false;
    if (++watchCount % YIELD_EVERY === 0) await sleep(0);
  }
  let laterDirs = await listWatchableDirs(observer, min);
  if (laterDirs === null) return false;
  for (let dir of laterDirs)
    if (!observer.failed && !observer.watchers.has(dir))
      trackPending(observer, watchNewDirectory(observer, dir));
  await waitForPendingWatches(observer);
  return !observer.failed;
}
//@ chunk-5xgkngpb.js:4929967-4930388 placement
/**
 * 为单个目录添加 fs.watch；出错时移除并重新处理该目录；目录不存在或无权限视为成功，其他失败记录后返回 false。
 */
function watchDirectory(observer, dir) {
  try {
    let watcher = watch(
      dir,
      {
        persistent: false,
      },
      (eventType, filename) => handleWatchEvent(observer, dir, eventType, filename),
    );
    watcher.on("error", () => {
      if (observer.watchers.get(dir) === watcher) {
        observer.watchers.delete(dir);
        trackPending(observer, watchNewDirectory(observer, dir));
      }
      watcher.close();
    });
    observer.watchers.set(dir, watcher);
    bumpCounter("edit_diff_watch_dirs");
    return true;
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "EACCES" || code === "EPERM") return true;
    logForDebugging(`writeObserver: cannot watch ${dir}: ${String(error)}`);
    return false;
  }
}
//@ chunk-5xgkngpb.js:4930388-4930711 placement
/**
 * 广度优先列出根目录下可监视的目录（跳过 .git 与已忽略目录、包含指向目录的链接），超过上限返回 null。
 */
async function listWatchableDirs(observer, maxDirs) {
  let dirs = [];
  let queue = [observer.root];
  for (let idx = 0; idx < queue.length; idx++) {
    let dir = queue[idx];
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch {
      if (idx === 0) return null;
      continue;
    }
    dirs.push(dir);
    if (dirs.length > maxDirs) return null;
    for (let entry of entries) {
      let childPath = join(dir, entry.name);
      if (
        entry.name !== ".git" &&
        !observer.ignored.has(childPath) &&
        (entry.isDirectory() || (await isDirectoryEntry(entry, dir)))
      )
        queue.push(childPath);
    }
  }
  return dirs;
}
//@ chunk-5xgkngpb.js:4930711-4930885 placement
async function isDirectoryEntry(entry, dir) {
  if (entry.isDirectory()) return true;
  if (entry.isFile() || entry.isSymbolicLink()) return false;
  let stat = await lstat(join(dir, entry.name)).catch(() => null);
  return stat !== null && stat.isDirectory();
}
//@ chunk-5xgkngpb.js:4930885-4931061 placement
async function readMaxUserWatches() {
  let text = await readFile("/proc/sys/fs/inotify/max_user_watches", "utf8").catch(() => "");
  let limit = Number.parseInt(text, 10);
  return Number.isFinite(limit) ? limit : Number.POSITIVE_INFINITY;
}
//@ chunk-5xgkngpb.js:4931061-4932022 placement
/**
 * 处理文件监视事件：忽略 .git 与已忽略路径，记录 .gitignore 变化，目录被删除时停止监视，新目录递归加监视，并把写入路径计入正在观察的命令（无法定位时标记溢出）。
 */
function handleWatchEvent(observer, dir, eventType, filename) {
  bumpCounter("edit_diff_watch_events");
  let eventFilename = typeof filename === "string" ? filename : null;
  if (eventFilename !== null && eventFilename.split(/[\\/]/).includes(".git")) return;
  let fullPath =
    eventFilename === null || eventFilename === "" ? null : join(dir, eventFilename).replace(/[\\/]+$/, "");
  if (fullPath !== null && observer.ignored.size > 0) {
    if (observer.ignored.has(fullPath)) {
      trackPending(observer, recordChangedDirIfAny(observer, fullPath));
      return;
    }
    if (isUnderIgnoredDir(observer, fullPath)) return;
  }
  if (fullPath !== null && basename(fullPath) === ".gitignore") observer.ignoresChanged = true;
  if (fullPath === null && eventType !== "rename") return;
  if (fullPath !== null && eventType !== "rename" && eventFilename === basename(dir)) {
    trackPending(observer, recordChangedFileIfAny(observer, fullPath));
    return;
  }
  let isDirRemoved = fullPath === null && dir !== observer.root;
  if (fullPath === null && dir === observer.root) {
    if (observersByRoot.get(observer.root) === observer) observersByRoot.delete(observer.root);
    setTimeout(failObserver, 0, observer);
  } else if (fullPath !== null && eventType === "rename" && getPlatform() === "linux")
    trackPending(
      observer,
      dir === observer.root && eventFilename === basename(observer.root)
        ? checkRootReadable(observer).then((isReadable) =>
            isReadable ? watchNewDirectory(observer, fullPath) : undefined,
          )
        : watchNewDirectory(observer, fullPath),
    );
  let lastEventAt = performance.now();
  let isObservedRepo = false;
  for (let entry of observedRepos.values())
    if (entry.root === observer.root) {
      isObservedRepo = true;
      entry.lastEventAt = lastEventAt;
      if (fullPath === null && !isDirRemoved) entry.overflow = true;
    }
  if (isDirRemoved) {
    for (let [watchedDir, watcher] of observer.watchers)
      if (watchedDir === dir || watchedDir.startsWith(dir + sep)) {
        watcher.close();
        observer.watchers.delete(watchedDir);
      }
    recordWrite(observer, dir + sep);
  } else if (fullPath === null) {
    if (!isObservedRepo) observer.outsideOverflow = true;
  } else recordWrite(observer, fullPath);
}
//@ chunk-5xgkngpb.js:4932022-4932119 placement
/**
 * 路径存在且不是目录时，记为命令的写入。
 */
async function recordChangedFileIfAny(observer, fullPath) {
  let stat = await lstat(fullPath).catch(() => null);
  if (stat !== null && !stat.isDirectory()) recordWrite(observer, fullPath);
}
//@ chunk-5xgkngpb.js:4932119-4932216 placement
/**
 * 与 ICs 同类：路径存在且不是目录时记为写入（另一事件源）。
 */
async function recordChangedDirIfAny(observer, fullPath) {
  let stat = await lstat(fullPath).catch(() => null);
  if (stat !== null && !stat.isDirectory()) recordWrite(observer, fullPath);
}
//@ chunk-5xgkngpb.js:4932216-4932321 placement
function isUnderIgnoredDir(observer, path) {
  for (let parent = dirname(path); parent.length > observer.root.length; parent = dirname(parent))
    if (observer.ignored.has(parent)) return true;
  return false;
}
//@ chunk-5xgkngpb.js:4932321-4932418 placement
/**
 * 把异步任务记入待完成集合，完成后自动移除（结束观察时据此等待落定）。
 */
function trackPending(observer, promise) {
  let tracked = promise
    .catch(() => {
      return;
    })
    .finally(() => {
      observer.pending.delete(tracked);
    });
  observer.pending.add(tracked);
}
//@ chunk-5xgkngpb.js:4932418-4932535 placement
async function checkRootReadable(observer) {
  try {
    await readdir(observer.root);
    return true;
  } catch {
    if (observersByRoot.get(observer.root) === observer) observersByRoot.delete(observer.root);
    failObserver(observer);
    return false;
  }
}
//@ chunk-5xgkngpb.js:4932535-4933309 placement
/**
 * 为新出现的目录添加监视（数量有上限），首次出现时异步检查是否被 git 忽略，并把其中已有文件计为写入、子目录递归监视。
 */
async function watchNewDirectory(observer, dir) {
  if (observer.ignored.has(dir)) return;
  if (observer.watchers.get(dir)) {
    for (let [watchedDir, watcher] of observer.watchers)
      if (watchedDir === dir || watchedDir.startsWith(dir + sep)) {
        watcher.close();
        observer.watchers.delete(watchedDir);
      }
    recordWrite(observer, dir + sep);
  }
  let stat;
  try {
    stat = await lstat(dir);
  } catch {
    return;
  }
  if (
    !stat.isDirectory() ||
    observer.failed ||
    observer.watchers.has(dir) ||
    observer.ignored.has(dir) ||
    isUnderIgnoredDir(observer, dir)
  )
    return;
  if (observer.watchers.size >= MAX_WATCHERS || !watchDirectory(observer, dir)) {
    if (observersByRoot.get(observer.root) === observer) observersByRoot.delete(observer.root);
    failObserver(observer, "watch_failed");
    return;
  }
  if (observer.ready && observer.ignoreChecksLeft > 0 && !observer.asking.has(dir)) {
    observer.ignoreChecksLeft--;
    observer.asking.set(dir, {
      held: new Set(),
      overflow: false,
    });
    checkDirIgnored(observer, dir).then((isIgnored) => settleIgnoreCheck(observer, dir, isIgnored));
  }
  let entries;
  try {
    entries = await readdir(dir, {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  if (observer.ignored.has(dir) || isUnderIgnoredDir(observer, dir)) return;
  for (let entry of entries) {
    let childPath = join(dir, entry.name);
    if (entry.isDirectory() || (await isDirectoryEntry(entry, dir))) {
      if (entry.name !== ".git" && !observer.ignored.has(childPath))
        trackPending(observer, watchNewDirectory(observer, childPath));
    } else recordWrite(observer, childPath);
  }
}
//@ chunk-5xgkngpb.js:4933309-4933615 placement
/**
 * 完成目录的忽略检查：被忽略则标记忽略；否则把检查期间暂存的写入计入，暂存溢出时标记相关命令溢出。
 */
function settleIgnoreCheck(observer, dir, isIgnored) {
  let ask = observer.asking.get(dir);
  observer.asking.delete(dir);
  if (!ask || observer.failed || observersByRoot.get(observer.root) !== observer) return;
  if (isIgnored === true) {
    markDirIgnored(observer, dir);
    return;
  }
  for (let heldPath of ask.held)
    if (!observer.ignored.has(heldPath) && !isUnderIgnoredDir(observer, heldPath))
      recordWrite(observer, heldPath);
  if (ask.overflow) {
    let matchedRepo = false;
    for (let entry of observedRepos.values())
      if (entry.root === observer.root) {
        matchedRepo = true;
        entry.overflow = true;
      }
    if (!matchedRepo) observer.outsideOverflow = true;
  }
}
//@ chunk-5xgkngpb.js:4933615-4933707 placement
/**
 * 找到路径所属、正处于“忽略检查中”的目录项。
 */
function findAskingEntry(observer, path) {
  for (let [askDir, ask] of observer.asking) if (path === askDir || path.startsWith(askDir + sep)) return ask;
  return null;
}
//@ chunk-5xgkngpb.js:4933707-4934125 placement
/**
 * 把目录标记为被 git 忽略：清除其下的待检查项、监视器、已记录的命令写入与外部写入。
 */
function markDirIgnored(observer, dir) {
  observer.ignored.add(dir);
  let isUnderDir = (path) => path === dir || path.startsWith(dir + sep);
  for (let [askDir, ask] of [...observer.asking])
    if (isUnderDir(askDir)) observer.asking.delete(askDir);
    else for (let heldPath of ask.held) if (isUnderDir(heldPath)) ask.held.delete(heldPath);
  for (let [watchedDir, watcher] of observer.watchers)
    if (watchedDir === dir || watchedDir.startsWith(dir + sep)) {
      watcher.close();
      observer.watchers.delete(watchedDir);
    }
  for (let entry of observedRepos.values())
    if (entry.root === observer.root) {
      for (let path of entry.paths) if (isUnderDir(path)) entry.paths.delete(path);
    }
  for (let outsideWrite of observer.outsideWrites)
    if (isUnderDir(outsideWrite)) observer.outsideWrites.delete(outsideWrite);
}
//@ chunk-5xgkngpb.js:4934125-4934465 placement
/**
 * 并发受限地检查目录是否被 git 忽略（排队等待名额）；观察已失败或已知忽略时直接返回 null。
 */
async function checkDirIgnored(observer, dir) {
  if (observer.ignoreLookupsRunning >= MAX_CONCURRENT_IGNORE_LOOKUPS)
    await new Promise((resolve) => observer.ignoreLookupsWaiting.push(resolve));
  if (observer.failed || observer.ignored.has(dir) || isUnderIgnoredDir(observer, dir)) {
    observer.ignoreLookupsWaiting.shift()?.();
    return null;
  }
  observer.ignoreLookupsRunning++;
  try {
    return await isDirectoryIgnored(observer.root, dir);
  } catch {
    return null;
  } finally {
    observer.ignoreLookupsRunning--;
    observer.ignoreLookupsWaiting.shift()?.();
  }
}
//@ chunk-5xgkngpb.js:4934465-4934822 placement
/**
 * 记录一次文件写入：目录尚在忽略检查中则暂存；否则计入所有正在观察同一根目录的命令（多个时标记共享），无命令时计为外部写入，超上限标记溢出。
 */
function recordWrite(observer, path) {
  let askingEntry = findAskingEntry(observer, path);
  if (askingEntry !== null) {
    if (askingEntry.held.size >= MAX_HELD_FILES) askingEntry.overflow = true;
    else askingEntry.held.add(path);
    return;
  }
  let filtered = [...observedRepos.values()].filter((entry) => entry.root === observer.root);
  if (filtered.length === 0) {
    if (observer.outsideWrites.size >= MAX_OUTSIDE_WRITES) observer.outsideOverflow = true;
    else observer.outsideWrites.add(path);
    return;
  }
  for (let entry of filtered) {
    if (filtered.length > 1) entry.shared = true;
    if (entry.paths.size >= MAX_OBSERVED_PATHS) entry.overflow = true;
    else entry.paths.add(path);
  }
}
//@ chunk-5xgkngpb.js:4934822-4934972 placement
/**
 * 编辑记录器常量与状态：单文件/总量/缓存字节上限、目录展开上限、基线列表缓冲、git 超时、输出上限、串行链与每仓库记录器表。
 */
var MAX_RECORDED_FILE_BYTES; // deferred: uses getPlatform (../../utils/platform.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TOTAL_RECORD_BYTES;
var MAX_RECORD_BATCH_BYTES;
var MAX_LAST_SEEN_BYTES;
var MAX_EXPANDED_PATHS;
var MAX_BASE_LISTING_BYTES;
var RECORDER_GIT_TIMEOUT_MS;
var MAX_GIT_OUTPUT_BYTES;
var RECORDER_POLL_MS;
var recorderChains;
var recordersByCwd;
deferInit("chunk-5xgkngpb.js:4934822", () => {
  MAX_RECORDED_FILE_BYTES = 2000000;
  MAX_TOTAL_RECORD_BYTES = 536870912;
  MAX_RECORD_BATCH_BYTES = 64000000;
  MAX_LAST_SEEN_BYTES = 64000000;
  MAX_EXPANDED_PATHS = 5000;
  MAX_BASE_LISTING_BYTES = 16000000;
  RECORDER_GIT_TIMEOUT_MS = getPlatform() === "windows" ? 2000 : 750;
  MAX_GIT_OUTPUT_BYTES = 5000000;
  RECORDER_POLL_MS = 500;
  recorderChains = new Map();
  recordersByCwd = new Map();
});
//@ chunk-5xgkngpb.js:4934972-4935000 placement
/**
 * 移除工作目录对应的编辑记录器（记录结束或失败时）。
 */
function forgetRecorder(cwd) {
  recordersByCwd.delete(cwd);
}
//@ chunk-5xgkngpb.js:4935000-4935041 placement
/**
 * 按仓库串行地取出并记录观察到的外部写入。
 */
function flushObservedWrites(cwd) {
  return runSerialForRecorder(cwd, () => recordObservedWrites(cwd));
}
//@ chunk-5xgkngpb.js:4935041-4935149 placement
/**
 * 按键把异步操作串行化执行（同一记录器的操作依次运行）。
 */
function runSerialForRecorder(cwd, task) {
  let chained = (recorderChains.get(cwd) ?? Promise.resolve()).then(task, task);
  recorderChains.set(
    cwd,
    chained.catch(() => {
      return;
    }),
  );
  return chained;
}
export {
  hasLiveRootObserver,
  isLinux,
  startWriteObserver,
  flushObservedWrites,
  beginCommandObservation,
  endCommandObservation,
  forgetRecorder,
  forgetObservedRepo,
  takeOutsideWrites,
  recordersByCwd,
  MAX_RECORDED_FILE_BYTES,
  MAX_RECORD_BATCH_BYTES,
  runSerialForRecorder,
  MAX_EXPANDED_PATHS,
  RECORDER_POLL_MS,
  MAX_GIT_OUTPUT_BYTES,
  RECORDER_GIT_TIMEOUT_MS,
  MAX_BASE_LISTING_BYTES,
  MAX_TOTAL_RECORD_BYTES,
  MAX_LAST_SEEN_BYTES,
};
