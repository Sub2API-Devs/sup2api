/**
 * cli/print/lateSessionStartHooks.ts
 *
 * 2.1.316 新增：延迟完成的 SessionStart 钩子的等待、暂存与追加
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (16)
 * attribution: placement 16
 */
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../handlers/util.js";
import {
  discriminatedUnion,
  looseObject,
  literal,
  stringSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { dedupeSessionStartRows, appendSessionStartRows } from "../../utils/transcript/deserialize.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isToolResultForToolUse } from "../../utils/messages/messagePredicates.js";
import {
  owedSessionStartHooks,
  sessionStartWaitReason,
  overtakeSessionStart,
} from "../../utils/sessionStart.js";
import { runStartupHooks } from "../startup/launcherHostLogin.js";
import { withDeadline } from "../../utils/sleep.js";
import { isDatadogAllowed } from "../../utils/hostEnvironment.js";
import { markResumeHooksWaitShadow, recordHooksInitWait } from "../../utils/startupTiming.js";
import { env } from "../../utils/env.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { invalidateSessionEnvCache } from "../../utils/sessionEnvironment.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:504394-504502 placement
function logLateSessionStartHookFailure(error) {
  logForDebugging(`SessionStart hooks of newly loaded plugins failed (continuing): ${errorMessage(error)}`, {
    level: "error",
  });
}
//@ chunk-tyg7f3ek.js:504502-504527 placement
function lateHookTimeoutMs() {
  return 1e4;
}
//@ chunk-tyg7f3ek.js:504527-504803 placement
function holdSessionStartHookContent(message) {
  if (message.type !== "attachment") return;
  let attachment = message.attachment;
  if (attachment.type === "hook_success" && attachment.content !== "")
    return createAttachmentMessage({
      ...attachment,
      content: "",
      heldContent: attachment.content,
    });
  if (attachment.type === "hook_additional_context" && attachment.content.length > 0)
    return createAttachmentMessage({
      ...attachment,
      content: [],
      heldContent: attachment.content,
    });
  return;
}
//@ chunk-tyg7f3ek.js:504803-505069 placement
var heldSessionStartRowSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:504803", () => {
  heldSessionStartRowSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      looseObject({
        type: literal("hook_success"),
        hookEvent: literal("SessionStart"),
        hookName: stringSchema(),
        content: literal(""),
        heldContent: stringSchema().min(1),
      }),
      looseObject({
        type: literal("hook_additional_context"),
        hookEvent: literal("SessionStart"),
        hookName: stringSchema(),
        content: array(stringSchema()).length(0),
        heldContent: array(stringSchema()).min(1),
      }),
    ]),
  );
});
//@ chunk-tyg7f3ek.js:505069-505478 placement
function releaseHeldSessionStartRow(message) {
  if (message.type !== "attachment") return;
  let parsed = heldSessionStartRowSchema().safeParse(message.attachment);
  if (!parsed.success) return;
  let attachment = message.attachment;
  if (attachment.type === "hook_success" && parsed.data.type === "hook_success") {
    let { heldContent, ...rest } = attachment;
    return createAttachmentMessage({
      ...rest,
      content: parsed.data.heldContent,
    });
  }
  if (attachment.type === "hook_additional_context" && parsed.data.type === "hook_additional_context") {
    let { heldContent, ...rest } = attachment;
    return createAttachmentMessage({
      ...rest,
      content: parsed.data.heldContent,
    });
  }
  return;
}
//@ chunk-tyg7f3ek.js:505478-505752 placement
function releaseHeldSessionStartRows(messages) {
  try {
    let released = dedupeSessionStartRows(
      messages,
      messages.flatMap((message) => releaseHeldSessionStartRow(message) ?? []),
    );
    return released.length > 0 ? [released] : [];
  } catch (error) {
    logFeatureBad("plugin_late_session_start_hooks", "held_rows_unreadable");
    logForDebugging(
      `SessionStart hook output an earlier worker set aside could not be read (dropped): ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return [];
  }
}
//@ chunk-tyg7f3ek.js:505752-505996 placement
function appendLateSessionStartRows({ conversation, append, waiting }, rows) {
  let rowsToAppend = dedupeSessionStartRows([...conversation(), ...waiting.flat()], rows);
  if (rowsToAppend.length === 0) return;
  if (isToolResultForToolUse(conversation())) {
    waiting.push(rowsToAppend);
    return;
  }
  let mapped = rowsToAppend.map((row) => holdSessionStartHookContent(row));
  let filtered = rowsToAppend.filter((row, index) => mapped[index] !== undefined);
  if (filtered.length > 0) waiting.push(filtered);
  append(rowsToAppend.map((row, index) => mapped[index] ?? row));
}
//@ chunk-tyg7f3ek.js:505996-506054 placement
function clearLateSessionStartRows(state, overdueSessionStartHooks) {
  overdueSessionStartHooks?.abort();
  state.waiting.length = 0;
  state.clears++;
}
//@ chunk-tyg7f3ek.js:506054-506406 placement
function flushWaitingSessionStartRows({ conversation, append, waiting }) {
  if (waiting.length === 0) return;
  if (isToolResultForToolUse(conversation())) {
    logFeatureSad("plugin_late_session_start_hooks", "rows_wait_call_open");
    return;
  }
  for (let rows of waiting.splice(0))
    try {
      append(dedupeSessionStartRows(conversation(), rows));
    } catch (error) {
      logFeatureBad("plugin_late_session_start_hooks", "overdue_append_failed");
      logForDebugging(`SessionStart hook output could not be appended (dropped): ${errorMessage(error)}`, {
        level: "error",
      });
    }
}
//@ chunk-tyg7f3ek.js:506406-507003 placement
/**
 * 新加载插件的 SessionStart 钩子在会话开始后补跑，并把输出作为附件行追加到转录。
 */
function runLateSessionStartHooks(state) {
  let { session, storageV5, credentials } = state;
  let owed;
  try {
    owed = owedSessionStartHooks();
  } catch (error) {
    logFeatureBad("plugin_late_session_start_hooks", "listing_failed");
    logLateSessionStartHookFailure(error);
  }
  if (owed === undefined) return;
  let { source, newPluginsOnly } = owed;
  let { clears } = state;
  let finished = false;
  let overtook = false;
  let run = (async () => {
    try {
      let rows = await runStartupHooks(session, {
        kind: "session-start",
        source,
        newPluginsOnly,
        storageV5,
        credentials,
      });
      if (state.clears === clears) appendLateSessionStartRows(state, rows);
      if (overtook) logFeatureSad("plugin_late_session_start_hooks", "turn_went_ahead");
      else logFeatureOk("plugin_late_session_start_hooks");
    } catch (error) {
      logFeatureBad("plugin_late_session_start_hooks", "dispatch_failed");
      throw error;
    }
  })()
    .catch(logLateSessionStartHookFailure)
    .finally(() => {
      finished = true;
    });
  return withDeadline(run, lateHookTimeoutMs()).then(() => {
    overtook = !finished;
  });
}
//@ chunk-tyg7f3ek.js:507003-507014 placement
var RESUME_HOOK_WAIT_MS = 1e4;
//@ chunk-tyg7f3ek.js:507014-507227 placement
async function waitForResumeSessionStartHooks(restored, timeoutMs) {
  let verdict = "empty_transcript";
  if (restored.messages.length > 0) {
    verdict = "ended_in_time";
    withDeadline(restored.sessionStartHooks.promise, timeoutMs).then(
      (rows) => {
        if (rows === undefined) verdict = lateHookWaitVerdict();
      },
      () => {},
    );
  }
  try {
    return await appendSessionStartRows(restored);
  } finally {
    if (isDatadogAllowed()) markResumeHooksWaitShadow(verdict);
  }
}
//@ chunk-tyg7f3ek.js:507227-507324 placement
function lateHookWaitVerdict() {
  try {
    return sessionStartWaitReason() === undefined ? "would_go_ahead" : "stand_down";
  } catch {
    return "look_failed";
  }
}
//@ chunk-tyg7f3ek.js:507324-508277 placement
/**
 * resume 时按 CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS 或托管策略等待 SessionStart 钩子结束。
 */
async function maybeWaitForSessionStartHooks(restored, late, timeoutMs = RESUME_HOOK_WAIT_MS) {
  let envTimeout = env.CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS;
  if (envTimeout === undefined && late !== undefined && isRemoteManagedEnvironment() && isDatadogAllowed())
    return waitForResumeSessionStartHooks(restored, timeoutMs);
  if (envTimeout === undefined || late === undefined || restored.messages.length === 0)
    return appendSessionStartRows(restored);
  let startTime = performance.now();
  let sessionStartHooks = restored.sessionStartHooks;
  if ((await withDeadline(sessionStartHooks.promise, envTimeout)) !== undefined) {
    logFeatureOk("hook_session_start_resume_wait");
    return appendSessionStartRows(restored);
  }
  let reason = sessionStartWaitReason();
  if (reason !== undefined) {
    logFeatureSad("hook_session_start_resume_wait", reason);
    logForDebugging(
      `SessionStart hooks are still running after ${envTimeout} ms: waiting until they end, because an administrator's hook may be among them (${reason})`,
    );
    return appendSessionStartRows(restored);
  }
  logFeatureSad("hook_session_start_resume_wait", "went_ahead");
  logForDebugging(
    `SessionStart hooks are still running after ${envTimeout} ms: reading messages now, their output joins a later turn`,
  );
  recordHooksInitWait(performance.now() - startTime, startTime);
  sessionStartHooks.promise.finally(late.holdActivity());
  let overtaken =
    sessionStartHooks.progress === undefined ? [] : overtakeSessionStart(sessionStartHooks.progress);
  let rows = dedupeSessionStartRows(restored.messages, overtaken);
  restored.messages.push(...rows);
  let overtakenSet = new Set(overtaken);
  late.overdue({
    ...sessionStartHooks,
    promise: sessionStartHooks.promise.then((rows) => rows.filter((row) => !overtakenSet.has(row))),
  });
  return rows;
}
//@ chunk-tyg7f3ek.js:508277-508678 placement
function appendSessionStartHooksWhenDone(state, overdueSessionStartHooks, report) {
  let { clears } = state;
  overdueSessionStartHooks.promise
    .then((rows) => {
      if (state.clears !== clears) return;
      invalidateSessionEnvCache();
      appendLateSessionStartRows(state, rows);
      if (overdueSessionStartHooks.progress?.lateInitialUserMessage)
        report(overdueSessionStartHooks.progress.lateInitialUserMessage);
    })
    .catch((error) => {
      logFeatureBad("hook_session_start_resume_wait", "late_rows_lost");
      logForDebugging(
        `SessionStart hooks ended after the session stopped waiting for them, and their output could not be added to the conversation (dropped): ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    });
}
//@ chunk-tyg7f3ek.js:508678-508695 placement
var SETTINGS_ERROR_NOTICE_LIMITS = 10;
var SETTINGS_NOTICE_MAX_CHARS = 500;
export {
  clearLateSessionStartRows,
  flushWaitingSessionStartRows,
  releaseHeldSessionStartRows,
  appendSessionStartHooksWhenDone,
  runLateSessionStartHooks,
  maybeWaitForSessionStartHooks,
  SETTINGS_ERROR_NOTICE_LIMITS,
  SETTINGS_NOTICE_MAX_CHARS,
};
