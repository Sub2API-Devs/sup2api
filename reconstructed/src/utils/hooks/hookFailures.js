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

//@ chunk-e6aww6q8.js:923051-923161 placement
var PERSONAL_BLOCKING_EVENTS_2 = new Set([
  "PreToolUse",
  "PermissionRequest",
  "PreModelSwitch",
  "UserPromptSubmit",
  "UserPromptExpansion",
]);
//@ chunk-e6aww6q8.js:923161-923243 placement
/**
 * 非阻断状态码与"按非阻断处理"的提示前缀。
 */
var NON_BLOCKING_STATUS_PREFIX = "Failed with non-blocking status code: ";
var TREATING_NON_BLOCKING_PREFIX = "Treating as non-blocking. ";
//@ chunk-e6aww6q8.js:923243-923409 placement
function blocksOnFailure(e) {
  switch (e.type) {
    case "command":
      return e.onFailure === "block" && e.async !== true && e.asyncRewake !== true;
    case "http":
      return e.onFailure === "block";
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
function mayBlockForMissingBash(hook, n) {
  return (
    hook.type === "command" &&
    hook.async !== true &&
    hook.asyncRewake !== true &&
    hook.args === undefined &&
    hook.onFailure !== "continue" &&
    defaultShellKind() === "powershell" &&
    isGuardedHookEvent(n)
  );
}
//@ chunk-e6aww6q8.js:923570-923761 placement
function hookBlockingReason(e, n, r) {
  let s = e.type === "http" || (e.type === "command" && e.async !== true && e.asyncRewake !== true);
  if (r && s && PERSONAL_BLOCKING_EVENTS_2.has(n)) return "personal";
  if (blocksOnFailure(e)) return "setting";
  return mayBlockForMissingBash(e, n) ? "noBash" : undefined;
}
//@ chunk-e6aww6q8.js:923761-925173 placement
/**
 * 说明钩子为何阻断（找不到 Git Bash、onFailure 为 block 等）。
 */
function describeBlockingHookFailure(e, n, hook, s) {
  if (s)
    return `blocking because Git Bash wasn't found, so only exit code 0 or 2 counts as this hook's verdict. The hook ended with exit code 127. If its command is only quoted strings, PowerShell started no program. To run a program, install ${GIT_FOR_WINDOWS_LINK} and start a new session, or put the program in "command" and its arguments in "args" ("args": [] if it has none) and set "onFailure" to "block" so that failures still block. To print this text, such as a JSON answer, set "shell" to "powershell". The user needs to do this; Claude should not change the hook.`;
  if (e === "setting") return 'blocking because onFailure is "block"';
  if (n) return "blocking because this hook is required.";
  return e === "personal"
    ? "blocking because it is one of the user's own hooks, which must succeed in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG is set). The user needs to fix or remove the hook; Claude should not change it."
    : `blocking because Git Bash wasn't found, so only exit code 0 or 2 counts as this hook's verdict. ${hook.type === "command" && hook.shell === "powershell" ? 'Make the hook end with exit code 0 or 2, or set "onFailure" to "continue" to let its failures pass.' : `${INSTALL_GIT_FOR_WINDOWS} and start a new session, or put the program in "command" and its arguments in "args" ("args": [] if it has none) and set "onFailure" to "block" so that failures still block.`} The user needs to do this; Claude should not change the hook.`;
}
//@ chunk-e6aww6q8.js:925173-925246 placement
/**
 * 为报告生成钩子程序标签（MCP 为 server/tool，命令取首词）。
 */
function hookProgramLabelForReport(hook) {
  let n = hookProgramLabel(hook);
  return n === undefined ? `${hook.type} hook` : truncateToLength(n, 60);
}
//@ chunk-e6aww6q8.js:925246-925633 placement
/**
 * 生成用于报告的 hook 程序标签：MCP 工具为 server/tool，命令 hook 取第一个可安全展示的词。
 */
function hookProgramLabel(e) {
  if (e.type === "mcp_tool") {
    let s = `${e.server}/${e.tool}`;
    return /^[\w.@/-]+$/.test(s) ? s : undefined;
  }
  if (e.type !== "command") return;
  let n = (e.args !== undefined ? /^([\w.+@~/\\${}-]+)$/ : /^\s*([\w.+@~/\\${}"'-]+)(?:\s|$)/).exec(
    e.command,
  )?.[1];
  if (n === undefined || countCharInString(n, '"') % 2 === 1 || countCharInString(n, "'") % 2 === 1) return;
  let r = n.split(/[/\\]/).at(-1)?.replace(/["']/g, "") ?? "";
  return /^[\w.+@~-]+$/.test(r) ? r : undefined;
}
//@ chunk-e6aww6q8.js:925633-925705 placement
var PERSONAL_BLOCKING_EVENTS = new Set(["Stop", "SubagentStop", "TaskCompleted", "TeammateIdle"]);
//@ chunk-e6aww6q8.js:925705-925750 placement
/**
 * 判断该钩子的非阻断错误是否应按阻断处理（排除个人阻断事件）。
 */
function blocksWhenNonBlockingError(hook, hookEvent) {
  return blocksOnFailure(hook) && !PERSONAL_BLOCKING_EVENTS.has(hookEvent);
}
//@ chunk-e6aww6q8.js:925750-926037 placement
function isDenyDecisionOutput(e, hookEvent) {
  if (hookEvent !== "PermissionRequest") return isDenyingHookOutput(e);
  let hookSpecificOutput = "hookSpecificOutput" in e ? e.hookSpecificOutput : undefined;
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
function hasBlockingReason(hook, hookEvent, r) {
  return hookBlockingReason(hook, hookEvent, r) !== undefined && !PERSONAL_BLOCKING_EVENTS.has(hookEvent);
}
//@ chunk-e6aww6q8.js:926097-926304 placement
var HTTP_HOOK_ERROR_HIDDEN_NOTE = `Error details are hidden because they may contain this hook's URL, and any secrets in it can't be reliably removed. They will be shown if the URL starts with http:// or https:// and has no ${URL_BREAK_DESCRIPTION}.`;
//@ chunk-e6aww6q8.js:926304-927631 placement
/**
 * 汇总一批钩子的失败（取消、超时、非阻断错误）。
 */
function summarizeHookFailures(e, hookEvent, signal, isServedCall, h) {
  let y = hookBlockingReason(e.hook, hookEvent, h);
  if (y === undefined) return e;
  let S =
    e.outcome === "cancelled" && (signal?.aborted !== true || e.stoppedAfterItsTimeout === true)
      ? "timed out"
      : e.outcome === "non_blocking_error"
        ? "failed"
        : undefined;
  if (S === undefined) return e;
  if (PERSONAL_BLOCKING_EVENTS.has(hookEvent)) {
    logForDebugging(
      `Hooks: ${hookEvent} ${e.hook.type} hook ${S}; not blocking (onFailure: "block" is ignored on ${hookEvent})`,
      {
        level: "warn",
      },
    );
    return e;
  }
  let hook = e.hook;
  let L = y !== "setting";
  let G = !L
    ? getHookDisplayText(hook)
    : hook.type === "http"
      ? redactSecrets(redactUrlsInText(hook.url))
      : redactSecrets(redactUrlsInMessage(getHookDisplayText(hook)));
  let attachment = e.message?.type === "attachment" ? e.message.attachment : undefined;
  let Z = !isServedCall && attachment?.type === "hook_non_blocking_error" ? attachment.stderr.trim() : "";
  let replaced = (
    Z.startsWith(NON_BLOCKING_STATUS_PREFIX) ? Z.slice(NON_BLOCKING_STATUS_PREFIX.length) : Z
  ).replace(TREATING_NON_BLOCKING_PREFIX, "");
  let ke = hook.type !== "http" || isPlainHttpUrl(hook.url);
  let we =
    !L || replaced === ""
      ? replaced
      : ke
        ? redactSecrets(redactUrlsInMessage(replaced))
        : HTTP_HOOK_ERROR_HIDDEN_NOTE;
  let Ee =
    !isServedCall &&
    attachment?.type === "hook_non_blocking_error" &&
    attachment.exitCode === EXIT_CODE_COMMAND_NOT_FOUND &&
    hook.type === "command" &&
    hook.shell === undefined &&
    mayBlockForMissingBash(hook, hookEvent);
  let Ae = `[${G}]: ${S}; ${describeBlockingHookFailure(y, isServedCall, hook, Ee)}${
    we === ""
      ? ""
      : `
${we}`
  }`;
  logForDebugging(
    `Hooks: ${hookEvent} ${e.hook.type} hook ${S}; blocking (${y === "personal" ? "personal hook, CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG" : y === "setting" ? 'onFailure: "block"' : "no Git Bash"})`,
    {
      level: "warn",
    },
  );
  return {
    ...e,
    message: undefined,
    blockingError: {
      blockingError: Ae,
      command: G,
      ...promptEndingFields(hookEvent, {
        noVerdict: S === "timed out" ? "hook_timed_out" : "hook_failed",
      }),
    },
    ...(hookEvent === "PermissionRequest" && {
      permissionRequestResult: {
        behavior: "deny",
        message: Ae,
      },
    }),
    suppressOriginalPrompt: true,
    outcome: "blocking",
  };
}
//@ chunk-e6aww6q8.js:927631-927886 placement
function applyBlockOnFailure(hook, n) {
  if (!blocksOnFailure(hook) || n.succeeded || n.blocked || n.cancelled === true) return n;
  let r = n.output === "Hook cancelled";
  let s = r ? "" : n.output.trim();
  return {
    ...n,
    blocked: true,
    output: `${r ? "timed out" : "failed"}; blocking because onFailure is "block"${
      s === ""
        ? ""
        : `
${s}`
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
  let n = uniq(
    [
      originalCwdOrNull,
      findGitRootUncached(originalCwdOrNull),
      findCanonicalGitRootUncached(originalCwdOrNull),
      ...getAdditionalDirectoriesForClaudeMd().map((s) => {
        let path = expandPathOrNull(s, originalCwdOrNull);
        return path === null ? s : (getGlobBaseDirectory_2(path) ?? path);
      }),
    ].filter((s) => s !== null),
  );
  let results = await Promise.all(n.map((s) => realpath(s).catch(() => s)));
  return stickyRootsFor({
    launchDir: originalCwdOrNull,
    launchDirReal: results[0] ?? originalCwdOrNull,
    extra: [...n, ...results],
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
