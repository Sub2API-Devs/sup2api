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
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import { defaultShellKind } from "../shell/shellToolUtils.js";
import { W0 } from "./hookPolicy.js";
import { GIT_FOR_WINDOWS_LINK, INSTALL_GIT_FOR_WINDOWS } from "./hookCommandResolution.js";
import { truncateToLength, countCharInString } from "../stringUtils.js";
import { isDenyingHookOutput } from "./hookSpecificOutput.js";
import {
  URL_BREAK_DESCRIPTION,
  redactUrlsInText,
  redactUrlsInMessage,
  WDi,
} from "../redaction/urlRedaction.js";
import { logForDebugging } from "../debug.js";
import { getHookDisplayText } from "./hooksSettings.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";
import { getOriginalCwdOrNull, getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { POSIX_SEP } from "./hookCommandAnalysis.js";
import { uniq } from "../collections.js";
import { findGitRootUncached, findCanonicalGitRootUncached, normalizeCommandForPlatform } from "../git.js";
import { expandPathOrNull } from "../path.js";
import { getGlobBaseDirectory_2 } from "../permissions/pathValidation.js";
import { stickyRootsFor } from "../settings/stickyRoots.js";

//@ chunk-e6aww6q8.js:923051-923161 placement
var PERSONAL_BLOCKING_EVENTS = new Set([
  "PreToolUse",
  "PermissionRequest",
  "PreModelSwitch",
  "UserPromptSubmit",
  "UserPromptExpansion",
]);
//@ chunk-e6aww6q8.js:923161-923243 placement
var Vge = "Failed with non-blocking status code: ",
  b1e = "Treating as non-blocking. ";
//@ chunk-e6aww6q8.js:923243-923409 placement
function blocksOnFailure(e) {
  switch (e.type) {
    case "command":
      return e.onFailure === "block" && e.async !== !0 && e.asyncRewake !== !0;
    case "http":
      return e.onFailure === "block";
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:923409-923421 placement
var T1e = 127;
//@ chunk-e6aww6q8.js:923421-923570 placement
function mayBlockForMissingBash(e, n) {
  return (
    e.type === "command" &&
    e.async !== !0 &&
    e.asyncRewake !== !0 &&
    e.args === void 0 &&
    e.onFailure !== "continue" &&
    defaultShellKind() === "powershell" &&
    W0(n)
  );
}
//@ chunk-e6aww6q8.js:923570-923761 placement
function hookBlockingReason(e, n, r) {
  let s = e.type === "http" || (e.type === "command" && e.async !== !0 && e.asyncRewake !== !0);
  if (r && s && PERSONAL_BLOCKING_EVENTS.has(n)) return "personal";
  if (blocksOnFailure(e)) return "setting";
  return mayBlockForMissingBash(e, n) ? "noBash" : void 0;
}
/**
 * 说明钩子为何阻断（找不到 Git Bash、onFailure 为 block 等）。
 */
//@ chunk-e6aww6q8.js:923761-925173 placement
function describeBlockingHookFailure(e, n, r, s) {
  if (s)
    return `blocking because Git Bash wasn't found, so only exit code 0 or 2 counts as this hook's verdict. The hook ended with exit code 127. If its command is only quoted strings, PowerShell started no program. To run a program, install ${GIT_FOR_WINDOWS_LINK} and start a new session, or put the program in "command" and its arguments in "args" ("args": [] if it has none) and set "onFailure" to "block" so that failures still block. To print this text, such as a JSON answer, set "shell" to "powershell". The user needs to do this; Claude should not change the hook.`;
  if (e === "setting") return 'blocking because onFailure is "block"';
  if (n) return "blocking because this hook is required.";
  return e === "personal"
    ? "blocking because it is one of the user's own hooks, which must succeed in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG is set). The user needs to fix or remove the hook; Claude should not change it."
    : `blocking because Git Bash wasn't found, so only exit code 0 or 2 counts as this hook's verdict. ${r.type === "command" && r.shell === "powershell" ? 'Make the hook end with exit code 0 or 2, or set "onFailure" to "continue" to let its failures pass.' : `${INSTALL_GIT_FOR_WINDOWS} and start a new session, or put the program in "command" and its arguments in "args" ("args": [] if it has none) and set "onFailure" to "block" so that failures still block.`} The user needs to do this; Claude should not change the hook.`;
}
//@ chunk-e6aww6q8.js:925173-925246 placement
function VBt(e) {
  let n = hookProgramLabel(e);
  return n === void 0 ? `${e.type} hook` : truncateToLength(n, 60);
}
/**
 * 生成用于报告的 hook 程序标签：MCP 工具为 server/tool，命令 hook 取第一个可安全展示的词。
 */
//@ chunk-e6aww6q8.js:925246-925633 placement
function hookProgramLabel(e) {
  if (e.type === "mcp_tool") {
    let s = `${e.server}/${e.tool}`;
    return /^[\w.@/-]+$/.test(s) ? s : void 0;
  }
  if (e.type !== "command") return;
  let n = (e.args !== void 0 ? /^([\w.+@~/\\${}-]+)$/ : /^\s*([\w.+@~/\\${}"'-]+)(?:\s|$)/).exec(
    e.command,
  )?.[1];
  if (n === void 0 || countCharInString(n, '"') % 2 === 1 || countCharInString(n, "'") % 2 === 1) return;
  let r = n.split(/[/\\]/).at(-1)?.replace(/["']/g, "") ?? "";
  return /^[\w.+@~-]+$/.test(r) ? r : void 0;
}
//@ chunk-e6aww6q8.js:925633-925705 placement
var v1e = new Set(["Stop", "SubagentStop", "TaskCompleted", "TeammateIdle"]);
//@ chunk-e6aww6q8.js:925705-925750 placement
function E1e(e, n) {
  return blocksOnFailure(e) && !v1e.has(n);
}
//@ chunk-e6aww6q8.js:925750-926037 placement
function isDenyDecisionOutput(e, n) {
  if (n !== "PermissionRequest") return isDenyingHookOutput(e);
  let r = "hookSpecificOutput" in e ? e.hookSpecificOutput : void 0;
  return (
    r !== void 0 &&
    typeof r === "object" &&
    r !== null &&
    "decision" in r &&
    typeof r.decision === "object" &&
    r.decision !== null &&
    "behavior" in r.decision &&
    r.decision.behavior === "deny"
  );
}
//@ chunk-e6aww6q8.js:926037-926097 placement
function XBt(e, n, r) {
  return hookBlockingReason(e, n, r) !== void 0 && !v1e.has(n);
}
//@ chunk-e6aww6q8.js:926097-926304 placement
var HTTP_HOOK_ERROR_HIDDEN_NOTE = `Error details are hidden because they may contain this hook's URL, and any secrets in it can't be reliably removed. They will be shown if the URL starts with http:// or https:// and has no ${URL_BREAK_DESCRIPTION}.`;
/**
 * 汇总一批钩子的失败（取消、超时、非阻断错误）。
 */
//@ chunk-e6aww6q8.js:926304-927631 placement
function summarizeHookFailures(e, n, r, s, h) {
  let y = hookBlockingReason(e.hook, n, h);
  if (y === void 0) return e;
  let S =
    e.outcome === "cancelled" && (r?.aborted !== !0 || e.stoppedAfterItsTimeout === !0)
      ? "timed out"
      : e.outcome === "non_blocking_error"
        ? "failed"
        : void 0;
  if (S === void 0) return e;
  if (v1e.has(n))
    return (
      logForDebugging(
        `Hooks: ${n} ${e.hook.type} hook ${S}; not blocking (onFailure: "block" is ignored on ${n})`,
        { level: "warn" },
      ),
      e
    );
  let hook = e.hook,
    L = y !== "setting",
    G = !L
      ? getHookDisplayText(hook)
      : hook.type === "http"
        ? redactSecrets(redactUrlsInText(hook.url))
        : redactSecrets(redactUrlsInMessage(getHookDisplayText(hook))),
    q = e.message?.type === "attachment" ? e.message.attachment : void 0,
    Z = !s && q?.type === "hook_non_blocking_error" ? q.stderr.trim() : "",
    replaced = (Z.startsWith(Vge) ? Z.slice(Vge.length) : Z).replace(b1e, ""),
    ke = hook.type !== "http" || WDi(hook.url),
    we =
      !L || replaced === ""
        ? replaced
        : ke
          ? redactSecrets(redactUrlsInMessage(replaced))
          : HTTP_HOOK_ERROR_HIDDEN_NOTE,
    Ee =
      !s &&
      q?.type === "hook_non_blocking_error" &&
      q.exitCode === T1e &&
      hook.type === "command" &&
      hook.shell === void 0 &&
      mayBlockForMissingBash(hook, n),
    Ae = `[${G}]: ${S}; ${describeBlockingHookFailure(y, s, hook, Ee)}${
      we === ""
        ? ""
        : `
${we}`
    }`;
  return (
    logForDebugging(
      `Hooks: ${n} ${e.hook.type} hook ${S}; blocking (${y === "personal" ? "personal hook, CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG" : y === "setting" ? 'onFailure: "block"' : "no Git Bash"})`,
      { level: "warn" },
    ),
    {
      ...e,
      message: void 0,
      blockingError: {
        blockingError: Ae,
        command: G,
        ...promptEndingFields(n, { noVerdict: S === "timed out" ? "hook_timed_out" : "hook_failed" }),
      },
      ...(n === "PermissionRequest" && { permissionRequestResult: { behavior: "deny", message: Ae } }),
      suppressOriginalPrompt: !0,
      outcome: "blocking",
    }
  );
}
//@ chunk-e6aww6q8.js:927631-927886 placement
function applyBlockOnFailure(e, n) {
  if (!blocksOnFailure(e) || n.succeeded || n.blocked || n.cancelled === !0) return n;
  let r = n.output === "Hook cancelled",
    s = r ? "" : n.output.trim();
  return {
    ...n,
    blocked: !0,
    output: `${r ? "timed out" : "failed"}; blocking because onFailure is "block"${
      s === ""
        ? ""
        : `
${s}`
    }`,
  };
}
//@ chunk-e6aww6q8.js:927927-928218 placement
async function R1e() {
  let e = getOriginalCwdOrNull();
  if (e === null) return [POSIX_SEP];
  let n = uniq(
      [
        e,
        findGitRootUncached(e),
        findCanonicalGitRootUncached(e),
        ...getAdditionalDirectoriesForClaudeMd().map((s) => {
          let h = expandPathOrNull(s, e);
          return h === null ? s : (getGlobBaseDirectory_2(h) ?? h);
        }),
      ].filter((s) => s !== null),
    ),
    results = await Promise.all(n.map((s) => realpath_14(s).catch(() => s)));
  return stickyRootsFor({ launchDir: e, launchDirReal: results[0] ?? e, extra: [...n, ...results] }).map(
    normalizeCommandForPlatform,
  );
}

export {
  mayBlockForMissingBash,
  T1e,
  R1e,
  VBt,
  E1e,
  XBt,
  isDenyDecisionOutput,
  b1e,
  Vge,
  summarizeHookFailures,
  applyBlockOnFailure,
  PERSONAL_BLOCKING_EVENTS,
};
