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
import { wt } from "../remote/remoteMode.js";
import { zt } from "../../vendor/react/cjs/react.production.js";
import { formatFileSize } from "../utils/format.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";

//@ chunk-18hwfzwa.js:783611-784345 fingerprint = MemoryUsageIndicator (0.397)
function MemoryUsageIndicator(h) {
  let $ = w(11),
    { tier: tier, onShowingChange: onShowingChange } = h,
    ee = useMemoryUsage("critical", tier === "critical"),
    Re;
  if ($[0] !== ee || $[1] !== tier)
    ((Re = wt() || !ee || ee.status !== tier), ($[0] = ee), ($[1] = tier), ($[2] = Re));
  else Re = $[2];
  let Be = Re,
    He,
    We;
  if ($[3] !== Be || $[4] !== onShowingChange)
    ((He = () => (onShowingChange?.(!Be), () => onShowingChange?.(!1))),
      (We = [Be, onShowingChange]),
      ($[3] = Be),
      ($[4] = onShowingChange),
      ($[5] = He),
      ($[6] = We));
  else ((He = $[5]), (We = $[6]));
  if ((zt(He, We), Be)) {
    return null;
  }
  let ze;
  if ($[7] !== ee.heapUsed) ((ze = formatFileSize(ee.heapUsed)), ($[7] = ee.heapUsed), ($[8] = ze));
  else ze = $[8];
  let Xe = ze;
  if (tier === "high") {
    return null;
  }
  let rt = !isFullscreenEnvEnabled(),
    kt;
  if ($[9] !== Xe)
    ((kt = e(Box, {
      children: r(Text, {
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
    })),
      ($[9] = Xe),
      ($[10] = kt));
  else kt = $[10];
  return kt;
}

export { MemoryUsageIndicator };
