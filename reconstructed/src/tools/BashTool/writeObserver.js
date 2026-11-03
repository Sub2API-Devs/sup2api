/**
 * tools/BashTool/writeObserver.ts
 *
 * 2.1.316 新增：监视 Bash 命令写入的文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (36)
 * attribution: placement 36
 */
import { rmSync, watch } from "fs";
import { join, isAbsolute, sep, basename, dirname } from "path";
import { writeFile, unlink, mkdir, readdir, lstat, readFile } from "fs/promises";
import { randomBytes } from "crypto";
import { getPlatform } from "../../utils/platform.js";
import {
  observersByRoot,
  IGNORE_CHECKS_PER_REPO,
  listIgnoredFiles,
  observedRepos,
  sharedWatcher,
  sharedWatcherReady,
  MAX_OBSERVED_REPOS,
  MAX_OBSERVED_PATHS,
  SETTLE_WAIT_MS,
  QUIET_WINDOWS_MS,
  MAX_SETTLE_MS,
  exitHookInstalled,
  resolveThroughRoot,
  MAX_WATCHERS,
  YIELD_EVERY,
  MAX_CONCURRENT_IGNORE_LOOKUPS,
  isDirectoryIgnored,
  MAX_HELD_FILES,
  MAX_OUTSIDE_WRITES,
} from "./bashEditDiff/snapshot.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { sleep } from "../../utils/sleep.js";
import { getPrivateTempRoot } from "../../utils/sandbox/userTempRoot.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { getSessionId } from "../../bootstrap/state.js";
import { recordObservedWrites } from "./bashEditRecorder.js";

//@ chunk-e6aww6q8.js:4793443-4793479 placement = chordToDisplayString (1)
function isLinux() {
  return getPlatform() === "linux";
}
//@ chunk-e6aww6q8.js:4793479-4794029 placement
/**
 * 启动写入观察器，监视命令写入的文件。
 */
function startWriteObserver(e) {
  let n = observersByRoot.get(e);
  if (n) return n.failed ? "failed" : n.ready ? "ready" : "starting";
  let r = {
    root: e,
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
  observersByRoot.set(e, r);
  let s = getPlatform() === "linux" ? watchTreeLinux : watchRecursively;
  listIgnoredFiles(e)
    .then((ignored) => {
      r.ignored = ignored;
      return r.failed ? false : s(r);
    })
    .then((h) => {
      if (h) r.ready = true;
      else failObserver(r, "watch_failed");
    })
    .catch((error) => {
      logForDebugging(`writeObserver: ${e}: ${String(error)}`);
      failObserver(r, "watch_failed");
    });
  return "starting";
}
//@ chunk-e6aww6q8.js:4794029-4794182 placement
function failObserver(e, n) {
  if (!e.failed && n) logFeatureBad("bash_edit_diff", n);
  e.failed = true;
  e.ready = false;
  let r = [...e.watchers.values()];
  e.watchers.clear();
  for (let s of r) s.close();
}
//@ chunk-e6aww6q8.js:4794182-4794241 placement
/**
 * 是否还有未失败的根目录写入观察器（用于决定是否跳过 edit diff）。
 */
function hasLiveRootObserver() {
  return [...observersByRoot.values()].some((e) => !e.failed);
}
//@ chunk-e6aww6q8.js:4794241-4794315 placement
/**
 * 停掉所有写入观察器并清空记录、关闭共享监视器。
 */
function stopAllWriteObservers() {
  for (let e of observersByRoot.values()) failObserver(e);
  observersByRoot.clear();
  observedRepos.clear();
  closeSentinelWatcher();
}
//@ chunk-e6aww6q8.js:4794315-4794432 placement
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
//@ chunk-e6aww6q8.js:4794432-4794608 placement
/**
 * 取出并清空某根目录的外部写入记录（未就绪返回 null）。
 */
function takeOutsideWrites(e) {
  let n = observersByRoot.get(e);
  if (!n || !n.ready) return null;
  let r = {
    paths: [...n.outsideWrites],
    overflow: n.outsideOverflow,
  };
  n.outsideWrites.clear();
  n.outsideOverflow = false;
  return r;
}
//@ chunk-e6aww6q8.js:4794608-4794832 placement
/**
 * 开始观察某命令在根目录下的写入（有上限，满时逐出最旧的观察）。
 */
function beginCommandObservation(toolUseId, n) {
  if (observedRepos.has(toolUseId)) return;
  if (observedRepos.size >= MAX_OBSERVED_REPOS) {
    let s = observedRepos.keys().next().value;
    if (s !== undefined) observedRepos.delete(s);
  }
  let r = observersByRoot.get(n);
  if (r) r.ignoreChecksLeft = IGNORE_CHECKS_PER_REPO;
  observedRepos.set(toolUseId, {
    root: n,
    paths: new Set(),
    overflow: false,
    shared: false,
    lastEventAt: 0,
  });
}
//@ chunk-e6aww6q8.js:4794832-4794861 placement
/**
 * 结束对某命令的写入观察：从 observedRepos 删除该命令的记录。
 */
function forgetObservedRepo(e) {
  observedRepos.delete(e);
}
//@ chunk-e6aww6q8.js:4794861-4795529 placement
/**
 * 结束对某命令的写入观察：等待事件落定（Linux 用哨兵文件同步，其他平台等安静期），合并忽略检查中暂存的路径，返回 {paths, overflow, shared, watchEnds}；.gitignore 变化时停止该仓库的观察器。
 */
async function endCommandObservation(e) {
  let n = observedRepos.get(e);
  if (!n) return null;
  let r = observersByRoot.get(n.root);
  if (!r || r.failed || !r.ready) {
    observedRepos.delete(e);
    return null;
  }
  if (getPlatform() === "linux") {
    if (!(await syncWithSentinel()) || !(await waitForPendingWatches(r))) n.overflow = true;
  } else await waitForQuiet(n);
  observedRepos.delete(e);
  if (r.failed || !r.ready) return null;
  for (let s of r.asking.values()) {
    for (let y of s.held) {
      if (n.paths.size >= MAX_OBSERVED_PATHS) {
        n.overflow = true;
        break;
      }
      n.paths.add(y);
    }
    if (s.overflow) n.overflow = true;
    let any = [...observedRepos.values()].some((y) => y.root === r.root);
    if (s.held.size > 0 && any) n.shared = true;
    if (!any) {
      s.held.clear();
      s.overflow = false;
    }
  }
  if (r.ignoresChanged) {
    if (observersByRoot.get(r.root) === r) observersByRoot.delete(r.root);
    failObserver(r);
  }
  return {
    paths: [...n.paths],
    overflow: n.overflow,
    shared: n.shared,
    watchEnds: r.ignoresChanged,
  };
}
//@ chunk-e6aww6q8.js:4795529-4795710 placement
async function waitForPendingWatches(e) {
  let n = performance.now() + SETTLE_WAIT_MS;
  while (e.pending.size > 0) {
    let r = n - performance.now();
    if (r <= 0) return false;
    await Promise.race([Promise.all([...e.pending]), sleep(r)]);
  }
  return true;
}
//@ chunk-e6aww6q8.js:4795710-4795915 placement
async function waitForQuiet(e) {
  let startTime = performance.now();
  for (;;) {
    let startTime_2 = performance.now();
    let max = Math.max(startTime + QUIET_WINDOWS_MS.grace, e.lastEventAt + QUIET_WINDOWS_MS.quiet);
    if (max <= startTime_2) return;
    if (startTime_2 - startTime >= MAX_SETTLE_MS) {
      e.overflow = true;
      return;
    }
    await sleep(Math.min(max, startTime + MAX_SETTLE_MS) - startTime_2);
  }
}
//@ chunk-e6aww6q8.js:4795915-4796280 placement
/**
 * 在哨兵目录写入一个临时文件并等待其 inotify 事件，确保此前的文件事件都已送达；超时则关闭哨兵监视器。
 */
async function syncWithSentinel() {
  if (!(await ensureSentinelWatcher())) return false;
  let e = sharedWatcher;
  if (!e) return false;
  let n = `s${e.next++}`;
  let promise = new Promise((resolve) => {
    e.waiting.set(n, () => resolve(true));
  });
  let s = sleep(SETTLE_WAIT_MS).then(() => false);
  let h = join(e.directory, n);
  try {
    await writeFile(h, "", {
      flag: "wx",
      mode: 384,
    });
  } catch {
    e.waiting.delete(n);
    closeSentinelWatcher();
    return false;
  }
  let winner = await Promise.race([promise, s]);
  e.waiting.delete(n);
  unlink(h).catch(() => {
    return;
  });
  if (!winner) closeSentinelWatcher();
  return winner;
}
//@ chunk-e6aww6q8.js:4796280-4796790 placement
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
      let n = join(
        privateTempRoot,
        `${bunHashOf(getSessionId())}-${bunHashOf("sentinels")}-${randomBytes(8).toString("hex")}`,
      );
      await mkdir(n, {
        recursive: true,
        mode: 448,
      });
      let r = new Map();
      let s = watch(
        n,
        {
          persistent: false,
        },
        (h, y) => {
          if (typeof y === "string") r.get(y)?.();
        },
      );
      s.on("error", () => {
        closeSentinelWatcher();
      });
      sharedWatcher = {
        directory: n,
        watcher: s,
        waiting: r,
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
//@ chunk-e6aww6q8.js:4796790-4797099 placement
/**
 * 用递归 fs.watch 监视根目录（macOS/Windows），把事件路径转为相对路径交给事件处理；出错时标记观察失败。
 */
async function watchRecursively(observer) {
  let throughRoot = resolveThroughRoot(observer.root, observer.root);
  let r = watch(
    throughRoot,
    {
      recursive: true,
      persistent: false,
    },
    (eventType, h) =>
      handleWatchEvent(
        observer,
        observer.root,
        eventType,
        typeof h === "string" && isAbsolute(h)
          ? h === throughRoot
            ? ""
            : h.startsWith(throughRoot + sep)
              ? h.slice(throughRoot.length + 1)
              : h
          : h,
      ),
  );
  r.on("error", (s) => {
    logForDebugging(`writeObserver: ${observer.root}: ${String(s)}`);
    failObserver(observer, "watch_failed");
  });
  observer.watchers.set(observer.root, r);
  return true;
}
//@ chunk-e6aww6q8.js:4797099-4797442 placement
/**
 * 在 Linux 上逐目录添加监视（数量不超过 inotify 上限）：先监视已有目录，再扫描一次补上期间新出现的目录，最后等待挂起的监视完成。
 */
async function watchTreeLinux(e) {
  let maxUserWatches = await readMaxUserWatches();
  let min = Math.min(maxUserWatches, MAX_WATCHERS);
  let s = await listWatchableDirs(e, min);
  if (s === null) return false;
  let h = 0;
  for (let S of s) {
    if (e.failed || e.watchers.has(S)) continue;
    if (!watchDirectory(e, S)) return false;
    if (++h % YIELD_EVERY === 0) await sleep(0);
  }
  let y = await listWatchableDirs(e, min);
  if (y === null) return false;
  for (let S of y) if (!e.failed && !e.watchers.has(S)) trackPending(e, watchNewDirectory(e, S));
  await waitForPendingWatches(e);
  return !e.failed;
}
//@ chunk-e6aww6q8.js:4797442-4797835 placement
/**
 * 为单个目录添加 fs.watch；出错时移除并重新处理该目录；目录不存在或无权限视为成功，其他失败记录后返回 false。
 */
function watchDirectory(observer, dir) {
  try {
    let r = watch(
      dir,
      {
        persistent: false,
      },
      (eventType, filename) => handleWatchEvent(observer, dir, eventType, filename),
    );
    r.on("error", () => {
      if (observer.watchers.get(dir) === r) {
        observer.watchers.delete(dir);
        trackPending(observer, watchNewDirectory(observer, dir));
      }
      r.close();
    });
    observer.watchers.set(dir, r);
    return true;
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "EACCES" || code === "EPERM") return true;
    logForDebugging(`writeObserver: cannot watch ${dir}: ${String(error)}`);
    return false;
  }
}
//@ chunk-e6aww6q8.js:4797835-4798158 placement
/**
 * 广度优先列出根目录下可监视的目录（跳过 .git 与已忽略目录、包含指向目录的链接），超过上限返回 null。
 */
async function listWatchableDirs(e, n) {
  let r = [];
  let s = [e.root];
  for (let idx = 0; idx < s.length; idx++) {
    let y = s[idx];
    let S;
    try {
      S = await readdir(y, {
        withFileTypes: true,
      });
    } catch {
      if (idx === 0) return null;
      continue;
    }
    r.push(y);
    if (r.length > n) return null;
    for (let w of S) {
      let L = join(y, w.name);
      if (w.name !== ".git" && !e.ignored.has(L) && (w.isDirectory() || (await isDirectoryEntry(w, y))))
        s.push(L);
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:4798158-4798332 placement
async function isDirectoryEntry(e, n) {
  if (e.isDirectory()) return true;
  if (e.isFile() || e.isSymbolicLink()) return false;
  let r = await lstat(join(n, e.name)).catch(() => null);
  return r !== null && r.isDirectory();
}
//@ chunk-e6aww6q8.js:4798332-4798508 placement
async function readMaxUserWatches() {
  let e = await readFile("/proc/sys/fs/inotify/max_user_watches", "utf8").catch(() => "");
  let n = Number.parseInt(e, 10);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}
//@ chunk-e6aww6q8.js:4798508-4799439 placement
/**
 * 处理文件监视事件：忽略 .git 与已忽略路径，记录 .gitignore 变化，目录被删除时停止监视，新目录递归加监视，并把写入路径计入正在观察的命令（无法定位时标记溢出）。
 */
function handleWatchEvent(observer, dir, eventType, filename) {
  let h = typeof filename === "string" ? filename : null;
  if (h !== null && h.split(/[\\/]/).includes(".git")) return;
  let fullPath = h === null || h === "" ? null : join(dir, h).replace(/[\\/]+$/, "");
  if (fullPath !== null && observer.ignored.size > 0) {
    if (observer.ignored.has(fullPath)) {
      trackPending(observer, recordChangedDirIfAny(observer, fullPath));
      return;
    }
    if (isUnderIgnoredDir(observer, fullPath)) return;
  }
  if (fullPath !== null && basename(fullPath) === ".gitignore") observer.ignoresChanged = true;
  if (fullPath === null && eventType !== "rename") return;
  if (fullPath !== null && eventType !== "rename" && h === basename(dir)) {
    trackPending(observer, recordChangedFileIfAny(observer, fullPath));
    return;
  }
  let S = fullPath === null && dir !== observer.root;
  if (fullPath === null && dir === observer.root) {
    if (observersByRoot.get(observer.root) === observer) observersByRoot.delete(observer.root);
    setTimeout(failObserver, 0, observer);
  } else if (fullPath !== null && eventType === "rename" && getPlatform() === "linux")
    trackPending(
      observer,
      dir === observer.root && h === basename(observer.root)
        ? checkRootReadable(observer).then((G) => (G ? watchNewDirectory(observer, fullPath) : undefined))
        : watchNewDirectory(observer, fullPath),
    );
  let lastEventAt = performance.now();
  let L = false;
  for (let G of observedRepos.values())
    if (G.root === observer.root) {
      L = true;
      G.lastEventAt = lastEventAt;
      if (fullPath === null && !S) G.overflow = true;
    }
  if (S) {
    for (let [G, q] of observer.watchers)
      if (G === dir || G.startsWith(dir + sep)) {
        q.close();
        observer.watchers.delete(G);
      }
    recordWrite(observer, dir + sep);
  } else if (fullPath === null) {
    if (!L) observer.outsideOverflow = true;
  } else recordWrite(observer, fullPath);
}
//@ chunk-e6aww6q8.js:4799439-4799536 placement
/**
 * 路径存在且不是目录时，记为命令的写入。
 */
async function recordChangedFileIfAny(observer, fullPath) {
  let r = await lstat(fullPath).catch(() => null);
  if (r !== null && !r.isDirectory()) recordWrite(observer, fullPath);
}
//@ chunk-e6aww6q8.js:4799536-4799633 placement
/**
 * 与 ICs 同类：路径存在且不是目录时记为写入（另一事件源）。
 */
async function recordChangedDirIfAny(observer, fullPath) {
  let r = await lstat(fullPath).catch(() => null);
  if (r !== null && !r.isDirectory()) recordWrite(observer, fullPath);
}
//@ chunk-e6aww6q8.js:4799633-4799738 placement
function isUnderIgnoredDir(e, n) {
  for (let r = dirname(n); r.length > e.root.length; r = dirname(r)) if (e.ignored.has(r)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4799738-4799835 placement
/**
 * 把异步任务记入待完成集合，完成后自动移除（结束观察时据此等待落定）。
 */
function trackPending(observer, n) {
  let r = n
    .catch(() => {
      return;
    })
    .finally(() => {
      observer.pending.delete(r);
    });
  observer.pending.add(r);
}
//@ chunk-e6aww6q8.js:4799835-4799952 placement
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
//@ chunk-e6aww6q8.js:4799952-4800726 placement
/**
 * 为新出现的目录添加监视（数量有上限），首次出现时异步检查是否被 git 忽略，并把其中已有文件计为写入、子目录递归监视。
 */
async function watchNewDirectory(e, n) {
  if (e.ignored.has(n)) return;
  if (e.watchers.get(n)) {
    for (let [y, S] of e.watchers)
      if (y === n || y.startsWith(n + sep)) {
        S.close();
        e.watchers.delete(y);
      }
    recordWrite(e, n + sep);
  }
  let s;
  try {
    s = await lstat(n);
  } catch {
    return;
  }
  if (!s.isDirectory() || e.failed || e.watchers.has(n) || e.ignored.has(n) || isUnderIgnoredDir(e, n))
    return;
  if (e.watchers.size >= MAX_WATCHERS || !watchDirectory(e, n)) {
    if (observersByRoot.get(e.root) === e) observersByRoot.delete(e.root);
    failObserver(e, "watch_failed");
    return;
  }
  if (e.ready && e.ignoreChecksLeft > 0 && !e.asking.has(n)) {
    e.ignoreChecksLeft--;
    e.asking.set(n, {
      held: new Set(),
      overflow: false,
    });
    checkDirIgnored(e, n).then((y) => settleIgnoreCheck(e, n, y));
  }
  let h;
  try {
    h = await readdir(n, {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  if (e.ignored.has(n) || isUnderIgnoredDir(e, n)) return;
  for (let y of h) {
    let S = join(n, y.name);
    if (y.isDirectory() || (await isDirectoryEntry(y, n))) {
      if (y.name !== ".git" && !e.ignored.has(S)) trackPending(e, watchNewDirectory(e, S));
    } else recordWrite(e, S);
  }
}
//@ chunk-e6aww6q8.js:4800726-4801032 placement
/**
 * 完成目录的忽略检查：被忽略则标记忽略；否则把检查期间暂存的写入计入，暂存溢出时标记相关命令溢出。
 */
function settleIgnoreCheck(e, n, r) {
  let s = e.asking.get(n);
  e.asking.delete(n);
  if (!s || e.failed || observersByRoot.get(e.root) !== e) return;
  if (r === true) {
    markDirIgnored(e, n);
    return;
  }
  for (let h of s.held) if (!e.ignored.has(h) && !isUnderIgnoredDir(e, h)) recordWrite(e, h);
  if (s.overflow) {
    let h = false;
    for (let y of observedRepos.values())
      if (y.root === e.root) {
        h = true;
        y.overflow = true;
      }
    if (!h) e.outsideOverflow = true;
  }
}
//@ chunk-e6aww6q8.js:4801032-4801124 placement
/**
 * 找到路径所属、正处于“忽略检查中”的目录项。
 */
function findAskingEntry(e, n) {
  for (let [r, s] of e.asking) if (n === r || n.startsWith(r + sep)) return s;
  return null;
}
//@ chunk-e6aww6q8.js:4801124-4801542 placement
/**
 * 把目录标记为被 git 忽略：清除其下的待检查项、监视器、已记录的命令写入与外部写入。
 */
function markDirIgnored(e, n) {
  e.ignored.add(n);
  let r = (s) => s === n || s.startsWith(n + sep);
  for (let [s, h] of [...e.asking])
    if (r(s)) e.asking.delete(s);
    else for (let y of h.held) if (r(y)) h.held.delete(y);
  for (let [s, h] of e.watchers)
    if (s === n || s.startsWith(n + sep)) {
      h.close();
      e.watchers.delete(s);
    }
  for (let s of observedRepos.values())
    if (s.root === e.root) {
      for (let path of s.paths) if (r(path)) s.paths.delete(path);
    }
  for (let outsideWrite of e.outsideWrites) if (r(outsideWrite)) e.outsideWrites.delete(outsideWrite);
}
//@ chunk-e6aww6q8.js:4801542-4801882 placement
/**
 * 并发受限地检查目录是否被 git 忽略（排队等待名额）；观察已失败或已知忽略时直接返回 null。
 */
async function checkDirIgnored(e, n) {
  if (e.ignoreLookupsRunning >= MAX_CONCURRENT_IGNORE_LOOKUPS)
    await new Promise((resolve) => e.ignoreLookupsWaiting.push(resolve));
  if (e.failed || e.ignored.has(n) || isUnderIgnoredDir(e, n)) {
    e.ignoreLookupsWaiting.shift()?.();
    return null;
  }
  e.ignoreLookupsRunning++;
  try {
    return await isDirectoryIgnored(e.root, n);
  } catch {
    return null;
  } finally {
    e.ignoreLookupsRunning--;
    e.ignoreLookupsWaiting.shift()?.();
  }
}
//@ chunk-e6aww6q8.js:4801882-4802239 placement
/**
 * 记录一次文件写入：目录尚在忽略检查中则暂存；否则计入所有正在观察同一根目录的命令（多个时标记共享），无命令时计为外部写入，超上限标记溢出。
 */
function recordWrite(e, n) {
  let askingEntry = findAskingEntry(e, n);
  if (askingEntry !== null) {
    if (askingEntry.held.size >= MAX_HELD_FILES) askingEntry.overflow = true;
    else askingEntry.held.add(n);
    return;
  }
  let filtered = [...observedRepos.values()].filter((h) => h.root === e.root);
  if (filtered.length === 0) {
    if (e.outsideWrites.size >= MAX_OUTSIDE_WRITES) e.outsideOverflow = true;
    else e.outsideWrites.add(n);
    return;
  }
  for (let h of filtered) {
    if (filtered.length > 1) h.shared = true;
    if (h.paths.size >= MAX_OBSERVED_PATHS) h.overflow = true;
    else h.paths.add(n);
  }
}
//@ chunk-e6aww6q8.js:4802239-4802389 placement
/**
 * 编辑记录器常量与状态：单文件/总量/缓存字节上限、目录展开上限、基线列表缓冲、git 超时、输出上限、串行链与每仓库记录器表。
 */
var MAX_RECORDED_FILE_BYTES = 2000000;
var MAX_TOTAL_RECORD_BYTES = 536870912;
var MAX_RECORD_BATCH_BYTES = 64000000;
var MAX_LAST_SEEN_BYTES = 64000000;
var MAX_EXPANDED_PATHS = 5000;
var MAX_BASE_LISTING_BYTES = 16000000;
var RECORDER_GIT_TIMEOUT_MS = getPlatform() === "windows" ? 2000 : 750;
var MAX_GIT_OUTPUT_BYTES = 5000000;
var RECORDER_POLL_MS = 500;
var recorderChains = new Map();
var recordersByCwd = new Map();
//@ chunk-e6aww6q8.js:4802389-4802417 placement
/**
 * 移除工作目录对应的编辑记录器（记录结束或失败时）。
 */
function forgetRecorder(e) {
  recordersByCwd.delete(e);
}
//@ chunk-e6aww6q8.js:4802417-4802458 placement
/**
 * 按仓库串行地取出并记录观察到的外部写入。
 */
function flushObservedWrites(e) {
  return runSerialForRecorder(e, () => recordObservedWrites(e));
}
//@ chunk-e6aww6q8.js:4802458-4802566 placement
/**
 * 按键把异步操作串行化执行（同一记录器的操作依次运行）。
 */
function runSerialForRecorder(e, n) {
  let s = (recorderChains.get(e) ?? Promise.resolve()).then(n, n);
  recorderChains.set(
    e,
    s.catch(() => {
      return;
    }),
  );
  return s;
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
  stopAllWriteObservers,
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
