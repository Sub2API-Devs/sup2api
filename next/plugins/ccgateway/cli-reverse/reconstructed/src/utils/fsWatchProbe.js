/**
 * utils/fsWatchProbe.ts
 *
 * fs.watch 可用性探测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdtemp, open, rm as rm_2 } from "fs/promises";
import { join as join_2 } from "path";
import { watch as watch_2, constants } from "fs";
import { claudeTempDir } from "./tempDir.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, getErrnoCode } from "./errors.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { sleep } from "./sleep.js";
import { isDiskless } from "../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:22941-23013 placement
var PROBE_BUDGET_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROBE_REWRITE_EVERY_MS;
var PROBE_FILE_MODE;
var PROBE_CLOSE_DELAY_FACTOR;
var WATCHER_RESOURCE_ERRNOS;
deferInit("chunk-a2q0x549.js:22941", () => {
  PROBE_BUDGET_MS = 1500;
  PROBE_REWRITE_EVERY_MS = 100;
  PROBE_FILE_MODE = 384;
  PROBE_CLOSE_DELAY_FACTOR = 2;
  WATCHER_RESOURCE_ERRNOS = new Set(["EMFILE", "ENFILE", "ENOSPC"]);
});
//@ chunk-a2q0x549.js:23013-23299 placement
async function probeFsWatch(options = {}) {
  let dirPath;
  try {
    dirPath = await mkdtemp(join_2(options.directory ?? claudeTempDir(), "fswatch-probe-"));
  } catch (error) {
    logForDebugging(`[fs.watch probe] no probe dir: ${errorMessage(error)}`);
    return "unprobed";
  }
  try {
    return await probeWatchOnFile(join_2(dirPath, "probe"), options);
  } catch (error) {
    logForDebugging(`[fs.watch probe] no probe file: ${errorMessage(error)}`);
    return "unprobed";
  } finally {
    await removeRecursiveQuietly(dirPath);
  }
}
//@ chunk-a2q0x549.js:23299-23691 placement
/**
 * 在探测文件上建立 fs.watch 并反复写入，判断事件是否触发：fired、refused 或 unprobed。
 */
async function probeWatchOnFile(filePath, options) {
  let fileIdentity = await getFileIdentity(filePath);
  let probeState = {
    hasFired: false,
    wasRefused: false,
  };
  let watch = options.watch ?? watch_2;
  let watcher;
  try {
    watcher = watch(filePath, () => {
      probeState.hasFired = true;
    });
  } catch (error) {
    logForDebugging(`[fs.watch probe] watch() threw: ${errorMessage(error)}`);
    return isWatcherResourceError(error) ? "refused" : "unprobed";
  }
  watcher.on("error", (error) => {
    probeState.wasRefused ||= isWatcherResourceError(error);
    logForDebugging(`[fs.watch probe] watcher error: ${errorMessage(error)}`);
  });
  try {
    await pokeUntilFired(fileIdentity, probeState, options);
  } finally {
    await closeProbeFileLater(watcher, options);
  }
  let verdict = probeOutcomeLabel(probeState);
  logForDebugging(`[fs.watch probe] verdict: ${verdict}`);
  return verdict;
}
//@ chunk-a2q0x549.js:23691-23858 placement (2.1.88 match: getFileIdentity, 0.867)
async function getFileIdentity(filePath) {
  let handle = await open(filePath, "wx", PROBE_FILE_MODE);
  try {
    await handle.write("0", 0);
    let { dev, ino } = await handle.stat({
      bigint: true,
    });
    return {
      path: filePath,
      dev,
      ino,
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-a2q0x549.js:23858-24116 placement
async function writeProbeFile(identity, writeCount) {
  let handle = await open(identity.path, constants.O_WRONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (stats.dev !== identity.dev || stats.ino !== identity.ino || stats.nlink !== 1n)
      throw Error("the probe file was replaced while the probe ran");
    await handle.write(String(writeCount), 0);
  } finally {
    await handle.close();
  }
}
//@ chunk-a2q0x549.js:24116-24171 placement
function isWatcherResourceError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && WATCHER_RESOURCE_ERRNOS.has(errnoCode);
}
//@ chunk-a2q0x549.js:24171-24222 placement
async function closeProbeFileLater(watcher, options) {
  await sleep(probeRewriteInterval(options) * PROBE_CLOSE_DELAY_FACTOR);
  watcher.close();
}
//@ chunk-a2q0x549.js:24222-24265 placement
function probeRewriteInterval(options) {
  return options.rewriteEveryMs ?? PROBE_REWRITE_EVERY_MS;
}
//@ chunk-a2q0x549.js:24265-24409 placement
async function pokeUntilFired(identity, probeState, options) {
  let budgetMs = options.budgetMs ?? PROBE_BUDGET_MS;
  let intervalMs = probeRewriteInterval(options);
  let startTime = performance.now();
  let writeCount = 0;
  while (!probeSettled(probeState) && performance.now() - startTime < budgetMs) {
    writeCount += 1;
    await writeProbeFile(identity, writeCount);
    await sleep(intervalMs);
  }
}
//@ chunk-a2q0x549.js:24409-24456 placement
function probeSettled(probeState) {
  return probeState.hasFired || probeState.wasRefused;
}
//@ chunk-a2q0x549.js:24456-24532 placement
function probeOutcomeLabel(probeState) {
  return probeState.hasFired ? "delivers" : probeState.wasRefused ? "refused" : "silent";
}
//@ chunk-a2q0x549.js:24532-24607 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
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
//@ chunk-a2q0x549.js:24607-24684 placement
/**
 * 求两个集合的差集。
 */
function setDifference(allDirs, pendingDirs) {
  let missing = new Set();
  for (let dir of allDirs) if (!pendingDirs.has(dir)) missing.add(dir);
  return missing;
}
//@ chunk-a2q0x549.js:24684-24748 placement
/**
 * 判断集合 e 是否全部包含在 n 中。
 */
function isSubsetOf(candidates, allowed) {
  for (let dir of candidates) if (!allowed.has(dir)) return false;
  return true;
}
//@ chunk-a2q0x549.js:24748-24815 placement
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
//@ chunk-a2q0x549.js:24815-24882 placement
/**
 * 判断是否使用原生文件监听（非无盘，或其他机器托管会话）。
 */
function shouldUseNativeWatch({ machineServesSession = false } = {}) {
  return !isDiskless() && (!isRemoteSessionAvailable() || machineServesSession);
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
