/**
 * utils/processRelaunch.ts
 *
 * 2.1.316 新增：重启 Claude Code（参数、启动器、恢复）；用 execve 原地重启进程（非 Windows）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jynns2s2.js (17)
 * attribution: placement 16, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  PROCESS_WRAPPER_ENV,
  processWrapperArgv,
} from "./processWrapper.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { withHostOwnedEnv } from "./settings/hostEnvWrites.js";
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
  getResumeHintLaunchFlags,
  emitExitMessage,
} from "./gracefulShutdown.js";
import { withLaunchValuesOfHybridConnection } from "./managedEnvApply.js";
import { withoutProtectedEnv } from "./permissions/protectedSettingsPaths.js";
import { noopStdinReset, resetWindowsStdinMode } from "./windowsStdin.js";
import { CLAUDE_RELAUNCH_SESSION_ADD_DIRS } from "../services/daemon/relaunchArgs.js";
import { CLAUDE_CODE_RELAUNCH_HOME_TRUST, relaunchHomeTrustEnv } from "./relaunchHomeTrust.js";
import { CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE, getRelaunchTerminalSizeEnv } from "./relaunchTerminalSize.js";
import { CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS } from "./relaunchHintFlags.js";
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
import { resetGrowthBook_2 } from "../services/analytics/growthbook.js";
import { setBgExitCause } from "./bgExitSidecars.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-jynns2s2.js:1486-1765 placement
async function flushBeforeExec() {
  await Promise.all([
    withTimeout(flushDebugLogs(), 2000, "debug flush timeout (exec)").catch(() => {}),
    withTimeout(flushDiagnosticLogs(), 2000, "diag flush timeout (exec)").catch(() => {}),
    withTimeout(drainPreExitFlushes(), 2000, "pre-exit flush timeout (exec)").catch(() => {}),
    withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exec)").catch(() => {}),
  ]);
}
//@ chunk-jynns2s2.js:1799-2156 placement
/**
 * 用 execve 原地重启进程（非 Windows）。
 */
function execveRelaunch(cmd, argv, env, cwd) {
  assertProgramLaunchAllowed();
  if (getPlatform() === "windows" || !isAbsolute(cmd)) return;
  let failure;
  let previousCwd;
  try {
    if (cwd) {
      previousCwd = process.cwd();
      processChdir(cwd);
    }
    process.execve(cmd, argv, compactEnvObject(env));
    logForDebugging(`execve(${cmd}) returned \u2014 handing back to the caller`, {
      level: "warn",
    });
  } catch (error) {
    failure = toError(error);
    logForDebugging(
      `execReplaceProcess: ${errorMessage(error)} \u2014 handing the error back to the caller`,
      {
        level: "warn",
      },
    );
  } finally {
    if (previousCwd !== undefined)
      try {
        processChdir(previousCwd);
      } catch {}
  }
  return failure;
}
//@ chunk-jynns2s2.js:2156-2216 placement
async function launcherFileUsable(storageV5) {
  let materializedSessionFile = getMaterializedSessionFile();
  if (!materializedSessionFile) return false;
  return isLauncherPresent(materializedSessionFile, storageV5);
}
//@ chunk-jynns2s2.js:2216-2522 placement
/**
 * 启动器文件是否存在且可用。
 */
async function isLauncherPresent(materializedSessionFile, storageV5) {
  if (
    await stat(materializedSessionFile).then(
      (stats) => stats.size > 0,
      () => false,
    )
  )
    return true;
  let transcriptStorageKey = getTranscriptStorageKey(materializedSessionFile, storageV5);
  if (transcriptStorageKey === undefined) return false;
  try {
    let statResult = await transcriptStorageKey.backend.statMeta(transcriptStorageKey.key);
    if (!statResult.ok && statResult.error.code !== "NotFound")
      logForDebugging(`transcriptHasBytes: backend statMeta failed: ${statResult.error.code}`);
    return statResult.ok && statResult.value.size > 0;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-jynns2s2.js:2522-2735 placement
/**
 * 重启前确认（流式响应中跳过）。
 */
async function confirmRelaunch(messages, reason, { responseStreaming = false } = {}, storageV5) {
  let didCancel = cancelForHandoff(reason);
  if (!didCancel || responseStreaming) return didCancel;
  try {
    await recordTranscript(
      [...messages, createSystemMessage(AUTO_CONTINUE_CANCEL_MESSAGES[reason], "warning")],
      undefined,
      undefined,
      undefined,
      storageV5,
    );
    if (reason === "relaunch") await saveResumePoint(messages, storageV5);
  } catch (error) {
    clearHandoffInProgress();
    throw error;
  }
  return true;
}
//@ chunk-jynns2s2.js:2735-2857 placement
/**
 * 进程退出时确认并执行重启 Claude Code，出错只记录日志。
 */
async function relaunchForExit(messages, { responseStreaming = false } = {}, storageV5) {
  try {
    await confirmRelaunch(
      messages,
      "process_exit",
      {
        responseStreaming,
      },
      storageV5,
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-jynns2s2.js:2998-3216 placement
var AUTO_CONTINUE_CANCELLED_NOTE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AUTO_CONTINUE_CANCELLED_SENTENCE;
var AUTO_CONTINUE_CANCELLED_MESSAGE;
deferInit("chunk-jynns2s2.js:2998", () => {
  AUTO_CONTINUE_CANCELLED_NOTE =
    "the automatic continue at the usage-limit reset was cancelled (/rate-limit-options to wait again)";
  AUTO_CONTINUE_CANCELLED_SENTENCE = `${AUTO_CONTINUE_CANCELLED_NOTE.charAt(0).toUpperCase()}${AUTO_CONTINUE_CANCELLED_NOTE.slice(1)}.`;
  AUTO_CONTINUE_CANCELLED_MESSAGE = "Automatic continue at the usage-limit reset was cancelled.";
});
//@ chunk-jynns2s2.js:3216-3301 placement
/**
 * 命令附带恢复参数。
 */
function withResumeFlag(text, previousText) {
  return previousText.includes(AUTO_CONTINUE_CANCELLED_NOTE) ||
    previousText.includes(AUTO_CONTINUE_CANCELLED_SENTENCE) ||
    previousText.includes(AUTO_CONTINUE_CANCELLED_MESSAGE)
    ? `${text} ${AUTO_CONTINUE_CANCELLED_SENTENCE}`
    : text;
}
//@ chunk-jynns2s2.js:3301-3445 placement
/**
 * 错误信息附加重启提示。
 */
function withRelaunchHint(text, cancelled, { as: style = "sentence", exitsAfterward = false } = {}) {
  clearHandoffInProgress();
  if (!cancelled) return text;
  if (style === "clause") return `${text} \u2014 ${AUTO_CONTINUE_CANCELLED_NOTE}`;
  return `${text}
${exitsAfterward ? AUTO_CONTINUE_CANCELLED_MESSAGE : AUTO_CONTINUE_CANCELLED_SENTENCE}`;
}
//@ chunk-jynns2s2.js:3445-3575 placement
/**
 * 重启失败时附加说明再抛出。
 */
function relaunchOrExplain(text, options, storageV5) {
  return relaunchClaudeCode(options, storageV5).catch((error) => {
    if (error instanceof Error)
      error.message = withRelaunchHint(error.message, text, {
        as: "clause",
      });
    else clearHandoffInProgress();
    throw error;
  });
}
//@ chunk-jynns2s2.js:3575-3714 placement
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
//@ chunk-jynns2s2.js:3714-3814 placement
/**
 * 最后一条可恢复的消息。
 */
function lastResumableMessage(messages) {
  return messages.findLast(
    (message) =>
      (message.type === "user" || message.type === "assistant") &&
      isLoggableMessage(message) &&
      !isReorderedRow(message.uuid),
  );
}
//@ chunk-jynns2s2.js:3814-3994 placement
var RESTART_FAILED_RESUME_MESSAGE =
  "Claude Code couldn't restart. Your conversation is saved. Start Claude Code again and run /resume to pick it up.";
var RESTART_FAILED_MESSAGE = "Claude Code couldn't restart. Start Claude Code again.";
//@ chunk-jynns2s2.js:3994-4311 placement
/**
 * 确认启动器可运行，否则报错。
 */
async function ensureLauncherRunnable() {
  if (await isProcessWrapperUsable()) return;
  logFeatureBad("agent_launcher", "relaunch_launcher_not_runnable");
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    processWrapperError() ??
      `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then retry; this session was left running`,
    "CLAUDE_CODE_PROCESS_WRAPPER launcher is not runnable",
  );
}
//@ chunk-jynns2s2.js:4311-6465 placement
/**
 * 重启 Claude Code（参数、启动器、恢复）。
 */
async function relaunchClaudeCode(options = {}, storageV5) {
  assertProgramLaunchAllowed();
  let { cmd, prefixArgs } = withHostOwnedEnv(() =>
    withProcessWrapper(options.launcher ?? getLaunchCommand()),
  );
  await ensureLauncherRunnable();
  let extraArgs = options.extraArgs ?? [];
  let args;
  if (options.args) args = options.args;
  else if (options.freshIfNoTranscript && !(await launcherFileUsable(storageV5))) args = extraArgs;
  else args = ["--resume", getSessionId(), ...extraArgs];
  let isResumeRun = args[0] === "--resume" && !options.args;
  let failedLine =
    options.failedLine ?? (isResumeRun ? RESTART_FAILED_RESUME_MESSAGE : RESTART_FAILED_MESSAGE);
  let wasShuttingDown = isShuttingDown();
  claimShutdown();
  if (!wasShuttingDown) options.onShutdownClaimed?.();
  cleanupTerminalModes();
  emitScrollTelemetrySummary();
  await Promise.all([
    withTimeout(flushSessionStorage(), 30000, "flush timeout (relaunch)").catch(() => {}),
    withTimeout(runCleanups(), CLEANUP_TIMEOUT_MS, "cleanup timeout")
      .catch(() => {})
      .then(() => withTimeout(flushAnalyticsSinks(), 1000, "analytics flush timeout").catch(() => {})),
  ]);
  options.preSpawn?.();
  let env = withLaunchValuesOfHybridConnection(
    withoutProtectedEnv(
      withHostOwnedEnv(() => ({
        ...process.env,
      })),
    ),
  );
  noopStdinReset(env);
  delete env.CLAUDE_CODE_TUI_JUST_SWITCHED;
  delete env.CLAUDE_CODE_TUI_TRIAL;
  delete env.CLAUDE_CODE_TELEPORT_MOVE;
  delete env.CLAUDE_BRIDGE_REATTACH_SESSION;
  delete env.CLAUDE_BRIDGE_REATTACH_SEQ;
  delete env.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY;
  delete env.CLAUDE_BRIDGE_REATTACH_GROUPING;
  delete env.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT;
  delete env.CLAUDE_BRIDGE_REATTACH_OWNER_ORG;
  delete env.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL;
  delete env[CLAUDE_RELAUNCH_SESSION_ADD_DIRS];
  delete env.CLAUDE_BG_WORKSPACE_TRUSTED;
  delete env.CLAUDE_BG_CARRIED_PROMPTS_SHA256;
  delete env[CLAUDE_CODE_RELAUNCH_HOME_TRUST];
  if (isHomeDirectorySession() && getHomeTrustDialogAccepted()) {
    env.CLAUDE_BG_WORKSPACE_TRUSTED = "1";
    Object.assign(env, await relaunchHomeTrustEnv());
  }
  delete env[CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE];
  delete env[CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS];
  let resumeHintLaunchFlags = getResumeHintLaunchFlags();
  if (!options.args && resumeHintLaunchFlags !== undefined)
    env[CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS] = resumeHintLaunchFlags;
  noopRelaunch(env, args);
  delete env[RELAUNCH_PROACTIVITY_BASELINE_ENV];
  delete env[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED];
  delete env[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON];
  delete env[CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL];
  if (options.proactivity && !options.args)
    Object.assign(env, proactivityBaselineEnv(options.proactivity), proactivityLevelEnv(options.proactivity));
  Object.assign(env, options.env);
  for (let name of options.dropEnv ?? []) delete env[name];
  Object.assign(env, getRelaunchTerminalSizeEnv());
  let cwd = projectRootForRelaunch();
  await flushBeforeExec();
  pauseNonBlockingStdout();
  let refusal = callRefuseAtSpawn(options.refuseAtSpawn, failedLine);
  if (refusal !== undefined) return resetGrowthBook_2(refusal);
  execveRelaunch(cmd, [cmd, ...prefixArgs, ...args], env, cwd);
  for (let signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.removeAllListeners(signal);
    process.on(signal, () => {});
  }
  await flushBeforeExec();
  let spawnRefusal = callRefuseAtSpawn(options.refuseAtSpawn, failedLine);
  if (spawnRefusal !== undefined) return resetGrowthBook_2(spawnRefusal);
  resetWindowsStdinMode();
  let spawnResult = spawnSync(cmd, [...prefixArgs, ...args], {
    stdio: "inherit",
    env,
    cwd,
  });
  process.removeAllListeners("beforeExit");
  process.removeAllListeners("exit");
  if (spawnResult.error) {
    logForDebugging(`Failed to relaunch: ${spawnResult.error.message}`, {
      level: "error",
    });
    await flushBeforeExec();
    emitExitMessage(failedLine);
    setBgExitCause("relaunch_spawn_error");
    process.exit(1);
  }
  if (spawnResult.signal) {
    process.removeAllListeners(spawnResult.signal);
    process.kill(process.pid, spawnResult.signal);
    process.exit(128 + (constants.signals[spawnResult.signal] ?? 0));
  }
  process.exit(spawnResult.status ?? (spawnResult.signal ? 1 : 0));
}
//@ chunk-jynns2s2.js:6465-6522 sole-consumer
function callRefuseAtSpawn(refuseAtSpawn, fallback) {
  try {
    return refuseAtSpawn?.();
  } catch (error) {
    logError(error);
    return fallback;
  }
}
//@ chunk-jynns2s2.js:6650-6723 placement
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
  relaunchClaudeCode,
  relaunchOrExplain,
  lastResumableMessage,
  projectRootForRelaunch,
  saveResumePoint,
  ensureLauncherRunnable,
  confirmRelaunch,
  withResumeFlag,
  withRelaunchHint,
  AUTO_CONTINUE_CANCELLED_MESSAGE,
  relaunchForExit,
  flushBeforeExec,
};
