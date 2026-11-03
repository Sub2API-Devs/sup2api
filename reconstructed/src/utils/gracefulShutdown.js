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
import { writeSync, writeSync as writeSync_2, writeSync as writeSync_3 } from "fs";
import { types } from "util";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { ye } from "./startupMarks.js";
import { nKo, oZn, di } from "../ink/terminal.js";
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
import { Jn } from "../remote/remoteMode.js";
import { extractRepoSlug } from "../cli/eagerFlags.js";
import { toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { oTi, rTi, isBgSession } from "./concurrentSessions.js";
import { sequential } from "./sequential.js";
import { HRt, nce, LRt, FRt, $Rt, getSessionIdentity, n0e } from "./shutdown/pendingWrites.js";
import { OAt } from "./teleport/containerSync.js";
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
import { uOt } from "./exitCodes.js";
import { errorMessage, isHttpServerConnReset, isAbortError, sanitizeClassName } from "./errors.js";
import { latchTerminalShutdown } from "./terminalShutdown.js";
import { withDeadline } from "./sleep.js";
import { logError } from "./log.js";
import { runCleanups, CLEANUP_TIMEOUT_MS, J_s, drainPreExitFlushes, zwr } from "./cleanupRegistry.js";
import { f3n, rjt } from "./ShellCommand.js";
import { killPendingEscalations } from "./agentProcessRegistry.js";
import { profileReport } from "./startupProfiler.js";
import { u3n } from "../services/api/cacheKeepalive.js";
import {
  waitForOAuthRefreshLocksReleased,
  OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
  waitForInFlightOAuthRefresh,
} from "./auth.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { Pf } from "./untrustedValues.js";
import { hasScrollActivity, takeScrollSummary } from "./scrollTelemetry.js";
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { gn } from "./shortHash.js";
import { HostScoped } from "./hostScoped.js";
import { resumeNonBlockingStdout } from "../ink/nonBlockingStdout.js";
import { DISABLE_MOUSE_TRACKING } from "../ink/termio/dec.js";
import { restoreTerminalModes } from "../ink/ink.js";
import { TerminalModes } from "../ink/terminalModes.js";
import { CLEAR_TERMINAL_TITLE } from "../ink/termio/osc.js";

//@ chunk-e6aww6q8.js:244110-244207 fingerprint = gracefulShutdown (0.464)
function gracefulShutdown_2(e, n) {
  if (!n) return;
  logEvent("tengu_cache_eviction_hint", { scope: fromEnum(e), last_request_id: ye(n) });
}
//@ chunk-e6aww6q8.js:270819-270864 placement
function cleanupTerminalModes() {
  nKo()?.cleanupTerminalModes();
}
//@ chunk-e6aww6q8.js:270864-270916 placement
function emitExitMessage(e) {
  try {
    (cleanupTerminalModes(),
      writeSync_2(
        2,
        `
${stripControlChars_3(e)}
`,
      ));
  } catch {}
}
//@ chunk-e6aww6q8.js:270916-271004 placement
var Uco = 10,
  hHe = 5000,
  jco = 3,
  HTTP2_RECOVERY_CAP = 50,
  HTTP2_RECOVERY_WINDOW_MS = 60000,
  RECOVERED_DD_REPORT_CAP = 10,
  STARTUP_MOUNT_GRACE_MS = 1e4,
  EXIT_HANDOFF_FAILSAFE_MS = 15000,
  Wco = 1500,
  Gco = 600000;
//@ chunk-e6aww6q8.js:271004-271050 placement
function DAt(e) {
  try {
    writeSync_2(
      2,
      `${stripControlChars_3(e)}
`,
    );
  } catch {}
}
/**
 * ShutdownCoordinator：进程唯一的退出协调者。install 注册 SIGINT/SIGTERM/SIGHUP、uncaughtException、unhandledRejection；shutdown 依次：恢复终端、打印 resume 提示、运行清理回调（有超时）、SessionEnd 钩子、flush 分析与遥测、等 OAuth 刷新、排空 stdout，最后强制退出（带 failsafe 定时器）。
 */
//@ chunk-e6aww6q8.js:271050-283131 placement
class ShutdownCoordinator {
  installed = !1;
  handles = {};
  resumeHintPrinted = !1;
  cloudHintLead;
  resumeHintOmitsWorktree = !1;
  worktreeRemoval = void 0;
  interruptWorktreeRemoval = void 0;
  worktreeRemovalIgnoresHangup = !1;
  worktreeRemovalSignalsInstalled = !1;
  printModeSignalHandlersRegistered = !1;
  ownsControllingTerminal = !1;
  uncaughtCount = 0;
  uncaughtWindowStart = 0;
  uncaughtBreakerTripped = !1;
  recentUncaught = [];
  http2RecoveryCount = 0;
  http2RecoveryWindowStart = 0;
  recoveredDdReportCount = 0;
  startupActionStarted = !1;
  startupExpectsUiMount = !1;
  shutdownInProgress = !1;
  failsafeTimer = void 0;
  failsafeFiresAtMs = void 0;
  orphanCheckInterval = void 0;
  pendingShutdown = void 0;
  beforeInteractiveShutdown = null;
  printResumeHint() {
    if (this.resumeHintPrinted) return;
    if (process.stdout.isTTY && getIsInteractive())
      try {
        let e = getIsRemoteMode() ? Jn() : null,
          n =
            e?.sessionId !== void 0 && !e.viewerOnly ? extractRepoSlug(toCompatSessionId(e.sessionId)) : null;
        if (n !== null) {
          let r = process.stderr.isTTY === !0,
            s = !oTi();
          if (
            (writeSync_2(
              1,
              sequential.dim(`
${this.cloudHintLead?.() ?? `${HRt()}Resume this session with:`}
claude --cloud ${n}
`),
            ),
            (this.resumeHintPrinted = !0),
            r && s)
          )
            OAt(n);
          return;
        }
      } catch {}
    if (process.stdout.isTTY && getIsInteractive() && !isSessionPersistenceDisabled())
      try {
        let e = getSessionId();
        if (!sessionIdExists(e)) return;
        let n = this.resumeHintOmitsWorktree ? null : rTi(),
          {
            advice: advice,
            command: command,
            arg: arg,
            worktree: worktree,
          } = worktreeResumeHint({
            sessionId: e,
            worktree: n ? { name: n, recordCleared: getCurrentWorktreeSession() === null } : void 0,
            columns: process.stdout.columns,
            envAssignment: void 0,
          }),
          S = [];
        (writeSync_2(
          1,
          sequential.dim(
            ["", ...S, ...advice, "Resume this session with:", command, ""].join(`
`),
          ),
        ),
          (this.resumeHintPrinted = !0),
          logEvent("tengu_resume_hint_printed", {
            arg: fromEnum(arg),
            title: fromEnum(getCurrentSessionTitle(e) ? "left_out" : "absent"),
            worktree: fromEnum(worktree),
            advice: advice.length > 0,
          }));
      } catch {}
  }
  forceExit(e) {
    if (this.failsafeTimer !== void 0)
      (clearTimeout(this.failsafeTimer), (this.failsafeTimer = void 0), (this.failsafeFiresAtMs = void 0));
    try {
      nKo()?.drainStdin();
    } catch {}
    try {
      process.exit(e);
    } catch (error) {
      process.kill(process.pid, "SIGKILL");
    }
    throw Error("unreachable");
  }
  markPrintModeSignalHandlersRegistered() {
    this.printModeSignalHandlersRegistered = !0;
  }
  setCloudResumeHintLead(e) {
    this.cloudHintLead = e;
  }
  markOwnsControllingTerminal() {
    this.ownsControllingTerminal = !0;
  }
  isInstalled() {
    return this.installed;
  }
  install(e = {}) {
    if (this.installed) return;
    ((this.installed = !0), (this.handles = e), onExit(() => {}));
    let ppid = process.ppid;
    if (
      (process.on("SIGINT", () => {
        if (this.printModeSignalHandlersRegistered) return;
        (logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "SIGINT" }),
          markStdoutDrainExternallyClocked(),
          this.shutdown(0));
      }),
      process.on("SIGTERM", () => {
        let r = {
          uptime_s: Math.round(process.uptime()),
          ppid_changed: process.ppid !== ppid,
          stdin_at_eof: process.stdin.readableEnded,
          stdin_destroyed: process.stdin.destroyed,
          is_tty: process.stdin.isTTY ?? !1,
        };
        if (
          (logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "SIGTERM", ...r }),
          logEvent("tengu_shutdown_signal", { signal: lit_2("SIGTERM"), ...r }),
          markStdoutDrainExternallyClocked(),
          this.printModeSignalHandlersRegistered)
        )
          return;
        this.shutdown(143);
      }),
      env.CLAUDE_BG_BACKEND === "daemon")
    )
      process.on("SIGHUP", () => {
        if (this.ownsControllingTerminal) {
          (logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "SIGHUP", bg_ctty: !0 }),
            markStdoutDrainExternallyClocked(),
            this.shutdown(129));
          return;
        }
        logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "SIGHUP_ignored_bg" });
      });
    else
      (process.on("SIGHUP", () => {
        (logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "SIGHUP" }),
          markStdoutDrainExternallyClocked(),
          this.shutdown(129));
      }),
        this.armOrphanCheck());
    (registerProcessIOErrorHandlers((r, s) => {
      if (!getIsInteractive()) return;
      (logForDiagnosticsNoPII("info", "shutdown_signal", { signal: `${r}_${s}` }),
        markStdoutDrainExternallyClocked(),
        this.shutdown(0));
    }),
      process.on("uncaughtException", (r) => {
        if (this.uncaughtBreakerTripped) return;
        let s = serializeShutdownError(r),
          h = s.isHostError && isHttp2TransportError(r) && this.recordHttp2RecoveryAndCheckBudget(Date.now());
        logForDiagnosticsNoPII("error", "uncaught_exception", { ...s, recovered: h });
        let y = s.isHostError ? errorTelemetryFields(r) : NAt(s);
        if (
          (logEvent("tengu_uncaught_exception", {
            error_name: sanitizeErrorName(s),
            ...y,
            ...(h && { recovered: h }),
          }),
          s.isHostError)
        ) {
          if (!h) trackError(r, "uncaught_exception");
          else if (this.recoveredDdReportCount < RECOVERED_DD_REPORT_CAP)
            (this.recoveredDdReportCount++, trackError(r, "uncaught_exception_recovered"));
        }
        if (h) {
          (logForDebugging(
            `Recovered HTTP/2 stream-teardown uncaught exception (${s.error_name}) \u2014 transport throttle, keeping the process alive`,
            { level: "error" },
          ),
            this.scheduleStartupMountWatchdog(s.error_message ?? s.error_name));
          return;
        }
        if (isSupervisedMode()) {
          if (
            ((this.uncaughtBreakerTripped = !0),
            logForDebugging(
              `Uncaught exception under CLAUDE_CODE_SUPERVISED \u2014 exiting ${uOt}: ${s.error_name}`,
              { level: "error" },
            ),
            isBgSession() && !this.isShuttingDown())
          )
            nce("uncaught:" + s.error_name);
          this.shutdown(uOt);
          return;
        }
        let recordUncaughtAndCheckBreaker = this.recordUncaughtAndCheckBreaker(Date.now());
        if (this.recentUncaught.length < jco || recordUncaughtAndCheckBreaker)
          this.recentUncaught.push({
            name: s.error_name,
            message: (s.error_message ?? "").slice(0, 200),
            topFrame: y.error_top_frame,
          });
        if (recordUncaughtAndCheckBreaker) {
          (logEvent("tengu_uncaught_exception_loop", {
            count: this.uncaughtCount,
            window_ms: hHe,
            error_name: sanitizeErrorName(s),
            error_message_hash: y.error_message_hash,
          }),
            cleanupTerminalModes());
          try {
            for (let w of this.recentUncaught)
              writeSync_2(
                2,
                `Uncaught exception (loop): ${w.name}: ${w.message}${w.topFrame ? ` at ${w.topFrame}` : ""}
`,
              );
            writeSync_2(
              2,
              `Uncaught exception loop detected (${this.uncaughtCount} in ${hHe}ms) \u2014 forcing shutdown
`,
            );
          } catch {}
          this.shutdown(1);
          return;
        }
        if (isBgSession() && !this.isShuttingDown()) {
          (nce("uncaught:" + s.error_name), this.shutdown(1));
          return;
        }
        this.scheduleStartupMountWatchdog(s.error_message ?? s.error_name);
      }),
      process.on("unhandledRejection", (r, s) => {
        if (this.uncaughtBreakerTripped) return;
        let h = LRt(r, s);
        if (h !== void 0) {
          logForDebugging(h);
          return;
        }
        let y = serializeShutdownError(r);
        if (this.shutdownInProgress && y.isHostError && isMcpConnectionClosed(r)) {
          logForDebugging(`Swallowed MCP ConnectionClosed during shutdown: ${errorMessage(r)}`);
          return;
        }
        (logForDiagnosticsNoPII("error", "unhandled_rejection", y),
          logEvent("tengu_unhandled_rejection", {
            error_name: sanitizeErrorName(y),
            ...(y.isHostError ? errorTelemetryFields(r) : NAt(y)),
          }));
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
          if (
            ((this.uncaughtBreakerTripped = !0),
            logForDebugging(
              `Unhandled rejection under CLAUDE_CODE_SUPERVISED \u2014 exiting ${uOt}: ${y.error_name}`,
              { level: "error" },
            ),
            isBgSession() && !this.isShuttingDown())
          )
            nce("unhandled:" + y.error_name);
          this.shutdown(uOt);
          return;
        }
        if (isBgSession() && !this.isShuttingDown()) {
          (nce("unhandled:" + y.error_name), this.shutdown(1));
          return;
        }
        this.scheduleStartupMountWatchdog(y.error_message ?? y.error_name);
      }));
  }
  shutdownSync(e = 0, n = "other") {
    if (!this.shutdownInProgress) ((process.exitCode = e), latchTerminalShutdown());
    this.pendingShutdown = this.shutdown(e, n)
      .catch(async (r) => {
        (logForDebugging(`Graceful shutdown failed: ${r}`, { level: "error" }),
          cleanupTerminalModes(),
          this.printResumeHint(),
          await this.armFailsafeAndDrainStdout(e),
          this.forceExit(e));
      })
      .catch(() => {});
  }
  recordUncaughtAndCheckBreaker(e) {
    if (this.uncaughtBreakerTripped) return !1;
    if (e - this.uncaughtWindowStart > hHe)
      ((this.uncaughtCount = 0), (this.uncaughtWindowStart = e), (this.recentUncaught = []));
    if ((this.uncaughtCount++, this.uncaughtCount >= Uco)) return ((this.uncaughtBreakerTripped = !0), !0);
    return !1;
  }
  recordHttp2RecoveryAndCheckBudget(e) {
    if (e - this.http2RecoveryWindowStart > HTTP2_RECOVERY_WINDOW_MS)
      ((this.http2RecoveryCount = 0), (this.http2RecoveryWindowStart = e));
    return (this.http2RecoveryCount++, this.http2RecoveryCount <= HTTP2_RECOVERY_CAP);
  }
  markStartupActionStarted(e) {
    ((this.startupActionStarted = !0), (this.startupExpectsUiMount = e));
  }
  inNonUiSubcommand() {
    return this.startupActionStarted && !this.startupExpectsUiMount;
  }
  exitIfStartupNeverMounted(e) {
    if (oZn() || this.inNonUiSubcommand() || this.isShuttingDown()) return;
    try {
      writeSync_2(
        2,
        `Claude Code could not start: ${e ?? "<unknown>"}
`,
      );
    } catch {}
    this.shutdown(1);
  }
  scheduleStartupMountWatchdog(e) {
    if (!getIsInteractive() || oZn() || this.inNonUiSubcommand() || this.isShuttingDown()) return;
    setTimeout((n) => this.exitIfStartupNeverMounted(n), STARTUP_MOUNT_GRACE_MS, e).unref();
  }
  armShutdownFailsafe(e, n) {
    if (this.failsafeTimer !== void 0) clearTimeout(this.failsafeTimer);
    ((this.failsafeFiresAtMs = Date.now() + e),
      (this.failsafeTimer = setTimeout(
        (r) => {
          (cleanupTerminalModes(),
            this.printResumeHint(),
            drainStdoutBeforeExit(500, { scaleBudgetToQueue: !1 })
              .then(() => this.forceExit(r))
              .catch(() => {}));
        },
        e,
        n,
      )));
  }
  async removeWorktreeAtExit(e, n, r) {
    let s = e.budgetMs ?? Gco;
    if (this.failsafeFiresAtMs !== void 0)
      this.armShutdownFailsafe(Math.max(this.failsafeFiresAtMs - Date.now(), s + r), n);
    DAt("Removing worktree\u2026");
    let h = "it may be partly deleted. Delete the folder if you no longer need it.";
    if (!this.worktreeRemovalSignalsInstalled)
      ((this.worktreeRemovalSignalsInstalled = !0),
        process.on("SIGINT", () => this.interruptWorktreeRemoval?.()),
        process.on("SIGTERM", () => this.interruptWorktreeRemoval?.()),
        process.on("SIGHUP", () => {
          let L = env.CLAUDE_BG_BACKEND === "daemon" && !this.ownsControllingTerminal;
          if (!this.worktreeRemovalIgnoresHangup && !L) this.interruptWorktreeRemoval?.();
        }));
    this.worktreeRemovalIgnoresHangup = e.ignoresHangup === !0;
    let promise = new Promise((L) => {
        this.interruptWorktreeRemoval = () =>
          L({ line: `Stopped waiting for the removal of the worktree at ${e.path}; ${h}` });
      }),
      rounded = Math.round(s / 60000),
      w;
    try {
      w = await withDeadline(
        Promise.race([
          Promise.resolve()
            .then(() => e.run())
            .then(
              (L) => ({ line: L }),
              (L) => (logError(L), { line: `Could not finish removing the worktree at ${e.path}; ${h}` }),
            ),
          promise,
        ]),
        s,
      );
    } finally {
      ((this.interruptWorktreeRemoval = void 0), (this.worktreeRemovalIgnoresHangup = !1));
    }
    if (
      (DAt(
        w?.line ??
          `Removing the worktree at ${e.path} did not finish within ${s >= 60000 ? `${rounded} ${rounded === 1 ? "minute" : "minutes"}` : `${Math.round(s / 1000)} seconds`}; ${h}`,
      ),
      this.failsafeFiresAtMs !== void 0)
    )
      this.armShutdownFailsafe(r, n);
  }
  isShuttingDown() {
    return this.shutdownInProgress;
  }
  armOrphanCheck() {
    if (this.orphanCheckInterval !== void 0 || !process.stdin.isTTY) return;
    ((this.orphanCheckInterval = setInterval(() => {
      if (getIsScrollDraining()) return;
      if (!process.stdout.writable || !process.stdin.readable)
        (clearInterval(this.orphanCheckInterval),
          logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "orphan_detected" }),
          markStdoutDrainExternallyClocked(),
          this.shutdown(129));
    }, 30000)),
      this.orphanCheckInterval.unref());
  }
  disarmOrphanCheck() {
    if (this.orphanCheckInterval !== void 0)
      (clearInterval(this.orphanCheckInterval), (this.orphanCheckInterval = void 0));
  }
  claimShutdown() {
    ((this.shutdownInProgress = !0), this.disarmOrphanCheck());
  }
  releaseShutdownClaim() {
    ((this.shutdownInProgress = !1), this.armOrphanCheck());
  }
  registerBeforeInteractiveShutdown(e) {
    this.beforeInteractiveShutdown = e;
  }
  clearBeforeInteractiveShutdown() {
    this.beforeInteractiveShutdown = null;
  }
  async runBeforeInteractiveShutdown() {
    let beforeInteractiveShutdown = this.beforeInteractiveShutdown;
    if (((this.beforeInteractiveShutdown = null), !beforeInteractiveShutdown || this.isShuttingDown()))
      return;
    try {
      await beforeInteractiveShutdown();
    } catch (error) {
      logError(error);
    }
  }
  disarmTimers() {
    if (this.failsafeTimer !== void 0)
      (clearTimeout(this.failsafeTimer), (this.failsafeTimer = void 0), (this.failsafeFiresAtMs = void 0));
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
    if (
      ((this.shutdownInProgress = !0), latchTerminalShutdown(), (process.exitCode = e), r?.suppressResumeHint)
    )
      this.resumeHintPrinted = !0;
    ((this.resumeHintOmitsWorktree = r?.removeWorktree !== void 0),
      (this.worktreeRemoval = r?.removeWorktree));
    let {
        executeSessionEndHooks: executeSessionEndHooks,
        getSessionEndHookTimeoutMs: getSessionEndHookTimeoutMs,
        SESSION_END_HOOK_TIMEOUT_MS_DEFAULT: SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
      } = await import("./chunk-4kvy3jy3.js"),
      S;
    try {
      S = getSessionEndHookTimeoutMs();
    } catch {
      S = SESSION_END_HOOK_TIMEOUT_MS_DEFAULT;
    }
    (this.armShutdownFailsafe(Math.max(5000, S + 5000), e), cleanupTerminalModes(), this.printResumeHint());
    let w;
    try {
      let G = (async () => {
        try {
          await runCleanups();
        } catch {}
      })();
      (await Promise.race([
        G,
        new Promise((q, Z) => {
          w = setTimeout((Se) => Se(new CleanupTimeoutError()), CLEANUP_TIMEOUT_MS, Z);
        }),
      ]),
        clearTimeout(w));
    } catch {
      clearTimeout(w);
    }
    if (FRt()) this.armShutdownFailsafe(Math.max(EXIT_HANDOFF_FAILSAFE_MS, S + 5000), e);
    try {
      await $Rt();
    } catch {}
    f3n();
    try {
      await rjt();
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
    f3n();
    try {
      await rjt();
    } catch {}
    try {
      profileReport();
    } catch {}
    emitScrollTelemetrySummary();
    try {
      u3n("session_end");
    } catch {}
    try {
      let G = J_s();
      if (G > 0) (this.widenFailsafeBy(G, e), await withDeadline(drainPreExitFlushes(), G));
    } catch {}
    let waitForHeldOAuthRefresh = await this.waitForHeldOAuthRefresh(e);
    if (
      (await drainRegisteredWriteQueues(),
      await flushAnalyticsSinks(),
      waitForHeldOAuthRefresh && waitForOAuthRefreshLocksReleased() !== null)
    )
      (await this.waitForHeldOAuthRefresh(e), await drainRegisteredWriteQueues());
    if (r?.finalMessage)
      try {
        writeSync_2(
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
      (this.widenFailsafeBy(J_s(), e), await zwr());
    } catch {}
    (await this.armFailsafeAndDrainStdout(e), this.forceExit(e));
  }
  widenFailsafeBy(e, n) {
    if (e > 0 && this.failsafeFiresAtMs !== void 0)
      this.armShutdownFailsafe(Math.max(0, this.failsafeFiresAtMs - Date.now()) + e, n);
  }
  async armFailsafeAndDrainStdout(e) {
    (this.armShutdownFailsafe(getStdoutDrainBudgetMs() + Wco, e), await drainStdoutBeforeExit());
  }
  async waitForHeldOAuthRefresh(e) {
    if (waitForOAuthRefreshLocksReleased() === null) return !0;
    if (this.failsafeFiresAtMs !== void 0)
      this.armShutdownFailsafe(
        Math.max(0, this.failsafeFiresAtMs - Date.now()) + OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
        e,
      );
    return waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
  }
}
//@ chunk-e6aww6q8.js:283131-283872 placement
function serializeShutdownError(e) {
  let n = n0e(e);
  if (!(!n && e instanceof Error)) {
    if (typeof e === "string")
      return { error_name: "string", error_message: redactSecrets(e).slice(0, 2000), isHostError: !1 };
    let w = n ? ownDataString(e, "name") : protoDataString(e, "name"),
      L = ownDataString(e, "message"),
      G = [];
    if (w !== void 0) G.push(w);
    if (L !== void 0) G.push(L);
    let q = G.length > 0 ? redactSecrets(G.join(": ")).slice(0, 2000) : void 0,
      Z = types.isNativeError(e) ? void 0 : ownDataString(e, "stack");
    return {
      error_name: "non-error",
      error_message: q,
      error_stack: Z !== void 0 ? redactSecrets(Z).slice(0, 4000) : void 0,
      isHostError: !1,
    };
  }
  let s = e,
    h,
    y,
    S;
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
    error_message: typeof y === "string" ? redactSecrets(y).slice(0, 2000) : void 0,
    error_stack: typeof S === "string" ? redactSecrets(S).slice(0, 4000) : void 0,
    isHostError: !0,
  };
}
//@ chunk-e6aww6q8.js:283872-284072 placement
function ownDataString(e, n) {
  if (e === null || typeof e !== "object") return;
  if (Pf(e)) return;
  let r;
  try {
    r = Object.getOwnPropertyDescriptor(e, n);
  } catch {
    return;
  }
  return r && "value" in r && typeof r.value === "string" ? r.value : void 0;
}
//@ chunk-e6aww6q8.js:284072-284338 placement
function protoDataString(e, n) {
  if (e === null || typeof e !== "object") return;
  let r = e;
  for (let s = 0; s < 128; s++) {
    if (r === null) return;
    if (Pf(r)) return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, n);
    if (ownPropertyDescriptor)
      return "value" in ownPropertyDescriptor && typeof ownPropertyDescriptor.value === "string"
        ? ownPropertyDescriptor.value
        : void 0;
    r = Object.getPrototypeOf(r);
  }
  return;
}
//@ chunk-e6aww6q8.js:284338-284544 placement
function isMcpConnectionClosed(e) {
  try {
    if (!(e instanceof Error)) return !1;
    let code = e.code;
    return (
      (e.name === "McpError" && code === -32000) ||
      (e.name === "SdkError" && code === "CONNECTION_CLOSED") ||
      (e.name === "ProtocolError" && code === -32000)
    );
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:284544-284639 placement
function emitScrollTelemetrySummary() {
  try {
    if (getIsInteractive() && hasScrollActivity())
      logEvent("tengu_scroll_summary", { ...takeScrollSummary(), fullscreen: isFullscreenEnvEnabled() });
  } catch {}
}
//@ chunk-e6aww6q8.js:284639-284745 placement
async function flushAnalyticsSinks() {
  try {
    let { flushAnalyticsSinks: flushAnalyticsSinks } = await import("./chunk-af5wdhtv.js");
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
function NAt(e) {
  if (!e.error_message) return {};
  return { error_message_hash: gn(e.error_message) };
}
//@ chunk-e6aww6q8.js:284901-285029 placement
function sanitizeErrorName(e) {
  if (!e.isHostError) return e.error_name === "string" ? lit_2("string") : lit_2("non-error");
  return sanitizeClassName(e.error_name) ?? lit_2("Error");
}
//@ chunk-e6aww6q8.js:285029-285056 placement
var shutdownCoordinators = new HostScoped(() => new ShutdownCoordinator());
//@ chunk-e6aww6q8.js:285056-285085 placement
function xb() {
  return onProcessRootHost(shutdownCoordinators);
}
/**
 * setupGracefulShutdown：安装信号与异常处理（init 时调用）。
 */
//@ chunk-e6aww6q8.js:285085-285117 placement
function setupGracefulShutdown(e) {
  xb().install(e);
}
//@ chunk-e6aww6q8.js:285117-285158 placement = isChromeExtensionInstalledPortable (1)
function areShutdownHandlersInstalled() {
  return xb().isInstalled();
}
//@ chunk-e6aww6q8.js:285158-285218 placement
function markPrintModeSignalHandlersRegistered() {
  xb().markPrintModeSignalHandlersRegistered();
}
//@ chunk-e6aww6q8.js:285218-285268 placement
function markOwnsControllingTerminal() {
  xb().markOwnsControllingTerminal();
}
//@ chunk-e6aww6q8.js:285268-285315 placement
function setCloudResumeHintLead(e) {
  xb().setCloudResumeHintLead(e);
}
//@ chunk-e6aww6q8.js:285315-285364 placement
function markStartupActionStarted(e) {
  xb().markStartupActionStarted(e);
}
//@ chunk-e6aww6q8.js:285364-285414 placement
function exitIfStartupNeverMounted(e) {
  xb().exitIfStartupNeverMounted(e);
}
/**
 * 退出时 flush 并关闭 1P 事件日志 provider。
 */
//@ chunk-e6aww6q8.js:285414-285477 placement = shutdown1PEventLogging (0.371)
async function gracefulShutdown(e = 0, n = "other", r) {
  return xb().shutdown(e, n, r);
}
/**
 * gracefulShutdownSync：同步退出路径。
 */
//@ chunk-e6aww6q8.js:285477-285527 placement
function gracefulShutdownSync(e = 0, n = "other") {
  xb().shutdownSync(e, n);
}
//@ chunk-e6aww6q8.js:285527-285570 placement
function isShuttingDown() {
  return xb().isShuttingDown();
}
//@ chunk-e6aww6q8.js:285570-285606 placement
function claimShutdown() {
  xb().claimShutdown();
}
//@ chunk-e6aww6q8.js:285606-285649 placement
function releaseShutdownClaim() {
  xb().releaseShutdownClaim();
}
//@ chunk-e6aww6q8.js:285649-285707 placement
function registerBeforeInteractiveShutdown(e) {
  xb().registerBeforeInteractiveShutdown(e);
}
//@ chunk-e6aww6q8.js:285707-285760 placement
function clearBeforeInteractiveShutdown() {
  xb().clearBeforeInteractiveShutdown();
}
/**
 * 退出时恢复终端模式：关闭鼠标/焦点报告、离开备用屏幕、卸载 Ink、排空 stdin。
 */
//@ chunk-x6v6jz2y.js:2704-3042 fingerprint = cleanupTerminalModes (0.629)
function cleanupTerminalModes_2() {
  if (!process.stdout.isTTY) return;
  try {
    resumeNonBlockingStdout();
    let inst = di().get(process.stdout);
    if (
      (writeSync(1, (inst?.modes.reset("mousePixels") ?? "") + DISABLE_MOUSE_TRACKING),
      inst?.modes.reset("mouse"),
      inst?.isAltScreenActive)
    )
      try {
        inst.unmount();
      } catch {}
    if (
      (inst?.drainStdin(),
      inst?.detachForShutdown(),
      restoreTerminalModes(inst?.modes ?? new TerminalModes(), (r) => writeSync(1, r)),
      !env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE)
    )
      writeSync(1, CLEAR_TERMINAL_TITLE);
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
