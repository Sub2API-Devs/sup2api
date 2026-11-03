/**
 * ink/components/TerminalFocusContext.tsx
 *
 * 终端焦点上下文（是否聚焦、焦点状态）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/TerminalFocusContext.tsx
 * pieces: chunk-cg10fy59.js (6)
 * attribution: placement 3, fingerprint 2, callgraph-witnessed 1
 */
import { j, qt, yt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { onTerminalFocusChanged, getTerminalFocused, getTerminalFocus } from "../terminal-focus-state.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-cg10fy59.js:390-394 placement
j();
//@ chunk-cg10fy59.js:394-398 placement
j();
//@ chunk-cg10fy59.js:398-402 placement
j();
/**
 * 终端焦点上下文：isTerminalFocused 与 terminalFocusState。
 */
//@ chunk-cg10fy59.js:402-464 fingerprint = TerminalFocusContext (1)
var TerminalFocusContext = qt({ isTerminalFocused: !0, terminalFocusState: "unknown" });
//@ chunk-cg10fy59.js:464-501 fingerprint
TerminalFocusContext.displayName = "TerminalFocusContext";
/**
 * 提供终端焦点上下文：订阅 DEC 1004 焦点事件得到的状态（focused/blurred/unknown）。
 */
//@ chunk-cg10fy59.js:501-784 callgraph-witnessed = TerminalFocusProvider (0.835)
function TerminalFocusProvider(t0) {
  let l = w(6),
    { children: children } = t0,
    isTerminalFocused = yt(onTerminalFocusChanged, getTerminalFocused),
    terminalFocusState = yt(onTerminalFocusChanged, getTerminalFocus),
    i;
  if (l[0] !== isTerminalFocused || l[1] !== terminalFocusState)
    ((i = { isTerminalFocused: isTerminalFocused, terminalFocusState: terminalFocusState }),
      (l[0] = isTerminalFocused),
      (l[1] = terminalFocusState),
      (l[2] = i));
  else i = l[2];
  let value = i,
    a;
  if (l[3] !== children || l[4] !== value)
    ((a = e(TerminalFocusContext.Provider, { value: value, children: children })),
      (l[3] = children),
      (l[4] = value),
      (l[5] = a));
  else a = l[5];
  return a;
}

export { TerminalFocusProvider, TerminalFocusContext };
