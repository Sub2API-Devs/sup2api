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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
function isDestructiveCommand(command, depth = 0) {
  if (command.length > MAX_COMMAND_CHARS_TO_CHECK || depth > MAX_PIPE_HOPS) return true;
  let parts = splitCommandOrUndefined(command);
  if (parts === undefined) return true;
  return uniq([command, ...parts]).some((part) => {
    let stripped = stripCommandWrappers(part);
    let command = extractNestedShellCommand(stripped);
    return (
      matchesDestructivePattern(part) ||
      matchesDestructivePattern(stripped) ||
      (command !== undefined && isDestructiveCommand(command, depth + 1))
    );
  });
}
//@ chunk-e6aww6q8.js:3394410-3394420 placement
var MAX_PIPE_HOPS = 3;
//@ chunk-e6aww6q8.js:3394420-3394885 placement
/**
 * 判断命令是否把输出管道给 shell 执行。
 */
function pipesIntoShell(command) {
  return command
    .replace(/(?<!\\)>\|/g, "> ")
    .split("|")
    .slice(1)
    .some((segment) => {
      let filtered = segment
        .trim()
        .replace(/^&\s*/, "")
        .split(/[ \t]+/)
        .filter(
          (word, wordIndex, words) =>
            !/^(?:\d*[<>]{1,2}&?\S*|&>{1,2}\S*)$/.test(word) &&
            !(wordIndex > 0 && /^(?:\d*[<>]{1,2}&?|&>{1,2})$/.test(words[wordIndex - 1])),
        );
      if (filtered.some((word) => ASSIGNMENT_RE.test(word) && /["'`$\\]/.test(word))) return true;
      let index = filtered.findIndex((word) => !ASSIGNMENT_RE.test(word));
      let head =
        filtered
          .slice(index === -1 ? filtered.length : index)
          .join(" ")
          .split(/[<>;&)]/, 1)[0] ?? "";
      let program = stripCommandWrappers(head).split(/[ \t]+/, 1)[0] ?? "";
      return SHELL_PROGRAM_RE.test(program);
    });
}
//@ chunk-e6aww6q8.js:3394885-3394961 placement
var SHELL_PROGRAM_RE = /^(?:\S*\/)?(?:ba|z|da|k|mk)?sh$/;
var ASSIGNMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
//@ chunk-e6aww6q8.js:3394961-3395080 placement
function matchesDestructivePattern(command) {
  let unquoted = stripQuotesAndSlashes(command);
  return [
    command,
    unquoted,
    stripQuotesAndSlashes(stripGitKubectlGlobalOptions(command)),
    stripGitKubectlGlobalOptions(unquoted),
  ].some(
    (candidate) =>
      getDestructiveTargetCategory(candidate) !== null ||
      DESTRUCTIVE_COMMAND_PATTERNS.some((pattern) => pattern.test(candidate)) ||
      pipesIntoShell(candidate),
  );
}
//@ chunk-e6aww6q8.js:3395080-3395474 placement
/**
 * git、kubectl 等命令带值的全局选项集合。
 */
var TOOL_OPTIONS_WITH_VALUE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3395080", () => {
  TOOL_OPTIONS_WITH_VALUE = new Set([
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
});
//@ chunk-e6aww6q8.js:3395474-3395781 placement
/**
 * 去掉 git、kubectl、terraform 的全局选项，便于识别子命令。
 */
function stripGitKubectlGlobalOptions(command) {
  let words = splitShellWords_2(command);
  let kept = [];
  for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
    let word = words[wordIndex];
    kept.push(word);
    if (word !== "git" && word !== "kubectl" && word !== "terraform") continue;
    let cleanWord = (index) => words[index].replace(/['"]/g, "");
    let nextIndex = wordIndex + 1;
    while (nextIndex < words.length && cleanWord(nextIndex).startsWith("-"))
      nextIndex += TOOL_OPTIONS_WITH_VALUE.has(cleanWord(nextIndex)) ? 2 : 1;
    if (nextIndex > wordIndex + 1 && nextIndex < words.length && /^[a-z]/.test(words[nextIndex]))
      wordIndex = nextIndex - 1;
  }
  return kept.join(" ");
}
//@ chunk-e6aww6q8.js:3395781-3395836 placement
function stripQuotesAndSlashes(command) {
  return command.replace(/\\\r?\n|['"\\]/g, "");
}
//@ chunk-e6aww6q8.js:3395836-3396098 placement
function splitShellWords_2(command) {
  let words = [];
  let current = "";
  let quote;
  let escaped = false;
  for (let char of command)
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\" && quote !== "'") escaped = true;
    else if (quote !== undefined) {
      current += char;
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === " " || char === "\t") {
      if (current !== "") {
        words.push(current);
        current = "";
      }
    } else current += char;
  return current === "" ? words : [...words, current];
}
//@ chunk-e6aww6q8.js:3396098-3396174 placement
function stripCommandWrappers(command) {
  let command_2 = command.trim().replace(COMMAND_PREFIX_WRAPPERS_RE, "");
  return command_2 === command.trim() ? command_2 : stripCommandWrappers(command_2);
}
//@ chunk-e6aww6q8.js:3396174-3396353 placement
function extractNestedShellCommand(command) {
  return (
    (
      /^(?:ba|z|da|k|mk)?sh\s+(?:-\w*\s+)*-\w*c\s+(['"]?)([\s\S]*)\1\s*$/.exec(command) ??
      /^eval\s+(['"]?)([\s\S]*)\1\s*$/.exec(command) ??
      /`([^`]+)`/.exec(command)
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
    (tool) =>
      !toolMatchesName(tool, STRUCTUREDOUTPUT) &&
      !toolMatchesAnyName(tool, EXTERNAL_ALWAYS_AVAILABLE_TOOLS) &&
      !toolMatchesName(tool, AGENT) &&
      !toolMatchesName(tool, POLL),
  );
}
//@ chunk-e6aww6q8.js:3401578-3401941 placement
/**
 * 包装权限检查：服务端 hook 代理评估时，拒绝其运行破坏性 Bash 命令。
 */
function denyDestructiveForHookAgent(hasPermissionsToUseTool) {
  return async (tool, input, ...restArgs) => {
    let command = Reflect.get(input, "command");
    if (tool.name === BASH_TOOL_NAME && typeof command === "string" && isDestructiveCommand(command))
      return {
        behavior: "deny",
        message: `A hook agent evaluating a call served for a cloud session may not run a destructive command here (${tool.name}); refused.`,
        decisionReason: {
          type: "other",
          reason: "served_call_hook_agent_destructive",
        },
      };
    return hasPermissionsToUseTool(tool, input, ...restArgs);
  };
}
export { filterNonGuardTools, denyDestructiveForHookAgent, isDestructiveCommand };
