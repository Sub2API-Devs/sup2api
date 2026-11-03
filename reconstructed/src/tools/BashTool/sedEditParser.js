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
import { HKt } from "./sedValidation.js";

/**
 * 从 sed -i 命令中取出编辑表达式（-e/--expression 或第一个非选项参数）；没有 -i 返回 null，多个 -i 返回 __SED_MULTIPLE_I_FLAGS__。
 */
//@ chunk-e6aww6q8.js:1059048-1059563 callgraph-fingerprint = parseSedEditCommand (0.304)
function getSedInPlaceExpression(command) {
  let n = getCommandArgv(command);
  if (n[0] !== "sed") return null;
  let withoutSed = n.slice(1),
    args = [];
  for (let S = 0; S < withoutSed.length; S++) {
    let w = withoutSed[S];
    if (w === "-i" || /^-[Er]+i$/.test(w)) args.push(S);
  }
  if (args.length === 0) return null;
  if (args.length > 1) return HKt;
  let h = args[0],
    y = withoutSed[h + 1];
  if (y === void 0) return null;
  if (y === "" || y.startsWith(".") || y.startsWith("-")) return null;
  for (let S = h + 2; S < withoutSed.length; S++) {
    let w = withoutSed[S];
    if (w === "-e" || w === "--expression") return withoutSed[S + 1] ?? null;
    if (w.startsWith("--expression=")) return w.slice(13);
    if (w.startsWith("-")) continue;
    return w;
  }
  return null;
}

export { getSedInPlaceExpression };
