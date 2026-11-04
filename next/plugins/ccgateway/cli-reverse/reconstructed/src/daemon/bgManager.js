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
import { redactDaemonPipeKey, redactErrorPaths } from "../services/daemon/paths.js";
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
function targetChanged(previous, current) {
  if (previous.target !== current.target) return true;
  return !isRunningFromVersionsDir_2() && previous.mtimeMs !== current.mtimeMs;
}
//@ chunk-ss669z1x.js:51051-51231 placement
function logBgManagerStartError(error) {
  if (
    isSyscallError(error) &&
    error.syscall === "listen" &&
    (error.code === "EADDRINUSE" || error.code === "EACCES")
  ) {
    logForDebugging(`bg manager start failed (listen): ${error.code} ${error.message}`, {
      level: "warn",
    });
    return;
  }
  logError(error);
}
//@ chunk-ss669z1x.js:51231-64258 placement
/**
 * 后台管理器（bg manager）入口：监听、过期检查、空闲退出、升级。
 */
async function runBgManager(options) {
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
  } = options;
  let credentials = credentialsStoreFor(storageV5);
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
  let askedTransientToYield = false;
  if (liveServerLock && liveServerLock.origin === "transient" && origin !== "transient") {
    askedTransientToYield = true;
    bgDispatchLog.write(
      "supervisor",
      `transient daemon running (pid=${liveServerLock.pid}, origin=transient) \u2014 asking it to yield to origin=${origin}`,
    );
    let yieldResponse = await controlRequest({
      proto: BG_PROTO,
      op: "yield",
    });
    if (yieldResponse.ok && yieldResponse.op === "yield" && yieldResponse.yielding) {
      let yieldDeadline = Date.now() + 5000;
      while (liveServerLock && Date.now() < yieldDeadline) {
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
        yieldResponse.ok
          ? "existing daemon refused to yield (it reports origin!=transient)"
          : `existing daemon unreachable on control socket (${redactDaemonPipeKey(yieldResponse.error)}); not taking over`,
      );
  }
  if (liveServerLock) {
    let lockReason = askedTransientToYield
      ? `origin=${liveServerLock.origin ?? "unknown"}; asked it to yield but the handover failed (see above)`
      : origin === "transient"
        ? `origin=${liveServerLock.origin ?? "unknown"}; an on-demand daemon never displaces a running one`
        : `origin=${liveServerLock.origin ?? "unknown"}; only a transient daemon can be displaced`;
    let stopHint =
      getPlatform() === "windows"
        ? `Stop it with \`taskkill /PID ${liveServerLock.pid}\`, then retry.`
        : "Run `claude daemon stop` to stop it, then retry.";
    bgDispatchLog.write(
      "supervisor",
      `another daemon is already running (pid=${liveServerLock.pid}, version=${liveServerLock.version}, ${lockReason}). ${stopHint}`,
    );
    if (askedTransientToYield) logFeatureSad("daemon_start", "daemon_start_yield_failed");
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
  let binaryPath = isRunningFromVersionsDir_2() ? daemonExecutablePath() : launchCommand.target;
  let binaryIdentity = await statRealPath(binaryPath).catch((error) => {
    if (isSyscallError(error))
      logForDebugging(`binaryIdentity(${binaryPath}) failed at startup: ${error.code}`, {
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
  let lockPayload = {
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
    launchTarget: binaryIdentity?.target,
    processWrapper: processWrapperRecord(),
  };
  let gotLock = await writeDaemonLockRemote(lockPayload, storageV5);
  if (!gotLock) {
    let lock = await readDaemonLock(storageV5);
    if (lock) {
      let holderStillAlive = false;
      let staleProof = null;
      try {
        process.kill(lock.pid, 0);
        holderStillAlive =
          (await isClaudeProcess(lock.pid)) &&
          (await waitForProcessExit(lock.pid, procIdentityOf(lock), LOCK_PROBE_LIMITS));
      } catch (error) {
        if (getErrnoCode(error) !== "ESRCH") {
          staleProof = await verifyLockHolder(lock);
          holderStillAlive = staleProof === null;
          if (staleProof !== null)
            bgDispatchLog.write(
              "supervisor",
              `daemon.lock names pid=${lock.pid}, which this user cannot signal, but ${staleProof === "predates_boot" ? "the lock predates this boot" : "that pid now belongs to another process"} \u2014 replacing the stale lock`,
            );
        }
      }
      if (holderStillAlive) {
        bgDispatchLog.write(
          "supervisor",
          `another daemon won the lock race (pid=${lock.pid}) \u2014 exiting`,
        );
        logFeatureOk("daemon_start");
        await bgDispatchLog.close();
        return {
          upgradeDetected: false,
          exitCode: 1,
        };
      }
      gotLock = await writeDaemonLock(lockPayload, storageV5);
      if (staleProof !== null)
        logEvent("tengu_daemon_stale_lock_replaced", {
          proof: staleProof === "predates_boot" ? lit("predates_boot") : lit("pid_recycled"),
          acquired: gotLock,
          holder_age_ms: Math.max(0, Date.now() - lock.startedAt),
          holder_version_skew:
            lock.version !==
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
    } else gotLock = await writeDaemonLock(lockPayload, storageV5);
    if (!gotLock) {
      bgDispatchLog.write("supervisor", "another daemon won the lock race \u2014 exiting");
      logFeatureOk("daemon_start");
      await bgDispatchLog.close();
      return {
        upgradeDetected: false,
        exitCode: 1,
      };
    }
    await sleep(SHUTDOWN_CLOSE_TIMEOUT_MS);
    let rereadLock = await readDaemonLock(storageV5).catch(() => lockPayload);
    if (!rereadLock || rereadLock.pid !== lockPayload.pid || rereadLock.startedAt !== lockPayload.startedAt) {
      bgDispatchLog.write(
        "supervisor",
        `another daemon won the lock race (lock now ${rereadLock ? `held by pid=${rereadLock.pid}` : "gone"}) \u2014 exiting`,
      );
      if (rereadLock) logFeatureOk("daemon_start");
      else logFeatureSad("daemon_start", "lock_vanished_after_replace");
      await bgDispatchLog.close();
      return {
        upgradeDetected: false,
        exitCode: 1,
      };
    }
  }
  let probeDisplacingDaemon = async () => {
    for (let idx = 0; ; idx++)
      try {
        let liveServerLock = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5);
        return liveServerLock !== null && liveServerLock.pid !== lockPayload.pid ? liveServerLock.pid : null;
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
  let manager = null;
  let managerHolder = {
    manager: null,
  };
  let auth = createAuth(
    signal,
    (line) => bgDispatchLog.write("supervisor", line),
    () => manager?.hasOAuthConsumer() ?? false,
    storageV5,
    credentials,
    () =>
      origin === "service" &&
      getPlatform() === "macos" &&
      (managerHolder.manager?.snapshotConsumerCount() ?? 0) > 0,
  );
  let isUpgrading = false;
  let lastRefusedTarget = null;
  let launcherUnrunnableLogged = false;
  let busyDeferState = null;
  let isShutdownRequested = false;
  let isServiceRecall = false;
  let isYielding = false;
  let bgManagerFailed = false;
  let isIdleExit = false;
  let wasDisplaced = false;
  let isShuttingDown = () =>
    signal.aborted ||
    isYielding ||
    isShutdownRequested ||
    isIdleExit ||
    isUpgrading ||
    isServiceRecall ||
    bgManagerFailed ||
    wasDisplaced;
  let resolveMainPromise = null;
  let onYield = () => {
    if (origin !== "transient") return false;
    if (!isYielding) {
      isYielding = true;
      bgDispatchLog.write(
        "supervisor",
        "yielding to a foreground/service daemon \u2014 bg workers will be re-adopted",
      );
      logEvent("tengu_daemon_yield", {});
      resolveMainPromise?.();
    }
    return true;
  };
  let pollUpgrade = async () => {
    if (isUpgrading || !binaryIdentity) return isUpgrading;
    if (isShuttingDown()) return false;
    let currentIdentity;
    try {
      currentIdentity = await statRealPath(binaryPath);
    } catch (error) {
      if (isSyscallError(error))
        logForDebugging(`binaryIdentity(${binaryPath}) poll failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
      if (busyDeferState !== null) {
        if ((manager?.busyWorkerCount() ?? 0) === 0) {
          if (!busyDeferState.capExpiredEmitted)
            logEvent("tengu_daemon_upgrade_deferred_busy", {
              busy_workers: 0,
              deferred_ms: (busyDeferState.suspendedAt ?? Date.now()) - busyDeferState.start,
              cap_expired: false,
              phase: lit("resolved"),
            });
          busyDeferState = null;
        } else if (busyDeferState.suspendedAt === null) busyDeferState.suspendedAt = Date.now();
      }
      return false;
    }
    if (isShuttingDown()) return false;
    if (busyDeferState !== null && busyDeferState.suspendedAt !== null) {
      busyDeferState.start += Date.now() - busyDeferState.suspendedAt;
      busyDeferState.suspendedAt = null;
    }
    if (currentIdentity !== null && !targetChanged(binaryIdentity, currentIdentity)) {
      lastRefusedTarget = null;
      busyDeferState = null;
      return false;
    }
    if (
      currentIdentity !== null &&
      isOlderRcVersion(binaryIdentity.target, currentIdentity.target) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_daemon_refuse_stale_upgrade", true)
    ) {
      busyDeferState = null;
      if (lastRefusedTarget !== currentIdentity.target) {
        lastRefusedTarget = currentIdentity.target;
        bgDispatchLog.write(
          "supervisor",
          `binary at ${binaryPath} changed to an OLDER build (${binaryIdentity.target} \u2192 ${currentIdentity.target}) \u2014 refusing self-restart for upgrade; keeping the running build (\`claude daemon stop --any\` to override)`,
        );
        logEvent("tengu_daemon_upgrade_refused_stale_binary", {});
      }
      return false;
    }
    let wrapperError = processWrapperError();
    let wrapperArgv = processWrapperArgv();
    if (origin !== "service" && (wrapperArgv.length > 0 || wrapperError !== null)) {
      if (!(await isProcessWrapperUsable())) {
        if (!launcherUnrunnableLogged) {
          launcherUnrunnableLogged = true;
          bgDispatchLog.write(
            "supervisor",
            wrapperError !== null
              ? `binary at ${binaryPath} changed but CLAUDE_CODE_PROCESS_WRAPPER cannot be used (${wrapperError}) \u2014 deferring the upgrade restart until it is fixed (re-checked every poll)`
              : `binary at ${binaryPath} changed but launcher \`${wrapperArgv[0]}\` is not runnable right now \u2014 deferring the upgrade restart until it is (re-checked every poll)`,
          );
          logFeatureSad("agent_launcher", "upgrade_deferred_launcher_unrunnable");
        }
        busyDeferState = null;
        return false;
      }
      launcherUnrunnableLogged = false;
    }
    let busyWorkerCount = manager?.busyWorkerCount() ?? 0;
    if (
      busyWorkerCount > 0 &&
      currentIdentity !== null &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_daemon_upgrade_defer_busy", true)
    ) {
      if (busyDeferState === null)
        busyDeferState = {
          target: currentIdentity.target,
          start: Date.now(),
          logged: false,
          suspendedAt: null,
          capExpiredEmitted: false,
        };
      else if (busyDeferState.target !== currentIdentity.target) {
        busyDeferState.target = currentIdentity.target;
        busyDeferState.logged = false;
      }
      if (Date.now() - busyDeferState.start < upgradeBusyDeferCapMs) {
        if (!busyDeferState.logged) {
          busyDeferState.logged = true;
          bgDispatchLog.write(
            "supervisor",
            `binary at ${binaryPath} changed but ${busyWorkerCount} registry worker(s) report a mid-turn session \u2014 deferring the upgrade restart until idle (re-checked every poll, capped at ${Math.round(upgradeBusyDeferCapMs / 60000)}m)`,
          );
          logEvent("tengu_daemon_upgrade_deferred_busy", {
            busy_workers: busyWorkerCount,
            cap_expired: false,
            phase: lit("start"),
          });
        }
        return false;
      }
      if (!busyDeferState.capExpiredEmitted) {
        busyDeferState.capExpiredEmitted = true;
        bgDispatchLog.write(
          "supervisor",
          `busy-worker upgrade defer cap reached \u2014 proceeding with the restart while ${busyWorkerCount} worker(s) are still busy`,
        );
        logEvent("tengu_daemon_upgrade_deferred_busy", {
          busy_workers: busyWorkerCount,
          deferred_ms: Date.now() - busyDeferState.start,
          cap_expired: true,
          phase: lit("cap_expired"),
        });
      }
    } else {
      if (busyDeferState !== null)
        logEvent("tengu_daemon_upgrade_deferred_busy", {
          busy_workers: busyWorkerCount,
          deferred_ms: Date.now() - busyDeferState.start,
          cap_expired: false,
          phase: lit("resolved"),
        });
      busyDeferState = null;
    }
    if (isShuttingDown()) return false;
    isUpgrading = true;
    if (currentIdentity === null)
      bgDispatchLog.write(
        "supervisor",
        `binary at ${binaryPath} was deleted (was ${binaryIdentity.target}) \u2014 exiting for upgrade`,
      );
    else {
      let changeDescription =
        binaryIdentity.target === currentIdentity.target
          ? "mtime changed"
          : `${binaryIdentity.target} \u2192 ${currentIdentity.target}`;
      bgDispatchLog.write(
        "supervisor",
        `binary at ${binaryPath} changed (${changeDescription}) \u2014 self-restarting for upgrade`,
      );
    }
    resolveMainPromise?.();
    return true;
  };
  let idleTimer = null;
  let everHadClient = false;
  let liveClientCount = () =>
    (managerHolder.manager?.leaseCount() ?? 0) + (managerHolder.manager?.liveHandleCount() ?? 0);
  let scheduleIdleCheck = () => {
    if (origin !== "transient") return;
    if (isIdleExit || isUpgrading || isShutdownRequested || isYielding || bgManagerFailed || signal.aborted)
      return;
    if (liveClientCount() > 0) {
      everHadClient = true;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      return;
    }
    if (idleTimer) return;
    let graceMs = everHadClient ? idleGraceMs : startupIdleGraceMs;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (liveClientCount() > 0) {
        everHadClient = true;
        return;
      }
      if (signal.aborted || isUpgrading) return;
      if (busyDeferState !== null) {
        scheduleIdleCheck();
        return;
      }
      isIdleExit = true;
      let configuredWorkerCount = manager?.workerCount() ?? 0;
      bgDispatchLog.write(
        "supervisor",
        `idle ${Math.round(graceMs / 1000)}s with no clients \u2014 exiting` +
          (configuredWorkerCount > 0 ? ` (stopping ${configuredWorkerCount} configured workers)` : ""),
      );
      logEvent("tengu_daemon_idle_exit", {
        grace_ms: graceMs,
        never_had_client: !everHadClient,
        cfg_workers: configuredWorkerCount,
      });
      resolveMainPromise?.();
    }, graceMs);
  };
  auth.ready
    .then(() =>
      runBgManagerLoop((line) => bgDispatchLog.write("bg", line), {
        getAuthSnapshot: origin === "service" ? () => auth.getAuthSnapshot() : undefined,
        onNudge: async () => ({
          restarting: await pollUpgrade(),
          upgradePending: busyDeferState !== null,
        }),
        onShutdown: () => {
          isShutdownRequested = true;
          bgDispatchLog.write("supervisor", "shutdown requested via control socket");
          resolveMainPromise?.();
        },
        onYield,
        onKeepAliveChange: scheduleIdleCheck,
        storageV5,
        credentials,
        isShuttingDown,
      }),
    )
    .then((bgManager) => {
      if (isShuttingDown())
        return void (async () => {
          if (isServiceRecall && !wasDisplaced && (await probeDisplacingDaemon()) === null)
            bgManager.killAll("SIGTERM");
          await bgManager.close({
            skipPathCleanup: true,
          });
        })().catch((error) => logError(redactErrorPaths(error)));
      managerHolder.manager = bgManager;
      scheduleIdleCheck();
    })
    .catch((error) => {
      logBgManagerStartError(redactErrorPaths(error));
      if (isShuttingDown()) return;
      let errnoCode = getErrnoCode(error);
      let errorText = `${errnoCode ? `[${errnoCode}] ` : ""}${redactDaemonPipeKey(toError(error).message.replace(/\s*\n\s*/g, " "))}`;
      if (origin === "service") {
        bgDispatchLog.write(
          "supervisor",
          `bg manager failed to start: ${errorText} \u2014 control pipe unavailable; bg sessions disabled (registry workers keep running)`,
        );
        releaseDaemonLock(lockPayload, storageV5).catch(logError);
        return;
      }
      bgDispatchLog.write(
        "supervisor",
        `bg manager failed to start: ${errorText} \u2014 control pipe unavailable; exiting`,
      );
      process.stderr.write(`bg manager failed to start: ${errorText}
`);
      bgManagerFailed = true;
      resolveMainPromise?.();
    });
  manager = await runDaemonSupervisor({
    jsonPath,
    invocation: launchCommand,
    logger: bgDispatchLog,
    authManager: auth,
    watch,
    storageV5,
  });
  let configuredWorkerCount = manager.workerCount();
  bgDispatchLog.write("supervisor", `workers=${configuredWorkerCount}`);
  if (configuredWorkerCount > 0)
    bgDispatchLog.write(
      "supervisor",
      "daemon.json has configured workers but they do not pin the supervisor \u2014 they stop when the last client lease and bg job are gone",
    );
  logEvent("tengu_daemon_start", {
    worker_kinds: Object.keys(WORKER_KINDS).length,
    worker_count: configuredWorkerCount,
    origin: fromEnum(origin),
  });
  logFeatureOk("daemon_start");
  scheduleIdleCheck();
  let staleCheckTimer = null;
  try {
    await new Promise((resolve) => {
      resolveMainPromise = resolve;
      if (signal.aborted || isUpgrading || isIdleExit || isShutdownRequested || isYielding || bgManagerFailed)
        return void resolve();
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
      if (!binaryIdentity)
        bgDispatchLog.write(
          "supervisor",
          `binary identity unresolvable at ${binaryPath}; upgrade polling disabled`,
        );
      staleCheckTimer = setInterval(() => {
        if (signal.aborted || isUpgrading || isServiceRecall || isYielding) {
          if (staleCheckTimer) {
            clearInterval(staleCheckTimer);
            staleCheckTimer = null;
          }
          return;
        }
        pollUpgrade();
        if (origin === "service" && isDaemonServiceRecalled()) {
          isServiceRecall = true;
          bgDispatchLog.write(
            "supervisor",
            "service recall flag set \u2014 draining workers and uninstalling service",
          );
          resolveMainPromise?.();
        }
        if (origin === "transient" && !isYielding)
          probeDisplacingDaemon()
            .then((displacingPid) => {
              if (displacingPid !== null && !isYielding && !signal.aborted) {
                wasDisplaced = true;
                isYielding = true;
                bgDispatchLog.write(
                  "supervisor",
                  `lockfile now held by pid=${displacingPid} \u2014 displaced, yielding`,
                );
                logEvent("tengu_daemon_yield", {
                  displaced: true,
                  displaced_by_pid: displacingPid,
                });
                resolveMainPromise?.();
              }
            })
            .catch((error) => logError(redactErrorPaths(error)));
      }, staleCheckIntervalMs);
    });
  } finally {
    resolveMainPromise = null;
    if (staleCheckTimer) {
      clearInterval(staleCheckTimer);
      staleCheckTimer = null;
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }
  if (isUpgrading) logEvent("tengu_daemon_self_restart_on_upgrade", {});
  if (isServiceRecall) logEvent("tengu_copper_lantern", {});
  manager.disposeWatcher();
  await manager.drainReloads();
  if (!wasDisplaced) {
    let displacingPid = await probeDisplacingDaemon();
    if (displacingPid !== null) {
      wasDisplaced = true;
      bgDispatchLog.write(
        "supervisor",
        `lockfile now held by pid=${displacingPid} \u2014 displaced; leaving successor's control.sock in place`,
      );
    }
  }
  let exitCause =
    isUpgrading && !wasDisplaced
      ? "upgrade"
      : isServiceRecall
        ? "service_recall"
        : wasDisplaced
          ? "displaced"
          : isYielding
            ? "yield"
            : isShutdownRequested
              ? "shutdown_op"
              : isIdleExit
                ? "idle_exit"
                : bgManagerFailed
                  ? "bg_manager_failed"
                  : signal.aborted
                    ? "signal"
                    : "unknown";
  let uptimeMs = Date.now() - lockPayload.startedAt;
  bgDispatchLog.write(
    "supervisor",
    `shutting down (cause=${exitCause}, uptime=${Math.round(uptimeMs / 1000)}s, leases=${managerHolder.manager?.leaseCount() ?? -1}, live_workers=${managerHolder.manager?.liveHandleCount() ?? -1})`,
  );
  logEvent("tengu_daemon_exit", {
    cause: fromEnum(exitCause),
    uptime_ms: uptimeMs,
    lease_count: managerHolder.manager?.leaseCount() ?? -1,
    live_handles: managerHolder.manager?.liveHandleCount() ?? -1,
    ever_had_keep_alive: everHadClient,
    origin: fromEnum(origin),
  });
  managerHolder.manager?.announceExit(exitCause);
  let lockReleased = false;
  let releaseOwnLock = async () => {
    if (lockReleased) return;
    lockReleased = true;
    let daemonLock = await readDaemonLock(storageV5);
    if (daemonLock && daemonLock.pid === lockPayload.pid && daemonLock.startedAt === lockPayload.startedAt)
      await deleteDaemonLock(storageV5);
  };
  if (isYielding) {
    await managerHolder.manager?.close({
      displaced: wasDisplaced,
    });
    managerHolder.manager = null;
  }
  if (isIdleExit || isServiceRecall || isYielding || bgManagerFailed) {
    await releaseOwnLock();
    if (isServiceRecall && !wasDisplaced) {
      managerHolder.manager?.killAll("SIGTERM");
      if (!managerHolder.manager) {
        let roster = await readRoster(
          {
            silent: true,
          },
          storageV5,
        ).catch(() => null);
        for (let worker of Object.values(roster?.workers ?? {}))
          if (worker.pid > 0) {
            await killVerifiedProcess(worker.pid, worker.procStart).catch(() => false);
            await reapDetachedRepl(worker.replPid, worker.replProcStart).catch(() => false);
          }
      }
    }
  }
  await Promise.all([
    managerHolder.manager?.close({
      displaced: wasDisplaced,
    }),
    manager.stop(exitCause === "upgrade" ? "upgrade" : exitCause === "yield" ? "yield" : undefined),
  ]);
  await releaseOwnLock();
  if (isServiceRecall) await uninstallDaemonService();
  await bgDispatchLog.close();
  auth.dispose();
  return {
    upgradeDetected: isUpgrading,
    exitCode: bgManagerFailed ? 1 : 0,
  };
}
export { runBgManager };
