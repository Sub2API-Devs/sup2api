/**
 * utils/relaunchHintFlags.ts
 *
 * 重启时该保留哪些参数（resume/continue/worktree 等）的过滤与回读（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zeh5h5sy.js (4)
 * attribution: placement 4
 */
import { looksLikeOption } from "./cliArgs.js";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-zeh5h5sy.js:306-1194 placement
/**
 * 重启时要保留的参数名表、要丢弃的参数名表与参数形态正则。
 */
var CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESUME_HINT_FLAGS;
var AGENT_HINT_FLAGS;
var FLAG_SHAPE_RE;
var VALUE_SHAPE_RE;
var DEV_PROC_PATH_RE;
deferInit("chunk-zeh5h5sy.js:306", () => {
  CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS = "CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS";
  RESUME_HINT_FLAGS = new Set([
    "resume",
    "continue",
    "from-pr",
    "fork-session",
    "session-id",
    "name",
    "teleport",
    "cloud",
    "remote",
    "desktop",
    "environment",
    "pool",
    "project",
    "ref",
    "on-branch",
    "correlation-id",
    ...[],
    "forward-home-settings",
    "resume-session-at",
    "resume-drops-turn",
    "reply-on-resume",
    "rewind-files",
    "worktree",
    "tmux",
    "background",
    "routine",
    "file",
    "init",
    "init-only",
    "maintenance",
    "prefill",
    "prefill-b64",
    "deep-link-origin",
    "deep-link-repo",
    "deep-link-last-fetch",
    "deep-link-cwd-b64",
    "watch-artifact",
    "watch-artifact-no-autoreact",
  ]);
  AGENT_HINT_FLAGS = new Set([
    "agent-id",
    "agent-name",
    "team-name",
    "agent-color",
    "agent-type",
    "parent-session-id",
    "plan-mode-required",
    "inherit-permission-mode",
    "agents-view-if-allowed",
    "attach-serve",
    "session-began-as-copy",
    "messaging-socket-path",
    "project-config-root",
  ]);
  FLAG_SHAPE_RE = /^-[\w/:@=+-]*$/;
  VALUE_SHAPE_RE = /^[\w./:+][\w./:@=+-]*$/;
  DEV_PROC_PATH_RE = /(^|=)\/(dev|proc)\//;
});
//@ chunk-zeh5h5sy.js:1194-1779 placement
/**
 * 按参数表过滤重启参数串，遇到需丢弃项整串放弃。
 */
function resumeHintFlags(program, args) {
  let kept = [];
  let index = 0;
  while (index < args.length) {
    let arg = args[index++];
    if (arg === "--") break;
    if (!looksLikeOption(arg)) continue;
    let values = [];
    let option = findOption(program, arg);
    if (option) {
      if (option.required) {
        if (index >= args.length) return "";
        values.push(args[index++]);
      } else if (option.optional && index < args.length && !looksLikeOption(args[index]))
        values.push(args[index++]);
      if (option.variadic)
        while (index < args.length && !looksLikeOption(args[index])) values.push(args[index++]);
    } else {
      let equalsAt = arg.startsWith("--") ? arg.indexOf("=") : -1;
      option = equalsAt > 2 ? findOption(program, arg.slice(0, equalsAt)) : undefined;
      if (!option || !(option.required || option.optional)) return "";
    }
    if (AGENT_HINT_FLAGS.has(option.name())) return "";
    if (RESUME_HINT_FLAGS.has(option.name())) continue;
    if (
      !FLAG_SHAPE_RE.test(arg) ||
      !values.every((value) => VALUE_SHAPE_RE.test(value)) ||
      [arg, ...values].some((text) => DEV_PROC_PATH_RE.test(text))
    )
      return "";
    kept.push(arg, ...values);
  }
  return kept.join(" ");
}
//@ chunk-zeh5h5sy.js:1779-1949 placement
/**
 * 读并清除 CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS，过滤后与原文一致才复用。
 */
function takeResumeHintFlags(program) {
  let CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS = env.CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS;
  if (CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS === undefined) return;
  env.unset("CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS");
  return resumeHintFlags(program, CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS.split(" ")) ===
    CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS
    ? CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS
    : "";
}
//@ chunk-zeh5h5sy.js:1949-2009 placement
function findOption(options, flag) {
  return options.find((option) => option.short === flag || option.long === flag);
}
export { takeResumeHintFlags, resumeHintFlags, CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS };
