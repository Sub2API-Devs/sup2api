/**
 * daemon/bgManager.ts
 *
 * 2.1.316 新增：后台管理器（bg manager）入口：监听、过期检查、空闲退出、升级。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ss669z1x.js (3)
 * attribution: placement 3
 */
import { isRunningFromVersionsDir_2, getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { isSyscallError, getErrnoCode, toError } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { initialize } from "./daemonConfigWatcher.js";
import { createDaemonAuthManager } from "./daemonAuth.js";
import {
  SHUTDOWN_WAIT_MS,
  SHUTDOWN_KILL_GRACE_MS,
  SHUTDOWN_TOTAL_MS,
  SHUTDOWN_FORCE_MS,
  openBgDispatchLog,
  SHUTDOWN_CLOSE_TIMEOUT_MS,
  runBgManagerLoop,
  runDaemonSupervisor,
} from "./bgDispatch.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import {
  readLiveServerLock,
  LOCK_PROBE_LIMITS,
  LOCK_PROBE_RETRY_MS,
  writeDaemonLockRemote,
  readDaemonLock,
  isClaudeProcess,
  waitForProcessExit,
  verifyLockHolder,
  writeDaemonLock,
  releaseDaemonLock,
  deleteDaemonLock,
} from "../utils/daemon/daemonLock.js";
import { controlRequest } from "../services/daemon/controlClient.js";
import { BG_PROTO } from "../services/daemon/leaseProtocol.js";
import { sleep } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { redactDaemonPipeKey, redactErrorPaths } from "../utils/sandbox/userNamespace.js";
import { getPlatform } from "../utils/platform.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { daemonExecutablePath, uninstallDaemonService } from "../services/daemon/serviceInstall.js";
import { statRealPath } from "../services/autoDream/consolidationLock.js";
import {
  getProcessStartTimeAsync,
  procIdentityFields,
  procIdentityOf,
  reapDetachedRepl,
} from "../utils/processIdentity.js";
import {
  processWrapperRecord,
  processWrapperError,
  processWrapperArgv,
  isProcessWrapperUsable,
} from "../utils/processWrapper.js";
import { isOlderRcVersion, killVerifiedProcess } from "../services/daemon/reapJobs.js";
import { WORKER_KINDS } from "./runDaemonWorker.js";
import { isDaemonServiceRecalled } from "../utils/fleetGates.js";
import { readRoster } from "../services/daemon/roster.js";

//@ chunk-ss669z1x.js:50966-51051 placement
function targetChanged(r, e) {
  if (r.target !== e.target) return true;
  return !isRunningFromVersionsDir_2() && r.mtimeMs !== e.mtimeMs;
}
//@ chunk-ss669z1x.js:51051-51231 placement
function logBgManagerStartError(r) {
  if (isSyscallError(r) && r.syscall === "listen" && (r.code === "EADDRINUSE" || r.code === "EACCES")) {
    logForDebugging(`bg manager start failed (listen): ${r.code} ${r.message}`, {
      level: "warn",
    });
    return;
  }
  logError(r);
}
//@ chunk-ss669z1x.js:51231-64258 placement
/**
 * 后台管理器（bg manager）入口：监听、过期检查、空闲退出、升级。
 */
async function runBgManager(r) {
  let {
    jsonPath,
    logPath,
    origin,
    spawnedBy,
    signal,
    watch = initialize,
    createAuth = createDaemonAuthManager,
    staleCheckIntervalMs = SHUTDOWN_WAIT_MS,
    idleGraceMs = SHUTDOWN_KILL_GRACE_MS,
    startupIdleGraceMs = SHUTDOWN_TOTAL_MS,
    upgradeBusyDeferCapMs = SHUTDOWN_FORCE_MS,
    storageV5,
  } = r;
  let R = credentialsStoreFor(storageV5);
  let bgDispatchLog = await openBgDispatchLog(logPath);
  bgDispatchLog.write(
    "supervisor",
    `\u2500\u2500\u2500 daemon start \u2500\u2500\u2500 version=${
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
    } pid=${process.pid} origin=${origin}`,
  );
  initializeGrowthBook();
  let liveServerLock = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5);
  let U = false;
  if (liveServerLock && liveServerLock.origin === "transient" && origin !== "transient") {
    U = true;
    bgDispatchLog.write(
      "supervisor",
      `transient daemon running (pid=${liveServerLock.pid}, origin=transient) \u2014 asking it to yield to origin=${origin}`,
    );
    let s = await controlRequest({
      proto: BG_PROTO,
      op: "yield",
    });
    if (s.ok && s.op === "yield" && s.yielding) {
      let M = Date.now() + 5000;
      while (liveServerLock && Date.now() < M) {
        await sleep(100);
        liveServerLock = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5);
      }
      logEvent("tengu_daemon_yield_takeover", {
        ok: !liveServerLock,
        new_origin: fromEnum(origin),
      });
      if (liveServerLock)
        bgDispatchLog.write(
          "supervisor",
          "yield acked but lock still held after 5s \u2014 refusing to start",
        );
    } else
      bgDispatchLog.write(
        "supervisor",
        s.ok
          ? "existing daemon refused to yield (it reports origin!=transient)"
          : `existing daemon unreachable on control socket (${redactDaemonPipeKey(s.error)}); not taking over`,
      );
  }
  if (liveServerLock) {
    let s = U
      ? `origin=${liveServerLock.origin ?? "unknown"}; asked it to yield but the handover failed (see above)`
      : origin === "transient"
        ? `origin=${liveServerLock.origin ?? "unknown"}; an on-demand daemon never displaces a running one`
        : `origin=${liveServerLock.origin ?? "unknown"}; only a transient daemon can be displaced`;
    let M =
      getPlatform() === "windows"
        ? `Stop it with \`taskkill /PID ${liveServerLock.pid}\`, then retry.`
        : "Run `claude daemon stop` to stop it, then retry.";
    bgDispatchLog.write(
      "supervisor",
      `another daemon is already running (pid=${liveServerLock.pid}, version=${liveServerLock.version}, ${s}). ${M}`,
    );
    if (U) logFeatureSad("daemon_start", "daemon_start_yield_failed");
    else logFeatureOk("daemon_start");
    await bgDispatchLog.close();
    return {
      upgradeDetected: false,
      exitCode: 1,
    };
  }
  let launchCommand = getLaunchCommand({
    pinToCurrentBinary: true,
  });
  let X = isRunningFromVersionsDir_2() ? daemonExecutablePath() : launchCommand.target;
  let Q = await statRealPath(X).catch((error) => {
    if (isSyscallError(error))
      logForDebugging(`binaryIdentity(${X}) failed at startup: ${error.code}`, {
        level: "error",
      });
    else logError(error);
    return null;
  });
  let processStartTime = await getProcessStartTimeAsync(process.pid);
  if (processStartTime === undefined) {
    await sleep(LOCK_PROBE_RETRY_MS);
    processStartTime = await getProcessStartTimeAsync(process.pid, {
      skipCache: true,
    });
    if (processStartTime === undefined)
      bgDispatchLog.write(
        "supervisor",
        "own process start-time probe failed twice \u2014 writing a procStart-less lock; kill paths will refuse to signal this daemon",
      );
  }
  let le = {
    pid: process.pid,
    version: {
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
    jsonPath,
    logPath,
    startedAt: Date.now(),
    origin,
    spawnedBy,
    ...procIdentityFields(processStartTime),
    launchTarget: Q?.target,
    processWrapper: processWrapperRecord(),
  };
  let _e = await writeDaemonLockRemote(le, storageV5);
  if (!_e) {
    let daemonLock = await readDaemonLock(storageV5);
    if (daemonLock) {
      let G = false;
      let de = null;
      try {
        process.kill(daemonLock.pid, 0);
        G =
          (await isClaudeProcess(daemonLock.pid)) &&
          (await waitForProcessExit(daemonLock.pid, procIdentityOf(daemonLock), LOCK_PROBE_LIMITS));
      } catch (error) {
        if (getErrnoCode(error) !== "ESRCH") {
          de = await verifyLockHolder(daemonLock);
          G = de === null;
          if (de !== null)
            bgDispatchLog.write(
              "supervisor",
              `daemon.lock names pid=${daemonLock.pid}, which this user cannot signal, but ${de === "predates_boot" ? "the lock predates this boot" : "that pid now belongs to another process"} \u2014 replacing the stale lock`,
            );
        }
      }
      if (G) {
        bgDispatchLog.write(
          "supervisor",
          `another daemon won the lock race (pid=${daemonLock.pid}) \u2014 exiting`,
        );
        logFeatureOk("daemon_start");
        await bgDispatchLog.close();
        return {
          upgradeDetected: false,
          exitCode: 1,
        };
      }
      _e = await writeDaemonLock(le, storageV5);
      if (de !== null)
        logEvent("tengu_daemon_stale_lock_replaced", {
          proof: de === "predates_boot" ? lit("predates_boot") : lit("pid_recycled"),
          acquired: _e,
          holder_age_ms: Math.max(0, Date.now() - daemonLock.startedAt),
          holder_version_skew:
            daemonLock.version !==
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
        });
    } else _e = await writeDaemonLock(le, storageV5);
    if (!_e) {
      bgDispatchLog.write("supervisor", "another daemon won the lock race \u2014 exiting");
      logFeatureOk("daemon_start");
      await bgDispatchLog.close();
      return {
        upgradeDetected: false,
        exitCode: 1,
      };
    }
    await sleep(SHUTDOWN_CLOSE_TIMEOUT_MS);
    let M = await readDaemonLock(storageV5).catch(() => le);
    if (!M || M.pid !== le.pid || M.startedAt !== le.startedAt) {
      bgDispatchLog.write(
        "supervisor",
        `another daemon won the lock race (lock now ${M ? `held by pid=${M.pid}` : "gone"}) \u2014 exiting`,
      );
      if (M) logFeatureOk("daemon_start");
      else logFeatureSad("daemon_start", "lock_vanished_after_replace");
      await bgDispatchLog.close();
      return {
        upgradeDetected: false,
        exitCode: 1,
      };
    }
  }
  let q = async () => {
    for (let idx = 0; ; idx++)
      try {
        let liveServerLock = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5);
        return liveServerLock !== null && liveServerLock.pid !== le.pid ? liveServerLock.pid : null;
      } catch (error) {
        if (idx === 0) {
          await sleep(LOCK_PROBE_RETRY_MS);
          continue;
        }
        logForDebugging(
          `daemon displacement probe: daemon.lock read failed twice (${error instanceof Error ? error.message : String(error)}) \u2014 treating as non-displaced`,
          {
            level: "warn",
          },
        );
        return null;
      }
  };
  let Z = null;
  let B = {
    manager: null,
  };
  let auth = createAuth(
    signal,
    (s) => bgDispatchLog.write("supervisor", s),
    () => Z?.hasOAuthConsumer() ?? false,
    storageV5,
    R,
    () => origin === "service" && getPlatform() === "macos" && (B.manager?.snapshotConsumerCount() ?? 0) > 0,
  );
  let x = false;
  let ee = null;
  let ae = false;
  let W = null;
  let ge = false;
  let ce = false;
  let se = false;
  let be = false;
  let ve = false;
  let Ee = false;
  let Re = () => signal.aborted || se || ge || ve || x || ce || be || Ee;
  let Pe = null;
  let onYield = () => {
    if (origin !== "transient") return false;
    if (!se) {
      se = true;
      bgDispatchLog.write(
        "supervisor",
        "yielding to a foreground/service daemon \u2014 bg workers will be re-adopted",
      );
      logEvent("tengu_daemon_yield", {});
      Pe?.();
    }
    return true;
  };
  let Oe = async () => {
    if (x || !Q) return x;
    if (Re()) return false;
    let s;
    try {
      s = await statRealPath(X);
    } catch (error) {
      if (isSyscallError(error))
        logForDebugging(`binaryIdentity(${X}) poll failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
      if (W !== null) {
        if ((Z?.busyWorkerCount() ?? 0) === 0) {
          if (!W.capExpiredEmitted)
            logEvent("tengu_daemon_upgrade_deferred_busy", {
              busy_workers: 0,
              deferred_ms: (W.suspendedAt ?? Date.now()) - W.start,
              cap_expired: false,
              phase: lit("resolved"),
            });
          W = null;
        } else if (W.suspendedAt === null) W.suspendedAt = Date.now();
      }
      return false;
    }
    if (Re()) return false;
    if (W !== null && W.suspendedAt !== null) {
      W.start += Date.now() - W.suspendedAt;
      W.suspendedAt = null;
    }
    if (s !== null && !targetChanged(Q, s)) {
      ee = null;
      W = null;
      return false;
    }
    if (
      s !== null &&
      isOlderRcVersion(Q.target, s.target) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_daemon_refuse_stale_upgrade", true)
    ) {
      W = null;
      if (ee !== s.target) {
        ee = s.target;
        bgDispatchLog.write(
          "supervisor",
          `binary at ${X} changed to an OLDER build (${Q.target} \u2192 ${s.target}) \u2014 refusing self-restart for upgrade; keeping the running build (\`claude daemon stop --any\` to override)`,
        );
        logEvent("tengu_daemon_upgrade_refused_stale_binary", {});
      }
      return false;
    }
    let M = processWrapperError();
    let G = processWrapperArgv();
    if (origin !== "service" && (G.length > 0 || M !== null)) {
      if (!(await isProcessWrapperUsable())) {
        if (!ae) {
          ae = true;
          bgDispatchLog.write(
            "supervisor",
            M !== null
              ? `binary at ${X} changed but CLAUDE_CODE_PROCESS_WRAPPER cannot be used (${M}) \u2014 deferring the upgrade restart until it is fixed (re-checked every poll)`
              : `binary at ${X} changed but launcher \`${G[0]}\` is not runnable right now \u2014 deferring the upgrade restart until it is (re-checked every poll)`,
          );
          logFeatureSad("agent_launcher", "upgrade_deferred_launcher_unrunnable");
        }
        W = null;
        return false;
      }
      ae = false;
    }
    let de = Z?.busyWorkerCount() ?? 0;
    if (
      de > 0 &&
      s !== null &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_daemon_upgrade_defer_busy", true)
    ) {
      if (W === null)
        W = {
          target: s.target,
          start: Date.now(),
          logged: false,
          suspendedAt: null,
          capExpiredEmitted: false,
        };
      else if (W.target !== s.target) {
        W.target = s.target;
        W.logged = false;
      }
      if (Date.now() - W.start < upgradeBusyDeferCapMs) {
        if (!W.logged) {
          W.logged = true;
          bgDispatchLog.write(
            "supervisor",
            `binary at ${X} changed but ${de} registry worker(s) report a mid-turn session \u2014 deferring the upgrade restart until idle (re-checked every poll, capped at ${Math.round(upgradeBusyDeferCapMs / 60000)}m)`,
          );
          logEvent("tengu_daemon_upgrade_deferred_busy", {
            busy_workers: de,
            cap_expired: false,
            phase: lit("start"),
          });
        }
        return false;
      }
      if (!W.capExpiredEmitted) {
        W.capExpiredEmitted = true;
        bgDispatchLog.write(
          "supervisor",
          `busy-worker upgrade defer cap reached \u2014 proceeding with the restart while ${de} worker(s) are still busy`,
        );
        logEvent("tengu_daemon_upgrade_deferred_busy", {
          busy_workers: de,
          deferred_ms: Date.now() - W.start,
          cap_expired: true,
          phase: lit("cap_expired"),
        });
      }
    } else {
      if (W !== null)
        logEvent("tengu_daemon_upgrade_deferred_busy", {
          busy_workers: de,
          deferred_ms: Date.now() - W.start,
          cap_expired: false,
          phase: lit("resolved"),
        });
      W = null;
    }
    if (Re()) return false;
    x = true;
    if (s === null)
      bgDispatchLog.write(
        "supervisor",
        `binary at ${X} was deleted (was ${Q.target}) \u2014 exiting for upgrade`,
      );
    else {
      let Se = Q.target === s.target ? "mtime changed" : `${Q.target} \u2192 ${s.target}`;
      bgDispatchLog.write("supervisor", `binary at ${X} changed (${Se}) \u2014 self-restarting for upgrade`);
    }
    Pe?.();
    return true;
  };
  let p = null;
  let T = false;
  let K = () => (B.manager?.leaseCount() ?? 0) + (B.manager?.liveHandleCount() ?? 0);
  let oe = () => {
    if (origin !== "transient") return;
    if (ve || x || ge || se || be || signal.aborted) return;
    if (K() > 0) {
      T = true;
      if (p) {
        clearTimeout(p);
        p = null;
      }
      return;
    }
    if (p) return;
    let s = T ? idleGraceMs : startupIdleGraceMs;
    p = setTimeout(() => {
      p = null;
      if (K() > 0) {
        T = true;
        return;
      }
      if (signal.aborted || x) return;
      if (W !== null) {
        oe();
        return;
      }
      ve = true;
      let M = Z?.workerCount() ?? 0;
      bgDispatchLog.write(
        "supervisor",
        `idle ${Math.round(s / 1000)}s with no clients \u2014 exiting` +
          (M > 0 ? ` (stopping ${M} configured workers)` : ""),
      );
      logEvent("tengu_daemon_idle_exit", {
        grace_ms: s,
        never_had_client: !T,
        cfg_workers: M,
      });
      Pe?.();
    }, s);
  };
  auth.ready
    .then(() =>
      runBgManagerLoop((s) => bgDispatchLog.write("bg", s), {
        getAuthSnapshot: origin === "service" ? () => auth.getAuthSnapshot() : undefined,
        onNudge: async () => ({
          restarting: await Oe(),
          upgradePending: W !== null,
        }),
        onShutdown: () => {
          ge = true;
          bgDispatchLog.write("supervisor", "shutdown requested via control socket");
          Pe?.();
        },
        onYield,
        onKeepAliveChange: oe,
        storageV5,
        credentials: R,
        isShuttingDown: Re,
      }),
    )
    .then((s) => {
      if (Re())
        return void (async () => {
          if (ce && !Ee && (await q()) === null) s.killAll("SIGTERM");
          await s.close({
            skipPathCleanup: true,
          });
        })().catch((error) => logError(redactErrorPaths(error)));
      B.manager = s;
      oe();
    })
    .catch((error) => {
      logBgManagerStartError(redactErrorPaths(error));
      if (Re()) return;
      let errnoCode = getErrnoCode(error);
      let G = `${errnoCode ? `[${errnoCode}] ` : ""}${redactDaemonPipeKey(toError(error).message.replace(/\s*\n\s*/g, " "))}`;
      if (origin === "service") {
        bgDispatchLog.write(
          "supervisor",
          `bg manager failed to start: ${G} \u2014 control pipe unavailable; bg sessions disabled (registry workers keep running)`,
        );
        releaseDaemonLock(le, storageV5).catch(logError);
        return;
      }
      bgDispatchLog.write(
        "supervisor",
        `bg manager failed to start: ${G} \u2014 control pipe unavailable; exiting`,
      );
      process.stderr.write(`bg manager failed to start: ${G}
`);
      be = true;
      Pe?.();
    });
  Z = await runDaemonSupervisor({
    jsonPath,
    invocation: launchCommand,
    logger: bgDispatchLog,
    authManager: auth,
    watch,
    storageV5,
  });
  let me = Z.workerCount();
  bgDispatchLog.write("supervisor", `workers=${me}`);
  if (me > 0)
    bgDispatchLog.write(
      "supervisor",
      "daemon.json has configured workers but they do not pin the supervisor \u2014 they stop when the last client lease and bg job are gone",
    );
  logEvent("tengu_daemon_start", {
    worker_kinds: Object.keys(WORKER_KINDS).length,
    worker_count: me,
    origin: fromEnum(origin),
  });
  logFeatureOk("daemon_start");
  oe();
  let he = null;
  try {
    await new Promise((resolve) => {
      Pe = resolve;
      if (signal.aborted || x || ve || ge || se || be) return void resolve();
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
      if (!Q)
        bgDispatchLog.write("supervisor", `binary identity unresolvable at ${X}; upgrade polling disabled`);
      he = setInterval(() => {
        if (signal.aborted || x || ce || se) {
          if (he) {
            clearInterval(he);
            he = null;
          }
          return;
        }
        Oe();
        if (origin === "service" && isDaemonServiceRecalled()) {
          ce = true;
          bgDispatchLog.write(
            "supervisor",
            "service recall flag set \u2014 draining workers and uninstalling service",
          );
          Pe?.();
        }
        if (origin === "transient" && !se)
          q()
            .then((M) => {
              if (M !== null && !se && !signal.aborted) {
                Ee = true;
                se = true;
                bgDispatchLog.write("supervisor", `lockfile now held by pid=${M} \u2014 displaced, yielding`);
                logEvent("tengu_daemon_yield", {
                  displaced: true,
                  displaced_by_pid: M,
                });
                Pe?.();
              }
            })
            .catch((error) => logError(redactErrorPaths(error)));
      }, staleCheckIntervalMs);
    });
  } finally {
    Pe = null;
    if (he) {
      clearInterval(he);
      he = null;
    }
    if (p) {
      clearTimeout(p);
      p = null;
    }
  }
  if (x) logEvent("tengu_daemon_self_restart_on_upgrade", {});
  if (ce) logEvent("tengu_copper_lantern", {});
  Z.disposeWatcher();
  await Z.drainReloads();
  if (!Ee) {
    let s = await q();
    if (s !== null) {
      Ee = true;
      bgDispatchLog.write(
        "supervisor",
        `lockfile now held by pid=${s} \u2014 displaced; leaving successor's control.sock in place`,
      );
    }
  }
  let pe =
    x && !Ee
      ? "upgrade"
      : ce
        ? "service_recall"
        : Ee
          ? "displaced"
          : se
            ? "yield"
            : ge
              ? "shutdown_op"
              : ve
                ? "idle_exit"
                : be
                  ? "bg_manager_failed"
                  : signal.aborted
                    ? "signal"
                    : "unknown";
  let ke = Date.now() - le.startedAt;
  bgDispatchLog.write(
    "supervisor",
    `shutting down (cause=${pe}, uptime=${Math.round(ke / 1000)}s, leases=${B.manager?.leaseCount() ?? -1}, live_workers=${B.manager?.liveHandleCount() ?? -1})`,
  );
  logEvent("tengu_daemon_exit", {
    cause: fromEnum(pe),
    uptime_ms: ke,
    lease_count: B.manager?.leaseCount() ?? -1,
    live_handles: B.manager?.liveHandleCount() ?? -1,
    ever_had_keep_alive: T,
    origin: fromEnum(origin),
  });
  B.manager?.announceExit(pe);
  let De = false;
  let $e = async () => {
    if (De) return;
    De = true;
    let daemonLock = await readDaemonLock(storageV5);
    if (daemonLock && daemonLock.pid === le.pid && daemonLock.startedAt === le.startedAt)
      await deleteDaemonLock(storageV5);
  };
  if (se) {
    await B.manager?.close({
      displaced: Ee,
    });
    B.manager = null;
  }
  if (ve || ce || se || be) {
    await $e();
    if (ce && !Ee) {
      B.manager?.killAll("SIGTERM");
      if (!B.manager) {
        let s = await readRoster(
          {
            silent: true,
          },
          storageV5,
        ).catch(() => null);
        for (let M of Object.values(s?.workers ?? {}))
          if (M.pid > 0) {
            await killVerifiedProcess(M.pid, M.procStart).catch(() => false);
            await reapDetachedRepl(M.replPid, M.replProcStart).catch(() => false);
          }
      }
    }
  }
  await Promise.all([
    B.manager?.close({
      displaced: Ee,
    }),
    Z.stop(pe === "upgrade" ? "upgrade" : pe === "yield" ? "yield" : undefined),
  ]);
  await $e();
  if (ce) await uninstallDaemonService();
  await bgDispatchLog.close();
  auth.dispose();
  return {
    upgradeDetected: x,
    exitCode: be ? 1 : 0,
  };
}
export { runBgManager };
