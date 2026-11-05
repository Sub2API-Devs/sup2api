/**
 * ink/hooks/use-terminal-focus.ts
 *
 * 读取终端是否聚焦的 hook
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-terminal-focus.ts
 * pieces: chunk-w63e462p.js (3)
 * attribution: placement 3
 */
import { TerminalFocusContext_2 } from "../components/TerminalFocusContext.js";
import { useContext } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-w63e462p.js:784-792 placement
/**
 * 终端焦点上下文
 */
var TerminalFocusContext = TerminalFocusContext_2;
//@ chunk-w63e462p.js:792-846 placement (2.1.88 match: useTerminalFocus, 1)
/**
 * 读取终端窗口当前是否有焦点。
 */
function useTerminalFocus() {
  let { isTerminalFocused } = useContext(TerminalFocusContext);
  return isTerminalFocused;
}
//@ chunk-w63e462p.js:846-902 placement
/**
 * 从终端焦点上下文取出焦点状态（是否聚焦、最近一次变化）。
 */
function useTerminalFocusState() {
  let { terminalFocusState } = useContext(TerminalFocusContext);
  return terminalFocusState;
}
export { useTerminalFocusState, useTerminalFocus };
