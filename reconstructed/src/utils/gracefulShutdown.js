/**
 * utils/gracefulShutdown.ts
 *
 * ShutdownCoordinator：信号/未捕获异常处理与有序退出（终端复位、恢复提示、清理回调、SessionEnd 钩子、遥测刷出、stdout 排空、强制退出兜底）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/gracefulShutdown.ts
 * pieces: chunk-e6aww6q8.js (31), chunk-x6v6jz2y.js (1)
 * attribution: fingerprint 3, placement 29
 */
import { writeSync } from "fs";
import { types } from "util";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { getTerminalHooks, isUiMounted, getSecondRootError } from "../ink/terminal.js";
import {
  stripControlChars as stripControlChars_3,
  drainRegisteredWriteQueues,
} from "./settings/writeQueues.js";
import {
  getIsInteractive,
  getIsRemoteMode,
  isSessionPersistenceDisabled,
  getSessionId,
  getIsScrollDraining,
  isUnclaimedSpare,
  onProcessRootHost,
} from "../bootstrap/state.js";
import { getRemoteCaps } from "../remote/remoteMode.js";
import { extractRepoSlug } from "../cli/eagerFlags.js";
import { toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { hasBeenInWorktree, getResumeHintWorktreeName, isBgSession } from "./concurrentSessions.js";
import { sequential } from "./sequential.js";
import {
  resumeHintPrefix,
  recordBgExitCause,
  findPendingWriteLine,
  hasPendingWrites,
  drainPendingWrites,
  getSessionIdentity,
  isUntrustedObject,
} from "./shutdown/pendingWrites.js";
import { noopContainerCleanup } from "./teleport/containerSync.js";
import { sessionIdExists, getCurrentSessionTitle } from "./sessionStorage.js";
import { worktreeResumeHint } from "./worktreeResumeHint.js";
import { getCurrentWorktreeSession } from "./worktree.js";
import { onExit } from "../../vendor/signal-exit/dist/mjs/index.js";
import { logForDiagnosticsNoPII, flushDiagnosticLogs } from "./diagLogs.js";
import {
  markStdoutDrainExternallyClocked,
  registerProcessIOErrorHandlers,
  drainStdoutBeforeExit,
  getStdoutDrainBudgetMs,
} from "./process.js";
import { env } from "./env.js";
import { isHttp2TransportError } from "./shutdown/http2Recovery.js";
import { errorTelemetryFields } from "./accessibility/screenReader.js";
import { trackError } from "../services/errorTracking/errorTracking.js";
import { logForDebugging, flushDebugLogs } from "./debug.js";
import { isSupervisedMode } from "./envUtils.js";
import { EX_SOFTWARE } from "./exitCodes.js";
import { errorMessage, isHttpServerConnReset, isAbortError, sanitizeClassName } from "./errors.js";
import { latchTerminalShutdown } from "./terminalShutdown.js";
import { withDeadline } from "./sleep.js";
import { logError } from "./log.js";
import {
  runCleanups,
  CLEANUP_TIMEOUT_MS,
  maxPreExitFlushWaitMs,
  drainPreExitFlushes_2,
  drainPreExitFlushes,
} from "./cleanupRegistry.js";
import { killRunningShellCommands, drainPendingKillBackstops } from "./ShellCommand.js";
import { killPendingEscalations } from "./agentProcessRegistry.js";
import { profileReport } from "./startupProfiler.js";
import { endMaintenanceAndForget } from "../services/api/cacheKeepalive.js";
import {
  waitForOAuthRefreshLocksReleased,
  OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
  waitForInFlightOAuthRefresh,
} from "./auth.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { isUntrustedObject as isUntrustedObject_2 } from "./untrustedValues.js";
import { hasScrollActivity, takeScrollSummary } from "./scrollTelemetry.js";
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { shortHash } from "./shortHash.js";
import { HostScoped } from "./hostScoped.js";
import { resumeNonBlockingStdout } from "../ink/nonBlockingStdout.js";
import { DISABLE_MOUSE_TRACKING } from "../ink/termio/dec.js";
import { restoreTerminalModes } from "../ink/ink.js";
import { TerminalModes } from "../ink/terminalModes.js";
import { CLEAR_TERMINAL_TITLE } from "../ink/termio/osc.js";

//@ chunk-e6aww6q8.js:244110-244207 fingerprint = gracefulShutdown (0.464)
function gracefulShutdown_2(e, n) {
  if (!n) return;
  logEvent("tengu_cache_eviction_hint", {
    scope: fromEnum(e),
    last_request_id: sanitizeMarkName(n),
  });
}
//@ chunk-e6aww6q8.js:270819-270864 placement
function cleanupTerminalModes() {
  getTerminalHooks()?.cleanupTerminalModes();
}
//@ chunk-e6aww6q8.js:270864-270916 placement
function emitExitMessage(e) {
  try {
    cleanupTerminalModes();
    writeSync(
      2,
      `
${stripControlChars_3(e)}
`,
    );
  } catch {}
}
//@ chunk-e6aww6q8.js:270916-271004 placement
var MAX_UNCAUGHT_BEFORE_FORCED_EXIT = 10;
var UNCAUGHT_WINDOW_MS = 5000;
var RECENT_UNCAUGHT_KEEP = 3;
var HTTP2_RECOVERY_CAP = 50;
var HTTP2_RECOVERY_WINDOW_MS = 60000;
var RECOVERED_DD_REPORT_CAP = 10;
var STARTUP_MOUNT_GRACE_MS = 1e4;
var EXIT_HANDOFF_FAILSAFE_MS = 15000;
var STDOUT_DRAIN_EXTRA_MS = 1500;
var DEFAULT_CLEANUP_BUDGET_MS = 600000;
//@ chunk-e6aww6q8.js:271004-271050 placement
function writeShutdownNotice(e) {
  try {
    writeSync(
      2,
      `${stripControlChars_3(e)}
`,
    );
  } catch {}
}
//@ chunk-e6aww6q8.js:271050-283131 placement
/**
 * ShutdownCoordinator：进程唯一的退出协调者。install 注册 SIGINT/SIGTERM/SIGHUP、uncaughtException、unhandledRejection；shutdown 依次：恢复终端、打印 resume 提示、运行清理回调（有超时）、SessionEnd 钩子、flush 分析与遥测、等 OAuth 刷新、排空 stdout，最后强制退出（带 failsafe 定时器）。
 */
class ShutdownCoordinator {
  installed = false;
  handles = {};
  resumeHintPrinted = false;
  cloudHintLead;
  resumeHintOmitsWorktree = false;
  worktreeRemoval = undefined;
  interruptWorktreeRemoval = undefined;
  worktreeRemovalIgnoresHangup = false;
  worktreeRemovalSignalsInstalled = false;
  printModeSignalHandlersRegistered = false;
  ownsControllingTerminal = false;
  uncaughtCount = 0;
  uncaughtWindowStart = 0;
  uncaughtBreakerTripped = false;
  recentUncaught = [];
  http2RecoveryCount = 0;
  http2RecoveryWindowStart = 0;
  recoveredDdReportCount = 0;
  startupActionStarted = false;
  startupExpectsUiMount = false;
  shutdownInProgress = false;
  failsafeTimer = undefined;
  failsafeFiresAtMs = undefined;
  orphanCheckInterval = undefined;
  pendingShutdown = undefined;
  beforeInteractiveShutdown = null;
  printResumeHint() {
    if (this.resumeHintPrinted) return;
    if (process.stdout.isTTY && getIsInteractive())
      try {
        let e = getIsRemoteMode() ? getRemoteCaps() : null;
        let n =
          e?.sessionId !== undefined && !e.viewerOnly
            ? extractRepoSlug(toCompatSessionId(e.sessionId))
            : null;
        if (n !== null) {
          let r = process.stderr.isTTY === true;
          let s = !hasBeenInWorktree();
          writeSync(
            1,
            sequential.dim(`
${this.cloudHintLead?.() ?? `${resumeHintPrefix()}Resume this session with:`}
claude --cloud ${n}
`),
          );
          this.resumeHintPrinted = true;
          if (r && s) noopContainerCleanup(n);
          return;
        }
      } catch {}
    if (process.stdout.isTTY && getIsInteractive() && !isSessionPersistenceDisabled())
      try {
        let sessionId = getSessionId();
        if (!sessionIdExists(sessionId)) return;
        let n = this.resumeHintOmitsWorktree ? null : getResumeHintWorktreeName();
        let { advice, command, arg, worktree } = worktreeResumeHint({
          sessionId,
          worktree: n
            ? {
                name: n,
                recordCleared: getCurrentWorktreeSession() === null,
              }
            : undefined,
          columns: process.stdout.columns,
          envAssignment: undefined,
        });
        let S = [];
        writeSync(
          1,
          sequential.dim(
            ["", ...S, ...advice, "Resume this session with:", command, ""].join(`
`),
          ),
        );
        this.resumeHintPrinted = true;
        logEvent("tengu_resume_hint_printed", {
          arg: fromEnum(arg),
          title: fromEnum(getCurrentSessionTitle(sessionId) ? "left_out" : "absent"),
          worktree: fromEnum(worktree),
          advice: advice.length > 0,
        });
      } catch {}
  }
  forceExit(e) {
    if (this.failsafeTimer !== undefined) {
      clearTimeout(this.failsafeTimer);
      this.failsafeTimer = undefined;
      this.failsafeFiresAtMs = undefined;
    }
    try {
      getTerminalHooks()?.drainStdin();
    } catch {}
    try {
      process.exit(e);
    } catch (error) {
      process.kill(process.pid, "SIGKILL");
    }
    throw Error("unreachable");
  }
  markPrintModeSignalHandlersRegistered() {
    this.printModeSignalHandlersRegistered = true;
  }
  setCloudResumeHintLead(cloudHintLead) {
    this.cloudHintLead = cloudHintLead;
  }
  markOwnsControllingTerminal() {
    this.ownsControllingTerminal = true;
  }
  isInstalled() {
    return this.installed;
  }
  install(handles = {}) {
    if (this.installed) return;
    this.installed = true;
    this.handles = handles;
    onExit(() => {});
    let ppid = process.ppid;
    process.on("SIGINT", () => {
      if (this.printModeSignalHandlersRegistered) return;
      logForDiagnosticsNoPII("info", "shutdown_signal", {
        signal: "SIGINT",
      });
      markStdoutDrainExternallyClocked();
      this.shutdown(0);
    });
    process.on("SIGTERM", () => {
      let r = {
        uptime_s: Math.round(process.uptime()),
        ppid_changed: process.ppid !== ppid,
        stdin_at_eof: process.stdin.readableEnded,
        stdin_destroyed: process.stdin.destroyed,
        is_tty: process.stdin.isTTY ?? false,
      };
      logForDiagnosticsNoPII("info", "shutdown_signal", {
        signal: "SIGTERM",
        ...r,
      });
      logEvent("tengu_shutdown_signal", {
        signal: lit_2("SIGTERM"),
        ...r,
      });
      markStdoutDrainExternallyClocked();
      if (this.printModeSignalHandlersRegistered) return;
      this.shutdown(143);
    });
    if (env.CLAUDE_BG_BACKEND === "daemon")
      process.on("SIGHUP", () => {
        if (this.ownsControllingTerminal) {
          logForDiagnosticsNoPII("info", "shutdown_signal", {
            signal: "SIGHUP",
            bg_ctty: true,
          });
          markStdoutDrainExternallyClocked();
          this.shutdown(129);
          return;
        }
        logForDiagnosticsNoPII("info", "shutdown_signal", {
          signal: "SIGHUP_ignored_bg",
        });
      });
    else {
      process.on("SIGHUP", () => {
        logForDiagnosticsNoPII("info", "shutdown_signal", {
          signal: "SIGHUP",
        });
        markStdoutDrainExternallyClocked();
        this.shutdown(129);
      });
      this.armOrphanCheck();
    }
    registerProcessIOErrorHandlers((r, s) => {
      if (!getIsInteractive()) return;
      logForDiagnosticsNoPII("info", "shutdown_signal", {
        signal: `${r}_${s}`,
      });
      markStdoutDrainExternallyClocked();
      this.shutdown(0);
    });
    process.on("uncaughtException", (r) => {
      if (this.uncaughtBreakerTripped) return;
      let s = serializeShutdownError(r);
      let h = s.isHostError && isHttp2TransportError(r) && this.recordHttp2RecoveryAndCheckBudget(Date.now());
      logForDiagnosticsNoPII("error", "uncaught_exception", {
        ...s,
        recovered: h,
      });
      let y = s.isHostError ? errorTelemetryFields(r) : hostErrorMessageFields(s);
      logEvent("tengu_uncaught_exception", {
        error_name: sanitizeErrorName(s),
        ...y,
        ...(h && {
          recovered: h,
        }),
      });
      if (s.isHostError) {
        if (!h) trackError(r, "uncaught_exception");
        else if (this.recoveredDdReportCount < RECOVERED_DD_REPORT_CAP) {
          this.recoveredDdReportCount++;
          trackError(r, "uncaught_exception_recovered");
        }
      }
      if (h) {
        logForDebugging(
          `Recovered HTTP/2 stream-teardown uncaught exception (${s.error_name}) \u2014 transport throttle, keeping the process alive`,
          {
            level: "error",
          },
        );
        this.scheduleStartupMountWatchdog(s.error_message ?? s.error_name);
        return;
      }
      if (isSupervisedMode()) {
        this.uncaughtBreakerTripped = true;
        logForDebugging(
          `Uncaught exception under CLAUDE_CODE_SUPERVISED \u2014 exiting ${EX_SOFTWARE}: ${s.error_name}`,
          {
            level: "error",
          },
        );
        if (isBgSession() && !this.isShuttingDown()) recordBgExitCause("uncaught:" + s.error_name);
        this.shutdown(EX_SOFTWARE);
        return;
      }
      let S = this.recordUncaughtAndCheckBreaker(Date.now());
      if (this.recentUncaught.length < RECENT_UNCAUGHT_KEEP || S)
        this.recentUncaught.push({
          name: s.error_name,
          message: (s.error_message ?? "").slice(0, 200),
          topFrame: y.error_top_frame,
        });
      if (S) {
        logEvent("tengu_uncaught_exception_loop", {
          count: this.uncaughtCount,
          window_ms: UNCAUGHT_WINDOW_MS,
          error_name: sanitizeErrorName(s),
          error_message_hash: y.error_message_hash,
        });
        cleanupTerminalModes();
        try {
          for (let w of this.recentUncaught)
            writeSync(
              2,
              `Uncaught exception (loop): ${w.name}: ${w.message}${w.topFrame ? ` at ${w.topFrame}` : ""}
`,
            );
          writeSync(
            2,
            `Uncaught exception loop detected (${this.uncaughtCount} in ${UNCAUGHT_WINDOW_MS}ms) \u2014 forcing shutdown
`,
          );
        } catch {}
        this.shutdown(1);
        return;
      }
      if (isBgSession() && !this.isShuttingDown()) {
        recordBgExitCause("uncaught:" + s.error_name);
        this.shutdown(1);
        return;
      }
      this.scheduleStartupMountWatchdog(s.error_message ?? s.error_name);
    });
    process.on("unhandledRejection", (r, s) => {
      if (this.uncaughtBreakerTripped) return;
      let pendingWriteLine = findPendingWriteLine(r, s);
      if (pendingWriteLine !== undefined) {
        logForDebugging(pendingWriteLine);
        return;
      }
      let y = serializeShutdownError(r);
      if (this.shutdownInProgress && y.isHostError && isMcpConnectionClosed(r)) {
        logForDebugging(`Swallowed MCP ConnectionClosed during shutdown: ${errorMessage(r)}`);
        return;
      }
      logForDiagnosticsNoPII("error", "unhandled_rejection", y);
      logEvent("tengu_unhandled_rejection", {
        error_name: sanitizeErrorName(y),
        ...(y.isHostError ? errorTelemetryFields(r) : hostErrorMessageFields(y)),
      });
      let S = y.isHostError && isHttpServerConnReset(r);
      if (y.isHostError && !S) trackError(r, "unhandled_rejection");
      if (y.isHostError && isAbortError(r)) {
        logForDebugging("Swallowed unhandled AbortError rejection (not exiting bg/supervised worker)");
        return;
      }
      if (S) {
        logForDebugging(
          "Swallowed unhandled http.Server ECONNRESET rejection (not exiting bg/supervised worker)",
        );
        return;
      }
      if (isSupervisedMode()) {
        this.uncaughtBreakerTripped = true;
        logForDebugging(
          `Unhandled rejection under CLAUDE_CODE_SUPERVISED \u2014 exiting ${EX_SOFTWARE}: ${y.error_name}`,
          {
            level: "error",
          },
        );
        if (isBgSession() && !this.isShuttingDown()) recordBgExitCause("unhandled:" + y.error_name);
        this.shutdown(EX_SOFTWARE);
        return;
      }
      if (isBgSession() && !this.isShuttingDown()) {
        recordBgExitCause("unhandled:" + y.error_name);
        this.shutdown(1);
        return;
      }
      this.scheduleStartupMountWatchdog(y.error_message ?? y.error_name);
    });
  }
  shutdownSync(e = 0, n = "other") {
    if (!this.shutdownInProgress) {
      process.exitCode = e;
      latchTerminalShutdown();
    }
    this.pendingShutdown = this.shutdown(e, n)
      .catch(async (error) => {
        logForDebugging(`Graceful shutdown failed: ${error}`, {
          level: "error",
        });
        cleanupTerminalModes();
        this.printResumeHint();
        await this.armFailsafeAndDrainStdout(e);
        this.forceExit(e);
      })
      .catch(() => {});
  }
  recordUncaughtAndCheckBreaker(e) {
    if (this.uncaughtBreakerTripped) return false;
    if (e - this.uncaughtWindowStart > UNCAUGHT_WINDOW_MS) {
      this.uncaughtCount = 0;
      this.uncaughtWindowStart = e;
      this.recentUncaught = [];
    }
    this.uncaughtCount++;
    if (this.uncaughtCount >= MAX_UNCAUGHT_BEFORE_FORCED_EXIT) {
      this.uncaughtBreakerTripped = true;
      return true;
    }
    return false;
  }
  recordHttp2RecoveryAndCheckBudget(e) {
    if (e - this.http2RecoveryWindowStart > HTTP2_RECOVERY_WINDOW_MS) {
      this.http2RecoveryCount = 0;
      this.http2RecoveryWindowStart = e;
    }
    this.http2RecoveryCount++;
    return this.http2RecoveryCount <= HTTP2_RECOVERY_CAP;
  }
  markStartupActionStarted(startupExpectsUiMount) {
    this.startupActionStarted = true;
    this.startupExpectsUiMount = startupExpectsUiMount;
  }
  inNonUiSubcommand() {
    return this.startupActionStarted && !this.startupExpectsUiMount;
  }
  exitIfStartupNeverMounted(e) {
    if (isUiMounted() || this.inNonUiSubcommand() || this.isShuttingDown()) return;
    try {
      writeSync(
        2,
        `Claude Code could not start: ${e ?? "<unknown>"}
`,
      );
    } catch {}
    this.shutdown(1);
  }
  scheduleStartupMountWatchdog(e) {
    if (!getIsInteractive() || isUiMounted() || this.inNonUiSubcommand() || this.isShuttingDown()) return;
    setTimeout((n) => this.exitIfStartupNeverMounted(n), STARTUP_MOUNT_GRACE_MS, e).unref();
  }
  armShutdownFailsafe(e, n) {
    if (this.failsafeTimer !== undefined) clearTimeout(this.failsafeTimer);
    this.failsafeFiresAtMs = Date.now() + e;
    this.failsafeTimer = setTimeout(
      (r) => {
        cleanupTerminalModes();
        this.printResumeHint();
        drainStdoutBeforeExit(500, {
          scaleBudgetToQueue: false,
        })
          .then(() => this.forceExit(r))
          .catch(() => {});
      },
      e,
      n,
    );
  }
  async removeWorktreeAtExit(e, n, r) {
    let budgetMs = e.budgetMs ?? DEFAULT_CLEANUP_BUDGET_MS;
    if (this.failsafeFiresAtMs !== undefined)
      this.armShutdownFailsafe(Math.max(this.failsafeFiresAtMs - Date.now(), budgetMs + r), n);
    writeShutdownNotice("Removing worktree\u2026");
    let h = "it may be partly deleted. Delete the folder if you no longer need it.";
    if (!this.worktreeRemovalSignalsInstalled) {
      this.worktreeRemovalSignalsInstalled = true;
      process.on("SIGINT", () => this.interruptWorktreeRemoval?.());
      process.on("SIGTERM", () => this.interruptWorktreeRemoval?.());
      process.on("SIGHUP", () => {
        let L = env.CLAUDE_BG_BACKEND === "daemon" && !this.ownsControllingTerminal;
        if (!this.worktreeRemovalIgnoresHangup && !L) this.interruptWorktreeRemoval?.();
      });
    }
    this.worktreeRemovalIgnoresHangup = e.ignoresHangup === true;
    let promise = new Promise((resolve) => {
      this.interruptWorktreeRemoval = () =>
        resolve({
          line: `Stopped waiting for the removal of the worktree at ${e.path}; ${h}`,
        });
    });
    let rounded = Math.round(budgetMs / 60000);
    let w;
    try {
      w = await withDeadline(
        Promise.race([
          Promise.resolve()
            .then(() => e.run())
            .then(
              (line) => ({
                line,
              }),
              (error) => {
                logError(error);
                return {
                  line: `Could not finish removing the worktree at ${e.path}; ${h}`,
                };
              },
            ),
          promise,
        ]),
        budgetMs,
      );
    } finally {
      this.interruptWorktreeRemoval = undefined;
      this.worktreeRemovalIgnoresHangup = false;
    }
    writeShutdownNotice(
      w?.line ??
        `Removing the worktree at ${e.path} did not finish within ${budgetMs >= 60000 ? `${rounded} ${rounded === 1 ? "minute" : "minutes"}` : `${Math.round(budgetMs / 1000)} seconds`}; ${h}`,
    );
    if (this.failsafeFiresAtMs !== undefined) this.armShutdownFailsafe(r, n);
  }
  isShuttingDown() {
    return this.shutdownInProgress;
  }
  armOrphanCheck() {
    if (this.orphanCheckInterval !== undefined || !process.stdin.isTTY) return;
    this.orphanCheckInterval = setInterval(() => {
      if (getIsScrollDraining()) return;
      if (!process.stdout.writable || !process.stdin.readable) {
        clearInterval(this.orphanCheckInterval);
        logForDiagnosticsNoPII("info", "shutdown_signal", {
          signal: "orphan_detected",
        });
        markStdoutDrainExternallyClocked();
        this.shutdown(129);
      }
    }, 30000);
    this.orphanCheckInterval.unref();
  }
  disarmOrphanCheck() {
    if (this.orphanCheckInterval !== undefined) {
      clearInterval(this.orphanCheckInterval);
      this.orphanCheckInterval = undefined;
    }
  }
  claimShutdown() {
    this.shutdownInProgress = true;
    this.disarmOrphanCheck();
  }
  releaseShutdownClaim() {
    this.shutdownInProgress = false;
    this.armOrphanCheck();
  }
  registerBeforeInteractiveShutdown(beforeInteractiveShutdown) {
    this.beforeInteractiveShutdown = beforeInteractiveShutdown;
  }
  clearBeforeInteractiveShutdown() {
    this.beforeInteractiveShutdown = null;
  }
  async runBeforeInteractiveShutdown() {
    let beforeInteractiveShutdown = this.beforeInteractiveShutdown;
    this.beforeInteractiveShutdown = null;
    if (!beforeInteractiveShutdown || this.isShuttingDown()) return;
    try {
      await beforeInteractiveShutdown();
    } catch (error) {
      logError(error);
    }
  }
  disarmTimers() {
    if (this.failsafeTimer !== undefined) {
      clearTimeout(this.failsafeTimer);
      this.failsafeTimer = undefined;
      this.failsafeFiresAtMs = undefined;
    }
    this.disarmOrphanCheck();
  }
  getPendingShutdown() {
    return this.pendingShutdown;
  }
  async shutdown(e = 0, n = "other", r) {
    if (this.shutdownInProgress) {
      if (r?.removeWorktree && r.removeWorktree !== this.worktreeRemoval)
        logForDebugging(`Worktree ${r.removeWorktree.path} kept: a shutdown was already under way`, {
          level: "warn",
        });
      return;
    }
    this.shutdownInProgress = true;
    latchTerminalShutdown();
    process.exitCode = e;
    if (r?.suppressResumeHint) this.resumeHintPrinted = true;
    this.resumeHintOmitsWorktree = r?.removeWorktree !== undefined;
    this.worktreeRemoval = r?.removeWorktree;
    let { executeSessionEndHooks, getSessionEndHookTimeoutMs, SESSION_END_HOOK_TIMEOUT_MS_DEFAULT } =
      await import("./chunk-4kvy3jy3.js");
    let S;
    try {
      S = getSessionEndHookTimeoutMs();
    } catch {
      S = SESSION_END_HOOK_TIMEOUT_MS_DEFAULT;
    }
    this.armShutdownFailsafe(Math.max(5000, S + 5000), e);
    cleanupTerminalModes();
    this.printResumeHint();
    let w;
    try {
      let G = (async () => {
        try {
          await runCleanups();
        } catch {}
      })();
      await Promise.race([
        G,
        new Promise((resolve, reject) => {
          w = setTimeout((Se) => Se(new CleanupTimeoutError()), CLEANUP_TIMEOUT_MS, reject);
        }),
      ]);
      clearTimeout(w);
    } catch {
      clearTimeout(w);
    }
    if (hasPendingWrites()) this.armShutdownFailsafe(Math.max(EXIT_HANDOFF_FAILSAFE_MS, S + 5000), e);
    try {
      await drainPendingWrites();
    } catch {}
    killRunningShellCommands();
    try {
      await drainPendingKillBackstops();
    } catch {}
    try {
      await killPendingEscalations();
    } catch {}
    if (r?.removeWorktree) await this.removeWorktreeAtExit(r.removeWorktree, e, Math.max(5000, S + 5000));
    try {
      if (!isUnclaimedSpare())
        await executeSessionEndHooks(getSessionIdentity(), n, {
          signal: AbortSignal.timeout(S),
          storageV5: this.handles.storageV5,
          credentials: this.handles.credentials,
        });
    } catch {}
    killRunningShellCommands();
    try {
      await drainPendingKillBackstops();
    } catch {}
    try {
      profileReport();
    } catch {}
    emitScrollTelemetrySummary();
    try {
      endMaintenanceAndForget("session_end");
    } catch {}
    try {
      let G = maxPreExitFlushWaitMs();
      if (G > 0) {
        this.widenFailsafeBy(G, e);
        await withDeadline(drainPreExitFlushes_2(), G);
      }
    } catch {}
    let L = await this.waitForHeldOAuthRefresh(e);
    await drainRegisteredWriteQueues();
    await flushAnalyticsSinks();
    if (L && waitForOAuthRefreshLocksReleased() !== null) {
      await this.waitForHeldOAuthRefresh(e);
      await drainRegisteredWriteQueues();
    }
    if (r?.finalMessage)
      try {
        writeSync(
          2,
          r.finalMessage +
            `
`,
        );
      } catch {}
    try {
      await flushDiagnosticLogs();
    } catch {}
    try {
      await flushDebugLogs();
    } catch {}
    try {
      this.widenFailsafeBy(maxPreExitFlushWaitMs(), e);
      await drainPreExitFlushes();
    } catch {}
    await this.armFailsafeAndDrainStdout(e);
    this.forceExit(e);
  }
  widenFailsafeBy(e, n) {
    if (e > 0 && this.failsafeFiresAtMs !== undefined)
      this.armShutdownFailsafe(Math.max(0, this.failsafeFiresAtMs - Date.now()) + e, n);
  }
  async armFailsafeAndDrainStdout(e) {
    this.armShutdownFailsafe(getStdoutDrainBudgetMs() + STDOUT_DRAIN_EXTRA_MS, e);
    await drainStdoutBeforeExit();
  }
  async waitForHeldOAuthRefresh(e) {
    if (waitForOAuthRefreshLocksReleased() === null) return true;
    if (this.failsafeFiresAtMs !== undefined)
      this.armShutdownFailsafe(
        Math.max(0, this.failsafeFiresAtMs - Date.now()) + OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
        e,
      );
    return waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
  }
}
//@ chunk-e6aww6q8.js:283131-283872 placement
function serializeShutdownError(e) {
  let n = isUntrustedObject(e);
  if (!(!n && e instanceof Error)) {
    if (typeof e === "string")
      return {
        error_name: "string",
        error_message: redactSecrets(e).slice(0, 2000),
        isHostError: false,
      };
    let w = n ? ownDataString(e, "name") : protoDataString(e, "name");
    let L = ownDataString(e, "message");
    let G = [];
    if (w !== undefined) G.push(w);
    if (L !== undefined) G.push(L);
    let errorMessage = G.length > 0 ? redactSecrets(G.join(": ")).slice(0, 2000) : undefined;
    let Z = types.isNativeError(e) ? undefined : ownDataString(e, "stack");
    return {
      error_name: "non-error",
      error_message: errorMessage,
      error_stack: Z !== undefined ? redactSecrets(Z).slice(0, 4000) : undefined,
      isHostError: false,
    };
  }
  let s = e;
  let h;
  let y;
  let S;
  try {
    h = s.name;
  } catch {}
  try {
    y = s.message;
  } catch {}
  try {
    S = s.stack;
  } catch {}
  return {
    error_name: typeof h === "string" ? h : "Error",
    error_message: typeof y === "string" ? redactSecrets(y).slice(0, 2000) : undefined,
    error_stack: typeof S === "string" ? redactSecrets(S).slice(0, 4000) : undefined,
    isHostError: true,
  };
}
//@ chunk-e6aww6q8.js:283872-284072 placement
function ownDataString(e, n) {
  if (e === null || typeof e !== "object") return;
  if (isUntrustedObject_2(e)) return;
  let r;
  try {
    r = Object.getOwnPropertyDescriptor(e, n);
  } catch {
    return;
  }
  return r && "value" in r && typeof r.value === "string" ? r.value : undefined;
}
//@ chunk-e6aww6q8.js:284072-284338 placement
function protoDataString(e, n) {
  if (e === null || typeof e !== "object") return;
  let r = e;
  for (let idx = 0; idx < 128; idx++) {
    if (r === null) return;
    if (isUntrustedObject_2(r)) return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, n);
    if (ownPropertyDescriptor)
      return "value" in ownPropertyDescriptor && typeof ownPropertyDescriptor.value === "string"
        ? ownPropertyDescriptor.value
        : undefined;
    r = Object.getPrototypeOf(r);
  }
  return;
}
//@ chunk-e6aww6q8.js:284338-284544 placement
function isMcpConnectionClosed(e) {
  try {
    if (!(e instanceof Error)) return false;
    let code = e.code;
    return (
      (e.name === "McpError" && code === -32000) ||
      (e.name === "SdkError" && code === "CONNECTION_CLOSED") ||
      (e.name === "ProtocolError" && code === -32000)
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:284544-284639 placement
function emitScrollTelemetrySummary() {
  try {
    if (getIsInteractive() && hasScrollActivity())
      logEvent("tengu_scroll_summary", {
        ...takeScrollSummary(),
        fullscreen: isFullscreenEnvEnabled(),
      });
  } catch {}
}
//@ chunk-e6aww6q8.js:284639-284745 placement
async function flushAnalyticsSinks() {
  try {
    let { flushAnalyticsSinks } = await import("./chunk-af5wdhtv.js");
    await flushAnalyticsSinks();
  } catch {}
}
//@ chunk-e6aww6q8.js:284745-284809 fingerprint = CleanupTimeoutError (1)
class CleanupTimeoutError extends Error {
  constructor() {
    super("Cleanup timeout");
  }
}
//@ chunk-e6aww6q8.js:284809-284901 placement
function hostErrorMessageFields(e) {
  if (!e.error_message) return {};
  return {
    error_message_hash: shortHash(e.error_message),
  };
}
//@ chunk-e6aww6q8.js:284901-285029 placement
function sanitizeErrorName(e) {
  if (!e.isHostError) return e.error_name === "string" ? lit_2("string") : lit_2("non-error");
  return sanitizeClassName(e.error_name) ?? lit_2("Error");
}
//@ chunk-e6aww6q8.js:285029-285056 placement
var shutdownCoordinators = new HostScoped(() => new ShutdownCoordinator());
//@ chunk-e6aww6q8.js:285056-285085 placement
function currentShutdownCoordinator() {
  return onProcessRootHost(shutdownCoordinators);
}
//@ chunk-e6aww6q8.js:285085-285117 placement
/**
 * setupGracefulShutdown：安装信号与异常处理（init 时调用）。
 */
function setupGracefulShutdown(e) {
  currentShutdownCoordinator().install(e);
}
//@ chunk-e6aww6q8.js:285117-285158 placement = isChromeExtensionInstalledPortable (1)
function areShutdownHandlersInstalled() {
  return currentShutdownCoordinator().isInstalled();
}
//@ chunk-e6aww6q8.js:285158-285218 placement
function markPrintModeSignalHandlersRegistered() {
  currentShutdownCoordinator().markPrintModeSignalHandlersRegistered();
}
//@ chunk-e6aww6q8.js:285218-285268 placement
function markOwnsControllingTerminal() {
  currentShutdownCoordinator().markOwnsControllingTerminal();
}
//@ chunk-e6aww6q8.js:285268-285315 placement
function setCloudResumeHintLead(e) {
  currentShutdownCoordinator().setCloudResumeHintLead(e);
}
//@ chunk-e6aww6q8.js:285315-285364 placement
function markStartupActionStarted(e) {
  currentShutdownCoordinator().markStartupActionStarted(e);
}
//@ chunk-e6aww6q8.js:285364-285414 placement
function exitIfStartupNeverMounted(e) {
  currentShutdownCoordinator().exitIfStartupNeverMounted(e);
}
//@ chunk-e6aww6q8.js:285414-285477 placement = shutdown1PEventLogging (0.371)
/**
 * 退出时 flush 并关闭 1P 事件日志 provider。
 */
async function gracefulShutdown(e = 0, n = "other", r) {
  return currentShutdownCoordinator().shutdown(e, n, r);
}
//@ chunk-e6aww6q8.js:285477-285527 placement
/**
 * gracefulShutdownSync：同步退出路径。
 */
function gracefulShutdownSync(e = 0, n = "other") {
  currentShutdownCoordinator().shutdownSync(e, n);
}
//@ chunk-e6aww6q8.js:285527-285570 placement
function isShuttingDown() {
  return currentShutdownCoordinator().isShuttingDown();
}
//@ chunk-e6aww6q8.js:285570-285606 placement
function claimShutdown() {
  currentShutdownCoordinator().claimShutdown();
}
//@ chunk-e6aww6q8.js:285606-285649 placement
function releaseShutdownClaim() {
  currentShutdownCoordinator().releaseShutdownClaim();
}
//@ chunk-e6aww6q8.js:285649-285707 placement
function registerBeforeInteractiveShutdown(e) {
  currentShutdownCoordinator().registerBeforeInteractiveShutdown(e);
}
//@ chunk-e6aww6q8.js:285707-285760 placement
function clearBeforeInteractiveShutdown() {
  currentShutdownCoordinator().clearBeforeInteractiveShutdown();
}
//@ chunk-x6v6jz2y.js:2704-3042 fingerprint = cleanupTerminalModes (0.629)
/**
 * 退出时恢复终端模式：关闭鼠标/焦点报告、离开备用屏幕、卸载 Ink、排空 stdin。
 */
function cleanupTerminalModes_2() {
  if (!process.stdout.isTTY) return;
  try {
    resumeNonBlockingStdout();
    let inst = getSecondRootError().get(process.stdout);
    writeSync(1, (inst?.modes.reset("mousePixels") ?? "") + DISABLE_MOUSE_TRACKING);
    inst?.modes.reset("mouse");
    if (inst?.isAltScreenActive)
      try {
        inst.unmount();
      } catch {}
    inst?.drainStdin();
    inst?.detachForShutdown();
    restoreTerminalModes(inst?.modes ?? new TerminalModes(), (r) => writeSync(1, r));
    if (!env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE) writeSync(1, CLEAR_TERMINAL_TITLE);
  } catch {}
}
export {
  isShuttingDown,
  gracefulShutdownSync,
  gracefulShutdown,
  claimShutdown,
  flushAnalyticsSinks,
  emitExitMessage,
  areShutdownHandlersInstalled,
  markStartupActionStarted,
  cleanupTerminalModes,
  registerBeforeInteractiveShutdown,
  markPrintModeSignalHandlersRegistered,
  shutdownCoordinators,
  setupGracefulShutdown,
  cleanupTerminalModes_2,
  gracefulShutdown_2,
  markOwnsControllingTerminal,
  emitScrollTelemetrySummary,
  protoDataString,
};
