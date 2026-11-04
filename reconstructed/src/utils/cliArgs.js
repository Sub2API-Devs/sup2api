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
function lastValueSlot(args, index) {
  let flag = args[index];
  if (flag !== undefined && ROUTINE_VALUE_FLAGS.has(flag)) {
    let nextArg = args[index + 1];
    return nextArg !== undefined && !looksLikeOption(nextArg) ? index + 1 : index;
  }
  if (flag === undefined || !EAGER_VALUE_FLAGS.has(flag)) return index;
  let slot = index + 1;
  if (VARIADIC_VALUE_FLAGS.has(flag))
    while (slot + 1 < args.length && !looksLikeOption(args[slot + 1])) slot++;
  return slot;
}
//@ chunk-c5gdqf78.js:2864-2917 placement
function looksLikeOption(arg) {
  return arg.length > 1 && arg.startsWith("-");
}
//@ chunk-c5gdqf78.js:2917-2970 placement = eagerParseCliFlag (1)
/**
 * eagerParseCliFlag：commander 解析前直接从 argv 取某个标志的最后一个值。
 */
function eagerParseCliFlag(flagName, argv = process.argv) {
  return eagerParseCliFlagAll(flagName, argv).at(-1);
}
//@ chunk-c5gdqf78.js:2970-3033 placement
function eagerParseCliFlagAll(flag, argv = process.argv) {
  return collectFlagValues(flag, argv).map((entry) => entry.value);
}
//@ chunk-c5gdqf78.js:3033-3098 placement
function eagerCliFlagHonoredIndices(flag, argv) {
  return new Set(collectFlagValues(flag, argv).flatMap((entry) => entry.indices));
}
//@ chunk-c5gdqf78.js:3098-3360 placement
/**
 * 从 argv 收集某标志的所有取值及其所在下标（支持 --flag=value 与 --flag value，遇 -- 停止）。
 */
function collectFlagValues(flag, args) {
  let values = [];
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (arg === "--") break;
    if (arg?.startsWith(`${flag}=`)) {
      values.push({
        value: arg.slice(flag.length + 1),
        indices: [i],
      });
      continue;
    }
    if (arg === flag && i + 1 < args.length) {
      values.push({
        value: args[i + 1],
        indices: [i, i + 1],
      });
      i++;
      continue;
    }
    i = lastValueSlot(args, i);
  }
  return values;
}
//@ chunk-c5gdqf78.js:3360-3420 placement
function eagerHasCliFlag(flag, argv = process.argv) {
  return eagerFindCliArg((arg) => arg === flag, argv) !== -1;
}
//@ chunk-c5gdqf78.js:3420-3478 placement
function hasBackgroundFlag(argv) {
  return eagerHasCliFlag("--bg", argv) || eagerHasCliFlag("--background", argv);
}
//@ chunk-c5gdqf78.js:3478-3655 placement
function detectNonInteractiveLaunch(args = process.argv.slice(2)) {
  let isPrint = eagerHasCliFlag("-p", args) || eagerHasCliFlag("--print", args);
  let isInitOnly = eagerHasCliFlag("--init-only", args);
  let hasSdkUrl = eagerFindCliArg((arg) => arg.startsWith("--sdk-url"), args) !== -1;
  return isPrint || isInitOnly || hasSdkUrl || !process.stdout.isTTY;
}
//@ chunk-c5gdqf78.js:3655-3792 placement
function eagerFindCliArg(predicate, argv = process.argv) {
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    if (arg === "--") break;
    if (arg !== undefined && predicate(arg)) return i;
    i = lastValueSlot(argv, i);
  }
  return -1;
}
//@ chunk-c5gdqf78.js:3792-3968 placement
function cliFlagWords(argv) {
  let index = argv.indexOf("--");
  let beforeSeparator = index === -1 ? argv : argv.slice(0, index);
  let words = [];
  for (let i = 0; i < beforeSeparator.length; i++) {
    let arg = beforeSeparator[i];
    words.push(
      EAGER_VALUE_FLAGS.has(arg) && i + 1 < beforeSeparator.length ? `${arg}=${beforeSeparator[i + 1]}` : arg,
    );
    i = lastValueSlot(beforeSeparator, i);
  }
  return words;
}
//@ chunk-c5gdqf78.js:3968-4043 placement
function eagerFirstOperand(args = process.argv.slice(2)) {
  let operandIndex = firstOperandIndex(args);
  return operandIndex === -1 ? undefined : args[operandIndex];
}
//@ chunk-c5gdqf78.js:4043-4175 placement
function firstOperandIndex(args) {
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (arg === "--") return i + 1 < args.length ? i + 1 : -1;
    if (!looksLikeOption(arg)) return i;
    i = lastValueSlot(args, i);
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
function backgroundSessionVerbIndex(args = process.argv.slice(2), { behindRootOptions = true } = {}) {
  let operandIndex = firstOperandIndex(args);
  if (operandIndex === -1 || !BACKGROUND_SUBCOMMANDS.has(args[operandIndex])) return -1;
  if (operandIndex === 0) return 0;
  if (!behindRootOptions || args[operandIndex - 1] === "--") return -1;
  let verbArg = args[operandIndex + 1];
  let verbValue = verbArg;
  if (
    verbArg === undefined ||
    !(BACKGROUND_VERB_RE.test(verbArg) || (args[operandIndex] === "respawn" && verbArg === "--all"))
  )
    return -1;
  for (let argIndex = 0; argIndex < operandIndex; argIndex = lastValueSlot(args, argIndex) + 1) {
    let arg = args[argIndex];
    if (isNonInteractiveFlag(arg) || !isEagerFlag(arg)) return -1;
  }
  return operandIndex;
}
//@ chunk-c5gdqf78.js:5587-5704 placement
function isEagerFlag(flag) {
  if (HELP_FLAGS.has(flag)) return true;
  let index = flag.indexOf("=");
  let flagName = index === -1 ? flag : flag.slice(0, index);
  return (
    (EAGER_VALUE_FLAGS.has(flagName) && !KEBOOL_FLAGS.has(flagName)) || ROUTINE_VALUE_FLAGS.has(flagName)
  );
}
//@ chunk-c5gdqf78.js:5704-5789 placement
/**
 * 判断选项是否表示非交互模式（含 --routine= 与组合短选项）。
 */
function isNonInteractiveFlag(flag) {
  return SDI_MODE_FLAGS.has(flag) || flag.startsWith("--routine=") || /^-[A-Za-z]{2,}$/.test(flag);
}
//@ chunk-c5gdqf78.js:5789-5862 placement
function isConnectUrlArg(arg) {
  return arg.startsWith("cc://") || arg.startsWith("cc+unix://");
}
//@ chunk-c5gdqf78.js:5862-6024 placement = isHelpCommand (0.693)
function mayDispatchSubcommand(command = process.argv.slice(2)) {
  if (command.some((arg) => arg === "--help" || /^-[^-]*h/.test(arg))) return true;
  for (let argIndex = 0; argIndex < command.length; argIndex = lastValueSlot(command, argIndex) + 1)
    if (!isEagerFlag(command[argIndex])) return true;
  return false;
}
export {
  eagerParseCliFlag,
  eagerHasCliFlag,
  eagerFirstOperand,
  detectNonInteractiveLaunch,
  eagerFindCliArg,
  isConnectUrlArg,
  mayDispatchSubcommand,
  eagerParseCliFlagAll,
  VARIADIC_VALUE_FLAGS,
  lastValueSlot,
  looksLikeOption,
  backgroundSessionVerbIndex,
  eagerCliFlagHonoredIndices,
  cliFlagWords,
  hasBackgroundFlag,
};
