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
import { drainPreExitFlushes, runCleanups, CLEANUP_TIMEOUT_MS } from "./cleanupRegistry.js";
import { drainRegisteredWriteQueues } from "./settings/writeQueues.js";
import { assertProgramLaunchAllowed } from "./disklessSession.js";
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
  clearHandoffInProgress,
} from "../services/quotaAutoResume/quotaAutoResume.js";
import { createSystemMessage, isReorderedRow } from "./messages.js";
import {
  isProcessWrapperUsable,
  processWrapperError,
  PROCESS_WRAPPER_ENV_2,
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
import { noopStdinReset, resetWindowsStdinMode } from "./windowsStdin.js";
import { CLAUDE_RELAUNCH_SESSION_ADD_DIRS } from "../services/daemon/relaunchArgs.js";
import { CLAUDE_CODE_RELAUNCH_HOME_TRUST, relaunchHomeTrustEnv } from "./relaunchHomeTrust.js";
import { CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE, getRelaunchTerminalSizeEnv } from "./relaunchTerminalSize.js";
import { noopRelaunch } from "./stubs.js";
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
    withTimeout(drainPreExitFlushes(), 2000, "pre-exit flush timeout (exec)").catch(() => {}),
    withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exec)").catch(() => {}),
  ]);
}
//@ chunk-h52ct3be.js:1792-2149 placement
/**
 * 用 execve 原地重启进程（非 Windows）。
 */
function execveRelaunch(cmd, r, i, n) {
  assertProgramLaunchAllowed();
  if (getPlatform() === "windows" || !isAbsolute(cmd)) return;
  let a;
  let s;
  try {
    if (n) {
      s = process.cwd();
      processChdir(n);
    }
    process.execve(cmd, r, compactEnvObject(i));
    logForDebugging(`execve(${cmd}) returned \u2014 handing back to the caller`, {
      level: "warn",
    });
  } catch (error) {
    a = toError(error);
    logForDebugging(
      `execReplaceProcess: ${errorMessage(error)} \u2014 handing the error back to the caller`,
      {
        level: "warn",
      },
    );
  } finally {
    if (s !== undefined)
      try {
        processChdir(s);
      } catch {}
  }
  return a;
}
//@ chunk-h52ct3be.js:2149-2209 placement
async function launcherFileUsable(e) {
  let materializedSessionFile = getMaterializedSessionFile();
  if (!materializedSessionFile) return false;
  return isLauncherPresent(materializedSessionFile, e);
}
//@ chunk-h52ct3be.js:2209-2515 placement
/**
 * 启动器文件是否存在且可用。
 */
async function isLauncherPresent(materializedSessionFile, r) {
  if (
    await stat(materializedSessionFile).then(
      (a) => a.size > 0,
      () => false,
    )
  )
    return true;
  let transcriptStorageKey = getTranscriptStorageKey(materializedSessionFile, r);
  if (transcriptStorageKey === undefined) return false;
  try {
    let a = await transcriptStorageKey.backend.statMeta(transcriptStorageKey.key);
    if (!a.ok && a.error.code !== "NotFound")
      logForDebugging(`transcriptHasBytes: backend statMeta failed: ${a.error.code}`);
    return a.ok && a.value.size > 0;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-h52ct3be.js:2515-2728 placement
/**
 * 重启前确认（流式响应中跳过）。
 */
async function confirmRelaunch(e, r, { responseStreaming: i = false } = {}, storageV5) {
  let a = cancelForHandoff(r);
  if (!a || i) return a;
  try {
    await recordTranscript(
      [...e, createSystemMessage(AUTO_CONTINUE_CANCEL_MESSAGES[r], "warning")],
      undefined,
      undefined,
      undefined,
      storageV5,
    );
    if (r === "relaunch") await saveResumePoint(e, storageV5);
  } catch (error) {
    clearHandoffInProgress();
    throw error;
  }
  return true;
}
//@ chunk-h52ct3be.js:2728-2850 placement
/**
 * 进程退出时确认并执行重启 Claude Code，出错只记录日志。
 */
async function relaunchForExit(e, { responseStreaming: r = false } = {}, i) {
  try {
    await confirmRelaunch(
      e,
      "process_exit",
      {
        responseStreaming: r,
      },
      i,
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-h52ct3be.js:2991-3207 placement
var AUTO_CONTINUE_CANCELLED_NOTE =
  "the automatic continue at the usage-limit reset was cancelled (/rate-limit-options to wait again)";
var AUTO_CONTINUE_CANCELLED_SENTENCE = `${AUTO_CONTINUE_CANCELLED_NOTE.charAt(0).toUpperCase()}${AUTO_CONTINUE_CANCELLED_NOTE.slice(1)}.`;
var AUTO_CONTINUE_CANCELLED_MESSAGE = "Automatic continue at the usage-limit reset was cancelled.";
//@ chunk-h52ct3be.js:3207-3290 placement
/**
 * 命令附带恢复参数。
 */
function withResumeFlag(e, r) {
  return r.includes(AUTO_CONTINUE_CANCELLED_NOTE) ||
    r.includes(AUTO_CONTINUE_CANCELLED_SENTENCE) ||
    r.includes(AUTO_CONTINUE_CANCELLED_MESSAGE)
    ? `${e} ${AUTO_CONTINUE_CANCELLED_SENTENCE}`
    : e;
}
//@ chunk-h52ct3be.js:3290-3433 placement
/**
 * 错误信息附加重启提示。
 */
function withRelaunchHint(e, r, { as: i = "sentence", exitsAfterward: n = false } = {}) {
  clearHandoffInProgress();
  if (!r) return e;
  if (i === "clause") return `${e} \u2014 ${AUTO_CONTINUE_CANCELLED_NOTE}`;
  return `${e}
${n ? AUTO_CONTINUE_CANCELLED_MESSAGE : AUTO_CONTINUE_CANCELLED_SENTENCE}`;
}
//@ chunk-h52ct3be.js:3433-3564 placement
/**
 * 重启失败时附加说明再抛出。
 */
function relaunchOrExplain(e, r, i) {
  return relaunchClaudeCode(r, i).catch((error) => {
    if (error instanceof Error)
      error.message = withRelaunchHint(error.message, e, {
        as: "clause",
      });
    else clearHandoffInProgress();
    throw error;
  });
}
//@ chunk-h52ct3be.js:3564-3703 placement
/**
 * 保存恢复点（最后一条消息）。
 */
async function saveResumePoint(messages, storageV5) {
  let uuid = lastResumableMessage(messages)?.uuid;
  try {
    if (uuid) await persistLeafCheckpoint(uuid, undefined, storageV5);
    else if (hasRecordedUserPrompt() && (await launcherFileUsable(storageV5)))
      await persistLeafCheckpoint(null, undefined, storageV5);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-h52ct3be.js:3703-3803 placement
/**
 * 最后一条可恢复的消息。
 */
function lastResumableMessage(e) {
  return e.findLast(
    (r) => (r.type === "user" || r.type === "assistant") && isLoggableMessage(r) && !isReorderedRow(r.uuid),
  );
}
//@ chunk-h52ct3be.js:3803-3983 placement
var RESTART_FAILED_RESUME_MESSAGE =
  "Claude Code couldn't restart. Your conversation is saved. Start Claude Code again and run /resume to pick it up.";
var RESTART_FAILED_MESSAGE = "Claude Code couldn't restart. Start Claude Code again.";
//@ chunk-h52ct3be.js:3983-4300 placement
/**
 * 确认启动器可运行，否则报错。
 */
async function ensureLauncherRunnable() {
  if (await isProcessWrapperUsable()) return;
  logFeatureBad("agent_launcher", "relaunch_launcher_not_runnable");
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    processWrapperError() ??
      `${PROCESS_WRAPPER_ENV_2}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then retry; this session was left running`,
    "CLAUDE_CODE_PROCESS_WRAPPER launcher is not runnable",
  );
}
//@ chunk-h52ct3be.js:4300-6252 placement
/**
 * 重启 Claude Code（参数、启动器、恢复）。
 */
async function relaunchClaudeCode(e = {}, storageV5) {
  assertProgramLaunchAllowed();
  let { cmd, prefixArgs } = withHostOwnedEnv(() => withProcessWrapper(e.launcher ?? getLaunchCommand()));
  await ensureLauncherRunnable();
  let extraArgs = e.extraArgs ?? [];
  let s;
  if (e.args) s = e.args;
  else if (e.freshIfNoTranscript && !(await launcherFileUsable(storageV5))) s = extraArgs;
  else s = ["--resume", getSessionId(), ...extraArgs];
  let u = s[0] === "--resume" && !e.args;
  let S = isShuttingDown();
  claimShutdown();
  if (!S) e.onShutdownClaimed?.();
  cleanupTerminalModes();
  emitScrollTelemetrySummary();
  await Promise.all([
    withTimeout(flushSessionStorage(), 30000, "flush timeout (relaunch)").catch(() => {}),
    withTimeout(runCleanups(), CLEANUP_TIMEOUT_MS, "cleanup timeout")
      .catch(() => {})
      .then(() => withTimeout(flushAnalyticsSinks(), 1000, "analytics flush timeout").catch(() => {})),
  ]);
  e.preSpawn?.();
  let o = withLaunchValuesOfHybridConnection(
    withoutProtectedEnv(
      withHostOwnedEnv(() => ({
        ...process.env,
      })),
    ),
  );
  noopStdinReset(o);
  delete o.CLAUDE_CODE_TUI_JUST_SWITCHED;
  delete o.CLAUDE_CODE_TUI_TRIAL;
  delete o.CLAUDE_BRIDGE_REATTACH_SESSION;
  delete o.CLAUDE_BRIDGE_REATTACH_SEQ;
  delete o.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY;
  delete o.CLAUDE_BRIDGE_REATTACH_GROUPING;
  delete o.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT;
  delete o.CLAUDE_BRIDGE_REATTACH_OWNER_ORG;
  delete o.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL;
  delete o[CLAUDE_RELAUNCH_SESSION_ADD_DIRS];
  delete o.CLAUDE_BG_WORKSPACE_TRUSTED;
  delete o.CLAUDE_BG_CARRIED_PROMPTS_SHA256;
  delete o[CLAUDE_CODE_RELAUNCH_HOME_TRUST];
  if (isHomeDirectorySession() && getHomeTrustDialogAccepted()) {
    o.CLAUDE_BG_WORKSPACE_TRUSTED = "1";
    Object.assign(o, await relaunchHomeTrustEnv());
  }
  delete o[CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE];
  noopRelaunch(o, s);
  delete o[RELAUNCH_PROACTIVITY_BASELINE_ENV];
  delete o[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED];
  delete o[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON];
  delete o[CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL];
  if (e.proactivity && !e.args)
    Object.assign(o, proactivityBaselineEnv(e.proactivity), proactivityLevelEnv(e.proactivity));
  Object.assign(o, e.env);
  for (let f of e.dropEnv ?? []) delete o[f];
  Object.assign(o, getRelaunchTerminalSizeEnv());
  let _ = projectRootForRelaunch();
  await flushBeforeExec();
  pauseNonBlockingStdout();
  execveRelaunch(cmd, [cmd, ...prefixArgs, ...s], o, _);
  for (let f of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.removeAllListeners(f);
    process.on(f, () => {});
  }
  await flushBeforeExec();
  resetWindowsStdinMode();
  let c = spawnSync(cmd, [...prefixArgs, ...s], {
    stdio: "inherit",
    env: o,
    cwd: _,
  });
  process.removeAllListeners("beforeExit");
  process.removeAllListeners("exit");
  if (c.error) {
    logForDebugging(`Failed to relaunch: ${c.error.message}`, {
      level: "error",
    });
    await flushBeforeExec();
    emitExitMessage(e.failedLine ?? (u ? RESTART_FAILED_RESUME_MESSAGE : RESTART_FAILED_MESSAGE));
    setBgExitCause("relaunch_spawn_error");
    process.exit(1);
  }
  if (c.signal) {
    process.removeAllListeners(c.signal);
    process.kill(process.pid, c.signal);
    process.exit(128 + (constants.signals[c.signal] ?? 0));
  }
  process.exit(c.status ?? (c.signal ? 1 : 0));
}
//@ chunk-h52ct3be.js:6252-6325 placement
/**
 * projectRootForRelaunch：重启用的项目根目录。
 */
function projectRootForRelaunch() {
  let materializedSessionFile = getMaterializedSessionFile();
  let originalCwd = getOriginalCwd();
  if (materializedSessionFile && dirname(materializedSessionFile) === getProjectDir(originalCwd))
    return originalCwd;
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
  projectRootForRelaunch,
};
