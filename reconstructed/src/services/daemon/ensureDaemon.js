/**
 * services/daemon/ensureDaemon.ts
 *
 * 确保后台守护进程运行与二进制接管（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ksvdmrg0.js (29)
 * attribution: placement 29
 */
import { setTimeout as Ve } from "timers/promises";
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
  PROCESS_WRAPPER_ENV_2,
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
import { uidsCollapse, daemonControlSocket } from "../../utils/sandbox/userNamespace.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { UNMAPPED_NAMESPACE_REFUSAL } from "./paths.js";
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
  resolveAgentLauncher,
  EXTENDED_WAIT_MS,
  createSpawnAttempt,
  waitForDaemonUp,
  isNpmStubSpawnFailure,
  waitForBinaryRecovery,
  EXTENDED_SPAWN_WAIT_MS,
  shouldStopWaitingForDaemon,
  readSpawnStderr,
  classifyDaemonStderr,
  describeDaemonLockAtDeadline,
  isExecutableBinary,
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

//@ chunk-ksvdmrg0.js:50407-50420 placement
/**
 * 等待守护进程启动的总预算（45 秒）。
 */
var DAEMON_START_BUDGET_MS = 45000;
//@ chunk-ksvdmrg0.js:50420-50552 placement
/**
 * 在给定时间内反复 ping daemon，成功返回 true。
 */
async function waitForDaemonPing(r) {
  let e = Date.now() + r;
  while (Date.now() < e) {
    if (
      (
        await controlRequest({
          proto: BG_PROTO,
          op: "ping",
        })
      ).ok
    )
      return true;
    await Ve(100);
  }
  return false;
}
//@ chunk-ksvdmrg0.js:50552-50841 placement
/**
 * 等待服务方式启动的 daemon 就绪：ping 通后读取服务锁，来源为 service 时返回，前台来源或超时返回 null。
 */
async function waitForServiceDaemon(r, e) {
  let n = Date.now() + r;
  let s = 0;
  while (true) {
    let h = n - Date.now();
    if (h <= 0) return null;
    if (await waitForDaemonPing(Math.min(h, 1000))) {
      let now = Date.now();
      if (now >= s) {
        s = now + 1000;
        let p = await readLiveServerLock(1, e).catch(() => null);
        if (p?.origin === "service") return p;
        if (p?.origin === "foreground") return null;
      }
      await Ve(100);
    }
  }
}
//@ chunk-ksvdmrg0.js:50841-52454 placement
async function restartDaemon(r, e) {
  let now = Date.now();
  let s = false;
  let h;
  let w = "restarting";
  let p;
  while (Date.now() < now + (s ? 30000 : 1e4)) {
    let E = await controlRequest({
      proto: BG_PROTO,
      op: "nudge",
    });
    if (E.ok && E.op === "nudge") {
      s = true;
      h = E.version;
      if (!E.restarting) {
        if (await takeOverBackgroundBinary(E.version, r, E.processWrapper, E.upgradePending === true, e))
          return "retired";
        let S = processWrapperError();
        if (S && !E.processWrapper)
          return {
            refuse: S,
          };
        if (!E.processWrapper && processWrapperRecord() !== "" && !(await isProcessWrapperUsable()))
          return {
            refuse: describeMissingLauncher(),
          };
        logLauncherMatch(E.processWrapper);
        let R =
          E.version !==
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
          }.VERSION;
        if (Date.now() - now > 200 || R)
          logEvent("tengu_bg_skew_nudge", {
            converged: true,
            duration_ms: Date.now() - now,
            daemon_version: sanitizeVersion(E.version),
            skewed: R,
          });
        return "up";
      }
      w = "restarting";
      await Ve(100);
      continue;
    }
    if (!E.ok && E.code === "ETIMEOUT") {
      s = true;
      w = "etimeout";
      await Ve(100);
      continue;
    }
    if (!E.ok && E.code === "ENOCONN") {
      if (!s) {
        let S = await readLiveServerLock(1, e).catch(() => null);
        if (S?.bgDisabled) return "down";
        if (S) s = true;
      }
      p = sanitizeErrnoTokenForTelemetry(E.errno);
      if (!s) return "down";
      w = "enoconn";
      await Ve(100);
      continue;
    }
    {
      let S = processWrapperError();
      if (S)
        return {
          refuse: S,
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
    restarting: w === "restarting",
    etimeout: w === "etimeout",
    enoconn: w === "enoconn",
    daemon_version: sanitizeVersion(h),
    ...(p && {
      connect_errno: p,
    }),
  });
  return "down";
}
//@ chunk-ksvdmrg0.js:52454-52617 placement
/**
 * 确保后台守护进程运行；非 Windows 上 uid 折叠（如 sudo 下）时直接失败。
 */
async function ensureDaemon(r = {}, e) {
  if (getPlatform() !== "windows" && uidsCollapse()) {
    logFeatureBad("daemon_ensure_running", "uid_collapse");
    return {
      ok: false,
      reason: UNMAPPED_NAMESPACE_REFUSAL,
      causeCode: "uid_collapse",
    };
  }
  return ensureDaemonRunning(r, e, false);
}
//@ chunk-ksvdmrg0.js:52617-59870 placement
/**
 * 确保后台守护进程在运行（必要时经 agent_launcher 拉起）
 */
async function ensureDaemonRunning(r, e, n) {
  let now = Date.now();
  let h = await restartDaemon(r.forceTransient ?? false, e);
  if (h === "up") {
    logEnsureOutcome(n);
    return {
      ok: true,
    };
  }
  if (typeof h === "object") {
    if (r.spawnIntent) {
      logFeatureBad("daemon_ensure_running", "daemon_ensure_client_wrapper_refused");
      logFeatureBad("agent_launcher", "raw_daemon_client_misconfigured");
      return {
        ok: false,
        reason: h.refuse,
        causeCode: "wrapper",
      };
    }
    logEnsureOutcome(n);
    return {
      ok: true,
    };
  }
  let now_2 = Date.now();
  let p = now_2 - now > 40000;
  let E = r.standsDownAtExit && h !== "retired";
  let S = await isSystemdDaemonActive();
  let R = S
    ? await checkServiceExecStart()
    : {
        execPathStale: false,
        launcherPrefixDead: false,
      };
  let A = S && (R.execPathStale || R.launcherPrefixDead);
  if (A) {
    logEvent("tengu_bg_daemon_service_stale_exec", {
      launcher_dead: R.launcherPrefixDead,
    });
    logForDebugging(
      R.execPathStale
        ? "daemon service exec path is stale (binary deleted) \u2014 falling back to transient spawn. Run 'claude daemon install' to repair."
        : "daemon service unit starts through a launcher that was deleted or is no longer executable \u2014 falling back to transient spawn. Run 'claude daemon install' to repair.",
      {
        level: "warn",
      },
    );
  }
  let x = false;
  if (S && !A) {
    x = true;
    if (E && isTerminalShutdown()) return standDownAtExit(true, now);
    r.onStarting?.();
    let H = await checkBackgroundDisabled(e);
    if (H) {
      logFeatureBad("daemon_ensure_running", H.code);
      return {
        ok: false,
        reason: H.reason,
        causeCode: H.causeCode,
      };
    }
    let daemonService = await startDaemonService();
    let pe = await waitForDaemonPing(5000);
    logEvent("tengu_bg_daemon_install", {
      outcome_ok: pe,
      via_service: true,
      fresh_install: false,
      clock_jump: p,
      duration_ms: Date.now() - now,
      platform_darwin: getPlatform() === "macos",
      platform_linux: getPlatform() === "linux",
      platform_windows: getPlatform() === "windows",
    });
    if (pe) {
      logEnsureOutcome(n);
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
    !S &&
    !r.forceTransient &&
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
  if (!x) {
    let H = processWrapperError();
    if (!(await isProcessWrapperUsable()) && (await readLiveServerLock(1, e).catch(() => null))) {
      logFeatureBad("daemon_ensure_running", "daemon_ensure_client_wrapper_refused");
      logFeatureBad("agent_launcher", "zombie_kill_client_misconfigured");
      return {
        ok: false,
        reason: H ?? describeMissingLauncher(),
        causeCode: "wrapper",
      };
    }
    if (E && isTerminalShutdown()) return standDownAtExit(false, now);
    r.onStarting?.();
    let X = await checkBackgroundDisabled(e);
    if (X) {
      logFeatureBad("daemon_ensure_running", X.code);
      return {
        ok: false,
        reason: X.reason,
        causeCode: X.causeCode,
      };
    }
  }
  let spawnLauncherState = getSpawnLauncherState();
  let M =
    spawnLauncherState.lastTransientSpawnAt === null
      ? null
      : Date.now() - spawnLauncherState.lastTransientSpawnAt;
  spawnLauncherState.lastTransientSpawnAt = Date.now();
  let U = jsonStringify({
    label: getInvocationLabel(),
    cwd: getCwd(),
    ...r.spawnedBy,
    pid: process.pid,
  });
  let now_3 = Date.now();
  let K = ["daemon", "run", "--origin", "transient", "--spawned-by", U];
  let j = () =>
    resolveAgentLauncher(K, undefined, {
      withoutOAuthTokenEnv: r.withoutOAuthTokenEnv,
    });
  let ee = await j();
  let { err, child, recoveredAfterReinstallWait, gaveUpOnNpmInstallInProgress, reinstallWaitedMs = 0 } = ee;
  let stderrPath = ee.stderrPath;
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
        ? `Claude Code is being updated by npm on this machine (still not runnable after ${Math.round(EXTENDED_WAIT_MS / 60000)} min, ${sanitizeErrnoForTelemetry(err) ?? "spawn failed"}) \u2014 try again when the update finishes`
        : `spawn ${bgSupervisorNoun()}: ${errorMessage(err)}`,
      causeCode: sanitizeErrnoForTelemetry(err) ?? "spawn",
    };
  }
  let spawnAttempt = createSpawnAttempt({
    spawnIssuedAt: now_3 + reinstallWaitedMs,
    child,
    stderrPath,
    wrapperConfigured: processWrapperArgv().length > 0,
    storageV5: e,
  });
  let G = await waitForDaemonUp(spawnAttempt, Date.now() + 30000, false);
  let y = Date.now() - now_2 - reinstallWaitedMs > 60000;
  if (!G && y) G = await waitForDaemonUp(spawnAttempt, Date.now() + 5000, false);
  if (!G && !y)
    G = await waitForDaemonUp(
      spawnAttempt,
      Math.max(
        Date.now() + (DAEMON_START_BUDGET_MS - 30000),
        spawnAttempt.spawnIssuedAt + DAEMON_START_BUDGET_MS,
      ),
      true,
    );
  let Y = false;
  let q = 0;
  let Q = false;
  if (!G && !y && (await isNpmStubSpawnFailure(spawnAttempt, getLaunchTarget()))) {
    let H = await waitForBinaryRecovery(getLaunchTarget());
    q += H.waitedMs;
    logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
      waited_ms: H.waitedMs,
      recovered: H.recovered,
      extended: H.extended,
      install_in_progress: H.installInProgressAtEnd,
      after_child_exit: true,
    });
    Q = !H.recovered && H.installInProgressAtEnd;
    if (H.recovered) {
      let X = await j();
      if (X.err === null) {
        Y = true;
        q = 0;
        if (stderrPath)
          rm(dirname(stderrPath), {
            recursive: true,
            force: true,
          }).catch(() => {});
        stderrPath = X.stderrPath;
        spawnAttempt = createSpawnAttempt({
          spawnIssuedAt: Date.now(),
          child: X.child,
          stderrPath,
          wrapperConfigured: processWrapperArgv().length > 0,
          storageV5: e,
        });
        logForDebugging(
          `daemon: ${getLaunchTarget()} was being reinstalled when the first daemon was spawned (it exited at once); restarted it after ${H.waitedMs}ms`,
        );
        G = await waitForDaemonUp(spawnAttempt, spawnAttempt.spawnIssuedAt + DAEMON_START_BUDGET_MS, true);
      } else {
        logForDebugging(`daemon: respawn after the npm reinstall window failed: ${errorMessage(X.err)}`, {
          level: "warn",
        });
        logEvent("tengu_bg_daemon_spawn_failed", {
          errno: sanitizeErrnoForTelemetry(X.err) ?? lit("unknown"),
          launcher_configured: processWrapperArgv().length > 0 || processWrapperError() !== null,
          after_reinstall_wait: true,
        });
        if (X.stderrPath)
          rm(dirname(X.stderrPath), {
            recursive: true,
            force: true,
          }).catch(() => {});
      }
    }
  }
  let oe = spawnAttempt.budgetExtended ? EXTENDED_SPAWN_WAIT_MS : DAEMON_START_BUDGET_MS;
  let le = !G && !y && Date.now() - spawnAttempt.spawnIssuedAt - q > oe + 60000;
  let ce = !G && (y || le) && !n && !(await shouldStopWaitingForDaemon(spawnAttempt));
  let hadStderr = false;
  let Ae;
  let Ee;
  let Te;
  if (!G) {
    let stderr = await readSpawnStderr(spawnAttempt, true);
    Te = classifyDaemonStderr(stderr);
    if (stderr.length > 0) {
      hadStderr = true;
      logForDebugging(
        `daemon: transient spawn stderr:
${stderr}`,
        {
          level: "error",
        },
      );
      Ae = [...stderr.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (pe) => !"/\\".includes(stderr[pe.index - 1] ?? "."),
      )?.[0];
      let found = stderr
        .split(/\r?\n/)
        .map((line) => collapseWhitespace(stripAnsiPerLine(line)))
        .find((pe) => pe.length > 0);
      Ee = found && found.length > 200 ? `${truncateToLength(found, 200)}\u2026` : found;
    }
  }
  if (stderrPath)
    rm(dirname(stderrPath), {
      recursive: true,
      force: true,
    }).catch(() => {});
  logEvent("tengu_bg_daemon_install", {
    outcome_ok: G,
    via_service: false,
    fresh_install: false,
    clock_jump: y || p || le,
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
    ...(Te && {
      stderr_class: Te,
    }),
    reinstall_respawn: Y,
    budget_extended: spawnAttempt.budgetExtended,
    ...(ce && {
      clock_jump_retry: lit("scheduled"),
    }),
    ...(n && {
      clock_jump_retry: lit("retry"),
    }),
    ...(M !== null && {
      spawn_gap_ms: M,
    }),
    ...(r.spawnedBy !== undefined && {
      spawned_by: fromEnumOpt(DAEMON_LEASE_LABELS.find((H) => H === r.spawnedBy?.label)) ?? lit("other"),
    }),
    ...(Ae && {
      stderr_errno: sanitizeErrnoTokenForTelemetry(Ae),
    }),
    ...(!G && (await describeDaemonLockAtDeadline(spawnAttempt))),
  });
  if (G) {
    readLogindConfig();
    if (recoveredAfterReinstallWait || Y)
      logFeatureSad("daemon_ensure_running", "daemon_ensure_spawn_waited_reinstall");
    else logEnsureOutcome(n);
    if (processWrapperArgv().length > 0) {
      let H = await controlRequest({
        proto: BG_PROTO,
        op: "nudge",
      }).catch(() => null);
      logLauncherMatch(H?.ok && H.op === "nudge" ? H.processWrapper : undefined);
    }
    return {
      ok: true,
    };
  }
  if (ce) {
    logForDebugging(
      "daemon: the clock jumped during the cold start (machine slept?) and the daemon is still unreachable \u2014 retrying the whole start once",
      {
        level: "warn",
      },
    );
    return ensureDaemonRunning(
      {
        ...r,
        onStarting: undefined,
        standsDownAtExit: false,
      },
      e,
      true,
    );
  }
  logFeatureBad("daemon_ensure_running", "daemon_ensure_transient_unreachable");
  let xe = Q
    ? ` \u2014 Claude Code is being updated by npm on this machine (still not runnable after ${Math.round(EXTENDED_WAIT_MS / 60000)} min); try again when the update finishes`
    : "";
  let De = processWrapperArgv()[0];
  if (De) {
    logEvent("tengu_bg_daemon_spawn_failed", {
      launcher_configured: true,
      failed_stage: lit("unknown"),
    });
    logFeatureBad("agent_launcher", "daemon_never_reachable");
    return {
      ok: false,
      causeCode: "timeout",
      reason: `launcher \`${De}\` ran but Claude Code never started${Ee ? ` \u2014 ${Ee}` : ` (nothing on stderr within ${oe / 1000}s)`}${xe}`,
    };
  }
  let childExit = spawnAttempt.siblingHolderSeen ? null : spawnAttempt.childExit;
  if (childExit) {
    let H = childExit.signal ? `signal ${childExit.signal}` : `exit code ${childExit.code ?? "?"}`;
    return {
      ok: false,
      causeCode: "exited",
      reason: Ee
        ? `${bgSupervisorNoun()} ${DAEMON_EXITED_BEFORE_REACHABLE_PHRASE} (${H}): ${Ee}${xe}`
        : `${bgSupervisorNoun()} ${DAEMON_EXITED_BEFORE_REACHABLE_PHRASE} (${H}, nothing on stderr) and no other ${bgSupervisorNoun()} answered within ${Math.round(Math.min(Date.now() - spawnAttempt.spawnIssuedAt - q, oe) / 1000)}s${xe}`,
    };
  }
  return {
    ok: false,
    causeCode: "timeout",
    reason: `${bgSupervisorNoun()} ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} ${oe / 1000}s${xe}`,
  };
}
//@ chunk-ksvdmrg0.js:59870-60182 placement
/**
 * 进程正在退出时放弃启动 daemon：记录日志与事件，返回 stoodDown 结果。
 */
function standDownAtExit(r, e) {
  logForDebugging("daemon: not started, because this process is exiting");
  logEvent("tengu_bg_daemon_stood_down_at_exit", {
    via_service: r,
    duration_ms: Date.now() - e,
  });
  logFeatureSad("daemon_ensure_running", "daemon_ensure_stood_down_at_exit");
  return {
    ok: false,
    stoodDown: true,
    viaService: r,
    causeCode: "exiting",
    reason: "this process is exiting",
  };
}
//@ chunk-ksvdmrg0.js:60182-60299 placement
function logEnsureOutcome(r) {
  if (r) {
    logFeatureSad("daemon_ensure_running", "daemon_ensure_clock_jump_retried");
    return;
  }
  logFeatureOk("daemon_ensure_running");
}
//@ chunk-ksvdmrg0.js:60299-60332 placement
/**
 * 取启动命令的目标（当前可执行文件/通道）。
 */
function getLaunchTarget() {
  return getLaunchCommand().target;
}
//@ chunk-ksvdmrg0.js:60332-60787 placement
/**
 * 判断客户端是否应接管临时守护进程：版本与目标不同且客户端更新（同通道比构建时间，否则按 semver）。
 */
function shouldTakeOverDaemon(r) {
  if (r.daemonOrigin !== "transient") return false;
  if (r.daemonVersion === r.clientVersion) return false;
  if (r.daemonTarget === r.clientTarget) return false;
  let rcVersionTimestamp = parseRcVersionTimestamp(r.daemonVersion);
  let rcVersionTimestamp_2 = parseRcVersionTimestamp(r.clientVersion);
  if (rcVersionTimestamp !== null && rcVersionTimestamp_2 !== null) {
    if (rcChannelSuffix(r.daemonVersion) !== rcChannelSuffix(r.clientVersion)) return false;
    return rcVersionTimestamp_2 > rcVersionTimestamp;
  }
  if (isRcChannelVersion(r.daemonVersion) || isRcChannelVersion(r.clientVersion)) return false;
  return (
    semverModule.valid(r.clientVersion) !== null &&
    semverModule.valid(r.daemonVersion) !== null &&
    semverModule.gt(r.clientVersion, r.daemonVersion)
  );
}
//@ chunk-ksvdmrg0.js:60787-64175 placement
/**
 * 后台二进制接管：新版本替换正在运行的后台守护进程
 */
async function takeOverBackgroundBinary(version, e, processWrapper, s, h) {
  if (processWrapperError() !== null) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_binary_takeover", true)) return false;
  let w =
    version !==
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
    }.VERSION;
  let p = w && !s;
  let E = shouldUseLauncherPrefix(processWrapper, w);
  if (!p && !E) return false;
  if (!(await isProcessWrapperUsable())) return false;
  if (await isSystemdDaemonActive()) return false;
  if (
    !e &&
    getDaemonColdStart() === "ask" &&
    (await shouldInstallDaemonService()) &&
    !getGlobalConfig().daemonInstallPromptDismissed
  )
    return false;
  let S = await realpath(getLaunchTarget()).catch(() => null);
  if (!S) return false;
  let cmd = resolveLaunchTarget().cmd;
  if (!(await isExecutableBinary(cmd))) {
    let cmd_2 = resolveLaunchTarget({
      pinToCurrentBinary: true,
    }).cmd;
    if (cmd_2 === cmd || !(await isExecutableBinary(cmd_2))) return false;
  }
  let A = await readLiveServerLock(1, h).catch(() => null);
  if (!A) return false;
  if (!hasProcIdentity(A)) {
    logForDebugging(`bg: skipping stale-daemon retire \u2014 lock pid ${A.pid} has no procStart identity`);
    return false;
  }
  let x = shouldTakeOverDaemon({
    daemonVersion: A.version,
    daemonOrigin: A.origin,
    daemonTarget: A.launchTarget,
    clientVersion: {
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
    clientTarget: S,
  });
  let L = p && x;
  let M =
    E &&
    A.origin === "transient" &&
    !A.processWrapper &&
    (A.version ===
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
      }.VERSION ||
      (s && x));
  if (!L && !M) return false;
  let U = await signalPid(A.pid);
  if (U === "timed-out") {
    try {
      process.kill(A.pid, "SIGKILL");
    } catch {}
    U = await signalPid(A.pid);
  }
  if (U !== "exited") return false;
  if (M) getSpawnLauncherState().prefixAxis = "took-over";
  logForDebugging(
    L
      ? `bg: ${bgSupervisorNoun()} pid ${A.pid} runs ${A.version}; this binary (${
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
        }) is a newer build \u2014 retired the stale ${bgSupervisorNoun()} so new sessions use the current binary`
      : `bg: ${bgSupervisorNoun()} pid ${A.pid} predates CLAUDE_CODE_PROCESS_WRAPPER and spawns sessions unwrapped \u2014 retired it so the replacement runs through the configured launcher`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_bg_daemon_binary_takeover", {
    daemon_age_ms: Date.now() - A.startedAt,
    via_prefix: M,
    via_version: L,
    daemon_version: sanitizeVersion(A.version),
  });
  return true;
}
//@ chunk-ksvdmrg0.js:64175-64960 placement
/**
 * 判断是否经启动器（CLAUDE_CODE_PROCESS_WRAPPER）拉起守护进程：已由启动器接管后又出现裸进程时记一次警告与事件。
 */
function shouldUseLauncherPrefix(r, e) {
  if (processWrapperRecord() === "" || r) return false;
  let launcherState = getSpawnLauncherState();
  if (launcherState.prefixAxis === "took-over") {
    if (e) return false;
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
  if (e) return true;
  if (launcherState.prefixAxis === "attempted") return false;
  launcherState.prefixAxis = "attempted";
  return true;
}
//@ chunk-ksvdmrg0.js:64960-67060 placement
async function checkBackgroundDisabled(r) {
  let e = await readLiveServerLock(1, r).catch(() => null);
  if (!e) return null;
  if (e.bgDisabled) {
    logEvent("tengu_bg_daemon_bg_disabled_skip", {
      origin_service: e.origin === "service",
    });
    return {
      reason:
        "the background service on this machine is running without background sessions \u2014 its control socket failed to start. " +
        "Check the cause with 'claude daemon status' (daemon.log), then restart the service (launchctl/systemctl, or reboot).",
      code: "daemon_ensure_bg_disabled",
      causeCode: "bg_disabled",
    };
  }
  if (Date.now() - e.startedAt <= SOCKET_READY_TIMEOUT_MS + 5000) return null;
  let n = await controlRequest(
    {
      proto: BG_PROTO,
      op: "ping",
    },
    {
      timeoutMs: 1000,
    },
  );
  let s = {
    started_ago_ms: Date.now() - e.startedAt,
    origin_transient: e.origin === "transient",
    origin_service: e.origin === "service",
    version_skew:
      e.version !==
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
  };
  if (n.ok || n.code === "ETIMEOUT") {
    logEvent("tengu_bg_daemon_zombie_false_positive", {
      ...s,
      recheck_etimeout: !n.ok,
    });
    return null;
  }
  if (!hasProcIdentity(e)) {
    logForDebugging(
      `bg: supervisor lock pid ${e.pid} alive but identity unverifiable (no procStart) \u2014 not signalled`,
      {
        level: "warn",
      },
    );
    return {
      reason: `${lockHolderProblemText({
        pid: e.pid,
        outcome: "unverified",
      })}. If no daemon is running, delete ${daemonLockPath()}; if pid ${e.pid} is a live process you own, stop it yourself first.`,
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
    `bg: supervisor pid ${e.pid} alive but control socket unreachable \u2014 signalling restart`,
    {
      level: "warn",
    },
  );
  if ((await signalPid(e.pid)) === "eperm")
    return {
      reason: `${bgSupervisorNoun()} socket missing; could not restart supervisor (EPERM)`,
      code: "daemon_ensure_zombie_kill_failed",
      causeCode: "zombie",
    };
  logEvent("tengu_bg_daemon_zombie_restart", {
    pid: e.pid,
    ...s,
    sock_exists: sockExists,
  });
  return null;
}
//@ chunk-ksvdmrg0.js:67060-67138 placement
/**
 * 系统级守护进程是否在运行（有 systemd 用户会话且服务状态正常）。
 */
async function isSystemdDaemonActive() {
  if (isConfigDirOverridden() || !(await hasSystemdUserSession())) return false;
  return daemonServiceStatus().catch(() => false);
}
//@ chunk-ksvdmrg0.js:67138-67198 placement
/**
 * CLAUDE_CONFIG_DIR 是否被覆盖（覆盖时不用服务）。
 */
function isConfigDirOverridden() {
  return Boolean(process.env.CLAUDE_CONFIG_DIR);
}
//@ chunk-ksvdmrg0.js:67198-67237 placement
/**
 * 是否可用服务形式守护进程。
 */
async function canUseServiceDaemon() {
  return !isConfigDirOverridden() && isDaemonServiceInstalled();
}
//@ chunk-ksvdmrg0.js:67237-67377 placement
function getInvocationLabel() {
  let sliced = process.argv.slice(2);
  if (sliced[0] === "agents") return "claude agents";
  if (sliced.includes("--bg")) return "claude --bg";
  return "claude";
}
//@ chunk-ksvdmrg0.js:67377-67782 placement
async function readLogindConfig() {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return;
  let e = await readFile("/etc/systemd/logind.conf", "utf8").catch(() => "");
  if (!/^\s*KillUserProcesses\s*=\s*yes\b/im.test(e)) return;
  logForDebugging(
    "logind KillUserProcesses=yes \u2014 SSH disconnect will kill the transient daemon and its background jobs. Run `loginctl enable-linger $USER` or `claude daemon install` to keep it alive across logout.",
    {
      level: "warn",
    },
  );
}
//@ chunk-ksvdmrg0.js:67782-67954 placement
function describeMissingLauncher() {
  return `${PROCESS_WRAPPER_ENV_2}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting); background sessions are not started unwrapped`;
}
//@ chunk-ksvdmrg0.js:67954-68082 placement
function logLauncherMatch(processWrapper) {
  let e = processWrapperRecord();
  if (e === "" || !processWrapper) return;
  if (processWrapper === e) logFeatureOk("agent_launcher");
  else logFeatureSad("agent_launcher", "served_by_skewed_wrapper");
}
//@ chunk-ksvdmrg0.js:68082-68167 placement
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
//@ chunk-ksvdmrg0.js:68167-68220 placement
/**
 * 宿主墓碑文件的存储位置。
 */
function hostTombstonePath(r) {
  return STORAGE_SPACES.daemon(["host-managed", r]);
}
//@ chunk-ksvdmrg0.js:68220-68345 placement
/**
 * 把网关与网关谱系标记编码为多行文本。
 */
function encodeHostLineage(r) {
  return (
    (isEnvTruthy(r?.CLAUDE_CODE_USE_GATEWAY)
      ? `gateway
`
      : "") +
    (isEnvTruthy(r?.CLAUDE_CODE_HOST_GATEWAY_LINEAGE)
      ? `lineage
`
      : "")
  );
}
//@ chunk-ksvdmrg0.js:68345-68451 placement
/**
 * 从多行文本解析网关与网关谱系标记。
 */
function decodeHostLineage(file) {
  let e = new Set(file.split(/\r?\n/));
  return {
    gateway: e.has("gateway"),
    lineage: e.has("lineage"),
  };
}
//@ chunk-ksvdmrg0.js:68451-68504 placement
/**
 * 宿主墓碑所在的存储作用域（daemon/host-managed）。
 */
var HOST_MANAGED_SCOPE = {
  namespace: "daemon",
  relPath: ["host-managed"],
};
//@ chunk-ksvdmrg0.js:68504-68639 placement
/**
 * 确保宿主墓碑目录存在，失败时抛出带原因的错误。
 */
async function ensureTombstoneScope(r) {
  let e = await r.ensureScope(HOST_MANAGED_SCOPE);
  if (!e.ok)
    throw withStorageErrorCode(
      Error("host tombstone folder not made", {
        cause: e.error,
      }),
      e.error,
    );
}
//@ chunk-ksvdmrg0.js:68639-68805 placement
/**
 * 原地写入宿主墓碑记录，失败时抛出带原因的错误。
 */
async function writeHostTombstone(r, e, n) {
  let s = await r.write(hostTombstonePath(e), n, {
    publishDiscipline: "inPlace",
  });
  if (!s.ok)
    throw withStorageErrorCode(
      Error("host tombstone write failed", {
        cause: s.error,
      }),
      s.error,
    );
}
//@ chunk-ksvdmrg0.js:68805-68866 placement
/**
 * 删除宿主墓碑文件（出错忽略）。
 */
async function deleteHostTombstone(storageV5, short) {
  await storageV5.delete(hostTombstonePath(short)).catch(() => {});
}
//@ chunk-ksvdmrg0.js:68866-68942 placement
/**
 * 给错误对象补上存储错误码。
 */
function withStorageErrorCode(r, error) {
  let n = storageErrorCode(error);
  return Object.assign(
    r,
    n !== undefined
      ? {
          code: n,
        }
      : {},
  );
}
export {
  ensureDaemon,
  waitForDaemonPing,
  DAEMON_START_BUDGET_MS,
  ensureTombstoneScope,
  writeHostTombstone,
  encodeHostLineage,
  decodeHostLineage,
  canUseServiceDaemon,
  hostTombstonePath,
  deleteHostTombstone,
  waitForServiceDaemon,
};
