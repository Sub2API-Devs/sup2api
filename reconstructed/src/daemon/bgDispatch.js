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
  ensureDaemonRuntimeDir,
  ensureDaemonDir,
  redactDaemonPipeKey,
  daemonControlSocket,
  daemonRvDir,
  daemonPtyDir,
  cleanupStaleDaemonDirs,
  redactErrorPaths,
  daemonTokensFile,
  daemonPtyPidFile,
  ptyErrFile,
  daemonPtySocket,
  ptyLateFile,
  getExecExitPath,
  daemonAuthFile,
  getDaemonRuntimeDir,
  daemonPtyPidsDir,
  hostManagedDir,
} from "../services/daemon/paths.js";
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
import {
  processWrapperArgv,
  PROCESS_WRAPPER_TIMEOUT_MS,
  processWrapperError,
} from "../utils/processWrapper.js";
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
function normalizeDispatchInput(input) {
  let redacted = redactSecrets(input).trimEnd();
  return redacted.includes(`
`)
    ? escapeControlChars(jsonStringify(redacted))
    : redacted.replace(regExp, toUnicodeEscapes);
}
//@ chunk-ss669z1x.js:14647-15174 placement
/**
 * 打开后台派发日志（过大时清空），写入带时间戳的条目。
 */
async function openBgDispatchLog(logPath) {
  let isTTY = process.stdout.isTTY;
  let size = await stat(logPath)
    .then((stats) => stats.size)
    .catch(() => 0);
  if (size > MAX_DISPATCH_INPUT_BYTES) {
    await rotateLogFile(logPath);
    size = 0;
  }
  let stream = openAppendFd(logPath);
  let rotating = null;
  let pending = null;
  let closed = false;
  return {
    write(tag, message) {
      let line = `[${new Date().toISOString()}] [${tag}] ${normalizeDispatchInput(message)}
`;
      if (isTTY) process.stdout.write(line);
      if (closed) return;
      size += Buffer.byteLength(line);
      if (pending) pending.push(line);
      else stream.write(line);
      if (size > MAX_DISPATCH_INPUT_BYTES && !rotating) {
        let oldFd = stream;
        let buffered = [];
        pending = buffered;
        rotating = (async () => {
          try {
            await endWritable(oldFd);
            await rotateLogFile(logPath);
            stream = openAppendFd(logPath);
            size = 0;
            for (let entry of buffered) {
              size += Buffer.byteLength(entry);
              stream.write(entry);
            }
          } catch {
          } finally {
            pending = null;
            rotating = null;
          }
        })();
      }
    },
    async close() {
      closed = true;
      await rotating;
      await endWritable(stream);
    },
  };
}
//@ chunk-ss669z1x.js:15174-15243 placement
function openAppendFd(logPath) {
  let writeStream = createWriteStream(logPath, {
    flags: "a",
  });
  writeStream.on("error", () => {});
  return writeStream;
}
//@ chunk-ss669z1x.js:15243-15341 placement
function endWritable(stream) {
  return new Promise((resolve) => {
    if (stream.closed) {
      resolve();
      return;
    }
    stream.once("close", () => resolve());
    stream.end();
  });
}
//@ chunk-ss669z1x.js:15341-15491 placement
async function rotateLogFile(logPath) {
  let rotatedPath = `${logPath}.1`;
  try {
    await rename(logPath, rotatedPath);
  } catch (error) {
    if (isENOENT(error)) return;
    await unlink(rotatedPath).catch(() => {});
    await rename(logPath, rotatedPath).catch(() => unlink(logPath).catch(() => {}));
  }
}
//@ chunk-ss669z1x.js:15918-15944 placement
var DISPATCH_TTL_MS = 86400000;
var MAX_DISPATCH_FILE_BYTES = 262144;
//@ chunk-ss669z1x.js:15944-16092 placement
async function quarantineDispatchFile(filePath, reason) {
  await mkdir(daemonRejectedDir(), {
    recursive: true,
    mode: 448,
  }).catch(() => {});
  await rename(filePath, join(daemonRejectedDir(), basename(filePath))).catch(() =>
    unlink(filePath).catch(() => {}),
  );
  reportDispatchRejected(basename(filePath), reason);
}
//@ chunk-ss669z1x.js:16092-16206 placement
function reportDispatchRejected(filePath, reason) {
  logForDebugging(`[bg-dispatch] rejected ${filePath}: ${reason}`, {
    level: "warn",
  });
  logEvent("tengu_bg_dispatch_rejected", {
    reason,
  });
}
//@ chunk-ss669z1x.js:16206-16268 placement
function oversizedMessage(size) {
  return concatSafe(lit("oversized ("), fromNumber(size), lit(" bytes)"));
}
//@ chunk-ss669z1x.js:16268-17013 placement
/**
 * 读取并校验一个派发请求文件（拒绝 symlink、非常规文件、过大文件）。
 */
async function ingestDispatchFile(filePath, onDispatch) {
  let fileStat;
  try {
    fileStat = await lstat(filePath);
  } catch (error) {
    if (isENOENT(error)) return;
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    return quarantineDispatchFile(filePath, sanitizeErrnoForTelemetry(error) ?? lit("unknown"));
  }
  if (fileStat.isSymbolicLink()) {
    logFeatureBad("daemon_bg_dispatch_ingest", "symlink");
    return quarantineDispatchFile(filePath, lit("symlink"));
  }
  if (!fileStat.isFile()) {
    logFeatureBad("daemon_bg_dispatch_ingest", "not_a_file");
    logForDebugging(`[bg-dispatch] removed non-regular ${basename(filePath)}`, {
      level: "warn",
    });
    await rm(filePath, {
      recursive: true,
      force: true,
    }).catch(() => {});
    return;
  }
  if (fileStat.size > MAX_DISPATCH_FILE_BYTES) {
    logFeatureBad("daemon_bg_dispatch_ingest", "oversized");
    return quarantineDispatchFile(filePath, oversizedMessage(fileStat.size));
  }
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    return quarantineDispatchFile(filePath, sanitizeErrnoForTelemetry(error) ?? lit("unknown"));
  }
  let dispatchRecord = parseDispatchRecord(text);
  if (!dispatchRecord.ok) return quarantineDispatchFile(filePath, dispatchRecord.reason);
  onDispatch(dispatchRecord.dispatch);
  logFeatureOk("daemon_bg_dispatch_ingest");
  await unlink(filePath).catch(() => {});
}
//@ chunk-ss669z1x.js:17013-17062 placement
var DISPATCH_DIR = {
  namespace: "daemon",
  relPath: ["dispatch"],
};
//@ chunk-ss669z1x.js:17062-17208 placement
async function ensureDispatchDir(rootPath) {
  if (isStorageV5Enabled() && rootPath !== undefined) {
    await rootPath.ensureScope(DISPATCH_DIR).catch(() => {
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
function parseDispatchRecord(text) {
  let json;
  let isJsonValid = true;
  try {
    json = jsonParse(text);
  } catch {
    json = undefined;
    isJsonValid = false;
  }
  let parsed;
  try {
    parsed = BgDispatchSchema().safeParse(json);
  } catch {
    logFeatureBad("daemon_bg_dispatch_ingest", "transform_throw");
    return {
      ok: false,
      reason: lit("transform_throw"),
    };
  }
  if (!parsed.success) {
    logFeatureBad("daemon_bg_dispatch_ingest", isJsonValid ? "schema" : "bad_json");
    return {
      ok: false,
      reason: lit("schema"),
    };
  }
  if (Date.now() - parsed.data.createdAt > DISPATCH_TTL_MS) {
    logFeatureBad("daemon_bg_dispatch_ingest", "stale");
    return {
      ok: false,
      reason: lit("stale"),
    };
  }
  let { env, reattachEnv } = parsed.data;
  return {
    ok: true,
    dispatch: {
      ...parsed.data,
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
async function rejectStoredDispatch(filePath, reason, extra, record) {
  if (record !== undefined)
    await filePath.write(STORAGE_SPACES.daemon(["dispatch", "rejected", reason]), record).catch(() => {
      return;
    });
  await filePath.delete(STORAGE_SPACES.daemon(["dispatch", reason])).catch(() => {
    return;
  });
  reportDispatchRejected(reason, extra);
}
//@ chunk-ss669z1x.js:18112-18990 placement
/**
 * 处理一个派发请求条目（拒绝、移入存储、记录）。
 */
async function ingestDispatchEntry(storage, reason, entry) {
  let space = STORAGE_SPACES.daemon(["dispatch", reason]);
  let writable = await checkJobFileWritable(join(daemonDispatchDir(), reason));
  if (writable.kind === "refused") {
    if (writable.symlink) {
      logFeatureBad("daemon_bg_dispatch_ingest", "symlink");
      await convertDirectoryToZipInPlace(reason);
      reportDispatchRejected(reason, lit("symlink"));
      return;
    }
    await removeNonRegularDispatch(reason);
    return;
  }
  if (writable.kind === "error") {
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    reportDispatchRejected(reason, sanitizeErrnoForTelemetry(writable.error) ?? lit("unknown"));
    return;
  }
  let listed = await storage
    .read([
      {
        key: space,
        offset: 0,
        length: MAX_DISPATCH_FILE_BYTES + 1,
      },
    ])
    .catch(() => {
      return;
    });
  if (listed === undefined || !listed.ok) {
    logFeatureBad("daemon_bg_dispatch_ingest", "read_failed");
    if (listed !== undefined && isUnrecoverableStorageRead(listed.error))
      return rejectStoredDispatch(storage, reason, lit("v5_read_failed"), undefined);
    reportDispatchRejected(reason, lit("v5_read_failed"));
    return;
  }
  let firstItem = listed.value.items[0];
  if (!firstItem.found) return;
  if (firstItem.totalBytes > MAX_DISPATCH_FILE_BYTES) {
    logFeatureBad("daemon_bg_dispatch_ingest", "oversized");
    return rejectStoredDispatch(storage, reason, oversizedMessage(firstItem.totalBytes), undefined);
  }
  let dispatchRecord = parseDispatchRecord(Buffer.from(firstItem.value).toString("utf8"));
  if (!dispatchRecord.ok)
    return rejectStoredDispatch(storage, reason, dispatchRecord.reason, firstItem.value);
  entry(dispatchRecord.dispatch);
  logFeatureOk("daemon_bg_dispatch_ingest");
  await storage.delete(space).catch(() => {
    return;
  });
}
//@ chunk-ss669z1x.js:18990-19123 placement
async function ingestDispatchName(storage, dirPath, entry) {
  if (!isValidKeySegment(dirPath)) {
    logFeatureBad("daemon_bg_dispatch_ingest", "bad_name");
    reportDispatchRejected(dirPath, lit("bad_name"));
    await convertDirectoryToZipInPlace(dirPath);
    return;
  }
  await ingestDispatchEntry(storage, dirPath, entry);
}
//@ chunk-ss669z1x.js:19123-19834 placement
/**
 * 处理积压的派发请求（v5 存储或目录）。
 */
async function drainDispatchQueue(storage, dir) {
  if (isStorageV5Enabled() && dir !== undefined) {
    let drained;
    let pending = [];
    let entries = [];
    do {
      let listing = await dir.listEntries(DISPATCH_DIR, {
        cursor: drained,
        skipKeyStats: true,
        skipScopeStats: true,
      });
      if (!listing.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `dispatch drain v5 list failed: ${listing.error.code}`,
          "dispatch drain v5 list failed",
        );
      for (let item of listing.value.items) {
        let target = item.kind === "key" ? item.key : item.scope;
        if (target.namespace !== "daemon" || target.relPath?.length !== 2) continue;
        let fileName = target.relPath[1];
        if (fileName === undefined || !isValidKeySegment(fileName)) continue;
        if (item.kind === "key") pending.push(fileName);
        else entries.push(fileName);
      }
      drained = listing.value.cursor;
    } while (drained !== undefined);
    for (let entry of entries) {
      if (isHiddenOrTempOrRejected(entry)) continue;
      await removeNonRegularDispatch(entry);
    }
    for (let entry of pending) {
      if (isHiddenOrTempOrRejected(entry)) continue;
      await ingestDispatchEntry(dir, entry, storage);
    }
    return;
  }
  let remaining;
  try {
    remaining = await readdir(daemonDispatchDir());
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  for (let entry of remaining) {
    if (isHiddenOrTempOrRejected(entry)) continue;
    await ingestDispatchFile(join(daemonDispatchDir(), entry), storage);
  }
}
//@ chunk-ss669z1x.js:19834-19896 placement
/**
 * 文件名是 .tmp 临时文件。疑似归错文件。
 */
function isTempFileName(fileName) {
  return fileName.endsWith(".tmp") || fileName.includes(".tmp.");
}
//@ chunk-ss669z1x.js:19896-19959 placement = extractQuotaStatusFromError (1)
/**
 * 以 . 开头、临时文件或名为 rejected。旧版名错配；疑似归错文件。
 */
function isHiddenOrTempOrRejected(error) {
  return error.startsWith(".") || isTempFileName(error) || error === "rejected";
}
//@ chunk-ss669z1x.js:19959-20031 placement
async function startBgWatcher(onDispatch, storageV5) {
  return withFeatureTelemetry("daemon_bg_watcher_start", () => watchDispatchDir(onDispatch, storageV5));
}
//@ chunk-ss669z1x.js:20031-20817 placement
/**
 * 监视派发目录，新文件到达时处理。
 */
async function watchDispatchDir(onDispatch, storageV5) {
  await ensureDispatchDir(storageV5);
  let platform = getPlatform();
  let usePolling = platform === "macos";
  let watcher = chokidar_default.watch(daemonDispatchDir(), {
    ignoreInitial: true,
    depth: 0,
    usePolling,
    interval: 100,
    ignored: (watchPath) => isTempFileName(basename(watchPath)) || basename(watchPath) === "rejected",
    ...(platform === "windows" && {
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 20,
      },
    }),
  });
  watcher.on("add", (filePath) => {
    (isStorageV5Enabled() && storageV5 !== undefined
      ? ingestDispatchName(storageV5, basename(filePath), onDispatch)
      : ingestDispatchFile(filePath, onDispatch)
    ).catch((error) =>
      logForDebugging(`[bg-dispatch] ${error}`, {
        level: "error",
      }),
    );
  });
  watcher.on("error", (error) => {
    logForDebugging(`[bg-dispatch] watcher error: ${error}`, {
      level: "error",
    });
    logEvent("tengu_bg_dispatch_watcher_failed", {
      errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
    });
  });
  await withTimeout(once(watcher, "ready"), 5000, "chokidar ready").catch((error) =>
    logForDebugging(`[bg-dispatch] watcher ready wait: ${error}`),
  );
  await drainDispatchQueue(onDispatch, storageV5).catch((error) => {
    logForDebugging(`[bg-dispatch] cold-start drain: ${error}`, {
      level: "error",
    });
    logEvent("tengu_bg_dispatch_watcher_failed", {
      errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
    });
  });
  return {
    close: () => watcher.close(),
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
async function runBgManagerLoop(log, options = {}) {
  let leaseControl;
  let watcher;
  let handles = new Map();
  let startManager = async () => {
    let pendingWrites = new Set();
    let spawnPty = options.spawnPty ?? createPtyHostSpawner();
    let notifyKeepAlive = options.onKeepAliveChange ?? (() => {});
    let noteSettled = (short, nonce, reason) => leaseControl?.noteSettledDispatch(short, nonce, reason);
    let isClosed = false;
    let isLeaseOwner = false;
    let deferred = Promise.withResolvers();
    let spareHost = null;
    let spareDisabled = false;
    let launcherNotRunnableEpisode = {
      logged: false,
    };
    let isSpareSpawning = false;
    let sawDispatch = false;
    let usesDefaultSpawner = options.spawnPty === undefined;
    let ensureSpare = () => {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_spare_enable", true)) {
        if (spareHost) {
          spareHost.dispose();
          spareHost = null;
        }
        return;
      }
      if (isLowMemory()) {
        if (spareHost) {
          spareHost.dispose();
          spareHost = null;
        }
        return;
      }
      if (
        !sawDispatch ||
        spareHost ||
        isSpareSpawning ||
        spareDisabled ||
        isClosed ||
        !isLeaseOwner ||
        !spawnPty ||
        !usesDefaultSpawner ||
        getPlatform() === "windows"
      )
        return;
      isSpareSpawning = true;
      let pendingSpare = null;
      let spareExitedEarly = false;
      spawnSpare({
        log,
        launcherNotRunnableEpisode,
        credentials: options.credentials,
        onExit: (exitedUnexpectedly) => {
          if (exitedUnexpectedly) spareDisabled = true;
          if (pendingSpare === null) {
            spareExitedEarly = true;
            return;
          }
          if (spareHost === pendingSpare) {
            spareHost = null;
            let minSpareLifetimeMs =
              processWrapperArgv().length > 0 ? PROCESS_WRAPPER_TIMEOUT_MS : WATCHER_JITTER_MS;
            if (Date.now() - pendingSpare.startedAt >= minSpareLifetimeMs) ensureSpare();
          }
        },
      })
        .then((spare) => {
          pendingSpare = spare;
          if (!spare || isClosed || spareExitedEarly) {
            spare?.dispose();
            return;
          }
          spareHost = spare;
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
          isSpareSpawning = false;
        });
    };
    let now = Date.now();
    let onDispatch = async (dispatchRequest, attempt = 0, upgradeKind, cwdGoneHint = false) => {
      if (isClosed) return "closed";
      sawDispatch = true;
      let cwdGone = cwdGoneHint;
      if (attempt === 0 && !upgradeKind) {
        try {
          await withTimeout(
            access(dispatchRequest.cwd),
            WATCHER_POLL_MS,
            `bg: cwd probe timed out for ${dispatchRequest.short}`,
          );
        } catch (error) {
          cwdGone = isENOENT(error);
        }
        if (isClosed) return "closed";
      }
      if (cwdGone && !handles.has(dispatchRequest.short) && attempt > 0) {
        try {
          await withTimeout(
            access(dispatchRequest.cwd),
            WATCHER_POLL_MS,
            `bg: cwd re-probe timed out for ${dispatchRequest.short}`,
          );
          cwdGone = false;
        } catch (error) {
          cwdGone = isENOENT(error);
        }
        if (isClosed) return "closed";
      }
      if (cwdGone && !handles.has(dispatchRequest.short)) {
        let goneReason = cwdGoneReason(dispatchRequest.cwd);
        log(`bg refused ${dispatchRequest.short} (${dispatchRequest.source}): ${goneReason}`);
        logEvent("tengu_bg_spawn_cwd_gone", {
          short: bgShort(dispatchRequest.short),
          attempt: 0,
          via: fromEnum("dispatch"),
        });
        logFeatureSad("daemon_bg_session_create", "cwd_gone");
        if (dispatchRequest.nonce) noteSettled(dispatchRequest.short, dispatchRequest.nonce, goneReason);
        return "refused";
      }
      let wroteTombstone = false;
      if (isProviderManagedByHost(dispatchRequest) && !handles.has(dispatchRequest.short))
        try {
          await ensureJobsDir(options.storageV5);
          let hostLineage = encodeHostLineage(dispatchRequest.env);
          if (options.storageV5)
            await writeHostTombstone(options.storageV5, dispatchRequest.short, hostLineage);
          else await writeFile(hostManagedEntry(dispatchRequest.short), hostLineage);
          wroteTombstone = true;
        } catch (error) {
          logError(error);
          logFeatureBad("daemon_bg_session_create", "host_tombstone_write");
          return "dropped";
        }
      let existingHandle = handles.get(dispatchRequest.short);
      if (existingHandle) {
        if (
          (existingHandle.isKilling || existingHandle.isRetiring || existingHandle.record.outcome) &&
          attempt < 30
        ) {
          if (attempt === 15 && (existingHandle.isKilling || existingHandle.isRetiring)) {
            logEvent("tengu_bg_dispatch_sigkill_escalate", {});
            existingHandle.kill("SIGKILL");
          }
          await sleep(100);
          return onDispatch(dispatchRequest, attempt + 1, upgradeKind, cwdGone);
        }
        let isHandleSettling =
          existingHandle.isKilling || existingHandle.isRetiring || existingHandle.record.outcome;
        if (wroteTombstone && !isProviderManagedByHost(existingHandle.dispatch))
          if (options.storageV5) await deleteHostTombstone(options.storageV5, dispatchRequest.short);
          else await unlink(hostManagedEntry(dispatchRequest.short)).catch(() => {});
        log(
          isHandleSettling
            ? `bg: dispatch ${dispatchRequest.short} dropped \u2014 retry budget exhausted (handle still settling)`
            : `bg: dup dispatch ${dispatchRequest.short} dropped (existing handle still live)`,
        );
        if (isHandleSettling) {
          logFeatureBad("daemon_bg_session_create", "dup_retry_exhausted");
          return "dropped";
        }
        logFeatureOk("daemon_bg_session_create");
        return "dup-live";
      }
      if (!isProviderManagedByHost(dispatchRequest))
        if (options.storageV5) deleteHostTombstone(options.storageV5, dispatchRequest.short);
        else unlink(hostManagedEntry(dispatchRequest.short)).catch(() => {});
      let { lowMem, level } = getLowMemoryState();
      if (lowMem && handles.size > 0) {
        let sweepAnchorAgeMs = Date.now() - now;
        if (sweepAnchorAgeMs > WATCHER_HEARTBEAT_MS * 2)
          log(
            `bg: low memory but sweep anchor is ${Math.round(sweepAnchorAgeMs / 1000)}s stale (host slept?) \u2014 deferring eager retire to the next sweep tick`,
          );
        else {
          let rounded = Math.round(freemem() / 1024 / 1024);
          log(
            `bg: low memory (${level !== undefined ? `macOS memorystatus pressure level ${level}` : `${rounded}MB free`}) \u2014 retiring settled workers before spawning ${dispatchRequest.short}`,
          );
          logEvent("tengu_bg_dispatch_low_mem", {
            free_mb: rounded,
            handles: handles.size,
            pressure_level: level,
          });
          readStopFlags(options.storageV5).then((stopFlags) => {
            for (let handle of handles.values())
              handle
                .retireIfSettled(WATCHER_TICK_MS, stopFlags)
                .then((wasRetired) => retireIdleWorker(log, handle, wasRetired, "low memory"))
                .catch((error) => logError(error));
          });
        }
      }
      if (dispatchRequest.source === "spare" && lowMem) {
        log(`bg: low memory \u2014 skipping spare dispatch ${dispatchRequest.short}`);
        return "dropped";
      }
      if (
        spareHost &&
        !upgradeKind &&
        dispatchRequest.launch.mode !== "exec" &&
        spareHost.cliVersion ===
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
        let claimedSpare = spareHost;
        spareHost = null;
        try {
          let handle = claimSpare(
            dispatchRequest,
            claimedSpare,
            spawnPty,
            options.getAuthSnapshot,
            options.storageV5,
            options.credentials,
          );
          handles.set(dispatchRequest.short, handle);
          onBgSessionSettled(handles, handle, notifyKeepAlive, pendingWrites, log, {
            storageV5: options.storageV5,
            credentials: options.credentials,
            noteSettled,
          });
          trackPending(
            pendingWrites,
            updateRoster((rosterDraft) => {
              rosterDraft.workers[dispatchRequest.short] = handle.rosterEntry();
            }, options.storageV5).catch((error) => logError(error)),
          );
          notifyKeepAlive();
          logEvent("tengu_bg_spare_claim", {
            age_ms: Date.now() - claimedSpare.startedAt,
          });
          log(`bg claimed-spare ${dispatchRequest.short} (${dispatchRequest.source})`);
          logFeatureOk("daemon_bg_session_create");
          ensureSpare();
          return "claimed";
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          let claimFailReason =
            errnoCode === "ENOENT"
              ? "enoent"
              : errnoCode === "ECONNREFUSED"
                ? "econnrefused"
                : error instanceof Error
                  ? "error"
                  : "unknown";
          logEvent("tengu_bg_spare_claim_fail", {
            reason: fromEnum(claimFailReason),
          });
          claimedSpare.dispose();
        }
      }
      let handle = DaemonSupervisor.spawn(
        dispatchRequest,
        spawnPty,
        options.getAuthSnapshot,
        upgradeKind
          ? {
              afterUpgrade: upgradeKind,
            }
          : undefined,
        options.storageV5,
        options.credentials,
      );
      handles.set(dispatchRequest.short, handle);
      onBgSessionSettled(handles, handle, notifyKeepAlive, pendingWrites, log, {
        storageV5: options.storageV5,
        credentials: options.credentials,
        noteSettled,
      });
      notifyKeepAlive();
      ensureSpare();
      log(`bg spawned ${dispatchRequest.short} (${dispatchRequest.source})`);
      logFeatureOk("daemon_bg_session_create");
      return "spawned";
    };
    let killAll = (signal = "SIGTERM") => {
      let killedCount = 0;
      for (let handle of handles.values())
        if (!handle.record.outcome) {
          handle.kill(signal);
          killedCount++;
        }
      return killedCount;
    };
    await ensureDaemonRuntimeDir();
    await ensureDaemonDir();
    let leaseControl_2 = await handleDaemonLease(
      handles,
      onDispatch,
      options.onNudge ??
        (async () => ({
          restarting: false,
          upgradePending: false,
        })),
      (shutdownRequested) => {
        let killedCount = shutdownRequested ? killAll("SIGTERM") : 0;
        options.onShutdown?.();
        return killedCount;
      },
      () => isLeaseOwner,
      options.onYield ?? (() => false),
      deferred.promise,
      options.storageV5,
    );
    leaseControl = leaseControl_2;
    log(`bg: control socket bound at ${redactDaemonPipeKey(daemonControlSocket())}`);
    leaseControl_2.onLeaseChange.subscribe(notifyKeepAlive);
    leaseControl_2.onLeaseChange.subscribe(({ op, client }) => {
      if (client?.label === CLOUD_SESSION_LEASE_LABEL) {
        log(
          `bg lease ${op}: ${client.label} ${client.cloudSessionId ?? "(no session id)"} pid=${client.pid} (leases=${leaseControl_2.leaseCount()})`,
        );
        return;
      }
      if (leaseControl_2.leaseCount() > 0 && !sawDispatch) {
        sawDispatch = true;
        ensureSpare();
      }
    });
    await Promise.all(
      getPlatform() === "windows"
        ? [ensureDaemonStateDir(options.storageV5)]
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
    let roster = await readRoster(undefined, options.storageV5);
    let adoptedCount = 0;
    let deadCount = 0;
    let deadEpochCount = 0;
    let upgradeSkippedCount = 0;
    let deadPlannedCount = 0;
    let respawnedCount = 0;
    let isRosterAbandoned = roster.updatedAt > 0 && Date.now() - roster.updatedAt > ABANDONED_WORKER_MS;
    await Promise.all(
      Object.entries(roster.workers).map(async ([key, value]) => {
        let adoptedHandle;
        try {
          adoptedHandle = await DaemonSupervisor.adopt(
            key,
            value,
            spawnPty,
            options.getAuthSnapshot,
            options.storageV5,
            options.credentials,
          );
        } catch (error) {
          logError(redactErrorPaths(error));
          deadCount++;
          return;
        }
        if (
          !adoptedHandle &&
          value.procStart === undefined &&
          value.ptySock &&
          (await pingPtySocket(value.ptySock))
        ) {
          value.procStart = await withDeadline(getProcessStartTimeAsync(value.pid), MIN_POLL_MS);
          try {
            adoptedHandle = await DaemonSupervisor.adopt(
              key,
              value,
              spawnPty,
              options.getAuthSnapshot,
              options.storageV5,
              options.credentials,
            );
          } catch (error) {
            logError(redactErrorPaths(error));
            adoptedHandle = null;
          }
          adoptedHandle ??= DaemonSupervisor.unverified(key, value, options.storageV5, options.credentials);
        }
        if (adoptedHandle) {
          handles.set(key, adoptedHandle);
          onBgSessionSettled(handles, adoptedHandle, notifyKeepAlive, pendingWrites, log, {
            storageV5: options.storageV5,
            credentials: options.credentials,
            noteSettled,
          });
          adoptedCount++;
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
          !isRosterAbandoned
        ) {
          respawnedCount++;
          logEvent("tengu_bg_adopt_upgrade_respawn", {});
          onDispatch(value.dispatch, 0, true).catch((error) => logError(error));
        } else {
          deadCount++;
          let wasPlanned = false;
          if (value.pendingRespawn === "upgrade" && isRosterAbandoned) {
            upgradeSkippedCount++;
            wasPlanned = true;
          }
          let execExitStatus = await readExecExitStatus(value.ptySock, value.dispatch);
          let exitStatus = execExitStatus ?? {
            state: "failed",
            detail: "process gone while supervisor was down",
          };
          if (
            (await writeReapedTerminalState(
              key,
              exitStatus.state,
              exitStatus.detail,
              {
                resumable: execExitStatus ? undefined : "auto-resume",
              },
              options.storageV5,
            )) === "dead-epoch"
          ) {
            deadEpochCount++;
            wasPlanned = true;
          }
          if (wasPlanned) deadPlannedCount++;
          if (options.credentials)
            options.credentials.discardSpentCredentialFile(daemonTokensFile(key)).catch(() => {});
          else unlink(daemonTokensFile(key)).catch(() => {});
          if (getPlatform() === "windows") {
            if (options.storageV5) deletePtyPidRecords(options.storageV5, key, value.ptySock);
            else {
              unlink(daemonPtyPidFile(key)).catch(() => {});
              unlink(ptyErrFile(daemonPtySocket(key))).catch(() => {});
              unlink(ptyLateFile(daemonPtySocket(key))).catch(() => {});
              unlink(getExecExitPath(value.ptySock ?? daemonPtySocket(key))).catch(() => {});
            }
          } else {
            if (options.credentials)
              options.credentials.discardSpentCredentialFile(daemonAuthFile(key)).catch(() => {});
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
    if (adoptedCount + deadCount + respawnedCount > 0) {
      log(
        `bg adopt: adopted=${adoptedCount} respawned=${respawnedCount} dead=${deadCount}` +
          (deadEpochCount > 0 ? ` dead_epoch=${deadEpochCount}` : "") +
          (upgradeSkippedCount > 0
            ? ` upgrade_skipped=${upgradeSkippedCount} (previous roster written ${Math.round((Date.now() - roster.updatedAt) / 86400000)}d ago)`
            : ""),
      );
      logEvent("tengu_bg_adopt", {
        adopted: adoptedCount,
        respawned: respawnedCount,
        dead: deadCount,
        dead_epoch: deadEpochCount,
        upgrade_skipped: upgradeSkippedCount,
      });
      if (deadCount - deadPlannedCount === 0) logFeatureOk("daemon_bg_adopt");
      else if (adoptedCount > 0 || respawnedCount > 0) logFeatureSad("daemon_bg_adopt", "partial");
      else logFeatureBad("daemon_bg_adopt", "all_workers_dead");
    }
    let daemonLock = await readDaemonLock(options.storageV5).catch(() => null);
    let ownsDaemonLock = daemonLock?.pid === process.pid;
    let canSweep =
      !(daemonLock !== null && daemonLock.pid !== process.pid) && !(options.isShuttingDown?.() ?? false);
    if (!ownsDaemonLock)
      log(
        `bg: skipped post-adopt sweeps + roster rewrite \u2014 daemon.lock is ${daemonLock ? `held by pid ${daemonLock.pid}` : "absent"} (yield/handover in flight)`,
      );
    if (ownsDaemonLock && !roster.parseFailed)
      reapStaleSockets(handles, log, {
        storageV5: options.storageV5,
      });
    if (ownsDaemonLock && !roster.parseFailed) await reapOrphanSpares(handles, log);
    if (ownsDaemonLock && !roster.inspectFailed)
      await updateRoster((rosterDraft) => {
        rosterDraft.workers = {};
        for (let [short, handle] of handles) rosterDraft.workers[short] = handle.rosterEntry();
      }, options.storageV5).catch((error) => logError(error));
    let watcher_2 = canSweep
      ? await startBgWatcher(
          (dispatchRequest) => void onDispatch(dispatchRequest).catch((error) => logError(error)),
          options.storageV5,
        )
      : null;
    watcher = watcher_2 ?? undefined;
    isLeaseOwner = canSweep;
    if (canSweep) deferred.resolve();
    notifyKeepAlive();
    if (canSweep && handles.size > 0) sawDispatch = true;
    ensureSpare();
    if (canSweep) runPrewarmBurst().catch((error) => logError(error));
    now = Date.now();
    let isSweepRunning = false;
    let interval = setInterval(
      async (handlesMap, ensureSpare) => {
        if (isSweepRunning) return;
        isSweepRunning = true;
        try {
          await runSweep(handlesMap, ensureSpare);
        } finally {
          isSweepRunning = false;
        }
      },
      WATCHER_HEARTBEAT_MS,
      handles,
      ensureSpare,
    );
    async function runSweep(handlesMap, ensureSpare) {
      {
        let now_2 = Date.now();
        let heartbeatGapMs = now_2 - now - WATCHER_HEARTBEAT_MS;
        now = now_2;
        if (heartbeatGapMs > WATCHER_HEARTBEAT_MS) {
          for (let handle of handlesMap.values()) handle.shiftGraceClocksForward(heartbeatGapMs);
          ensureSpare();
          return;
        }
        let isLowMem = isLowMemory();
        let retireMs = isLowMem ? WATCHER_TICK_MS : WATCHER_MAX_MS;
        let absoluteRetireMs = isLowMem ? WATCHER_TICK_MS : WATCHER_ABSOLUTE_MS;
        let stopFlags = await readStopFlags(options.storageV5);
        for (let handle of handlesMap.values())
          if (stopFlags.has(handle.dispatch.short))
            handle.respawnIfIdleStale(stopFlags).catch((error) => logError(error));
        let results = await Promise.all(
          [...handlesMap.values()].map((handle) =>
            handle
              .retireIfSettled(retireMs, stopFlags, absoluteRetireMs)
              .then((wasRetired) => retireIdleWorker(log, handle, wasRetired, isLowMem ? "low memory" : ""))
              .catch((error) => {
                logError(error);
                return false;
              }),
          ),
        );
        let retiredCount = count(results, (retired) => retired);
        if (isLowMem && retiredCount === 0 && isLowMemory()) {
          let results = await Promise.all(
            [...handlesMap.values()].map((handle) =>
              handle
                .retireIfSettled(WATCHER_IDLE_MS, stopFlags, WATCHER_IDLE_MS, {
                  shedMonitoringOnly: true,
                })
                .then((wasRetired) =>
                  retireIdleWorker(log, handle, wasRetired, "low memory, monitoring only"),
                )
                .catch((error) => {
                  logError(error);
                  return false;
                }),
            ),
          );
          retiredCount += count(results, (retired) => retired);
        }
        if (isLowMem && retiredCount === 0 && isLowMemory()) {
          let filtered = [...handlesMap.values()].filter((pinnedHandle) =>
            stopFlags.has(pinnedHandle.dispatch.short),
          );
          if (filtered.length > 0) {
            log(
              "bg: low memory persists after shedding non-pinned \u2014 retiring pinned settled workers as a last resort",
            );
            logEvent("tengu_bg_retire_pinned_low_mem", {});
            for (let handle of filtered)
              handle
                .retireIfSettled(retireMs, WATCHER_STOP_FLAGS, absoluteRetireMs)
                .then((wasRetired) => retireIdleWorker(log, handle, wasRetired, "low memory, pinned"))
                .catch((error) => logError(error));
          }
        }
        if (!isLowMem && isAttachUpgradeEnabled()) {
          let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
            "tengu_bg_prewarm_per_sweep",
            3,
          );
          let refusalBudget = 12;
          for (let handle of handlesMap.values()) {
            if (featureValue_CACHED_MAY_BE_STALE <= 0 || refusalBudget <= 0) break;
            if (stopFlags.has(handle.dispatch.short)) continue;
            if (handle.isUnverified) continue;
            if (handle.isBooting) {
              featureValue_CACHED_MAY_BE_STALE--;
              continue;
            }
            if (!handle.isVersionStale) continue;
            if (handle.dispatch.launch.mode === "exec") continue;
            if (
              rcChannelDiffers(
                handle.record.cliVersion,
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
              handle.record.cliVersion &&
              isNewerBuild(
                handle.record.cliVersion,
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
              handle.noteDowngradeRefused("prewarm");
              continue;
            }
            if (
              (
                await handle.respawnIfIdleStale(undefined, "prewarm").catch((error) => {
                  logError(error);
                  return {
                    respawned: false,
                  };
                })
              ).respawned
            )
              featureValue_CACHED_MAY_BE_STALE--;
            else refusalBudget--;
          }
        }
        ensureSpare();
      }
    }
    interval.unref();
    async function runPrewarmBurst() {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_bg_prewarm_burst_delay_ms",
        15000,
      );
      await sleep(featureValue_CACHED_MAY_BE_STALE, undefined, {
        unref: true,
      });
      if (isClosed) return;
      let featureValue_CACHED_MAY_BE_STALE_2 = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_bg_prewarm_burst_concurrency",
        3,
      );
      if (featureValue_CACHED_MAY_BE_STALE_2 <= 0 || !isAttachUpgradeEnabled()) return;
      let stopFlags = await readStopFlags(options.storageV5);
      let staleHandles = new Set(
        [...handles.values()].filter(
          (handle) =>
            !handle.record.outcome &&
            !handle.isUnverified &&
            handle.isVersionStale &&
            handle.dispatch.launch.mode !== "exec" &&
            !stopFlags.has(handle.dispatch.short),
        ),
      );
      if (staleHandles.size === 0) return;
      let size = staleHandles.size;
      let now_2 = Date.now();
      let respawnedCount = 0;
      let refusedCount = 0;
      let bootingCount = 0;
      let stoppedLowMem = false;
      let stoppedStaleAnchor = false;
      let burstDeadline = now_2 + WATCHER_MAX_GAP_MS;
      while (staleHandles.size > 0 && Date.now() < burstDeadline && !isClosed) {
        if (Date.now() - now > WATCHER_HEARTBEAT_MS * 2) {
          stoppedStaleAnchor = true;
          break;
        }
        if (isLowMemory()) {
          stoppedLowMem = true;
          break;
        }
        let concurrencyBudget =
          featureValue_CACHED_MAY_BE_STALE_2 -
          count([...handles.values()], (handle) => handle.isBooting && !handle.isUnverified);
        for (let handle of staleHandles) {
          if (concurrencyBudget <= 0) break;
          staleHandles.delete(handle);
          if (handle.isBooting) {
            bootingCount++;
            continue;
          }
          if (
            (
              await handle.respawnIfIdleStale(undefined, "burst").catch((error) => {
                logError(error);
                return {
                  respawned: false,
                };
              })
            ).respawned
          ) {
            respawnedCount++;
            concurrencyBudget--;
          } else refusedCount++;
        }
        if (staleHandles.size === 0) break;
        await sleep(WATCHER_MIN_GAP_MS, undefined, {
          unref: true,
        });
      }
      log(
        `bg: post-takeover prewarm burst \u2014 respawned ${respawnedCount}/${size} stale workers` +
          (refusedCount > 0 ? `, ${refusedCount} refused` : "") +
          (stoppedLowMem ? `, stopped on low memory (${staleHandles.size} left)` : "") +
          (stoppedStaleAnchor
            ? `, deferred to sweep on stale anchor \u2014 host slept? (${staleHandles.size} left)`
            : "") +
          ` in ${Math.round((Date.now() - now_2) / 1000)}s`,
      );
      logEvent("tengu_bg_prewarm_burst", {
        candidates: size,
        respawned: respawnedCount,
        refused: refusedCount,
        alreadyBooting: bootingCount,
        remaining: staleHandles.size,
        lowMemStop: stoppedLowMem,
        sweepStaleStop: stoppedStaleAnchor,
        durationMs: Date.now() - now_2,
      });
    }
    return {
      handles,
      dispatch: (dispatchRequest) => void onDispatch(dispatchRequest).catch((error) => logError(error)),
      leaseCount: leaseControl_2.leaseCount,
      announceExit: leaseControl_2.announceExit,
      liveHandleCount: () => {
        let liveCount = 0;
        for (let handle of handles.values()) if (!handle.record.outcome) liveCount++;
        return liveCount;
      },
      snapshotConsumerCount: () => {
        let consumerCount = 0;
        for (let handle of handles.values())
          if (!handle.record.outcome && shouldCarryAuth(handle.dispatch)) consumerCount++;
        return consumerCount;
      },
      pendingSettleWrites: () => pendingWrites.size,
      killAll,
      close: async (closeOptions) => {
        let displaced = closeOptions?.displaced ?? false;
        isClosed = true;
        clearInterval(interval);
        if (spareHost) {
          spareHost.dispose();
          spareHost = null;
        }
        await Promise.all([
          watcher_2?.close().catch(() => {}),
          leaseControl_2
            .close({
              skipUnlink: displaced || closeOptions?.skipPathCleanup,
            })
            .catch(() => {}),
        ]);
        for (let handle of handles.values()) handle.stop();
        await Promise.allSettled([...pendingWrites]);
        if (
          !displaced &&
          handles.size === 0 &&
          !roster.parseFailed &&
          !closeOptions?.skipPathCleanup &&
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
      startManager,
      (caughtError) => sanitizeErrnoForTelemetry(caughtError)?.toLowerCase() ?? "error",
    );
  } catch (error) {
    for (let handle of handles.values()) handle.stop();
    await watcher?.close().catch(() => {});
    let daemonLock = await readDaemonLock(options.storageV5).catch(() => null);
    await leaseControl
      ?.close(
        daemonLock?.pid === process.pid
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
function onBgSessionSettled(handles, handle, notifyKeepAlive, pendingWrites, log, context) {
  handle.onSettle.subscribe((settleReason) => {
    let jobDir = getJobDir(handle.record.short);
    let finalState = settleReason === "done" ? "done" : settleReason === "killed" ? "stopped" : "failed";
    let detail = handle.record.detail;
    let sessionIdTaken = handle.sessionIdTaken;
    let crashDetail =
      settleReason === "crashed" && detail
        ? redactDaemonPipeKey(detail.replace(/; respawning$/, "")).replace(/\s*\n\s*/g, " \xB7 ")
        : "";
    log(`bg settled ${handle.record.short} (${settleReason})${crashDetail ? `: ${crashDetail}` : ""}`);
    if (handle.shouldDeleteJobDir)
      trackPending(
        pendingWrites,
        context.storageV5 && jobDir === getJobDir(handle.record.short)
          ? deleteJobScope(context.storageV5, handle.record.short, jobDir, (scopeError) =>
              logError(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `jobdir retire deleteScope: ${scopeError}`,
                  "jobdir retire deleteScope failed",
                ),
              ),
            ).catch((error) => logError(error))
          : rm(jobDir, {
              recursive: true,
              force: true,
            }).catch((error) => logError(error)),
      );
    else if (settleReason === "killed" && handle.isHandoffKill)
      logEvent("tengu_bg_handoff_settle", {
        jobSessionId: sanitizeMarkName(handle.record.sessionId),
      });
    else
      trackPending(
        pendingWrites,
        readJobState(jobDir, context.storageV5)
          .then((jobState) => {
            if (
              jobState
                ? (isSettled(jobState) && !(settleReason === "crashed" && jobState.state === "failed")) ||
                  (settleReason === "done" &&
                    jobState.state === "blocked" &&
                    handle.dispatch.launch.mode !== "exec")
                : settleReason !== "crashed" || handle.dispatch.source === "spare"
            ) {
              if (!jobState && handle.dispatch.source === "spare") {
                if (context.storageV5 && jobDir === getJobDir(handle.record.short))
                  return context.storageV5
                    .statMeta(STORAGE_SPACES.job(handle.record.short, ["state.json"]))
                    .then(
                      (statResult) =>
                        !statResult.ok && statResult.error.code === "NotFound"
                          ? deleteJobScope(context.storageV5, handle.record.short, jobDir, (scopeError) =>
                              logError(
                                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                                  `spare-sweep deleteScope: ${scopeError}`,
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
            let baseJobState = jobState ?? {
              state: "working",
              detail: "",
              tempo: "active",
              output: null,
              children: null,
              linkScanOffset: 0,
              template:
                handle.dispatch.launch.mode === "exec"
                  ? "exec"
                  : (handle.dispatch.agent ?? handle.dispatch.routine ?? "bg"),
              routine: handle.dispatch.routine,
              respawnFlags:
                handle.dispatch.source === "shell"
                  ? moveSkipPermissionsLast(splitForwardableArgs([...handle.dispatch.respawnFlags]))
                  : splitForwardableArgs([...handle.dispatch.respawnFlags]),
              intent: handle.record.intent,
              name: handle.record.name,
              sessionId: handle.record.sessionId,
              cwd: handle.record.cwd,
              worktreePath: handle.dispatch.worktree?.path ?? handle.record.worktreePath,
              createdAt: new Date(handle.dispatch.createdAt).toISOString(),
              updatedAt: iso,
              firstTerminalAt: null,
              backend: "daemon",
            };
            return writeStateAtomic(
              jobDir,
              {
                ...baseJobState,
                state: finalState,
                detail:
                  finalState === "stopped"
                    ? "stopped"
                    : (detail || baseJobState.detail).replace(/; respawning$/, ""),
                tempo: "idle",
                inFlight: undefined,
                needs: undefined,
                block: undefined,
                ...(sessionIdTaken && {
                  sessionIdTaken: true,
                }),
                updatedAt: iso,
                firstTerminalAt: baseJobState.firstTerminalAt ?? iso,
              },
              context.storageV5,
            );
          })
          .catch((error) => logError(error)),
      );
    trackPending(
      pendingWrites,
      updateRoster((rosterDraft) => {
        delete rosterDraft.workers[handle.record.short];
      }, context.storageV5).catch((error) => logError(error)),
    );
    if (context.credentials)
      trackPending(
        pendingWrites,
        context.credentials.discardSpentCredentialFile(daemonTokensFile(handle.record.short)).catch(() => {}),
      );
    else
      trackPending(
        pendingWrites,
        unlink(daemonTokensFile(handle.record.short)).catch(() => {}),
      );
    let rosterEntry = handle.rosterEntry();
    if (getPlatform() === "windows") {
      if (context.storageV5)
        trackPending(
          pendingWrites,
          deletePtyPidRecords(context.storageV5, handle.record.short, rosterEntry.ptySock),
        );
      else {
        trackPending(
          pendingWrites,
          unlink(daemonPtyPidFile(handle.record.short)).catch(() => {}),
        );
        trackPending(
          pendingWrites,
          unlink(ptyErrFile(daemonPtySocket(handle.record.short))).catch(() => {}),
        );
        trackPending(
          pendingWrites,
          unlink(ptyLateFile(daemonPtySocket(handle.record.short))).catch(() => {}),
        );
        trackPending(
          pendingWrites,
          unlink(getExecExitPath(rosterEntry.ptySock ?? daemonPtySocket(handle.record.short))).catch(
            () => {},
          ),
        );
      }
    } else {
      if (context.credentials)
        trackPending(
          pendingWrites,
          context.credentials.discardSpentCredentialFile(daemonAuthFile(handle.record.short)).catch(() => {}),
        );
      else
        trackPending(
          pendingWrites,
          unlink(daemonAuthFile(handle.record.short)).catch(() => {}),
        );
      trackPending(
        pendingWrites,
        unlink(rosterEntry.rendezvousSock).catch(() => {}),
      );
      if (rosterEntry.ptySock) {
        trackPending(
          pendingWrites,
          unlink(rosterEntry.ptySock).catch(() => {}),
        );
        trackPending(
          pendingWrites,
          unlink(ptyErrFile(rosterEntry.ptySock)).catch(() => {}),
        );
        trackPending(
          pendingWrites,
          unlink(ptyLateFile(rosterEntry.ptySock)).catch(() => {}),
        );
        trackPending(
          pendingWrites,
          unlink(getExecExitPath(rosterEntry.ptySock)).catch(() => {}),
        );
      }
    }
    if (handle.dispatch.launch.mode === "exec" && settleReason !== "killed") {
      notifyKeepAlive();
      setTimeout(
        (handlesMap, short, expectedHandle) => {
          if (handlesMap.get(short) === expectedHandle) handlesMap.delete(short);
        },
        300000,
        handles,
        handle.record.short,
        handle,
      ).unref();
      return;
    }
    if (handle.record.nonce) context.noteSettled(handle.record.short, handle.record.nonce);
    handles.delete(handle.record.short);
    notifyKeepAlive();
  });
  handle.onState.subscribe((stateEvent) => {
    if (stateEvent.pid)
      trackPending(
        pendingWrites,
        updateRoster((rosterDraft) => {
          rosterDraft.workers[handle.record.short] = handle.rosterEntry();
        }, context.storageV5).catch((error) => logError(error)),
      );
    if (stateEvent.state === "crashed" || stateEvent.state === "resuming") {
      let state = stateEvent.state;
      let detail = handle.record.detail;
      let tempo = state === "crashed" ? "idle" : "active";
      let jobDir = getJobDir(handle.record.short);
      let writePromise = readJobState(jobDir, context.storageV5)
        .then((jobState) => {
          if (
            handle.record.outcome ||
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
            context.storageV5,
          );
        })
        .catch((error) => logError(error));
      trackPending(pendingWrites, writePromise);
    }
  });
}
//@ chunk-ss669z1x.js:38486-39851 placement
/**
 * 清理失效的会话 socket/pid 文件。
 */
async function reapStaleSockets(handles, log, options = {}) {
  let isWindows = getPlatform() === "windows";
  let [scanDir, primarySuffix] = isWindows ? [daemonPtyPidsDir(), ".pid"] : [daemonPtyDir(), ".sock"];
  let entries =
    isWindows && options.storageV5
      ? await listStoredPtyPids(options.storageV5)
      : await readdir(scanDir).catch(() => []);
  let activeNames = new Set(entries.filter((entry) => entry.endsWith(primarySuffix)));
  let reapedCount = 0;
  for (let entry of entries) {
    if (!entry.endsWith(primarySuffix)) {
      let found = (
        isWindows ? [".err", ".late", ".err.read"] : [".err", ".late", ".exec-exit", ".err.read"]
      ).find((sidecarSuffix) => entry.endsWith(isWindows ? sidecarSuffix : `.sock${sidecarSuffix}`));
      if (found) {
        let sliced = entry.slice(0, -found.length);
        let ptyMarkerIndex = isWindows ? sliced.lastIndexOf("-pty-") : -1;
        let ownerName = isWindows
          ? ptyMarkerIndex >= 0
            ? `${sliced.slice(ptyMarkerIndex + 5)}.pid`
            : ""
          : sliced;
        if (ownerName && !activeNames.has(ownerName))
          if (isWindows && options.storageV5)
            options.storageV5.delete(STORAGE_SPACES.daemon(["pty-pids", entry])).catch(() => {});
          else unlink(join(scanDir, entry)).catch(() => {});
      }
      continue;
    }
    let sliced = entry.slice(0, -primarySuffix.length);
    if (handles.has(sliced)) continue;
    reapedCount++;
    let pidFile = daemonPtyPidFile(sliced);
    killViaPtySocket(daemonPtySocket(sliced), options.storageV5).then((killed) => {
      let errFile = ptyErrFile(daemonPtySocket(sliced));
      let lateFile = ptyLateFile(daemonPtySocket(sliced));
      let execExitPath = getExecExitPath(daemonPtySocket(sliced));
      if (!isWindows) {
        writeReapedTerminalState(
          sliced,
          "failed",
          "reaped (roster gap)",
          {
            resumable: "wake-only",
          },
          options.storageV5,
        );
        unlink(lateFile).catch(() => {});
        unlink(execExitPath).catch(() => {});
        return;
      }
      let cleanupFiles = () => {
        if (options.storageV5) deletePtyPidRecords(options.storageV5, sliced, undefined);
        else {
          unlink(pidFile).catch(() => {});
          unlink(errFile).catch(() => {});
          unlink(lateFile).catch(() => {});
          unlink(execExitPath).catch(() => {});
        }
      };
      if (killed) {
        writeReapedTerminalState(
          sliced,
          "failed",
          "reaped (roster gap)",
          {
            resumable: "wake-only",
          },
          options.storageV5,
        );
        cleanupFiles();
        return;
      }
      (options.storageV5
        ? readStoredPtyPid(options.storageV5, sliced)
        : readSmallFileOrNull(pidFile, MAX_PID_FILE_BYTES)
      )
        .then((pidText) => {
          if (pidText === null) return;
          if (!isProcessRunning(Number(pidText))) {
            writeReapedTerminalState(
              sliced,
              "failed",
              "reaped (roster gap)",
              {
                resumable: "wake-only",
              },
              options.storageV5,
            );
            cleanupFiles();
          }
        })
        .catch(() => {});
    });
  }
  if (reapedCount) {
    log(`bg orphan-reap: ${reapedCount} roster-less pty host(s)`);
    logEvent("tengu_bg_orphan_reap", {
      reaped: reapedCount,
    });
  }
}
//@ chunk-ss669z1x.js:39851-39900 placement
var PTY_PIDS_DIR = {
  namespace: "daemon",
  relPath: ["pty-pids"],
};
//@ chunk-ss669z1x.js:39900-40001 placement
async function ensureJobsDir(storage) {
  if (isStorageV5Enabled() && storage !== undefined) {
    await ensureTombstoneScope(storage);
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
async function deletePtyPidRecords(storageV5, short, ptySock) {
  for (let fileName of [
    basename(daemonPtyPidFile(short)),
    basename(ptyErrFile(daemonPtySocket(short))),
    basename(ptyLateFile(daemonPtySocket(short))),
    basename(getExecExitPath(ptySock ?? daemonPtySocket(short))),
  ])
    await storageV5.delete(STORAGE_SPACES.daemon(["pty-pids", fileName])).catch(() => {});
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
async function deleteJobScope(storageV5, jobId, dirPath, onError) {
  if (await removeIfNotDirectory(dirPath)) return;
  let deleteResult = await storageV5.deleteScope({
    namespace: "job",
    jobId,
  });
  if (!deleteResult.ok) onError(deleteResult.error.code);
}
//@ chunk-ss669z1x.js:40556-40590 placement
var PTY_PID_KEY_RE = /^[0-9A-Za-z.+_-]{1,100}$/;
//@ chunk-ss669z1x.js:40590-41418 placement
/**
 * 空闲超时或版本过旧时退役 worker。
 */
function retireIdleWorker(log, workerHandle, retirement, tag) {
  if (!retirement.retired) return false;
  let rounded = Math.round(retirement.idleMs / 60000);
  let idleText = rounded >= 120 ? `${Math.round(rounded / 60)}h` : `${rounded}m`;
  let cliVersion =
    workerHandle.record.cliVersion && PTY_PID_KEY_RE.test(workerHandle.record.cliVersion)
      ? workerHandle.record.cliVersion
      : "unrecognized";
  let versionNote = workerHandle.isVersionStale
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
  log(
    `bg retire ${workerHandle.record.short}: ${retirement.cause}, idle ${idleText}${versionNote}${tag ? ` [${tag}]` : ""}`,
  );
  return true;
}
//@ chunk-ss669z1x.js:41418-41471 placement
function trackPending(pending, promise) {
  pending.add(promise);
  promise.finally(() => pending.delete(promise));
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
function jitterDelay(delayMs) {
  return Math.round(delayMs * (0.5 + Math.random()));
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
    let status = {
      pid,
      startedAt: this.spawnedAt,
    };
    let servedDir = dirFieldOf(this.config);
    let sessionCount = weakMap.get(this) ?? 0;
    if (sessionCount > 0 && servedDir !== undefined)
      status.servedFolder = {
        dir: servedDir,
        sessions: sessionCount,
      };
    return status;
  }
  isBusy() {
    return this.lastBusy && this.child !== null && Date.now() - this.lastBusyAt < DISPATCH_STALE_MS;
  }
  start(delayMs = 0) {
    this.stopping = false;
    if (delayMs > 0) this.scheduleRespawn(delayMs);
    else this.spawn();
  }
  updateConfig(config) {
    this.config = config;
  }
  async stop(cause) {
    this.stopping = true;
    this.temporaryEndsInARow = 0;
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    let child = this.child;
    if (!child) return;
    let exitPromise = this.exitPromise;
    let sentShutdown = false;
    if (typeof child.send === "function")
      try {
        sentShutdown = child.send(
          cause !== undefined
            ? {
                type: "shutdown",
                cause,
              }
            : {
                type: "shutdown",
              },
        );
      } catch {}
    if (getPlatform() !== "windows" || !sentShutdown) child.kill("SIGTERM");
    let timer = setTimeout((childToKill) => childToKill.kill("SIGKILL"), DISPATCH_BACKOFF_MIN_MS, child);
    timer.unref();
    if (exitPromise) await exitPromise;
    clearTimeout(timer);
  }
  spawn() {
    let wrapperError = processWrapperError();
    if (wrapperError) {
      this.logger.write(this.id, `not started: ${wrapperError}`);
      if (!this.wrapperParkLogged) {
        this.wrapperParkLogged = true;
        logFeatureBad("agent_launcher", "registry_worker_refused");
      }
      this.scheduleRespawn(DISPATCH_LOCK_MS);
      return;
    }
    let now = Date.now();
    this.spawnedAt = now;
    let resolvedInvocation = withProcessWrapper(this.invocation);
    let child = spawn(
      resolvedInvocation.cmd,
      [
        ...resolvedInvocation.prefixArgs,
        "--daemon-worker",
        this.kind,
        ...(this.temporaryEndsInARow > 0 ? [String(this.temporaryEndsInARow)] : []),
      ],
      {
        stdio: this.authManager ? ["pipe", "pipe", "pipe", "ipc"] : ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    this.child = child;
    this.onStateChange?.();
    child.stdin.on("error", (stdinError) => {
      this.logger.write(this.id, `stdin write error: ${stdinError.message}`);
    });
    child.stdin.write(
      jsonStringify({
        config: this.config,
        initialAccessToken: this.authManager?.getAccessToken(),
      }) +
        `
`,
    );
    child.stdin.end();
    if (this.authManager) this.authManager.attachWorker(child);
    child.on("message", (message) => {
      if (
        this.child === child &&
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "rc_busy" &&
        "busy" in message &&
        typeof message.busy === "boolean"
      ) {
        this.lastBusy = message.busy;
        this.lastBusyAt = Date.now();
      }
      if (
        this.child === child &&
        this.kind === "remoteControl" &&
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "rc_serving_tools" &&
        "count" in message &&
        typeof message.count === "number" &&
        Number.isInteger(message.count) &&
        message.count >= 0 &&
        message.count <= SERVED_SESSIONS_MAX &&
        message.count !== (weakMap.get(this) ?? 0)
      ) {
        weakMap.set(this, message.count);
        this.onStateChange?.();
      }
    });
    let stdoutReader = createInterface({
      input: child.stdout,
    });
    stdoutReader.on("line", (line) => this.logger.write(this.id, line));
    let stderrReader = createInterface({
      input: child.stderr,
    });
    stderrReader.on("line", (line) => this.logger.write(this.id, line));
    child.on("spawn", () => {
      this.wrapperParkLogged = false;
      logFeatureOk("daemon_worker_spawn");
    });
    let hasExited = false;
    this.exitPromise = new Promise((resolve) => {
      let handleExit = (code, signalName) => {
        if (hasExited) return;
        hasExited = true;
        stdoutReader.close();
        stderrReader.close();
        this.child = null;
        this.lastBusy = false;
        weakMap.delete(this);
        this.onStateChange?.();
        if (this.authManager) this.authManager.detachWorker(child);
        this.exitPromise = null;
        this.onExit(code, signalName, now);
        resolve();
      };
      child.on("exit", handleExit);
      child.on("error", (spawnError) => {
        this.logger.write(this.id, `spawn error: ${spawnError.message}`);
        logFeatureBad(
          "daemon_worker_spawn",
          isENOENT(spawnError) ? "daemon_worker_spawn_enoent" : "daemon_worker_spawn_error",
        );
        let launcherPath = processWrapperArgv()[0];
        let errnoCode = getErrnoCode(spawnError);
        if (launcherPath && (isENOENT(spawnError) || errnoCode === "EACCES" || errnoCode === "EPERM")) {
          this.logger.write(
            this.id,
            isENOENT(spawnError)
              ? `not started: launcher \`${launcherPath}\` was deleted or moved (ENOENT) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER; retrying in the background`
              : `not started: launcher \`${launcherPath}\` cannot be executed (${errnoCode}) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER or the launcher's permissions; retrying in the background`,
          );
          if (!this.wrapperParkLogged) {
            this.wrapperParkLogged = true;
            logFeatureBad("agent_launcher", "registry_worker_refused");
          }
          handleExit(EXIT_TEMPFAIL, null);
          return;
        }
        if (!isENOENT(spawnError)) {
          handleExit(null, null);
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
          handleExit(null, null);
        });
      });
    });
  }
  onExit(code, signalName, startedAt) {
    if (this.stopping) return;
    let uptimeMs = Date.now() - startedAt;
    this.temporaryEndsInARow = code === EXIT_TEMPFAIL ? this.temporaryEndsInARow + 1 : 0;
    if (code === EXIT_TEMPFAIL) {
      let retryDelayMs = jitterDelay(DISPATCH_BACKOFF_STEP_MS);
      this.logger.write(
        this.id,
        `exited tempfail code=${code} uptime=${uptimeMs}ms \u2014 retry in ${retryDelayMs}ms`,
      );
      this.scheduleRespawn(retryDelayMs);
      return;
    }
    if (code === EXIT_CONFIG_ERROR) {
      this.logger.write(
        this.id,
        `exited permanently code=${code} uptime=${uptimeMs}ms \u2014 will not respawn`,
      );
      logEvent("tengu_daemon_worker_permanent_exit", {
        exit_code: code ?? undefined,
        uptime_ms: uptimeMs,
        worker_kind: fromEnum(this.kind),
      });
      return;
    }
    if (code === 0 && uptimeMs < PROCESS_WRAPPER_TIMEOUT_MS && processWrapperArgv().length > 0) {
      this.logger.write(
        this.id,
        `not started: launcher \`${processWrapperArgv()[0]}\` exited ${uptimeMs}ms after spawn, before ${this.kind} started \u2014 it must exec its arguments, not daemonize; will not respawn until the launcher is fixed and the daemon restarts`,
      );
      if (!this.wrapperParkLogged) {
        this.wrapperParkLogged = true;
        logFeatureBad("agent_launcher", "registry_worker_launcher_forked");
      }
      logEvent("tengu_daemon_worker_permanent_exit", {
        exit_code: code ?? undefined,
        uptime_ms: uptimeMs,
        worker_kind: fromEnum(this.kind),
      });
      return;
    }
    if (code !== 0 || uptimeMs < DISPATCH_POLL_MS) {
      this.consecutiveCrashes++;
      if (processWrapperArgv().length > 0)
        access(this.invocation.target)
          .catch(() => findLatestInstalledVersion())
          .then((resolvedTarget) => {
            if (
              typeof resolvedTarget === "string" &&
              resolvedTarget &&
              resolvedTarget !== this.invocation.target
            ) {
              this.logger.write(
                this.id,
                `target \`${this.invocation.target}\` is gone (version GC?) \u2014 re-resolved to ${resolvedTarget}`,
              );
              this.invocation = withProcessWrapper({
                cmd: resolvedTarget,
                prefixArgs: [],
                target: resolvedTarget,
              });
              this.consecutiveCrashes = 0;
            }
          })
          .catch(() => {});
      let backoffMs = backoffDelay(this.consecutiveCrashes);
      this.logger.write(
        this.id,
        `exited code=${code} sig=${signalName} uptime=${uptimeMs}ms consecutive=${this.consecutiveCrashes} backoff=${backoffMs}ms`,
      );
      logEvent("tengu_daemon_worker_crash", {
        consecutive: this.consecutiveCrashes,
        exit_code: code ?? undefined,
        uptime_ms: uptimeMs,
        worker_kind: fromEnum(this.kind),
      });
      this.scheduleRespawn(backoffMs);
    } else {
      this.consecutiveCrashes = 0;
      this.logger.write(
        this.id,
        `exited code=${code} sig=${signalName} uptime=${uptimeMs}ms (clean) \u2014 respawning`,
      );
      this.spawn();
    }
  }
  scheduleRespawn(delayMs) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      if (!this.stopping) this.spawn();
    }, delayMs);
    this.backoffTimer.unref();
  }
}
//@ chunk-ss669z1x.js:47596-47714 placement
function dirFieldOf(config) {
  if (typeof config !== "object" || config === null || !("dir" in config)) return;
  let { dir } = config;
  return typeof dir === "string" ? dir : undefined;
}
//@ chunk-ss669z1x.js:47714-47734 placement
var DRAIN_RETRY_MS = 1000;
var DISPATCH_GRACE_MS = 5000;
//@ chunk-ss669z1x.js:47734-47763 placement
function countByKind(kind) {
  return isWorkerKindAdmitted(kind);
}
//@ chunk-ss669z1x.js:47763-47846 placement
function countPendingItems(config) {
  let total = 0;
  for (let key of Object.keys(WORKER_KINDS)) total += (config[key] ?? []).length;
  return total;
}
//@ chunk-ss669z1x.js:47846-50788 placement
/**
 * daemon supervisor：读取配置、按 kind 管理 worker、处理配置变更。
 */
async function runDaemonSupervisor(options) {
  let {
    jsonPath,
    invocation,
    logger,
    authManager,
    watch = initialize,
    storageV5,
    onFlagsRefreshed = onGrowthBookRefresh,
  } = options;
  let processes = new Map();
  let config = defaultWorkerKindsConfig();
  let resolved = Promise.resolve();
  let isStatusWritePending = false;
  let statusRetryTimer;
  let statusWriteFailed = false;
  let isStopped = false;
  function onStateChange() {
    if (isStatusWritePending || isStopped) return;
    clearTimeout(statusRetryTimer);
    statusRetryTimer = undefined;
    isStatusWritePending = true;
    resolved = resolved
      .then(async () => {
        isStatusWritePending = false;
        if (isStopped) return;
        let workers = {};
        for (let [id, processes_2] of processes) {
          let status = processes_2.status;
          if (status) workers[id] = status;
        }
        if (await writeDaemonStatus(workers, storageV5)) statusWriteFailed = false;
        else if (!statusWriteFailed) {
          statusWriteFailed = true;
          statusRetryTimer = setTimeout(onStateChange, DISPATCH_GRACE_MS);
          statusRetryTimer.unref();
        }
      })
      .catch((error) => logError(error));
  }
  let jsonConfigFile = await readJsonConfigFile(jsonPath, storageV5);
  if (jsonConfigFile.ok) {
    config = jsonConfigFile.config;
    for (let unknownKey of jsonConfigFile.unknownKeys)
      logger.write("supervisor", `unknown config key '${unknownKey}' \u2014 upgrade claude?`);
  } else logger.write("supervisor", `config load failed: ${jsonConfigFile.error} \u2014 idling`);
  await authManager.ready;
  let warnedKinds = new Set();
  function syncProcesses() {
    let startIndex = 0;
    for (let key of Object.keys(WORKER_KINDS)) {
      let kindConfigs = config[key] ?? [];
      if (!countByKind(key)) {
        if (kindConfigs.length > 0 && !warnedKinds.has(key)) {
          warnedKinds.add(key);
          logger.write(
            "supervisor",
            `not starting ${kindConfigs.length} ${key} worker(s): not available for this account`,
          );
        }
        continue;
      }
      warnedKinds.delete(key);
      for (let idx = 0; idx < kindConfigs.length; idx++) {
        let id = `${key}:${idx}`;
        if (processes.has(id)) continue;
        let workerProcess = new DaemonWorkerProcess(
          id,
          key,
          kindConfigs[idx],
          invocation,
          logger,
          authManager,
          onStateChange,
        );
        processes.set(id, workerProcess);
        workerProcess.start(startIndex++ * DISPATCH_LOCK_RETRY_MS);
        logger.write("supervisor", `spawned ${id}`);
      }
    }
  }
  syncProcesses();
  onStateChange();
  let reloadConfig = async () => {
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
    let diff = diffSkillServers(config, jsonConfigFile.config);
    config = jsonConfigFile.config;
    let nextServedDirs = new Set((jsonConfigFile.config.remoteControl ?? []).map(dirFieldOf));
    for (let { id, kind, previousConfig } of diff.stop) {
      let workerProcess = processes.get(id);
      if (workerProcess) {
        let previousDir = dirFieldOf(previousConfig);
        let stillServed =
          kind === "remoteControl" && previousDir !== undefined && nextServedDirs.has(previousDir);
        await workerProcess.stop(stillServed ? "reload" : undefined);
        processes.delete(id);
        logger.write("supervisor", `stopped ${id}`);
      }
    }
    for (let { id, kind, previousConfig } of diff.restart) {
      let workerProcess = processes.get(id);
      if (workerProcess) {
        let previousDir = dirFieldOf(previousConfig);
        let keepServing =
          kind !== "remoteControl" || (previousDir !== undefined && nextServedDirs.has(previousDir));
        await workerProcess.stop(keepServing ? "reload" : undefined);
      }
    }
    let restartIndex = 0;
    for (let { id, config } of diff.restart) {
      let workerProcess = processes.get(id);
      if (workerProcess) {
        workerProcess.updateConfig(config);
        workerProcess.start(restartIndex++ * DISPATCH_LOCK_RETRY_MS);
        logger.write("supervisor", `restarted ${id}`);
      }
    }
    let startIndex = 0;
    for (let { id, kind, config } of diff.start) {
      if (!countByKind(kind)) continue;
      let workerProcess = new DaemonWorkerProcess(
        id,
        kind,
        config,
        invocation,
        logger,
        authManager,
        onStateChange,
      );
      processes.set(id, workerProcess);
      workerProcess.start(startIndex++ * DISPATCH_LOCK_RETRY_MS);
      logger.write("supervisor", `spawned ${id}`);
    }
    if (diff.stop.length + diff.start.length + diff.restart.length > 0) {
      logger.write(
        "supervisor",
        `reload: stopped=${diff.stop.length} started=${diff.start.length} restarted=${diff.restart.length}`,
      );
      logEvent("tengu_daemon_config_reload", {
        stopped: diff.stop.length,
        started: diff.start.length,
        restarted: diff.restart.length,
      });
    }
  };
  let resolved_2 = Promise.resolve();
  let stopWatching = watch(jsonPath, () => {
    resolved_2 = resolved_2.then(reloadConfig).catch((error) => logError(error));
  });
  let isDisposed = false;
  let unsubscribeFlags = () => {};
  function dispose() {
    if (isDisposed) return;
    isDisposed = true;
    stopWatching();
    unsubscribeFlags();
  }
  unsubscribeFlags = onFlagsRefreshed(() => {
    resolved_2 = resolved_2
      .then(() => {
        if (!isDisposed) {
          syncProcesses();
          onStateChange();
        }
      })
      .catch((error) => logError(error));
  });
  return {
    workerCount: () => countPendingItems(config),
    hasOAuthConsumer: () => {
      for (let workerProcess of processes.values())
        if (WORKER_KINDS[workerProcess.kind].needsOAuth) return true;
      return false;
    },
    busyWorkerCount: () => {
      let busyCount = 0;
      for (let workerProcess of processes.values()) if (workerProcess.isBusy()) busyCount++;
      return busyCount;
    },
    disposeWatcher: dispose,
    drainReloads: () => resolved_2,
    stop: async (cause) => {
      dispose();
      await resolved_2;
      await Promise.all(Array.from(processes.values()).map((workerProcess) => workerProcess.stop(cause)));
      isStopped = true;
      clearTimeout(statusRetryTimer);
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
