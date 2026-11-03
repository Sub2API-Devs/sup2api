/**
 * tools/BashTool/commandSemantics.ts
 *
 * 命令退出码语义表（grep/rg/find/diff/test 的 1 不算错误）与 git 子命令提取；混入 SDK tool runner 片段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/commandSemantics.ts
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: fingerprint 2, layout 3, file-local 1, placement 3
 */
import { findToolResultBlock } from "../../services/tools/toolHooks.js";
import { Brs } from "../../plugins/functionHooks/sites/toolSites.js";
import { splitCommand, lastCommandIsAndGated } from "../../utils/bash/commands.js";

//@ chunk-e6aww6q8.js:3777431-3777561 fingerprint = interpretCommandResult (0.67)
function interpretCommandResult_2(e, n) {
  for (let r of e) {
    let s = findToolResultBlock(r, n);
    if (s) return { text: Brs(s.content), ...(s.is_error === !0 && { isError: !0 }) };
  }
  return { text: "" };
}
/**
 * 命令退出码语义表：默认非 0 即错误；grep/rg/egrep/fgrep/find/diff/test/[ 的退出码 1 只是"无匹配/不同/条件为假"，≥2 才算错误。
 */
//@ chunk-e6aww6q8.js:4740100-4740536 fingerprint = COMMAND_SEMANTICS (0.845)
var DEFAULT_SEMANTIC = (e, n, r) => ({
    isError: e !== 0,
    message: e !== 0 ? `Command failed with exit code ${e}` : void 0,
  }),
  exitOneIsNotError = (e) => (n, r, s) => ({ isError: n >= 2, message: n === 1 ? e : void 0 }),
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
/**
 * 取最后一个子命令的基础命令查语义表；git diff / git grep 也按 diff/grep 语义处理。
 */
//@ chunk-e6aww6q8.js:4740536-4740729 layout
function getCommandSemantic(e) {
  let n = extractBaseCommand(splitCommand(e).at(-1) || e);
  if (n === "git") {
    let s = getLastSegmentGitSubcommand(e);
    if (s === "diff" || s === "grep")
      return exitOneIsNotError(s === "grep" ? "No matches found" : "Files differ");
  }
  let r = COMMAND_SEMANTICS.get(n);
  return r !== void 0 ? r : DEFAULT_SEMANTIC;
}
//@ chunk-e6aww6q8.js:4740729-4740801 layout
function getLastSegmentGitSubcommand(e) {
  let r = splitCommand(e).at(-1) || e;
  return getGitSubcommand(r.trim().split(/\s+/));
}
/**
 * 从 argv 取 git 子命令（跳过 -C/-c 及其参数和其他选项）；非 git 返回 undefined。
 */
//@ chunk-e6aww6q8.js:4740801-4740952 layout
function getGitSubcommand(e) {
  if (e[0] !== "git") return;
  for (let n = 1; n < e.length; n++) {
    let r = e[n];
    if (r.startsWith("-")) {
      if (r === "-C" || r === "-c") n++;
      continue;
    }
    return r;
  }
  return;
}
//@ chunk-e6aww6q8.js:4740952-4741004 file-local
function extractBaseCommand(command) {
  return command.trim().split(/\s+/)[0] || "";
}
//@ chunk-e6aww6q8.js:4741004-4741090 placement
function DEFAULT_SEMANTIC_2(e, n, r, s) {
  let y = getCommandSemantic(e)(n, r, s);
  return { isError: y.isError, message: y.message };
}
//@ chunk-e6aww6q8.js:4741090-4741177 placement
function dVn(e, n, r, s) {
  let h = DEFAULT_SEMANTIC_2(e, n, r, s);
  return n !== 0 && !h.isError && lastCommandIsAndGated(e) ? DEFAULT_SEMANTIC(n, r, s) : h;
}
//@ chunk-e6aww6q8.js:4741213-4741231 placement
var uVn = 0.1,
  cVn = 4;

export { DEFAULT_SEMANTIC_2, interpretCommandResult_2, uVn, cVn, dVn, getGitSubcommand };
