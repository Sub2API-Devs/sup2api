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
import { setTimeout as Ve, setTimeout as Yr } from "timers/promises";
import { rm, realpath, realpath as realpath_2, lstat, readFile, readFile as readFile_2 } from "fs/promises";
import { dirname, dirname as dirname_2 } from "path";
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
import { q3r, Z6 } from "../../utils/sandbox/userNamespace.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { UNMAPPED_NAMESPACE_REFUSAL } from "./paths.js";
import {
  checkServiceExecStart,
  TAr,
  Ge,
  hasSystemdUserSession,
  daemonServiceStatus,
  Ct,
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
  uB,
  resolveAgentLauncher,
  EXTENDED_WAIT_MS,
  createSpawnAttempt,
  waitForDaemonUp,
  isNpmStubSpawnFailure,
  waitForBinaryRecovery,
  gt,
  shouldStopWaitingForDaemon,
  readSpawnStderr,
  classifyDaemonStderr,
  describeDaemonLockAtDeadline,
  isExecutableBinary,
} from "./spawnLauncher.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getCwd } from "../../utils/cwd.js";
import { lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { Dr, truncateToLength } from "../../utils/stringUtils.js";
import { qa } from "../../utils/stripAnsi.js";
import { getLaunchCommand, resolveLaunchTarget } from "../../utils/deepLink/registerProtocol.js";
import { parseRcVersionTimestamp, amt, Atn } from "./reapJobs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { bt } from "./controlServer.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { storageErrorCode } from "../../utils/storage/storageErrors.js";

//@ chunk-ksvdmrg0.js:50407-50420 placement
var s5 = 45000;
/**
 * 在给定时间内反复 ping daemon，成功返回 true。
 */
//@ chunk-ksvdmrg0.js:50420-50552 placement
async function waitForDaemonPing(r) {
  let e = Date.now() + r;
  while (Date.now() < e) {
    if ((await controlRequest({ proto: BG_PROTO, op: "ping" })).ok) return !0;
    await Ve(100);
  }
  return !1;
}
/**
 * 等待服务方式启动的 daemon 就绪：ping 通后读取服务锁，来源为 service 时返回，前台来源或超时返回 null。
 */
//@ chunk-ksvdmrg0.js:50552-50841 placement
async function waitForServiceDaemon(r, e) {
  let n = Date.now() + r,
    s = 0;
  while (!0) {
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
  let now = Date.now(),
    s = !1,
    h,
    w = "restarting",
    p;
  while (Date.now() < now + (s ? 30000 : 1e4)) {
    let E = await controlRequest({ proto: BG_PROTO, op: "nudge" });
    if (E.ok && E.op === "nudge") {
      if (((s = !0), (h = E.version), !E.restarting)) {
        if (await takeOverBackgroundBinary(E.version, r, E.processWrapper, E.upgradePending === !0, e))
          return "retired";
        let S = processWrapperError();
        if (S && !E.processWrapper) return { refuse: S };
        if (!E.processWrapper && processWrapperRecord() !== "" && !(await isProcessWrapperUsable()))
          return { refuse: describeMissingLauncher() };
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
            converged: !0,
            duration_ms: Date.now() - now,
            daemon_version: sanitizeVersion(E.version),
            skewed: R,
          });
        return "up";
      }
      ((w = "restarting"), await Ve(100));
      continue;
    }
    if (!E.ok && E.code === "ETIMEOUT") {
      ((s = !0), (w = "etimeout"), await Ve(100));
      continue;
    }
    if (!E.ok && E.code === "ENOCONN") {
      if (!s) {
        let S = await readLiveServerLock(1, e).catch(() => null);
        if (S?.bgDisabled) return "down";
        if (S) s = !0;
      }
      if (((p = sanitizeErrnoTokenForTelemetry(E.errno)), !s)) return "down";
      ((w = "enoconn"), await Ve(100));
      continue;
    }
    {
      let S = processWrapperError();
      if (S) return { refuse: S };
      if (processWrapperRecord() !== "" && !(await isProcessWrapperUsable()))
        return { refuse: describeMissingLauncher() };
    }
    return "up";
  }
  return (
    logEvent("tengu_bg_skew_nudge", {
      converged: !1,
      restarting: w === "restarting",
      etimeout: w === "etimeout",
      enoconn: w === "enoconn",
      daemon_version: sanitizeVersion(h),
      ...(p && { connect_errno: p }),
    }),
    "down"
  );
}
/**
 * 确保后台守护进程运行；非 Windows 上 uid 折叠（如 sudo 下）时直接失败。
 */
//@ chunk-ksvdmrg0.js:52454-52617 placement
async function ensureDaemon(r = {}, e) {
  if (getPlatform() !== "windows" && q3r())
    return (
      logFeatureBad("daemon_ensure_running", "uid_collapse"),
      { ok: !1, reason: UNMAPPED_NAMESPACE_REFUSAL, causeCode: "uid_collapse" }
    );
  return ensureDaemonRunning(r, e, !1);
}
/**
 * 确保后台守护进程在运行（必要时经 agent_launcher 拉起）
 */
//@ chunk-ksvdmrg0.js:52617-59870 placement
async function ensureDaemonRunning(r, e, n) {
  let now = Date.now(),
    h = await restartDaemon(r.forceTransient ?? !1, e);
  if (h === "up") return (logEnsureOutcome(n), { ok: !0 });
  if (typeof h === "object") {
    if (r.spawnIntent)
      return (
        logFeatureBad("daemon_ensure_running", "daemon_ensure_client_wrapper_refused"),
        logFeatureBad("agent_launcher", "raw_daemon_client_misconfigured"),
        { ok: !1, reason: h.refuse, causeCode: "wrapper" }
      );
    return (logEnsureOutcome(n), { ok: !0 });
  }
  let now_2 = Date.now(),
    p = now_2 - now > 40000,
    E = r.standsDownAtExit && h !== "retired",
    S = await ir(),
    R = S ? await checkServiceExecStart() : { execPathStale: !1, launcherPrefixDead: !1 },
    A = S && (R.execPathStale || R.launcherPrefixDead);
  if (A)
    (logEvent("tengu_bg_daemon_service_stale_exec", { launcher_dead: R.launcherPrefixDead }),
      logForDebugging(
        R.execPathStale
          ? "daemon service exec path is stale (binary deleted) \u2014 falling back to transient spawn. Run 'claude daemon install' to repair."
          : "daemon service unit starts through a launcher that was deleted or is no longer executable \u2014 falling back to transient spawn. Run 'claude daemon install' to repair.",
        { level: "warn" },
      ));
  let x = !1;
  if (S && !A) {
    if (((x = !0), E && isTerminalShutdown())) return standDownAtExit(!0, now);
    r.onStarting?.();
    let H = await checkBackgroundDisabled(e);
    if (H)
      return (
        logFeatureBad("daemon_ensure_running", H.code),
        { ok: !1, reason: H.reason, causeCode: H.causeCode }
      );
    let X = await TAr(),
      pe = await waitForDaemonPing(5000);
    if (
      (logEvent("tengu_bg_daemon_install", {
        outcome_ok: pe,
        via_service: !0,
        fresh_install: !1,
        clock_jump: p,
        duration_ms: Date.now() - now,
        platform_darwin: getPlatform() === "macos",
        platform_linux: getPlatform() === "linux",
        platform_windows: getPlatform() === "windows",
      }),
      pe)
    )
      return (logEnsureOutcome(n), { ok: !0 });
    (logEvent("tengu_bg_daemon_service_poll_fallthrough", { sr_ok: X.ok }),
      logForDebugging(
        `daemon service ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} 5s${X.ok ? "" : ` (${X.error})`} \u2014 falling back to transient spawn. Run 'claude daemon install' to repair.`,
        { level: "warn" },
      ));
  }
  if (
    !S &&
    !r.forceTransient &&
    getDaemonColdStart() === "ask" &&
    (await cr()) &&
    !getGlobalConfig().daemonInstallPromptDismissed
  )
    return (
      logEvent("tengu_bg_daemon_cold_start_ask", {}),
      {
        ok: !1,
        askInstall: !0,
        causeCode: "ask",
        reason:
          "No background daemon is running. Run 'claude daemon install' to set it up as a persistent service.",
      }
    );
  if (!x) {
    let H = processWrapperError();
    if (!(await isProcessWrapperUsable()) && (await readLiveServerLock(1, e).catch(() => null)))
      return (
        logFeatureBad("daemon_ensure_running", "daemon_ensure_client_wrapper_refused"),
        logFeatureBad("agent_launcher", "zombie_kill_client_misconfigured"),
        { ok: !1, reason: H ?? describeMissingLauncher(), causeCode: "wrapper" }
      );
    if (E && isTerminalShutdown()) return standDownAtExit(!1, now);
    r.onStarting?.();
    let X = await checkBackgroundDisabled(e);
    if (X)
      return (
        logFeatureBad("daemon_ensure_running", X.code),
        { ok: !1, reason: X.reason, causeCode: X.causeCode }
      );
  }
  let L = uB(),
    M = L.lastTransientSpawnAt === null ? null : Date.now() - L.lastTransientSpawnAt;
  L.lastTransientSpawnAt = Date.now();
  let U = jsonStringify({ label: getInvocationLabel(), cwd: getCwd(), ...r.spawnedBy, pid: process.pid }),
    now_3 = Date.now(),
    K = ["daemon", "run", "--origin", "transient", "--spawned-by", U],
    j = () => resolveAgentLauncher(K, void 0, { withoutOAuthTokenEnv: r.withoutOAuthTokenEnv }),
    ee = await j(),
    {
      err: err,
      child: child,
      recoveredAfterReinstallWait: recoveredAfterReinstallWait,
      gaveUpOnNpmInstallInProgress: gaveUpOnNpmInstallInProgress,
      reinstallWaitedMs: reinstallWaitedMs = 0,
    } = ee,
    stderrPath = ee.stderrPath;
  if (err) {
    if (stderrPath) rm(dirname(stderrPath), { recursive: !0, force: !0 }).catch(() => {});
    return (
      logEvent("tengu_bg_daemon_spawn_failed", {
        errno_enoent: getErrnoCode(err) === "ENOENT",
        errno_eacces: getErrnoCode(err) === "EACCES",
        errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
        launcher_configured: processWrapperArgv().length > 0 || processWrapperError() !== null,
      }),
      logFeatureBad("daemon_ensure_running", "daemon_ensure_spawn_failed"),
      {
        ok: !1,
        reason: gaveUpOnNpmInstallInProgress
          ? `Claude Code is being updated by npm on this machine (still not runnable after ${Math.round(EXTENDED_WAIT_MS / 60000)} min, ${sanitizeErrnoForTelemetry(err) ?? "spawn failed"}) \u2014 try again when the update finishes`
          : `spawn ${bgSupervisorNoun()}: ${errorMessage(err)}`,
        causeCode: sanitizeErrnoForTelemetry(err) ?? "spawn",
      }
    );
  }
  let T = createSpawnAttempt({
      spawnIssuedAt: now_3 + reinstallWaitedMs,
      child: child,
      stderrPath: stderrPath,
      wrapperConfigured: processWrapperArgv().length > 0,
      storageV5: e,
    }),
    G = await waitForDaemonUp(T, Date.now() + 30000, !1),
    y = Date.now() - now_2 - reinstallWaitedMs > 60000;
  if (!G && y) G = await waitForDaemonUp(T, Date.now() + 5000, !1);
  if (!G && !y) G = await waitForDaemonUp(T, Math.max(Date.now() + (s5 - 30000), T.spawnIssuedAt + s5), !0);
  let Y = !1,
    q = 0,
    Q = !1;
  if (!G && !y && (await isNpmStubSpawnFailure(T, ot()))) {
    let H = await waitForBinaryRecovery(ot());
    if (
      ((q += H.waitedMs),
      logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
        waited_ms: H.waitedMs,
        recovered: H.recovered,
        extended: H.extended,
        install_in_progress: H.installInProgressAtEnd,
        after_child_exit: !0,
      }),
      (Q = !H.recovered && H.installInProgressAtEnd),
      H.recovered)
    ) {
      let X = await j();
      if (X.err === null) {
        if (((Y = !0), (q = 0), stderrPath))
          rm(dirname(stderrPath), { recursive: !0, force: !0 }).catch(() => {});
        ((stderrPath = X.stderrPath),
          (T = createSpawnAttempt({
            spawnIssuedAt: Date.now(),
            child: X.child,
            stderrPath: stderrPath,
            wrapperConfigured: processWrapperArgv().length > 0,
            storageV5: e,
          })),
          logForDebugging(
            `daemon: ${ot()} was being reinstalled when the first daemon was spawned (it exited at once); restarted it after ${H.waitedMs}ms`,
          ),
          (G = await waitForDaemonUp(T, T.spawnIssuedAt + s5, !0)));
      } else if (
        (logForDebugging(`daemon: respawn after the npm reinstall window failed: ${errorMessage(X.err)}`, {
          level: "warn",
        }),
        logEvent("tengu_bg_daemon_spawn_failed", {
          errno: sanitizeErrnoForTelemetry(X.err) ?? lit("unknown"),
          launcher_configured: processWrapperArgv().length > 0 || processWrapperError() !== null,
          after_reinstall_wait: !0,
        }),
        X.stderrPath)
      )
        rm(dirname(X.stderrPath), { recursive: !0, force: !0 }).catch(() => {});
    }
  }
  let oe = T.budgetExtended ? gt : s5,
    le = !G && !y && Date.now() - T.spawnIssuedAt - q > oe + 60000,
    ce = !G && (y || le) && !n && !(await shouldStopWaitingForDaemon(T)),
    se = !1,
    Ae,
    Ee,
    Te;
  if (!G) {
    let H = await readSpawnStderr(T, !0);
    if (((Te = classifyDaemonStderr(H)), H.length > 0)) {
      ((se = !0),
        logForDebugging(
          `daemon: transient spawn stderr:
${H}`,
          { level: "error" },
        ),
        (Ae = [...H.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
          (pe) => !"/\\".includes(H[pe.index - 1] ?? "."),
        )?.[0]));
      let found = H.split(/\r?\n/)
        .map((pe) => Dr(qa(pe)))
        .find((pe) => pe.length > 0);
      Ee = found && found.length > 200 ? `${truncateToLength(found, 200)}\u2026` : found;
    }
  }
  if (stderrPath) rm(dirname(stderrPath), { recursive: !0, force: !0 }).catch(() => {});
  if (
    (logEvent("tengu_bg_daemon_install", {
      outcome_ok: G,
      via_service: !1,
      fresh_install: !1,
      clock_jump: y || p || le,
      duration_ms: Date.now() - now,
      platform_darwin: getPlatform() === "macos",
      platform_linux: getPlatform() === "linux",
      platform_windows: getPlatform() === "windows",
      had_stderr: se,
      child_exited: T.childExit !== null,
      ...(T.childExit?.code !== void 0 && T.childExit.code !== null && { exit_code: T.childExit.code }),
      ...(T.childExit?.signal && { exit_signal: fromEnumOpt(T.childExit.signal) }),
      ...(T.childExitAt !== null && { child_exit_ms: Math.max(0, T.childExitAt - T.spawnIssuedAt) }),
      ...(Te && { stderr_class: Te }),
      reinstall_respawn: Y,
      budget_extended: T.budgetExtended,
      ...(ce && { clock_jump_retry: lit("scheduled") }),
      ...(n && { clock_jump_retry: lit("retry") }),
      ...(M !== null && { spawn_gap_ms: M }),
      ...(r.spawnedBy !== void 0 && {
        spawned_by: fromEnumOpt(DAEMON_LEASE_LABELS.find((H) => H === r.spawnedBy?.label)) ?? lit("other"),
      }),
      ...(Ae && { stderr_errno: sanitizeErrnoTokenForTelemetry(Ae) }),
      ...(!G && (await describeDaemonLockAtDeadline(T))),
    }),
    G)
  ) {
    if ((readLogindConfig(), recoveredAfterReinstallWait || Y))
      logFeatureSad("daemon_ensure_running", "daemon_ensure_spawn_waited_reinstall");
    else logEnsureOutcome(n);
    if (processWrapperArgv().length > 0) {
      let H = await controlRequest({ proto: BG_PROTO, op: "nudge" }).catch(() => null);
      logLauncherMatch(H?.ok && H.op === "nudge" ? H.processWrapper : void 0);
    }
    return { ok: !0 };
  }
  if (ce)
    return (
      logForDebugging(
        "daemon: the clock jumped during the cold start (machine slept?) and the daemon is still unreachable \u2014 retrying the whole start once",
        { level: "warn" },
      ),
      ensureDaemonRunning({ ...r, onStarting: void 0, standsDownAtExit: !1 }, e, !0)
    );
  logFeatureBad("daemon_ensure_running", "daemon_ensure_transient_unreachable");
  let xe = Q
      ? ` \u2014 Claude Code is being updated by npm on this machine (still not runnable after ${Math.round(EXTENDED_WAIT_MS / 60000)} min); try again when the update finishes`
      : "",
    De = processWrapperArgv()[0];
  if (De)
    return (
      logEvent("tengu_bg_daemon_spawn_failed", { launcher_configured: !0, failed_stage: lit("unknown") }),
      logFeatureBad("agent_launcher", "daemon_never_reachable"),
      {
        ok: !1,
        causeCode: "timeout",
        reason: `launcher \`${De}\` ran but Claude Code never started${Ee ? ` \u2014 ${Ee}` : ` (nothing on stderr within ${oe / 1000}s)`}${xe}`,
      }
    );
  let Se = T.siblingHolderSeen ? null : T.childExit;
  if (Se) {
    let H = Se.signal ? `signal ${Se.signal}` : `exit code ${Se.code ?? "?"}`;
    return {
      ok: !1,
      causeCode: "exited",
      reason: Ee
        ? `${bgSupervisorNoun()} ${DAEMON_EXITED_BEFORE_REACHABLE_PHRASE} (${H}): ${Ee}${xe}`
        : `${bgSupervisorNoun()} ${DAEMON_EXITED_BEFORE_REACHABLE_PHRASE} (${H}, nothing on stderr) and no other ${bgSupervisorNoun()} answered within ${Math.round(Math.min(Date.now() - T.spawnIssuedAt - q, oe) / 1000)}s${xe}`,
    };
  }
  return {
    ok: !1,
    causeCode: "timeout",
    reason: `${bgSupervisorNoun()} ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} ${oe / 1000}s${xe}`,
  };
}
/**
 * 进程正在退出时放弃启动 daemon：记录日志与事件，返回 stoodDown 结果。
 */
//@ chunk-ksvdmrg0.js:59870-60182 placement
function standDownAtExit(r, e) {
  return (
    logForDebugging("daemon: not started, because this process is exiting"),
    logEvent("tengu_bg_daemon_stood_down_at_exit", { via_service: r, duration_ms: Date.now() - e }),
    logFeatureSad("daemon_ensure_running", "daemon_ensure_stood_down_at_exit"),
    { ok: !1, stoodDown: !0, viaService: r, causeCode: "exiting", reason: "this process is exiting" }
  );
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
function ot() {
  return getLaunchCommand().target;
}
/**
 * 判断客户端是否应接管临时守护进程：版本与目标不同且客户端更新（同通道比构建时间，否则按 semver）。
 */
//@ chunk-ksvdmrg0.js:60332-60787 placement
function shouldTakeOverDaemon(r) {
  if (r.daemonOrigin !== "transient") return !1;
  if (r.daemonVersion === r.clientVersion) return !1;
  if (r.daemonTarget === r.clientTarget) return !1;
  let e = parseRcVersionTimestamp(r.daemonVersion),
    n = parseRcVersionTimestamp(r.clientVersion);
  if (e !== null && n !== null) {
    if (amt(r.daemonVersion) !== amt(r.clientVersion)) return !1;
    return n > e;
  }
  if (Atn(r.daemonVersion) || Atn(r.clientVersion)) return !1;
  return (
    Ge.valid(r.clientVersion) !== null &&
    Ge.valid(r.daemonVersion) !== null &&
    Ge.gt(r.clientVersion, r.daemonVersion)
  );
}
/**
 * 后台二进制接管：新版本替换正在运行的后台守护进程
 */
//@ chunk-ksvdmrg0.js:60787-64175 placement
async function takeOverBackgroundBinary(r, e, n, s, h) {
  if (processWrapperError() !== null) return !1;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_binary_takeover", !0)) return !1;
  let w =
      r !==
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
    p = w && !s,
    E = shouldUseLauncherPrefix(n, w);
  if (!p && !E) return !1;
  if (!(await isProcessWrapperUsable())) return !1;
  if (await ir()) return !1;
  if (!e && getDaemonColdStart() === "ask" && (await cr()) && !getGlobalConfig().daemonInstallPromptDismissed)
    return !1;
  let S = await realpath(ot()).catch(() => null);
  if (!S) return !1;
  let cmd = resolveLaunchTarget().cmd;
  if (!(await isExecutableBinary(cmd))) {
    let cmd_2 = resolveLaunchTarget({ pinToCurrentBinary: !0 }).cmd;
    if (cmd_2 === cmd || !(await isExecutableBinary(cmd_2))) return !1;
  }
  let A = await readLiveServerLock(1, h).catch(() => null);
  if (!A) return !1;
  if (!hasProcIdentity(A))
    return (
      logForDebugging(`bg: skipping stale-daemon retire \u2014 lock pid ${A.pid} has no procStart identity`),
      !1
    );
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
    }),
    L = p && x,
    M =
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
  if (!L && !M) return !1;
  let U = await signalPid(A.pid);
  if (U === "timed-out") {
    try {
      process.kill(A.pid, "SIGKILL");
    } catch {}
    U = await signalPid(A.pid);
  }
  if (U !== "exited") return !1;
  if (M) uB().prefixAxis = "took-over";
  return (
    logForDebugging(
      L
        ? `bg: ${bgSupervisorNoun()} pid ${A.pid} runs ${A.version}; this binary (${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}) is a newer build \u2014 retired the stale ${bgSupervisorNoun()} so new sessions use the current binary`
        : `bg: ${bgSupervisorNoun()} pid ${A.pid} predates CLAUDE_CODE_PROCESS_WRAPPER and spawns sessions unwrapped \u2014 retired it so the replacement runs through the configured launcher`,
      { level: "warn" },
    ),
    logEvent("tengu_bg_daemon_binary_takeover", {
      daemon_age_ms: Date.now() - A.startedAt,
      via_prefix: M,
      via_version: L,
      daemon_version: sanitizeVersion(A.version),
    }),
    !0
  );
}
/**
 * 判断是否经启动器（CLAUDE_CODE_PROCESS_WRAPPER）拉起守护进程：已由启动器接管后又出现裸进程时记一次警告与事件。
 */
//@ chunk-ksvdmrg0.js:64175-64960 placement
function shouldUseLauncherPrefix(r, e) {
  if (processWrapperRecord() === "" || r) return !1;
  let launcherState = uB();
  if (launcherState.prefixAxis === "took-over") {
    if (e) return !1;
    if (!launcherState.prefixContractViolationLogged)
      ((launcherState.prefixContractViolationLogged = !0),
        logForDebugging(
          `bg: a raw ${bgSupervisorNoun()} is running again after this session's launcher-driven restart. Two causes look identical from here: a claude session started BEFORE CLAUDE_CODE_PROCESS_WRAPPER was deployed cold-started it (restart those sessions), or the launcher does not pass that variable through in the environment it hands to \`exec\` (launcher contract #3). Sessions dispatched to it run unwrapped either way; \`claude daemon status\` shows the launcher it records.`,
          { level: "warn" },
        ),
        logEvent("tengu_bg_launcher_replacement_raw", {}));
    return !1;
  }
  if (e) return !0;
  if (launcherState.prefixAxis === "attempted") return !1;
  return ((launcherState.prefixAxis = "attempted"), !0);
}
//@ chunk-ksvdmrg0.js:64960-67060 placement
async function checkBackgroundDisabled(r) {
  let e = await readLiveServerLock(1, r).catch(() => null);
  if (!e) return null;
  if (e.bgDisabled)
    return (
      logEvent("tengu_bg_daemon_bg_disabled_skip", { origin_service: e.origin === "service" }),
      {
        reason:
          "the background service on this machine is running without background sessions \u2014 its control socket failed to start. " +
          "Check the cause with 'claude daemon status' (daemon.log), then restart the service (launchctl/systemctl, or reboot).",
        code: "daemon_ensure_bg_disabled",
        causeCode: "bg_disabled",
      }
    );
  if (Date.now() - e.startedAt <= bt + 5000) return null;
  let n = await controlRequest({ proto: BG_PROTO, op: "ping" }, { timeoutMs: 1000 }),
    s = {
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
  if (n.ok || n.code === "ETIMEOUT")
    return (logEvent("tengu_bg_daemon_zombie_false_positive", { ...s, recheck_etimeout: !n.ok }), null);
  if (!hasProcIdentity(e))
    return (
      logForDebugging(
        `bg: supervisor lock pid ${e.pid} alive but identity unverifiable (no procStart) \u2014 not signalled`,
        { level: "warn" },
      ),
      {
        reason: `${lockHolderProblemText({ pid: e.pid, outcome: "unverified" })}. If no daemon is running, delete ${daemonLockPath()}; if pid ${e.pid} is a live process you own, stop it yourself first.`,
        code: "daemon_ensure_zombie_unverified",
        causeCode: "zombie",
      }
    );
  let h = !1;
  try {
    h = await lstat(Z6()).then(
      () => !0,
      () => !1,
    );
  } catch {}
  if (
    (logForDebugging(
      `bg: supervisor pid ${e.pid} alive but control socket unreachable \u2014 signalling restart`,
      { level: "warn" },
    ),
    (await signalPid(e.pid)) === "eperm")
  )
    return {
      reason: `${bgSupervisorNoun()} socket missing; could not restart supervisor (EPERM)`,
      code: "daemon_ensure_zombie_kill_failed",
      causeCode: "zombie",
    };
  return (logEvent("tengu_bg_daemon_zombie_restart", { pid: e.pid, ...s, sock_exists: h }), null);
}
//@ chunk-ksvdmrg0.js:67060-67138 placement
async function ir() {
  if (sr() || !(await hasSystemdUserSession())) return !1;
  return daemonServiceStatus().catch(() => !1);
}
//@ chunk-ksvdmrg0.js:67138-67198 placement
function sr() {
  return Boolean(process.env.CLAUDE_CONFIG_DIR);
}
//@ chunk-ksvdmrg0.js:67198-67237 placement
async function kxs() {
  return !sr() && Ct();
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
  let r = getPlatform();
  if (r !== "linux" && r !== "wsl") return;
  let e = await readFile("/etc/systemd/logind.conf", "utf8").catch(() => "");
  if (!/^\s*KillUserProcesses\s*=\s*yes\b/im.test(e)) return;
  logForDebugging(
    "logind KillUserProcesses=yes \u2014 SSH disconnect will kill the transient daemon and its background jobs. Run `loginctl enable-linger $USER` or `claude daemon install` to keep it alive across logout.",
    { level: "warn" },
  );
}
//@ chunk-ksvdmrg0.js:67782-67954 placement
function describeMissingLauncher() {
  return `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting); background sessions are not started unwrapped`;
}
//@ chunk-ksvdmrg0.js:67954-68082 placement
function logLauncherMatch(r) {
  let e = processWrapperRecord();
  if (e === "" || !r) return;
  if (r === e) logFeatureOk("agent_launcher");
  else logFeatureSad("agent_launcher", "served_by_skewed_wrapper");
}
//@ chunk-ksvdmrg0.js:68082-68167 placement
async function cr() {
  return (
    isDaemonServiceInstallEnabled() &&
    (await hasSystemdUserSession()) &&
    !process.env.CLAUDE_CONFIG_DIR &&
    isDaemonCliEnabled()
  );
}
//@ chunk-ksvdmrg0.js:68167-68220 placement
function xAr(r) {
  return STORAGE_SPACES.daemon(["host-managed", r]);
}
/**
 * 把网关与网关谱系标记编码为多行文本。
 */
//@ chunk-ksvdmrg0.js:68220-68345 placement
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
/**
 * 从多行文本解析网关与网关谱系标记。
 */
//@ chunk-ksvdmrg0.js:68345-68451 placement
function decodeHostLineage(r) {
  let e = new Set(r.split(/\r?\n/));
  return { gateway: e.has("gateway"), lineage: e.has("lineage") };
}
//@ chunk-ksvdmrg0.js:68451-68504 placement
var zn = { namespace: "daemon", relPath: ["host-managed"] };
/**
 * 确保宿主墓碑目录存在，失败时抛出带原因的错误。
 */
//@ chunk-ksvdmrg0.js:68504-68639 placement
async function ensureTombstoneScope(r) {
  let ensureScope = await r.ensureScope(zn);
  if (!ensureScope.ok)
    throw ur(Error("host tombstone folder not made", { cause: ensureScope.error }), ensureScope.error);
}
/**
 * 原地写入宿主墓碑记录，失败时抛出带原因的错误。
 */
//@ chunk-ksvdmrg0.js:68639-68805 placement
async function writeHostTombstone(r, e, n) {
  let write = await r.write(xAr(e), n, { publishDiscipline: "inPlace" });
  if (!write.ok) throw ur(Error("host tombstone write failed", { cause: write.error }), write.error);
}
//@ chunk-ksvdmrg0.js:68805-68866 placement
async function Ttn(r, e) {
  await r.delete(xAr(e)).catch(() => {});
}
//@ chunk-ksvdmrg0.js:68866-68942 placement
function ur(r, e) {
  let n = storageErrorCode(e);
  return Object.assign(r, n !== void 0 ? { code: n } : {});
}

export {
  ensureDaemon,
  waitForDaemonPing,
  s5,
  ensureTombstoneScope,
  writeHostTombstone,
  encodeHostLineage,
  decodeHostLineage,
  kxs,
  xAr,
  Ttn,
  waitForServiceDaemon,
};
