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
import { j, R, P } from "../../vendor/react/cjs/react.production.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useScreenReaderBell } from "../hooks/useScreenReaderBell.js";
import { vT } from "../bridge/inboundMessages.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { BLACK_CIRCLE } from "../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-ah34pb7m.js:39964-39968 sole-consumer
j();
//@ chunk-ah34pb7m.js:39968-39979 sole-consumer
var FU = 600;
//@ chunk-ah34pb7m.js:39979-40095 sole-consumer
function useBlinkingDot(m, d = FU) {
  let c = useTerminalFocus(),
    [g, f] = useAnimationFrame(m && c ? d : null);
  if (!m || !c) return [g, !0];
  let h = Math.floor(f / d) % 2 === 0;
  return [g, h];
}
//@ chunk-ah34pb7m.js:40095-40534 fingerprint = ToolUseLoader (0.573)
function ToolUseLoader({
  isError: isError,
  isNeutral: isNeutral = !1,
  isUnresolved: isUnresolved,
  shouldAnimate: shouldAnimate,
}) {
  let f = useIsScreenReaderEnabled(),
    h = usePrefersReducedMotion(),
    [M, T] = useBlinkingDot(shouldAnimate && !f && !h),
    x = isUnresolved && shouldAnimate && h && !f,
    k = useScreenReaderBell(),
    b = R(null);
  return (
    P(() => {
      if (isUnresolved) b.current ??= Date.now();
      else if (b.current !== null) {
        if (Date.now() - b.current > vT) k();
        b.current = null;
      }
    }, [isUnresolved, k]),
    e(Box, {
      ref: M,
      minWidth: 2,
      children: e(Text, {
        "aria-label": isError && !isNeutral ? "tool error:" : "tool:",
        color: x ? "text" : isUnresolved || isNeutral ? void 0 : isError ? "error" : "success",
        dimColor: (isUnresolved && !x) || isNeutral,
        children: !shouldAnimate || T || isError || !isUnresolved ? BLACK_CIRCLE : " ",
      }),
    })
  );
}

export { ToolUseLoader };
