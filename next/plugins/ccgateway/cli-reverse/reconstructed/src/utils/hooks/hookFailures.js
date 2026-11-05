/**
 * utils/hooks/hookFailures.ts
 *
 * 2.1.316 新增：钩子失败汇总与阻断说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { realpath } from "fs/promises";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { enqueueTaskNotification } from "../task/taskNotifications.js";
import { logError } from "../log.js";
import { defaultShellKind } from "../shell/shellToolUtils.js";
import { isGuardedHookEvent } from "./hookPolicy.js";
import { GIT_FOR_WINDOWS_LINK, INSTALL_GIT_FOR_WINDOWS } from "./hookCommandResolution.js";
import { truncateToLength, countCharInString } from "../stringUtils.js";
import { isDenyingHookOutput } from "./hookSpecificOutput.js";
import {
  URL_BREAK_DESCRIPTION,
  redactUrlsInText,
  redactUrlsInMessage,
  isPlainHttpUrl,
} from "../redaction/urlRedaction.js";
import { logForDebugging } from "../debug.js";
import { getHookDisplayText } from "./hooksSettings.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";
import { getOriginalCwdOrNull, getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { POSIX_SEP_2 } from "./hookCommandAnalysis.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { findGitRootUncached, findCanonicalGitRootUncached, normalizeCommandForPlatform } from "../git.js";
import { expandPathOrNull } from "../path.js";
import { getGlobBaseDirectory_2 } from "../permissions/pathValidation.js";
import { stickyRootsFor } from "../settings/stickyRoots.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:933552-933662 placement
var PERSONAL_BLOCKING_EVENTS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:933552", () => {
  PERSONAL_BLOCKING_EVENTS_2 = new Set([
    "PreToolUse",
    "PermissionRequest",
    "PreModelSwitch",
    "UserPromptSubmit",
    "UserPromptExpansion",
  ]);
});
//@ chunk-5xgkngpb.js:933662-933795 placement
/**
 * 非阻断状态码与"按非阻断处理"的提示前缀。
 */
var NON_BLOCKING_STATUS_PREFIX = "Failed with non-blocking status code: ";
var TREATING_NON_BLOCKING_PREFIX = "Treating as non-blocking. ";
var SDK_HOST_REINITIALIZED_TEXT = "the SDK host re-initialized before answering";
//@ chunk-5xgkngpb.js:933795-933963 placement
/**
 * SDK 钩子回调失败的错误类型，消息形如 Hook callback <名> failed: <原因>。
 */
let HookCallbackFailedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:933795", () => {
  HookCallbackFailedError = class HookCallbackFailedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(hookCallbackId, reason = "the SDK host replied with an error or an invalid answer") {
      super(`Hook callback ${hookCallbackId} failed: ${reason}.`, "an SDK hook callback failed");
    }
  };
});
//@ chunk-5xgkngpb.js:933963-934131 placement
/**
 * 把钩子回调失败包装成 informational 系统消息发给界面，tag 为 hook_callback_failed。
 */
function notifyHookCallbackFailure(content, tag) {
  try {
    enqueueTaskNotification({
      type: "system",
      subtype: "informational",
      content,
      level: "warning",
      tag,
    });
  } catch (error) {
    logError(
      Error("Failed to send a hook callback notice", {
        cause: error,
      }),
    );
  }
}
//@ chunk-5xgkngpb.js:934131-934321 placement
/**
 * 组装钩子回调失败的提示文字（含 onFailure=block 时计为阻断的说明）并调用 j3o 发出。
 */
function reportHookCallbackFailure(hookEventName, error, onFailure) {
  notifyHookCallbackFailure(
    `${hookEventName}: ${error.message} ${onFailure === "block" && !PERSONAL_BLOCKING_EVENTS.has(hookEventName) ? 'onFailure is "block", so this failure counts as a block.' : "Its answer was treated as empty."}`,
    "hook_callback_failed",
  );
}
//@ chunk-5xgkngpb.js:934399-934579 placement
function blocksOnFailure(hook) {
  switch (hook.type) {
    case "command":
      return hook.onFailure === "block" && hook.async !== true && hook.asyncRewake !== true;
    case "http":
    case "callback":
      return hook.onFailure === "block";
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:934579-934591 placement
/**
 * 命令未找到的退出码 127。
 */
var EXIT_CODE_COMMAND_NOT_FOUND = 127;
//@ chunk-5xgkngpb.js:934591-934740 placement
function mayBlockForMissingBash(hook, hookEvent) {
  return (
    hook.type === "command" &&
    hook.async !== true &&
    hook.asyncRewake !== true &&
    hook.args === undefined &&
    hook.onFailure !== "continue" &&
    defaultShellKind() === "powershell" &&
    isGuardedHookEvent(hookEvent)
  );
}
//@ chunk-5xgkngpb.js:934740-934930 placement
function hookBlockingReason(hook, hookEvent, personal) {
  let canBlock =
    hook.type === "http" || (hook.type === "command" && hook.async !== true && hook.asyncRewake !== true);
  if (personal && canBlock && PERSONAL_BLOCKING_EVENTS_2.has(hookEvent)) return "personal";
  if (blocksOnFailure(hook)) return "setting";
  return mayBlockForMissingBash(hook, hookEvent) ? "noBash" : undefined;
}
//@ chunk-5xgkngpb.js:934930-936342 placement
/**
 * 说明钩子为何阻断（找不到 Git Bash、onFailure 为 block 等）。
 */
function describeBlockingHookFailure(reason, isServedCall, hook, hook_2) {
  if (hook_2)
    return `blocking because Git Bash wasn't found, so only exit code 0 or 2 counts as this hook's verdict. The hook ended with exit code 127. If its command is only quoted strings, PowerShell started no program. To run a program, install ${GIT_FOR_WINDOWS_LINK} and start a new session, or put the program in "command" and its arguments in "args" ("args": [] if it has none) and set "onFailure" to "block" so that failures still block. To print this text, such as a JSON answer, set "shell" to "powershell". The user needs to do this; Claude should not change the hook.`;
  if (reason === "setting") return 'blocking because onFailure is "block"';
  if (isServedCall) return "blocking because this hook is required.";
  return reason === "personal"
    ? "blocking because it is one of the user's own hooks, which must succeed in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG is set). The user needs to fix or remove the hook; Claude should not change it."
    : `blocking because Git Bash wasn't found, so only exit code 0 or 2 counts as this hook's verdict. ${hook.type === "command" && hook.shell === "powershell" ? 'Make the hook end with exit code 0 or 2, or set "onFailure" to "continue" to let its failures pass.' : `${INSTALL_GIT_FOR_WINDOWS} and start a new session, or put the program in "command" and its arguments in "args" ("args": [] if it has none) and set "onFailure" to "block" so that failures still block.`} The user needs to do this; Claude should not change the hook.`;
}
//@ chunk-5xgkngpb.js:936342-936414 placement
/**
 * 为报告生成钩子程序标签（MCP 为 server/tool，命令取首词）。
 */
function hookProgramLabelForReport(hook) {
  let label = hookProgramLabel(hook);
  return label === undefined ? `${hook.type} hook` : truncateToLength(label, 60);
}
//@ chunk-5xgkngpb.js:936414-936801 placement
/**
 * 生成用于报告的 hook 程序标签：MCP 工具为 server/tool，命令 hook 取第一个可安全展示的词。
 */
function hookProgramLabel(hook) {
  if (hook.type === "mcp_tool") {
    let label = `${hook.server}/${hook.tool}`;
    return /^[\w.@/-]+$/.test(label) ? label : undefined;
  }
  if (hook.type !== "command") return;
  let word = (hook.args !== undefined ? /^([\w.+@~/\\${}-]+)$/ : /^\s*([\w.+@~/\\${}"'-]+)(?:\s|$)/).exec(
    hook.command,
  )?.[1];
  if (word === undefined || countCharInString(word, '"') % 2 === 1 || countCharInString(word, "'") % 2 === 1)
    return;
  let baseName = word.split(/[/\\]/).at(-1)?.replace(/["']/g, "") ?? "";
  return /^[\w.+@~-]+$/.test(baseName) ? baseName : undefined;
}
//@ chunk-5xgkngpb.js:936801-936872 placement
var PERSONAL_BLOCKING_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:936801", () => {
  PERSONAL_BLOCKING_EVENTS = new Set(["Stop", "SubagentStop", "TaskCompleted", "TeammateIdle"]);
});
//@ chunk-5xgkngpb.js:936872-936915 placement
/**
 * 判断该钩子的非阻断错误是否应按阻断处理（排除个人阻断事件）。
 */
function blocksWhenNonBlockingError(hook, hookEvent) {
  return blocksOnFailure(hook) && !PERSONAL_BLOCKING_EVENTS.has(hookEvent);
}
//@ chunk-5xgkngpb.js:936915-937202 placement
function isDenyDecisionOutput(output, hookEvent) {
  if (hookEvent !== "PermissionRequest") return isDenyingHookOutput(output);
  let hookSpecificOutput = "hookSpecificOutput" in output ? output.hookSpecificOutput : undefined;
  return (
    hookSpecificOutput !== undefined &&
    typeof hookSpecificOutput === "object" &&
    hookSpecificOutput !== null &&
    "decision" in hookSpecificOutput &&
    typeof hookSpecificOutput.decision === "object" &&
    hookSpecificOutput.decision !== null &&
    "behavior" in hookSpecificOutput.decision &&
    hookSpecificOutput.decision.behavior === "deny"
  );
}
//@ chunk-5xgkngpb.js:937202-937261 placement
/**
 * 判断钩子是否有阻断原因且事件不在豁免列表中。
 */
function hasBlockingReason(hook, hookEvent, personal) {
  return (
    hookBlockingReason(hook, hookEvent, personal) !== undefined && !PERSONAL_BLOCKING_EVENTS.has(hookEvent)
  );
}
//@ chunk-5xgkngpb.js:937261-937468 placement
var HTTP_HOOK_ERROR_HIDDEN_NOTE = `Error details are hidden because they may contain this hook's URL, and any secrets in it can't be reliably removed. They will be shown if the URL starts with http:// or https:// and has no ${URL_BREAK_DESCRIPTION}.`;
//@ chunk-5xgkngpb.js:937468-938824 placement
/**
 * 汇总一批钩子的失败（取消、超时、非阻断错误）。
 */
function summarizeHookFailures(result, hookEvent, signal, isServedCall, personal) {
  let reason = hookBlockingReason(result.hook, hookEvent, personal);
  if (reason === undefined) return result;
  let failure =
    result.outcome === "cancelled" &&
    result.hook.type !== "callback" &&
    (signal?.aborted !== true || result.stoppedAfterItsTimeout === true)
      ? "timed out"
      : result.outcome === "non_blocking_error"
        ? "failed"
        : undefined;
  if (failure === undefined) return result;
  if (PERSONAL_BLOCKING_EVENTS.has(hookEvent)) {
    logForDebugging(
      `Hooks: ${hookEvent} ${result.hook.type} hook ${failure}; not blocking (onFailure: "block" is ignored on ${hookEvent})`,
      {
        level: "warn",
      },
    );
    return result;
  }
  let hook = result.hook;
  let redact = reason !== "setting";
  let command = !redact
    ? getHookDisplayText(hook)
    : hook.type === "http"
      ? redactSecrets(redactUrlsInText(hook.url))
      : redactSecrets(redactUrlsInMessage(getHookDisplayText(hook)));
  let attachment = result.message?.type === "attachment" ? result.message.attachment : undefined;
  let stderr =
    !isServedCall && attachment?.type === "hook_non_blocking_error" ? attachment.stderr.trim() : "";
  let replaced = (
    stderr.startsWith(NON_BLOCKING_STATUS_PREFIX) ? stderr.slice(NON_BLOCKING_STATUS_PREFIX.length) : stderr
  ).replace(TREATING_NON_BLOCKING_PREFIX, "");
  let safeUrl = hook.type !== "http" || isPlainHttpUrl(hook.url);
  let detail =
    !redact || replaced === ""
      ? replaced
      : safeUrl
        ? redactSecrets(redactUrlsInMessage(replaced))
        : HTTP_HOOK_ERROR_HIDDEN_NOTE;
  let missingBash =
    !isServedCall &&
    attachment?.type === "hook_non_blocking_error" &&
    attachment.exitCode === EXIT_CODE_COMMAND_NOT_FOUND &&
    hook.type === "command" &&
    hook.shell === undefined &&
    mayBlockForMissingBash(hook, hookEvent);
  let text = `[${command}]: ${failure}; ${describeBlockingHookFailure(reason, isServedCall, hook, missingBash)}${
    detail === ""
      ? ""
      : `
${detail}`
  }`;
  logForDebugging(
    `Hooks: ${hookEvent} ${result.hook.type} hook ${failure}; blocking (${reason === "personal" ? "personal hook, CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG" : reason === "setting" ? 'onFailure: "block"' : "no Git Bash"})`,
    {
      level: "warn",
    },
  );
  return {
    ...result,
    message: undefined,
    blockingError: {
      blockingError: text,
      command,
      ...promptEndingFields(hookEvent, {
        noVerdict: failure === "timed out" ? "hook_timed_out" : "hook_failed",
      }),
    },
    ...(hookEvent === "PermissionRequest" && {
      permissionRequestResult: {
        behavior: "deny",
        message: text,
      },
    }),
    suppressOriginalPrompt: true,
    outcome: "blocking",
  };
}
//@ chunk-5xgkngpb.js:938824-939078 placement
function applyBlockOnFailure(hook, hook_2) {
  if (!blocksOnFailure(hook) || hook_2.succeeded || hook_2.blocked || hook_2.cancelled === true)
    return hook_2;
  let wasCancelled = hook_2.output === "Hook cancelled";
  let detail = wasCancelled ? "" : hook_2.output.trim();
  return {
    ...hook_2,
    blocked: true,
    output: `${wasCancelled ? "timed out" : "failed"}; blocking because onFailure is "block"${
      detail === ""
        ? ""
        : `
${detail}`
    }`,
  };
}
//@ chunk-5xgkngpb.js:939119-939410 placement
/**
 * 生成钩子路径检查的根目录（启动目录、git 根、附加目录及其真实路径）。
 */
async function hookPathRoots() {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull === null) return [POSIX_SEP_2];
  let candidates = normalizeCaseForComparison_2(
    [
      originalCwdOrNull,
      findGitRootUncached(originalCwdOrNull),
      findCanonicalGitRootUncached(originalCwdOrNull),
      ...getAdditionalDirectoriesForClaudeMd().map((directory) => {
        let path = expandPathOrNull(directory, originalCwdOrNull);
        return path === null ? directory : (getGlobBaseDirectory_2(path) ?? path);
      }),
    ].filter((value) => value !== null),
  );
  let results = await Promise.all(candidates.map((path) => realpath(path).catch(() => path)));
  return stickyRootsFor({
    launchDir: originalCwdOrNull,
    launchDirReal: results[0] ?? originalCwdOrNull,
    extra: [...candidates, ...results],
  }).map(normalizeCommandForPlatform);
}
export {
  HookCallbackFailedError,
  SDK_HOST_REINITIALIZED_TEXT,
  reportHookCallbackFailure,
  notifyHookCallbackFailure,
  mayBlockForMissingBash,
  EXIT_CODE_COMMAND_NOT_FOUND,
  hookPathRoots,
  hookProgramLabelForReport,
  blocksOnFailure,
  blocksWhenNonBlockingError,
  hasBlockingReason,
  isDenyDecisionOutput,
  TREATING_NON_BLOCKING_PREFIX,
  NON_BLOCKING_STATUS_PREFIX,
  summarizeHookFailures,
  applyBlockOnFailure,
  PERSONAL_BLOCKING_EVENTS,
  PERSONAL_BLOCKING_EVENTS_2,
};
