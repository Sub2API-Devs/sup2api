/**
 * services/compact/compactWarningState.ts
 *
 * 压缩警告的全局开关状态：microcompact 清掉工具结果后抑制“上下文将满”的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/compactWarningState.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: callgraph-witnessed 1
 */
import { microCompactFlagStore } from "../../utils/shell/shellToolUtils.js";

//@ chunk-5xgkngpb.js:1590128-1590166 callgraph-witnessed (2.1.88 match: suppressCompactWarning, 1)
/**
 * 把压缩警告抑制标志置为 true（microcompact 清理后调用，避免误报上下文将满）。
 */
function suppressCompactWarning() {
  microCompactFlagStore().setState(() => true);
}
export { suppressCompactWarning };
