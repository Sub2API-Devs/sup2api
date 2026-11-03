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
  string,
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
function holdSessionStartHookContent(e) {
  if (e.type !== "attachment") return;
  let attachment = e.attachment;
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
var heldSessionStartRowSchema = DoctorLazy(() =>
  discriminatedUnion("type", [
    looseObject({
      type: literal("hook_success"),
      hookEvent: literal("SessionStart"),
      hookName: string(),
      content: literal(""),
      heldContent: string().min(1),
    }),
    looseObject({
      type: literal("hook_additional_context"),
      hookEvent: literal("SessionStart"),
      hookName: string(),
      content: array(string()).length(0),
      heldContent: array(string()).min(1),
    }),
  ]),
);
//@ chunk-tyg7f3ek.js:505069-505478 placement
function releaseHeldSessionStartRow(e) {
  if (e.type !== "attachment") return;
  let n = heldSessionStartRowSchema().safeParse(e.attachment);
  if (!n.success) return;
  let attachment = e.attachment;
  if (attachment.type === "hook_success" && n.data.type === "hook_success") {
    let { heldContent, ...h } = attachment;
    return createAttachmentMessage({
      ...h,
      content: n.data.heldContent,
    });
  }
  if (attachment.type === "hook_additional_context" && n.data.type === "hook_additional_context") {
    let { heldContent, ...h } = attachment;
    return createAttachmentMessage({
      ...h,
      content: n.data.heldContent,
    });
  }
  return;
}
//@ chunk-tyg7f3ek.js:505478-505752 placement
function releaseHeldSessionStartRows(e) {
  try {
    let n = dedupeSessionStartRows(
      e,
      e.flatMap((r) => releaseHeldSessionStartRow(r) ?? []),
    );
    return n.length > 0 ? [n] : [];
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
function appendLateSessionStartRows({ conversation, append, waiting }, s) {
  let h = dedupeSessionStartRows([...conversation(), ...waiting.flat()], s);
  if (h.length === 0) return;
  if (isToolResultForToolUse(conversation())) {
    waiting.push(h);
    return;
  }
  let mapped = h.map((R) => holdSessionStartHookContent(R));
  let filtered = h.filter((R, w) => mapped[w] !== undefined);
  if (filtered.length > 0) waiting.push(filtered);
  append(h.map((R, w) => mapped[w] ?? R));
}
//@ chunk-tyg7f3ek.js:505996-506054 placement
function clearLateSessionStartRows(e, overdueSessionStartHooks) {
  overdueSessionStartHooks?.abort();
  e.waiting.length = 0;
  e.clears++;
}
//@ chunk-tyg7f3ek.js:506054-506406 placement
function flushWaitingSessionStartRows({ conversation, append, waiting }) {
  if (waiting.length === 0) return;
  if (isToolResultForToolUse(conversation())) {
    logFeatureSad("plugin_late_session_start_hooks", "rows_wait_call_open");
    return;
  }
  for (let s of waiting.splice(0))
    try {
      append(dedupeSessionStartRows(conversation(), s));
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
function runLateSessionStartHooks(e) {
  let { session, storageV5, credentials } = e;
  let h;
  try {
    h = owedSessionStartHooks();
  } catch (error) {
    logFeatureBad("plugin_late_session_start_hooks", "listing_failed");
    logLateSessionStartHookFailure(error);
  }
  if (h === undefined) return;
  let { source, newPluginsOnly } = h;
  let { clears } = e;
  let w = false;
  let P = false;
  let L = (async () => {
    try {
      let q = await runStartupHooks(session, {
        kind: "session-start",
        source,
        newPluginsOnly,
        storageV5,
        credentials,
      });
      if (e.clears === clears) appendLateSessionStartRows(e, q);
      if (P) logFeatureSad("plugin_late_session_start_hooks", "turn_went_ahead");
      else logFeatureOk("plugin_late_session_start_hooks");
    } catch (error) {
      logFeatureBad("plugin_late_session_start_hooks", "dispatch_failed");
      throw error;
    }
  })()
    .catch(logLateSessionStartHookFailure)
    .finally(() => {
      w = true;
    });
  return withDeadline(L, lateHookTimeoutMs()).then(() => {
    P = !w;
  });
}
//@ chunk-tyg7f3ek.js:507003-507014 placement
var RESUME_HOOK_WAIT_MS = 1e4;
//@ chunk-tyg7f3ek.js:507014-507227 placement
async function waitForResumeSessionStartHooks(e, n) {
  let r = "empty_transcript";
  if (e.messages.length > 0) {
    r = "ended_in_time";
    withDeadline(e.sessionStartHooks.promise, n).then(
      (s) => {
        if (s === undefined) r = lateHookWaitVerdict();
      },
      () => {},
    );
  }
  try {
    return await appendSessionStartRows(e);
  } finally {
    if (isDatadogAllowed()) markResumeHooksWaitShadow(r);
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
async function maybeWaitForSessionStartHooks(e, n, r = RESUME_HOOK_WAIT_MS) {
  let s = env.CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS;
  if (s === undefined && n !== undefined && isRemoteManagedEnvironment() && isDatadogAllowed())
    return waitForResumeSessionStartHooks(e, r);
  if (s === undefined || n === undefined || e.messages.length === 0) return appendSessionStartRows(e);
  let startTime = performance.now();
  let sessionStartHooks = e.sessionStartHooks;
  if ((await withDeadline(sessionStartHooks.promise, s)) !== undefined) {
    logFeatureOk("hook_session_start_resume_wait");
    return appendSessionStartRows(e);
  }
  let S = sessionStartWaitReason();
  if (S !== undefined) {
    logFeatureSad("hook_session_start_resume_wait", S);
    logForDebugging(
      `SessionStart hooks are still running after ${s} ms: waiting until they end, because an administrator's hook may be among them (${S})`,
    );
    return appendSessionStartRows(e);
  }
  logFeatureSad("hook_session_start_resume_wait", "went_ahead");
  logForDebugging(
    `SessionStart hooks are still running after ${s} ms: reading messages now, their output joins a later turn`,
  );
  recordHooksInitWait(performance.now() - startTime, startTime);
  sessionStartHooks.promise.finally(n.holdActivity());
  let R = sessionStartHooks.progress === undefined ? [] : overtakeSessionStart(sessionStartHooks.progress);
  let w = dedupeSessionStartRows(e.messages, R);
  e.messages.push(...w);
  let P = new Set(R);
  n.overdue({
    ...sessionStartHooks,
    promise: sessionStartHooks.promise.then((L) => L.filter((q) => !P.has(q))),
  });
  return w;
}
//@ chunk-tyg7f3ek.js:508277-508678 placement
function appendSessionStartHooksWhenDone(e, overdueSessionStartHooks, r) {
  let { clears } = e;
  overdueSessionStartHooks.promise
    .then((h) => {
      if (e.clears !== clears) return;
      invalidateSessionEnvCache();
      appendLateSessionStartRows(e, h);
      if (overdueSessionStartHooks.progress?.lateInitialUserMessage)
        r(overdueSessionStartHooks.progress.lateInitialUserMessage);
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
