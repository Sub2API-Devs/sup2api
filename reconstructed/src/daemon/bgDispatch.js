/**
 * daemon/bgDispatch.ts
 *
 * 2.1.316 新增：后台会话管理器主循环：派发、PTY 启动、会话结算、保活；daemon 子 worker 进程管理（启动、崩溃退避、停止、忙碌状态）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ss669z1x.js (49)
 * attribution: placement 49
 */
import { stat, rename, unlink, mkdir, lstat, rm, readFile, readdir, access, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { join, basename } from "path";
import { once } from "events";
import { freemem } from "os";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../utils/sanitization.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { escapeControlChars, toUnicodeEscapes } from "../utils/resultError.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import {
  isENOENT,
  sanitizeErrnoForTelemetry,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isSyscallError,
  getErrnoCode,
} from "../utils/errors.js";
import {
  daemonRejectedDir,
  daemonDispatchDir,
  hostManagedEntry,
  redactDaemonPipeKey,
  daemonControlSocket,
  daemonRvDir,
  daemonPtyDir,
  redactErrorPaths,
  daemonTokensFile,
  daemonPtyPidFile,
  ptyErrFile,
  daemonPtySocket,
  ptyLateFile,
  daemonAuthFile,
  daemonPtyPidsDir,
  hostManagedDir,
} from "../utils/sandbox/userNamespace.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { concatSafe, lit, fromNumber, fromEnum } from "../services/analytics/safeMetadata.js";
import {
  logFeatureBad,
  logFeatureOk,
  withFeatureTelemetry,
  logFeatureSad,
} from "../services/analytics/featureTelemetry.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { BgDispatchSchema, CLOUD_SESSION_LEASE_LABEL } from "../services/daemon/leaseProtocol.js";
import {
  pickAllowedEnv,
  BG_CARRIED_ENV_ALLOWLIST,
  BG_INTERNAL_ENV_KEYS,
} from "../utils/background/envCarry.js";
import { STORAGE_SPACES, isValidKeySegment } from "../utils/storage/storageSpaces.js";
import { checkJobFileWritable } from "../services/daemon/sessionCron.js";
import { isUnrecoverableStorageRead, bgShort, updateRoster, readRoster } from "../services/daemon/roster.js";
import { getPlatform } from "../utils/platform.js";
import { chokidar_default } from "../../vendor/chokidar/index.js";
import { withTimeout, sleep, withDeadline } from "../utils/sleep.js";
import {
  readPinnedJobIds,
  ABANDONED_WORKER_MS,
  writeReapedTerminalState,
  getJobDir,
  readJobState,
  isSettled,
  writeStateAtomic,
} from "../services/daemon/jobState.js";
import { logError } from "../utils/log.js";
import { createPtyHostSpawner } from "../services/daemon/spawnBgSession.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
} from "../services/analytics/growthbook.js";
import { isLowMemory, getLowMemoryState, isAttachUpgradeEnabled } from "./lowMemory.js";
import { spawnSpare, claimSpare, reapOrphanSpares } from "../services/daemon/spare.js";
import { processWrapperArgv, PROCESS_WRAPPER_ENV, processWrapperError } from "../utils/processWrapper.js";
import { cwdGoneReason, MIN_POLL_MS } from "../services/daemon/sessionRestart.js";
import {
  isProviderManagedByHost,
  DaemonSupervisor,
  shouldCarryAuth,
} from "../services/daemon/DaemonSupervisor.js";
import {
  encodeHostLineage,
  writeHostTombstone,
  deleteHostTombstone,
  ensureTombstoneScope,
  DAEMON_START_BUDGET_MS,
} from "../services/daemon/ensureDaemon.js";
import {
  ensureDaemonRuntimeDir,
  ensureDaemonDir,
  cleanupStaleDaemonDirs,
  getExecExitPath,
  getDaemonRuntimeDir,
} from "../services/daemon/paths.js";
import { handleDaemonLease } from "../services/daemon/controlServer.js";
import {
  pingPtySocket,
  rcChannelDiffers,
  readExecExitStatus,
  isNewerBuild,
  listStoredPtyPids,
  killViaPtySocket,
  readStoredPtyPid,
  MAX_PID_FILE_BYTES,
} from "../services/daemon/reapJobs.js";
import { getProcessStartTimeAsync, reapDetachedRepl, sigtermThenKill } from "../utils/processIdentity.js";
import { readDaemonLock } from "../utils/daemon/daemonLock.js";
import { count } from "../utils/collections.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { moveSkipPermissionsLast, splitForwardableArgs } from "../cli/forwardedFlags.js";
import { readSmallFileOrNull } from "../utils/readSmallFile.js";
import { isProcessRunning } from "../utils/genericProcessUtils.js";
import { withProcessWrapper, findLatestInstalledVersion } from "../utils/deepLink/registerProtocol.js";
import { SERVED_SESSIONS_MAX, writeDaemonStatus, removeDaemonStatus } from "./daemonStatus.js";
import { EXIT_TEMPFAIL, EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";
import { isWorkerKindAdmitted, WORKER_KINDS } from "./runDaemonWorker.js";
import { initialize } from "./daemonConfigWatcher.js";
import { defaultWorkerKindsConfig, readJsonConfigFile } from "../utils/jsonConfigFile.js";
import { diffSkillServers } from "../utils/skills/skillChangeDetector.js";

//@ chunk-ss669z1x.js:14515-14561 placement
var MAX_DISPATCH_INPUT_BYTES = 10485760;
var regExp = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "gu");
//@ chunk-ss669z1x.js:14561-14647 placement
function normalizeDispatchInput(r) {
  let e = redactSecrets(r).trimEnd();
  return e.includes(`
`)
    ? escapeControlChars(jsonStringify(e))
    : e.replace(regExp, toUnicodeEscapes);
}
//@ chunk-ss669z1x.js:14647-15174 placement
/**
 * 打开后台派发日志（过大时清空），写入带时间戳的条目。
 */
async function openBgDispatchLog(r) {
  let isTTY = process.stdout.isTTY;
  let o = await stat(r)
    .then((u) => u.size)
    .catch(() => 0);
  if (o > MAX_DISPATCH_INPUT_BYTES) {
    await rotateLogFile(r);
    o = 0;
  }
  let appendFd = openAppendFd(r);
  let i = null;
  let h = null;
  let S = false;
  return {
    write(u, y) {
      let D = `[${new Date().toISOString()}] [${u}] ${normalizeDispatchInput(y)}
`;
      if (isTTY) process.stdout.write(D);
      if (S) return;
      o += Buffer.byteLength(D);
      if (h) h.push(D);
      else appendFd.write(D);
      if (o > MAX_DISPATCH_INPUT_BYTES && !i) {
        let E = appendFd;
        let L = [];
        h = L;
        i = (async () => {
          try {
            await endWritable(E);
            await rotateLogFile(r);
            appendFd = openAppendFd(r);
            o = 0;
            for (let P of L) {
              o += Buffer.byteLength(P);
              appendFd.write(P);
            }
          } catch {
          } finally {
            h = null;
            i = null;
          }
        })();
      }
    },
    async close() {
      S = true;
      await i;
      await endWritable(appendFd);
    },
  };
}
//@ chunk-ss669z1x.js:15174-15243 placement
function openAppendFd(r) {
  let writeStream = createWriteStream(r, {
    flags: "a",
  });
  writeStream.on("error", () => {});
  return writeStream;
}
//@ chunk-ss669z1x.js:15243-15341 placement
function endWritable(r) {
  return new Promise((resolve) => {
    if (r.closed) {
      resolve();
      return;
    }
    r.once("close", () => resolve());
    r.end();
  });
}
//@ chunk-ss669z1x.js:15341-15491 placement
async function rotateLogFile(r) {
  let e = `${r}.1`;
  try {
    await rename(r, e);
  } catch (error) {
    if (isENOENT(error)) return;
    await unlink(e).catch(() => {});
    await rename(r, e).catch(() => unlink(r).catch(() => {}));
  }
}
//@ chunk-ss669z1x.js:15918-15944 placement
var DISPATCH_TTL_MS = 86400000;
var MAX_DISPATCH_FILE_BYTES = 262144;
//@ chunk-ss669z1x.js:15944-16092 placement
async function quarantineDispatchFile(r, e) {
  await mkdir(daemonRejectedDir(), {
    recursive: true,
    mode: 448,
  }).catch(() => {});
  await rename(r, join(daemonRejectedDir(), basename(r))).catch(() => unlink(r).catch(() => {}));
  reportDispatchRejected(basename(r), e);
}
//@ chunk-ss669z1x.js:16092-16206 placement
function reportDispatchRejected(r, e) {
  logForDebugging(`[bg-dispatch] rejected ${r}: ${e}`, {
    level: "warn",
  });
  logEvent("tengu_bg_dispatch_rejected", {
    reason: e,
  });
}
//@ chunk-ss669z1x.js:16206-16268 placement
function oversizedMessage(r) {
  return concatSafe(lit("oversized ("), fromNumber(r), lit(" bytes)"));
}
//@ chunk-ss669z1x.js:16268-17013 placement
/**
 * 读取并校验一个派发请求文件（拒绝 symlink、非常规文件、过大文件）。
 */
async function ingestDispatchFile(r, e) {
  let o;
  try {
    o = await lstat(r);
  } catch (error) {
    if (isENOENT(error)) return;
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    return quarantineDispatchFile(r, sanitizeErrnoForTelemetry(error) ?? lit("unknown"));
  }
  if (o.isSymbolicLink()) {
    logFeatureBad("daemon_bg_dispatch_ingest", "symlink");
    return quarantineDispatchFile(r, lit("symlink"));
  }
  if (!o.isFile()) {
    logFeatureBad("daemon_bg_dispatch_ingest", "not_a_file");
    logForDebugging(`[bg-dispatch] removed non-regular ${basename(r)}`, {
      level: "warn",
    });
    await rm(r, {
      recursive: true,
      force: true,
    }).catch(() => {});
    return;
  }
  if (o.size > MAX_DISPATCH_FILE_BYTES) {
    logFeatureBad("daemon_bg_dispatch_ingest", "oversized");
    return quarantineDispatchFile(r, oversizedMessage(o.size));
  }
  let n;
  try {
    n = await readFile(r, "utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    return quarantineDispatchFile(r, sanitizeErrnoForTelemetry(error) ?? lit("unknown"));
  }
  let dispatchRecord = parseDispatchRecord(n);
  if (!dispatchRecord.ok) return quarantineDispatchFile(r, dispatchRecord.reason);
  e(dispatchRecord.dispatch);
  logFeatureOk("daemon_bg_dispatch_ingest");
  await unlink(r).catch(() => {});
}
//@ chunk-ss669z1x.js:17013-17062 placement
var DISPATCH_DIR = {
  namespace: "daemon",
  relPath: ["dispatch"],
};
//@ chunk-ss669z1x.js:17062-17208 placement
async function ensureDispatchDir(r) {
  if (isStorageV5Enabled() && r !== undefined) {
    await r.ensureScope(DISPATCH_DIR).catch(() => {
      return;
    });
    return;
  }
  await mkdir(daemonDispatchDir(), {
    recursive: true,
    mode: 448,
  }).catch(() => {});
}
//@ chunk-ss669z1x.js:17208-17710 placement
/**
 * 解析派发记录 JSON 并校验 schema。
 */
function parseDispatchRecord(r) {
  let e;
  let o = true;
  try {
    e = jsonParse(r);
  } catch {
    e = undefined;
    o = false;
  }
  let n;
  try {
    n = BgDispatchSchema().safeParse(e);
  } catch {
    logFeatureBad("daemon_bg_dispatch_ingest", "transform_throw");
    return {
      ok: false,
      reason: lit("transform_throw"),
    };
  }
  if (!n.success) {
    logFeatureBad("daemon_bg_dispatch_ingest", o ? "schema" : "bad_json");
    return {
      ok: false,
      reason: lit("schema"),
    };
  }
  if (Date.now() - n.data.createdAt > DISPATCH_TTL_MS) {
    logFeatureBad("daemon_bg_dispatch_ingest", "stale");
    return {
      ok: false,
      reason: lit("stale"),
    };
  }
  let { env, reattachEnv } = n.data;
  return {
    ok: true,
    dispatch: {
      ...n.data,
      env: pickAllowedEnv(env, BG_CARRIED_ENV_ALLOWLIST),
      reattachEnv: reattachEnv && pickAllowedEnv(reattachEnv, BG_INTERNAL_ENV_KEYS),
    },
  };
}
//@ chunk-ss669z1x.js:17710-17791 placement = convertDirectoryToZipInPlace (1)
async function convertDirectoryToZipInPlace(dirPath) {
  await rm(join(daemonDispatchDir(), dirPath), {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-ss669z1x.js:17791-17927 placement
async function removeNonRegularDispatch(dirPath) {
  logFeatureBad("daemon_bg_dispatch_ingest", "not_a_file");
  logForDebugging(`[bg-dispatch] removed non-regular ${dirPath}`, {
    level: "warn",
  });
  await convertDirectoryToZipInPlace(dirPath);
}
//@ chunk-ss669z1x.js:17927-18112 placement
async function rejectStoredDispatch(r, e, o, n) {
  if (n !== undefined)
    await r.write(STORAGE_SPACES.daemon(["dispatch", "rejected", e]), n).catch(() => {
      return;
    });
  await r.delete(STORAGE_SPACES.daemon(["dispatch", e])).catch(() => {
    return;
  });
  reportDispatchRejected(e, o);
}
//@ chunk-ss669z1x.js:18112-18990 placement
/**
 * 处理一个派发请求条目（拒绝、移入存储、记录）。
 */
async function ingestDispatchEntry(r, dirPath, o) {
  let n = STORAGE_SPACES.daemon(["dispatch", dirPath]);
  let i = await checkJobFileWritable(join(daemonDispatchDir(), dirPath));
  if (i.kind === "refused") {
    if (i.symlink) {
      logFeatureBad("daemon_bg_dispatch_ingest", "symlink");
      await convertDirectoryToZipInPlace(dirPath);
      reportDispatchRejected(dirPath, lit("symlink"));
      return;
    }
    await removeNonRegularDispatch(dirPath);
    return;
  }
  if (i.kind === "error") {
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    reportDispatchRejected(dirPath, sanitizeErrnoForTelemetry(i.error) ?? lit("unknown"));
    return;
  }
  let h = await r
    .read([
      {
        key: n,
        offset: 0,
        length: MAX_DISPATCH_FILE_BYTES + 1,
      },
    ])
    .catch(() => {
      return;
    });
  if (h === undefined || !h.ok) {
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    if (h !== undefined && isUnrecoverableStorageRead(h.error))
      return rejectStoredDispatch(r, dirPath, lit("v5_read_failed"), undefined);
    reportDispatchRejected(dirPath, lit("v5_read_failed"));
    return;
  }
  let S = h.value.items[0];
  if (!S.found) return;
  if (S.totalBytes > MAX_DISPATCH_FILE_BYTES) {
    logFeatureBad("daemon_bg_dispatch_ingest", "oversized");
    return rejectStoredDispatch(r, dirPath, oversizedMessage(S.totalBytes), undefined);
  }
  let dispatchRecord = parseDispatchRecord(Buffer.from(S.value).toString("utf8"));
  if (!dispatchRecord.ok) return rejectStoredDispatch(r, dirPath, dispatchRecord.reason, S.value);
  o(dispatchRecord.dispatch);
  logFeatureOk("daemon_bg_dispatch_ingest");
  await r.delete(n).catch(() => {
    return;
  });
}
//@ chunk-ss669z1x.js:18990-19123 placement
async function ingestDispatchName(r, dirPath, o) {
  if (!isValidKeySegment(dirPath)) {
    logFeatureBad("daemon_bg_dispatch_ingest", "bad_name");
    reportDispatchRejected(dirPath, lit("bad_name"));
    await convertDirectoryToZipInPlace(dirPath);
    return;
  }
  await ingestDispatchEntry(r, dirPath, o);
}
//@ chunk-ss669z1x.js:19123-19834 placement
/**
 * 处理积压的派发请求（v5 存储或目录）。
 */
async function drainDispatchQueue(r, e) {
  if (isStorageV5Enabled() && e !== undefined) {
    let n;
    let i = [];
    let h = [];
    do {
      let S = await e.listEntries(DISPATCH_DIR, {
        cursor: n,
        skipKeyStats: true,
        skipScopeStats: true,
      });
      if (!S.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `dispatch drain v5 list failed: ${S.error.code}`,
          "dispatch drain v5 list failed",
        );
      for (let item of S.value.items) {
        let y = item.kind === "key" ? item.key : item.scope;
        if (y.namespace !== "daemon" || y.relPath?.length !== 2) continue;
        let D = y.relPath[1];
        if (D === undefined || !isValidKeySegment(D)) continue;
        if (item.kind === "key") i.push(D);
        else h.push(D);
      }
      n = S.value.cursor;
    } while (n !== undefined);
    for (let S of h) {
      if (isHiddenOrTempOrRejected(S)) continue;
      await removeNonRegularDispatch(S);
    }
    for (let S of i) {
      if (isHiddenOrTempOrRejected(S)) continue;
      await ingestDispatchEntry(e, S, r);
    }
    return;
  }
  let o;
  try {
    o = await readdir(daemonDispatchDir());
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  for (let n of o) {
    if (isHiddenOrTempOrRejected(n)) continue;
    await ingestDispatchFile(join(daemonDispatchDir(), n), r);
  }
}
//@ chunk-ss669z1x.js:19834-19896 placement
/**
 * 文件名是 .tmp 临时文件。疑似归错文件。
 */
function isTempFileName(r) {
  return r.endsWith(".tmp") || r.includes(".tmp.");
}
//@ chunk-ss669z1x.js:19896-19959 placement = extractQuotaStatusFromError (1)
/**
 * 以 . 开头、临时文件或名为 rejected。旧版名错配；疑似归错文件。
 */
function isHiddenOrTempOrRejected(error) {
  return error.startsWith(".") || isTempFileName(error) || error === "rejected";
}
//@ chunk-ss669z1x.js:19959-20031 placement
async function startBgWatcher(r, storageV5) {
  return withFeatureTelemetry("daemon_bg_watcher_start", () => watchDispatchDir(r, storageV5));
}
//@ chunk-ss669z1x.js:20031-20817 placement
/**
 * 监视派发目录，新文件到达时处理。
 */
async function watchDispatchDir(r, e) {
  await ensureDispatchDir(e);
  let platform = getPlatform();
  let usePolling = platform === "macos";
  let i = chokidar_default.watch(daemonDispatchDir(), {
    ignoreInitial: true,
    depth: 0,
    usePolling,
    interval: 100,
    ignored: (h) => isTempFileName(basename(h)) || basename(h) === "rejected",
    ...(platform === "windows" && {
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 20,
      },
    }),
  });
  i.on("add", (h) => {
    (isStorageV5Enabled() && e !== undefined
      ? ingestDispatchName(e, basename(h), r)
      : ingestDispatchFile(h, r)
    ).catch((error) =>
      logForDebugging(`[bg-dispatch] ${error}`, {
        level: "error",
      }),
    );
  });
  i.on("error", (h) => {
    logForDebugging(`[bg-dispatch] watcher error: ${h}`, {
      level: "error",
    });
    logEvent("tengu_bg_dispatch_watcher_failed", {
      errno: sanitizeErrnoForTelemetry(h) ?? lit("unknown"),
    });
  });
  await withTimeout(once(i, "ready"), 5000, "chokidar ready").catch((error) =>
    logForDebugging(`[bg-dispatch] watcher ready wait: ${error}`),
  );
  await drainDispatchQueue(r, e).catch((error) => {
    logForDebugging(`[bg-dispatch] cold-start drain: ${error}`, {
      level: "error",
    });
    logEvent("tengu_bg_dispatch_watcher_failed", {
      errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
    });
  });
  return {
    close: () => i.close(),
  };
}
//@ chunk-ss669z1x.js:20817-20919 placement
var WATCHER_MAX_MS = 3600000;
var WATCHER_TICK_MS = 60000;
var WATCHER_IDLE_MS = 28800000;
var WATCHER_ABSOLUTE_MS = 28800000;
var WATCHER_HEARTBEAT_MS = 60000;
var WATCHER_MIN_GAP_MS = 2000;
var WATCHER_MAX_GAP_MS = 300000;
var WATCHER_JITTER_MS = 2000;
var WATCHER_POLL_MS = 1000;
var WATCHER_STOP_FLAGS = new Set();
//@ chunk-ss669z1x.js:20919-20975 placement
function readStopFlags(storageV5) {
  return readPinnedJobIds(storageV5).catch((error) => {
    logError(error);
    return new Set();
  });
}
//@ chunk-ss669z1x.js:20975-34603 placement
/**
 * 后台会话管理器主循环：派发、PTY 启动、会话结算、保活。
 */
async function runBgManagerLoop(r, e = {}) {
  let o;
  let n;
  let handles = new Map();
  let h = async () => {
    let S = new Set();
    let spawnPty = e.spawnPty ?? createPtyHostSpawner();
    let y = e.onKeepAliveChange ?? (() => {});
    let D = (short, nonce, K) => o?.noteSettledDispatch(short, nonce, K);
    let E = false;
    let L = false;
    let deferred = Promise.withResolvers();
    let R = null;
    let w = false;
    let launcherNotRunnableEpisode = {
      logged: false,
    };
    let U = false;
    let re = false;
    let X = e.spawnPty === undefined;
    let Q = () => {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_spare_enable", true)) {
        if (R) {
          R.dispose();
          R = null;
        }
        return;
      }
      if (isLowMemory()) {
        if (R) {
          R.dispose();
          R = null;
        }
        return;
      }
      if (!re || R || U || w || E || !L || !spawnPty || !X || getPlatform() === "windows") return;
      U = true;
      let p = null;
      let T = false;
      spawnSpare({
        log: r,
        launcherNotRunnableEpisode,
        credentials: e.credentials,
        onExit: (K) => {
          if (K) w = true;
          if (p === null) {
            T = true;
            return;
          }
          if (R === p) {
            R = null;
            let oe = processWrapperArgv().length > 0 ? PROCESS_WRAPPER_ENV : WATCHER_JITTER_MS;
            if (Date.now() - p.startedAt >= oe) Q();
          }
        },
      })
        .then((spare) => {
          p = spare;
          if (!spare || E || T) {
            spare?.dispose();
            return;
          }
          R = spare;
          logEvent("tengu_bg_spare_spawn", {});
        })
        .catch((error) => {
          if (isSyscallError(error)) {
            logForDebugging(`bg-spare spawn failed: ${getErrnoCode(error)} ${error.message}`, {
              level: "warn",
            });
            return;
          }
          logError(error);
        })
        .finally(() => {
          U = false;
        });
    };
    let now = Date.now();
    let onDispatch = async (p, T = 0, K, oe = false) => {
      if (E) return "closed";
      re = true;
      let me = oe;
      if (T === 0 && !K) {
        try {
          await withTimeout(access(p.cwd), WATCHER_POLL_MS, `bg: cwd probe timed out for ${p.short}`);
        } catch (error) {
          me = isENOENT(error);
        }
        if (E) return "closed";
      }
      if (me && !handles.has(p.short) && T > 0) {
        try {
          await withTimeout(access(p.cwd), WATCHER_POLL_MS, `bg: cwd re-probe timed out for ${p.short}`);
          me = false;
        } catch (error) {
          me = isENOENT(error);
        }
        if (E) return "closed";
      }
      if (me && !handles.has(p.short)) {
        let s = cwdGoneReason(p.cwd);
        r(`bg refused ${p.short} (${p.source}): ${s}`);
        logEvent("tengu_bg_spawn_cwd_gone", {
          short: bgShort(p.short),
          attempt: 0,
          via: fromEnum("dispatch"),
        });
        logFeatureSad("daemon_bg_session_create", "cwd_gone");
        if (p.nonce) D(p.short, p.nonce, s);
        return "refused";
      }
      let he = false;
      if (isProviderManagedByHost(p) && !handles.has(p.short))
        try {
          await ensureJobsDir(e.storageV5);
          let s = encodeHostLineage(p.env);
          if (e.storageV5) await writeHostTombstone(e.storageV5, p.short, s);
          else await writeFile(hostManagedEntry(p.short), s);
          he = true;
        } catch (error) {
          logError(error);
          logFeatureBad("daemon_bg_session_create", "host_tombstone_write");
          return "dropped";
        }
      let pe = handles.get(p.short);
      if (pe) {
        if ((pe.isKilling || pe.isRetiring || pe.record.outcome) && T < 30) {
          if (T === 15 && (pe.isKilling || pe.isRetiring)) {
            logEvent("tengu_bg_dispatch_sigkill_escalate", {});
            pe.kill("SIGKILL");
          }
          await sleep(100);
          return onDispatch(p, T + 1, K, me);
        }
        let s = pe.isKilling || pe.isRetiring || pe.record.outcome;
        if (he && !isProviderManagedByHost(pe.dispatch))
          if (e.storageV5) await deleteHostTombstone(e.storageV5, p.short);
          else await unlink(hostManagedEntry(p.short)).catch(() => {});
        r(
          s
            ? `bg: dispatch ${p.short} dropped \u2014 retry budget exhausted (handle still settling)`
            : `bg: dup dispatch ${p.short} dropped (existing handle still live)`,
        );
        if (s) {
          logFeatureBad("daemon_bg_session_create", "dup_retry_exhausted");
          return "dropped";
        }
        logFeatureOk("daemon_bg_session_create");
        return "dup-live";
      }
      if (!isProviderManagedByHost(p))
        if (e.storageV5) deleteHostTombstone(e.storageV5, p.short);
        else unlink(hostManagedEntry(p.short)).catch(() => {});
      let { lowMem, level } = getLowMemoryState();
      if (lowMem && handles.size > 0) {
        let s = Date.now() - now;
        if (s > WATCHER_HEARTBEAT_MS * 2)
          r(
            `bg: low memory but sweep anchor is ${Math.round(s / 1000)}s stale (host slept?) \u2014 deferring eager retire to the next sweep tick`,
          );
        else {
          let rounded = Math.round(freemem() / 1024 / 1024);
          r(
            `bg: low memory (${level !== undefined ? `macOS memorystatus pressure level ${level}` : `${rounded}MB free`}) \u2014 retiring settled workers before spawning ${p.short}`,
          );
          logEvent("tengu_bg_dispatch_low_mem", {
            free_mb: rounded,
            handles: handles.size,
            pressure_level: level,
          });
          readStopFlags(e.storageV5).then((stopFlags) => {
            for (let de of handles.values())
              de.retireIfSettled(WATCHER_TICK_MS, stopFlags)
                .then((Se) => retireIdleWorker(r, de, Se, "low memory"))
                .catch((error) => logError(error));
          });
        }
      }
      if (p.source === "spare" && lowMem) {
        r(`bg: low memory \u2014 skipping spare dispatch ${p.short}`);
        return "dropped";
      }
      if (
        R &&
        !K &&
        p.launch.mode !== "exec" &&
        R.cliVersion ===
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_spare_enable", true)
      ) {
        let s = R;
        R = null;
        try {
          let M = claimSpare(p, s, spawnPty, e.getAuthSnapshot, e.storageV5, e.credentials);
          handles.set(p.short, M);
          onBgSessionSettled(handles, M, y, S, r, {
            storageV5: e.storageV5,
            credentials: e.credentials,
            noteSettled: D,
          });
          trackPending(
            S,
            updateRoster((G) => {
              G.workers[p.short] = M.rosterEntry();
            }, e.storageV5).catch((error) => logError(error)),
          );
          y();
          logEvent("tengu_bg_spare_claim", {
            age_ms: Date.now() - s.startedAt,
          });
          r(`bg claimed-spare ${p.short} (${p.source})`);
          logFeatureOk("daemon_bg_session_create");
          Q();
          return "claimed";
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          let de =
            errnoCode === "ENOENT"
              ? "enoent"
              : errnoCode === "ECONNREFUSED"
                ? "econnrefused"
                : error instanceof Error
                  ? "error"
                  : "unknown";
          logEvent("tengu_bg_spare_claim_fail", {
            reason: fromEnum(de),
          });
          s.dispose();
        }
      }
      let child = DaemonSupervisor.spawn(
        p,
        spawnPty,
        e.getAuthSnapshot,
        K
          ? {
              afterUpgrade: K,
            }
          : undefined,
        e.storageV5,
        e.credentials,
      );
      handles.set(p.short, child);
      onBgSessionSettled(handles, child, y, S, r, {
        storageV5: e.storageV5,
        credentials: e.credentials,
        noteSettled: D,
      });
      y();
      Q();
      r(`bg spawned ${p.short} (${p.source})`);
      logFeatureOk("daemon_bg_session_create");
      return "spawned";
    };
    let _e = (p = "SIGTERM") => {
      let T = 0;
      for (let K of handles.values())
        if (!K.record.outcome) {
          K.kill(p);
          T++;
        }
      return T;
    };
    await ensureDaemonRuntimeDir();
    await ensureDaemonDir();
    let q = await handleDaemonLease(
      handles,
      onDispatch,
      e.onNudge ??
        (async () => ({
          restarting: false,
          upgradePending: false,
        })),
      (p) => {
        let T = p ? _e("SIGTERM") : 0;
        e.onShutdown?.();
        return T;
      },
      () => L,
      e.onYield ?? (() => false),
      deferred.promise,
      e.storageV5,
    );
    o = q;
    r(`bg: control socket bound at ${redactDaemonPipeKey(daemonControlSocket())}`);
    q.onLeaseChange.subscribe(y);
    q.onLeaseChange.subscribe(({ op, client }) => {
      if (client?.label === CLOUD_SESSION_LEASE_LABEL) {
        r(
          `bg lease ${op}: ${client.label} ${client.cloudSessionId ?? "(no session id)"} pid=${client.pid} (leases=${q.leaseCount()})`,
        );
        return;
      }
      if (q.leaseCount() > 0 && !re) {
        re = true;
        Q();
      }
    });
    await Promise.all(
      getPlatform() === "windows"
        ? [ensureDaemonStateDir(e.storageV5)]
        : [
            mkdir(daemonRvDir(), {
              recursive: true,
              mode: 448,
            }).catch(() => {}),
            mkdir(daemonPtyDir(), {
              recursive: true,
              mode: 448,
            }).catch(() => {}),
          ],
    );
    cleanupStaleDaemonDirs();
    let roster = await readRoster(undefined, e.storageV5);
    let B = 0;
    let V = 0;
    let x = 0;
    let ee = 0;
    let ae = 0;
    let W = 0;
    let ge = roster.updatedAt > 0 && Date.now() - roster.updatedAt > ABANDONED_WORKER_MS;
    await Promise.all(
      Object.entries(roster.workers).map(async ([key, value]) => {
        let K;
        try {
          K = await DaemonSupervisor.adopt(
            key,
            value,
            spawnPty,
            e.getAuthSnapshot,
            e.storageV5,
            e.credentials,
          );
        } catch (error) {
          logError(redactErrorPaths(error));
          V++;
          return;
        }
        if (!K && value.procStart === undefined && value.ptySock && (await pingPtySocket(value.ptySock))) {
          value.procStart = await withDeadline(getProcessStartTimeAsync(value.pid), MIN_POLL_MS);
          try {
            K = await DaemonSupervisor.adopt(
              key,
              value,
              spawnPty,
              e.getAuthSnapshot,
              e.storageV5,
              e.credentials,
            );
          } catch (error) {
            logError(redactErrorPaths(error));
            K = null;
          }
          K ??= DaemonSupervisor.unverified(key, value, e.storageV5, e.credentials);
        }
        if (K) {
          handles.set(key, K);
          onBgSessionSettled(handles, K, y, S, r, {
            storageV5: e.storageV5,
            credentials: e.credentials,
            noteSettled: D,
          });
          B++;
        } else if (
          value.pendingRespawn === "upgrade" &&
          !rcChannelDiffers(
            value.cliVersion,
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
          ) &&
          !ge
        ) {
          W++;
          logEvent("tengu_bg_adopt_upgrade_respawn", {});
          onDispatch(value.dispatch, 0, true).catch((error) => logError(error));
        } else {
          V++;
          let oe = false;
          if (value.pendingRespawn === "upgrade" && ge) {
            ee++;
            oe = true;
          }
          let execExitStatus = await readExecExitStatus(value.ptySock, value.dispatch);
          let he = execExitStatus ?? {
            state: "failed",
            detail: "process gone while supervisor was down",
          };
          if (
            (await writeReapedTerminalState(
              key,
              he.state,
              he.detail,
              {
                resumable: execExitStatus ? undefined : "auto-resume",
              },
              e.storageV5,
            )) === "dead-epoch"
          ) {
            x++;
            oe = true;
          }
          if (oe) ae++;
          if (e.credentials) e.credentials.discardSpentCredentialFile(daemonTokensFile(key)).catch(() => {});
          else unlink(daemonTokensFile(key)).catch(() => {});
          if (getPlatform() === "windows") {
            if (e.storageV5) deletePtyPidRecords(e.storageV5, key, value.ptySock);
            else {
              unlink(daemonPtyPidFile(key)).catch(() => {});
              unlink(ptyErrFile(daemonPtySocket(key))).catch(() => {});
              unlink(ptyLateFile(daemonPtySocket(key))).catch(() => {});
              unlink(getExecExitPath(value.ptySock ?? daemonPtySocket(key))).catch(() => {});
            }
          } else {
            if (e.credentials) e.credentials.discardSpentCredentialFile(daemonAuthFile(key)).catch(() => {});
            else unlink(daemonAuthFile(key)).catch(() => {});
            unlink(value.rendezvousSock).catch(() => {});
            if (value.ptySock) {
              unlink(value.ptySock).catch(() => {});
              unlink(ptyErrFile(value.ptySock)).catch(() => {});
              unlink(ptyLateFile(value.ptySock)).catch(() => {});
              unlink(getExecExitPath(value.ptySock)).catch(() => {});
              await reapDetachedRepl(value.replPid, value.replProcStart);
              try {
                process.kill(value.pid, 0);
              } catch {
                sigtermThenKill([-value.pid]);
              }
            }
          }
        }
      }),
    );
    if (B + V + W > 0) {
      r(
        `bg adopt: adopted=${B} respawned=${W} dead=${V}` +
          (x > 0 ? ` dead_epoch=${x}` : "") +
          (ee > 0
            ? ` upgrade_skipped=${ee} (previous roster written ${Math.round((Date.now() - roster.updatedAt) / 86400000)}d ago)`
            : ""),
      );
      logEvent("tengu_bg_adopt", {
        adopted: B,
        respawned: W,
        dead: V,
        dead_epoch: x,
        upgrade_skipped: ee,
      });
      if (V - ae === 0) logFeatureOk("daemon_bg_adopt");
      else if (B > 0 || W > 0) logFeatureSad("daemon_bg_adopt", "partial");
      else logFeatureBad("daemon_bg_adopt", "all_workers_dead");
    }
    let ce = await readDaemonLock(e.storageV5).catch(() => null);
    let se = ce?.pid === process.pid;
    let ve = !(ce !== null && ce.pid !== process.pid) && !(e.isShuttingDown?.() ?? false);
    if (!se)
      r(
        `bg: skipped post-adopt sweeps + roster rewrite \u2014 daemon.lock is ${ce ? `held by pid ${ce.pid}` : "absent"} (yield/handover in flight)`,
      );
    if (se && !roster.parseFailed)
      reapStaleSockets(handles, r, {
        storageV5: e.storageV5,
      });
    if (se && !roster.parseFailed) await reapOrphanSpares(handles, r);
    if (se && !roster.inspectFailed)
      await updateRoster((p) => {
        p.workers = {};
        for (let [T, K] of handles) p.workers[T] = K.rosterEntry();
      }, e.storageV5).catch((error) => logError(error));
    let Ee = ve
      ? await startBgWatcher((p) => void onDispatch(p).catch((error) => logError(error)), e.storageV5)
      : null;
    n = Ee ?? undefined;
    L = ve;
    if (ve) deferred.resolve();
    y();
    if (ve && handles.size > 0) re = true;
    Q();
    if (ve) Oe().catch((error) => logError(error));
    now = Date.now();
    let Re = false;
    let interval = setInterval(
      async (p, T) => {
        if (Re) return;
        Re = true;
        try {
          await ze(p, T);
        } finally {
          Re = false;
        }
      },
      WATCHER_HEARTBEAT_MS,
      handles,
      Q,
    );
    async function ze(p, T) {
      {
        let now_2 = Date.now();
        let oe = now_2 - now - WATCHER_HEARTBEAT_MS;
        now = now_2;
        if (oe > WATCHER_HEARTBEAT_MS) {
          for (let s of p.values()) s.shiftGraceClocksForward(oe);
          T();
          return;
        }
        let me = isLowMemory();
        let he = me ? WATCHER_TICK_MS : WATCHER_MAX_MS;
        let pe = me ? WATCHER_TICK_MS : WATCHER_ABSOLUTE_MS;
        let stopFlags = await readStopFlags(e.storageV5);
        for (let s of p.values())
          if (stopFlags.has(s.dispatch.short))
            s.respawnIfIdleStale(stopFlags).catch((error) => logError(error));
        let results = await Promise.all(
          [...p.values()].map((s) =>
            s
              .retireIfSettled(he, stopFlags, pe)
              .then((M) => retireIdleWorker(r, s, M, me ? "low memory" : ""))
              .catch((error) => {
                logError(error);
                return false;
              }),
          ),
        );
        let $e = count(results, (s) => s);
        if (me && $e === 0 && isLowMemory()) {
          let results = await Promise.all(
            [...p.values()].map((M) =>
              M.retireIfSettled(WATCHER_IDLE_MS, stopFlags, WATCHER_IDLE_MS, {
                shedMonitoringOnly: true,
              })
                .then((G) => retireIdleWorker(r, M, G, "low memory, monitoring only"))
                .catch((error) => {
                  logError(error);
                  return false;
                }),
            ),
          );
          $e += count(results, (M) => M);
        }
        if (me && $e === 0 && isLowMemory()) {
          let filtered = [...p.values()].filter((M) => stopFlags.has(M.dispatch.short));
          if (filtered.length > 0) {
            r(
              "bg: low memory persists after shedding non-pinned \u2014 retiring pinned settled workers as a last resort",
            );
            logEvent("tengu_bg_retire_pinned_low_mem", {});
            for (let M of filtered)
              M.retireIfSettled(he, WATCHER_STOP_FLAGS, pe)
                .then((G) => retireIdleWorker(r, M, G, "low memory, pinned"))
                .catch((error) => logError(error));
          }
        }
        if (!me && isAttachUpgradeEnabled()) {
          let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
            "tengu_bg_prewarm_per_sweep",
            3,
          );
          let M = 12;
          for (let G of p.values()) {
            if (featureValue_CACHED_MAY_BE_STALE <= 0 || M <= 0) break;
            if (stopFlags.has(G.dispatch.short)) continue;
            if (G.isUnverified) continue;
            if (G.isBooting) {
              featureValue_CACHED_MAY_BE_STALE--;
              continue;
            }
            if (!G.isVersionStale) continue;
            if (G.dispatch.launch.mode === "exec") continue;
            if (
              rcChannelDiffers(
                G.record.cliVersion,
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION,
              )
            )
              continue;
            if (
              G.record.cliVersion &&
              isNewerBuild(
                G.record.cliVersion,
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION,
              )
            ) {
              G.noteDowngradeRefused("prewarm");
              continue;
            }
            if (
              (
                await G.respawnIfIdleStale(undefined, "prewarm").catch((error) => {
                  logError(error);
                  return {
                    respawned: false,
                  };
                })
              ).respawned
            )
              featureValue_CACHED_MAY_BE_STALE--;
            else M--;
          }
        }
        T();
      }
    }
    interval.unref();
    async function Oe() {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_bg_prewarm_burst_delay_ms",
        15000,
      );
      await sleep(featureValue_CACHED_MAY_BE_STALE, undefined, {
        unref: true,
      });
      if (E) return;
      let featureValue_CACHED_MAY_BE_STALE_2 = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_bg_prewarm_burst_concurrency",
        3,
      );
      if (featureValue_CACHED_MAY_BE_STALE_2 <= 0 || !isAttachUpgradeEnabled()) return;
      let stopFlags = await readStopFlags(e.storageV5);
      let oe = new Set(
        [...handles.values()].filter(
          (G) =>
            !G.record.outcome &&
            !G.isUnverified &&
            G.isVersionStale &&
            G.dispatch.launch.mode !== "exec" &&
            !stopFlags.has(G.dispatch.short),
        ),
      );
      if (oe.size === 0) return;
      let size = oe.size;
      let now_2 = Date.now();
      let pe = 0;
      let ke = 0;
      let De = 0;
      let $e = false;
      let s = false;
      let M = now_2 + WATCHER_MAX_GAP_MS;
      while (oe.size > 0 && Date.now() < M && !E) {
        if (Date.now() - now > WATCHER_HEARTBEAT_MS * 2) {
          s = true;
          break;
        }
        if (isLowMemory()) {
          $e = true;
          break;
        }
        let G =
          featureValue_CACHED_MAY_BE_STALE_2 -
          count([...handles.values()], (de) => de.isBooting && !de.isUnverified);
        for (let de of oe) {
          if (G <= 0) break;
          oe.delete(de);
          if (de.isBooting) {
            De++;
            continue;
          }
          if (
            (
              await de.respawnIfIdleStale(undefined, "burst").catch((error) => {
                logError(error);
                return {
                  respawned: false,
                };
              })
            ).respawned
          ) {
            pe++;
            G--;
          } else ke++;
        }
        if (oe.size === 0) break;
        await sleep(WATCHER_MIN_GAP_MS, undefined, {
          unref: true,
        });
      }
      r(
        `bg: post-takeover prewarm burst \u2014 respawned ${pe}/${size} stale workers` +
          (ke > 0 ? `, ${ke} refused` : "") +
          ($e ? `, stopped on low memory (${oe.size} left)` : "") +
          (s ? `, deferred to sweep on stale anchor \u2014 host slept? (${oe.size} left)` : "") +
          ` in ${Math.round((Date.now() - now_2) / 1000)}s`,
      );
      logEvent("tengu_bg_prewarm_burst", {
        candidates: size,
        respawned: pe,
        refused: ke,
        alreadyBooting: De,
        remaining: oe.size,
        lowMemStop: $e,
        sweepStaleStop: s,
        durationMs: Date.now() - now_2,
      });
    }
    return {
      handles,
      dispatch: (p) => void onDispatch(p).catch((error) => logError(error)),
      leaseCount: q.leaseCount,
      announceExit: q.announceExit,
      liveHandleCount: () => {
        let p = 0;
        for (let T of handles.values()) if (!T.record.outcome) p++;
        return p;
      },
      snapshotConsumerCount: () => {
        let p = 0;
        for (let T of handles.values()) if (!T.record.outcome && shouldCarryAuth(T.dispatch)) p++;
        return p;
      },
      pendingSettleWrites: () => S.size,
      killAll: _e,
      close: async (p) => {
        let displaced = p?.displaced ?? false;
        E = true;
        clearInterval(interval);
        if (R) {
          R.dispose();
          R = null;
        }
        await Promise.all([
          Ee?.close().catch(() => {}),
          q
            .close({
              skipUnlink: displaced || p?.skipPathCleanup,
            })
            .catch(() => {}),
        ]);
        for (let K of handles.values()) K.stop();
        await Promise.allSettled([...S]);
        if (
          !displaced &&
          handles.size === 0 &&
          !roster.parseFailed &&
          !p?.skipPathCleanup &&
          getPlatform() !== "windows"
        )
          await rm(getDaemonRuntimeDir(), {
            recursive: true,
            force: true,
          }).catch(() => {});
      },
    };
  };
  try {
    return await withFeatureTelemetry(
      "daemon_bg_manager_start",
      h,
      (S) => sanitizeErrnoForTelemetry(S)?.toLowerCase() ?? "error",
    );
  } catch (error) {
    for (let y of handles.values()) y.stop();
    await n?.close().catch(() => {});
    let u = await readDaemonLock(e.storageV5).catch(() => null);
    await o
      ?.close(
        u?.pid === process.pid
          ? undefined
          : {
              skipUnlink: true,
            },
      )
      .catch(() => {});
    throw error;
  }
}
//@ chunk-ss669z1x.js:34603-38486 placement
/**
 * 后台会话结束时记录结果、通知并清理。
 */
function onBgSessionSettled(r, e, o, n, i, h) {
  e.onSettle.subscribe((S) => {
    let jobDir = getJobDir(e.record.short);
    let y = S === "done" ? "done" : S === "killed" ? "stopped" : "failed";
    let detail = e.record.detail;
    let sessionIdTaken = e.sessionIdTaken;
    let L =
      S === "crashed" && detail
        ? redactDaemonPipeKey(detail.replace(/; respawning$/, "")).replace(/\s*\n\s*/g, " \xB7 ")
        : "";
    i(`bg settled ${e.record.short} (${S})${L ? `: ${L}` : ""}`);
    if (e.shouldDeleteJobDir)
      trackPending(
        n,
        h.storageV5 && jobDir === getJobDir(e.record.short)
          ? deleteJobScope(h.storageV5, e.record.short, jobDir, (R) =>
              logError(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `jobdir retire deleteScope: ${R}`,
                  "jobdir retire deleteScope failed",
                ),
              ),
            ).catch((error) => logError(error))
          : rm(jobDir, {
              recursive: true,
              force: true,
            }).catch((error) => logError(error)),
      );
    else if (S === "killed" && e.isHandoffKill)
      logEvent("tengu_bg_handoff_settle", {
        jobSessionId: sanitizeMarkName(e.record.sessionId),
      });
    else
      trackPending(
        n,
        readJobState(jobDir, h.storageV5)
          .then((jobState) => {
            if (
              jobState
                ? (isSettled(jobState) && !(S === "crashed" && jobState.state === "failed")) ||
                  (S === "done" && jobState.state === "blocked" && e.dispatch.launch.mode !== "exec")
                : S !== "crashed" || e.dispatch.source === "spare"
            ) {
              if (!jobState && e.dispatch.source === "spare") {
                if (h.storageV5 && jobDir === getJobDir(e.record.short))
                  return h.storageV5.statMeta(STORAGE_SPACES.job(e.record.short, ["state.json"])).then(
                    (U) =>
                      !U.ok && U.error.code === "NotFound"
                        ? deleteJobScope(h.storageV5, e.record.short, jobDir, (re) =>
                            logError(
                              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                                `spare-sweep deleteScope: ${re}`,
                                "spare-sweep deleteScope failed",
                              ),
                            ),
                          ).catch((error) => logError(error))
                        : undefined,
                    () => {
                      return;
                    },
                  );
                return access(join(jobDir, "state.json")).then(
                  () => {
                    return;
                  },
                  (error) =>
                    getErrnoCode(error) === "ENOENT"
                      ? rm(jobDir, {
                          recursive: true,
                          force: true,
                        }).catch((error) => logError(error))
                      : undefined,
                );
              }
              return;
            }
            let iso = new Date().toISOString();
            let A = jobState ?? {
              state: "working",
              detail: "",
              tempo: "active",
              output: null,
              children: null,
              linkScanOffset: 0,
              template:
                e.dispatch.launch.mode === "exec" ? "exec" : (e.dispatch.agent ?? e.dispatch.routine ?? "bg"),
              routine: e.dispatch.routine,
              respawnFlags:
                e.dispatch.source === "shell"
                  ? moveSkipPermissionsLast(splitForwardableArgs([...e.dispatch.respawnFlags]))
                  : splitForwardableArgs([...e.dispatch.respawnFlags]),
              intent: e.record.intent,
              name: e.record.name,
              sessionId: e.record.sessionId,
              cwd: e.record.cwd,
              worktreePath: e.dispatch.worktree?.path ?? e.record.worktreePath,
              createdAt: new Date(e.dispatch.createdAt).toISOString(),
              updatedAt: iso,
              firstTerminalAt: null,
              backend: "daemon",
            };
            return writeStateAtomic(
              jobDir,
              {
                ...A,
                state: y,
                detail: y === "stopped" ? "stopped" : (detail || A.detail).replace(/; respawning$/, ""),
                tempo: "idle",
                inFlight: undefined,
                needs: undefined,
                block: undefined,
                ...(sessionIdTaken && {
                  sessionIdTaken: true,
                }),
                updatedAt: iso,
                firstTerminalAt: A.firstTerminalAt ?? iso,
              },
              h.storageV5,
            );
          })
          .catch((error) => logError(error)),
      );
    trackPending(
      n,
      updateRoster((R) => {
        delete R.workers[e.record.short];
      }, h.storageV5).catch((error) => logError(error)),
    );
    if (h.credentials)
      trackPending(
        n,
        h.credentials.discardSpentCredentialFile(daemonTokensFile(e.record.short)).catch(() => {}),
      );
    else
      trackPending(
        n,
        unlink(daemonTokensFile(e.record.short)).catch(() => {}),
      );
    let P = e.rosterEntry();
    if (getPlatform() === "windows") {
      if (h.storageV5) trackPending(n, deletePtyPidRecords(h.storageV5, e.record.short, P.ptySock));
      else {
        trackPending(
          n,
          unlink(daemonPtyPidFile(e.record.short)).catch(() => {}),
        );
        trackPending(
          n,
          unlink(ptyErrFile(daemonPtySocket(e.record.short))).catch(() => {}),
        );
        trackPending(
          n,
          unlink(ptyLateFile(daemonPtySocket(e.record.short))).catch(() => {}),
        );
        trackPending(
          n,
          unlink(getExecExitPath(P.ptySock ?? daemonPtySocket(e.record.short))).catch(() => {}),
        );
      }
    } else {
      if (h.credentials)
        trackPending(
          n,
          h.credentials.discardSpentCredentialFile(daemonAuthFile(e.record.short)).catch(() => {}),
        );
      else
        trackPending(
          n,
          unlink(daemonAuthFile(e.record.short)).catch(() => {}),
        );
      trackPending(
        n,
        unlink(P.rendezvousSock).catch(() => {}),
      );
      if (P.ptySock) {
        trackPending(
          n,
          unlink(P.ptySock).catch(() => {}),
        );
        trackPending(
          n,
          unlink(ptyErrFile(P.ptySock)).catch(() => {}),
        );
        trackPending(
          n,
          unlink(ptyLateFile(P.ptySock)).catch(() => {}),
        );
        trackPending(
          n,
          unlink(getExecExitPath(P.ptySock)).catch(() => {}),
        );
      }
    }
    if (e.dispatch.launch.mode === "exec" && S !== "killed") {
      o();
      setTimeout(
        (w, A, U) => {
          if (w.get(A) === U) w.delete(A);
        },
        300000,
        r,
        e.record.short,
        e,
      ).unref();
      return;
    }
    if (e.record.nonce) h.noteSettled(e.record.short, e.record.nonce);
    r.delete(e.record.short);
    o();
  });
  e.onState.subscribe((S) => {
    if (S.pid)
      trackPending(
        n,
        updateRoster((u) => {
          u.workers[e.record.short] = e.rosterEntry();
        }, h.storageV5).catch((error) => logError(error)),
      );
    if (S.state === "crashed" || S.state === "resuming") {
      let state = S.state;
      let detail = e.record.detail;
      let tempo = state === "crashed" ? "idle" : "active";
      let jobDir = getJobDir(e.record.short);
      let L = readJobState(jobDir, h.storageV5)
        .then((jobState) => {
          if (
            e.record.outcome ||
            !jobState ||
            isSettled(jobState) ||
            jobState.state === "blocked" ||
            jobState.tempo === "blocked"
          )
            return;
          if (state === "resuming" && jobState.state !== "crashed") return;
          return writeStateAtomic(
            jobDir,
            {
              ...jobState,
              state,
              detail,
              tempo,
              inFlight: undefined,
              updatedAt: new Date().toISOString(),
            },
            h.storageV5,
          );
        })
        .catch((error) => logError(error));
      trackPending(n, L);
    }
  });
}
//@ chunk-ss669z1x.js:38486-39851 placement
/**
 * 清理失效的会话 socket/pid 文件。
 */
async function reapStaleSockets(r, e, o = {}) {
  let n = getPlatform() === "windows";
  let [i, h] = n ? [daemonPtyPidsDir(), ".pid"] : [daemonPtyDir(), ".sock"];
  let S = n && o.storageV5 ? await listStoredPtyPids(o.storageV5) : await readdir(i).catch(() => []);
  let u = new Set(S.filter((D) => D.endsWith(h)));
  let y = 0;
  for (let D of S) {
    if (!D.endsWith(h)) {
      let found = (n ? [".err", ".late", ".err.read"] : [".err", ".late", ".exec-exit", ".err.read"]).find(
        (w) => D.endsWith(n ? w : `.sock${w}`),
      );
      if (found) {
        let sliced = D.slice(0, -found.length);
        let A = n ? sliced.lastIndexOf("-pty-") : -1;
        let U = n ? (A >= 0 ? `${sliced.slice(A + 5)}.pid` : "") : sliced;
        if (U && !u.has(U))
          if (n && o.storageV5) o.storageV5.delete(STORAGE_SPACES.daemon(["pty-pids", D])).catch(() => {});
          else unlink(join(i, D)).catch(() => {});
      }
      continue;
    }
    let sliced = D.slice(0, -h.length);
    if (r.has(sliced)) continue;
    y++;
    let L = daemonPtyPidFile(sliced);
    killViaPtySocket(daemonPtySocket(sliced), o.storageV5).then((P) => {
      let R = ptyErrFile(daemonPtySocket(sliced));
      let w = ptyLateFile(daemonPtySocket(sliced));
      let execExitPath = getExecExitPath(daemonPtySocket(sliced));
      if (!n) {
        writeReapedTerminalState(
          sliced,
          "failed",
          "reaped (roster gap)",
          {
            resumable: "wake-only",
          },
          o.storageV5,
        );
        unlink(w).catch(() => {});
        unlink(execExitPath).catch(() => {});
        return;
      }
      let U = () => {
        if (o.storageV5) deletePtyPidRecords(o.storageV5, sliced, undefined);
        else {
          unlink(L).catch(() => {});
          unlink(R).catch(() => {});
          unlink(w).catch(() => {});
          unlink(execExitPath).catch(() => {});
        }
      };
      if (P) {
        writeReapedTerminalState(
          sliced,
          "failed",
          "reaped (roster gap)",
          {
            resumable: "wake-only",
          },
          o.storageV5,
        );
        U();
        return;
      }
      (o.storageV5 ? readStoredPtyPid(o.storageV5, sliced) : readSmallFileOrNull(L, MAX_PID_FILE_BYTES))
        .then((re) => {
          if (re === null) return;
          if (!isProcessRunning(Number(re))) {
            writeReapedTerminalState(
              sliced,
              "failed",
              "reaped (roster gap)",
              {
                resumable: "wake-only",
              },
              o.storageV5,
            );
            U();
          }
        })
        .catch(() => {});
    });
  }
  if (y) {
    e(`bg orphan-reap: ${y} roster-less pty host(s)`);
    logEvent("tengu_bg_orphan_reap", {
      reaped: y,
    });
  }
}
//@ chunk-ss669z1x.js:39851-39900 placement
var PTY_PIDS_DIR = {
  namespace: "daemon",
  relPath: ["pty-pids"],
};
//@ chunk-ss669z1x.js:39900-40001 placement
async function ensureJobsDir(storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    await ensureTombstoneScope(storageV5);
    return;
  }
  await mkdir(hostManagedDir(), {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-ss669z1x.js:40001-40138 placement
async function ensureDaemonStateDir(storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    await storageV5.ensureScope(PTY_PIDS_DIR).catch(() => {
      return;
    });
    return;
  }
  await mkdir(daemonPtyPidsDir(), {
    recursive: true,
  }).catch(() => {});
}
//@ chunk-ss669z1x.js:40138-40290 placement
async function deletePtyPidRecords(storageV5, e, ptySock) {
  for (let n of [
    basename(daemonPtyPidFile(e)),
    basename(ptyErrFile(daemonPtySocket(e))),
    basename(ptyLateFile(daemonPtySocket(e))),
    basename(getExecExitPath(ptySock ?? daemonPtySocket(e))),
  ])
    await storageV5.delete(STORAGE_SPACES.daemon(["pty-pids", n])).catch(() => {});
}
//@ chunk-ss669z1x.js:40290-40429 placement = convertDirectoryToZipInPlace (1)
async function removeIfNotDirectory(dirPath) {
  let zipData = await lstat(dirPath).catch(() => null);
  if (zipData === null || zipData.isDirectory()) return false;
  await rm(dirPath, {
    recursive: true,
    force: true,
  });
  return true;
}
//@ chunk-ss669z1x.js:40429-40556 placement
/**
 * 删除后台任务的存储作用域（名字配错）。
 */
async function deleteJobScope(storageV5, jobId, dirPath, n) {
  if (await removeIfNotDirectory(dirPath)) return;
  let i = await storageV5.deleteScope({
    namespace: "job",
    jobId,
  });
  if (!i.ok) n(i.error.code);
}
//@ chunk-ss669z1x.js:40556-40590 placement
var PTY_PID_KEY_RE = /^[0-9A-Za-z.+_-]{1,100}$/;
//@ chunk-ss669z1x.js:40590-41418 placement
/**
 * 空闲超时或版本过旧时退役 worker。
 */
function retireIdleWorker(r, e, o, n) {
  if (!o.retired) return false;
  let rounded = Math.round(o.idleMs / 60000);
  let h = rounded >= 120 ? `${Math.round(rounded / 60)}h` : `${rounded}m`;
  let cliVersion =
    e.record.cliVersion && PTY_PID_KEY_RE.test(e.record.cliVersion) ? e.record.cliVersion : "unrecognized";
  let u = e.isVersionStale
    ? `, worker ${cliVersion} (daemon ${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      })`
    : "";
  r(`bg retire ${e.record.short}: ${o.cause}, idle ${h}${u}${n ? ` [${n}]` : ""}`);
  return true;
}
//@ chunk-ss669z1x.js:41418-41471 placement
function trackPending(r, e) {
  r.add(e);
  e.finally(() => r.delete(e));
}
//@ chunk-ss669z1x.js:41592-41659 placement
var DISPATCH_POLL_MS = 60000;
var DISPATCH_BACKOFF_MIN_MS = 5000;
var DISPATCH_BACKOFF_MAX_MS = 300000;
var DISPATCH_BACKOFF_STEP_MS = 30000;
var DISPATCH_LOCK_MS = 60000;
var DISPATCH_LOCK_RETRY_MS = 2000;
var DISPATCH_STALE_MS = 300000;
//@ chunk-ss669z1x.js:41659-41715 placement
function jitterDelay(r) {
  return Math.round(r * (0.5 + Math.random()));
}
//@ chunk-ss669z1x.js:41715-41764 placement
function backoffDelay(consecutiveCrashes) {
  return jitterDelay(Math.min(1000 * 2 ** consecutiveCrashes, DISPATCH_BACKOFF_MAX_MS));
}
//@ chunk-ss669z1x.js:41764-41783 placement
var weakMap = new WeakMap();
//@ chunk-ss669z1x.js:41783-47596 placement
/**
 * daemon 子 worker 进程管理（启动、崩溃退避、停止、忙碌状态）。
 */
class DaemonWorkerProcess {
  id;
  kind;
  config;
  invocation;
  logger;
  authManager;
  onStateChange;
  child = null;
  spawnedAt = 0;
  stopping = false;
  consecutiveCrashes = 0;
  temporaryEndsInARow = 0;
  backoffTimer = null;
  wrapperParkLogged = false;
  exitPromise = null;
  lastBusy = false;
  lastBusyAt = 0;
  constructor(id, kind, config, invocation, logger, authManager, onStateChange) {
    this.id = id;
    this.kind = kind;
    this.config = config;
    this.invocation = invocation;
    this.logger = logger;
    this.authManager = authManager;
    this.onStateChange = onStateChange;
  }
  get status() {
    let pid = this.child?.pid;
    if (pid === undefined) return null;
    let e = {
      pid,
      startedAt: this.spawnedAt,
    };
    let o = dirFieldOf(this.config);
    let n = weakMap.get(this) ?? 0;
    if (n > 0 && o !== undefined)
      e.servedFolder = {
        dir: o,
        sessions: n,
      };
    return e;
  }
  isBusy() {
    return this.lastBusy && this.child !== null && Date.now() - this.lastBusyAt < DISPATCH_STALE_MS;
  }
  start(r = 0) {
    this.stopping = false;
    if (r > 0) this.scheduleRespawn(r);
    else this.spawn();
  }
  updateConfig(config) {
    this.config = config;
  }
  async stop(r) {
    this.stopping = true;
    this.temporaryEndsInARow = 0;
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    let child = this.child;
    if (!child) return;
    let exitPromise = this.exitPromise;
    let n = false;
    if (typeof child.send === "function")
      try {
        n = child.send(
          r !== undefined
            ? {
                type: "shutdown",
                cause: r,
              }
            : {
                type: "shutdown",
              },
        );
      } catch {}
    if (getPlatform() !== "windows" || !n) child.kill("SIGTERM");
    let timer = setTimeout((h) => h.kill("SIGKILL"), DISPATCH_BACKOFF_MIN_MS, child);
    timer.unref();
    if (exitPromise) await exitPromise;
    clearTimeout(timer);
  }
  spawn() {
    let r = processWrapperError();
    if (r) {
      this.logger.write(this.id, `not started: ${r}`);
      if (!this.wrapperParkLogged) {
        this.wrapperParkLogged = true;
        logFeatureBad("agent_launcher", "registry_worker_refused");
      }
      this.scheduleRespawn(DISPATCH_LOCK_MS);
      return;
    }
    let now = Date.now();
    this.spawnedAt = now;
    let o = withProcessWrapper(this.invocation);
    let n = spawn(
      o.cmd,
      [
        ...o.prefixArgs,
        "--daemon-worker",
        this.kind,
        ...(this.temporaryEndsInARow > 0 ? [String(this.temporaryEndsInARow)] : []),
      ],
      {
        stdio: this.authManager ? ["pipe", "pipe", "pipe", "ipc"] : ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    this.child = n;
    this.onStateChange?.();
    n.stdin.on("error", (u) => {
      this.logger.write(this.id, `stdin write error: ${u.message}`);
    });
    n.stdin.write(
      jsonStringify({
        config: this.config,
        initialAccessToken: this.authManager?.getAccessToken(),
      }) +
        `
`,
    );
    n.stdin.end();
    if (this.authManager) this.authManager.attachWorker(n);
    n.on("message", (u) => {
      if (
        this.child === n &&
        typeof u === "object" &&
        u !== null &&
        "type" in u &&
        u.type === "rc_busy" &&
        "busy" in u &&
        typeof u.busy === "boolean"
      ) {
        this.lastBusy = u.busy;
        this.lastBusyAt = Date.now();
      }
      if (
        this.child === n &&
        this.kind === "remoteControl" &&
        typeof u === "object" &&
        u !== null &&
        "type" in u &&
        u.type === "rc_serving_tools" &&
        "count" in u &&
        typeof u.count === "number" &&
        Number.isInteger(u.count) &&
        u.count >= 0 &&
        u.count <= SERVED_SESSIONS_MAX &&
        u.count !== (weakMap.get(this) ?? 0)
      ) {
        weakMap.set(this, u.count);
        this.onStateChange?.();
      }
    });
    let i = createInterface({
      input: n.stdout,
    });
    i.on("line", (u) => this.logger.write(this.id, u));
    let h = createInterface({
      input: n.stderr,
    });
    h.on("line", (u) => this.logger.write(this.id, u));
    n.on("spawn", () => {
      this.wrapperParkLogged = false;
      logFeatureOk("daemon_worker_spawn");
    });
    let S = false;
    this.exitPromise = new Promise((resolve) => {
      let y = (D, E) => {
        if (S) return;
        S = true;
        i.close();
        h.close();
        this.child = null;
        this.lastBusy = false;
        weakMap.delete(this);
        this.onStateChange?.();
        if (this.authManager) this.authManager.detachWorker(n);
        this.exitPromise = null;
        this.onExit(D, E, now);
        resolve();
      };
      n.on("exit", y);
      n.on("error", (D) => {
        this.logger.write(this.id, `spawn error: ${D.message}`);
        logFeatureBad(
          "daemon_worker_spawn",
          isENOENT(D) ? "daemon_worker_spawn_enoent" : "daemon_worker_spawn_error",
        );
        let E = processWrapperArgv()[0];
        let errnoCode = getErrnoCode(D);
        if (E && (isENOENT(D) || errnoCode === "EACCES" || errnoCode === "EPERM")) {
          this.logger.write(
            this.id,
            isENOENT(D)
              ? `not started: launcher \`${E}\` was deleted or moved (ENOENT) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER; retrying in the background`
              : `not started: launcher \`${E}\` cannot be executed (${errnoCode}) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER or the launcher's permissions; retrying in the background`,
          );
          if (!this.wrapperParkLogged) {
            this.wrapperParkLogged = true;
            logFeatureBad("agent_launcher", "registry_worker_refused");
          }
          y(EXIT_TEMPFAIL, null);
          return;
        }
        if (!isENOENT(D)) {
          y(null, null);
          return;
        }
        findLatestInstalledVersion().then((latestInstalledVersion) => {
          if (latestInstalledVersion && latestInstalledVersion !== this.invocation.target) {
            this.logger.write(
              this.id,
              `execPath gone (version GC?) \u2014 re-resolved to ${latestInstalledVersion}`,
            );
            this.invocation = withProcessWrapper({
              cmd: latestInstalledVersion,
              prefixArgs: [],
              target: latestInstalledVersion,
            });
            this.consecutiveCrashes = 0;
          }
          y(null, null);
        });
      });
    });
  }
  onExit(r, e, o) {
    if (this.stopping) return;
    let n = Date.now() - o;
    this.temporaryEndsInARow = r === EXIT_TEMPFAIL ? this.temporaryEndsInARow + 1 : 0;
    if (r === EXIT_TEMPFAIL) {
      let h = jitterDelay(DISPATCH_BACKOFF_STEP_MS);
      this.logger.write(this.id, `exited tempfail code=${r} uptime=${n}ms \u2014 retry in ${h}ms`);
      this.scheduleRespawn(h);
      return;
    }
    if (r === EXIT_CONFIG_ERROR) {
      this.logger.write(this.id, `exited permanently code=${r} uptime=${n}ms \u2014 will not respawn`);
      logEvent("tengu_daemon_worker_permanent_exit", {
        exit_code: r ?? undefined,
        uptime_ms: n,
        worker_kind: fromEnum(this.kind),
      });
      return;
    }
    if (r === 0 && n < PROCESS_WRAPPER_ENV && processWrapperArgv().length > 0) {
      this.logger.write(
        this.id,
        `not started: launcher \`${processWrapperArgv()[0]}\` exited ${n}ms after spawn, before ${this.kind} started \u2014 it must exec its arguments, not daemonize; will not respawn until the launcher is fixed and the daemon restarts`,
      );
      if (!this.wrapperParkLogged) {
        this.wrapperParkLogged = true;
        logFeatureBad("agent_launcher", "registry_worker_launcher_forked");
      }
      logEvent("tengu_daemon_worker_permanent_exit", {
        exit_code: r ?? undefined,
        uptime_ms: n,
        worker_kind: fromEnum(this.kind),
      });
      return;
    }
    if (r !== 0 || n < DISPATCH_POLL_MS) {
      this.consecutiveCrashes++;
      if (processWrapperArgv().length > 0)
        access(this.invocation.target)
          .catch(() => findLatestInstalledVersion())
          .then((S) => {
            if (typeof S === "string" && S && S !== this.invocation.target) {
              this.logger.write(
                this.id,
                `target \`${this.invocation.target}\` is gone (version GC?) \u2014 re-resolved to ${S}`,
              );
              this.invocation = withProcessWrapper({
                cmd: S,
                prefixArgs: [],
                target: S,
              });
              this.consecutiveCrashes = 0;
            }
          })
          .catch(() => {});
      let h = backoffDelay(this.consecutiveCrashes);
      this.logger.write(
        this.id,
        `exited code=${r} sig=${e} uptime=${n}ms consecutive=${this.consecutiveCrashes} backoff=${h}ms`,
      );
      logEvent("tengu_daemon_worker_crash", {
        consecutive: this.consecutiveCrashes,
        exit_code: r ?? undefined,
        uptime_ms: n,
        worker_kind: fromEnum(this.kind),
      });
      this.scheduleRespawn(h);
    } else {
      this.consecutiveCrashes = 0;
      this.logger.write(this.id, `exited code=${r} sig=${e} uptime=${n}ms (clean) \u2014 respawning`);
      this.spawn();
    }
  }
  scheduleRespawn(r) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      if (!this.stopping) this.spawn();
    }, r);
    this.backoffTimer.unref();
  }
}
//@ chunk-ss669z1x.js:47596-47714 placement
function dirFieldOf(r) {
  if (typeof r !== "object" || r === null || !("dir" in r)) return;
  let { dir } = r;
  return typeof dir === "string" ? dir : undefined;
}
//@ chunk-ss669z1x.js:47714-47734 placement
var DRAIN_RETRY_MS = 1000;
var DISPATCH_GRACE_MS = 5000;
//@ chunk-ss669z1x.js:47734-47763 placement
function countByKind(r) {
  return isWorkerKindAdmitted(r);
}
//@ chunk-ss669z1x.js:47763-47846 placement
function countPendingItems(r) {
  let e = 0;
  for (let key of Object.keys(WORKER_KINDS)) e += (r[key] ?? []).length;
  return e;
}
//@ chunk-ss669z1x.js:47846-50788 placement
/**
 * daemon supervisor：读取配置、按 kind 管理 worker、处理配置变更。
 */
async function runDaemonSupervisor(r) {
  let {
    jsonPath,
    invocation,
    logger,
    authManager,
    watch = initialize,
    storageV5,
    onFlagsRefreshed = onGrowthBookRefresh,
  } = r;
  let y = new Map();
  let D = defaultWorkerKindsConfig();
  let resolved = Promise.resolve();
  let L = false;
  let P;
  let R = false;
  let w = false;
  function onStateChange() {
    if (L || w) return;
    clearTimeout(P);
    P = undefined;
    L = true;
    resolved = resolved
      .then(async () => {
        L = false;
        if (w) return;
        let workers = {};
        for (let [V, x] of y) {
          let status = x.status;
          if (status) workers[V] = status;
        }
        if (await writeDaemonStatus(workers, storageV5)) R = false;
        else if (!R) {
          R = true;
          P = setTimeout(onStateChange, DISPATCH_GRACE_MS);
          P.unref();
        }
      })
      .catch((error) => logError(error));
  }
  let jsonConfigFile = await readJsonConfigFile(jsonPath, storageV5);
  if (jsonConfigFile.ok) {
    D = jsonConfigFile.config;
    for (let unknownKey of jsonConfigFile.unknownKeys)
      logger.write("supervisor", `unknown config key '${unknownKey}' \u2014 upgrade claude?`);
  } else logger.write("supervisor", `config load failed: ${jsonConfigFile.error} \u2014 idling`);
  await authManager.ready;
  let re = new Set();
  function X() {
    let B = 0;
    for (let key of Object.keys(WORKER_KINDS)) {
      let x = D[key] ?? [];
      if (!countByKind(key)) {
        if (x.length > 0 && !re.has(key)) {
          re.add(key);
          logger.write(
            "supervisor",
            `not starting ${x.length} ${key} worker(s): not available for this account`,
          );
        }
        continue;
      }
      re.delete(key);
      for (let idx = 0; idx < x.length; idx++) {
        let id = `${key}:${idx}`;
        if (y.has(id)) continue;
        let W = new DaemonWorkerProcess(id, key, x[idx], invocation, logger, authManager, onStateChange);
        y.set(id, W);
        W.start(B++ * DISPATCH_LOCK_RETRY_MS);
        logger.write("supervisor", `spawned ${id}`);
      }
    }
  }
  X();
  onStateChange();
  let Q = async () => {
    let jsonConfigFile = await readJsonConfigFile(jsonPath, storageV5);
    if (!jsonConfigFile.ok) {
      logger.write(
        "supervisor",
        `config reload failed: ${jsonConfigFile.error} \u2014 keeping last-good config`,
      );
      return;
    }
    for (let unknownKey of jsonConfigFile.unknownKeys)
      logger.write("supervisor", `unknown config key '${unknownKey}' \u2014 upgrade claude?`);
    let V = diffSkillServers(D, jsonConfigFile.config);
    D = jsonConfigFile.config;
    let x = new Set((jsonConfigFile.config.remoteControl ?? []).map(dirFieldOf));
    for (let { id, kind, previousConfig } of V.stop) {
      let se = y.get(id);
      if (se) {
        let be = dirFieldOf(previousConfig);
        let ve = kind === "remoteControl" && be !== undefined && x.has(be);
        await se.stop(ve ? "reload" : undefined);
        y.delete(id);
        logger.write("supervisor", `stopped ${id}`);
      }
    }
    for (let { id, kind, previousConfig } of V.restart) {
      let se = y.get(id);
      if (se) {
        let be = dirFieldOf(previousConfig);
        let ve = kind !== "remoteControl" || (be !== undefined && x.has(be));
        await se.stop(ve ? "reload" : undefined);
      }
    }
    let ee = 0;
    for (let { id, config } of V.restart) {
      let ce = y.get(id);
      if (ce) {
        ce.updateConfig(config);
        ce.start(ee++ * DISPATCH_LOCK_RETRY_MS);
        logger.write("supervisor", `restarted ${id}`);
      }
    }
    let ae = 0;
    for (let { id, kind, config } of V.start) {
      if (!countByKind(kind)) continue;
      let se = new DaemonWorkerProcess(id, kind, config, invocation, logger, authManager, onStateChange);
      y.set(id, se);
      se.start(ae++ * DISPATCH_LOCK_RETRY_MS);
      logger.write("supervisor", `spawned ${id}`);
    }
    if (V.stop.length + V.start.length + V.restart.length > 0) {
      logger.write(
        "supervisor",
        `reload: stopped=${V.stop.length} started=${V.start.length} restarted=${V.restart.length}`,
      );
      logEvent("tengu_daemon_config_reload", {
        stopped: V.stop.length,
        started: V.start.length,
        restarted: V.restart.length,
      });
    }
  };
  let resolved_2 = Promise.resolve();
  let le = watch(jsonPath, () => {
    resolved_2 = resolved_2.then(Q).catch((error) => logError(error));
  });
  let _e = false;
  let q = () => {};
  function Z() {
    if (_e) return;
    _e = true;
    le();
    q();
  }
  q = onFlagsRefreshed(() => {
    resolved_2 = resolved_2
      .then(() => {
        if (!_e) {
          X();
          onStateChange();
        }
      })
      .catch((error) => logError(error));
  });
  return {
    workerCount: () => countPendingItems(D),
    hasOAuthConsumer: () => {
      for (let B of y.values()) if (WORKER_KINDS[B.kind].needsOAuth) return true;
      return false;
    },
    busyWorkerCount: () => {
      let B = 0;
      for (let V of y.values()) if (V.isBusy()) B++;
      return B;
    },
    disposeWatcher: Z,
    drainReloads: () => resolved_2,
    stop: async (B) => {
      Z();
      await resolved_2;
      await Promise.all(Array.from(y.values()).map((V) => V.stop(B)));
      w = true;
      clearTimeout(P);
      await withDeadline(resolved, DRAIN_RETRY_MS);
      await removeDaemonStatus(storageV5);
    },
  };
}
//@ chunk-ss669z1x.js:50788-50836 placement
var SHUTDOWN_WAIT_MS = 60000;
var SHUTDOWN_CLOSE_TIMEOUT_MS = 100;
var SHUTDOWN_KILL_GRACE_MS = 5000;
var SHUTDOWN_FORCE_MS = 1800000;
var SHUTDOWN_TOTAL_MS = DAEMON_START_BUDGET_MS + SHUTDOWN_KILL_GRACE_MS;
export {
  SHUTDOWN_WAIT_MS,
  SHUTDOWN_KILL_GRACE_MS,
  SHUTDOWN_TOTAL_MS,
  SHUTDOWN_FORCE_MS,
  openBgDispatchLog,
  SHUTDOWN_CLOSE_TIMEOUT_MS,
  runBgManagerLoop,
  runDaemonSupervisor,
};
