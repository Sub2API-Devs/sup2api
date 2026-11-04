/**
 * tools/BashTool/sedEditParser.ts
 *
 * 取出 sed -i 的编辑表达式；本模块混入了第三方 turndown 的 commonmark 规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/sedEditParser.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { getCommandArgv } from "../../utils/bash/commands.js";
import { MULTIPLE_INPLACE_MARKER } from "./sedValidation.js";

//@ chunk-e6aww6q8.js:1059048-1059563 callgraph-fingerprint (2.1.88 match: parseSedEditCommand, 0.304)
/**
 * 从 sed -i 命令中取出编辑表达式（-e/--expression 或第一个非选项参数）；没有 -i 返回 null，多个 -i 返回 __SED_MULTIPLE_I_FLAGS__。
 */
function getSedInPlaceExpression(command) {
  let commandArgv = getCommandArgv(command);
  if (commandArgv[0] !== "sed") return null;
  let withoutSed = commandArgv.slice(1);
  let args = [];
  for (let idx = 0; idx < withoutSed.length; idx++) {
    let arg = withoutSed[idx];
    if (arg === "-i" || /^-[Er]+i$/.test(arg)) args.push(idx);
  }
  if (args.length === 0) return null;
  if (args.length > 1) return MULTIPLE_INPLACE_MARKER;
  let inPlaceIdx = args[0];
  let nextArg = withoutSed[inPlaceIdx + 1];
  if (nextArg === undefined) return null;
  if (nextArg === "" || nextArg.startsWith(".") || nextArg.startsWith("-")) return null;
  for (let idx = inPlaceIdx + 2; idx < withoutSed.length; idx++) {
    let arg = withoutSed[idx];
    if (arg === "-e" || arg === "--expression") return withoutSed[idx + 1] ?? null;
    if (arg.startsWith("--expression=")) return arg.slice(13);
    if (arg.startsWith("-")) continue;
    return arg;
  }
  return null;
}
export { getSedInPlaceExpression };
