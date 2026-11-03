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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  unlink as unlink_5,
  unlink as unlink_6,
  unlink as unlink_7,
  unlink as unlink_8,
  unlink as unlink_9,
  unlink as unlink_10,
  unlink as unlink_11,
  unlink as unlink_12,
  unlink as unlink_13,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
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
import { sT } from "../../utils/pastedContent.js";
import { getSessionId } from "../../bootstrap/state.js";
import { recordObservedWrites } from "./bashEditRecorder.js";

//@ chunk-e6aww6q8.js:4793443-4793479 placement = chordToDisplayString (1)
function isLinux() {
  return getPlatform() === "linux";
}
/**
 * 启动写入观察器，监视命令写入的文件。
 */
//@ chunk-e6aww6q8.js:4793479-4794029 placement
function startWriteObserver(e) {
  let n = observersByRoot.get(e);
  if (n) return n.failed ? "failed" : n.ready ? "ready" : "starting";
  let r = {
    root: e,
    failed: !1,
    ready: !1,
    watchers: new Map(),
    ignored: new Set(),
    ignoresChanged: !1,
    outsideWrites: new Set(),
    outsideOverflow: !1,
    ignoreChecksLeft: IGNORE_CHECKS_PER_REPO,
    ignoreLookupsRunning: 0,
    ignoreLookupsWaiting: [],
    pending: new Set(),
    asking: new Map(),
  };
  observersByRoot.set(e, r);
  let s = getPlatform() === "linux" ? watchTreeLinux : watchRecursively;
  return (
    listIgnoredFiles(e)
      .then((h) => ((r.ignored = h), r.failed ? !1 : s(r)))
      .then((h) => {
        if (h) r.ready = !0;
        else failObserver(r, "watch_failed");
      })
      .catch((h) => {
        (logForDebugging(`writeObserver: ${e}: ${String(h)}`), failObserver(r, "watch_failed"));
      }),
    "starting"
  );
}
//@ chunk-e6aww6q8.js:4794029-4794182 placement
function failObserver(e, n) {
  if (!e.failed && n) logFeatureBad("bash_edit_diff", n);
  ((e.failed = !0), (e.ready = !1));
  let r = [...e.watchers.values()];
  e.watchers.clear();
  for (let s of r) s.close();
}
//@ chunk-e6aww6q8.js:4794182-4794241 placement
function PYn() {
  return [...observersByRoot.values()].some((e) => !e.failed);
}
//@ chunk-e6aww6q8.js:4794241-4794315 placement
function RCs() {
  for (let e of observersByRoot.values()) failObserver(e);
  (observersByRoot.clear(), observedRepos.clear(), closeSentinelWatcher());
}
//@ chunk-e6aww6q8.js:4794315-4794432 placement
function closeSentinelWatcher() {
  if (!sharedWatcher) return;
  sharedWatcher.watcher.close();
  try {
    rmSync(sharedWatcher.directory, { recursive: !0, force: !0 });
  } catch {}
  ((sharedWatcher = null), (sharedWatcherReady = null));
}
/**
 * 取出并清空某根目录的外部写入记录（未就绪返回 null）。
 */
//@ chunk-e6aww6q8.js:4794432-4794608 placement
function takeOutsideWrites(e) {
  let n = observersByRoot.get(e);
  if (!n || !n.ready) return null;
  let r = { paths: [...n.outsideWrites], overflow: n.outsideOverflow };
  return (n.outsideWrites.clear(), (n.outsideOverflow = !1), r);
}
/**
 * 开始观察某命令在根目录下的写入（有上限，满时逐出最旧的观察）。
 */
//@ chunk-e6aww6q8.js:4794608-4794832 placement
function beginCommandObservation(e, n) {
  if (observedRepos.has(e)) return;
  if (observedRepos.size >= MAX_OBSERVED_REPOS) {
    let s = observedRepos.keys().next().value;
    if (s !== void 0) observedRepos.delete(s);
  }
  let r = observersByRoot.get(n);
  if (r) r.ignoreChecksLeft = IGNORE_CHECKS_PER_REPO;
  observedRepos.set(e, { root: n, paths: new Set(), overflow: !1, shared: !1, lastEventAt: 0 });
}
//@ chunk-e6aww6q8.js:4794832-4794861 placement
function IYn(e) {
  observedRepos.delete(e);
}
/**
 * 结束对某命令的写入观察：等待事件落定（Linux 用哨兵文件同步，其他平台等安静期），合并忽略检查中暂存的路径，返回 {paths, overflow, shared, watchEnds}；.gitignore 变化时停止该仓库的观察器。
 */
//@ chunk-e6aww6q8.js:4794861-4795529 placement
async function endCommandObservation(e) {
  let n = observedRepos.get(e);
  if (!n) return null;
  let r = observersByRoot.get(n.root);
  if (!r || r.failed || !r.ready) return (observedRepos.delete(e), null);
  if (getPlatform() === "linux") {
    if (!(await syncWithSentinel()) || !(await waitForPendingWatches(r))) n.overflow = !0;
  } else await waitForQuiet(n);
  if ((observedRepos.delete(e), r.failed || !r.ready)) return null;
  for (let s of r.asking.values()) {
    for (let y of s.held) {
      if (n.paths.size >= MAX_OBSERVED_PATHS) {
        n.overflow = !0;
        break;
      }
      n.paths.add(y);
    }
    if (s.overflow) n.overflow = !0;
    let any = [...observedRepos.values()].some((y) => y.root === r.root);
    if (s.held.size > 0 && any) n.shared = !0;
    if (!any) (s.held.clear(), (s.overflow = !1));
  }
  if (r.ignoresChanged) {
    if (observersByRoot.get(r.root) === r) observersByRoot.delete(r.root);
    failObserver(r);
  }
  return { paths: [...n.paths], overflow: n.overflow, shared: n.shared, watchEnds: r.ignoresChanged };
}
//@ chunk-e6aww6q8.js:4795529-4795710 placement
async function waitForPendingWatches(e) {
  let n = performance.now() + SETTLE_WAIT_MS;
  while (e.pending.size > 0) {
    let r = n - performance.now();
    if (r <= 0) return !1;
    await Promise.race([Promise.all([...e.pending]), sleep(r)]);
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4795710-4795915 placement
async function waitForQuiet(e) {
  let startTime = performance.now();
  for (;;) {
    let startTime_2 = performance.now(),
      max = Math.max(startTime + QUIET_WINDOWS_MS.grace, e.lastEventAt + QUIET_WINDOWS_MS.quiet);
    if (max <= startTime_2) return;
    if (startTime_2 - startTime >= MAX_SETTLE_MS) {
      e.overflow = !0;
      return;
    }
    await sleep(Math.min(max, startTime + MAX_SETTLE_MS) - startTime_2);
  }
}
/**
 * 在哨兵目录写入一个临时文件并等待其 inotify 事件，确保此前的文件事件都已送达；超时则关闭哨兵监视器。
 */
//@ chunk-e6aww6q8.js:4795915-4796280 placement
async function syncWithSentinel() {
  if (!(await ensureSentinelWatcher())) return !1;
  let e = sharedWatcher;
  if (!e) return !1;
  let n = `s${e.next++}`,
    promise = new Promise((S) => {
      e.waiting.set(n, () => S(!0));
    }),
    s = sleep(SETTLE_WAIT_MS).then(() => !1),
    h = join_129(e.directory, n);
  try {
    await writeFile_18(h, "", { flag: "wx", mode: 384 });
  } catch {
    return (e.waiting.delete(n), closeSentinelWatcher(), !1);
  }
  let winner = await Promise.race([promise, s]);
  if (
    (e.waiting.delete(n),
    unlink_13(h).catch(() => {
      return;
    }),
    !winner)
  )
    closeSentinelWatcher();
  return winner;
}
/**
 * 确保哨兵目录监视器已创建：在私有临时目录下建会话专属哨兵目录并监视，事件到达时唤醒等待者；进程退出时关闭。
 */
//@ chunk-e6aww6q8.js:4796280-4796790 placement
function ensureSentinelWatcher() {
  if (sharedWatcher) return Promise.resolve(!0);
  if (!sharedWatcherReady)
    sharedWatcherReady = (async () => {
      let e = await getPrivateTempRoot();
      if (e === null) return ((sharedWatcherReady = null), !1);
      let n = join_129(e, `${sT(getSessionId())}-${sT("sentinels")}-${randomBytes_14(8).toString("hex")}`);
      await mkdir_26(n, { recursive: !0, mode: 448 });
      let r = new Map(),
        s = watch(n, { persistent: !1 }, (h, y) => {
          if (typeof y === "string") r.get(y)?.();
        });
      if (
        (s.on("error", () => {
          closeSentinelWatcher();
        }),
        (sharedWatcher = { directory: n, watcher: s, waiting: r, next: 0 }),
        !exitHookInstalled)
      )
        ((exitHookInstalled = !0), process.once("exit", closeSentinelWatcher));
      return !0;
    })().catch(
      (e) => (logForDebugging(`writeObserver: sentinels: ${String(e)}`), (sharedWatcherReady = null), !1),
    );
  return sharedWatcherReady;
}
/**
 * 用递归 fs.watch 监视根目录（macOS/Windows），把事件路径转为相对路径交给事件处理；出错时标记观察失败。
 */
//@ chunk-e6aww6q8.js:4796790-4797099 placement
async function watchRecursively(e) {
  let n = resolveThroughRoot(e.root, e.root),
    r = watch(n, { recursive: !0, persistent: !1 }, (s, h) =>
      handleWatchEvent(
        e,
        e.root,
        s,
        typeof h === "string" && isAbsolute_56(h)
          ? h === n
            ? ""
            : h.startsWith(n + sep_73)
              ? h.slice(n.length + 1)
              : h
          : h,
      ),
    );
  return (
    r.on("error", (s) => {
      (logForDebugging(`writeObserver: ${e.root}: ${String(s)}`), failObserver(e, "watch_failed"));
    }),
    e.watchers.set(e.root, r),
    !0
  );
}
/**
 * 在 Linux 上逐目录添加监视（数量不超过 inotify 上限）：先监视已有目录，再扫描一次补上期间新出现的目录，最后等待挂起的监视完成。
 */
//@ chunk-e6aww6q8.js:4797099-4797442 placement
async function watchTreeLinux(e) {
  let n = await readMaxUserWatches(),
    min = Math.min(n, MAX_WATCHERS),
    s = await listWatchableDirs(e, min);
  if (s === null) return !1;
  let h = 0;
  for (let S of s) {
    if (e.failed || e.watchers.has(S)) continue;
    if (!watchDirectory(e, S)) return !1;
    if (++h % YIELD_EVERY === 0) await sleep(0);
  }
  let y = await listWatchableDirs(e, min);
  if (y === null) return !1;
  for (let S of y) if (!e.failed && !e.watchers.has(S)) _5(e, watchNewDirectory(e, S));
  return (await waitForPendingWatches(e), !e.failed);
}
/**
 * 为单个目录添加 fs.watch；出错时移除并重新处理该目录；目录不存在或无权限视为成功，其他失败记录后返回 false。
 */
//@ chunk-e6aww6q8.js:4797442-4797835 placement
function watchDirectory(e, n) {
  try {
    let r = watch(n, { persistent: !1 }, (s, h) => handleWatchEvent(e, n, s, h));
    return (
      r.on("error", () => {
        if (e.watchers.get(n) === r) (e.watchers.delete(n), _5(e, watchNewDirectory(e, n)));
        r.close();
      }),
      e.watchers.set(n, r),
      !0
    );
  } catch (error) {
    let s = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
    if (s === "ENOENT" || s === "ENOTDIR" || s === "EACCES" || s === "EPERM") return !0;
    return (logForDebugging(`writeObserver: cannot watch ${n}: ${String(error)}`), !1);
  }
}
/**
 * 广度优先列出根目录下可监视的目录（跳过 .git 与已忽略目录、包含指向目录的链接），超过上限返回 null。
 */
//@ chunk-e6aww6q8.js:4797835-4798158 placement
async function listWatchableDirs(e, n) {
  let r = [],
    s = [e.root];
  for (let h = 0; h < s.length; h++) {
    let y = s[h],
      S;
    try {
      S = await readdir_32(y, { withFileTypes: !0 });
    } catch {
      if (h === 0) return null;
      continue;
    }
    if ((r.push(y), r.length > n)) return null;
    for (let w of S) {
      let L = join_129(y, w.name);
      if (w.name !== ".git" && !e.ignored.has(L) && (w.isDirectory() || (await isDirectoryEntry(w, y))))
        s.push(L);
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:4798158-4798332 placement
async function isDirectoryEntry(e, n) {
  if (e.isDirectory()) return !0;
  if (e.isFile() || e.isSymbolicLink()) return !1;
  let r = await lstat_43(join_129(n, e.name)).catch(() => null);
  return r !== null && r.isDirectory();
}
//@ chunk-e6aww6q8.js:4798332-4798508 placement
async function readMaxUserWatches() {
  let e = await readFile_19("/proc/sys/fs/inotify/max_user_watches", "utf8").catch(() => ""),
    int = Number.parseInt(e, 10);
  return Number.isFinite(int) ? int : Number.POSITIVE_INFINITY;
}
/**
 * 处理文件监视事件：忽略 .git 与已忽略路径，记录 .gitignore 变化，目录被删除时停止监视，新目录递归加监视，并把写入路径计入正在观察的命令（无法定位时标记溢出）。
 */
//@ chunk-e6aww6q8.js:4798508-4799439 placement
function handleWatchEvent(observer, dir, eventType, filename) {
  let h = typeof filename === "string" ? filename : null;
  if (h !== null && h.split(/[\\/]/).includes(".git")) return;
  let fullPath = h === null || h === "" ? null : join_129(dir, h).replace(/[\\/]+$/, "");
  if (fullPath !== null && observer.ignored.size > 0) {
    if (observer.ignored.has(fullPath)) {
      _5(observer, DCs(observer, fullPath));
      return;
    }
    if (isUnderIgnoredDir(observer, fullPath)) return;
  }
  if (fullPath !== null && basename_68(fullPath) === ".gitignore") observer.ignoresChanged = !0;
  if (fullPath === null && eventType !== "rename") return;
  if (fullPath !== null && eventType !== "rename" && h === basename_68(dir)) {
    _5(observer, ICs(observer, fullPath));
    return;
  }
  let S = fullPath === null && dir !== observer.root;
  if (fullPath === null && dir === observer.root) {
    if (observersByRoot.get(observer.root) === observer) observersByRoot.delete(observer.root);
    setTimeout(failObserver, 0, observer);
  } else if (fullPath !== null && eventType === "rename" && getPlatform() === "linux")
    _5(
      observer,
      dir === observer.root && h === basename_68(observer.root)
        ? checkRootReadable(observer).then((G) => (G ? watchNewDirectory(observer, fullPath) : void 0))
        : watchNewDirectory(observer, fullPath),
    );
  let startTime = performance.now(),
    L = !1;
  for (let G of observedRepos.values())
    if (G.root === observer.root) {
      if (((L = !0), (G.lastEventAt = startTime), fullPath === null && !S)) G.overflow = !0;
    }
  if (S) {
    for (let [G, q] of observer.watchers)
      if (G === dir || G.startsWith(dir + sep_73)) (q.close(), observer.watchers.delete(G));
    recordWrite(observer, dir + sep_73);
  } else if (fullPath === null) {
    if (!L) observer.outsideOverflow = !0;
  } else recordWrite(observer, fullPath);
}
//@ chunk-e6aww6q8.js:4799439-4799536 placement
async function ICs(e, n) {
  let r = await lstat_43(n).catch(() => null);
  if (r !== null && !r.isDirectory()) recordWrite(e, n);
}
//@ chunk-e6aww6q8.js:4799536-4799633 placement
async function DCs(e, n) {
  let r = await lstat_43(n).catch(() => null);
  if (r !== null && !r.isDirectory()) recordWrite(e, n);
}
//@ chunk-e6aww6q8.js:4799633-4799738 placement
function isUnderIgnoredDir(e, n) {
  for (let r = dirname_77(n); r.length > e.root.length; r = dirname_77(r)) if (e.ignored.has(r)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4799738-4799835 placement
function _5(e, n) {
  let r = n
    .catch(() => {
      return;
    })
    .finally(() => {
      e.pending.delete(r);
    });
  e.pending.add(r);
}
//@ chunk-e6aww6q8.js:4799835-4799952 placement
async function checkRootReadable(e) {
  try {
    return (await readdir_32(e.root), !0);
  } catch {
    if (observersByRoot.get(e.root) === e) observersByRoot.delete(e.root);
    return (failObserver(e), !1);
  }
}
/**
 * 为新出现的目录添加监视（数量有上限），首次出现时异步检查是否被 git 忽略，并把其中已有文件计为写入、子目录递归监视。
 */
//@ chunk-e6aww6q8.js:4799952-4800726 placement
async function watchNewDirectory(e, n) {
  if (e.ignored.has(n)) return;
  if (e.watchers.get(n)) {
    for (let [y, S] of e.watchers) if (y === n || y.startsWith(n + sep_73)) (S.close(), e.watchers.delete(y));
    recordWrite(e, n + sep_73);
  }
  let s;
  try {
    s = await lstat_43(n);
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
  if (e.ready && e.ignoreChecksLeft > 0 && !e.asking.has(n))
    (e.ignoreChecksLeft--,
      e.asking.set(n, { held: new Set(), overflow: !1 }),
      checkDirIgnored(e, n).then((y) => settleIgnoreCheck(e, n, y)));
  let h;
  try {
    h = await readdir_32(n, { withFileTypes: !0 });
  } catch {
    return;
  }
  if (e.ignored.has(n) || isUnderIgnoredDir(e, n)) return;
  for (let y of h) {
    let S = join_129(n, y.name);
    if (y.isDirectory() || (await isDirectoryEntry(y, n))) {
      if (y.name !== ".git" && !e.ignored.has(S)) _5(e, watchNewDirectory(e, S));
    } else recordWrite(e, S);
  }
}
/**
 * 完成目录的忽略检查：被忽略则标记忽略；否则把检查期间暂存的写入计入，暂存溢出时标记相关命令溢出。
 */
//@ chunk-e6aww6q8.js:4800726-4801032 placement
function settleIgnoreCheck(e, n, r) {
  let s = e.asking.get(n);
  if ((e.asking.delete(n), !s || e.failed || observersByRoot.get(e.root) !== e)) return;
  if (r === !0) {
    markDirIgnored(e, n);
    return;
  }
  for (let h of s.held) if (!e.ignored.has(h) && !isUnderIgnoredDir(e, h)) recordWrite(e, h);
  if (s.overflow) {
    let h = !1;
    for (let y of observedRepos.values()) if (y.root === e.root) ((h = !0), (y.overflow = !0));
    if (!h) e.outsideOverflow = !0;
  }
}
//@ chunk-e6aww6q8.js:4801032-4801124 placement
function FCs(e, n) {
  for (let [r, s] of e.asking) if (n === r || n.startsWith(r + sep_73)) return s;
  return null;
}
/**
 * 把目录标记为被 git 忽略：清除其下的待检查项、监视器、已记录的命令写入与外部写入。
 */
//@ chunk-e6aww6q8.js:4801124-4801542 placement
function markDirIgnored(e, n) {
  e.ignored.add(n);
  let r = (s) => s === n || s.startsWith(n + sep_73);
  for (let [s, h] of [...e.asking])
    if (r(s)) e.asking.delete(s);
    else for (let y of h.held) if (r(y)) h.held.delete(y);
  for (let [s, h] of e.watchers) if (s === n || s.startsWith(n + sep_73)) (h.close(), e.watchers.delete(s));
  for (let s of observedRepos.values())
    if (s.root === e.root) {
      for (let path of s.paths) if (r(path)) s.paths.delete(path);
    }
  for (let outsideWrite of e.outsideWrites) if (r(outsideWrite)) e.outsideWrites.delete(outsideWrite);
}
/**
 * 并发受限地检查目录是否被 git 忽略（排队等待名额）；观察已失败或已知忽略时直接返回 null。
 */
//@ chunk-e6aww6q8.js:4801542-4801882 placement
async function checkDirIgnored(e, n) {
  if (e.ignoreLookupsRunning >= MAX_CONCURRENT_IGNORE_LOOKUPS)
    await new Promise((r) => e.ignoreLookupsWaiting.push(r));
  if (e.failed || e.ignored.has(n) || isUnderIgnoredDir(e, n))
    return (e.ignoreLookupsWaiting.shift()?.(), null);
  e.ignoreLookupsRunning++;
  try {
    return await isDirectoryIgnored(e.root, n);
  } catch {
    return null;
  } finally {
    (e.ignoreLookupsRunning--, e.ignoreLookupsWaiting.shift()?.());
  }
}
/**
 * 记录一次文件写入：目录尚在忽略检查中则暂存；否则计入所有正在观察同一根目录的命令（多个时标记共享），无命令时计为外部写入，超上限标记溢出。
 */
//@ chunk-e6aww6q8.js:4801882-4802239 placement
function recordWrite(e, n) {
  let r = FCs(e, n);
  if (r !== null) {
    if (r.held.size >= MAX_HELD_FILES) r.overflow = !0;
    else r.held.add(n);
    return;
  }
  let filtered = [...observedRepos.values()].filter((h) => h.root === e.root);
  if (filtered.length === 0) {
    if (e.outsideWrites.size >= MAX_OUTSIDE_WRITES) e.outsideOverflow = !0;
    else e.outsideWrites.add(n);
    return;
  }
  for (let h of filtered) {
    if (filtered.length > 1) h.shared = !0;
    if (h.paths.size >= MAX_OBSERVED_PATHS) h.overflow = !0;
    else h.paths.add(n);
  }
}
/**
 * 编辑记录器常量与状态：单文件/总量/缓存字节上限、目录展开上限、基线列表缓冲、git 超时、输出上限、串行链与每仓库记录器表。
 */
//@ chunk-e6aww6q8.js:4802239-4802389 placement
var MAX_RECORDED_FILE_BYTES = 2000000,
  MAX_TOTAL_RECORD_BYTES = 536870912,
  MAX_RECORD_BATCH_BYTES = 64000000,
  MAX_LAST_SEEN_BYTES = 64000000,
  MAX_EXPANDED_PATHS = 5000,
  MAX_BASE_LISTING_BYTES = 16000000,
  RECORDER_GIT_TIMEOUT_MS = getPlatform() === "windows" ? 2000 : 750,
  MAX_GIT_OUTPUT_BYTES = 5000000,
  RECORDER_POLL_MS = 500,
  recorderChains = new Map(),
  recordersByCwd = new Map();
//@ chunk-e6aww6q8.js:4802389-4802417 placement
function dS(e) {
  recordersByCwd.delete(e);
}
//@ chunk-e6aww6q8.js:4802417-4802458 placement
function zYn(e) {
  return runSerialForRecorder(e, () => recordObservedWrites(e));
}
/**
 * 按键把异步操作串行化执行（同一记录器的操作依次运行）。
 */
//@ chunk-e6aww6q8.js:4802458-4802566 placement
function runSerialForRecorder(e, n) {
  let s = (recorderChains.get(e) ?? Promise.resolve()).then(n, n);
  return (
    recorderChains.set(
      e,
      s.catch(() => {
        return;
      }),
    ),
    s
  );
}

export {
  PYn,
  isLinux,
  startWriteObserver,
  zYn,
  beginCommandObservation,
  endCommandObservation,
  dS,
  IYn,
  RCs,
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
