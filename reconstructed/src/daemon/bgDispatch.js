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
import {
  stat,
  stat as stat_2,
  rename,
  rename as rename_2,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  mkdir,
  mkdir as mkdir_2,
  lstat,
  lstat as lstat_2,
  rm,
  rm as rm_2,
  rm as rm_3,
  readFile,
  readdir,
  readdir as readdir_2,
  access,
  access as access_2,
  writeFile,
} from "fs/promises";
import { createWriteStream } from "fs";
import { join, join as join_2, basename, basename as basename_2 } from "path";
import { once } from "events";
import { freemem } from "os";
import { spawn, spawn as spawn_2 } from "child_process";
import { createInterface } from "readline";
import { RS } from "../utils/sanitization.js";
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
  Y8o,
  nwe,
  ePe,
  $A,
  Z6,
  X3r,
  UTt,
  redactErrorPaths,
  FTt,
  owe,
  JC,
  FA,
  xN,
  $Tt,
  Xot,
  jwn,
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
import { BJe, BG_CARRIED_ENV_ALLOWLIST, BG_INTERNAL_ENV_KEYS } from "../utils/background/envCarry.js";
import { STORAGE_SPACES, isValidKeySegment } from "../utils/storage/storageSpaces.js";
import { checkJobFileWritable } from "../services/daemon/sessionCron.js";
import { isUnrecoverableStorageRead, bgShort, updateRoster, readRoster } from "../services/daemon/roster.js";
import { getPlatform } from "../utils/platform.js";
import { Ok } from "../../vendor/chokidar/index.js";
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
import { isLowMemory, getLowMemoryState, hho } from "./lowMemory.js";
import { spawnSpare, claimSpare, reapOrphanSpares } from "../services/daemon/spare.js";
import { processWrapperArgv, Xit, processWrapperError } from "../utils/processWrapper.js";
import { Vuo, MIN_POLL_MS } from "../services/daemon/sessionRestart.js";
import {
  isProviderManagedByHost,
  DaemonSupervisor,
  shouldCarryAuth,
} from "../services/daemon/DaemonSupervisor.js";
import {
  encodeHostLineage,
  writeHostTombstone,
  Ttn,
  ensureTombstoneScope,
  s5,
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
  lmt,
  readExecExitStatus,
  isNewerBuild,
  listStoredPtyPids,
  killViaPtySocket,
  readStoredPtyPid,
  Rtn,
} from "../services/daemon/reapJobs.js";
import { getProcessStartTimeAsync, reapDetachedRepl, sigtermThenKill } from "../utils/processIdentity.js";
import { readDaemonLock } from "../utils/daemon/daemonLock.js";
import { count } from "../utils/collections.js";
import { ye } from "../utils/startupMarks.js";
import { moveSkipPermissionsLast, splitForwardableArgs } from "../cli/forwardedFlags.js";
import { readSmallFileOrNull } from "../utils/readSmallFile.js";
import { isProcessRunning } from "../utils/genericProcessUtils.js";
import { withProcessWrapper, findLatestInstalledVersion } from "../utils/deepLink/registerProtocol.js";
import { SERVED_SESSIONS_MAX, writeDaemonStatus, removeDaemonStatus } from "./daemonStatus.js";
import { the, EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";
import { isWorkerKindAdmitted, WORKER_KINDS } from "./runDaemonWorker.js";
import { initialize } from "./daemonConfigWatcher.js";
import { PTr, readJsonConfigFile } from "../utils/jsonConfigFile.js";
import { diffSkillServers } from "../utils/skills/skillChangeDetector.js";

//@ chunk-ss669z1x.js:14515-14561 placement
var at = 10485760,
  regExp = new RegExp(`[${RS}]`, "gu");
//@ chunk-ss669z1x.js:14561-14647 placement
function Jt(r) {
  let trimEnd = redactSecrets(r).trimEnd();
  return trimEnd.includes(`
`)
    ? escapeControlChars(jsonStringify(trimEnd))
    : trimEnd.replace(regExp, toUnicodeEscapes);
}
/**
 * 打开后台派发日志（过大时清空），写入带时间戳的条目。
 */
//@ chunk-ss669z1x.js:14647-15174 placement
async function openBgDispatchLog(r) {
  let isTTY = process.stdout.isTTY,
    o = await stat(r)
      .then((u) => u.size)
      .catch(() => 0);
  if (o > at) (await rotateLogFile(r), (o = 0));
  let n = dt(r),
    i = null,
    h = null,
    S = !1;
  return {
    write(u, y) {
      let D = `[${new Date().toISOString()}] [${u}] ${Jt(y)}
`;
      if (isTTY) process.stdout.write(D);
      if (S) return;
      if (((o += Buffer.byteLength(D)), h)) h.push(D);
      else n.write(D);
      if (o > at && !i) {
        let E = n,
          L = [];
        ((h = L),
          (i = (async () => {
            try {
              (await lt(E), await rotateLogFile(r), (n = dt(r)), (o = 0));
              for (let P of L) ((o += Buffer.byteLength(P)), n.write(P));
            } catch {
            } finally {
              ((h = null), (i = null));
            }
          })()));
      }
    },
    async close() {
      ((S = !0), await i, await lt(n));
    },
  };
}
//@ chunk-ss669z1x.js:15174-15243 placement
function dt(r) {
  let e = createWriteStream(r, { flags: "a" });
  return (e.on("error", () => {}), e);
}
//@ chunk-ss669z1x.js:15243-15341 placement
function lt(r) {
  return new Promise((e) => {
    if (r.closed) {
      e();
      return;
    }
    (r.once("close", () => e()), r.end());
  });
}
//@ chunk-ss669z1x.js:15341-15491 placement
async function rotateLogFile(r) {
  let e = `${r}.1`;
  try {
    await rename(r, e);
  } catch (error) {
    if (isENOENT(error)) return;
    (await unlink(e).catch(() => {}), await rename(r, e).catch(() => unlink(r).catch(() => {})));
  }
}
//@ chunk-ss669z1x.js:15918-15944 placement
var rr = 86400000,
  Je = 262144;
//@ chunk-ss669z1x.js:15944-16092 placement
async function quarantineDispatchFile(r, e) {
  (await mkdir_2(Y8o(), { recursive: !0, mode: 448 }).catch(() => {}),
    await rename_2(r, join_2(Y8o(), basename_2(r))).catch(() => unlink_3(r).catch(() => {})),
    reportDispatchRejected(basename_2(r), e));
}
//@ chunk-ss669z1x.js:16092-16206 placement
function reportDispatchRejected(r, e) {
  (logForDebugging(`[bg-dispatch] rejected ${r}: ${e}`, { level: "warn" }),
    logEvent("tengu_bg_dispatch_rejected", { reason: e }));
}
//@ chunk-ss669z1x.js:16206-16268 placement
function mt(r) {
  return concatSafe(lit("oversized ("), fromNumber(r), lit(" bytes)"));
}
/**
 * 读取并校验一个派发请求文件（拒绝 symlink、非常规文件、过大文件）。
 */
//@ chunk-ss669z1x.js:16268-17013 placement
async function ingestDispatchFile(r, e) {
  let o;
  try {
    o = await lstat_2(r);
  } catch (error) {
    if (isENOENT(error)) return;
    return (
      logFeatureBad("daemon_bg_dispatch_ingest", "read_failed"),
      quarantineDispatchFile(r, sanitizeErrnoForTelemetry(error) ?? lit("unknown"))
    );
  }
  if (o.isSymbolicLink())
    return (logFeatureBad("daemon_bg_dispatch_ingest", "symlink"), quarantineDispatchFile(r, lit("symlink")));
  if (!o.isFile()) {
    (logFeatureBad("daemon_bg_dispatch_ingest", "not_a_file"),
      logForDebugging(`[bg-dispatch] removed non-regular ${basename_2(r)}`, { level: "warn" }),
      await rm_3(r, { recursive: !0, force: !0 }).catch(() => {}));
    return;
  }
  if (o.size > Je)
    return (logFeatureBad("daemon_bg_dispatch_ingest", "oversized"), quarantineDispatchFile(r, mt(o.size)));
  let n;
  try {
    n = await readFile(r, "utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    return (
      logFeatureBad("daemon_bg_dispatch_ingest", "read_failed"),
      quarantineDispatchFile(r, sanitizeErrnoForTelemetry(error) ?? lit("unknown"))
    );
  }
  let i = parseDispatchRecord(n);
  if (!i.ok) return quarantineDispatchFile(r, i.reason);
  (e(i.dispatch), logFeatureOk("daemon_bg_dispatch_ingest"), await unlink_3(r).catch(() => {}));
}
//@ chunk-ss669z1x.js:17013-17062 placement
var ht = { namespace: "daemon", relPath: ["dispatch"] };
//@ chunk-ss669z1x.js:17062-17208 placement
async function ensureDispatchDir(r) {
  if (isStorageV5Enabled() && r !== void 0) {
    await r.ensureScope(ht).catch(() => {
      return;
    });
    return;
  }
  await mkdir_2(nwe(), { recursive: !0, mode: 448 }).catch(() => {});
}
/**
 * 解析派发记录 JSON 并校验 schema。
 */
//@ chunk-ss669z1x.js:17208-17710 placement
function parseDispatchRecord(r) {
  let e,
    o = !0;
  try {
    e = jsonParse(r);
  } catch {
    ((e = void 0), (o = !1));
  }
  let n;
  try {
    n = BgDispatchSchema().safeParse(e);
  } catch {
    return (
      logFeatureBad("daemon_bg_dispatch_ingest", "transform_throw"),
      { ok: !1, reason: lit("transform_throw") }
    );
  }
  if (!n.success)
    return (
      logFeatureBad("daemon_bg_dispatch_ingest", o ? "schema" : "bad_json"),
      { ok: !1, reason: lit("schema") }
    );
  if (Date.now() - n.data.createdAt > rr)
    return (logFeatureBad("daemon_bg_dispatch_ingest", "stale"), { ok: !1, reason: lit("stale") });
  let { env: env, reattachEnv: reattachEnv } = n.data;
  return {
    ok: !0,
    dispatch: {
      ...n.data,
      env: BJe(env, BG_CARRIED_ENV_ALLOWLIST),
      reattachEnv: reattachEnv && BJe(reattachEnv, BG_INTERNAL_ENV_KEYS),
    },
  };
}
//@ chunk-ss669z1x.js:17710-17791 placement = convertDirectoryToZipInPlace (1)
async function convertDirectoryToZipInPlace(r) {
  await rm_3(join_2(nwe(), r), { recursive: !0, force: !0 }).catch(() => {});
}
//@ chunk-ss669z1x.js:17791-17927 placement
async function removeNonRegularDispatch(r) {
  (logFeatureBad("daemon_bg_dispatch_ingest", "not_a_file"),
    logForDebugging(`[bg-dispatch] removed non-regular ${r}`, { level: "warn" }),
    await convertDirectoryToZipInPlace(r));
}
//@ chunk-ss669z1x.js:17927-18112 placement
async function rejectStoredDispatch(r, e, o, n) {
  if (n !== void 0)
    await r.write(STORAGE_SPACES.daemon(["dispatch", "rejected", e]), n).catch(() => {
      return;
    });
  (await r.delete(STORAGE_SPACES.daemon(["dispatch", e])).catch(() => {
    return;
  }),
    reportDispatchRejected(e, o));
}
/**
 * 处理一个派发请求条目（拒绝、移入存储、记录）。
 */
//@ chunk-ss669z1x.js:18112-18990 placement
async function ingestDispatchEntry(r, e, o) {
  let daemon = STORAGE_SPACES.daemon(["dispatch", e]),
    i = await checkJobFileWritable(join_2(nwe(), e));
  if (i.kind === "refused") {
    if (i.symlink) {
      (logFeatureBad("daemon_bg_dispatch_ingest", "symlink"),
        await convertDirectoryToZipInPlace(e),
        reportDispatchRejected(e, lit("symlink")));
      return;
    }
    await removeNonRegularDispatch(e);
    return;
  }
  if (i.kind === "error") {
    (logFeatureBad("daemon_bg_dispatch_ingest", "read_failed"),
      reportDispatchRejected(e, sanitizeErrnoForTelemetry(i.error) ?? lit("unknown")));
    return;
  }
  let h = await r.read([{ key: daemon, offset: 0, length: Je + 1 }]).catch(() => {
    return;
  });
  if (h === void 0 || !h.ok) {
    if (
      (logFeatureBad("daemon_bg_dispatch_ingest", "read_failed"),
      h !== void 0 && isUnrecoverableStorageRead(h.error))
    )
      return rejectStoredDispatch(r, e, lit("v5_read_failed"), void 0);
    reportDispatchRejected(e, lit("v5_read_failed"));
    return;
  }
  let S = h.value.items[0];
  if (!S.found) return;
  if (S.totalBytes > Je)
    return (
      logFeatureBad("daemon_bg_dispatch_ingest", "oversized"),
      rejectStoredDispatch(r, e, mt(S.totalBytes), void 0)
    );
  let u = parseDispatchRecord(Buffer.from(S.value).toString("utf8"));
  if (!u.ok) return rejectStoredDispatch(r, e, u.reason, S.value);
  (o(u.dispatch),
    logFeatureOk("daemon_bg_dispatch_ingest"),
    await r.delete(daemon).catch(() => {
      return;
    }));
}
//@ chunk-ss669z1x.js:18990-19123 placement
async function ingestDispatchName(r, e, o) {
  if (!isValidKeySegment(e)) {
    (logFeatureBad("daemon_bg_dispatch_ingest", "bad_name"),
      reportDispatchRejected(e, lit("bad_name")),
      await convertDirectoryToZipInPlace(e));
    return;
  }
  await ingestDispatchEntry(r, e, o);
}
/**
 * 处理积压的派发请求（v5 存储或目录）。
 */
//@ chunk-ss669z1x.js:19123-19834 placement
async function drainDispatchQueue(r, e) {
  if (isStorageV5Enabled() && e !== void 0) {
    let n,
      i = [],
      h = [];
    do {
      let listEntries = await e.listEntries(ht, { cursor: n, skipKeyStats: !0, skipScopeStats: !0 });
      if (!listEntries.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `dispatch drain v5 list failed: ${listEntries.error.code}`,
          "dispatch drain v5 list failed",
        );
      for (let item of listEntries.value.items) {
        let y = item.kind === "key" ? item.key : item.scope;
        if (y.namespace !== "daemon" || y.relPath?.length !== 2) continue;
        let D = y.relPath[1];
        if (D === void 0 || !isValidKeySegment(D)) continue;
        if (item.kind === "key") i.push(D);
        else h.push(D);
      }
      n = listEntries.value.cursor;
    } while (n !== void 0);
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
    o = await readdir_2(nwe());
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  for (let n of o) {
    if (isHiddenOrTempOrRejected(n)) continue;
    await ingestDispatchFile(join_2(nwe(), n), r);
  }
}
/**
 * 文件名是 .tmp 临时文件。疑似归错文件。
 */
//@ chunk-ss669z1x.js:19834-19896 placement
function isTempFileName(r) {
  return r.endsWith(".tmp") || r.includes(".tmp.");
}
/**
 * 以 . 开头、临时文件或名为 rejected。旧版名错配；疑似归错文件。
 */
//@ chunk-ss669z1x.js:19896-19959 placement = extractQuotaStatusFromError (1)
function isHiddenOrTempOrRejected(error) {
  return error.startsWith(".") || isTempFileName(error) || error === "rejected";
}
//@ chunk-ss669z1x.js:19959-20031 placement
async function St(r, e) {
  return withFeatureTelemetry("daemon_bg_watcher_start", () => watchDispatchDir(r, e));
}
/**
 * 监视派发目录，新文件到达时处理。
 */
//@ chunk-ss669z1x.js:20031-20817 placement
async function watchDispatchDir(r, e) {
  await ensureDispatchDir(e);
  let o = getPlatform(),
    n = o === "macos",
    watch = Ok.watch(nwe(), {
      ignoreInitial: !0,
      depth: 0,
      usePolling: n,
      interval: 100,
      ignored: (h) => isTempFileName(basename_2(h)) || basename_2(h) === "rejected",
      ...(o === "windows" && { awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 20 } }),
    });
  return (
    watch.on("add", (h) => {
      (isStorageV5Enabled() && e !== void 0
        ? ingestDispatchName(e, basename_2(h), r)
        : ingestDispatchFile(h, r)
      ).catch((S) => logForDebugging(`[bg-dispatch] ${S}`, { level: "error" }));
    }),
    watch.on("error", (h) => {
      (logForDebugging(`[bg-dispatch] watcher error: ${h}`, { level: "error" }),
        logEvent("tengu_bg_dispatch_watcher_failed", {
          errno: sanitizeErrnoForTelemetry(h) ?? lit("unknown"),
        }));
    }),
    await withTimeout(once(watch, "ready"), 5000, "chokidar ready").catch((h) =>
      logForDebugging(`[bg-dispatch] watcher ready wait: ${h}`),
    ),
    await drainDispatchQueue(r, e).catch((h) => {
      (logForDebugging(`[bg-dispatch] cold-start drain: ${h}`, { level: "error" }),
        logEvent("tengu_bg_dispatch_watcher_failed", {
          errno: sanitizeErrnoForTelemetry(h) ?? lit("unknown"),
        }));
    }),
    { close: () => watch.close() }
  );
}
//@ chunk-ss669z1x.js:20817-20919 placement
var pr = 3600000,
  Qe = 60000,
  bt = 28800000,
  fr = 28800000,
  xe = 60000,
  mr = 2000,
  gr = 300000,
  hr = 2000,
  yt = 1000,
  wr = new Set();
//@ chunk-ss669z1x.js:20919-20975 placement
function Ze(r) {
  return readPinnedJobIds(r).catch((e) => (logError(e), new Set()));
}
/**
 * 后台会话管理器主循环：派发、PTY 启动、会话结算、保活。
 */
//@ chunk-ss669z1x.js:20975-34603 placement
async function runBgManagerLoop(r, e = {}) {
  let o,
    n,
    i = new Map(),
    h = async () => {
      let S = new Set(),
        u = e.spawnPty ?? createPtyHostSpawner(),
        y = e.onKeepAliveChange ?? (() => {}),
        D = (p, T, K) => o?.noteSettledDispatch(p, T, K),
        E = !1,
        L = !1,
        withResolvers = Promise.withResolvers(),
        R = null,
        w = !1,
        A = { logged: !1 },
        U = !1,
        re = !1,
        X = e.spawnPty === void 0,
        Q = () => {
          if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_spare_enable", !0)) {
            if (R) (R.dispose(), (R = null));
            return;
          }
          if (isLowMemory()) {
            if (R) (R.dispose(), (R = null));
            return;
          }
          if (!re || R || U || w || E || !L || !u || !X || getPlatform() === "windows") return;
          U = !0;
          let p = null,
            T = !1;
          spawnSpare({
            log: r,
            launcherNotRunnableEpisode: A,
            credentials: e.credentials,
            onExit: (K) => {
              if (K) w = !0;
              if (p === null) {
                T = !0;
                return;
              }
              if (R === p) {
                R = null;
                let oe = processWrapperArgv().length > 0 ? Xit : hr;
                if (Date.now() - p.startedAt >= oe) Q();
              }
            },
          })
            .then((K) => {
              if (((p = K), !K || E || T)) {
                K?.dispose();
                return;
              }
              ((R = K), logEvent("tengu_bg_spare_spawn", {}));
            })
            .catch((K) => {
              if (isSyscallError(K)) {
                logForDebugging(`bg-spare spawn failed: ${getErrnoCode(K)} ${K.message}`, { level: "warn" });
                return;
              }
              logError(K);
            })
            .finally(() => {
              U = !1;
            });
        },
        now = Date.now(),
        le = async (p, T = 0, K, oe = !1) => {
          if (E) return "closed";
          re = !0;
          let me = oe;
          if (T === 0 && !K) {
            try {
              await withTimeout(access(p.cwd), yt, `bg: cwd probe timed out for ${p.short}`);
            } catch (error) {
              me = isENOENT(error);
            }
            if (E) return "closed";
          }
          if (me && !i.has(p.short) && T > 0) {
            try {
              (await withTimeout(access(p.cwd), yt, `bg: cwd re-probe timed out for ${p.short}`), (me = !1));
            } catch (error) {
              me = isENOENT(error);
            }
            if (E) return "closed";
          }
          if (me && !i.has(p.short)) {
            let s = Vuo(p.cwd);
            if (
              (r(`bg refused ${p.short} (${p.source}): ${s}`),
              logEvent("tengu_bg_spawn_cwd_gone", {
                short: bgShort(p.short),
                attempt: 0,
                via: fromEnum("dispatch"),
              }),
              logFeatureSad("daemon_bg_session_create", "cwd_gone"),
              p.nonce)
            )
              D(p.short, p.nonce, s);
            return "refused";
          }
          let he = !1;
          if (isProviderManagedByHost(p) && !i.has(p.short))
            try {
              await ensureJobsDir(e.storageV5);
              let s = encodeHostLineage(p.env);
              if (e.storageV5) await writeHostTombstone(e.storageV5, p.short, s);
              else await writeFile(ePe(p.short), s);
              he = !0;
            } catch (error) {
              return (
                logError(error),
                logFeatureBad("daemon_bg_session_create", "host_tombstone_write"),
                "dropped"
              );
            }
          let pe = i.get(p.short);
          if (pe) {
            if ((pe.isKilling || pe.isRetiring || pe.record.outcome) && T < 30) {
              if (T === 15 && (pe.isKilling || pe.isRetiring))
                (logEvent("tengu_bg_dispatch_sigkill_escalate", {}), pe.kill("SIGKILL"));
              return (await sleep(100), le(p, T + 1, K, me));
            }
            let s = pe.isKilling || pe.isRetiring || pe.record.outcome;
            if (he && !isProviderManagedByHost(pe.dispatch))
              if (e.storageV5) await Ttn(e.storageV5, p.short);
              else await unlink_2(ePe(p.short)).catch(() => {});
            if (
              (r(
                s
                  ? `bg: dispatch ${p.short} dropped \u2014 retry budget exhausted (handle still settling)`
                  : `bg: dup dispatch ${p.short} dropped (existing handle still live)`,
              ),
              s)
            )
              return (logFeatureBad("daemon_bg_session_create", "dup_retry_exhausted"), "dropped");
            return (logFeatureOk("daemon_bg_session_create"), "dup-live");
          }
          if (!isProviderManagedByHost(p))
            if (e.storageV5) Ttn(e.storageV5, p.short);
            else unlink_2(ePe(p.short)).catch(() => {});
          let { lowMem: lowMem, level: level } = getLowMemoryState();
          if (lowMem && i.size > 0) {
            let s = Date.now() - now;
            if (s > xe * 2)
              r(
                `bg: low memory but sweep anchor is ${Math.round(s / 1000)}s stale (host slept?) \u2014 deferring eager retire to the next sweep tick`,
              );
            else {
              let rounded = Math.round(freemem() / 1024 / 1024);
              (r(
                `bg: low memory (${level !== void 0 ? `macOS memorystatus pressure level ${level}` : `${rounded}MB free`}) \u2014 retiring settled workers before spawning ${p.short}`,
              ),
                logEvent("tengu_bg_dispatch_low_mem", {
                  free_mb: rounded,
                  handles: i.size,
                  pressure_level: level,
                }),
                Ze(e.storageV5).then((G) => {
                  for (let de of i.values())
                    de.retireIfSettled(Qe, G)
                      .then((Se) => retireIdleWorker(r, de, Se, "low memory"))
                      .catch((Se) => logError(Se));
                }));
            }
          }
          if (p.source === "spare" && lowMem)
            return (r(`bg: low memory \u2014 skipping spare dispatch ${p.short}`), "dropped");
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
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_spare_enable", !0)
          ) {
            let s = R;
            R = null;
            try {
              let M = claimSpare(p, s, u, e.getAuthSnapshot, e.storageV5, e.credentials);
              return (
                i.set(p.short, M),
                onBgSessionSettled(i, M, y, S, r, {
                  storageV5: e.storageV5,
                  credentials: e.credentials,
                  noteSettled: D,
                }),
                we(
                  S,
                  updateRoster((G) => {
                    G.workers[p.short] = M.rosterEntry();
                  }, e.storageV5).catch((G) => logError(G)),
                ),
                y(),
                logEvent("tengu_bg_spare_claim", { age_ms: Date.now() - s.startedAt }),
                r(`bg claimed-spare ${p.short} (${p.source})`),
                logFeatureOk("daemon_bg_session_create"),
                Q(),
                "claimed"
              );
            } catch (error) {
              let G = getErrnoCode(error),
                de =
                  G === "ENOENT"
                    ? "enoent"
                    : G === "ECONNREFUSED"
                      ? "econnrefused"
                      : error instanceof Error
                        ? "error"
                        : "unknown";
              (logEvent("tengu_bg_spare_claim_fail", { reason: fromEnum(de) }), s.dispose());
            }
          }
          let child = DaemonSupervisor.spawn(
            p,
            u,
            e.getAuthSnapshot,
            K ? { afterUpgrade: K } : void 0,
            e.storageV5,
            e.credentials,
          );
          return (
            i.set(p.short, child),
            onBgSessionSettled(i, child, y, S, r, {
              storageV5: e.storageV5,
              credentials: e.credentials,
              noteSettled: D,
            }),
            y(),
            Q(),
            r(`bg spawned ${p.short} (${p.source})`),
            logFeatureOk("daemon_bg_session_create"),
            "spawned"
          );
        },
        _e = (p = "SIGTERM") => {
          let T = 0;
          for (let K of i.values()) if (!K.record.outcome) (K.kill(p), T++);
          return T;
        };
      (await ensureDaemonRuntimeDir(), await ensureDaemonDir());
      let q = await handleDaemonLease(
        i,
        le,
        e.onNudge ?? (async () => ({ restarting: !1, upgradePending: !1 })),
        (p) => {
          let T = p ? _e("SIGTERM") : 0;
          return (e.onShutdown?.(), T);
        },
        () => L,
        e.onYield ?? (() => !1),
        withResolvers.promise,
        e.storageV5,
      );
      ((o = q),
        r(`bg: control socket bound at ${$A(Z6())}`),
        q.onLeaseChange.subscribe(y),
        q.onLeaseChange.subscribe(({ op: op, client: client }) => {
          if (client?.label === CLOUD_SESSION_LEASE_LABEL) {
            r(
              `bg lease ${op}: ${client.label} ${client.cloudSessionId ?? "(no session id)"} pid=${client.pid} (leases=${q.leaseCount()})`,
            );
            return;
          }
          if (q.leaseCount() > 0 && !re) ((re = !0), Q());
        }),
        await Promise.all(
          getPlatform() === "windows"
            ? [ensureDaemonStateDir(e.storageV5)]
            : [
                mkdir(X3r(), { recursive: !0, mode: 448 }).catch(() => {}),
                mkdir(UTt(), { recursive: !0, mode: 448 }).catch(() => {}),
              ],
        ),
        cleanupStaleDaemonDirs());
      let Z = await readRoster(void 0, e.storageV5),
        B = 0,
        V = 0,
        x = 0,
        ee = 0,
        ae = 0,
        W = 0,
        ge = Z.updatedAt > 0 && Date.now() - Z.updatedAt > ABANDONED_WORKER_MS;
      if (
        (await Promise.all(
          Object.entries(Z.workers).map(async ([p, T]) => {
            let K;
            try {
              K = await DaemonSupervisor.adopt(p, T, u, e.getAuthSnapshot, e.storageV5, e.credentials);
            } catch (error) {
              (logError(redactErrorPaths(error)), V++);
              return;
            }
            if (!K && T.procStart === void 0 && T.ptySock && (await pingPtySocket(T.ptySock))) {
              T.procStart = await withDeadline(getProcessStartTimeAsync(T.pid), MIN_POLL_MS);
              try {
                K = await DaemonSupervisor.adopt(p, T, u, e.getAuthSnapshot, e.storageV5, e.credentials);
              } catch (error) {
                (logError(redactErrorPaths(error)), (K = null));
              }
              K ??= DaemonSupervisor.unverified(p, T, e.storageV5, e.credentials);
            }
            if (K)
              (i.set(p, K),
                onBgSessionSettled(i, K, y, S, r, {
                  storageV5: e.storageV5,
                  credentials: e.credentials,
                  noteSettled: D,
                }),
                B++);
            else if (
              T.pendingRespawn === "upgrade" &&
              !lmt(
                T.cliVersion,
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
              ) &&
              !ge
            )
              (W++,
                logEvent("tengu_bg_adopt_upgrade_respawn", {}),
                le(T.dispatch, 0, !0).catch((oe) => logError(oe)));
            else {
              V++;
              let oe = !1;
              if (T.pendingRespawn === "upgrade" && ge) (ee++, (oe = !0));
              let me = await readExecExitStatus(T.ptySock, T.dispatch),
                he = me ?? { state: "failed", detail: "process gone while supervisor was down" };
              if (
                (await writeReapedTerminalState(
                  p,
                  he.state,
                  he.detail,
                  { resumable: me ? void 0 : "auto-resume" },
                  e.storageV5,
                )) === "dead-epoch"
              )
                (x++, (oe = !0));
              if (oe) ae++;
              if (e.credentials) e.credentials.discardSpentCredentialFile(FTt(p)).catch(() => {});
              else unlink_2(FTt(p)).catch(() => {});
              if (getPlatform() === "windows")
                if (e.storageV5) deletePtyPidRecords(e.storageV5, p, T.ptySock);
                else
                  (unlink_2(owe(p)).catch(() => {}),
                    unlink_2(JC(FA(p))).catch(() => {}),
                    unlink_2(xN(FA(p))).catch(() => {}),
                    unlink_2(getExecExitPath(T.ptySock ?? FA(p))).catch(() => {}));
              else {
                if (e.credentials) e.credentials.discardSpentCredentialFile($Tt(p)).catch(() => {});
                else unlink_2($Tt(p)).catch(() => {});
                if ((unlink_2(T.rendezvousSock).catch(() => {}), T.ptySock)) {
                  (unlink_2(T.ptySock).catch(() => {}),
                    unlink_2(JC(T.ptySock)).catch(() => {}),
                    unlink_2(xN(T.ptySock)).catch(() => {}),
                    unlink_2(getExecExitPath(T.ptySock)).catch(() => {}),
                    await reapDetachedRepl(T.replPid, T.replProcStart));
                  try {
                    process.kill(T.pid, 0);
                  } catch {
                    sigtermThenKill([-T.pid]);
                  }
                }
              }
            }
          }),
        ),
        B + V + W > 0)
      )
        if (
          (r(
            `bg adopt: adopted=${B} respawned=${W} dead=${V}` +
              (x > 0 ? ` dead_epoch=${x}` : "") +
              (ee > 0
                ? ` upgrade_skipped=${ee} (previous roster written ${Math.round((Date.now() - Z.updatedAt) / 86400000)}d ago)`
                : ""),
          ),
          logEvent("tengu_bg_adopt", {
            adopted: B,
            respawned: W,
            dead: V,
            dead_epoch: x,
            upgrade_skipped: ee,
          }),
          V - ae === 0)
        )
          logFeatureOk("daemon_bg_adopt");
        else if (B > 0 || W > 0) logFeatureSad("daemon_bg_adopt", "partial");
        else logFeatureBad("daemon_bg_adopt", "all_workers_dead");
      let ce = await readDaemonLock(e.storageV5).catch(() => null),
        se = ce?.pid === process.pid,
        ve = !(ce !== null && ce.pid !== process.pid) && !(e.isShuttingDown?.() ?? !1);
      if (!se)
        r(
          `bg: skipped post-adopt sweeps + roster rewrite \u2014 daemon.lock is ${ce ? `held by pid ${ce.pid}` : "absent"} (yield/handover in flight)`,
        );
      if (se && !Z.parseFailed) reapStaleSockets(i, r, { storageV5: e.storageV5 });
      if (se && !Z.parseFailed) await reapOrphanSpares(i, r);
      if (se && !Z.inspectFailed)
        await updateRoster((p) => {
          p.workers = {};
          for (let [T, K] of i) p.workers[T] = K.rosterEntry();
        }, e.storageV5).catch((p) => logError(p));
      let Ee = ve ? await St((p) => void le(p).catch((T) => logError(T)), e.storageV5) : null;
      if (((n = Ee ?? void 0), (L = ve), ve)) withResolvers.resolve();
      if ((y(), ve && i.size > 0)) re = !0;
      if ((Q(), ve)) Oe().catch((p) => logError(p));
      now = Date.now();
      let Re = !1,
        Pe = setInterval(
          async (p, T) => {
            if (Re) return;
            Re = !0;
            try {
              await ze(p, T);
            } finally {
              Re = !1;
            }
          },
          xe,
          i,
          Q,
        );
      async function ze(p, T) {
        {
          let now_2 = Date.now(),
            oe = now_2 - now - xe;
          if (((now = now_2), oe > xe)) {
            for (let s of p.values()) s.shiftGraceClocksForward(oe);
            T();
            return;
          }
          let me = isLowMemory(),
            he = me ? Qe : pr,
            pe = me ? Qe : fr,
            ke = await Ze(e.storageV5);
          for (let s of p.values())
            if (ke.has(s.dispatch.short)) s.respawnIfIdleStale(ke).catch((M) => logError(M));
          let results = await Promise.all(
              [...p.values()].map((s) =>
                s
                  .retireIfSettled(he, ke, pe)
                  .then((M) => retireIdleWorker(r, s, M, me ? "low memory" : ""))
                  .catch((M) => (logError(M), !1)),
              ),
            ),
            $e = count(results, (s) => s);
          if (me && $e === 0 && isLowMemory()) {
            let results = await Promise.all(
              [...p.values()].map((M) =>
                M.retireIfSettled(bt, ke, bt, { shedMonitoringOnly: !0 })
                  .then((G) => retireIdleWorker(r, M, G, "low memory, monitoring only"))
                  .catch((G) => (logError(G), !1)),
              ),
            );
            $e += count(results, (M) => M);
          }
          if (me && $e === 0 && isLowMemory()) {
            let filtered = [...p.values()].filter((M) => ke.has(M.dispatch.short));
            if (filtered.length > 0) {
              (r(
                "bg: low memory persists after shedding non-pinned \u2014 retiring pinned settled workers as a last resort",
              ),
                logEvent("tengu_bg_retire_pinned_low_mem", {}));
              for (let M of filtered)
                M.retireIfSettled(he, wr, pe)
                  .then((G) => retireIdleWorker(r, M, G, "low memory, pinned"))
                  .catch((G) => logError(G));
            }
          }
          if (!me && hho()) {
            let s = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_prewarm_per_sweep", 3),
              M = 12;
            for (let G of p.values()) {
              if (s <= 0 || M <= 0) break;
              if (ke.has(G.dispatch.short)) continue;
              if (G.isUnverified) continue;
              if (G.isBooting) {
                s--;
                continue;
              }
              if (!G.isVersionStale) continue;
              if (G.dispatch.launch.mode === "exec") continue;
              if (
                lmt(
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
                  await G.respawnIfIdleStale(void 0, "prewarm").catch(
                    (Se) => (logError(Se), { respawned: !1 }),
                  )
                ).respawned
              )
                s--;
              else M--;
            }
          }
          T();
        }
      }
      Pe.unref();
      async function Oe() {
        let p = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_prewarm_burst_delay_ms", 15000);
        if ((await sleep(p, void 0, { unref: !0 }), E)) return;
        let T = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_prewarm_burst_concurrency", 3);
        if (T <= 0 || !hho()) return;
        let K = await Ze(e.storageV5),
          oe = new Set(
            [...i.values()].filter(
              (G) =>
                !G.record.outcome &&
                !G.isUnverified &&
                G.isVersionStale &&
                G.dispatch.launch.mode !== "exec" &&
                !K.has(G.dispatch.short),
            ),
          );
        if (oe.size === 0) return;
        let size = oe.size,
          now_2 = Date.now(),
          pe = 0,
          ke = 0,
          De = 0,
          $e = !1,
          s = !1,
          M = now_2 + gr;
        while (oe.size > 0 && Date.now() < M && !E) {
          if (Date.now() - now > xe * 2) {
            s = !0;
            break;
          }
          if (isLowMemory()) {
            $e = !0;
            break;
          }
          let G = T - count([...i.values()], (de) => de.isBooting && !de.isUnverified);
          for (let de of oe) {
            if (G <= 0) break;
            if ((oe.delete(de), de.isBooting)) {
              De++;
              continue;
            }
            if (
              (await de.respawnIfIdleStale(void 0, "burst").catch((Ut) => (logError(Ut), { respawned: !1 })))
                .respawned
            )
              (pe++, G--);
            else ke++;
          }
          if (oe.size === 0) break;
          await sleep(mr, void 0, { unref: !0 });
        }
        (r(
          `bg: post-takeover prewarm burst \u2014 respawned ${pe}/${size} stale workers` +
            (ke > 0 ? `, ${ke} refused` : "") +
            ($e ? `, stopped on low memory (${oe.size} left)` : "") +
            (s ? `, deferred to sweep on stale anchor \u2014 host slept? (${oe.size} left)` : "") +
            ` in ${Math.round((Date.now() - now_2) / 1000)}s`,
        ),
          logEvent("tengu_bg_prewarm_burst", {
            candidates: size,
            respawned: pe,
            refused: ke,
            alreadyBooting: De,
            remaining: oe.size,
            lowMemStop: $e,
            sweepStaleStop: s,
            durationMs: Date.now() - now_2,
          }));
      }
      return {
        handles: i,
        dispatch: (p) => void le(p).catch((T) => logError(T)),
        leaseCount: q.leaseCount,
        announceExit: q.announceExit,
        liveHandleCount: () => {
          let p = 0;
          for (let T of i.values()) if (!T.record.outcome) p++;
          return p;
        },
        snapshotConsumerCount: () => {
          let p = 0;
          for (let T of i.values()) if (!T.record.outcome && shouldCarryAuth(T.dispatch)) p++;
          return p;
        },
        pendingSettleWrites: () => S.size,
        killAll: _e,
        close: async (p) => {
          let T = p?.displaced ?? !1;
          if (((E = !0), clearInterval(Pe), R)) (R.dispose(), (R = null));
          await Promise.all([
            Ee?.close().catch(() => {}),
            q.close({ skipUnlink: T || p?.skipPathCleanup }).catch(() => {}),
          ]);
          for (let K of i.values()) K.stop();
          if (
            (await Promise.allSettled([...S]),
            !T && i.size === 0 && !Z.parseFailed && !p?.skipPathCleanup && getPlatform() !== "windows")
          )
            await rm_2(getDaemonRuntimeDir(), { recursive: !0, force: !0 }).catch(() => {});
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
    for (let y of i.values()) y.stop();
    await n?.close().catch(() => {});
    let u = await readDaemonLock(e.storageV5).catch(() => null);
    throw (await o?.close(u?.pid === process.pid ? void 0 : { skipUnlink: !0 }).catch(() => {}), error);
  }
}
/**
 * 后台会话结束时记录结果、通知并清理。
 */
//@ chunk-ss669z1x.js:34603-38486 placement
function onBgSessionSettled(r, e, o, n, i, h) {
  (e.onSettle.subscribe((S) => {
    let u = getJobDir(e.record.short),
      y = S === "done" ? "done" : S === "killed" ? "stopped" : "failed",
      detail = e.record.detail,
      sessionIdTaken = e.sessionIdTaken,
      L =
        S === "crashed" && detail
          ? $A(detail.replace(/; respawning$/, "")).replace(/\s*\n\s*/g, " \xB7 ")
          : "";
    if ((i(`bg settled ${e.record.short} (${S})${L ? `: ${L}` : ""}`), e.shouldDeleteJobDir))
      we(
        n,
        h.storageV5 && u === getJobDir(e.record.short)
          ? deleteJobScope(h.storageV5, e.record.short, u, (R) =>
              logError(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `jobdir retire deleteScope: ${R}`,
                  "jobdir retire deleteScope failed",
                ),
              ),
            ).catch((R) => logError(R))
          : rm_2(u, { recursive: !0, force: !0 }).catch((R) => logError(R)),
      );
    else if (S === "killed" && e.isHandoffKill)
      logEvent("tengu_bg_handoff_settle", { jobSessionId: ye(e.record.sessionId) });
    else
      we(
        n,
        readJobState(u, h.storageV5)
          .then((R) => {
            if (
              R
                ? (isSettled(R) && !(S === "crashed" && R.state === "failed")) ||
                  (S === "done" && R.state === "blocked" && e.dispatch.launch.mode !== "exec")
                : S !== "crashed" || e.dispatch.source === "spare"
            ) {
              if (!R && e.dispatch.source === "spare") {
                if (h.storageV5 && u === getJobDir(e.record.short))
                  return h.storageV5.statMeta(STORAGE_SPACES.job(e.record.short, ["state.json"])).then(
                    (U) =>
                      !U.ok && U.error.code === "NotFound"
                        ? deleteJobScope(h.storageV5, e.record.short, u, (re) =>
                            logError(
                              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                                `spare-sweep deleteScope: ${re}`,
                                "spare-sweep deleteScope failed",
                              ),
                            ),
                          ).catch((re) => logError(re))
                        : void 0,
                    () => {
                      return;
                    },
                  );
                return access(join(u, "state.json")).then(
                  () => {
                    return;
                  },
                  (U) =>
                    getErrnoCode(U) === "ENOENT"
                      ? rm_2(u, { recursive: !0, force: !0 }).catch((re) => logError(re))
                      : void 0,
                );
              }
              return;
            }
            let iso = new Date().toISOString(),
              A = R ?? {
                state: "working",
                detail: "",
                tempo: "active",
                output: null,
                children: null,
                linkScanOffset: 0,
                template:
                  e.dispatch.launch.mode === "exec"
                    ? "exec"
                    : (e.dispatch.agent ?? e.dispatch.routine ?? "bg"),
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
              u,
              {
                ...A,
                state: y,
                detail: y === "stopped" ? "stopped" : (detail || A.detail).replace(/; respawning$/, ""),
                tempo: "idle",
                inFlight: void 0,
                needs: void 0,
                block: void 0,
                ...(sessionIdTaken && { sessionIdTaken: !0 }),
                updatedAt: iso,
                firstTerminalAt: A.firstTerminalAt ?? iso,
              },
              h.storageV5,
            );
          })
          .catch((R) => logError(R)),
      );
    if (
      (we(
        n,
        updateRoster((R) => {
          delete R.workers[e.record.short];
        }, h.storageV5).catch((R) => logError(R)),
      ),
      h.credentials)
    )
      we(
        n,
        h.credentials.discardSpentCredentialFile(FTt(e.record.short)).catch(() => {}),
      );
    else
      we(
        n,
        unlink_2(FTt(e.record.short)).catch(() => {}),
      );
    let rosterEntry = e.rosterEntry();
    if (getPlatform() === "windows")
      if (h.storageV5) we(n, deletePtyPidRecords(h.storageV5, e.record.short, rosterEntry.ptySock));
      else
        (we(
          n,
          unlink_2(owe(e.record.short)).catch(() => {}),
        ),
          we(
            n,
            unlink_2(JC(FA(e.record.short))).catch(() => {}),
          ),
          we(
            n,
            unlink_2(xN(FA(e.record.short))).catch(() => {}),
          ),
          we(
            n,
            unlink_2(getExecExitPath(rosterEntry.ptySock ?? FA(e.record.short))).catch(() => {}),
          ));
    else {
      if (h.credentials)
        we(
          n,
          h.credentials.discardSpentCredentialFile($Tt(e.record.short)).catch(() => {}),
        );
      else
        we(
          n,
          unlink_2($Tt(e.record.short)).catch(() => {}),
        );
      if (
        (we(
          n,
          unlink_2(rosterEntry.rendezvousSock).catch(() => {}),
        ),
        rosterEntry.ptySock)
      )
        (we(
          n,
          unlink_2(rosterEntry.ptySock).catch(() => {}),
        ),
          we(
            n,
            unlink_2(JC(rosterEntry.ptySock)).catch(() => {}),
          ),
          we(
            n,
            unlink_2(xN(rosterEntry.ptySock)).catch(() => {}),
          ),
          we(
            n,
            unlink_2(getExecExitPath(rosterEntry.ptySock)).catch(() => {}),
          ));
    }
    if (e.dispatch.launch.mode === "exec" && S !== "killed") {
      (o(),
        setTimeout(
          (w, A, U) => {
            if (w.get(A) === U) w.delete(A);
          },
          300000,
          r,
          e.record.short,
          e,
        ).unref());
      return;
    }
    if (e.record.nonce) h.noteSettled(e.record.short, e.record.nonce);
    (r.delete(e.record.short), o());
  }),
    e.onState.subscribe((S) => {
      if (S.pid)
        we(
          n,
          updateRoster((u) => {
            u.workers[e.record.short] = e.rosterEntry();
          }, h.storageV5).catch((u) => logError(u)),
        );
      if (S.state === "crashed" || S.state === "resuming") {
        let state = S.state,
          detail = e.record.detail,
          D = state === "crashed" ? "idle" : "active",
          E = getJobDir(e.record.short),
          L = readJobState(E, h.storageV5)
            .then((P) => {
              if (e.record.outcome || !P || isSettled(P) || P.state === "blocked" || P.tempo === "blocked")
                return;
              if (state === "resuming" && P.state !== "crashed") return;
              return writeStateAtomic(
                E,
                {
                  ...P,
                  state: state,
                  detail: detail,
                  tempo: D,
                  inFlight: void 0,
                  updatedAt: new Date().toISOString(),
                },
                h.storageV5,
              );
            })
            .catch((P) => logError(P));
        we(n, L);
      }
    }));
}
/**
 * 清理失效的会话 socket/pid 文件。
 */
//@ chunk-ss669z1x.js:38486-39851 placement
async function reapStaleSockets(r, e, o = {}) {
  let n = getPlatform() === "windows",
    [i, h] = n ? [Xot(), ".pid"] : [UTt(), ".sock"],
    S = n && o.storageV5 ? await listStoredPtyPids(o.storageV5) : await readdir(i).catch(() => []),
    u = new Set(S.filter((D) => D.endsWith(h))),
    y = 0;
  for (let D of S) {
    if (!D.endsWith(h)) {
      let found = (n ? [".err", ".late", ".err.read"] : [".err", ".late", ".exec-exit", ".err.read"]).find(
        (w) => D.endsWith(n ? w : `.sock${w}`),
      );
      if (found) {
        let sliced = D.slice(0, -found.length),
          A = n ? sliced.lastIndexOf("-pty-") : -1,
          U = n ? (A >= 0 ? `${sliced.slice(A + 5)}.pid` : "") : sliced;
        if (U && !u.has(U))
          if (n && o.storageV5) o.storageV5.delete(STORAGE_SPACES.daemon(["pty-pids", D])).catch(() => {});
          else unlink_2(join(i, D)).catch(() => {});
      }
      continue;
    }
    let sliced = D.slice(0, -h.length);
    if (r.has(sliced)) continue;
    y++;
    let L = owe(sliced);
    killViaPtySocket(FA(sliced), o.storageV5).then((P) => {
      let R = JC(FA(sliced)),
        w = xN(FA(sliced)),
        A = getExecExitPath(FA(sliced));
      if (!n) {
        (writeReapedTerminalState(
          sliced,
          "failed",
          "reaped (roster gap)",
          { resumable: "wake-only" },
          o.storageV5,
        ),
          unlink_2(w).catch(() => {}),
          unlink_2(A).catch(() => {}));
        return;
      }
      let U = () => {
        if (o.storageV5) deletePtyPidRecords(o.storageV5, sliced, void 0);
        else
          (unlink_2(L).catch(() => {}),
            unlink_2(R).catch(() => {}),
            unlink_2(w).catch(() => {}),
            unlink_2(A).catch(() => {}));
      };
      if (P) {
        (writeReapedTerminalState(
          sliced,
          "failed",
          "reaped (roster gap)",
          { resumable: "wake-only" },
          o.storageV5,
        ),
          U());
        return;
      }
      (o.storageV5 ? readStoredPtyPid(o.storageV5, sliced) : readSmallFileOrNull(L, Rtn))
        .then((re) => {
          if (re === null) return;
          if (!isProcessRunning(Number(re)))
            (writeReapedTerminalState(
              sliced,
              "failed",
              "reaped (roster gap)",
              { resumable: "wake-only" },
              o.storageV5,
            ),
              U());
        })
        .catch(() => {});
    });
  }
  if (y) (e(`bg orphan-reap: ${y} roster-less pty host(s)`), logEvent("tengu_bg_orphan_reap", { reaped: y }));
}
//@ chunk-ss669z1x.js:39851-39900 placement
var kr = { namespace: "daemon", relPath: ["pty-pids"] };
//@ chunk-ss669z1x.js:39900-40001 placement
async function ensureJobsDir(r) {
  if (isStorageV5Enabled() && r !== void 0) {
    await ensureTombstoneScope(r);
    return;
  }
  await mkdir(jwn(), { recursive: !0, mode: 448 });
}
//@ chunk-ss669z1x.js:40001-40138 placement
async function ensureDaemonStateDir(r) {
  if (isStorageV5Enabled() && r !== void 0) {
    await r.ensureScope(kr).catch(() => {
      return;
    });
    return;
  }
  await mkdir(Xot(), { recursive: !0 }).catch(() => {});
}
//@ chunk-ss669z1x.js:40138-40290 placement
async function deletePtyPidRecords(r, e, o) {
  for (let n of [
    basename(owe(e)),
    basename(JC(FA(e))),
    basename(xN(FA(e))),
    basename(getExecExitPath(o ?? FA(e))),
  ])
    await r.delete(STORAGE_SPACES.daemon(["pty-pids", n])).catch(() => {});
}
//@ chunk-ss669z1x.js:40290-40429 placement = convertDirectoryToZipInPlace (1)
async function removeIfNotDirectory(r) {
  let e = await lstat(r).catch(() => null);
  if (e === null || e.isDirectory()) return !1;
  return (await rm_2(r, { recursive: !0, force: !0 }), !0);
}
/**
 * 删除后台任务的存储作用域（名字配错）。
 */
//@ chunk-ss669z1x.js:40429-40556 placement
async function deleteJobScope(r, e, o, n) {
  if (await removeIfNotDirectory(o)) return;
  let deleteScope = await r.deleteScope({ namespace: "job", jobId: e });
  if (!deleteScope.ok) n(deleteScope.error.code);
}
//@ chunk-ss669z1x.js:40556-40590 placement
var yr = /^[0-9A-Za-z.+_-]{1,100}$/;
/**
 * 空闲超时或版本过旧时退役 worker。
 */
//@ chunk-ss669z1x.js:40590-41418 placement
function retireIdleWorker(r, e, o, n) {
  if (!o.retired) return !1;
  let rounded = Math.round(o.idleMs / 60000),
    h = rounded >= 120 ? `${Math.round(rounded / 60)}h` : `${rounded}m`,
    S = e.record.cliVersion && yr.test(e.record.cliVersion) ? e.record.cliVersion : "unrecognized",
    u = e.isVersionStale
      ? `, worker ${S} (daemon ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION})`
      : "";
  return (r(`bg retire ${e.record.short}: ${o.cause}, idle ${h}${u}${n ? ` [${n}]` : ""}`), !0);
}
//@ chunk-ss669z1x.js:41418-41471 placement
function we(r, e) {
  (r.add(e), e.finally(() => r.delete(e)));
}
//@ chunk-ss669z1x.js:41592-41659 placement
var Pr = 60000,
  Ar = 5000,
  Ir = 300000,
  Cr = 30000,
  Tr = 60000,
  Ke = 2000,
  Mr = 300000;
//@ chunk-ss669z1x.js:41659-41715 placement
function At(r) {
  return Math.round(r * (0.5 + Math.random()));
}
//@ chunk-ss669z1x.js:41715-41764 placement
function xr(r) {
  return At(Math.min(1000 * 2 ** r, Ir));
}
//@ chunk-ss669z1x.js:41764-41783 placement
var weakMap = new WeakMap();
/**
 * daemon 子 worker 进程管理（启动、崩溃退避、停止、忙碌状态）。
 */
//@ chunk-ss669z1x.js:41783-47596 placement
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
  stopping = !1;
  consecutiveCrashes = 0;
  temporaryEndsInARow = 0;
  backoffTimer = null;
  wrapperParkLogged = !1;
  exitPromise = null;
  lastBusy = !1;
  lastBusyAt = 0;
  constructor(r, e, o, n, i, h, S) {
    this.id = r;
    this.kind = e;
    this.config = o;
    this.invocation = n;
    this.logger = i;
    this.authManager = h;
    this.onStateChange = S;
  }
  get status() {
    let r = this.child?.pid;
    if (r === void 0) return null;
    let e = { pid: r, startedAt: this.spawnedAt },
      o = dirFieldOf(this.config),
      n = weakMap.get(this) ?? 0;
    if (n > 0 && o !== void 0) e.servedFolder = { dir: o, sessions: n };
    return e;
  }
  isBusy() {
    return this.lastBusy && this.child !== null && Date.now() - this.lastBusyAt < Mr;
  }
  start(r = 0) {
    if (((this.stopping = !1), r > 0)) this.scheduleRespawn(r);
    else this.spawn();
  }
  updateConfig(r) {
    this.config = r;
  }
  async stop(r) {
    if (((this.stopping = !0), (this.temporaryEndsInARow = 0), this.backoffTimer))
      (clearTimeout(this.backoffTimer), (this.backoffTimer = null));
    let child = this.child;
    if (!child) return;
    let exitPromise = this.exitPromise,
      n = !1;
    if (typeof child.send === "function")
      try {
        n = child.send(r !== void 0 ? { type: "shutdown", cause: r } : { type: "shutdown" });
      } catch {}
    if (getPlatform() !== "windows" || !n) child.kill("SIGTERM");
    let i = setTimeout((h) => h.kill("SIGKILL"), Ar, child);
    if ((i.unref(), exitPromise)) await exitPromise;
    clearTimeout(i);
  }
  spawn() {
    let r = processWrapperError();
    if (r) {
      if ((this.logger.write(this.id, `not started: ${r}`), !this.wrapperParkLogged))
        ((this.wrapperParkLogged = !0), logFeatureBad("agent_launcher", "registry_worker_refused"));
      this.scheduleRespawn(Tr);
      return;
    }
    let now = Date.now();
    this.spawnedAt = now;
    let o = withProcessWrapper(this.invocation),
      n = spawn_2(
        o.cmd,
        [
          ...o.prefixArgs,
          "--daemon-worker",
          this.kind,
          ...(this.temporaryEndsInARow > 0 ? [String(this.temporaryEndsInARow)] : []),
        ],
        {
          stdio: this.authManager ? ["pipe", "pipe", "pipe", "ipc"] : ["pipe", "pipe", "pipe"],
          windowsHide: !0,
        },
      );
    if (
      ((this.child = n),
      this.onStateChange?.(),
      n.stdin.on("error", (u) => {
        this.logger.write(this.id, `stdin write error: ${u.message}`);
      }),
      n.stdin.write(
        jsonStringify({ config: this.config, initialAccessToken: this.authManager?.getAccessToken() }) +
          `
`,
      ),
      n.stdin.end(),
      this.authManager)
    )
      this.authManager.attachWorker(n);
    n.on("message", (u) => {
      if (
        this.child === n &&
        typeof u === "object" &&
        u !== null &&
        "type" in u &&
        u.type === "rc_busy" &&
        "busy" in u &&
        typeof u.busy === "boolean"
      )
        ((this.lastBusy = u.busy), (this.lastBusyAt = Date.now()));
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
      )
        (weakMap.set(this, u.count), this.onStateChange?.());
    });
    let i = createInterface({ input: n.stdout });
    i.on("line", (u) => this.logger.write(this.id, u));
    let h = createInterface({ input: n.stderr });
    (h.on("line", (u) => this.logger.write(this.id, u)),
      n.on("spawn", () => {
        ((this.wrapperParkLogged = !1), logFeatureOk("daemon_worker_spawn"));
      }));
    let S = !1;
    this.exitPromise = new Promise((u) => {
      let y = (D, E) => {
        if (S) return;
        if (
          ((S = !0),
          i.close(),
          h.close(),
          (this.child = null),
          (this.lastBusy = !1),
          weakMap.delete(this),
          this.onStateChange?.(),
          this.authManager)
        )
          this.authManager.detachWorker(n);
        ((this.exitPromise = null), this.onExit(D, E, now), u());
      };
      (n.on("exit", y),
        n.on("error", (D) => {
          (this.logger.write(this.id, `spawn error: ${D.message}`),
            logFeatureBad(
              "daemon_worker_spawn",
              isENOENT(D) ? "daemon_worker_spawn_enoent" : "daemon_worker_spawn_error",
            ));
          let E = processWrapperArgv()[0],
            L = getErrnoCode(D);
          if (E && (isENOENT(D) || L === "EACCES" || L === "EPERM")) {
            if (
              (this.logger.write(
                this.id,
                isENOENT(D)
                  ? `not started: launcher \`${E}\` was deleted or moved (ENOENT) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER; retrying in the background`
                  : `not started: launcher \`${E}\` cannot be executed (${L}) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER or the launcher's permissions; retrying in the background`,
              ),
              !this.wrapperParkLogged)
            )
              ((this.wrapperParkLogged = !0), logFeatureBad("agent_launcher", "registry_worker_refused"));
            y(the, null);
            return;
          }
          if (!isENOENT(D)) {
            y(null, null);
            return;
          }
          findLatestInstalledVersion().then((P) => {
            if (P && P !== this.invocation.target)
              (this.logger.write(this.id, `execPath gone (version GC?) \u2014 re-resolved to ${P}`),
                (this.invocation = withProcessWrapper({ cmd: P, prefixArgs: [], target: P })),
                (this.consecutiveCrashes = 0));
            y(null, null);
          });
        }));
    });
  }
  onExit(r, e, o) {
    if (this.stopping) return;
    let n = Date.now() - o;
    if (((this.temporaryEndsInARow = r === the ? this.temporaryEndsInARow + 1 : 0), r === the)) {
      let h = At(Cr);
      (this.logger.write(this.id, `exited tempfail code=${r} uptime=${n}ms \u2014 retry in ${h}ms`),
        this.scheduleRespawn(h));
      return;
    }
    if (r === EXIT_CONFIG_ERROR) {
      (this.logger.write(this.id, `exited permanently code=${r} uptime=${n}ms \u2014 will not respawn`),
        logEvent("tengu_daemon_worker_permanent_exit", {
          exit_code: r ?? void 0,
          uptime_ms: n,
          worker_kind: fromEnum(this.kind),
        }));
      return;
    }
    if (r === 0 && n < Xit && processWrapperArgv().length > 0) {
      if (
        (this.logger.write(
          this.id,
          `not started: launcher \`${processWrapperArgv()[0]}\` exited ${n}ms after spawn, before ${this.kind} started \u2014 it must exec its arguments, not daemonize; will not respawn until the launcher is fixed and the daemon restarts`,
        ),
        !this.wrapperParkLogged)
      )
        ((this.wrapperParkLogged = !0), logFeatureBad("agent_launcher", "registry_worker_launcher_forked"));
      logEvent("tengu_daemon_worker_permanent_exit", {
        exit_code: r ?? void 0,
        uptime_ms: n,
        worker_kind: fromEnum(this.kind),
      });
      return;
    }
    if (r !== 0 || n < Pr) {
      if ((this.consecutiveCrashes++, processWrapperArgv().length > 0))
        access_2(this.invocation.target)
          .catch(() => findLatestInstalledVersion())
          .then((S) => {
            if (typeof S === "string" && S && S !== this.invocation.target)
              (this.logger.write(
                this.id,
                `target \`${this.invocation.target}\` is gone (version GC?) \u2014 re-resolved to ${S}`,
              ),
                (this.invocation = withProcessWrapper({ cmd: S, prefixArgs: [], target: S })),
                (this.consecutiveCrashes = 0));
          })
          .catch(() => {});
      let h = xr(this.consecutiveCrashes);
      (this.logger.write(
        this.id,
        `exited code=${r} sig=${e} uptime=${n}ms consecutive=${this.consecutiveCrashes} backoff=${h}ms`,
      ),
        logEvent("tengu_daemon_worker_crash", {
          consecutive: this.consecutiveCrashes,
          exit_code: r ?? void 0,
          uptime_ms: n,
          worker_kind: fromEnum(this.kind),
        }),
        this.scheduleRespawn(h));
    } else
      ((this.consecutiveCrashes = 0),
        this.logger.write(this.id, `exited code=${r} sig=${e} uptime=${n}ms (clean) \u2014 respawning`),
        this.spawn());
  }
  scheduleRespawn(r) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    ((this.backoffTimer = setTimeout(() => {
      if (((this.backoffTimer = null), !this.stopping)) this.spawn();
    }, r)),
      this.backoffTimer.unref());
  }
}
//@ chunk-ss669z1x.js:47596-47714 placement
function dirFieldOf(r) {
  if (typeof r !== "object" || r === null || !("dir" in r)) return;
  let { dir: dir } = r;
  return typeof dir === "string" ? dir : void 0;
}
//@ chunk-ss669z1x.js:47714-47734 placement
var Lr = 1000,
  Or = 5000;
//@ chunk-ss669z1x.js:47734-47763 placement
function It(r) {
  return isWorkerKindAdmitted(r);
}
//@ chunk-ss669z1x.js:47763-47846 placement
function Br(r) {
  let e = 0;
  for (let o of Object.keys(WORKER_KINDS)) e += (r[o] ?? []).length;
  return e;
}
/**
 * daemon supervisor：读取配置、按 kind 管理 worker、处理配置变更。
 */
//@ chunk-ss669z1x.js:47846-50788 placement
async function runDaemonSupervisor(r) {
  let {
      jsonPath: jsonPath,
      invocation: invocation,
      logger: logger,
      authManager: authManager,
      watch: watch = initialize,
      storageV5: storageV5,
      onFlagsRefreshed: onFlagsRefreshed = onGrowthBookRefresh,
    } = r,
    y = new Map(),
    D = PTr(),
    resolved = Promise.resolve(),
    L = !1,
    P,
    R = !1,
    w = !1;
  function A() {
    if (L || w) return;
    (clearTimeout(P),
      (P = void 0),
      (L = !0),
      (resolved = resolved
        .then(async () => {
          if (((L = !1), w)) return;
          let B = {};
          for (let [V, x] of y) {
            let status = x.status;
            if (status) B[V] = status;
          }
          if (await writeDaemonStatus(B, storageV5)) R = !1;
          else if (!R) ((R = !0), (P = setTimeout(A, Or)), P.unref());
        })
        .catch((B) => logError(B))));
  }
  let U = await readJsonConfigFile(jsonPath, storageV5);
  if (U.ok) {
    D = U.config;
    for (let unknownKey of U.unknownKeys)
      logger.write("supervisor", `unknown config key '${unknownKey}' \u2014 upgrade claude?`);
  } else logger.write("supervisor", `config load failed: ${U.error} \u2014 idling`);
  await authManager.ready;
  let re = new Set();
  function X() {
    let B = 0;
    for (let V of Object.keys(WORKER_KINDS)) {
      let x = D[V] ?? [];
      if (!It(V)) {
        if (x.length > 0 && !re.has(V))
          (re.add(V),
            logger.write(
              "supervisor",
              `not starting ${x.length} ${V} worker(s): not available for this account`,
            ));
        continue;
      }
      re.delete(V);
      for (let ee = 0; ee < x.length; ee++) {
        let ae = `${V}:${ee}`;
        if (y.has(ae)) continue;
        let W = new DaemonWorkerProcess(ae, V, x[ee], invocation, logger, authManager, A);
        (y.set(ae, W), W.start(B++ * Ke), logger.write("supervisor", `spawned ${ae}`));
      }
    }
  }
  (X(), A());
  let Q = async () => {
      let B = await readJsonConfigFile(jsonPath, storageV5);
      if (!B.ok) {
        logger.write("supervisor", `config reload failed: ${B.error} \u2014 keeping last-good config`);
        return;
      }
      for (let unknownKey of B.unknownKeys)
        logger.write("supervisor", `unknown config key '${unknownKey}' \u2014 upgrade claude?`);
      let V = diffSkillServers(D, B.config);
      D = B.config;
      let x = new Set((B.config.remoteControl ?? []).map(dirFieldOf));
      for (let { id: id, kind: kind, previousConfig: previousConfig } of V.stop) {
        let se = y.get(id);
        if (se) {
          let be = dirFieldOf(previousConfig),
            ve = kind === "remoteControl" && be !== void 0 && x.has(be);
          (await se.stop(ve ? "reload" : void 0), y.delete(id), logger.write("supervisor", `stopped ${id}`));
        }
      }
      for (let { id: id, kind: kind, previousConfig: previousConfig } of V.restart) {
        let se = y.get(id);
        if (se) {
          let be = dirFieldOf(previousConfig),
            ve = kind !== "remoteControl" || (be !== void 0 && x.has(be));
          await se.stop(ve ? "reload" : void 0);
        }
      }
      let ee = 0;
      for (let { id: id, config: config } of V.restart) {
        let ce = y.get(id);
        if (ce) (ce.updateConfig(config), ce.start(ee++ * Ke), logger.write("supervisor", `restarted ${id}`));
      }
      let ae = 0;
      for (let { id: id, kind: kind, config: config } of V.start) {
        if (!It(kind)) continue;
        let se = new DaemonWorkerProcess(id, kind, config, invocation, logger, authManager, A);
        (y.set(id, se), se.start(ae++ * Ke), logger.write("supervisor", `spawned ${id}`));
      }
      if (V.stop.length + V.start.length + V.restart.length > 0)
        (logger.write(
          "supervisor",
          `reload: stopped=${V.stop.length} started=${V.start.length} restarted=${V.restart.length}`,
        ),
          logEvent("tengu_daemon_config_reload", {
            stopped: V.stop.length,
            started: V.start.length,
            restarted: V.restart.length,
          }));
    },
    resolved_2 = Promise.resolve(),
    le = watch(jsonPath, () => {
      resolved_2 = resolved_2.then(Q).catch((B) => logError(B));
    }),
    _e = !1,
    q = () => {};
  function Z() {
    if (_e) return;
    ((_e = !0), le(), q());
  }
  return (
    (q = onFlagsRefreshed(() => {
      resolved_2 = resolved_2
        .then(() => {
          if (!_e) (X(), A());
        })
        .catch((B) => logError(B));
    })),
    {
      workerCount: () => Br(D),
      hasOAuthConsumer: () => {
        for (let B of y.values()) if (WORKER_KINDS[B.kind].needsOAuth) return !0;
        return !1;
      },
      busyWorkerCount: () => {
        let B = 0;
        for (let V of y.values()) if (V.isBusy()) B++;
        return B;
      },
      disposeWatcher: Z,
      drainReloads: () => resolved_2,
      stop: async (B) => {
        (Z(),
          await resolved_2,
          await Promise.all(Array.from(y.values()).map((V) => V.stop(B))),
          (w = !0),
          clearTimeout(P),
          await withDeadline(resolved, Lr),
          await removeDaemonStatus(storageV5));
      },
    }
  );
}
//@ chunk-ss669z1x.js:50788-50836 placement
var Vr = 60000,
  Fr = 100,
  Mt = 5000,
  Gr = 1800000,
  jr = s5 + Mt;

export { Vr, Mt, jr, Gr, openBgDispatchLog, Fr, runBgManagerLoop, runDaemonSupervisor };
