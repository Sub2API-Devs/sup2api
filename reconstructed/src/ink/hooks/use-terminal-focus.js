/**
 * ink/hooks/use-terminal-focus.ts
 *
 * 读取终端是否聚焦的 hook
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-terminal-focus.ts
 * pieces: chunk-cg10fy59.js (3)
 * attribution: placement 3
 */
import { TerminalFocusContext } from "../components/TerminalFocusContext.js";
import { Se } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-cg10fy59.js:784-792 placement
var d = TerminalFocusContext;
/**
 * 读取终端窗口当前是否有焦点。
 */
//@ chunk-cg10fy59.js:792-846 placement = useTerminalFocus (1)
function useTerminalFocus() {
  let { isTerminalFocused: isTerminalFocused } = Se(d);
  return isTerminalFocused;
}
//@ chunk-cg10fy59.js:846-902 placement
function vye() {
  let { terminalFocusState: terminalFocusState } = Se(d);
  return terminalFocusState;
}

export { useTerminalFocus, vye };
