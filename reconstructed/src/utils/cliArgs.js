/**
 * utils/cliArgs.ts
 *
 * eagerParseCliFlag：commander 解析前从 argv 提取单个标志值（如 --settings）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cliArgs.ts
 * pieces: chunk-c5gdqf78.js (20)
 * attribution: placement 20
 */
//@ chunk-c5gdqf78.js:682-2660 placement
/**
 * routine 相关、需要取值的选项集合。
 */
var EAGER_VALUE_FLAGS = new Set([
  "--prefill",
  "--prefill-b64",
  "--deep-link-repo",
  "--deep-link-last-fetch",
  "--deep-link-cwd-b64",
  "--handle-uri",
  "--settings",
  "--managed-settings",
  "--setting-sources",
  "--client-data-url",
  "--watch-artifact",
  "--watch-artifact-no-autoreact",
  "--team-name",
  "--agent-id",
  "--agent-name",
  "--agent-color",
  "--parent-session-id",
  "--agent-type",
  "--model",
  "--agent",
  "--routine",
  "--effort",
  "--fast-mode",
  "--permission-mode",
  "--inherit-permission-mode",
  "--proactivity",
  "--debug-file",
  "--system-prompt",
  "--system-prompt-file",
  "--append-system-prompt",
  "--append-system-prompt-file",
  "--system-prompt-snapshot",
  "--append-subagent-system-prompt",
  "--append-subagent-system-prompt-file",
  "--plan-mode-instructions",
  "--permission-prompt-tool",
  "--permission-prompts",
  "--json-schema",
  "--fallback-model",
  "--advisor",
  "--agents",
  "--name",
  "-n",
  "--allowedTools",
  "--allowed-tools",
  "--disallowedTools",
  "--disallowed-tools",
  "--tools",
  "--add-dir",
  "--mcp-config",
  "--betas",
  "--file",
  "--channels",
  "--dangerously-load-development-channels",
  "--plugin-dir",
  "--plugin-dir-no-mcp",
  "--plugin-url",
  "--remote-control-session-name-prefix",
  "--exec",
  "-m",
  "--sdk-url",
  "--thinking",
  "--thinking-display",
  "--max-thinking-tokens",
  "--max-turns",
  "--max-budget-usd",
  "--task-budget",
  "--autocompact",
  "--rewind-files",
  "--resume-session-at",
  "--resume-drops-turn",
  "--workload",
  "--output-format",
  "--input-format",
  "--teammate-mode",
  "--messaging-socket-path",
  "--session-id",
  "--environment",
  "--pool",
  "--ref",
  "--on-branch",
  "--correlation-id",
  "--forward-home-settings",
  "--project-config-root",
  "--attach-serve",
  "--runner-declares",
  "--session-began-as-copy",
  ...[],
]);
var VARIADIC_VALUE_FLAGS = new Set([
  "--allowedTools",
  "--allowed-tools",
  "--disallowedTools",
  "--disallowed-tools",
  "--tools",
  "--add-dir",
  "--mcp-config",
  "--betas",
  "--file",
  "--channels",
  "--dangerously-load-development-channels",
]);
var ROUTINE_VALUE_FLAGS = new Set([
  "-d",
  "--debug",
  "-r",
  "--resume",
  "--from-pr",
  "-w",
  "--worktree",
  "--teleport",
  "--cloud",
  "--remote",
  "--project",
  "--remote-control",
  "--rc",
  "--prompt-suggestions",
]);
//@ chunk-c5gdqf78.js:2660-2864 placement
function lastValueSlot(e, n) {
  let t = e[n];
  if (t !== undefined && ROUTINE_VALUE_FLAGS.has(t)) {
    let s = e[n + 1];
    return s !== undefined && !looksLikeOption(s) ? n + 1 : n;
  }
  if (t === undefined || !EAGER_VALUE_FLAGS.has(t)) return n;
  let o = n + 1;
  if (VARIADIC_VALUE_FLAGS.has(t)) while (o + 1 < e.length && !looksLikeOption(e[o + 1])) o++;
  return o;
}
//@ chunk-c5gdqf78.js:2864-2917 placement
function looksLikeOption(e) {
  return e.length > 1 && e.startsWith("-");
}
//@ chunk-c5gdqf78.js:2917-2970 placement = eagerParseCliFlag (1)
/**
 * eagerParseCliFlag：commander 解析前直接从 argv 取某个标志的最后一个值。
 */
function eagerParseCliFlag(flagName, argv = process.argv) {
  return eagerParseCliFlagAll(flagName, argv).at(-1);
}
//@ chunk-c5gdqf78.js:2970-3033 placement
function eagerParseCliFlagAll(e, n = process.argv) {
  return collectFlagValues(e, n).map((t) => t.value);
}
//@ chunk-c5gdqf78.js:3033-3098 placement
function eagerCliFlagHonoredIndices(e, n) {
  return new Set(collectFlagValues(e, n).flatMap((t) => t.indices));
}
//@ chunk-c5gdqf78.js:3098-3360 placement
/**
 * 从 argv 收集某标志的所有取值及其所在下标（支持 --flag=value 与 --flag value，遇 -- 停止）。
 */
function collectFlagValues(e, n) {
  let t = [];
  for (let i = 0; i < n.length; i++) {
    let s = n[i];
    if (s === "--") break;
    if (s?.startsWith(`${e}=`)) {
      t.push({
        value: s.slice(e.length + 1),
        indices: [i],
      });
      continue;
    }
    if (s === e && i + 1 < n.length) {
      t.push({
        value: n[i + 1],
        indices: [i, i + 1],
      });
      i++;
      continue;
    }
    i = lastValueSlot(n, i);
  }
  return t;
}
//@ chunk-c5gdqf78.js:3360-3420 placement
function eagerHasCliFlag(e, n = process.argv) {
  return eagerFindCliArg((t) => t === e, n) !== -1;
}
//@ chunk-c5gdqf78.js:3420-3478 placement
function hasBackgroundFlag(e) {
  return eagerHasCliFlag("--bg", e) || eagerHasCliFlag("--background", e);
}
//@ chunk-c5gdqf78.js:3478-3655 placement
function detectNonInteractiveLaunch(e = process.argv.slice(2)) {
  let n = eagerHasCliFlag("-p", e) || eagerHasCliFlag("--print", e);
  let t = eagerHasCliFlag("--init-only", e);
  let o = eagerFindCliArg((s) => s.startsWith("--sdk-url"), e) !== -1;
  return n || t || o || !process.stdout.isTTY;
}
//@ chunk-c5gdqf78.js:3655-3792 placement
function eagerFindCliArg(e, n = process.argv) {
  for (let i = 0; i < n.length; i++) {
    let o = n[i];
    if (o === "--") break;
    if (o !== undefined && e(o)) return i;
    i = lastValueSlot(n, i);
  }
  return -1;
}
//@ chunk-c5gdqf78.js:3792-3968 placement
function cliFlagWords(e) {
  let index = e.indexOf("--");
  let t = index === -1 ? e : e.slice(0, index);
  let o = [];
  for (let i = 0; i < t.length; i++) {
    let r = t[i];
    o.push(EAGER_VALUE_FLAGS.has(r) && i + 1 < t.length ? `${r}=${t[i + 1]}` : r);
    i = lastValueSlot(t, i);
  }
  return o;
}
//@ chunk-c5gdqf78.js:3968-4043 placement
function eagerFirstOperand(e = process.argv.slice(2)) {
  let n = firstOperandIndex(e);
  return n === -1 ? undefined : e[n];
}
//@ chunk-c5gdqf78.js:4043-4175 placement
function firstOperandIndex(e) {
  for (let i = 0; i < e.length; i++) {
    let t = e[i];
    if (t === "--") return i + 1 < e.length ? i + 1 : -1;
    if (!looksLikeOption(t)) return i;
    i = lastValueSlot(e, i);
  }
  return -1;
}
//@ chunk-c5gdqf78.js:4175-5270 placement
/**
 * 表示非交互模式（-p/--print/--bg/--routine）的选项集合。
 */
var BACKGROUND_SUBCOMMANDS = new Set(["attach", "logs", "stop", "kill", "respawn", "rm"]);
var SDI_MODE_FLAGS = new Set([
  "-p",
  "--print",
  "--bg",
  "--background",
  "--routine",
  "-h",
  "--help",
  "-v",
  "-V",
  "--version",
]);
var HELP_FLAGS = new Set([
  "-d2e",
  "--debug-to-stderr",
  "--verbose",
  "-p",
  "--print",
  "--bare",
  "--safe-mode",
  "--init",
  "--init-only",
  "--maintenance",
  "--include-hook-events",
  "--include-partial-messages",
  "--forward-subagent-text",
  "--session-mirror",
  "--await-claim",
  "--await-initialize",
  "--dangerously-skip-permissions",
  "--allow-dangerously-skip-permissions",
  "--replay-user-messages",
  "--host-auth-is-org-sign-in",
  "--enable-auth-status",
  "--restricted",
  "--allow-other-models",
  "--exclude-dynamic-system-prompt-sections",
  "--include-unsupported-models",
  "-c",
  "--continue",
  "--fork-session",
  "--deep-link-origin",
  "--no-session-persistence",
  "--reply-on-resume",
  "--ide",
  "--desktop",
  "--strict-mcp-config",
  "--disable-slash-commands",
  "--chrome",
  "--no-chrome",
  "--tmux",
  "--enable-auto-mode",
  "--bg",
  "--background",
  "--agents-view-if-allowed",
  "--brief",
  "--ax-screen-reader",
  "--plan-mode-required",
  "--hard-fail",
  ...[],
]);
var KEBOOL_FLAGS = new Set(["--exec", "-m", "--handle-uri"]);
var BACKGROUND_VERB_RE = /^[a-f0-9]{8}$/;
//@ chunk-c5gdqf78.js:5270-5587 placement
function backgroundSessionVerbIndex(e = process.argv.slice(2), { behindRootOptions = true } = {}) {
  let t = firstOperandIndex(e);
  if (t === -1 || !BACKGROUND_SUBCOMMANDS.has(e[t])) return -1;
  if (t === 0) return 0;
  if (!behindRootOptions || e[t - 1] === "--") return -1;
  let o = e[t + 1];
  let s = o;
  if (o === undefined || !(BACKGROUND_VERB_RE.test(o) || (e[t] === "respawn" && o === "--all"))) return -1;
  for (let r = 0; r < t; r = lastValueSlot(e, r) + 1) {
    let i = e[r];
    if (isNonInteractiveFlag(i) || !isEagerFlag(i)) return -1;
  }
  return t;
}
//@ chunk-c5gdqf78.js:5587-5704 placement
function isEagerFlag(e) {
  if (HELP_FLAGS.has(e)) return true;
  let index = e.indexOf("=");
  let t = index === -1 ? e : e.slice(0, index);
  return (EAGER_VALUE_FLAGS.has(t) && !KEBOOL_FLAGS.has(t)) || ROUTINE_VALUE_FLAGS.has(t);
}
//@ chunk-c5gdqf78.js:5704-5789 placement
/**
 * 判断选项是否表示非交互模式（含 --routine= 与组合短选项）。
 */
function isNonInteractiveFlag(e) {
  return SDI_MODE_FLAGS.has(e) || e.startsWith("--routine=") || /^-[A-Za-z]{2,}$/.test(e);
}
//@ chunk-c5gdqf78.js:5789-5862 placement
function isConnectUrlArg(e) {
  return e.startsWith("cc://") || e.startsWith("cc+unix://");
}
//@ chunk-c5gdqf78.js:5862-6024 placement = isHelpCommand (0.693)
function mayDispatchSubcommand(command = process.argv.slice(2)) {
  if (command.some((n) => n === "--help" || /^-[^-]*h/.test(n))) return true;
  for (let n = 0; n < command.length; n = lastValueSlot(command, n) + 1)
    if (!isEagerFlag(command[n])) return true;
  return false;
}
export {
  detectNonInteractiveLaunch,
  eagerParseCliFlag,
  eagerHasCliFlag,
  eagerFindCliArg,
  isConnectUrlArg,
  mayDispatchSubcommand,
  eagerFirstOperand,
  eagerParseCliFlagAll,
  VARIADIC_VALUE_FLAGS,
  lastValueSlot,
  looksLikeOption,
  backgroundSessionVerbIndex,
  eagerCliFlagHonoredIndices,
};
