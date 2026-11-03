/**
 * utils/hooks/servedHooks/destructiveCommands.ts
 *
 * 2.1.316 新增：服务端下发钩子的破坏性命令表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import { uniq } from "../../collections.js";
import { getDestructiveTargetCategory } from "../../../tools/BashTool/destructiveTargets.js";
import { splitCommandStrict } from "../../bash/commands.js";
import { toolMatchesName } from "../../../Tool.js";
import { STRUCTUREDOUTPUT } from "../../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { toolMatchesAnyName } from "../../../services/tools/permissionCheckGuard.js";
import { EXTERNAL_ALWAYS_AVAILABLE_TOOLS } from "../../toolPool.js";
import { AGENT } from "../../../tools/AgentTool/constants.js";
import { POLL } from "../../../tools/PollTool/prompt.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";

//@ chunk-e6aww6q8.js:3393213-3394222 placement
/**
 * 检测破坏性命令的长度上限与正则集合（rm、git reset/clean、push、kubectl、terraform 等）。
 */
var MAX_COMMAND_CHARS_TO_CHECK = 1e4;
var DESTRUCTIVE_COMMAND_PATTERNS = [
  /(^|[;&|\n(`][ \t]*)(?:rm|git\s+(?:reset|clean|checkout|restore|stash))\b[^;&|\n]*(?:['"$`]|\{[^{}\s]*(?:,|\.\.)[^{}\s]*\})/,
  /(^|[;&|\n(`][ \t]*)(?:git\s+(?:push|branch)|find|kubectl|terraform)\b[^;&|\n]*(?:[$`]|\{[^{}\s]*(?:,|\.\.)[^{}\s]*\})/,
  /\bgit\s+push\b[^;&|\n]*(?:\s\+\S|\s:\S|\s--delete\b|\s-d\b)/,
  /(?:\bxargs\b|(?:^|\s)-(?:exec|ok)(?:dir)?\b)[^;&|\n]*\b(?:rm|git\s+(?:push|branch|reset|clean|checkout)|kubectl|terraform|find|(?:ba|z|da|k|mk)?sh)\b/,
  /(^|[;&|\n(`][ \t]*)(?:rm|git|find|kubectl|terraform)\b[^;&|\n]*\{[^{}\s]*,[^{}\s]*\{/,
  /\bgit\b[^;&|\n]*\s-c\s*alias\./,
  /(^|[;&|\n(`][ \t]*)rm\s+(?:\S+\s+)*(?:-[a-zA-Z]*[rRf][a-zA-Z]*|--recursive|--force)(?=[\s`]|$)/,
  /\bfind\b[^;&|\n]*\s-(?:delete|rm)\b/,
  /(^|[;&|\n(`][ \t]*)shred\s/,
  /\bgit\s+clean\b(?![^;&|\n]*(?:-[a-zA-Z]*n|--dry-run))[^;&|\n]*\s-[a-zA-Z]*f/,
];
var COMMAND_PREFIX_WRAPPERS_RE =
  /^(?:[(`\s]+|\\|\S*\/(?=[^\s/])|(?:\w+=\S*\s+)+|(?:command|builtin|exec|nohup|sudo|doas|env|nice|time|xargs|stdbuf|busybox|timeout\s+\S+)\s+(?:-\S+\s+|\w+=\S*\s+)*)/;
//@ chunk-e6aww6q8.js:3394222-3394410 placement
/**
 * 判断 Bash 命令是否可能具破坏性（rm -rf、git push --delete/force、git clean -f、find -delete、kubectl/terraform 等）：过长或嵌套过深时直接视为破坏性；会展开 sh -c、eval 与反引号里的命令递归检查。
 */
function isDestructiveCommand(e, n = 0) {
  if (e.length > MAX_COMMAND_CHARS_TO_CHECK || n > MAX_PIPE_HOPS) return true;
  let r = splitCommandOrUndefined(e);
  if (r === undefined) return true;
  return uniq([e, ...r]).some((s) => {
    let h = stripCommandWrappers(s);
    let nestedShellCommand = extractNestedShellCommand(h);
    return (
      matchesDestructivePattern(s) ||
      matchesDestructivePattern(h) ||
      (nestedShellCommand !== undefined && isDestructiveCommand(nestedShellCommand, n + 1))
    );
  });
}
//@ chunk-e6aww6q8.js:3394410-3394420 placement
var MAX_PIPE_HOPS = 3;
//@ chunk-e6aww6q8.js:3394420-3394885 placement
/**
 * 判断命令是否把输出管道给 shell 执行。
 */
function pipesIntoShell(e) {
  return e
    .replace(/(?<!\\)>\|/g, "> ")
    .split("|")
    .slice(1)
    .some((n) => {
      let filtered = n
        .trim()
        .replace(/^&\s*/, "")
        .split(/[ \t]+/)
        .filter(
          (S, w, L) =>
            !/^(?:\d*[<>]{1,2}&?\S*|&>{1,2}\S*)$/.test(S) &&
            !(w > 0 && /^(?:\d*[<>]{1,2}&?|&>{1,2})$/.test(L[w - 1])),
        );
      if (filtered.some((S) => ASSIGNMENT_RE.test(S) && /["'`$\\]/.test(S))) return true;
      let index = filtered.findIndex((S) => !ASSIGNMENT_RE.test(S));
      let h =
        filtered
          .slice(index === -1 ? filtered.length : index)
          .join(" ")
          .split(/[<>;&)]/, 1)[0] ?? "";
      let y = stripCommandWrappers(h).split(/[ \t]+/, 1)[0] ?? "";
      return SHELL_PROGRAM_RE.test(y);
    });
}
//@ chunk-e6aww6q8.js:3394885-3394961 placement
var SHELL_PROGRAM_RE = /^(?:\S*\/)?(?:ba|z|da|k|mk)?sh$/;
var ASSIGNMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
//@ chunk-e6aww6q8.js:3394961-3395080 placement
function matchesDestructivePattern(e) {
  let n = stripQuotesAndSlashes(e);
  return [e, n, stripQuotesAndSlashes(stripGitKubectlGlobalOptions(e)), stripGitKubectlGlobalOptions(n)].some(
    (r) =>
      getDestructiveTargetCategory(r) !== null ||
      DESTRUCTIVE_COMMAND_PATTERNS.some((s) => s.test(r)) ||
      pipesIntoShell(r),
  );
}
//@ chunk-e6aww6q8.js:3395080-3395474 placement
/**
 * git、kubectl 等命令带值的全局选项集合。
 */
var TOOL_OPTIONS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "-n",
  "-s",
  "--namespace",
  "--context",
  "--cluster",
  "--kubeconfig",
  "--user",
  "--token",
  "--server",
  "--as",
  "--git-dir",
  "--work-tree",
  "--exec-path",
  "--config-env",
  "--request-timeout",
  "--as-group",
  "--as-uid",
  "--username",
  "--password",
  "--cache-dir",
  "--certificate-authority",
  "--client-certificate",
  "--client-key",
  "--tls-server-name",
  "--profile",
  "--profile-output",
  "-v",
  "--v",
]);
//@ chunk-e6aww6q8.js:3395474-3395781 placement
/**
 * 去掉 git、kubectl、terraform 的全局选项，便于识别子命令。
 */
function stripGitKubectlGlobalOptions(e) {
  let n = splitShellWords_2(e);
  let r = [];
  for (let s = 0; s < n.length; s += 1) {
    let h = n[s];
    r.push(h);
    if (h !== "git" && h !== "kubectl" && h !== "terraform") continue;
    let y = (w) => n[w].replace(/['"]/g, "");
    let S = s + 1;
    while (S < n.length && y(S).startsWith("-")) S += TOOL_OPTIONS_WITH_VALUE.has(y(S)) ? 2 : 1;
    if (S > s + 1 && S < n.length && /^[a-z]/.test(n[S])) s = S - 1;
  }
  return r.join(" ");
}
//@ chunk-e6aww6q8.js:3395781-3395836 placement
function stripQuotesAndSlashes(e) {
  return e.replace(/\\\r?\n|['"\\]/g, "");
}
//@ chunk-e6aww6q8.js:3395836-3396098 placement
function splitShellWords_2(e) {
  let n = [];
  let r = "";
  let s;
  let h = false;
  for (let y of e)
    if (h) {
      r += y;
      h = false;
    } else if (y === "\\" && s !== "'") h = true;
    else if (s !== undefined) {
      r += y;
      if (y === s) s = undefined;
    } else if (y === '"' || y === "'") {
      s = y;
      r += y;
    } else if (y === " " || y === "\t") {
      if (r !== "") {
        n.push(r);
        r = "";
      }
    } else r += y;
  return r === "" ? n : [...n, r];
}
//@ chunk-e6aww6q8.js:3396098-3396174 placement
function stripCommandWrappers(e) {
  let replaced = e.trim().replace(COMMAND_PREFIX_WRAPPERS_RE, "");
  return replaced === e.trim() ? replaced : stripCommandWrappers(replaced);
}
//@ chunk-e6aww6q8.js:3396174-3396353 placement
function extractNestedShellCommand(e) {
  return (
    (
      /^(?:ba|z|da|k|mk)?sh\s+(?:-\w*\s+)*-\w*c\s+(['"]?)([\s\S]*)\1\s*$/.exec(e) ??
      /^eval\s+(['"]?)([\s\S]*)\1\s*$/.exec(e) ??
      /`([^`]+)`/.exec(e)
    )?.at(-1) ?? undefined
  );
}
//@ chunk-e6aww6q8.js:3396353-3396391 placement
function splitCommandOrUndefined(command) {
  return splitCommandStrict(command) ?? undefined;
}
//@ chunk-e6aww6q8.js:3401496-3401578 placement
/**
 * 从工具列表中剔除结构化输出、Agent、Poll 等非守卫工具，只留下需要评估的调用。
 */
function filterNonGuardTools(tools) {
  return tools.filter(
    (n) =>
      !toolMatchesName(n, STRUCTUREDOUTPUT) &&
      !toolMatchesAnyName(n, EXTERNAL_ALWAYS_AVAILABLE_TOOLS) &&
      !toolMatchesName(n, AGENT) &&
      !toolMatchesName(n, POLL),
  );
}
//@ chunk-e6aww6q8.js:3401578-3401941 placement
/**
 * 包装权限检查：服务端 hook 代理评估时，拒绝其运行破坏性 Bash 命令。
 */
function denyDestructiveForHookAgent(hasPermissionsToUseTool) {
  return async (n, r, ...s) => {
    let h = Reflect.get(r, "command");
    if (n.name === BASH_TOOL_NAME && typeof h === "string" && isDestructiveCommand(h))
      return {
        behavior: "deny",
        message: `A hook agent evaluating a call served for a cloud session may not run a destructive command here (${n.name}); refused.`,
        decisionReason: {
          type: "other",
          reason: "served_call_hook_agent_destructive",
        },
      };
    return hasPermissionsToUseTool(n, r, ...s);
  };
}
export { filterNonGuardTools, denyDestructiveForHookAgent, isDestructiveCommand };
