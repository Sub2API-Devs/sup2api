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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:244110-244207 fingerprint (2.1.88 match: gracefulShutdown, 0.464)
function gracefulShutdown_2(scope, lastRequestId) {
  if (!lastRequestId) return;
  logEvent("tengu_cache_eviction_hint", {
    scope: fromEnum(scope),
    last_request_id: sanitizeMarkName(lastRequestId),
  });
}
//@ chunk-e6aww6q8.js:270819-270864 placement
function cleanupTerminalModes() {
  getTerminalHooks()?.cleanupTerminalModes();
}
//@ chunk-e6aww6q8.js:270864-270916 placement
function emitExitMessage(message) {
  try {
    cleanupTerminalModes();
    writeSync(
      2,
      `
${stripControlChars_3(message)}
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
function writeShutdownNotice(message) {
  try {
    writeSync(
      2,
      `${stripControlChars_3(message)}
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
        let remoteCaps = getIsRemoteMode() ? getRemoteCaps() : null;
        let repoSlug =
          remoteCaps?.sessionId !== undefined && !remoteCaps.viewerOnly
            ? extractRepoSlug(toCompatSessionId(remoteCaps.sessionId))
            : null;
        if (repoSlug !== null) {
          let stderrIsTty = process.stderr.isTTY === true;
          let notInWorktree = !hasBeenInWorktree();
          writeSync(
            1,
            sequential.dim(`
${this.cloudHintLead?.() ?? `${resumeHintPrefix()}Resume this session with:`}
claude --cloud ${repoSlug}
`),
          );
          this.resumeHintPrinted = true;
          if (stderrIsTty && notInWorktree) noopContainerCleanup(repoSlug);
          return;
        }
      } catch {}
    if (process.stdout.isTTY && getIsInteractive() && !isSessionPersistenceDisabled())
      try {
        let sessionId = getSessionId();
        if (!sessionIdExists(sessionId)) return;
        let worktreeName = this.resumeHintOmitsWorktree ? null : getResumeHintWorktreeName();
        let { advice, command, arg, worktree } = worktreeResumeHint({
          sessionId,
          worktree: worktreeName
            ? {
                name: worktreeName,
                recordCleared: getCurrentWorktreeSession() === null,
              }
            : undefined,
          columns: process.stdout.columns,
          envAssignment: undefined,
        });
        let extraLines = [];
        writeSync(
          1,
          sequential.dim(
            ["", ...extraLines, ...advice, "Resume this session with:", command, ""].join(`
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
  forceExit(exitCode) {
    if (this.failsafeTimer !== undefined) {
      clearTimeout(this.failsafeTimer);
      this.failsafeTimer = undefined;
      this.failsafeFiresAtMs = undefined;
    }
    try {
      getTerminalHooks()?.drainStdin();
    } catch {}
    try {
      process.exit(exitCode);
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
      let signalInfo = {
        uptime_s: Math.round(process.uptime()),
        ppid_changed: process.ppid !== ppid,
        stdin_at_eof: process.stdin.readableEnded,
        stdin_destroyed: process.stdin.destroyed,
        is_tty: process.stdin.isTTY ?? false,
      };
      logForDiagnosticsNoPII("info", "shutdown_signal", {
        signal: "SIGTERM",
        ...signalInfo,
      });
      logEvent("tengu_shutdown_signal", {
        signal: lit_2("SIGTERM"),
        ...signalInfo,
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
    registerProcessIOErrorHandlers((signalName, codePart) => {
      if (!getIsInteractive()) return;
      logForDiagnosticsNoPII("info", "shutdown_signal", {
        signal: `${signalName}_${codePart}`,
      });
      markStdoutDrainExternallyClocked();
      this.shutdown(0);
    });
    process.on("uncaughtException", (error) => {
      if (this.uncaughtBreakerTripped) return;
      let serialized = serializeShutdownError(error);
      let recovered =
        serialized.isHostError &&
        isHttp2TransportError(error) &&
        this.recordHttp2RecoveryAndCheckBudget(Date.now());
      logForDiagnosticsNoPII("error", "uncaught_exception", {
        ...serialized,
        recovered,
      });
      let errorFields = serialized.isHostError
        ? errorTelemetryFields(error)
        : hostErrorMessageFields(serialized);
      logEvent("tengu_uncaught_exception", {
        error_name: sanitizeErrorName(serialized),
        ...errorFields,
        ...(recovered && {
          recovered,
        }),
      });
      if (serialized.isHostError) {
        if (!recovered) trackError(error, "uncaught_exception");
        else if (this.recoveredDdReportCount < RECOVERED_DD_REPORT_CAP) {
          this.recoveredDdReportCount++;
          trackError(error, "uncaught_exception_recovered");
        }
      }
      if (recovered) {
        logForDebugging(
          `Recovered HTTP/2 stream-teardown uncaught exception (${serialized.error_name}) \u2014 transport throttle, keeping the process alive`,
          {
            level: "error",
          },
        );
        this.scheduleStartupMountWatchdog(serialized.error_message ?? serialized.error_name);
        return;
      }
      if (isSupervisedMode()) {
        this.uncaughtBreakerTripped = true;
        logForDebugging(
          `Uncaught exception under CLAUDE_CODE_SUPERVISED \u2014 exiting ${EX_SOFTWARE}: ${serialized.error_name}`,
          {
            level: "error",
          },
        );
        if (isBgSession() && !this.isShuttingDown()) recordBgExitCause("uncaught:" + serialized.error_name);
        this.shutdown(EX_SOFTWARE);
        return;
      }
      let breakerTripped = this.recordUncaughtAndCheckBreaker(Date.now());
      if (this.recentUncaught.length < RECENT_UNCAUGHT_KEEP || breakerTripped)
        this.recentUncaught.push({
          name: serialized.error_name,
          message: (serialized.error_message ?? "").slice(0, 200),
          topFrame: errorFields.error_top_frame,
        });
      if (breakerTripped) {
        logEvent("tengu_uncaught_exception_loop", {
          count: this.uncaughtCount,
          window_ms: UNCAUGHT_WINDOW_MS,
          error_name: sanitizeErrorName(serialized),
          error_message_hash: errorFields.error_message_hash,
        });
        cleanupTerminalModes();
        try {
          for (let recent of this.recentUncaught)
            writeSync(
              2,
              `Uncaught exception (loop): ${recent.name}: ${recent.message}${recent.topFrame ? ` at ${recent.topFrame}` : ""}
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
        recordBgExitCause("uncaught:" + serialized.error_name);
        this.shutdown(1);
        return;
      }
      this.scheduleStartupMountWatchdog(serialized.error_message ?? serialized.error_name);
    });
    process.on("unhandledRejection", (reason, promise) => {
      if (this.uncaughtBreakerTripped) return;
      let pendingWriteLine = findPendingWriteLine(reason, promise);
      if (pendingWriteLine !== undefined) {
        logForDebugging(pendingWriteLine);
        return;
      }
      let serialized = serializeShutdownError(reason);
      if (this.shutdownInProgress && serialized.isHostError && isMcpConnectionClosed(reason)) {
        logForDebugging(`Swallowed MCP ConnectionClosed during shutdown: ${errorMessage(reason)}`);
        return;
      }
      logForDiagnosticsNoPII("error", "unhandled_rejection", serialized);
      logEvent("tengu_unhandled_rejection", {
        error_name: sanitizeErrorName(serialized),
        ...(serialized.isHostError ? errorTelemetryFields(reason) : hostErrorMessageFields(serialized)),
      });
      let isServerReset = serialized.isHostError && isHttpServerConnReset(reason);
      if (serialized.isHostError && !isServerReset) trackError(reason, "unhandled_rejection");
      if (serialized.isHostError && isAbortError(reason)) {
        logForDebugging("Swallowed unhandled AbortError rejection (not exiting bg/supervised worker)");
        return;
      }
      if (isServerReset) {
        logForDebugging(
          "Swallowed unhandled http.Server ECONNRESET rejection (not exiting bg/supervised worker)",
        );
        return;
      }
      if (isSupervisedMode()) {
        this.uncaughtBreakerTripped = true;
        logForDebugging(
          `Unhandled rejection under CLAUDE_CODE_SUPERVISED \u2014 exiting ${EX_SOFTWARE}: ${serialized.error_name}`,
          {
            level: "error",
          },
        );
        if (isBgSession() && !this.isShuttingDown()) recordBgExitCause("unhandled:" + serialized.error_name);
        this.shutdown(EX_SOFTWARE);
        return;
      }
      if (isBgSession() && !this.isShuttingDown()) {
        recordBgExitCause("unhandled:" + serialized.error_name);
        this.shutdown(1);
        return;
      }
      this.scheduleStartupMountWatchdog(serialized.error_message ?? serialized.error_name);
    });
  }
  shutdownSync(exitCode = 0, reason = "other") {
    if (!this.shutdownInProgress) {
      process.exitCode = exitCode;
      latchTerminalShutdown();
    }
    this.pendingShutdown = this.shutdown(exitCode, reason)
      .catch(async (error) => {
        logForDebugging(`Graceful shutdown failed: ${error}`, {
          level: "error",
        });
        cleanupTerminalModes();
        this.printResumeHint();
        await this.armFailsafeAndDrainStdout(exitCode);
        this.forceExit(exitCode);
      })
      .catch(() => {});
  }
  recordUncaughtAndCheckBreaker(nowMs) {
    if (this.uncaughtBreakerTripped) return false;
    if (nowMs - this.uncaughtWindowStart > UNCAUGHT_WINDOW_MS) {
      this.uncaughtCount = 0;
      this.uncaughtWindowStart = nowMs;
      this.recentUncaught = [];
    }
    this.uncaughtCount++;
    if (this.uncaughtCount >= MAX_UNCAUGHT_BEFORE_FORCED_EXIT) {
      this.uncaughtBreakerTripped = true;
      return true;
    }
    return false;
  }
  recordHttp2RecoveryAndCheckBudget(nowMs) {
    if (nowMs - this.http2RecoveryWindowStart > HTTP2_RECOVERY_WINDOW_MS) {
      this.http2RecoveryCount = 0;
      this.http2RecoveryWindowStart = nowMs;
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
  exitIfStartupNeverMounted(detail) {
    if (isUiMounted() || this.inNonUiSubcommand() || this.isShuttingDown()) return;
    try {
      writeSync(
        2,
        `Claude Code could not start: ${detail ?? "<unknown>"}
`,
      );
    } catch {}
    this.shutdown(1);
  }
  scheduleStartupMountWatchdog(detail) {
    if (!getIsInteractive() || isUiMounted() || this.inNonUiSubcommand() || this.isShuttingDown()) return;
    setTimeout((detail) => this.exitIfStartupNeverMounted(detail), STARTUP_MOUNT_GRACE_MS, detail).unref();
  }
  armShutdownFailsafe(delayMs, exitCode) {
    if (this.failsafeTimer !== undefined) clearTimeout(this.failsafeTimer);
    this.failsafeFiresAtMs = Date.now() + delayMs;
    this.failsafeTimer = setTimeout(
      (exitCode) => {
        cleanupTerminalModes();
        this.printResumeHint();
        drainStdoutBeforeExit(500, {
          scaleBudgetToQueue: false,
        })
          .then(() => this.forceExit(exitCode))
          .catch(() => {});
      },
      delayMs,
      exitCode,
    );
  }
  async removeWorktreeAtExit(removal, exitCode, extraMs) {
    let budgetMs = removal.budgetMs ?? DEFAULT_CLEANUP_BUDGET_MS;
    if (this.failsafeFiresAtMs !== undefined)
      this.armShutdownFailsafe(Math.max(this.failsafeFiresAtMs - Date.now(), budgetMs + extraMs), exitCode);
    writeShutdownNotice("Removing worktree\u2026");
    let partialNote = "it may be partly deleted. Delete the folder if you no longer need it.";
    if (!this.worktreeRemovalSignalsInstalled) {
      this.worktreeRemovalSignalsInstalled = true;
      process.on("SIGINT", () => this.interruptWorktreeRemoval?.());
      process.on("SIGTERM", () => this.interruptWorktreeRemoval?.());
      process.on("SIGHUP", () => {
        let daemonIgnoresHangup = env.CLAUDE_BG_BACKEND === "daemon" && !this.ownsControllingTerminal;
        if (!this.worktreeRemovalIgnoresHangup && !daemonIgnoresHangup) this.interruptWorktreeRemoval?.();
      });
    }
    this.worktreeRemovalIgnoresHangup = removal.ignoresHangup === true;
    let promise = new Promise((resolve) => {
      this.interruptWorktreeRemoval = () =>
        resolve({
          line: `Stopped waiting for the removal of the worktree at ${removal.path}; ${partialNote}`,
        });
    });
    let rounded = Math.round(budgetMs / 60000);
    let outcome;
    try {
      outcome = await withDeadline(
        Promise.race([
          Promise.resolve()
            .then(() => removal.run())
            .then(
              (line) => ({
                line,
              }),
              (error) => {
                logError(error);
                return {
                  line: `Could not finish removing the worktree at ${removal.path}; ${partialNote}`,
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
      outcome?.line ??
        `Removing the worktree at ${removal.path} did not finish within ${budgetMs >= 60000 ? `${rounded} ${rounded === 1 ? "minute" : "minutes"}` : `${Math.round(budgetMs / 1000)} seconds`}; ${partialNote}`,
    );
    if (this.failsafeFiresAtMs !== undefined) this.armShutdownFailsafe(extraMs, exitCode);
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
  async shutdown(exitCode = 0, reason = "other", options) {
    if (this.shutdownInProgress) {
      if (options?.removeWorktree && options.removeWorktree !== this.worktreeRemoval)
        logForDebugging(`Worktree ${options.removeWorktree.path} kept: a shutdown was already under way`, {
          level: "warn",
        });
      return;
    }
    this.shutdownInProgress = true;
    latchTerminalShutdown();
    process.exitCode = exitCode;
    if (options?.suppressResumeHint) this.resumeHintPrinted = true;
    this.resumeHintOmitsWorktree = options?.removeWorktree !== undefined;
    this.worktreeRemoval = options?.removeWorktree;
    let { executeSessionEndHooks, getSessionEndHookTimeoutMs, SESSION_END_HOOK_TIMEOUT_MS_DEFAULT } =
      await import("./hooks.lazy.js");
    let hookTimeoutMs;
    try {
      hookTimeoutMs = getSessionEndHookTimeoutMs();
    } catch {
      hookTimeoutMs = SESSION_END_HOOK_TIMEOUT_MS_DEFAULT;
    }
    this.armShutdownFailsafe(Math.max(5000, hookTimeoutMs + 5000), exitCode);
    cleanupTerminalModes();
    this.printResumeHint();
    let cleanupTimer;
    try {
      let cleanupPromise = (async () => {
        try {
          await runCleanups();
        } catch {}
      })();
      await Promise.race([
        cleanupPromise,
        new Promise((resolve, reject) => {
          cleanupTimer = setTimeout(
            (reject) => reject(new CleanupTimeoutError()),
            CLEANUP_TIMEOUT_MS,
            reject,
          );
        }),
      ]);
      clearTimeout(cleanupTimer);
    } catch {
      clearTimeout(cleanupTimer);
    }
    if (hasPendingWrites())
      this.armShutdownFailsafe(Math.max(EXIT_HANDOFF_FAILSAFE_MS, hookTimeoutMs + 5000), exitCode);
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
    if (options?.removeWorktree)
      await this.removeWorktreeAtExit(options.removeWorktree, exitCode, Math.max(5000, hookTimeoutMs + 5000));
    try {
      if (!isUnclaimedSpare())
        await executeSessionEndHooks(getSessionIdentity(), reason, {
          signal: AbortSignal.timeout(hookTimeoutMs),
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
      let flushWaitMs = maxPreExitFlushWaitMs();
      if (flushWaitMs > 0) {
        this.widenFailsafeBy(flushWaitMs, exitCode);
        await withDeadline(drainPreExitFlushes_2(), flushWaitMs);
      }
    } catch {}
    let noHeldRefresh = await this.waitForHeldOAuthRefresh(exitCode);
    await drainRegisteredWriteQueues();
    await flushAnalyticsSinks();
    if (noHeldRefresh && waitForOAuthRefreshLocksReleased() !== null) {
      await this.waitForHeldOAuthRefresh(exitCode);
      await drainRegisteredWriteQueues();
    }
    if (options?.finalMessage)
      try {
        writeSync(
          2,
          options.finalMessage +
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
      this.widenFailsafeBy(maxPreExitFlushWaitMs(), exitCode);
      await drainPreExitFlushes();
    } catch {}
    await this.armFailsafeAndDrainStdout(exitCode);
    this.forceExit(exitCode);
  }
  widenFailsafeBy(extraMs, exitCode) {
    if (extraMs > 0 && this.failsafeFiresAtMs !== undefined)
      this.armShutdownFailsafe(Math.max(0, this.failsafeFiresAtMs - Date.now()) + extraMs, exitCode);
  }
  async armFailsafeAndDrainStdout(exitCode) {
    this.armShutdownFailsafe(getStdoutDrainBudgetMs() + STDOUT_DRAIN_EXTRA_MS, exitCode);
    await drainStdoutBeforeExit();
  }
  async waitForHeldOAuthRefresh(exitCode) {
    if (waitForOAuthRefreshLocksReleased() === null) return true;
    if (this.failsafeFiresAtMs !== undefined)
      this.armShutdownFailsafe(
        Math.max(0, this.failsafeFiresAtMs - Date.now()) + OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
        exitCode,
      );
    return waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
  }
}
//@ chunk-e6aww6q8.js:283131-283872 placement
function serializeShutdownError(error) {
  let untrusted = isUntrustedObject(error);
  if (!(!untrusted && error instanceof Error)) {
    if (typeof error === "string")
      return {
        error_name: "string",
        error_message: redactSecrets(error).slice(0, 2000),
        isHostError: false,
      };
    let namePart = untrusted ? ownDataString(error, "name") : protoDataString(error, "name");
    let messagePart = ownDataString(error, "message");
    let parts = [];
    if (namePart !== undefined) parts.push(namePart);
    if (messagePart !== undefined) parts.push(messagePart);
    let errorMessage = parts.length > 0 ? redactSecrets(parts.join(": ")).slice(0, 2000) : undefined;
    let stackPart = types.isNativeError(error) ? undefined : ownDataString(error, "stack");
    return {
      error_name: "non-error",
      error_message: errorMessage,
      error_stack: stackPart !== undefined ? redactSecrets(stackPart).slice(0, 4000) : undefined,
      isHostError: false,
    };
  }
  let errorObject = error;
  let name;
  let message;
  let stack;
  try {
    name = errorObject.name;
  } catch {}
  try {
    message = errorObject.message;
  } catch {}
  try {
    stack = errorObject.stack;
  } catch {}
  return {
    error_name: typeof name === "string" ? name : "Error",
    error_message: typeof message === "string" ? redactSecrets(message).slice(0, 2000) : undefined,
    error_stack: typeof stack === "string" ? redactSecrets(stack).slice(0, 4000) : undefined,
    isHostError: true,
  };
}
//@ chunk-e6aww6q8.js:283872-284072 placement
function ownDataString(object, key) {
  if (object === null || typeof object !== "object") return;
  if (isUntrustedObject_2(object)) return;
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(object, key);
  } catch {
    return;
  }
  return descriptor && "value" in descriptor && typeof descriptor.value === "string"
    ? descriptor.value
    : undefined;
}
//@ chunk-e6aww6q8.js:284072-284338 placement
function protoDataString(object, key) {
  if (object === null || typeof object !== "object") return;
  let current = object;
  for (let idx = 0; idx < 128; idx++) {
    if (current === null) return;
    if (isUntrustedObject_2(current)) return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(current, key);
    if (ownPropertyDescriptor)
      return "value" in ownPropertyDescriptor && typeof ownPropertyDescriptor.value === "string"
        ? ownPropertyDescriptor.value
        : undefined;
    current = Object.getPrototypeOf(current);
  }
  return;
}
//@ chunk-e6aww6q8.js:284338-284544 placement
function isMcpConnectionClosed(error) {
  try {
    if (!(error instanceof Error)) return false;
    let code = error.code;
    return (
      (error.name === "McpError" && code === -32000) ||
      (error.name === "SdkError" && code === "CONNECTION_CLOSED") ||
      (error.name === "ProtocolError" && code === -32000)
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
    let { flushAnalyticsSinks } = await import("../services/analytics/flushSinks.js");
    await flushAnalyticsSinks();
  } catch {}
}
//@ chunk-e6aww6q8.js:284745-284809 fingerprint (2.1.88 match: CleanupTimeoutError, 1)
class CleanupTimeoutError extends Error {
  constructor() {
    super("Cleanup timeout");
  }
}
//@ chunk-e6aww6q8.js:284809-284901 placement
function hostErrorMessageFields(serialized) {
  if (!serialized.error_message) return {};
  return {
    error_message_hash: shortHash(serialized.error_message),
  };
}
//@ chunk-e6aww6q8.js:284901-285029 placement
function sanitizeErrorName(serialized) {
  if (!serialized.isHostError)
    return serialized.error_name === "string" ? lit_2("string") : lit_2("non-error");
  return sanitizeClassName(serialized.error_name) ?? lit_2("Error");
}
//@ chunk-e6aww6q8.js:285029-285056 placement
var shutdownCoordinators; // deferred: uses ShutdownCoordinator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:285029", () => {
  shutdownCoordinators = new HostScoped(() => new ShutdownCoordinator());
});
//@ chunk-e6aww6q8.js:285056-285085 placement
function currentShutdownCoordinator() {
  return onProcessRootHost(shutdownCoordinators);
}
//@ chunk-e6aww6q8.js:285085-285117 placement
/**
 * setupGracefulShutdown：安装信号与异常处理（init 时调用）。
 */
function setupGracefulShutdown(handles) {
  currentShutdownCoordinator().install(handles);
}
//@ chunk-e6aww6q8.js:285117-285158 placement (2.1.88 match: isChromeExtensionInstalledPortable, 1)
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
function setCloudResumeHintLead(lead) {
  currentShutdownCoordinator().setCloudResumeHintLead(lead);
}
//@ chunk-e6aww6q8.js:285315-285364 placement
function markStartupActionStarted(expectsUiMount) {
  currentShutdownCoordinator().markStartupActionStarted(expectsUiMount);
}
//@ chunk-e6aww6q8.js:285364-285414 placement
function exitIfStartupNeverMounted(detail) {
  currentShutdownCoordinator().exitIfStartupNeverMounted(detail);
}
//@ chunk-e6aww6q8.js:285414-285477 placement (2.1.88 match: shutdown1PEventLogging, 0.371)
/**
 * 退出时 flush 并关闭 1P 事件日志 provider。
 */
async function gracefulShutdown(exitCode = 0, reason = "other", options) {
  return currentShutdownCoordinator().shutdown(exitCode, reason, options);
}
//@ chunk-e6aww6q8.js:285477-285527 placement
/**
 * gracefulShutdownSync：同步退出路径。
 */
function gracefulShutdownSync(exitCode = 0, reason = "other") {
  currentShutdownCoordinator().shutdownSync(exitCode, reason);
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
function registerBeforeInteractiveShutdown(fn) {
  currentShutdownCoordinator().registerBeforeInteractiveShutdown(fn);
}
//@ chunk-e6aww6q8.js:285707-285760 placement
function clearBeforeInteractiveShutdown() {
  currentShutdownCoordinator().clearBeforeInteractiveShutdown();
}
//@ chunk-x6v6jz2y.js:2704-3042 fingerprint (2.1.88 match: cleanupTerminalModes, 0.629)
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
    restoreTerminalModes(inst?.modes ?? new TerminalModes(), (output) => writeSync(1, output));
    if (!env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE) writeSync(1, CLEAR_TERMINAL_TITLE);
  } catch {}
}
export {
  isShuttingDown,
  gracefulShutdownSync,
  gracefulShutdown,
  flushAnalyticsSinks,
  areShutdownHandlersInstalled,
  markStartupActionStarted,
  claimShutdown,
  emitExitMessage,
  cleanupTerminalModes,
  registerBeforeInteractiveShutdown,
  markPrintModeSignalHandlersRegistered,
  shutdownCoordinators,
  setupGracefulShutdown,
  gracefulShutdown_2,
  markOwnsControllingTerminal,
  emitScrollTelemetrySummary,
  protoDataString,
  cleanupTerminalModes_2,
  EXIT_HANDOFF_FAILSAFE_MS,
  HTTP2_RECOVERY_CAP,
  HTTP2_RECOVERY_WINDOW_MS,
  RECOVERED_DD_REPORT_CAP,
  STARTUP_MOUNT_GRACE_MS,
  ShutdownCoordinator,
  clearBeforeInteractiveShutdown,
  exitIfStartupNeverMounted,
  isMcpConnectionClosed,
  ownDataString,
  releaseShutdownClaim,
  setCloudResumeHintLead,
};
