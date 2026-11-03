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

/**
 * 需要在 commander 之前提前解析的带值 CLI 标志集合（--settings、--prefill、深链接等）。
 */
//@ chunk-c5gdqf78.js:682-2660 placement
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
  ]),
  VARIADIC_VALUE_FLAGS = new Set([
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
  ]),
  d = new Set([
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
  if (t !== void 0 && d.has(t)) {
    let s = e[n + 1];
    return s !== void 0 && !looksLikeOption(s) ? n + 1 : n;
  }
  if (t === void 0 || !EAGER_VALUE_FLAGS.has(t)) return n;
  let o = n + 1;
  if (VARIADIC_VALUE_FLAGS.has(t)) while (o + 1 < e.length && !looksLikeOption(e[o + 1])) o++;
  return o;
}
//@ chunk-c5gdqf78.js:2864-2917 placement
function looksLikeOption(e) {
  return e.length > 1 && e.startsWith("-");
}
/**
 * eagerParseCliFlag：commander 解析前直接从 argv 取某个标志的最后一个值。
 */
//@ chunk-c5gdqf78.js:2917-2970 placement = eagerParseCliFlag (1)
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
/**
 * 从 argv 收集某标志的所有取值及其所在下标（支持 --flag=value 与 --flag value，遇 -- 停止）。
 */
//@ chunk-c5gdqf78.js:3098-3360 placement
function collectFlagValues(e, n) {
  let t = [];
  for (let o = 0; o < n.length; o++) {
    let s = n[o];
    if (s === "--") break;
    if (s?.startsWith(`${e}=`)) {
      t.push({ value: s.slice(e.length + 1), indices: [o] });
      continue;
    }
    if (s === e && o + 1 < n.length) {
      (t.push({ value: n[o + 1], indices: [o, o + 1] }), o++);
      continue;
    }
    o = lastValueSlot(n, o);
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
  let n = eagerHasCliFlag("-p", e) || eagerHasCliFlag("--print", e),
    t = eagerHasCliFlag("--init-only", e),
    o = eagerFindCliArg((s) => s.startsWith("--sdk-url"), e) !== -1;
  return n || t || o || !process.stdout.isTTY;
}
//@ chunk-c5gdqf78.js:3655-3792 placement
function eagerFindCliArg(e, n = process.argv) {
  for (let t = 0; t < n.length; t++) {
    let o = n[t];
    if (o === "--") break;
    if (o !== void 0 && e(o)) return t;
    t = lastValueSlot(n, t);
  }
  return -1;
}
//@ chunk-c5gdqf78.js:3792-3968 placement
function cliFlagWords(e) {
  let index = e.indexOf("--"),
    t = index === -1 ? e : e.slice(0, index),
    o = [];
  for (let s = 0; s < t.length; s++) {
    let r = t[s];
    (o.push(EAGER_VALUE_FLAGS.has(r) && s + 1 < t.length ? `${r}=${t[s + 1]}` : r),
      (s = lastValueSlot(t, s)));
  }
  return o;
}
//@ chunk-c5gdqf78.js:3968-4043 placement
function eagerFirstOperand(e = process.argv.slice(2)) {
  let n = firstOperandIndex(e);
  return n === -1 ? void 0 : e[n];
}
//@ chunk-c5gdqf78.js:4043-4175 placement
function firstOperandIndex(e) {
  for (let n = 0; n < e.length; n++) {
    let t = e[n];
    if (t === "--") return n + 1 < e.length ? n + 1 : -1;
    if (!looksLikeOption(t)) return n;
    n = lastValueSlot(e, n);
  }
  return -1;
}
/**
 * 后台会话子命令、非交互标志与调试标志集合，供启动早期判断运行模式。
 */
//@ chunk-c5gdqf78.js:4175-5270 placement
var BACKGROUND_SUBCOMMANDS = new Set(["attach", "logs", "stop", "kill", "respawn", "rm"]),
  f = new Set([
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
  ]),
  h = new Set([
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
  ]),
  b = new Set(["--exec", "-m", "--handle-uri"]),
  x = /^[a-f0-9]{8}$/;
//@ chunk-c5gdqf78.js:5270-5587 placement
function backgroundSessionVerbIndex(
  e = process.argv.slice(2),
  { behindRootOptions: behindRootOptions = !0 } = {},
) {
  let t = firstOperandIndex(e);
  if (t === -1 || !BACKGROUND_SUBCOMMANDS.has(e[t])) return -1;
  if (t === 0) return 0;
  if (!behindRootOptions || e[t - 1] === "--") return -1;
  let o = e[t + 1],
    s = o;
  if (o === void 0 || !(x.test(o) || (e[t] === "respawn" && o === "--all"))) return -1;
  for (let r = 0; r < t; r = lastValueSlot(e, r) + 1) {
    let i = e[r];
    if (y(i) || !isEagerFlag(i)) return -1;
  }
  return t;
}
//@ chunk-c5gdqf78.js:5587-5704 placement
function isEagerFlag(e) {
  if (h.has(e)) return !0;
  let index = e.indexOf("="),
    t = index === -1 ? e : e.slice(0, index);
  return (EAGER_VALUE_FLAGS.has(t) && !b.has(t)) || d.has(t);
}
//@ chunk-c5gdqf78.js:5704-5789 placement
function y(e) {
  return f.has(e) || e.startsWith("--routine=") || /^-[A-Za-z]{2,}$/.test(e);
}
//@ chunk-c5gdqf78.js:5789-5862 placement
function isConnectUrlArg(e) {
  return e.startsWith("cc://") || e.startsWith("cc+unix://");
}
//@ chunk-c5gdqf78.js:5862-6024 placement = isHelpCommand (0.693)
function mayDispatchSubcommand(command = process.argv.slice(2)) {
  if (command.some((n) => n === "--help" || /^-[^-]*h/.test(n))) return !0;
  for (let n = 0; n < command.length; n = lastValueSlot(command, n) + 1)
    if (!isEagerFlag(command[n])) return !0;
  return !1;
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
