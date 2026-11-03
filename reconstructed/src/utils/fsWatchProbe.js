/**
 * utils/fsWatchProbe.ts
 *
 * fs.watch 可用性探测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (16)
 * attribution: placement 16
 */
import { mkdtemp, open, rm as rm_2 } from "fs/promises";
import { join } from "path";
import { watch as watch_2, constants } from "fs";
import { claudeTempDir } from "./tempDir.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, getErrnoCode } from "./errors.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { sleep } from "./sleep.js";
import { isDiskless } from "../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";

//@ chunk-82kqcve8.js:22866-22938 placement
var PROBE_BUDGET_MS = 1500;
var PROBE_REWRITE_EVERY_MS = 100;
var PROBE_FILE_MODE = 384;
var PROBE_CLOSE_DELAY_FACTOR = 2;
var WATCHER_RESOURCE_ERRNOS = new Set(["EMFILE", "ENFILE", "ENOSPC"]);
//@ chunk-82kqcve8.js:22938-23224 placement
async function probeFsWatch(e = {}) {
  let dirPath;
  try {
    dirPath = await mkdtemp(join(e.directory ?? claudeTempDir(), "fswatch-probe-"));
  } catch (error) {
    logForDebugging(`[fs.watch probe] no probe dir: ${errorMessage(error)}`);
    return "unprobed";
  }
  try {
    return await probeWatchOnFile(join(dirPath, "probe"), e);
  } catch (error) {
    logForDebugging(`[fs.watch probe] no probe file: ${errorMessage(error)}`);
    return "unprobed";
  } finally {
    await removeRecursiveQuietly(dirPath);
  }
}
//@ chunk-82kqcve8.js:23224-23616 placement
/**
 * 在探测文件上建立 fs.watch 并反复写入，判断事件是否触发：fired、refused 或 unprobed。
 */
async function probeWatchOnFile(filePath, n) {
  let fileIdentity = await getFileIdentity(filePath);
  let s = {
    hasFired: false,
    wasRefused: false,
  };
  let watch = n.watch ?? watch_2;
  let y;
  try {
    y = watch(filePath, () => {
      s.hasFired = true;
    });
  } catch (error) {
    logForDebugging(`[fs.watch probe] watch() threw: ${errorMessage(error)}`);
    return isWatcherResourceError(error) ? "refused" : "unprobed";
  }
  y.on("error", (S) => {
    s.wasRefused ||= isWatcherResourceError(S);
    logForDebugging(`[fs.watch probe] watcher error: ${errorMessage(S)}`);
  });
  try {
    await pokeUntilFired(fileIdentity, s, n);
  } finally {
    await closeProbeFileLater(y, n);
  }
  let w = probeOutcomeLabel(s);
  logForDebugging(`[fs.watch probe] verdict: ${w}`);
  return w;
}
//@ chunk-82kqcve8.js:23616-23783 placement = getFileIdentity (0.867)
async function getFileIdentity(filePath) {
  let n = await open(filePath, "wx", PROBE_FILE_MODE);
  try {
    await n.write("0", 0);
    let { dev, ino } = await n.stat({
      bigint: true,
    });
    return {
      path: filePath,
      dev,
      ino,
    };
  } finally {
    await n.close();
  }
}
//@ chunk-82kqcve8.js:23783-24041 placement
async function writeProbeFile(e, n) {
  let r = await open(e.path, constants.O_WRONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await r.stat({
      bigint: true,
    });
    if (stats.dev !== e.dev || stats.ino !== e.ino || stats.nlink !== 1n)
      throw Error("the probe file was replaced while the probe ran");
    await r.write(String(n), 0);
  } finally {
    await r.close();
  }
}
//@ chunk-82kqcve8.js:24041-24096 placement
function isWatcherResourceError(e) {
  let errnoCode = getErrnoCode(e);
  return errnoCode !== undefined && WATCHER_RESOURCE_ERRNOS.has(errnoCode);
}
//@ chunk-82kqcve8.js:24096-24147 placement
async function closeProbeFileLater(e, n) {
  await sleep(probeRewriteInterval(n) * PROBE_CLOSE_DELAY_FACTOR);
  e.close();
}
//@ chunk-82kqcve8.js:24147-24190 placement
function probeRewriteInterval(e) {
  return e.rewriteEveryMs ?? PROBE_REWRITE_EVERY_MS;
}
//@ chunk-82kqcve8.js:24190-24334 placement
async function pokeUntilFired(fileIdentity, n, r) {
  let budgetMs = r.budgetMs ?? PROBE_BUDGET_MS;
  let h = probeRewriteInterval(r);
  let startTime = performance.now();
  let w = 0;
  while (!probeSettled(n) && performance.now() - startTime < budgetMs) {
    w += 1;
    await writeProbeFile(fileIdentity, w);
    await sleep(h);
  }
}
//@ chunk-82kqcve8.js:24334-24381 placement
function probeSettled(e) {
  return e.hasFired || e.wasRefused;
}
//@ chunk-82kqcve8.js:24381-24457 placement
function probeOutcomeLabel(e) {
  return e.hasFired ? "delivers" : e.wasRefused ? "refused" : "silent";
}
//@ chunk-82kqcve8.js:24457-24532 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveQuietly(dirPath) {
  try {
    await rm_2(dirPath, {
      recursive: true,
      force: true,
    });
  } catch {
    return;
  }
}
//@ chunk-82kqcve8.js:24532-24609 placement
/**
 * 求两个集合的差集。
 */
function setDifference(e, pendingDirs) {
  let r = new Set();
  for (let s of e) if (!pendingDirs.has(s)) r.add(s);
  return r;
}
//@ chunk-82kqcve8.js:24609-24673 placement
/**
 * 判断集合 e 是否全部包含在 n 中。
 */
function isSubsetOf(e, n) {
  for (let r of e) if (!n.has(r)) return false;
  return true;
}
//@ chunk-82kqcve8.js:24673-24740 placement
/**
 * 设置文件监听的稳定性阈值、轮询间隔、MDM 轮询间隔与删除宽限等常量。
 */
var SETTINGS_STABILITY_THRESHOLD_MS = 1000;
var SETTINGS_POLL_INTERVAL_MS = 500;
var SETTINGS_MDM_POLL_INTERVAL_MS = 1800000;
var SETTINGS_DELETION_GRACE_MS = SETTINGS_STABILITY_THRESHOLD_MS + SETTINGS_POLL_INTERVAL_MS + 200;
var SETTINGS_OBSERVATION_LAG_MS = 2000;
var SETTINGS_WATCH_POLL_INTERVAL_MS = 2000;
var SETTINGS_WATCH_LAG_MS = 2000;
//@ chunk-82kqcve8.js:24740-24807 placement
/**
 * 判断是否使用原生文件监听（非无盘，或其他机器托管会话）。
 */
function shouldUseNativeWatch({ machineServesSession: e = false } = {}) {
  return !isDiskless() && (!isRemoteSessionAvailable() || e);
}
export {
  isSubsetOf,
  SETTINGS_STABILITY_THRESHOLD_MS,
  SETTINGS_POLL_INTERVAL_MS,
  SETTINGS_MDM_POLL_INTERVAL_MS,
  SETTINGS_DELETION_GRACE_MS,
  SETTINGS_OBSERVATION_LAG_MS,
  SETTINGS_WATCH_POLL_INTERVAL_MS,
  shouldUseNativeWatch,
  probeFsWatch,
  SETTINGS_WATCH_LAG_MS,
  setDifference,
};
