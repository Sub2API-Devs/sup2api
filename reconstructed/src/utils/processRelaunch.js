/**
 * utils/processRelaunch.ts
 *
 * 2.1.316 新增：重启 Claude Code（参数、启动器、恢复）；用 execve 原地重启进程（非 Windows）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h52ct3be.js (16)
 * attribution: placement 16
 */
import { isAbsolute, dirname } from "path";
import { stat } from "fs/promises";
import { spawnSync } from "child_process";
import { constants } from "os";
import { withTimeout } from "./sleep.js";
import { flushDebugLogs, logForDebugging } from "./debug.js";
import { flushDiagnosticLogs } from "./diagLogs.js";
import { zwr, runCleanups, CLEANUP_TIMEOUT_MS } from "./cleanupRegistry.js";
import { drainRegisteredWriteQueues } from "./settings/writeQueues.js";
import { CR } from "./disklessSession.js";
import { getPlatform } from "./platform.js";
import { processChdir } from "./fsOperations.js";
import { compactEnvObject } from "./safeObject.js";
import {
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import {
  getMaterializedSessionFile,
  getTranscriptStorageKey,
  recordTranscript,
  persistLeafCheckpoint,
  hasRecordedUserPrompt,
  isLoggableMessage,
  flushSessionStorage,
  getProjectDir,
} from "./sessionStorage.js";
import { logError } from "./log.js";
import {
  cancelForHandoff,
  AUTO_CONTINUE_CANCEL_MESSAGES,
  fze,
} from "../services/quotaAutoResume/quotaAutoResume.js";
import { createSystemMessage, OB } from "./messages.js";
import {
  isProcessWrapperUsable,
  processWrapperError,
  PROCESS_WRAPPER_ENV,
  processWrapperArgv,
} from "./processWrapper.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { withHostOwnedEnv } from "./settings/managedSettingsFiles.js";
import { withProcessWrapper, getLaunchCommand } from "./deepLink/registerProtocol.js";
import {
  getSessionId,
  isHomeDirectorySession,
  getHomeTrustDialogAccepted,
  getOriginalCwd,
  getProjectRoot,
} from "../bootstrap/state.js";
import {
  isShuttingDown,
  claimShutdown,
  cleanupTerminalModes,
  emitScrollTelemetrySummary,
  flushAnalyticsSinks,
  emitExitMessage,
} from "./gracefulShutdown.js";
import { withLaunchValuesOfHybridConnection } from "./managedEnvApply.js";
import { withoutProtectedEnv } from "./permissions/protectedSettingsPaths.js";
import { ozn, resetWindowsStdinMode } from "./windowsStdin.js";
import { CLAUDE_RELAUNCH_SESSION_ADD_DIRS } from "../services/daemon/relaunchArgs.js";
import { CLAUDE_CODE_RELAUNCH_HOME_TRUST, relaunchHomeTrustEnv } from "./relaunchHomeTrust.js";
import { CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE, getRelaunchTerminalSizeEnv } from "./relaunchTerminalSize.js";
import { izn } from "./stubs.js";
import {
  RELAUNCH_PROACTIVITY_BASELINE_ENV,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL,
  proactivityBaselineEnv,
  proactivityLevelEnv,
} from "./proactivityRelaunch.js";
import { pauseNonBlockingStdout } from "../ink/nonBlockingStdout.js";
import { setBgExitCause } from "./bgExitSidecars.js";

//@ chunk-h52ct3be.js:1479-1758 placement
async function flushBeforeExec() {
  await Promise.all([
    withTimeout(flushDebugLogs(), 2000, "debug flush timeout (exec)").catch(() => {}),
    withTimeout(flushDiagnosticLogs(), 2000, "diag flush timeout (exec)").catch(() => {}),
    withTimeout(zwr(), 2000, "pre-exit flush timeout (exec)").catch(() => {}),
    withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exec)").catch(() => {}),
  ]);
}
/**
 * 用 execve 原地重启进程（非 Windows）。
 */
//@ chunk-h52ct3be.js:1792-2149 placement
function execveRelaunch(e, r, i, n) {
  if ((CR(), getPlatform() === "windows" || !isAbsolute(e))) return;
  let a, s;
  try {
    if (n) ((s = process.cwd()), processChdir(n));
    (process.execve(e, r, compactEnvObject(i)),
      logForDebugging(`execve(${e}) returned \u2014 handing back to the caller`, { level: "warn" }));
  } catch (error) {
    ((a = toError(error)),
      logForDebugging(
        `execReplaceProcess: ${errorMessage(error)} \u2014 handing the error back to the caller`,
        { level: "warn" },
      ));
  } finally {
    if (s !== void 0)
      try {
        processChdir(s);
      } catch {}
  }
  return a;
}
//@ chunk-h52ct3be.js:2149-2209 placement
async function R(e) {
  let r = getMaterializedSessionFile();
  if (!r) return !1;
  return isLauncherPresent(r, e);
}
/**
 * 启动器文件是否存在且可用。
 */
//@ chunk-h52ct3be.js:2209-2515 placement
async function isLauncherPresent(e, r) {
  if (
    await stat(e).then(
      (a) => a.size > 0,
      () => !1,
    )
  )
    return !0;
  let n = getTranscriptStorageKey(e, r);
  if (n === void 0) return !1;
  try {
    let statMeta = await n.backend.statMeta(n.key);
    if (!statMeta.ok && statMeta.error.code !== "NotFound")
      logForDebugging(`transcriptHasBytes: backend statMeta failed: ${statMeta.error.code}`);
    return statMeta.ok && statMeta.value.size > 0;
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 重启前确认（流式响应中跳过）。
 */
//@ chunk-h52ct3be.js:2515-2728 placement
async function confirmRelaunch(e, r, { responseStreaming: i = !1 } = {}, n) {
  let a = cancelForHandoff(r);
  if (!a || i) return a;
  try {
    if (
      (await recordTranscript(
        [...e, createSystemMessage(AUTO_CONTINUE_CANCEL_MESSAGES[r], "warning")],
        void 0,
        void 0,
        void 0,
        n,
      ),
      r === "relaunch")
    )
      await saveResumePoint(e, n);
  } catch (error) {
    throw (fze(), error);
  }
  return !0;
}
/**
 * 进程退出时确认并执行重启 Claude Code，出错只记录日志。
 */
//@ chunk-h52ct3be.js:2728-2850 placement
async function relaunchForExit(e, { responseStreaming: r = !1 } = {}, i) {
  try {
    await confirmRelaunch(e, "process_exit", { responseStreaming: r }, i);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-h52ct3be.js:2991-3207 placement
var AUTO_CONTINUE_CANCELLED_NOTE =
    "the automatic continue at the usage-limit reset was cancelled (/rate-limit-options to wait again)",
  AUTO_CONTINUE_CANCELLED_SENTENCE = `${AUTO_CONTINUE_CANCELLED_NOTE.charAt(0).toUpperCase()}${AUTO_CONTINUE_CANCELLED_NOTE.slice(1)}.`,
  AUTO_CONTINUE_CANCELLED_MESSAGE = "Automatic continue at the usage-limit reset was cancelled.";
/**
 * 命令附带恢复参数。
 */
//@ chunk-h52ct3be.js:3207-3290 placement
function withResumeFlag(e, r) {
  return r.includes(AUTO_CONTINUE_CANCELLED_NOTE) ||
    r.includes(AUTO_CONTINUE_CANCELLED_SENTENCE) ||
    r.includes(AUTO_CONTINUE_CANCELLED_MESSAGE)
    ? `${e} ${AUTO_CONTINUE_CANCELLED_SENTENCE}`
    : e;
}
/**
 * 错误信息附加重启提示。
 */
//@ chunk-h52ct3be.js:3290-3433 placement
function withRelaunchHint(e, r, { as: i = "sentence", exitsAfterward: n = !1 } = {}) {
  if ((fze(), !r)) return e;
  if (i === "clause") return `${e} \u2014 ${AUTO_CONTINUE_CANCELLED_NOTE}`;
  return `${e}
${n ? AUTO_CONTINUE_CANCELLED_MESSAGE : AUTO_CONTINUE_CANCELLED_SENTENCE}`;
}
/**
 * 重启失败时附加说明再抛出。
 */
//@ chunk-h52ct3be.js:3433-3564 placement
function relaunchOrExplain(e, r, i) {
  return relaunchClaudeCode(r, i).catch((n) => {
    if (n instanceof Error) n.message = withRelaunchHint(n.message, e, { as: "clause" });
    else fze();
    throw n;
  });
}
/**
 * 保存恢复点（最后一条消息）。
 */
//@ chunk-h52ct3be.js:3564-3703 placement
async function saveResumePoint(e, r) {
  let i = lastResumableMessage(e)?.uuid;
  try {
    if (i) await persistLeafCheckpoint(i, void 0, r);
    else if (hasRecordedUserPrompt() && (await R(r))) await persistLeafCheckpoint(null, void 0, r);
  } catch (error) {
    logError(error);
  }
}
/**
 * 最后一条可恢复的消息。
 */
//@ chunk-h52ct3be.js:3703-3803 placement
function lastResumableMessage(e) {
  return e.findLast(
    (r) => (r.type === "user" || r.type === "assistant") && isLoggableMessage(r) && !OB(r.uuid),
  );
}
//@ chunk-h52ct3be.js:3803-3983 placement
var RESTART_FAILED_RESUME_MESSAGE =
    "Claude Code couldn't restart. Your conversation is saved. Start Claude Code again and run /resume to pick it up.",
  RESTART_FAILED_MESSAGE = "Claude Code couldn't restart. Start Claude Code again.";
/**
 * 确认启动器可运行，否则报错。
 */
//@ chunk-h52ct3be.js:3983-4300 placement
async function ensureLauncherRunnable() {
  if (await isProcessWrapperUsable()) return;
  throw (
    logFeatureBad("agent_launcher", "relaunch_launcher_not_runnable"),
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      processWrapperError() ??
        `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then retry; this session was left running`,
      "CLAUDE_CODE_PROCESS_WRAPPER launcher is not runnable",
    )
  );
}
/**
 * 重启 Claude Code（参数、启动器、恢复）。
 */
//@ chunk-h52ct3be.js:4300-6252 placement
async function relaunchClaudeCode(e = {}, r) {
  CR();
  let { cmd: cmd, prefixArgs: prefixArgs } = withHostOwnedEnv(() =>
    withProcessWrapper(e.launcher ?? getLaunchCommand()),
  );
  await ensureLauncherRunnable();
  let a = e.extraArgs ?? [],
    s;
  if (e.args) s = e.args;
  else if (e.freshIfNoTranscript && !(await R(r))) s = a;
  else s = ["--resume", getSessionId(), ...a];
  let u = s[0] === "--resume" && !e.args,
    S = isShuttingDown();
  if ((claimShutdown(), !S)) e.onShutdownClaimed?.();
  (cleanupTerminalModes(),
    emitScrollTelemetrySummary(),
    await Promise.all([
      withTimeout(flushSessionStorage(), 30000, "flush timeout (relaunch)").catch(() => {}),
      withTimeout(runCleanups(), CLEANUP_TIMEOUT_MS, "cleanup timeout")
        .catch(() => {})
        .then(() => withTimeout(flushAnalyticsSinks(), 1000, "analytics flush timeout").catch(() => {})),
    ]),
    e.preSpawn?.());
  let o = withLaunchValuesOfHybridConnection(
    withoutProtectedEnv(withHostOwnedEnv(() => ({ ...process.env }))),
  );
  if (
    (ozn(o),
    delete o.CLAUDE_CODE_TUI_JUST_SWITCHED,
    delete o.CLAUDE_CODE_TUI_TRIAL,
    delete o.CLAUDE_BRIDGE_REATTACH_SESSION,
    delete o.CLAUDE_BRIDGE_REATTACH_SEQ,
    delete o.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY,
    delete o.CLAUDE_BRIDGE_REATTACH_GROUPING,
    delete o.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT,
    delete o.CLAUDE_BRIDGE_REATTACH_OWNER_ORG,
    delete o.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL,
    delete o[CLAUDE_RELAUNCH_SESSION_ADD_DIRS],
    delete o.CLAUDE_BG_WORKSPACE_TRUSTED,
    delete o.CLAUDE_BG_CARRIED_PROMPTS_SHA256,
    delete o[CLAUDE_CODE_RELAUNCH_HOME_TRUST],
    isHomeDirectorySession() && getHomeTrustDialogAccepted())
  )
    ((o.CLAUDE_BG_WORKSPACE_TRUSTED = "1"), Object.assign(o, await relaunchHomeTrustEnv()));
  if (
    (delete o[CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE],
    izn(o, s),
    delete o[RELAUNCH_PROACTIVITY_BASELINE_ENV],
    delete o[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED],
    delete o[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON],
    delete o[CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL],
    e.proactivity && !e.args)
  )
    Object.assign(o, proactivityBaselineEnv(e.proactivity), proactivityLevelEnv(e.proactivity));
  Object.assign(o, e.env);
  for (let f of e.dropEnv ?? []) delete o[f];
  Object.assign(o, getRelaunchTerminalSizeEnv());
  let _ = nzn();
  (await flushBeforeExec(), pauseNonBlockingStdout(), execveRelaunch(cmd, [cmd, ...prefixArgs, ...s], o, _));
  for (let f of ["SIGINT", "SIGTERM", "SIGHUP"]) (process.removeAllListeners(f), process.on(f, () => {}));
  (await flushBeforeExec(), resetWindowsStdinMode());
  let c = spawnSync(cmd, [...prefixArgs, ...s], { stdio: "inherit", env: o, cwd: _ });
  if ((process.removeAllListeners("beforeExit"), process.removeAllListeners("exit"), c.error))
    (logForDebugging(`Failed to relaunch: ${c.error.message}`, { level: "error" }),
      await flushBeforeExec(),
      emitExitMessage(e.failedLine ?? (u ? RESTART_FAILED_RESUME_MESSAGE : RESTART_FAILED_MESSAGE)),
      setBgExitCause("relaunch_spawn_error"),
      process.exit(1));
  if (c.signal)
    (process.removeAllListeners(c.signal),
      process.kill(process.pid, c.signal),
      process.exit(128 + (constants.signals[c.signal] ?? 0)));
  process.exit(c.status ?? (c.signal ? 1 : 0));
}
//@ chunk-h52ct3be.js:6252-6325 placement
function nzn() {
  let e = getMaterializedSessionFile(),
    r = getOriginalCwd();
  if (e && dirname(e) === getProjectDir(r)) return r;
  return getProjectRoot();
}

export {
  saveResumePoint,
  lastResumableMessage,
  confirmRelaunch,
  withRelaunchHint,
  withResumeFlag,
  relaunchClaudeCode,
  relaunchForExit,
  ensureLauncherRunnable,
  relaunchOrExplain,
  nzn,
};
