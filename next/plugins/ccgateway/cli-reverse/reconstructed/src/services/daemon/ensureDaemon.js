/**
 * services/daemon/ensureDaemon.ts
 *
 * 确保后台守护进程运行与二进制接管（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y2nrbm62.js (29)
 * attribution: placement 29
 */
import { setTimeout as Be } from "timers/promises";
import { rm, realpath, lstat, readFile } from "fs/promises";
import { dirname } from "path";
import { controlRequest } from "./controlClient.js";
import { BG_PROTO, DAEMON_LEASE_LABELS } from "./leaseProtocol.js";
import {
  readLiveServerLock,
  hasProcIdentity,
  signalPid,
  lockHolderProblemText,
  daemonLockPath,
} from "../../utils/daemon/daemonLock.js";
import {
  processWrapperError,
  processWrapperRecord,
  isProcessWrapperUsable,
  processWrapperArgv,
  PROCESS_WRAPPER_ENV,
} from "../../utils/processWrapper.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeVersion } from "../analytics/metadata.js";
import {
  sanitizeErrnoTokenForTelemetry,
  DAEMON_UNREACHABLE_TIMEOUT_PHRASE,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
  errorMessage,
  DAEMON_EXITED_BEFORE_REACHABLE_PHRASE,
} from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { uidsCollapse } from "../../utils/sandbox/userNamespace.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { UNMAPPED_NAMESPACE_REFUSAL, daemonControlSocket } from "./paths.js";
import {
  checkServiceExecStart,
  startDaemonService,
  semverModule,
  hasSystemdUserSession,
  daemonServiceStatus,
  isDaemonServiceInstalled,
} from "./serviceInstall.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import {
  getDaemonColdStart,
  bgSupervisorNoun,
  isDaemonServiceInstallEnabled,
  isDaemonCliEnabled,
} from "../../utils/fleetGates.js";
import { getGlobalConfig } from "../../utils/config.js";
import {
  getSpawnLauncherState,
  spawnDetachedSupervisor,
  NPM_REINSTALL_MAX_WAIT_MS,
  createSpawnAttempt,
  waitForDaemonUp,
  isNpmStubSpawnFailure,
  waitForReinstalledBinary,
  EXTENDED_SPAWN_WAIT_MS,
  shouldStopWaitingForDaemon,
  readSpawnStderr,
  classifyDaemonStderr,
  describeDaemonLockAtDeadline,
  execTokenIsRunnable,
} from "./spawnLauncher.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getCwd } from "../../utils/cwd.js";
import { lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { collapseWhitespace, truncateToLength } from "../../utils/stringUtils.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { getLaunchCommand, resolveLaunchTarget } from "../../utils/deepLink/registerProtocol.js";
import { parseRcVersionTimestamp, rcChannelSuffix, isRcChannelVersion } from "./reapJobs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { SOCKET_READY_TIMEOUT_MS } from "./controlServer.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { storageErrorCode } from "../../utils/storage/storageErrors.js";

//@ chunk-y2nrbm62.js:38127-38140 placement
/**
 * 等待守护进程启动的总预算（45 秒）。
 */
var DAEMON_START_BUDGET_MS = 45000;
//@ chunk-y2nrbm62.js:38140-38272 placement
/**
 * 在给定时间内反复 ping daemon，成功返回 true。
 */
async function waitForDaemonPing(timeoutMs) {
  let deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      (
        await controlRequest({
          proto: BG_PROTO,
          op: "ping",
        })
      ).ok
    )
      return true;
    await Be(100);
  }
  return false;
}
//@ chunk-y2nrbm62.js:38272-38561 placement
/**
 * 等待服务方式启动的 daemon 就绪：ping 通后读取服务锁，来源为 service 时返回，前台来源或超时返回 null。
 */
async function waitForServiceDaemon(timeoutMs, storageV5) {
  let deadline = Date.now() + timeoutMs;
  let nextCheckAt = 0;
  while (true) {
    let remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    if (await waitForDaemonPing(Math.min(remaining, 1000))) {
      let now = Date.now();
      if (now >= nextCheckAt) {
        nextCheckAt = now + 1000;
        let lock = await readLiveServerLock(1, storageV5).catch(() => null);
        if (lock?.origin === "service") return lock;
        if (lock?.origin === "foreground") return null;
      }
      await Be(100);
    }
  }
}
//@ chunk-y2nrbm62.js:38561-40174 placement
async function restartDaemon(forceTransient, storageV5) {
  let now = Date.now();
  let extendedWindow = false;
  let daemonVersion;
  let outcome = "restarting";
  let connectErrno;
  while (Date.now() < now + (extendedWindow ? 30000 : 1e4)) {
    let nudge = await controlRequest({
      proto: BG_PROTO,
      op: "nudge",
    });
    if (nudge.ok && nudge.op === "nudge") {
      extendedWindow = true;
      daemonVersion = nudge.version;
      if (!nudge.restarting) {
        if (
          await takeOverBackgroundBinary(
            nudge.version,
            forceTransient,
            nudge.processWrapper,
            nudge.upgradePending === true,
            storageV5,
          )
        )
          return "retired";
        let wrapperError = processWrapperError();
        if (wrapperError && !nudge.processWrapper)
          return {
            refuse: wrapperError,
          };
        if (!nudge.processWrapper && processWrapperRecord() !== "" && !(await isProcessWrapperUsable()))
          return {
            refuse: describeMissingLauncher(),
          };
        logLauncherMatch(nudge.processWrapper);
        let versionSkew =
          nudge.version !==
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION;
        if (Date.now() - now > 200 || versionSkew)
          logEvent("tengu_bg_skew_nudge", {
            converged: true,
            duration_ms: Date.now() - now,
            daemon_version: sanitizeVersion(nudge.version),
            skewed: versionSkew,
          });
        return "up";
      }
      outcome = "restarting";
      await Be(100);
      continue;
    }
    if (!nudge.ok && nudge.code === "ETIMEOUT") {
      extendedWindow = true;
      outcome = "etimeout";
      await Be(100);
      continue;
    }
    if (!nudge.ok && nudge.code === "ENOCONN") {
      if (!extendedWindow) {
        let lock = await readLiveServerLock(1, storageV5).catch(() => null);
        if (lock?.bgDisabled) return "down";
        if (lock) extendedWindow = true;
      }
      connectErrno = sanitizeErrnoTokenForTelemetry(nudge.errno);
      if (!extendedWindow) return "down";
      outcome = "enoconn";
      await Be(100);
      continue;
    }
    {
      let wrapperError = processWrapperError();
      if (wrapperError)
        return {
          refuse: wrapperError,
        };
      if (processWrapperRecord() !== "" && !(await isProcessWrapperUsable()))
        return {
          refuse: describeMissingLauncher(),
        };
    }
    return "up";
  }
  logEvent("tengu_bg_skew_nudge", {
    converged: false,
    restarting: outcome === "restarting",
    etimeout: outcome === "etimeout",
    enoconn: outcome === "enoconn",
    daemon_version: sanitizeVersion(daemonVersion),
    ...(connectErrno && {
      connect_errno: connectErrno,
    }),
  });
  return "down";
}
//@ chunk-y2nrbm62.js:40174-40337 placement
/**
 * 确保后台守护进程运行；非 Windows 上 uid 折叠（如 sudo 下）时直接失败。
 */
async function ensureDaemon(options = {}, spawnArgs) {
  if (getPlatform() !== "windows" && uidsCollapse()) {
    logFeatureBad("daemon_ensure_running", "uid_collapse");
    return {
      ok: false,
      reason: UNMAPPED_NAMESPACE_REFUSAL,
      causeCode: "uid_collapse",
    };
  }
  return ensureDaemonRunning(options, spawnArgs, false);
}
//@ chunk-y2nrbm62.js:40337-47589 placement
/**
 * 确保后台守护进程在运行（必要时经 agent_launcher 拉起）
 */
async function ensureDaemonRunning(options, storageV5, isRetry) {
  let now = Date.now();
  let nudgeOutcome = await restartDaemon(options.forceTransient ?? false, storageV5);
  if (nudgeOutcome === "up") {
    logEnsureOutcome(isRetry);
    return {
      ok: true,
    };
  }
  if (typeof nudgeOutcome === "object") {
    if (options.spawnIntent) {
      logFeatureBad("daemon_ensure_running", "daemon_ensure_client_wrapper_refused");
      logFeatureBad("agent_launcher", "raw_daemon_client_misconfigured");
      return {
        ok: false,
        reason: nudgeOutcome.refuse,
        causeCode: "wrapper",
      };
    }
    logEnsureOutcome(isRetry);
    return {
      ok: true,
    };
  }
  let now_2 = Date.now();
  let clockJump = now_2 - now > 40000;
  let standsDownAtExit = options.standsDownAtExit && nudgeOutcome !== "retired";
  let serviceActive = await isSystemdDaemonActive();
  let serviceCheck = serviceActive
    ? await checkServiceExecStart()
    : {
        execPathStale: false,
        launcherPrefixDead: false,
      };
  let serviceStale = serviceActive && (serviceCheck.execPathStale || serviceCheck.launcherPrefixDead);
  if (serviceStale) {
    logEvent("tengu_bg_daemon_service_stale_exec", {
      launcher_dead: serviceCheck.launcherPrefixDead,
    });
    logForDebugging(
      serviceCheck.execPathStale
        ? "daemon service exec path is stale (binary deleted) \u2014 falling back to transient spawn. Run 'claude daemon install' to repair."
        : "daemon service unit starts through a launcher that was deleted or is no longer executable \u2014 falling back to transient spawn. Run 'claude daemon install' to repair.",
      {
        level: "warn",
      },
    );
  }
  let triedService = false;
  if (serviceActive && !serviceStale) {
    triedService = true;
    if (standsDownAtExit && isTerminalShutdown()) return standDownAtExit(true, now);
    options.onStarting?.();
    let disabled = await checkBackgroundDisabled(storageV5);
    if (disabled) {
      logFeatureBad("daemon_ensure_running", disabled.code);
      return {
        ok: false,
        reason: disabled.reason,
        causeCode: disabled.causeCode,
      };
    }
    let daemonService = await startDaemonService();
    let serviceUp = await waitForDaemonPing(5000);
    logEvent("tengu_bg_daemon_install", {
      outcome_ok: serviceUp,
      via_service: true,
      fresh_install: false,
      clock_jump: clockJump,
      duration_ms: Date.now() - now,
      platform_darwin: getPlatform() === "macos",
      platform_linux: getPlatform() === "linux",
      platform_windows: getPlatform() === "windows",
    });
    if (serviceUp) {
      logEnsureOutcome(isRetry);
      return {
        ok: true,
      };
    }
    logEvent("tengu_bg_daemon_service_poll_fallthrough", {
      sr_ok: daemonService.ok,
    });
    logForDebugging(
      `daemon service ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} 5s${daemonService.ok ? "" : ` (${daemonService.error})`} \u2014 falling back to transient spawn. Run 'claude daemon install' to repair.`,
      {
        level: "warn",
      },
    );
  }
  if (
    !serviceActive &&
    !options.forceTransient &&
    getDaemonColdStart() === "ask" &&
    (await shouldInstallDaemonService()) &&
    !getGlobalConfig().daemonInstallPromptDismissed
  ) {
    logEvent("tengu_bg_daemon_cold_start_ask", {});
    return {
      ok: false,
      askInstall: true,
      causeCode: "ask",
      reason:
        "No background daemon is running. Run 'claude daemon install' to set it up as a persistent service.",
    };
  }
  if (!triedService) {
    let wrapperError = processWrapperError();
    if (!(await isProcessWrapperUsable()) && (await readLiveServerLock(1, storageV5).catch(() => null))) {
      logFeatureBad("daemon_ensure_running", "daemon_ensure_client_wrapper_refused");
      logFeatureBad("agent_launcher", "zombie_kill_client_misconfigured");
      return {
        ok: false,
        reason: wrapperError ?? describeMissingLauncher(),
        causeCode: "wrapper",
      };
    }
    if (standsDownAtExit && isTerminalShutdown()) return standDownAtExit(false, now);
    options.onStarting?.();
    let disabled = await checkBackgroundDisabled(storageV5);
    if (disabled) {
      logFeatureBad("daemon_ensure_running", disabled.code);
      return {
        ok: false,
        reason: disabled.reason,
        causeCode: disabled.causeCode,
      };
    }
  }
  let spawnLauncherState = getSpawnLauncherState();
  let sinceLastSpawnMs =
    spawnLauncherState.lastTransientSpawnAt === null
      ? null
      : Date.now() - spawnLauncherState.lastTransientSpawnAt;
  spawnLauncherState.lastTransientSpawnAt = Date.now();
  let spawnedBy = jsonStringify({
    label: getInvocationLabel(),
    cwd: getCwd(),
    ...options.spawnedBy,
    pid: process.pid,
  });
  let now_3 = Date.now();
  let daemonArgs = ["daemon", "run", "--origin", "transient", "--spawned-by", spawnedBy];
  let spawnDaemon = () =>
    spawnDetachedSupervisor(daemonArgs, undefined, {
      withoutOAuthTokenEnv: options.withoutOAuthTokenEnv,
    });
  let launchResult = await spawnDaemon();
  let {
    err,
    child,
    recoveredAfterReinstallWait,
    gaveUpOnNpmInstallInProgress,
    reinstallWaitedMs = 0,
  } = launchResult;
  let stderrPath = launchResult.stderrPath;
  if (err) {
    if (stderrPath)
      rm(dirname(stderrPath), {
        recursive: true,
        force: true,
      }).catch(() => {});
    logEvent("tengu_bg_daemon_spawn_failed", {
      errno_enoent: getErrnoCode(err) === "ENOENT",
      errno_eacces: getErrnoCode(err) === "EACCES",
      errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
      launcher_configured: processWrapperArgv().length > 0 || processWrapperError() !== null,
    });
    logFeatureBad("daemon_ensure_running", "daemon_ensure_spawn_failed");
    return {
      ok: false,
      reason: gaveUpOnNpmInstallInProgress
        ? `Claude Code is being updated by npm on this machine (still not runnable after ${Math.round(NPM_REINSTALL_MAX_WAIT_MS / 60000)} min, ${sanitizeErrnoForTelemetry(err) ?? "spawn failed"}) \u2014 try again when the update finishes`
        : `spawn ${bgSupervisorNoun()}: ${errorMessage(err)}`,
      causeCode: sanitizeErrnoForTelemetry(err) ?? "spawn",
    };
  }
  let spawnAttempt = createSpawnAttempt({
    spawnIssuedAt: now_3 + reinstallWaitedMs,
    child,
    stderrPath,
    wrapperConfigured: processWrapperArgv().length > 0,
    storageV5,
  });
  let daemonUp = await waitForDaemonUp(spawnAttempt, Date.now() + 30000, false);
  let clockJumpLate = Date.now() - now_2 - reinstallWaitedMs > 60000;
  if (!daemonUp && clockJumpLate) daemonUp = await waitForDaemonUp(spawnAttempt, Date.now() + 5000, false);
  if (!daemonUp && !clockJumpLate)
    daemonUp = await waitForDaemonUp(
      spawnAttempt,
      Math.max(
        Date.now() + (DAEMON_START_BUDGET_MS - 30000),
        spawnAttempt.spawnIssuedAt + DAEMON_START_BUDGET_MS,
      ),
      true,
    );
  let respawnedAfterReinstall = false;
  let waitedMsTotal = 0;
  let gaveUpOnNpmInstall = false;
  if (!daemonUp && !clockJumpLate && (await isNpmStubSpawnFailure(spawnAttempt, getLaunchTarget()))) {
    let recovery = await waitForReinstalledBinary(getLaunchTarget());
    waitedMsTotal += recovery.waitedMs;
    logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
      waited_ms: recovery.waitedMs,
      recovered: recovery.recovered,
      extended: recovery.extended,
      install_in_progress: recovery.installInProgressAtEnd,
      after_child_exit: true,
    });
    gaveUpOnNpmInstall = !recovery.recovered && recovery.installInProgressAtEnd;
    if (recovery.recovered) {
      let relaunch = await spawnDaemon();
      if (relaunch.err === null) {
        respawnedAfterReinstall = true;
        waitedMsTotal = 0;
        if (stderrPath)
          rm(dirname(stderrPath), {
            recursive: true,
            force: true,
          }).catch(() => {});
        stderrPath = relaunch.stderrPath;
        spawnAttempt = createSpawnAttempt({
          spawnIssuedAt: Date.now(),
          child: relaunch.child,
          stderrPath,
          wrapperConfigured: processWrapperArgv().length > 0,
          storageV5,
        });
        logForDebugging(
          `daemon: ${getLaunchTarget()} was being reinstalled when the first daemon was spawned (it exited at once); restarted it after ${recovery.waitedMs}ms`,
        );
        daemonUp = await waitForDaemonUp(
          spawnAttempt,
          spawnAttempt.spawnIssuedAt + DAEMON_START_BUDGET_MS,
          true,
        );
      } else {
        logForDebugging(
          `daemon: respawn after the npm reinstall window failed: ${errorMessage(relaunch.err)}`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_bg_daemon_spawn_failed", {
          errno: sanitizeErrnoForTelemetry(relaunch.err) ?? lit("unknown"),
          launcher_configured: processWrapperArgv().length > 0 || processWrapperError() !== null,
          after_reinstall_wait: true,
        });
        if (relaunch.stderrPath)
          rm(dirname(relaunch.stderrPath), {
            recursive: true,
            force: true,
          }).catch(() => {});
      }
    }
  }
  let budgetMs = spawnAttempt.budgetExtended ? EXTENDED_SPAWN_WAIT_MS : DAEMON_START_BUDGET_MS;
  let budgetExceeded =
    !daemonUp && !clockJumpLate && Date.now() - spawnAttempt.spawnIssuedAt - waitedMsTotal > budgetMs + 60000;
  let shouldRetryClockJump =
    !daemonUp &&
    (clockJumpLate || budgetExceeded) &&
    !isRetry &&
    !(await shouldStopWaitingForDaemon(spawnAttempt));
  let hadStderr = false;
  let stderrErrno;
  let stderrSummary;
  let stderrClass;
  if (!daemonUp) {
    let stderr = await readSpawnStderr(spawnAttempt, true);
    stderrClass = classifyDaemonStderr(stderr);
    if (stderr.length > 0) {
      hadStderr = true;
      logForDebugging(
        `daemon: transient spawn stderr:
${stderr}`,
        {
          level: "error",
        },
      );
      stderrErrno = [...stderr.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (match) => !"/\\".includes(stderr[match.index - 1] ?? "."),
      )?.[0];
      let found = stderr
        .split(/\r?\n/)
        .map((line) => collapseWhitespace(stripAnsiPerLine(line)))
        .find((line) => line.length > 0);
      stderrSummary = found && found.length > 200 ? `${truncateToLength(found, 200)}\u2026` : found;
    }
  }
  if (stderrPath)
    rm(dirname(stderrPath), {
      recursive: true,
      force: true,
    }).catch(() => {});
  logEvent("tengu_bg_daemon_install", {
    outcome_ok: daemonUp,
    via_service: false,
    fresh_install: false,
    clock_jump: clockJumpLate || clockJump || budgetExceeded,
    duration_ms: Date.now() - now,
    platform_darwin: getPlatform() === "macos",
    platform_linux: getPlatform() === "linux",
    platform_windows: getPlatform() === "windows",
    had_stderr: hadStderr,
    child_exited: spawnAttempt.childExit !== null,
    ...(spawnAttempt.childExit?.code !== undefined &&
      spawnAttempt.childExit.code !== null && {
        exit_code: spawnAttempt.childExit.code,
      }),
    ...(spawnAttempt.childExit?.signal && {
      exit_signal: fromEnumOpt(spawnAttempt.childExit.signal),
    }),
    ...(spawnAttempt.childExitAt !== null && {
      child_exit_ms: Math.max(0, spawnAttempt.childExitAt - spawnAttempt.spawnIssuedAt),
    }),
    ...(stderrClass && {
      stderr_class: stderrClass,
    }),
    reinstall_respawn: respawnedAfterReinstall,
    budget_extended: spawnAttempt.budgetExtended,
    ...(shouldRetryClockJump && {
      clock_jump_retry: lit("scheduled"),
    }),
    ...(isRetry && {
      clock_jump_retry: lit("retry"),
    }),
    ...(sinceLastSpawnMs !== null && {
      spawn_gap_ms: sinceLastSpawnMs,
    }),
    ...(options.spawnedBy !== undefined && {
      spawned_by:
        fromEnumOpt(DAEMON_LEASE_LABELS.find((label) => label === options.spawnedBy?.label)) ?? lit("other"),
    }),
    ...(stderrErrno && {
      stderr_errno: sanitizeErrnoTokenForTelemetry(stderrErrno),
    }),
    ...(!daemonUp && (await describeDaemonLockAtDeadline(spawnAttempt))),
  });
  if (daemonUp) {
    readLogindConfig();
    if (recoveredAfterReinstallWait || respawnedAfterReinstall)
      logFeatureSad("daemon_ensure_running", "daemon_ensure_spawn_waited_reinstall");
    else logEnsureOutcome(isRetry);
    if (processWrapperArgv().length > 0) {
      let nudge = await controlRequest({
        proto: BG_PROTO,
        op: "nudge",
      }).catch(() => null);
      logLauncherMatch(nudge?.ok && nudge.op === "nudge" ? nudge.processWrapper : undefined);
    }
    return {
      ok: true,
    };
  }
  if (shouldRetryClockJump) {
    logForDebugging(
      "daemon: the clock jumped during the cold start (machine slept?) and the daemon is still unreachable \u2014 retrying the whole start once",
      {
        level: "warn",
      },
    );
    return ensureDaemonRunning(
      {
        ...options,
        onStarting: undefined,
        standsDownAtExit: false,
      },
      storageV5,
      true,
    );
  }
  logFeatureBad("daemon_ensure_running", "daemon_ensure_transient_unreachable");
  let npmNote = gaveUpOnNpmInstall
    ? ` \u2014 Claude Code is being updated by npm on this machine (still not runnable after ${Math.round(NPM_REINSTALL_MAX_WAIT_MS / 60000)} min); try again when the update finishes`
    : "";
  let launcherCommand = processWrapperArgv()[0];
  if (launcherCommand) {
    logEvent("tengu_bg_daemon_spawn_failed", {
      launcher_configured: true,
      failed_stage: lit("unknown"),
    });
    logFeatureBad("agent_launcher", "daemon_never_reachable");
    return {
      ok: false,
      causeCode: "timeout",
      reason: `launcher \`${launcherCommand}\` ran but Claude Code never started${stderrSummary ? ` \u2014 ${stderrSummary}` : ` (nothing on stderr within ${budgetMs / 1000}s)`}${npmNote}`,
    };
  }
  let childExit = spawnAttempt.siblingHolderSeen ? null : spawnAttempt.childExit;
  if (childExit) {
    let exitDescription = childExit.signal
      ? `signal ${childExit.signal}`
      : `exit code ${childExit.code ?? "?"}`;
    return {
      ok: false,
      causeCode: "exited",
      reason: stderrSummary
        ? `${bgSupervisorNoun()} ${DAEMON_EXITED_BEFORE_REACHABLE_PHRASE} (${exitDescription}): ${stderrSummary}${npmNote}`
        : `${bgSupervisorNoun()} ${DAEMON_EXITED_BEFORE_REACHABLE_PHRASE} (${exitDescription}, nothing on stderr) and no other ${bgSupervisorNoun()} answered within ${Math.round(Math.min(Date.now() - spawnAttempt.spawnIssuedAt - waitedMsTotal, budgetMs) / 1000)}s${npmNote}`,
    };
  }
  return {
    ok: false,
    causeCode: "timeout",
    reason: `${bgSupervisorNoun()} ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} ${budgetMs / 1000}s${npmNote}`,
  };
}
//@ chunk-y2nrbm62.js:47589-47901 placement
/**
 * 进程正在退出时放弃启动 daemon：记录日志与事件，返回 stoodDown 结果。
 */
function standDownAtExit(viaService, exiting) {
  logForDebugging("daemon: not started, because this process is exiting");
  logEvent("tengu_bg_daemon_stood_down_at_exit", {
    via_service: viaService,
    duration_ms: Date.now() - exiting,
  });
  logFeatureSad("daemon_ensure_running", "daemon_ensure_stood_down_at_exit");
  return {
    ok: false,
    stoodDown: true,
    viaService,
    causeCode: "exiting",
    reason: "this process is exiting",
  };
}
//@ chunk-y2nrbm62.js:47901-48018 placement
function logEnsureOutcome(jumped) {
  if (jumped) {
    logFeatureSad("daemon_ensure_running", "daemon_ensure_clock_jump_retried");
    return;
  }
  logFeatureOk("daemon_ensure_running");
}
//@ chunk-y2nrbm62.js:48018-48051 placement
/**
 * 取启动命令的目标（当前可执行文件/通道）。
 */
function getLaunchTarget() {
  return getLaunchCommand().target;
}
//@ chunk-y2nrbm62.js:48051-48506 placement
/**
 * 判断客户端是否应接管临时守护进程：版本与目标不同且客户端更新（同通道比构建时间，否则按 semver）。
 */
function shouldTakeOverDaemon(info) {
  if (info.daemonOrigin !== "transient") return false;
  if (info.daemonVersion === info.clientVersion) return false;
  if (info.daemonTarget === info.clientTarget) return false;
  let rcVersionTimestamp = parseRcVersionTimestamp(info.daemonVersion);
  let rcVersionTimestamp_2 = parseRcVersionTimestamp(info.clientVersion);
  if (rcVersionTimestamp !== null && rcVersionTimestamp_2 !== null) {
    if (rcChannelSuffix(info.daemonVersion) !== rcChannelSuffix(info.clientVersion)) return false;
    return rcVersionTimestamp_2 > rcVersionTimestamp;
  }
  if (isRcChannelVersion(info.daemonVersion) || isRcChannelVersion(info.clientVersion)) return false;
  return (
    semverModule.valid(info.clientVersion) !== null &&
    semverModule.valid(info.daemonVersion) !== null &&
    semverModule.gt(info.clientVersion, info.daemonVersion)
  );
}
//@ chunk-y2nrbm62.js:48506-51896 placement
/**
 * 后台二进制接管：新版本替换正在运行的后台守护进程
 */
async function takeOverBackgroundBinary(version, standsDownAtExit, hasLauncher, upgradePending, storageV5) {
  if (processWrapperError() !== null) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_binary_takeover", true)) return false;
  let versionDiffers =
    version !==
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION;
  let wantsVersionTakeover = versionDiffers && !upgradePending;
  let wantsPrefixTakeover = shouldUseLauncherPrefix(hasLauncher, versionDiffers);
  if (!wantsVersionTakeover && !wantsPrefixTakeover) return false;
  if (!(await isProcessWrapperUsable())) return false;
  if (await isSystemdDaemonActive()) return false;
  if (
    !standsDownAtExit &&
    getDaemonColdStart() === "ask" &&
    (await shouldInstallDaemonService()) &&
    !getGlobalConfig().daemonInstallPromptDismissed
  )
    return false;
  let targetPath = await realpath(getLaunchTarget()).catch(() => null);
  if (!targetPath) return false;
  let cmd = resolveLaunchTarget().cmd;
  if (!(await execTokenIsRunnable(cmd))) {
    let cmd_2 = resolveLaunchTarget({
      pinToCurrentBinary: true,
    }).cmd;
    if (cmd_2 === cmd || !(await execTokenIsRunnable(cmd_2))) return false;
  }
  let lock = await readLiveServerLock(1, storageV5).catch(() => null);
  if (!lock) return false;
  if (!hasProcIdentity(lock)) {
    logForDebugging(`bg: skipping stale-daemon retire \u2014 lock pid ${lock.pid} has no procStart identity`);
    return false;
  }
  let takeover = shouldTakeOverDaemon({
    daemonVersion: lock.version,
    daemonOrigin: lock.origin,
    daemonTarget: lock.launchTarget,
    clientVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    clientTarget: targetPath,
  });
  let byVersion = wantsVersionTakeover && takeover;
  let byPrefix =
    wantsPrefixTakeover &&
    lock.origin === "transient" &&
    !lock.processWrapper &&
    (lock.version ===
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION ||
      (upgradePending && takeover));
  if (!byVersion && !byPrefix) return false;
  let signalResult = await signalPid(lock.pid);
  if (signalResult === "timed-out") {
    try {
      process.kill(lock.pid, "SIGKILL");
    } catch {}
    signalResult = await signalPid(lock.pid);
  }
  if (signalResult !== "exited") return false;
  if (byPrefix) getSpawnLauncherState().prefixAxis = "took-over";
  logForDebugging(
    byVersion
      ? `bg: ${bgSupervisorNoun()} pid ${lock.pid} runs ${lock.version}; this binary (${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        }) is a newer build \u2014 retired the stale ${bgSupervisorNoun()} so new sessions use the current binary`
      : `bg: ${bgSupervisorNoun()} pid ${lock.pid} predates CLAUDE_CODE_PROCESS_WRAPPER and spawns sessions unwrapped \u2014 retired it so the replacement runs through the configured launcher`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_bg_daemon_binary_takeover", {
    daemon_age_ms: Date.now() - lock.startedAt,
    via_prefix: byPrefix,
    via_version: byVersion,
    daemon_version: sanitizeVersion(lock.version),
  });
  return true;
}
//@ chunk-y2nrbm62.js:51896-52681 placement
/**
 * 判断是否经启动器（CLAUDE_CODE_PROCESS_WRAPPER）拉起守护进程：已由启动器接管后又出现裸进程时记一次警告与事件。
 */
function shouldUseLauncherPrefix(hasLauncher, prefixMode) {
  if (processWrapperRecord() === "" || hasLauncher) return false;
  let launcherState = getSpawnLauncherState();
  if (launcherState.prefixAxis === "took-over") {
    if (prefixMode) return false;
    if (!launcherState.prefixContractViolationLogged) {
      launcherState.prefixContractViolationLogged = true;
      logForDebugging(
        `bg: a raw ${bgSupervisorNoun()} is running again after this session's launcher-driven restart. Two causes look identical from here: a claude session started BEFORE CLAUDE_CODE_PROCESS_WRAPPER was deployed cold-started it (restart those sessions), or the launcher does not pass that variable through in the environment it hands to \`exec\` (launcher contract #3). Sessions dispatched to it run unwrapped either way; \`claude daemon status\` shows the launcher it records.`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_launcher_replacement_raw", {});
    }
    return false;
  }
  if (prefixMode) return true;
  if (launcherState.prefixAxis === "attempted") return false;
  launcherState.prefixAxis = "attempted";
  return true;
}
//@ chunk-y2nrbm62.js:52681-54782 placement
async function checkBackgroundDisabled(storageV5) {
  let lock = await readLiveServerLock(1, storageV5).catch(() => null);
  if (!lock) return null;
  if (lock.bgDisabled) {
    logEvent("tengu_bg_daemon_bg_disabled_skip", {
      origin_service: lock.origin === "service",
    });
    return {
      reason:
        "the background service on this machine is running without background sessions \u2014 its control socket failed to start. " +
        "Check the cause with 'claude daemon status' (daemon.log), then restart the service (launchctl/systemctl, or reboot).",
      code: "daemon_ensure_bg_disabled",
      causeCode: "bg_disabled",
    };
  }
  if (Date.now() - lock.startedAt <= SOCKET_READY_TIMEOUT_MS + 5000) return null;
  let ping = await controlRequest(
    {
      proto: BG_PROTO,
      op: "ping",
    },
    {
      timeoutMs: 1000,
    },
  );
  let fields = {
    started_ago_ms: Date.now() - lock.startedAt,
    origin_transient: lock.origin === "transient",
    origin_service: lock.origin === "service",
    version_skew:
      lock.version !==
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
  };
  if (ping.ok || ping.code === "ETIMEOUT") {
    logEvent("tengu_bg_daemon_zombie_false_positive", {
      ...fields,
      recheck_etimeout: !ping.ok,
    });
    return null;
  }
  if (!hasProcIdentity(lock)) {
    logForDebugging(
      `bg: supervisor lock pid ${lock.pid} alive but identity unverifiable (no procStart) \u2014 not signalled`,
      {
        level: "warn",
      },
    );
    return {
      reason: `${lockHolderProblemText({
        pid: lock.pid,
        outcome: "unverified",
      })}. If no daemon is running, delete ${daemonLockPath()}; if pid ${lock.pid} is a live process you own, stop it yourself first.`,
      code: "daemon_ensure_zombie_unverified",
      causeCode: "zombie",
    };
  }
  let sockExists = false;
  try {
    sockExists = await lstat(daemonControlSocket()).then(
      () => true,
      () => false,
    );
  } catch {}
  logForDebugging(
    `bg: supervisor pid ${lock.pid} alive but control socket unreachable \u2014 signalling restart`,
    {
      level: "warn",
    },
  );
  if ((await signalPid(lock.pid)) === "eperm")
    return {
      reason: `${bgSupervisorNoun()} socket missing; could not restart supervisor (EPERM)`,
      code: "daemon_ensure_zombie_kill_failed",
      causeCode: "zombie",
    };
  logEvent("tengu_bg_daemon_zombie_restart", {
    pid: lock.pid,
    ...fields,
    sock_exists: sockExists,
  });
  return null;
}
//@ chunk-y2nrbm62.js:54782-54860 placement
/**
 * 系统级守护进程是否在运行（有 systemd 用户会话且服务状态正常）。
 */
async function isSystemdDaemonActive() {
  if (isConfigDirOverridden() || !(await hasSystemdUserSession())) return false;
  return daemonServiceStatus().catch(() => false);
}
//@ chunk-y2nrbm62.js:54860-54920 placement
/**
 * CLAUDE_CONFIG_DIR 是否被覆盖（覆盖时不用服务）。
 */
function isConfigDirOverridden() {
  return Boolean(process.env.CLAUDE_CONFIG_DIR);
}
//@ chunk-y2nrbm62.js:54920-54959 placement
/**
 * 是否可用服务形式守护进程。
 */
async function canUseServiceDaemon() {
  return !isConfigDirOverridden() && isDaemonServiceInstalled();
}
//@ chunk-y2nrbm62.js:54959-55099 placement
function getInvocationLabel() {
  let sliced = process.argv.slice(2);
  if (sliced[0] === "agents") return "claude agents";
  if (sliced.includes("--bg")) return "claude --bg";
  return "claude";
}
//@ chunk-y2nrbm62.js:55099-55504 placement
async function readLogindConfig() {
  let configPath = getPlatform();
  if (configPath !== "linux" && configPath !== "wsl") return;
  let text = await readFile("/etc/systemd/logind.conf", "utf8").catch(() => "");
  if (!/^\s*KillUserProcesses\s*=\s*yes\b/im.test(text)) return;
  logForDebugging(
    "logind KillUserProcesses=yes \u2014 SSH disconnect will kill the transient daemon and its background jobs. Run `loginctl enable-linger $USER` or `claude daemon install` to keep it alive across logout.",
    {
      level: "warn",
    },
  );
}
//@ chunk-y2nrbm62.js:55504-55676 placement
function describeMissingLauncher() {
  return `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting); background sessions are not started unwrapped`;
}
//@ chunk-y2nrbm62.js:55676-55804 placement
function logLauncherMatch(processWrapper) {
  let actual = processWrapperRecord();
  if (actual === "" || !processWrapper) return;
  if (processWrapper === actual) logFeatureOk("agent_launcher");
  else logFeatureSad("agent_launcher", "served_by_skewed_wrapper");
}
//@ chunk-y2nrbm62.js:55804-55889 placement
/**
 * 是否应提供/安装守护进程服务（开关、systemd、无自定义配置目录、CLI 开关）。
 */
async function shouldInstallDaemonService() {
  return (
    isDaemonServiceInstallEnabled() &&
    (await hasSystemdUserSession()) &&
    !process.env.CLAUDE_CONFIG_DIR &&
    isDaemonCliEnabled()
  );
}
//@ chunk-y2nrbm62.js:55889-55942 placement
/**
 * 宿主墓碑文件的存储位置。
 */
function hostTombstonePath(hostKey) {
  return STORAGE_SPACES.daemon(["host-managed", hostKey]);
}
//@ chunk-y2nrbm62.js:55942-56067 placement
/**
 * 把网关与网关谱系标记编码为多行文本。
 */
function encodeHostLineage(env) {
  return (
    (isEnvTruthy(env?.CLAUDE_CODE_USE_GATEWAY)
      ? `gateway
`
      : "") +
    (isEnvTruthy(env?.CLAUDE_CODE_HOST_GATEWAY_LINEAGE)
      ? `lineage
`
      : "")
  );
}
//@ chunk-y2nrbm62.js:56067-56173 placement
/**
 * 从多行文本解析网关与网关谱系标记。
 */
function decodeHostLineage(file) {
  let text = new Set(file.split(/\r?\n/));
  return {
    gateway: text.has("gateway"),
    lineage: text.has("lineage"),
  };
}
//@ chunk-y2nrbm62.js:56173-56226 placement
/**
 * 宿主墓碑所在的存储作用域（daemon/host-managed）。
 */
var HOST_MANAGED_SCOPE = {
  namespace: "daemon",
  relPath: ["host-managed"],
};
//@ chunk-y2nrbm62.js:56226-56361 placement
/**
 * 确保宿主墓碑目录存在，失败时抛出带原因的错误。
 */
async function ensureTombstoneScope(storage) {
  let result = await storage.ensureScope(HOST_MANAGED_SCOPE);
  if (!result.ok)
    throw withStorageErrorCode(
      Error("host tombstone folder not made", {
        cause: result.error,
      }),
      result.error,
    );
}
//@ chunk-y2nrbm62.js:56361-56527 placement
/**
 * 原地写入宿主墓碑记录，失败时抛出带原因的错误。
 */
async function writeHostTombstone(storage, hostKey, content) {
  let result = await storage.write(hostTombstonePath(hostKey), content, {
    publishDiscipline: "inPlace",
  });
  if (!result.ok)
    throw withStorageErrorCode(
      Error("host tombstone write failed", {
        cause: result.error,
      }),
      result.error,
    );
}
//@ chunk-y2nrbm62.js:56527-56588 placement
/**
 * 删除宿主墓碑文件（出错忽略）。
 */
async function deleteHostTombstone(storageV5, short) {
  await storageV5.delete(hostTombstonePath(short)).catch(() => {});
}
//@ chunk-y2nrbm62.js:56588-56664 placement
/**
 * 给错误对象补上存储错误码。
 */
function withStorageErrorCode(error, error_2) {
  let code = storageErrorCode(error_2);
  return Object.assign(
    error,
    code !== undefined
      ? {
          code,
        }
      : {},
  );
}
export {
  ensureDaemon,
  canUseServiceDaemon,
  hostTombstonePath,
  deleteHostTombstone,
  encodeHostLineage,
  writeHostTombstone,
  ensureTombstoneScope,
  DAEMON_START_BUDGET_MS,
  waitForServiceDaemon,
  waitForDaemonPing,
  decodeHostLineage,
};
