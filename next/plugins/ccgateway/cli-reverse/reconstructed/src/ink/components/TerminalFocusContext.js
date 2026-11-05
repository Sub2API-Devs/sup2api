/**
 * ink/components/TerminalFocusContext.tsx
 *
 * 终端焦点上下文（是否聚焦、焦点状态）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/TerminalFocusContext.tsx
 * pieces: chunk-w63e462p.js (6)
 * attribution: placement 3, fingerprint 2, callgraph-witnessed 1
 */
import {
  init_react_production,
  createContext,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { onTerminalFocusChanged, getTerminalFocused, getTerminalFocus } from "../terminal-focus-state.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-w63e462p.js:390-394 placement
init_react_production();
//@ chunk-w63e462p.js:394-398 placement
init_react_production();
//@ chunk-w63e462p.js:398-402 placement
init_react_production();
//@ chunk-w63e462p.js:402-464 fingerprint (2.1.88 match: TerminalFocusContext, 1)
/**
 * 终端焦点上下文：isTerminalFocused 与 terminalFocusState。
 */
var TerminalFocusContext_2 = createContext({
  isTerminalFocused: true,
  terminalFocusState: "unknown",
});
//@ chunk-w63e462p.js:464-501 fingerprint
TerminalFocusContext_2.displayName = "TerminalFocusContext";
//@ chunk-w63e462p.js:501-784 callgraph-witnessed (2.1.88 match: TerminalFocusProvider, 0.835)
/**
 * 提供终端焦点上下文：订阅 DEC 1004 焦点事件得到的状态（focused/blurred/unknown）。
 */
function TerminalFocusProvider(props) {
  let $ = useMemoCache(6);
  let { children } = props;
  let isTerminalFocused = useSyncExternalStore(onTerminalFocusChanged, getTerminalFocused);
  let terminalFocusState = useSyncExternalStore(onTerminalFocusChanged, getTerminalFocus);
  let t1;
  if ($[0] !== isTerminalFocused || $[1] !== terminalFocusState) {
    t1 = {
      isTerminalFocused,
      terminalFocusState,
    };
    $[0] = isTerminalFocused;
    $[1] = terminalFocusState;
    $[2] = t1;
  } else t1 = $[2];
  let value = t1;
  let t2;
  if ($[3] !== children || $[4] !== value) {
    t2 = jsxProd_default(TerminalFocusContext_2.Provider, {
      value,
      children,
    });
    $[3] = children;
    $[4] = value;
    $[5] = t2;
  } else t2 = $[5];
  return t2;
}
export { TerminalFocusProvider, TerminalFocusContext_2 };
