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
import { w } from "../../vendor/react/compiler-runtime.js";
import { useMemoryUsage } from "../hooks/useMemoryUsage.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { zt } from "../../vendor/react/cjs/react.production.js";
import { formatFileSize } from "../utils/format.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";

//@ chunk-18hwfzwa.js:783611-784345 fingerprint = MemoryUsageIndicator (0.397)
function MemoryUsageIndicator(props) {
  let $ = w(11);
  let { tier, onShowingChange } = props;
  let memoryUsage = useMemoryUsage("critical", tier === "critical");
  let Re;
  if ($[0] !== memoryUsage || $[1] !== tier) {
    Re = isRemoteSessionAvailable() || !memoryUsage || memoryUsage.status !== tier;
    $[0] = memoryUsage;
    $[1] = tier;
    $[2] = Re;
  } else Re = $[2];
  let Be = Re;
  let He;
  let We;
  if ($[3] !== Be || $[4] !== onShowingChange) {
    He = () => {
      onShowingChange?.(!Be);
      return () => onShowingChange?.(false);
    };
    We = [Be, onShowingChange];
    $[3] = Be;
    $[4] = onShowingChange;
    $[5] = He;
    $[6] = We;
  } else {
    He = $[5];
    We = $[6];
  }
  zt(He, We);
  if (Be) {
    return null;
  }
  let ze;
  if ($[7] !== memoryUsage.heapUsed) {
    ze = formatFileSize(memoryUsage.heapUsed);
    $[7] = memoryUsage.heapUsed;
    $[8] = ze;
  } else ze = $[8];
  let Xe = ze;
  if (tier === "high") {
    return null;
  }
  let rt = !isFullscreenEnvEnabled();
  let kt;
  if ($[9] !== Xe) {
    kt = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "error",
        wrap: "truncate",
        children: [
          "Critical memory usage (",
          Xe,
          ") \u2014 restart and resume with claude --continue",
          rt ? ", or run /compact" : "",
          "",
        ],
      }),
    });
    $[9] = Xe;
    $[10] = kt;
  } else kt = $[10];
  return kt;
}
export { MemoryUsageIndicator };
