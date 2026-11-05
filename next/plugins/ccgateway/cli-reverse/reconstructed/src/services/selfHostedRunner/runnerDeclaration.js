/**
 * services/selfHostedRunner/runnerDeclaration.ts
 *
 * 2.1.316 新增。解析 --runner-declares 参数（self-hosted runner 声明的能力）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (1), chunk-b3g7z1sb.js (4)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SYSTEM_PROMPT_FILE_ARGS as SYSTEM_PROMPT_FILE_ARGS_2 } from "./childArgs.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b3g7z1sb.js:191-217 placement
/**
 * runner 声明文件的文件名常量（runner-declares）。
 */
var RUNNER_DECLARES_ARG_KEY = "runner-declares";
//@ chunk-b3g7z1sb.js:217-288 placement
var DECLARES_DIFF_FINDS_NESTED_REPOSITORY = "diff-finds-nested-repository";
var DECLARES_NO_REPOSITORY_CHECKED_OUT = "no-repository-checked-out";
//@ chunk-b3g7z1sb.js:288-343 placement
function runnerDeclarationArgument(names) {
  return "--runner-declares=" + names.join(",");
}
//@ chunk-b3g7z1sb.js:343-744 placement
/**
 * 解析 --runner-declares 参数（self-hosted runner 声明的能力）。
 */
async function adoptRunnerDeclaration(arg) {
  if (!arg.startsWith("--runner-declares=")) return;
  let parts = arg.slice(18).split(",");
  let included = parts.includes("diff-finds-nested-repository");
  let freshMachine = false;
  if (!included && !freshMachine) return;
  let {
    setRunnerDeclaredFreshMachinePerSession,
    setRunnerDeclaredNestedRepositoryDiff,
    setRunnerDeclaredNoRepositoryCheckedOut,
  } = await import("../../bootstrap/state.js");
  if (included) {
    setRunnerDeclaredNestedRepositoryDiff(true);
    if (parts.includes("no-repository-checked-out")) setRunnerDeclaredNoRepositoryCheckedOut(true);
  }
  if (freshMachine) setRunnerDeclaredFreshMachinePerSession(true);
}
//@ chunk-asf5gh8x.js:86813-87114 placement
var REPLY_GATE_POLICY; // deferred: uses SERVER_ARG_NAME_PATTERN (./childArgs.js) of its import cycle while loading; runs once the cycle is complete
var CHILD_FORWARDED_FLAGS;
var CHILD_EXTRA_FORWARDED_FLAGS;
var LAUNCHER_ONLY_FLAGS;
deferInit("chunk-asf5gh8x.js:86813", () => {
  REPLY_GATE_POLICY = "reply-gate-policy";
  CHILD_FORWARDED_FLAGS = new Set([
    "sdk-url",
    "resume",
    "print",
    "input-format",
    "output-format",
    "replay-user-messages",
    "debug-file",
    "mcp-config",
    "settings",
    ...SYSTEM_PROMPT_FILE_ARGS_2,
    "agents",
    REPLY_GATE_POLICY,
    RUNNER_DECLARES_ARG_KEY,
  ]);
  CHILD_EXTRA_FORWARDED_FLAGS = new Set(["add-dir", "setting-sources"]);
  LAUNCHER_ONLY_FLAGS = new Set([
    ...CHILD_FORWARDED_FLAGS,
    "deep-link-origin",
    "deep-link-cwd-b64",
    "worktree",
    "tmux",
  ]);
});
export {
  DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
  DECLARES_NO_REPOSITORY_CHECKED_OUT,
  runnerDeclarationArgument,
  CHILD_EXTRA_FORWARDED_FLAGS,
  CHILD_FORWARDED_FLAGS,
  REPLY_GATE_POLICY,
  RUNNER_DECLARES_ARG_KEY,
  adoptRunnerDeclaration,
};
