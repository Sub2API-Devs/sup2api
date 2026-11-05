/**
 * components/ToolUseLoader.tsx
 *
 * 工具调用左侧的状态圆点（进行中闪烁、成功绿、错误红）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ToolUseLoader.tsx
 * pieces: chunk-6gyvmn2t.js (4)
 * attribution: sole-consumer 3, fingerprint 1
 */
import { init_react_production, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useScreenReaderBell } from "../hooks/useScreenReaderBell.js";
import { UUID_MISSING_LOG_INTERVAL_MS } from "../bridge/inboundMessages.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { BLACK_CIRCLE } from "../constants/figures.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6gyvmn2t.js:711-715 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6gyvmn2t.js:711", () => {
  init_react_production();
});
//@ chunk-6gyvmn2t.js:715-725 sole-consumer
var BLINK_INTERVAL_MS = 600;
//@ chunk-6gyvmn2t.js:725-839 sole-consumer
function useBlinkingDot(enabled, intervalMs = BLINK_INTERVAL_MS) {
  let terminalFocus = useTerminalFocus();
  let [ref, time] = useAnimationFrame(enabled && terminalFocus ? intervalMs : null);
  if (!enabled || !terminalFocus) return [ref, true];
  let isVisible = Math.floor(time / intervalMs) % 2 === 0;
  return [ref, isVisible];
}
//@ chunk-6gyvmn2t.js:839-1276 fingerprint (2.1.88 match: ToolUseLoader, 0.572)
function ToolUseLoader({ isError, isNeutral = false, isUnresolved, shouldAnimate }) {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let prefersReducedMotion = usePrefersReducedMotion();
  let [ref, isVisible] = useBlinkingDot(shouldAnimate && !isScreenReaderEnabled && !prefersReducedMotion);
  let showStaticDot = isUnresolved && shouldAnimate && prefersReducedMotion && !isScreenReaderEnabled;
  let screenReaderBell = useScreenReaderBell();
  let unresolvedSinceRef = useRef(null);
  useEffect(() => {
    if (isUnresolved) unresolvedSinceRef.current ??= Date.now();
    else if (unresolvedSinceRef.current !== null) {
      if (Date.now() - unresolvedSinceRef.current > UUID_MISSING_LOG_INTERVAL_MS) screenReaderBell();
      unresolvedSinceRef.current = null;
    }
  }, [isUnresolved, screenReaderBell]);
  return jsxProd_default(Box, {
    ref,
    minWidth: 2,
    children: jsxProd_default(Text, {
      "aria-label": isError && !isNeutral ? "tool error:" : "tool:",
      color: showStaticDot ? "text" : isUnresolved || isNeutral ? undefined : isError ? "error" : "success",
      dimColor: (isUnresolved && !showStaticDot) || isNeutral,
      children: !shouldAnimate || isVisible || isError || !isUnresolved ? BLACK_CIRCLE : " ",
    }),
  });
}
export { ToolUseLoader };
