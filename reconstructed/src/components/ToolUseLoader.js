/**
 * components/ToolUseLoader.tsx
 *
 * 工具调用左侧的状态圆点（进行中闪烁、成功绿、错误红）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ToolUseLoader.tsx
 * pieces: chunk-ah34pb7m.js (4)
 * attribution: sole-consumer 3, fingerprint 1
 */
import { init_react_production, R, P } from "../../vendor/react/cjs/react.production.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useScreenReaderBell } from "../hooks/useScreenReaderBell.js";
import { UUID_MISSING_LOG_INTERVAL_MS } from "../bridge/inboundMessages.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { BLACK_CIRCLE } from "../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-ah34pb7m.js:39964-39968 sole-consumer
init_react_production();
//@ chunk-ah34pb7m.js:39968-39979 sole-consumer
var BLINK_INTERVAL_MS = 600;
//@ chunk-ah34pb7m.js:39979-40095 sole-consumer
function useBlinkingDot(m, d = BLINK_INTERVAL_MS) {
  let terminalFocus = useTerminalFocus();
  let [g, f] = useAnimationFrame(m && terminalFocus ? d : null);
  if (!m || !terminalFocus) return [g, true];
  let h = Math.floor(f / d) % 2 === 0;
  return [g, h];
}
//@ chunk-ah34pb7m.js:40095-40534 fingerprint = ToolUseLoader (0.573)
function ToolUseLoader({ isError, isNeutral = false, isUnresolved, shouldAnimate }) {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let prefersReducedMotion = usePrefersReducedMotion();
  let [M, T] = useBlinkingDot(shouldAnimate && !isScreenReaderEnabled && !prefersReducedMotion);
  let x = isUnresolved && shouldAnimate && prefersReducedMotion && !isScreenReaderEnabled;
  let screenReaderBell = useScreenReaderBell();
  let b = R(null);
  P(() => {
    if (isUnresolved) b.current ??= Date.now();
    else if (b.current !== null) {
      if (Date.now() - b.current > UUID_MISSING_LOG_INTERVAL_MS) screenReaderBell();
      b.current = null;
    }
  }, [isUnresolved, screenReaderBell]);
  return jsxProd_default(Box, {
    ref: M,
    minWidth: 2,
    children: jsxProd_default(Text, {
      "aria-label": isError && !isNeutral ? "tool error:" : "tool:",
      color: x ? "text" : isUnresolved || isNeutral ? undefined : isError ? "error" : "success",
      dimColor: (isUnresolved && !x) || isNeutral,
      children: !shouldAnimate || T || isError || !isUnresolved ? BLACK_CIRCLE : " ",
    }),
  });
}
export { ToolUseLoader };
