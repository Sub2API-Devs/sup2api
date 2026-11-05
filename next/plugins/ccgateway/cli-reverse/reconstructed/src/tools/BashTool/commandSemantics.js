/**
 * tools/BashTool/commandSemantics.ts
 *
 * 命令退出码语义表（grep/rg/find/diff/test 的 1 不算错误）与 git 子命令提取；混入 SDK tool runner 片段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/commandSemantics.ts
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: fingerprint 2, layout 3, file-local 1, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { findToolResultBlock } from "../../services/tools/toolHooks.js";
import { toolInputText } from "../../plugins/functionHooks/sites/toolSites.js";
import { splitCommand, lastCommandIsAndGated } from "../../utils/bash/commands.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3873310-3873440 fingerprint (2.1.88 match: interpretCommandResult, 0.671)
function interpretCommandResult_2(messages, toolUseId) {
  for (let message of messages) {
    let toolResultBlock = findToolResultBlock(message, toolUseId);
    if (toolResultBlock)
      return {
        text: toolInputText(toolResultBlock.content),
        ...(toolResultBlock.is_error === true && {
          isError: true,
        }),
      };
  }
  return {
    text: "",
  };
}
//@ chunk-5xgkngpb.js:4852574-4853010 fingerprint (2.1.88 match: COMMAND_SEMANTICS, 0.845)
/**
 * 命令退出码语义表：默认非 0 即错误；grep/rg/egrep/fgrep/find/diff/test/[ 的退出码 1 只是"无匹配/不同/条件为假"，≥2 才算错误。
 */
var DEFAULT_SEMANTIC; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var exitOneIsNotError;
var COMMAND_SEMANTICS;
deferInit("chunk-5xgkngpb.js:4852574", () => {
  DEFAULT_SEMANTIC = (exitCode, _stdout, _stderr) => ({
    isError: exitCode !== 0,
    message: exitCode !== 0 ? `Command failed with exit code ${exitCode}` : undefined,
  });
  exitOneIsNotError = (message) => (exitCode, stdout, stderr) => ({
    isError: exitCode >= 2,
    message: exitCode === 1 ? message : undefined,
  });
  COMMAND_SEMANTICS = new Map([
    ["grep", exitOneIsNotError("No matches found")],
    ["rg", exitOneIsNotError("No matches found")],
    ["egrep", exitOneIsNotError("No matches found")],
    ["fgrep", exitOneIsNotError("No matches found")],
    ["find", exitOneIsNotError("Some directories were inaccessible")],
    ["diff", exitOneIsNotError("Files differ")],
    ["test", exitOneIsNotError("Condition is false")],
    ["[", exitOneIsNotError("Condition is false")],
  ]);
});
//@ chunk-5xgkngpb.js:4853010-4853203 layout
/**
 * 取最后一个子命令的基础命令查语义表；git diff / git grep 也按 diff/grep 语义处理。
 */
function getCommandSemantic(command) {
  let baseCommand = extractBaseCommand(splitCommand(command).at(-1) || command);
  if (baseCommand === "git") {
    let lastSegmentGitSubcommand = getLastSegmentGitSubcommand(command);
    if (lastSegmentGitSubcommand === "diff" || lastSegmentGitSubcommand === "grep")
      return exitOneIsNotError(lastSegmentGitSubcommand === "grep" ? "No matches found" : "Files differ");
  }
  let semantic = COMMAND_SEMANTICS.get(baseCommand);
  return semantic !== undefined ? semantic : DEFAULT_SEMANTIC;
}
//@ chunk-5xgkngpb.js:4853203-4853275 layout
function getLastSegmentGitSubcommand(command) {
  let lastSegment = splitCommand(command).at(-1) || command;
  return getGitSubcommand(lastSegment.trim().split(/\s+/));
}
//@ chunk-5xgkngpb.js:4853275-4853426 layout
/**
 * 从 argv 取 git 子命令（跳过 -C/-c 及其参数和其他选项）；非 git 返回 undefined。
 */
function getGitSubcommand(argv) {
  if (argv[0] !== "git") return;
  for (let idx = 1; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg.startsWith("-")) {
      if (arg === "-C" || arg === "-c") idx++;
      continue;
    }
    return arg;
  }
  return;
}
//@ chunk-5xgkngpb.js:4853426-4853478 file-local
function extractBaseCommand(command) {
  return command.trim().split(/\s+/)[0] || "";
}
//@ chunk-5xgkngpb.js:4853478-4853564 placement
function DEFAULT_SEMANTIC_2(command, exitCode, stdout, stderr) {
  let result = getCommandSemantic(command)(exitCode, stdout, stderr);
  return {
    isError: result.isError,
    message: result.message,
  };
}
//@ chunk-5xgkngpb.js:4853564-4853651 placement
/**
 * 先按默认语义解释结果；当退出码非 0、无错误且命令以 && 链结尾时，改用最后一条命令重新解释。
 */
function interpretWithAndGatedRetry(command, exitCode, stdout, stderr) {
  let result = DEFAULT_SEMANTIC_2(command, exitCode, stdout, stderr);
  return exitCode !== 0 && !result.isError && lastCommandIsAndGated(command)
    ? DEFAULT_SEMANTIC(exitCode, stdout, stderr)
    : result;
}
//@ chunk-5xgkngpb.js:4859681-4859699 placement
/**
 * 内存紧张判定阈值：可用内存低于总内存的 10% 且低于 4 GiB（memoryPressure.js 使用）。
 */
var MEMORY_SCARCE_RATIO = 0.1;
var MEMORY_SCARCE_GB = 4;
export {
  DEFAULT_SEMANTIC_2,
  interpretCommandResult_2,
  MEMORY_SCARCE_RATIO,
  MEMORY_SCARCE_GB,
  interpretWithAndGatedRetry,
  getGitSubcommand,
};
