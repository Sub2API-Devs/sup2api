/**
 * utils/hooks/hookFailures.ts
 *
 * 2.1.316 新增：钩子失败汇总与阻断说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { realpath } from "fs/promises";
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
import { uniq } from "../collections.js";
import { findGitRootUncached, findCanonicalGitRootUncached, normalizeCommandForPlatform } from "../git.js";
import { expandPathOrNull } from "../path.js";
import { getGlobBaseDirectory_2 } from "../permissions/pathValidation.js";
import { stickyRootsFor } from "../settings/stickyRoots.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:923051-923161 placement
var PERSONAL_BLOCKING_EVENTS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:923051", () => {
  PERSONAL_BLOCKING_EVENTS_2 = new Set([
    "PreToolUse",
    "PermissionRequest",
    "PreModelSwitch",
    "UserPromptSubmit",
    "UserPromptExpansion",
  ]);
});
//@ chunk-e6aww6q8.js:923161-923243 placement
/**
 * 非阻断状态码与"按非阻断处理"的提示前缀。
 */
var NON_BLOCKING_STATUS_PREFIX = "Failed with non-blocking status code: ";
var TREATING_NON_BLOCKING_PREFIX = "Treating as non-blocking. ";
//@ chunk-e6aww6q8.js:923243-923409 placement
function blocksOnFailure(hook) {
  switch (hook.type) {
    case "command":
      return hook.onFailure === "block" && hook.async !== true && hook.asyncRewake !== true;
    case "http":
      return hook.onFailure === "block";
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:923409-923421 placement
/**
 * 命令未找到的退出码 127。
 */
var EXIT_CODE_COMMAND_NOT_FOUND = 127;
//@ chunk-e6aww6q8.js:923421-923570 placement
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
//@ chunk-e6aww6q8.js:923570-923761 placement
function hookBlockingReason(hook, hookEvent, personal) {
  let canBlock =
    hook.type === "http" || (hook.type === "command" && hook.async !== true && hook.asyncRewake !== true);
  if (personal && canBlock && PERSONAL_BLOCKING_EVENTS_2.has(hookEvent)) return "personal";
  if (blocksOnFailure(hook)) return "setting";
  return mayBlockForMissingBash(hook, hookEvent) ? "noBash" : undefined;
}
//@ chunk-e6aww6q8.js:923761-925173 placement
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
//@ chunk-e6aww6q8.js:925173-925246 placement
/**
 * 为报告生成钩子程序标签（MCP 为 server/tool，命令取首词）。
 */
function hookProgramLabelForReport(hook) {
  let label = hookProgramLabel(hook);
  return label === undefined ? `${hook.type} hook` : truncateToLength(label, 60);
}
//@ chunk-e6aww6q8.js:925246-925633 placement
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
//@ chunk-e6aww6q8.js:925633-925705 placement
var PERSONAL_BLOCKING_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:925633", () => {
  PERSONAL_BLOCKING_EVENTS = new Set(["Stop", "SubagentStop", "TaskCompleted", "TeammateIdle"]);
});
//@ chunk-e6aww6q8.js:925705-925750 placement
/**
 * 判断该钩子的非阻断错误是否应按阻断处理（排除个人阻断事件）。
 */
function blocksWhenNonBlockingError(hook, hookEvent) {
  return blocksOnFailure(hook) && !PERSONAL_BLOCKING_EVENTS.has(hookEvent);
}
//@ chunk-e6aww6q8.js:925750-926037 placement
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
//@ chunk-e6aww6q8.js:926037-926097 placement
/**
 * 判断钩子是否有阻断原因且事件不在豁免列表中。
 */
function hasBlockingReason(hook, hookEvent, personal) {
  return (
    hookBlockingReason(hook, hookEvent, personal) !== undefined && !PERSONAL_BLOCKING_EVENTS.has(hookEvent)
  );
}
//@ chunk-e6aww6q8.js:926097-926304 placement
var HTTP_HOOK_ERROR_HIDDEN_NOTE; // deferred: uses URL_IN_TEXT_RE (../redaction/urlRedaction.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:926097", () => {
  HTTP_HOOK_ERROR_HIDDEN_NOTE = `Error details are hidden because they may contain this hook's URL, and any secrets in it can't be reliably removed. They will be shown if the URL starts with http:// or https:// and has no ${URL_BREAK_DESCRIPTION}.`;
});
//@ chunk-e6aww6q8.js:926304-927631 placement
/**
 * 汇总一批钩子的失败（取消、超时、非阻断错误）。
 */
function summarizeHookFailures(result, hookEvent, signal, isServedCall, personal) {
  let reason = hookBlockingReason(result.hook, hookEvent, personal);
  if (reason === undefined) return result;
  let failure =
    result.outcome === "cancelled" && (signal?.aborted !== true || result.stoppedAfterItsTimeout === true)
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
//@ chunk-e6aww6q8.js:927631-927886 placement
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
//@ chunk-e6aww6q8.js:927927-928218 placement
/**
 * 生成钩子路径检查的根目录（启动目录、git 根、附加目录及其真实路径）。
 */
async function hookPathRoots() {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull === null) return [POSIX_SEP_2];
  let candidates = uniq(
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
  mayBlockForMissingBash,
  EXIT_CODE_COMMAND_NOT_FOUND,
  hookPathRoots,
  hookProgramLabelForReport,
  blocksWhenNonBlockingError,
  hasBlockingReason,
  isDenyDecisionOutput,
  TREATING_NON_BLOCKING_PREFIX,
  NON_BLOCKING_STATUS_PREFIX,
  summarizeHookFailures,
  applyBlockOnFailure,
  PERSONAL_BLOCKING_EVENTS_2,
};
