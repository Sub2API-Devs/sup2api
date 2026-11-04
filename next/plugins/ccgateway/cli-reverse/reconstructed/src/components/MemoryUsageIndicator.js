/**
 * components/MemoryUsageIndicator.tsx
 *
 * 内存占用告警指示：high/critical 时提示 "restart and resume with claude --continue"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MemoryUsageIndicator.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useMemoryUsage } from "../hooks/useMemoryUsage.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { useLayoutEffect } from "../../vendor/react/cjs/react.production.js";
import { formatFileSize } from "../utils/format.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";

//@ chunk-18hwfzwa.js:783611-784345 fingerprint = MemoryUsageIndicator (0.397)
function MemoryUsageIndicator(props) {
  let $ = useMemoCache(11);
  let { tier, onShowingChange } = props;
  let memoryUsage = useMemoryUsage("critical", tier === "critical");
  let isHidden;
  if ($[0] !== memoryUsage || $[1] !== tier) {
    isHidden = isRemoteSessionAvailable() || !memoryUsage || memoryUsage.status !== tier;
    $[0] = memoryUsage;
    $[1] = tier;
    $[2] = isHidden;
  } else isHidden = $[2];
  let isHiddenCopy = isHidden;
  let reportShowingEffect;
  let reportShowingDeps;
  if ($[3] !== isHiddenCopy || $[4] !== onShowingChange) {
    reportShowingEffect = () => {
      onShowingChange?.(!isHiddenCopy);
      return () => onShowingChange?.(false);
    };
    reportShowingDeps = [isHiddenCopy, onShowingChange];
    $[3] = isHiddenCopy;
    $[4] = onShowingChange;
    $[5] = reportShowingEffect;
    $[6] = reportShowingDeps;
  } else {
    reportShowingEffect = $[5];
    reportShowingDeps = $[6];
  }
  useLayoutEffect(reportShowingEffect, reportShowingDeps);
  if (isHiddenCopy) {
    return null;
  }
  let heapUsedLabel;
  if ($[7] !== memoryUsage.heapUsed) {
    heapUsedLabel = formatFileSize(memoryUsage.heapUsed);
    $[7] = memoryUsage.heapUsed;
    $[8] = heapUsedLabel;
  } else heapUsedLabel = $[8];
  let heapUsedText = heapUsedLabel;
  if (tier === "high") {
    return null;
  }
  let canSuggestCompact = !isFullscreenEnvEnabled();
  let warningElement;
  if ($[9] !== heapUsedText) {
    warningElement = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "error",
        wrap: "truncate",
        children: [
          "Critical memory usage (",
          heapUsedText,
          ") \u2014 restart and resume with claude --continue",
          canSuggestCompact ? ", or run /compact" : "",
          "",
        ],
      }),
    });
    $[9] = heapUsedText;
    $[10] = warningElement;
  } else warningElement = $[10];
  return warningElement;
}
export { MemoryUsageIndicator };
